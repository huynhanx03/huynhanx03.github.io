---
title: "PostgreSQL VACUUM Phases, Autovacuum, and XID Freezing"
category: "Database"
description: "Follow heap scans, index cleanup, truncation, analyze, freeze age, and table rebuilds."
updated: 2026-10-18
translationKey: "database/postgresql-vacuum-phases-and-freezing"
---

VACUUM is not one step. It must identify tuples safe to remove under the transaction horizon, remove index references, reclaim heap space, and update visibility/free-space metadata. For large tables, phase order determines I/O, lock time, and how much writing can continue.

## Heap scan and index cleanup

The heap scan uses the visibility map to skip pages already known to be safe, finds tuples that are dead beyond the transaction horizon, and may update visibility/freeze information. It adds each dead tuple's TID to an in-memory array. VACUUM cannot remove the tuple from the heap yet because one or more indexes may still point to that TID.

The TID array is bounded. In PostgreSQL 14, `maintenance_work_mem` limits memory for manual VACUUM; autovacuum uses `autovacuum_work_mem` when set and otherwise `maintenance_work_mem`, and collection of dead TIDs is capped at 1 GB. If the array fills before the heap scan finishes, VACUUM scans the indexes to remove entries pointing to the collected TIDs, then scans the heap to mark those tuples reusable. It resumes the heap scan where it left off. A table with many dead tuples can therefore need several index/heap cycles; more memory can reduce index passes but increases memory use per VACUUM worker.

Indexes do not have a general reverse lookup from heap TID to index entry, so index vacuum usually scans each index to match the dead-TID list. PostgreSQL 14 can skip index cleanup when very few dead tuples exist (`INDEX_CLEANUP AUTO`), because scanning an index may cost more than the immediate benefit. But dead entries and line pointers remain to accumulate if cleanup is skipped repeatedly. Parallel vacuum can process sufficiently large indexes in parallel: an index must exceed `min_parallel_index_scan_size` (512 kB by default in PG14), at most one worker is used per eligible index, and the total worker count is bounded by `PARALLEL` and `max_parallel_maintenance_workers`. If only one index qualifies, there are not multiple indexes to process in parallel.

Heap cleanup makes line pointers reusable only after corresponding index entries are removed; it also updates the free-space and visibility maps. In the final phase, VACUUM may truncate empty pages at the relation's tail and return blocks to the filesystem. The PostgreSQL 14 implementation described in the book tries to acquire an `ACCESS EXCLUSIVE` lock for at most five seconds and truncates only when the empty tail is at least 1/16 of the relation or at least 1,000 pages long. These are version-specific implementation heuristics, not a contract for every PostgreSQL release. `vacuum_truncate` can disable truncation if even this short lock can disrupt work. Most ordinary VACUUM runs still leave the file size unchanged.

Ordinary `VACUUM` runs alongside DML with a lighter lock than `VACUUM FULL`, but still causes I/O and needs cleanup locks. Track `phase`, `max_dead_tuples`, `num_dead_tuples`, `index_vacuum_count`, heap blocks scanned/vacuumed, and elapsed time in `pg_stat_progress_vacuum`. A rising `index_vacuum_count` shows that the bounded TID array forced multiple index/heap cleanup cycles; long index phases point to index scan cost, while a long truncation phase can indicate a lock wait at the table tail.

### Trace: VACUUM meets a retained horizon

Create an old row version, then update the row so it has a newer version. If no reader needs the old version, `VACUUM` can remove it from the heap, clean its matching index entry, mark the heap slot `unused`, and update the FSM. If every tuple left on the page is visible to every snapshot, the page can be marked `all_visible` in the visibility map; this helps index-only scans, but a later write clears the all-visible state.

Now keep a transaction open in session A after it receives an XID and holds the horizon. Session B updates the same row twice and runs `VACUUM`. The old snapshot/horizon is what matters; session A does not need to keep running queries continuously or hold the prompt busy:

```sql
-- Session A: take a snapshot before Session B updates.
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT id FROM vac WHERE id = 1; -- keep the transaction/snapshot open

-- Session B: update the row being observed.
UPDATE vac SET s = 'B' WHERE id = 1;
UPDATE vac SET s = 'C' WHERE id = 1;
VACUUM VERBOSE vac;
```

Assume `vac` is a test table containing `id = 1`, with no other query holding an older snapshot.

In the PostgreSQL 14 book's trace, verbose vacuum reports one dead version it cannot yet remove because another transaction retains the `oldest xmin`; the versions still in use must remain too. The related index entry and heap version therefore cannot yet be reclaimed safely. After session A commits, the horizon advances; the next `VACUUM` can remove the dead version, delete its index reference, and mark the heap line pointer reusable. `VACUUM VERBOSE` counts depend on the table, snapshot, and version, so read them as evidence for that run rather than as fixed thresholds.

This trace separates three states that are often collapsed into one: a version is **invisible to a new snapshot**, it is **no longer needed by any snapshot**, and its bytes/index references are **physically reclaimed**. A transaction retaining the horizon can prevent the second state; VACUUM must then postpone the third.

### Cost-based throttling regulates VACUUM

VACUUM can run without an exclusive table lock, but page scans and dirty pages still compete with the workload for I/O, buffer cache, and CPU. PostgreSQL assigns an estimated **cost** to page activity: in the PostgreSQL 14 book's example, a buffer hit costs 1 unit, reading a page from disk costs 2 units, and dirtying a clean page adds 20 units. When accumulated cost reaches `vacuum_cost_limit`, the process sleeps for `vacuum_cost_delay` and then continues. This is an estimated-work throttle, not a precise IOPS cap or query-time limit.

The PostgreSQL 14 manual-VACUUM defaults are `vacuum_cost_delay = 0` and `vacuum_cost_limit = 200`, so the process does not sleep due to the cost limit; when delay is zero, changing the limit does not provide effective throttling. Autovacuum has separate `autovacuum_vacuum_cost_delay` and `autovacuum_vacuum_cost_limit` settings; `-1` inherits the manual setting. The book gives a 2 ms default delay for autovacuum. When several workers run, the cost limit is shared/distributed among them to keep aggregate load near the configured budget; raising worker count without a corresponding budget increase may not significantly improve throughput. Tables and TOAST tables can override delay/limit separately.

Tune for both completion time and user-query impact. More delay or a lower limit reduces immediate pressure but makes VACUUM slower, which can let dead tuples and XID age grow. Less delay or a higher limit speeds cleanup but consumes resources and can raise latency. These settings regulate intensity; they do not replace finding a retained horizon or clearing a backlog.

### Read progress to spot repeated vacuum cycles

`pg_stat_progress_vacuum` reports the current phase and progress fields such as `heap_blks_total`, `heap_blks_scanned`, `heap_blks_vacuumed`, `max_dead_tuples`, `num_dead_tuples`, and `index_vacuum_count`. Progress can move in spurts: when the TID array fills, VACUUM pauses the heap scan to scan indexes, then returns to the heap. Therefore, the ratio `heap_blks_vacuumed / heap_blks_total` does not always rise smoothly.

If `index_vacuum_count` is greater than 1, the dead-TID array could not hold all tuples from one heap scan, so the process repeated index cleanup and heap cleanup. In the book's example, `maintenance_work_mem = 1MB` and roughly 500,000 updated rows made vacuum perform three index scans; the exact number varies with tuple size, index count, and page layout. Fewer cycles may come from vacuuming more often so fewer dead tuples accumulate each time, or from raising memory if the system has budget; either way, each worker can consume more memory.

To inspect completed autovacuum runs, `log_autovacuum_min_duration = 0` logs every run. The log can show index-scan count, skipped pages, dead/nonremovable tuples, oldest xmin, buffer/WAL usage, and elapsed time. Use the progress view for work in flight and logs to investigate completed work. Do not compare runs by elapsed time alone: workload, cache warmth, dead-TID count, lock waits, and I/O can all differ.

## ANALYZE and autovacuum thresholds

`ANALYZE` samples columns to update null fraction, distinct counts, MCVs, and planner histograms. Raising statistics targets helps skewed/multimodal data but increases catalog/storage/analyze cost. Extended statistics model multi-column relationships when independent-selectivity assumptions are wrong.

The autovacuum launcher selects tables by dead-tuple count and scale factor, insert-triggered vacuum/analyze, XID age, and freeze rules. Small tables can be dominated by fixed thresholds; for huge tables, the scale factor can permit a very large dead-tuple count. Per-table tuning helps, but vacuum cost delay/throttling affects cleanup speed. Lower delay/more workers increase I/O/CPU.

### How the launcher schedules workers

In PostgreSQL 14, autovacuum needs both `autovacuum = on` and `track_counts = on` to use statistics when selecting tables. The launcher checks databases according to `autovacuum_naptime`, then starts a worker for a database with work; the total number of running workers is limited by `autovacuum_max_workers`. A worker connects to one database, builds lists of relations to vacuum/analyze, then processes relations one at a time; another worker can process a different relation when the backlog is long. This lets several tables make progress concurrently, but does not mean one autovacuum worker splits a single table's heap scan across multiple workers.

The vacuum list can include ordinary tables, materialized views, and TOAST tables; the analyze list includes ordinary tables and materialized views, but not TOAST tables. A table and its TOAST table can have separate storage parameters, such as `autovacuum_enabled` and corresponding thresholds. Manual `VACUUM` has options/conditions for parallel index cleanup; the PostgreSQL 14 book notes that autovacuum does not use multiple workers to process several indexes of the same relation. Do not assume this version-specific boundary applies to every autovacuum mechanism in later releases.

`autovacuum_work_mem` controls the dead-TID collection memory for a worker; if it is `-1`, the worker uses `maintenance_work_mem`. Each worker can have its own array, so potential memory use grows with the number of workers. Raising `autovacuum_max_workers` without accounting for memory, I/O, CPU, and lock contention can make maintenance compete with the workload rather than clean tables faster. Also, disabling ordinary autovacuum does not disable workers needed to prevent XID/MultiXact wraparound.

### Calculate the threshold instead of guessing

For vacuum triggered by `UPDATE`/`DELETE`, PostgreSQL 14 estimates the threshold as:

```text
autovacuum_vacuum_threshold
+ autovacuum_vacuum_scale_factor × pg_class.reltuples
```

The PostgreSQL 14 defaults are `50 + 0.2 × reltuples`. `reltuples` is the catalog's row estimate, not an exact counter. A 100,000-row table therefore has a threshold of about 20,050 dead tuples; a one-billion-row table reaches about 200,000,050. The same default can be reasonable for a small table but let a large table accumulate too many dead tuples.

`INSERT` has a separate vacuum threshold: `autovacuum_vacuum_insert_threshold + autovacuum_vacuum_insert_scale_factor × reltuples`, with PostgreSQL 14 defaults of `1000 + 0.2 × reltuples`. This vacuum can mark insert-only pages all-visible and help freeze tuples. `ANALYZE` uses a different threshold: `autovacuum_analyze_threshold + autovacuum_analyze_scale_factor × reltuples` (default `50 + 0.1 × reltuples`), so the vacuum threshold cannot predict when planner statistics will refresh.

A threshold makes the launcher consider a table; it does not guarantee a worker starts at that exact count. Statistics are approximate, the launcher runs on an interval, worker capacity is limited, and table `reloptions` can override server settings. XID age can also force vacuum sooner. When investigating, compare `pg_class.reltuples`, `pg_stat_all_tables.n_dead_tup`, effective settings, and table storage parameters. Do not multiply a default by the application's row count and treat the result as an exact start time.

### Trace: thresholds move when `reltuples` is updated

On a newly created or recently truncated table, `pg_class.reltuples` can be `-1`: PostgreSQL has no cardinality estimate yet; the table does not contain a negative number of rows. For trigger calculations, a negative value is treated as zero. With PostgreSQL 14 defaults, the table therefore starts with a dead-tuple threshold of `50 + 0.2 × 0 = 50` and an insert threshold of `1000 + 0.2 × 0 = 1000`.

After autoanalyze runs and estimates `reltuples = 1000`, the thresholds become about 250 dead tuples, 1,200 inserts, and 150 row modifications for autoanalyze. If 251 rows are then updated/deleted, the statistics counter can exceed the 250 threshold; if the table permits autovacuum, a worker selects it on an appropriate check. This sequence shows that a threshold depends on both an **event counter** and an **estimated table size**. A new table may therefore be processed early to create initial statistics, after which its threshold rises.

These values reproduce the book's trace; they do not predict an exact start time. Counters can lag or be estimates, the launcher checks on an interval, workers can be busy, and per-table `reloptions` can override values. TOAST table storage parameters use a `toast.` prefix; do not compare a global value with a table-specific threshold as if they were the same configuration.

## Freeze and wraparound

Ordinary XIDs are 32-bit counters. PostgreSQL compares them in a circular space modulo `2^32`: for any XID, roughly half the space is treated as the past and half as the future. The system must therefore process a tuple before its XID age passes roughly two billion transactions. Otherwise a very old row can appear to have been created in the future and disappear from snapshots.

The comparison is about **relative age**, not ordinary numeric `<`. For example, after the counter wraps, XID `5` can be newer than XID `4,294,967,290` even though its number is smaller. Imagine XIDs on a clock: half the circle behind a transaction is the past and half ahead is the future. After more than half a turn, an old XID would fall into the region interpreted as the future — which is why the safety limit is about two billion, not four billion.

PostgreSQL uses a 64-bit `FullTransactionId` with an epoch to track XID cycles in some internal structures, but tuple headers still store 32-bit `xmin`/`xmax` values; storing 64-bit IDs for every tuple would make every tuple larger. The epoch lets the system know which cycle it is in, but does not make an old tuple's `xmin` immune to wraparound. Freezing is how PostgreSQL declares that a row is old enough for its XID to be ignored.

### What does freezing change?

`xmin` records the transaction that created a row version. Once that transaction is old enough and is known to have committed before every current snapshot, VACUUM can **freeze** the version: visibility no longer depends on the ordinary age of `xmin`. In PostgreSQL 14, freezing is recognized by a combination of the committed and aborted hint bits for `xmin`; this is a special marker, not a claim that the transaction both committed and aborted. The original `xmin` remains available for inspection and debugging. Databases upgraded from before PostgreSQL 9.4 can still contain the older `xmin = 2` representation (`FrozenTransactionId`).

Freezing applies to `xmin` on a live version. It does not “freeze `xmax`”: a deleted or replaced version is cleaned up according to the transaction horizon once no snapshot needs it. These are separate jobs: **freezing lets live rows survive XID wraparound; vacuum cleanup removes dead rows when safe**.

The visibility map has two distinct states. `all_visible` means every tuple on a page is visible to every transaction, so ordinary VACUUM can often skip it. `all_frozen` is stronger: no tuple on the page needs freezing. A page can therefore have `all_visible = true` and `all_frozen = false`. When a stronger, aggressive vacuum is needed, PostgreSQL still scans pages that are not `all_frozen`; the freeze map lets it skip completed pages and preserve that progress between runs.

### `all_visible` does not mean frozen

A page just vacuumed may only reach `all_visible = true`: every current version is visible, but its `xmin` is still too new to freeze. Ordinary VACUUM can skip that page next time, so even as a tuple's transaction age grows, it may remain unfrozen until the page is modified or an aggressive vacuum is needed. When an UPDATE changes the page, its visibility bit is cleared; a later ordinary VACUUM can consider sufficiently old tuples on that modified page. For mostly immutable data, aggressive vacuum driven by `relfrozenxid` scans pages that are not `all_frozen` to finish freezing.

In the book's trace, a table is vacuumed after inserting data, leaving two pages all-visible but not all-frozen. Lowering `vacuum_freeze_min_age` to 1 does not make the next vacuum freeze the still-all-visible page: the visibility map skips it. Updating a row on page 0 clears that page's all-visible bit; VACUUM can then freeze an old-enough tuple there but still skips page 1. Only aggressive vacuum ignores the all-visible map to inspect pages that are not all-frozen. This shows that **visibility serves readers; freezing protects XIDs**.

### Four ages control the freeze schedule

The values below are the PostgreSQL 14 defaults described by the book and matching manual. Check the cluster's actual settings before applying them to another system.

| Event | PostgreSQL 14 | Meaning |
| --- | ---: | --- |
| A tuple becomes eligible for freezing | `vacuum_freeze_min_age = 50M` | Freeze an `xmin` only after it reaches this age. Waiting avoids wasted work on rows likely to be updated again soon. |
| Aggressive vacuum | `vacuum_freeze_table_age = 150M` | Once the cutoff age is high enough, scan every page not marked `all_frozen`, including pages ordinary vacuum could skip via the visibility map. The condition accounts for `vacuum_freeze_table_age - vacuum_freeze_min_age`. |
| Force anti-wraparound autovacuum | `autovacuum_freeze_max_age = 200M` | Vacuum a table before old XIDs can pass the safe range. This protection launches even when ordinary autovacuum is disabled. |
| Failsafe prioritizes freezing | `vacuum_failsafe_age = 1.6B` | Near wraparound danger, VACUUM bypasses cost delay and may skip index cleanup to freeze the heap sooner. This is an emergency mode, not a routine operating target. |

These ages do not mean every table is scanned at exactly that count. Ordinary vacuum may process dead tuples earlier; aggressive scans can be triggered by more than one condition; workers also depend on launcher scheduling and resources. In PostgreSQL 14, `vacuum_freeze_table_age` is capped at 95% of `autovacuum_freeze_max_age`. Raising `autovacuum_freeze_max_age` retains commit-status history in `pg_xact` longer (and commit timestamps if enabled), in exchange for fewer forced vacuums on static tables. Changing this cluster-wide setting requires a restart; a table storage parameter can lower the threshold for an individual table.

`pg_class.relfrozenxid` is a cutoff: every tuple inserted by an older XID is guaranteed frozen. It advances only after a scan covers every page that might still contain an unfrozen XID; an ordinary scan may not suffice when it skips pages only because they are all-visible. `pg_database.datfrozenxid` is the database-wide safety cutoff, effectively constrained by the table with the oldest `relfrozenxid`. One neglected table can therefore keep the database's freeze age from advancing.

```sql
SELECT c.oid::regclass AS relation,
       GREATEST(age(c.relfrozenxid), age(t.relfrozenxid)) AS xid_age,
       GREATEST(mxid_age(c.relminmxid), mxid_age(t.relminmxid)) AS multixact_age
FROM pg_class AS c
LEFT JOIN pg_class AS t ON c.reltoastrelid = t.oid
WHERE c.relkind IN ('r', 'm')
ORDER BY xid_age DESC
LIMIT 20;

SELECT datname,
       age(datfrozenxid) AS xid_age,
       mxid_age(datminmxid) AS multixact_age
FROM pg_database
ORDER BY xid_age DESC;
```

Read `xid_age` together with autovacuum logs and `pg_stat_progress_vacuum`; do not rely on one database-level number. A long-running transaction, prepared transaction, or replication slot retaining `xmin` can prevent tuples from becoming safe to clean up. An old slot or replica can also retain WAL. Find the horizon owner before raising thresholds or worker counts.

### MultiXacts have their own age limit

PostgreSQL uses a MultiXact when several transactions lock the same row. The tuple stores a MultiXact ID in `xmax`, while the member transaction list lives separately under `pg_multixact`. This is an independent finite counter, so tracking only `relfrozenxid` is not enough. `relminmxid`, `datminmxid`, `mxid_age()`, and the `vacuum_multixact_freeze_*` / `autovacuum_multixact_freeze_max_age` settings track and clean up MultiXact age. Aggressive vacuum handles MultiXacts too; pressure can come from old IDs or growing member storage. Unlike XID wraparound, MXID exhaustion blocks some writes that need row locks, not every write transaction.

## Manual freezing

### `VACUUM (FREEZE)` for an existing table

`VACUUM (FREEZE)` asks VACUUM to freeze eligible tuples in that run and perform the stronger scan needed to advance the cutoff. It is useful for deliberate maintenance; running it repeatedly without a reason can waste work on rows that will soon change, while regularly skipping index cleanup leaves dead index entries behind. If the goal is to freeze the heap as quickly as possible, consider `VACUUM (FREEZE, INDEX_CLEANUP OFF)` or the corresponding storage parameter; this delays index-entry cleanup, so it is not a routine maintenance schedule.

### `COPY FREEZE` in a controlled initial load

For an initial load, `COPY ... FROM ... WITH (FREEZE)` can write already-frozen tuples and mark eligible pages immediately. PostgreSQL 14 allows it only when the table was created or truncated in the same subtransaction, there are no open cursors, and the transaction holds no older snapshots; partitioned tables are not supported. Other sessions can see the loaded rows as soon as the command succeeds, even through an older snapshot, so this breaks normal MVCC visibility rules. Use it only when the batch load and data-publication boundary are controlled.

For rows with values large enough to move into a TOAST table, do not assume freezing the main heap handles all TOAST storage. The book notes that `COPY FREEZE` did not support TOAST tables in the version described; TOAST pages might still need VACUUM to update their visibility metadata. An initial load can therefore keep the main heap from needing vacuum for a long time without eliminating maintenance for its auxiliary relation.

If logs warn that the database must be vacuumed before XID age runs out, act immediately. In PostgreSQL 14, wraparound warnings begin about 40 million XIDs before the danger point; when fewer than 3 million remain, the server refuses to assign new XIDs to write transactions to protect data. Find transactions, prepared transactions, and old slots retaining horizons; identify tables with old cutoffs; then run appropriate ordinary VACUUM work to advance them. If writes are already blocked, release retained horizons and vacuum the required tables/database; single-user mode is not needed in typical recovery. Do not use `VACUUM FULL` to fix wraparound because it needs an XID and rewrites the relation; `VACUUM FREEZE` may also do more work than necessary during recovery. After normal operation resumes, fix autovacuum scheduling/configuration and monitor it to prevent recurrence.

## When routine vacuum is not enough

`VACUUM FULL` rewrites a table and needs an ACCESS EXCLUSIVE lock plus substantial temporary disk; indexes are rebuilt as part of the rewrite. Alternatives such as `pg_repack` (external extension/tool), `CLUSTER`, and `REINDEX CONCURRENTLY` address different problems and have separate constraints. Estimate roughly double or more disk, replication lag, and downtime before running them.

To reduce downtime, a migration may build a new table/index in parallel, copy in batches, dual-write/catch up, atomically rename, then clean up; each step has crash/retry windows and constraints to preserve. Never remove relation files or manually force page truncation.

*PostgreSQL Internals 14*, Chapters 6–7, pp. 120–158, explains routine VACUUM, autovacuum, monitoring, XID wraparound, freezing, freeze ages, aggressive/forced/failsafe vacuum, and freezing during initial loads. PostgreSQL 14 details were checked against [routine vacuuming, wraparound, and MultiXacts](https://www.postgresql.org/docs/14/routine-vacuuming.html#VACUUM-FOR-WRAPAROUND), [autovacuum thresholds/workers](https://www.postgresql.org/docs/14/runtime-config-autovacuum.html), [VACUUM options and failsafe](https://www.postgresql.org/docs/14/sql-vacuum.html), [vacuum cost-based delay](https://www.postgresql.org/docs/14/runtime-config-vacuum.html), [COPY FREEZE](https://www.postgresql.org/docs/14/sql-copy.html#SQL-COPY-FREEZE), [VACUUM memory](https://www.postgresql.org/docs/14/runtime-config-resource.html), and [vacuum progress](https://www.postgresql.org/docs/14/progress-reporting.html#VACUUM-PROGRESS-REPORTING).

## Check your understanding

**Why clean index entries before reusing heap space?** Old index entries must be removed so they do not point at a tuple location that will be reused.

**What can a 0.2 scale factor mean on a one-billion-row table?** With PostgreSQL 14 defaults, the estimated dead-tuple threshold is `50 + 0.2 × 1,000,000,000`, or about 200,000,050; the row estimate is approximate and table settings can override it.

**Is VACUUM FULL just ordinary vacuum with more effort?** No; it rewrites the relation and has very different locks/disk needs.

**Does an `all_visible` page have to be `all_frozen` too?** No. `all_visible` can let ordinary vacuum skip a page; aggressive vacuum still considers a page not marked `all_frozen`.

**Why monitor `relminmxid` as well as `relfrozenxid`?** Multiple transactions locking a row create MultiXacts, which have their own age counter and storage; wraparound pressure can come from MXIDs while XID age is low.

**Should every import use `COPY FREEZE`?** No. Its transaction/table conditions are strict, and rows may become visible to older snapshots after loading. Reserve it for controlled initial loads.
