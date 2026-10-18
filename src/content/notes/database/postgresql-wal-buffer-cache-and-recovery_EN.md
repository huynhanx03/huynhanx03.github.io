---
title: "PostgreSQL WAL, Buffer Cache, and Recovery"
category: "Database"
description: "Follow writes from shared buffers through WAL and checkpoints to crash recovery and point-in-time restore."
updated: 2026-10-18
translationKey: "database/postgresql-wal-buffer-cache-and-recovery"
---

A PostgreSQL transaction can report commit before every data page has been written to its heap file. This is still safe if the **Write-Ahead Log (WAL)** contains enough durable information to recover. WAL records changes in order; dirty data pages can be written later. This makes WAL both a crash-recovery mechanism and the basis for replication and point-in-time recovery.

## Shared buffers and WAL

A backend looks for a page in shared buffers and reads it in if absent. An UPDATE changes the in-memory page and marks it dirty. Before a dirty page reaches storage, its corresponding WAL record must be flushed at least through the required LSN: this is the write-ahead rule. With synchronous commit, PostgreSQL waits for the commit record to be flushed according to the durability setting; it need not flush every heap page touched by the transaction immediately.

WAL is divided into segments and records. An LSN (Log Sequence Number) is a monotonically advancing logical position. A page stores its most recently applied LSN; recovery can compare WAL and page state to replay the appropriate changes. `full_page_writes` helps protect against torn pages by logging the first page image after a checkpoint; it increases WAL volume but does not replace backups or reliable storage.


## What WAL records, and how to locate a record

WAL must record changes whose loss before a page flush could break consistency: modifications to buffer-cache pages, commit/rollback status, and relation-file creation or deletion. Unlogged and temporary tables do not have the same crash-recovery guarantee as logged tables; their data follows a separate lifecycle. Hash indexes have been WAL-logged in newer PostgreSQL versions than the early history mentioned by the book, so do not apply that old note to a current release.

Logically, WAL is a stream of variable-length records. A header identifies the transaction, the resource manager that interprets the record, its length/checksum, and a link to the previous record; the payload may contain page data to apply. Heap, individual index types, and transaction-status resource managers know how to interpret their records. WAL is therefore not a collection of SQL statements that can simply be replayed; `pg_waldump` decodes records for low-level inspection.

WAL buffers are shared-memory space that stages records before writing them to WAL segments. `wal_buffers` controls the size by release and has an automatically chosen default; increasing it does not automatically speed commits if the bottleneck is elsewhere. As a workload writes changes, `pg_current_wal_insert_lsn()` advances. An LSN is a 64-bit byte offset in the cluster-wide stream, commonly displayed as two hexadecimal numbers separated by `/`; subtracting two `pg_lsn` values gives the WAL bytes generated between them.

A trace from the book: after an `UPDATE`, the insert LSN advances and `pageinspect` shows the heap page's `pd_lsn` matching the latest record that changed it. `COMMIT` creates the next record, while the heap page may still not have been written to its file. Measuring the LSN difference around a workload estimates WAL bytes per workload or unit time—useful for checkpoint and archive planning, but measure representative traffic.

On disk, WAL lives in `pg_wal` as segments whose names encode the timeline and stream position; segment size is normally selected at `initdb`, not an arbitrary runtime setting. `pg_walfile_name_offset()` maps an LSN to a file and offset, `pg_ls_waldir()` lists files, and `pg_waldump` inspects records in an LSN range. These are diagnostic tools; never edit or delete WAL files managed by a live cluster.

## A checkpoint tags a set of pages; it does not freeze the system

At checkpoint start, the checkpointer writes a small amount of metadata and tags buffers that are dirty at that moment. It then visits tagged buffers and writes their pages; a backend may write a page first. A page is not evicted just because the checkpoint wrote it. Transactions continue meanwhile: a written page can become dirty again, but that later change is not part of the tag set for the current checkpoint.

The checkpoint completes only after every page in the initial set has been written. PostgreSQL then writes a checkpoint-completion record and updates `pg_control` to the completed checkpoint; the REDO point is the LSN at checkpoint start. Until completion, `pg_control` still refers to the previous checkpoint. A crash midway must therefore recover from the older point so it does not skip changes still needed by a page on disk.

In the book's example, an UPDATE dirties more than 4,000 buffers; `CHECKPOINT` on an otherwise idle system brings the dirty count to zero. `pg_waldump` shows the completion record and redo LSN; `pg_controldata` shows the corresponding checkpoint and REDO locations. On a live workload, dirty buffers can rise again during or after a checkpoint, so do not expect all buffers to remain clean.

## Checkpoints and crash recovery

A checkpoint is not a system-wide pause that flushes every page at once. At checkpoint start, PostgreSQL quickly writes the needed metadata and tags the buffers that are dirty at that moment. The checkpointer then writes those pages; a backend may write one first. Transactions continue meanwhile, and a page can become dirty again, but pages dirtied later are not part of this checkpoint's tagged set.

Only after every buffer that was dirty at the start has been written can the checkpoint complete and the REDO point advance to it. `pg_control` continues to refer to the prior completed checkpoint until completion is durably recorded; a crash midway therefore uses the older redo point rather than skipping WAL still needed by a page on disk. For a timeline: checkpoint A completes; checkpoint B tags page P; P is flushed, but Q is not, when the server crashes—the recovery start remains A. If B completes before the crash, recovery can use B's point. See the [PostgreSQL 14 checkpoint docs](https://www.postgresql.org/docs/14/sql-checkpoint.html) and [checkpoint control fields](https://www.postgresql.org/docs/14/functions-info.html).

Checkpointing too often raises I/O and WAL overhead; checkpointing too rarely lengthens recovery and requires more WAL. The background writer and checkpointer write dirty buffers; backends may also have to write pages in some situations.

After a crash, PostgreSQL reads the latest checkpoint and replays remaining WAL to bring data files to a consistent state. WAL therefore contains redo information, not a complete copy for restoring any arbitrary point in time. PITR requires a base backup plus a continuous WAL sequence through the target time.


## How startup recovery reads WAL

After startup, the startup process reads cluster state from `pg_control`. If the previous shutdown was unclean, it begins redo at the REDO LSN of the latest completed checkpoint; during base-backup recovery, `backup_label` can supply the start point associated with that backup. Startup reads WAL in order and applies records to their pages. For ordinary records, the page LSN shows whether the change is already present: if the page is newer, the old operation is not replayed. A full-page image is a special case that can replace a whole page to repair a torn write; transaction-status bits can also be set idempotently.

Recovery applies records through the buffer cache much like normal page changes. WAL also describes file operations so a missing relation can be recreated in sequence. After redo, PostgreSQL resets unlogged relations from their initialization forks and runs a checkpoint to protect the recovered state on disk. A transaction that was active at the crash does not require a separate undo phase in this process: no process for it remains, and without a commit record its row versions are not treated as committed.

An `immediate` stop simulates a crash: the cluster remains marked “in production,” so the next start must recover. A normal stop lets clients finish and performs a shutdown checkpoint; the cluster is marked “shut down,” and the next start does not need crash redo. Use `pg_controldata` to inspect state/checkpoint, startup logs to read `redo starts` and `redo done`, and `pg_waldump` to inspect records. These tools help explain recovery; do not simulate a crash by killing a production server or cutting power.

## Background writing and checkpoints share the flush work

If a backend needs a dirty page as its victim, it may have to write the page and wait. The checkpointer handles pages in its checkpoint set, while the background writer (bgwriter) tries to clean buffers likely to be evicted soon. In the book's PostgreSQL 14 description, bgwriter has its own clock hand, does not decrement usage counts, and writes a page when its buffer is unpinned, dirty, and has usage count zero. This gives eviction a better chance of finding a clean victim. Bgwriter does not replace checkpoints: a checkpoint must ensure its page set is durable before the REDO point can advance.

Checkpoint tuning balances three things: retained WAL volume, acceptable recovery time, and storage's ability to write pages. `checkpoint_timeout` limits the time between scheduled checkpoints; `max_wal_size` is a soft threshold that can trigger an earlier checkpoint when the workload generates WAL quickly. `checkpoint_completion_target` spreads writes across the interval between checkpoints to reduce bursts; tune it while checking whether the previous checkpoint can finish in time. Differences between insert LSN samples can estimate actual WAL generation and the volume produced in an interval, rather than copying the book's configuration numbers onto every machine.

In PostgreSQL 14, `log_checkpoints` logs buffers written, write/sync time, WAL files added/removed/recycled, and the WAL distance between checkpoints. `pg_stat_bgwriter` reports scheduled (`checkpoints_timed`) versus requested checkpoints (`checkpoints_req`), buffers written by checkpointer/bgwriter/backends, backend fsyncs, and how often bgwriter reached `maxwritten_clean`. Many requested checkpoints, or many backend-written buffers relative to the background processes, are signals to inspect workload, WAL targets, storage, and configuration. View and column names have changed across PostgreSQL releases, so dashboards must match the server version.

## Synchronous commit is a durability boundary

`synchronous_commit` controls whether a transaction waits for a local WAL flush and, depending on configuration, for additional confirmation from a synchronous standby. Disabling the local wait can reduce latency, but a server crash may lose a just-acknowledged commit; recovery remains consistent, but the application may lose a transaction it was told had succeeded. Standby synchronization has different semantics depending on `synchronous_standby_names` and the chosen wait level; receipt, flush, and apply are not the same moment.

Do not interpret “commit succeeded” separately from the durability policy, replication topology, and failure domain. Check the session/database/server setting, standby state, and documentation for the deployed version.


## Durability across operating-system and device caches

A successful write call does not necessarily mean the bytes have reached non-volatile media. Data may be in the OS page cache, a device cache, or a controller cache, each with its own flush policy. PostgreSQL must request a real synchronization of the WAL commit record before reporting synchronous commit as complete. Data pages may flush later, but a checkpoint must also make its data and file operations durable before declaring completion. A controller cache protected by battery/flash backup can improve performance without losing durability; if hardware reports a flush complete without honoring it, software cannot restore that guarantee.

`wal_sync_method` selects a WAL synchronization method for the OS/filesystem; `pg_test_fsync` helps measure available methods on the target machine. Choose based on the actual hardware and its guarantees, not another machine's result. `fsync=off` removes a synchronization requirement recovery relies on, so a crash or power loss can lose required WAL or corrupt the database. It is not the same as `synchronous_commit=off`: the latter can lose some recently acknowledged transactions while preserving crash recovery to a consistent state.

## Synchronous and asynchronous commit differ in when they wait

With synchronous commit, the client waits until the WAL commit record is durably flushed. Multiple transactions can share the sync cost through group commit. PostgreSQL 14 has `commit_delay`/`commit_siblings` to wait briefly in workloads with many short transactions and gather more commits into one sync; the default adds no wait, and tuning is justified only by measurement.

With `synchronous_commit=off`, the client may receive a response before the local WAL flush; walwriter writes WAL in the background. This can reduce latency for some workloads, but a machine failure can lose the most recent WAL and commits that had already been acknowledged. The book uses `3 × wal_writer_delay` as a conservative estimate based on the PostgreSQL 14 algorithm/configuration in its example, not a fixed loss-window guarantee for every setup. WAL needed by a dirty page about to be evicted may still be flushed early to preserve WAL-before-data. Per-transaction policy can be used for work that tolerates this risk, but classify it according to business invariants.

The book's pgbench run shows a large speedup for one specific workload; TPS and latency depend on machine, filesystem, client count, and workload, so the figures illustrate a mechanism rather than a promised gain. Measure throughput, p95/p99 latency, acknowledged-transaction loss window, and recovery behavior before changing policy.

## Checksums detect corruption; they do not repair it

WAL records have checksums to detect damaged records; data checksums can detect many forms of page corruption. In PostgreSQL 14, page checksums are enabled at `initdb` or changed offline with `pg_checksums` while the server is stopped. They are checked only when a page is read, so corruption can persist and reach every backup before detection. An all-zero page may appear valid, and checksums do not cover every file/fork, such as transaction-status storage. Checksums therefore complement backups, replicas, and storage scrubbing; they do not replace them.

`full_page_writes` logs a full-page image the first time a page is modified after a checkpoint so recovery can replace a torn page before applying smaller subsequent records. FPIs increase WAL, especially just after checkpoints; `wal_compression` can reduce bytes at CPU cost. The FPI ratio and compression benefit in the book come from a specific benchmark and `pg_waldump` output; they do not predict another workload. Repeated modifications to the same page between checkpoints reduce the FPI share. Do not disable `full_page_writes` just to reduce WAL volume. If a checksum fails, prioritize restoring from a sound copy; `ignore_checksum_failure` may allow a risky read attempt for some pages but does not repair data.

## WAL for backup and replication

Physical streaming replication ships WAL for a standby to replay; an archive command can store WAL in durable storage. Replication slots retain WAL required by consumers, but an abandoned slot can fill the disk. Logical decoding turns WAL into a change stream for publications/subscriptions or other consumers; it has filtering, replica-identity, and interface constraints and is not a raw byte copy.

PITR requires a consistent base backup, a complete WAL archive, the correct timeline/target, and a restore procedure that has been rehearsed. Enabling archiving without monitoring gaps, capacity, and recoverability does not make a trustworthy backup.

## Observation and configuration

Track `pg_stat_wal`, checkpoint statistics, WAL rate, replication lag, retained bytes, buffer hits, dirty buffers, and I/O. Tune `shared_buffers`, `wal_buffers`, `max_wal_size`, `checkpoint_timeout`, or `synchronous_commit` for the workload and durability constraints; no sample configuration is a universal optimum. Measure commit latency alongside throughput and recovery time.

*PostgreSQL Internals 14*, Part II, covers shared buffers, WAL, checkpoints, and recovery. Current references: [WAL introduction](https://www.postgresql.org/docs/current/wal-intro.html), [WAL configuration](https://www.postgresql.org/docs/current/runtime-config-wal.html), [continuous archiving and PITR](https://www.postgresql.org/docs/current/continuous-archiving.html), and [streaming replication](https://www.postgresql.org/docs/current/warm-standby.html).

## Check your understanding

**Why can commit finish before a heap page is written?** The commit record has been flushed according to policy; the dirty page can be written later and recovered by replay.

**Is a WAL archive alone enough for PITR?** No. A base backup and continuous WAL from that backup through the target are required.

**Does synchronous replication always wait for the standby to apply a transaction?** No. The wait condition depends on configuration; receipt, flush, and apply are distinct milestones.
