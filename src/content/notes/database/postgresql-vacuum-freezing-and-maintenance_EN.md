---
title: "PostgreSQL Vacuum, Freezing, and Maintenance"
category: "Database"
description: "Why PostgreSQL needs vacuum, what autovacuum does, and how to prevent transaction ID wraparound."
updated: 2026-10-17
translationKey: "database/postgresql-vacuum-freezing-and-maintenance"
---

PostgreSQL keeps old row versions so running snapshots can read the correct data. Once no snapshot needs them, dead tuples can be reclaimed for reuse. **VACUUM** performs this cleanup and maintains metadata; it is not simply a “shrink the table” command. Leaving vacuum behind grows storage and can eventually force the system to stop accepting writes to prevent transaction ID wraparound.

## What does VACUUM do?

`VACUUM` scans heap and indexes as appropriate, identifies tuples that are no longer needed, makes page space reusable, updates free-space/visibility maps, and maintains transaction visibility information. The space is generally kept inside the relation for later writes; VACUUM usually does not return all of it to the filesystem.

`VACUUM (ANALYZE)` also gathers planner statistics. `ANALYZE` alone updates sampled statistics but does not remove dead tuples. `VACUUM FULL` rewrites a relation to compact its file, but it needs a strong lock and temporary disk space; it is a maintenance operation with downtime or impact, not a routine daily schedule.

## Autovacuum and thresholds

The autovacuum launcher monitors databases and starts workers for tables that need vacuum or analyze. Thresholds depend on dead-row count plus a fraction of table size (parameters such as `autovacuum_vacuum_threshold` and `autovacuum_vacuum_scale_factor`), along with separate analyze and wraparound conditions. Since the scale factor is multiplied by table size, a very large table can accumulate many dead rows before reaching a default threshold.

Tune based on update/delete rate, table size, vacuum duration, I/O, dead tuples, and statistics freshness. Per-table settings can help with large or hot tables, but adding workers or lowering thresholds increases I/O and CPU contention. Disabling `autovacuum` is not a query-slowdown fix; investigate whether the cause is workload, a retained horizon, resource limits, or unsuitable thresholds.

For PostgreSQL 14, the default `UPDATE`/`DELETE` threshold is approximately `50 + 0.2 × pg_class.reltuples`. Since `reltuples` is an estimate, a one-billion-row table may reach about 200,000,050 dead tuples before the scale-factor threshold; per-table settings and XID thresholds can change when vacuum runs. That is why large tables need per-table measurement and threshold review instead of one scale factor copied to every table.

## Transaction IDs and freezing

PostgreSQL uses 32-bit XIDs and compares them in a circular space. If the system advances more than roughly half the XID range without processing old tuples, a row created in the past can be mistaken for one “in the future.” **Freezing** marks a live tuple as committed long ago, so it no longer depends on reusing an old XID. Freezing and cleanup differ: cleanup reclaims dead row versions; freezing protects live versions across XID cycles.

The server tracks a per-table cutoff in `pg_class.relfrozenxid` and a database cutoff in `pg_database.datfrozenxid`. Autovacuum is forced as a table approaches its safe age, even if ordinary autovacuum is disabled. PostgreSQL 14 also has separate ages for tuple eligibility, aggressive scanning, forced vacuum, and failsafe prioritization; see [VACUUM phases and XID freezing](/en/notes/database/postgresql-vacuum-phases-and-freezing/) for the thresholds, `all_visible`/`all_frozen`, MultiXacts, and how to inspect age by table. If protection fails, the server can refuse new transactions to preserve correctness.

Monitor `age(relfrozenxid)` by table, `age(datfrozenxid)` by database, MultiXact age (`relminmxid`/`datminmxid`), autovacuum logs, and vacuum progress. A long-running transaction, prepared transaction, or old replication slot can retain a horizon and prevent vacuum from advancing; identify the cause before simply increasing worker counts or thresholds. Do not wait for a severe wraparound warning before acting.

## Retained horizons and bloat

A long-running transaction holds an old snapshot; a replication slot can retain WAL and a cleanup horizon; a standby can delay cleanup to protect a running query. Vacuum may run but cannot reclaim versions that could still be referenced. Find the transaction, slot, or replica retaining the horizon using statistics and catalogs, then address that owner. Dropping an active slot can prevent a replica from catching up.

Bloat is relation space that cannot yet be reused or that has grown due to update/delete patterns and workload characteristics. Measure with appropriate tools instead of relying only on file size; distinguish table, index, TOAST, and WAL growth. Reindexing or rewriting costs locks, I/O, and extra disk; choose an appropriate online tool and test on a copy.

## Measure density before deciding to rewrite

A large file alone does not prove that a table is bloated. A relation may be large because it contains a lot of data; conversely, two tables of similar size can have very different numbers of useful tuples. Look at size together with live tuples, dead tuples, and reusable free space.

`pgstattuple` reads the whole relation and reports an accurate breakdown of bytes used by live tuples, dead tuples, and free space. The measurement itself can require substantial I/O. `pgstattuple_approx` uses the visibility map to skip pages already known to be all-visible and estimates the rest; it is faster, but not an exact measurement. Both functions are provided by an extension that must be installed in the database.

For B-trees, `pgstatindex` reports values such as `avg_leaf_density`, the average occupancy of leaf pages, and `leaf_fragmentation`, how far the leaf pages are from physical order. It must read the index, so treat it as an observation with a cost rather than a lightweight query to run continuously. A ratio based on catalog sizes and estimated data bytes is faster, but only a rough signal: it does not directly tell you how many useful tuples each page holds.

The book measures an example table at roughly 67 MB and its index at roughly 109 MB. After deleting 90% of the rows and running ordinary VACUUM, the file sizes remain about the same; measured live-tuple density is around 9.13% for the table and 6.71% for the index. After `VACUUM FULL`, that example is about 6,904 kB and 6,504 kB, with density around 91.23% and 91.08%, respectively. These are results for the book's data and version, not universal production thresholds. The lesson is that ordinary VACUUM makes empty page space reusable, while a rewrite packs live tuples into fewer pages and shrinks the files.

## VACUUM FULL rewrites a relation

Ordinary VACUUM keeps empty pages inside the relation so later INSERTs or UPDATEs can reuse them. If empty pages are at the end of a file, some can be truncated and returned to the operating system; scattered free space inside the file generally does not make the file smaller. VACUUM can therefore reduce future write work while the file size stays unchanged.

`VACUUM FULL` creates a denser rewritten copy of the table and rebuilds its indexes. The old and new files coexist during the operation, so plan for substantial temporary disk space. It holds an `ACCESS EXCLUSIVE` lock on the table: both readers and writers must wait. It can make sense when returning disk space to the filesystem is necessary and measurements show a sparse relation, but it costs lock time, I/O, and disk headroom. If the goal is only to reclaim space for reuse inside the table, ordinary VACUUM is usually the better fit.

You can monitor the rewrite through `pg_stat_progress_cluster`; the historical “cluster” name remains because VACUUM FULL uses the relation-rewrite mechanism associated with `CLUSTER`. Read the current phase and counters instead of estimating progress from file size alone. Tuples are frozen while the new copy is built at little extra cost, but that does not mean the visibility map marks every page `all_visible` or `all_frozen`. A later VACUUM can update those page states. Tuple freezing and page visibility for index-only scans are separate things.

Before choosing a rewrite, answer three questions: do you need to return disk space to the filesystem, or only make space reusable; which measurements show that useful data density is low; and do you have enough temporary disk and a maintenance window for a table lock? If those answers are unclear, keep measuring and address any retained horizon first.


## Other rebuild methods and reducing downtime

`CLUSTER table USING index_name` rewrites a table in the order of an index. This can help some index scans read nearby rows from nearby locations, but PostgreSQL does not preserve that physical order as the table receives later INSERTs and UPDATEs. `CLUSTER` also needs a strong lock for the operation and temporary disk space for the rewrite. It solves a specific physical-locality problem; it does not permanently enable clustering.

`REINDEX` rebuilds an index without rewriting the heap table. Use it when measurements point to an index problem; it does not compact heap-table bloat. Online modes such as `REINDEX CONCURRENTLY` reduce the period during which writes are blocked through a multi-step process, but do not eliminate every short lock or the I/O and disk cost. Check support in the PostgreSQL version you run.

If the goal is to remove every row, `TRUNCATE` generally creates an empty file faster than deleting every row and waiting for VACUUM. Its semantics differ from row-by-row DELETE: it takes a strong table lock and has different trigger, foreign-key, and MVCC behavior. Choose it according to application requirements, not speed alone.

When a long table lock is unacceptable, a tool such as `pg_repack` builds a replacement while the application continues writing, records the changes made during the rebuild, then catches up before the final swap. This is more complex, requires extra space, and still needs short locks at the beginning and end; the extension must also match the server version. `pgcompacttable` takes another approach: it gradually moves rows toward the start of the file through updates that do not change values, with VACUUM between batches to reclaim pages at the end. It avoids a full replacement copy but is slower, creates additional writes and I/O, and is not free of operational cost.

## Prevent bloat from old snapshots and bulk updates

A read-only transaction can still hold an old snapshot. If another workload keeps updating or deleting rows, VACUUM cannot remove versions that the snapshot might still see. Moving read traffic to a replica may reduce pressure on the primary in some architectures, at the cost of operations, replication lag, and potentially stale reads. First find out whether the transaction must remain open or whether the application or driver accidentally left it open.

The book describes `old_snapshot_threshold` as a way to limit snapshot age: after the threshold, an old query may receive a `snapshot too old` error if it needs to read a page that has changed. This trades the availability of old snapshots for cleanup; it does not fix a leaked transaction. Confirm that the setting exists and check its behavior in the server version you run before depending on it. `idle_in_transaction_session_timeout` is a different safeguard: it aborts a session left idle inside a transaction after the configured duration, but does not replace proper transaction management in the application.

A bulk UPDATE creates new row versions before VACUUM can reclaim the old ones, so the table can grow sharply. In the book's 50,000-row example, adding a status column and changing every row grows `pg_table_size` from about 6,936 kB to 14 MB. Instead of one enormous transaction, process small batches and commit between them so VACUUM has a chance to reuse pages. This pattern selects and locks at most one batch; `SKIP LOCKED` lets a worker skip rows locked by another worker:

```sql
WITH batch AS (
  SELECT id
  FROM items
  WHERE NOT processed
  ORDER BY id
  LIMIT 1000
  FOR UPDATE SKIP LOCKED
)
UPDATE items AS i
SET processed = true
FROM batch
WHERE i.id = batch.id;
```

Commit each batch, let autovacuum or a deliberate VACUUM schedule catch up, then continue until no rows remain. Smaller batches limit the number of dead versions accumulated at once and make the job easier to pause or resume; they add transactions and require a selection rule that will not skip rows forever. They do not guarantee that the file immediately shrinks: the near-term goal is page reuse and avoiding a large bloat spike.

## A practical response

When a table grows quickly, inspect write rate, dead tuples, last vacuum/analyze, autovacuum logs, long transactions, and replication slots. Check whether planner statistics are stale. Change resources or thresholds only after identifying the bottleneck, then track processing time and latency impact.

*PostgreSQL Internals 14*, Part I, explains vacuum, visibility, and freezing. References: [routine vacuuming](https://www.postgresql.org/docs/14/routine-vacuuming.html), [VACUUM](https://www.postgresql.org/docs/14/sql-vacuum.html), [CLUSTER](https://www.postgresql.org/docs/14/sql-cluster.html), [REINDEX](https://www.postgresql.org/docs/14/sql-reindex.html), [progress reporting](https://www.postgresql.org/docs/14/progress-reporting.html#VACUUM-PROGRESS-REPORTING), [pgstattuple](https://www.postgresql.org/docs/14/pgstattuple.html), [autovacuum configuration](https://www.postgresql.org/docs/14/runtime-config-autovacuum.html), [transaction ID wraparound](https://www.postgresql.org/docs/14/routine-vacuuming.html#VACUUM-FOR-WRAPAROUND), and [monitoring statistics](https://www.postgresql.org/docs/14/monitoring-stats.html).

## Check your understanding

**Does ordinary VACUUM immediately shrink the table file?** No. It generally marks space for reuse inside the relation.

**Does `ANALYZE` remove dead tuples?** No. It gathers statistics; `VACUUM` performs cleanup.

**Can autovacuum be disabled when it causes I/O?** Disabling it without a replacement maintenance process accumulates dead tuples and raises wraparound risk. Tune workload, resources, or thresholds using measurements.
