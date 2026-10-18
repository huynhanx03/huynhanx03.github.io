---
title: "Consistent MySQL Backups and Point-in-Time Recovery"
category: "Database"
description: "From RPO/RTO to snapshots, binary logs, and restore drills: choose a backup method, preserve consistency, and recover the intended state."
updated: 2026-10-18
translationKey: "database/mysql-backup-and-point-in-time-recovery"
---

A backup is the ability to return to a useful data state after the rest of the system has failed. A file created successfully does not prove that it can be restored; a running replica does not prove that data from before an accidental delete can be recovered. Design backups from what must be recoverable, then practice recovery within the time the system can tolerate.

## Define scope, RPO, and RTO

Before choosing a tool, answer three questions:

1. **What must be recovered?** A whole instance, one database, one table, selected rows, schema, stored routines/events, users/privileges, or a transaction that failed?
2. **How much data can be lost?** This is the **RPO**. With only a full backup at 01:00, data after that point may be lost. Keeping binary logs continuously and safely can move the recovery point closer.
3. **How long can the service be down?** This is the **RTO**. RTO includes provisioning a machine, allocating storage/permissions, loading the backup, preparing/recovering, replaying logs, validating business data, and moving traffic—not only copying files.

Write the policy down so responders do not have to guess during an incident. An endpoint may tolerate slower recovery, while a ledger or payment path may require a low RPO and strict audit procedures. Separating data classes with different requirements helps control cost.

Backups support more than recovery from a dead server: accidental deletion or bad schema changes, comparing old data to fix a bug, historical auditing, upgrades, platform migration, and creating production-like test environments. Each purpose can require a different granularity and retention period.

## Backup and recovery are different jobs

A **backup** creates and retains a usable copy. **Restore** puts data from that copy where MySQL can read it. **Recovery** is the complete process of returning a function or server to service: selecting a copy, restoring, configuring, starting, running crash recovery, replaying logs, warming caches, validating the application, and restoring traffic.

InnoDB crash recovery after power loss uses redo/undo to complete committed work and roll back uncommitted work. It handles engine state after a crash; it does not recover a dropped table, undo an application bug, or replace PITR. These are different meanings of recovery.

Avoid labels such as “hot/warm/cold” unless the impact is clear. A method may keep the server online but block writes for seconds, consume CPU/I/O for hours, or permit reads during a dump. Measure lock duration, backup duration, resource impact, and restore duration directly.

## Replicas, RAID, and snapshots are not backups

A replica adds a node and can reduce load when taking a backup, but it usually receives `DROP TABLE`, incorrect updates, and corruption too. RAID or a storage mirror preserves a second copy of blocks, so it also copies damaged data. A snapshot provides a view at one point in time but may share the same account, region, or compromised permissions as the source.

Protect the backup from the same failure domain: store it away from the source machine/volume, limit write/delete rights, protect credentials/keys independently, and keep another copy in a different region or offline when requirements call for it. Encryption needs a key retention and recovery process; without the key, a secure file is unusable.

A replica is still useful as a **backup source**: backing up a replica can avoid load and locks on the primary. Verify that it has applied the intended data point and is not filtered or divergent; save the relevant GTID/position and replication metadata. A lagging replica may not catch up before the next backup window. A delayed replica creates time to stop before a destructive event is applied, but protects only within its delay and does not replace backups.

## Choose logical, physical, or snapshot backup

| Method | Strengths | Costs and limits | Often fits |
| --- | --- | --- | --- |
| Logical SQL dump | Readable/editable, can select database/table/rows, portable across machines and engines | Server must read/serialize; a large dump can consume CPU/network; restore parses SQL, writes rows, and rebuilds indexes slowly and sometimes unpredictably | Small/medium datasets, version/platform migration, partial recovery, or content inspection |
| Delimited export | `LOAD DATA` is often faster than many `INSERT` statements; useful for batch import/export | Must preserve schema, charset, delimiter, escaping, NULL/timezone, and ordering; `INTO OUTFILE` creates files on the MySQL host and needs file permissions | Large data loads or controlled table exchange |
| Physical/raw backup | Copies pages/files and usually restores quickly; often more compact for large datasets | Must keep files, redo, and metadata consistent; depends on version/platform/layout; table-level granularity is not always available | Large datasets, short RTO, and a tool with a clear prepare/restore protocol |
| Filesystem/storage snapshot | Captures a volume quickly; shortens the time locks must be held; can be copied later | A snapshot is not a second backup; copy-on-write needs headroom; multiple volumes may not share one instant; crash recovery must be understood | Volume layouts that support consistent snapshots and have been practiced |

No one choice wins in every situation. Many systems use regular physical full/incremental backups for fast restore, binary logs to reach a later point, and periodic logical dumps for portable/object-level recovery. Incrementals reduce bytes stored/transferred but require the correct chain during recovery. If one base or incremental is corrupt, later copies may depend on it; periodic full backups and per-generation verification reduce chain risk.

### Incremental and differential backups use different comparison points

A **full backup** stores an independent baseline. An **incremental backup** stores changes since the most recent backup, whether that was full or incremental. A **differential backup** stores changes since the most recent full backup. Incrementals are often smaller each day but create a longer restore chain; differentials grow until the next full but need only the full and latest differential during restore.

For example: take a full backup on Sunday, incrementals on Monday and Tuesday, and differentials on Monday and Tuesday. Restoring Tuesday's incremental requires Sunday's full followed by Monday's and Tuesday's incrementals in order. Restoring Tuesday's differential requires Sunday's full and Tuesday's differential only. If an incremental link is missing or corrupt, do not treat the chain as fully recovered; verify each component's manifest, order, checksum, and data point.

A physical-backup tool may define “incremental” in terms of pages/LSNs or its own mechanism, so do not infer file-merge behavior from the name alone. Record the base backup, dependent generations, tool/version, and binlog/GTID coordinate. After the base is restored, replay binary logs from that coordinate to the recovery target; the incremental chain and binary logs serve different purposes.

For a large logical dump, consider separating schema/data and splitting by table/chunk so you can inspect or recover part of it. A monolithic SQL file mixes DDL and data, uses large statements, and is difficult to filter for one table. Delimited formats can load faster, but encoding/escaping and schema must match. Dump duration does not predict restore duration: index building, foreign-key checks, redo volume, and I/O limits make restore materially different.

## A snapshot must be consistent at both transaction and file levels

There are two distinct requirements:

- **Data consistency:** related tables represent one coherent logical state. If a payment is backed up at one time and its invoice at another, the application may see a combination that never existed in production.
- **File consistency:** each file and the related file set must form an engine state that can recover. Copying individual datafiles and redo logs at different times can produce a mismatched set.

`mysqldump --single-transaction` creates a consistent read for transactional tables such as InnoDB without locking them for the entire dump. It does not make MyISAM/MEMORY consistent, and concurrent DDL such as `ALTER`, `DROP`, `RENAME`, or `TRUNCATE` can invalidate the result. Schedule schema changes, preserve metadata consistency, and use the correct coordinate option if creating a replica from the dump. Verify syntax and privileges for the MySQL release in use.

A global read lock (`FLUSH TABLES WITH READ LOCK`) can block writes and create queues, especially while a long statement finishes or many tables are flushed. Do not treat it as a “quick” step without measuring wait and duration. For transactional engines, a consistent snapshot usually avoids holding a global lock for long; nontransactional tables need a separate plan or should be phased out of critical workloads.

A raw copy while `mysqld` is running does not automatically become a valid backup. A filesystem snapshot can capture a crash-consistent view at one instant; after restore, InnoDB must recover from the matching data and redo set. Put the required data/redo inside a supported snapshot/failure boundary, retain related metadata, monitor copy-on-write capacity, and test opening the copy in an isolated instance. A fast snapshot is only the first step; copy it to independent backup storage before deleting the snapshot.

### How COW snapshots work and how to estimate headroom

An LVM snapshot is a logical view at creation time, not an immediate full physical copy. At first, it reads unchanged blocks from the original volume. When MySQL first overwrites a block after the snapshot, LVM saves the old block in copy-on-write space; later writes to that same block do not need another old copy. Capacity therefore depends on distinct blocks written while the snapshot stays open, not on the database's total size.

A first estimate is `fraction of writes to new blocks × write rate × copy duration`, plus headroom. The book's example uses 10 MB/s of writes, with about half reaching new blocks for an hour: `0.5 × 10 × 3,600 = 18,000 MB`, plus a safety margin. If COW space fills, the snapshot can become unusable and reads from the backup job can fail. Snapshot reads and writes also add seek/I/O overhead and can slow both MySQL and the copy process; measure on the actual workload instead of treating the book's old benchmark as sizing guidance.

### Short-lock snapshots and lock-free InnoDB snapshots

To reduce the time under a global read lock, place all required InnoDB data and redo inside the same consistency boundary. If table definitions must be restored too, include the data directory/metadata in that snapshot or back up the schema separately. Sequential snapshots of multiple logical volumes are not automatically from one point in time; use a storage consistency group or an equivalent coordination procedure.

With a lock-based procedure, hold the lock only long enough to establish the required state/coordinates and create the snapshot; release it before copying the data to long-term backup storage. InnoDB background threads can continue writing while tables are locked, so the snapshot resembles files after an ordinary crash. This is why data and redo must be captured together: when the isolated copy starts, InnoDB recovery applies committed transactions that had not reached data pages yet. Opening the copy and checking its engine/tables during backup creation can reveal damaged files early and shorten a real restore.

A procedure without a global lock is suitable only when the engine/workload allows it and nontransactional metadata is not changing during the snapshot. The book's versions obtained a binary-log coordinate from snapshot recovery; current deployments must obtain coordinates using the method documented for their release. The book also warns about prepared XA transactions and a different `server_id` in its old recovery path; treat that as version-dependent and always verify a snapshot on an isolated server before counting it as a backup.

## What else belongs in the backup set?

Create a manifest based on the recovery target; it may include:

- schema, data, views, triggers, routines, events, and required runtime configuration;
- MySQL version, plugins, charset/collation, SQL mode, and parameter set;
- users/grants, secrets/certificate references, and a key recovery process;
- binary logs, GTID/position, and required replication topology/metadata;
- job schedules, scripts, file mappings, network/DNS assumptions, and runbooks;
- backup timestamp, consistency point, tool/version, checksums, and encryption metadata.

Not everything belongs in one archive. Data, binary logs, and system configuration may need different retention, encryption, and permissions. The restore procedure must still identify where to retrieve every piece. A backup with rows but without schema, grants, keys, or the right version may not bring the application back online.

## Binary logs connect a base backup to a recovery point

PITR requires a base backup with a clear consistency coordinate, continuous binary logs from that coordinate to the target, and an exact stopping point. Binary logging is enabled by default in MySQL 8.4, but that does not mean logs exist off the server or are retained long enough. Copy binlogs to another failure domain frequently; if the maximum RPO is 15 minutes, the unarchived-log gap must be shorter than that budget.

Retention must satisfy the PITR window, maximum replica lag, time to create a new replica, and audit requirements together. Auto-purge manages disk use; it does not know your backup meaning. Before purging, confirm an off-host copy has all required logs, each replica has passed the segment it needs, and retention still meets the recovery window. Do not delete files using ad hoc filesystem commands that can desynchronize index metadata.

The log contains events/positions, GTIDs, timestamps, and row/statement representations depending on format. Timestamps help narrow the search; event positions or GTID boundaries are usually more useful for exact stopping. Row-based events are not always readable SQL. Before replay, identify the timezone, transaction boundaries, database filters, and required privileges.

## PITR example: an accidental table drop

Suppose a tested full backup at 01:00 exists, binlogs have been archived continuously through 14:00, and the accidental drop happened at 13:42. Do not immediately restore over the primary. Create an isolated instance with a compatible major version/configuration, restore the 01:00 copy, verify its coordinate, replay the binary log up to just before the drop transaction, and stop.

Then compare row counts, schema, foreign-key/business invariants, and application queries. If only one table is needed, extract it from the recovery instance instead of discarding all production changes since 01:00. However, transactions after the drop may have updated that table and other tables together; merging an old table can create an inconsistent state. Understand relationships, affected transactions, and the business repair before cutover.

The backup/binlog RPO in this example can be close to 13:42, but RTO still includes provisioning, loading the backup, replaying nearly 13 hours of logs, validation, and cutover. Measure replay throughput on production-like data. If recovery takes 20 hours while the RTO is 2 hours, increase base-backup frequency or choose a suitable physical/incremental strategy; do not only make dump creation faster.

### Use a delayed replica for faster recovery

A delayed replica can shorten recovery if the incident is noticed before the bad event is applied. Stop the applier before that event, identify the exact event/transaction, then create a recovery source or extract data using a tested runbook. Do not mechanically follow old instructions such as `SQL_SLAVE_SKIP_COUNTER`; command names and replication mechanisms vary by version, and skipping the wrong event can hide divergence. MySQL 8.4 can run a replica to a binary-log position or GTID with `START REPLICA ... UNTIL`; inspect the applier state and coordinate after it stops, because an incorrect target can apply the event you meant to avoid.

### Use a log server to reconstruct one table

If you need to recover one table while preserving most of the server's current state, build a separate recovery replica: restore the latest suitable backup to an isolated host, have it read the binary log from the backup's exact coordinate, then apply a replication filter for the table being recovered. Stop the replica just before the destructive transaction, inspect the reconstructed table, and export/import it through a controlled merge plan. The log server supplies the binary logs; it does not decide which data is safe to merge.

A filter does not understand business relationships between tables. With statement-based logging, a multi-table statement may run against a different state and produce different results. Row-based logging records changes per row, which avoids that specific replay error on a different state, but you must still check filter behavior, DDL, triggers, and cross-table invariants for the exact release. If one transaction updates several tables together, restoring only one table can break consistency even when that table's row changes replay accurately. Do not try this on production; compare the result and validate queries/invariants before merging. The book's `START SLAVE` syntax is old; MySQL 8.4 uses `START REPLICA` and current replication-filter mechanisms.

## Restore drills test the backup

Each backup generation needs checks independent of the backup process: job exit status, age of the latest copy, unexpected size, checksum, completed upload, encryption-key availability, and binlog gaps. A green backup job is not enough if it never reads data back or its upload was truncated.

Periodically restore into an isolated environment and complete the recovery path:

1. Retrieve artifacts/keys/manifest from storage as if the source were gone.
2. Provision the right version/extensions/configuration and disk capacity.
3. Restore the raw or logical backup; run prepare/crash recovery if required by the tool.
4. Replay binlogs to the target and record the ending coordinate.
5. Check schema, objects, row counts, sample checksums, and business invariants.
6. Run application smoke tests, measure cache warmup and latency.
7. Practice endpoint movement, client reconnection, rollback, and replica rebuilding.
8. Record wall-clock time, people, bytes, CPU, I/O, and failures; update policy/runbooks.

Keep the recovered server isolated or read-only until validation is done. For a raw restore, restore correct file ownership/permissions before startup, watch the error log through startup, then confirm InnoDB is active and the tables are queryable; an open port alone does not prove the engine recovered. Loading a dump may continue after a failing statement rather than abort; inspect exit status and logs instead of assuming every statement succeeded because the command ended.

### Raw-file restore depends on the storage engine

“All the files are present” does not mean “the files form a consistent dataset.” Before copying a raw backup, identify the storage engine, tablespace layout, server version, and consistency protocol used by the backup tool. Do not mix files from different points in time or casually pair newer data files with older redo logs: InnoDB needs a file set that can pass crash recovery together, not a handful of files that merely look related.

In the MyISAM layout described by the book, data and indexes live in separate files such as `.MYD` and `.MYI`; replacing files while a table is open can leave the server with stale state or cause errors. Safely close the table—stop writes and close/flush it using the version-appropriate method, or stop the server—before replacing the correct file set. Filenames and metadata storage vary by release; modern MySQL no longer uses `.frm` files, so do not copy an edition-era command blindly onto a current server.

InnoDB is more involved because a table may depend on the system/shared tablespace, data dictionary, redo, and instance metadata. To restore a whole instance, stop MySQL and restore a compatible physical backup set; perform the backup tool's required prepare/apply-log step before startup. To recover one table from a file-per-table tablespace, use the checked transportable-tablespace procedure, including steps such as export/discard/import; do not simply copy an `.ibd` file into the data directory. MySQL 8.4 requires `innodb_file_per_table`; page size must match, and when moving between instances both must be the same GA release/version. Schema, row format, and `DATA DIRECTORY` configuration can also determine whether import is valid. With foreign keys, the engine does not validate constraints during import; export related tables at the same logical point and validate the relationships afterward. See [MySQL 8.4: Importing InnoDB Tables](https://dev.mysql.com/doc/refman/8.4/en/innodb-table-import.html) for current prerequisites.

After placing the files, set ownership and permissions for the host, start without application traffic, inspect the error log, and verify the engine, schema, tables, and data are accessible. If compatibility is uncertain, preserve the original set and test the restore in a separate directory or instance; do not experiment by overwriting the only remaining copy.

### Logical restore needs error and scope control

A SQL dump is executable SQL, not just a block of data. Inspect its structure to learn which databases and tables it creates, whether it contains `DROP` or `CREATE` statements, and whether it includes schema, data, or both. If you may need to restore one table, separate schema and data—or dump each table separately—from the start. That is easier to control than extracting a few lines from a huge file. The `SOURCE` command in the mysql client may continue after a statement fails; when using it, inspect each result and the logs instead of treating the load as atomic.

For delimited dumps, restore with `LOAD DATA` or `mysqlimport` using the same delimiter, escaping, character set, column order, and line rules used during export. For a large compressed file, streaming decompression can avoid an intermediate disk write, but the pipeline must propagate failures from every process (`pipefail` in a compatible shell), record row/warning counts, and preserve the source artifact. Named pipes are OS- and permission-dependent; do not treat the book's FIFO example as portable across environments.

Before loading, decide whether the restore should be written to the binary log for replicas; do not disable binary logging by habit. Split large loads into reasonable batches/transactions, monitor log space and rollback cost, then verify objects, row counts, and invariants after each important scope. If PITR will replay logs afterward, define the start point, stop point, and database/table scope explicitly so event order remains clear.

## Choose a backup tool by its consistency protocol

A tool's name does not prove that its output is restorable. Understand which files it captures, how it records redo/binlog coordinates, whether a **prepare** step applies logs to make the file set consistent, and whether restore requires the server to stop. In the edition described by the book, MySQL Enterprise Backup was presented as a physical InnoDB backup that could run while the server stayed up, without stopping or locking it, but added server load; the book lists compression, incremental, and streaming modes. Percona XtraBackup also ran outside the server: a background thread followed redo while data files were copied without querying MySQL, then a prepare step applied redo using crash-recovery logic to bring files captured at different times into a consistent state. The prepared copy contains committed transactions through the end of the copy phase. Treat these as edition-era descriptions rather than assuming every current tool detail is unchanged.

`mylvmbackup` illustrates a short LVM snapshot consistency window: obtain a global read lock, create the snapshot, release the lock, then use `tar` to compress snapshot data and remove the snapshot when done. Consistency depends on the snapshot point and engine/log protocol; tarring a live data directory is not a substitute for a snapshot. Zmanda Recovery Manager illustrates a management layer around dumps, LVM, or physical backups for scheduling, verification, and recovery. `mydumper` illustrates parallel logical dump/load; parallelism may reduce elapsed time while increasing CPU/I/O load and still needs consistency and restore checks. `mysqldump` is useful for portable SQL or a small restore scope, but restoring a large dataset can take much longer than creating the dump.

Do not trust a file-copy command just because it created an archive. The book warns that `mysqlhotcopy` and some old tools could copy `.ibd` files individually and create the illusion of an InnoDB backup; a datafile needs matching metadata, redo, and an engine-aware procedure. Names such as `mysqlhotcopy`, `mk-parallel-dump`, and `mylvmbackup`, plus the tool behavior described in the book, are historical. Before using any tool, verify support for the current release/topology and prove it with a restore drill.

A backup script is part of the consistency protocol too. Use fail-fast handling and check each step's exit code; inventory schemas/tables safely instead of listing and locking each table across a race with DDL; record timestamps, tool/version, and source/replica binlog or GTID coordinates; rotate or purge logs only after confirming retention. A metadata query that lists every table's status can itself overload a large server, so measure before relying on it.

### Control the steps in the backup script

A reliable script handles both control flow and data: parse options with a standard library for consistent help/validation; enable strict error handling; configure DBI/client failures to be explicit; and read credentials from a protected option file or secret manager instead of source code, shell history, or process arguments. Validate the host, port, database, tool version, privileges, output directory, free space, and retention policy before side effects. A shutdown command only initiates the stop process; before copying raw files, wait for the service manager/process to confirm that the server has fully stopped.

When building an inventory, distinguish real databases/schemas from system schemas or filesystem entries such as `lost+found`; handle views explicitly instead of assuming every object can be copied like a physical table. `SHOW TABLE STATUS` can be very slow on a large InnoDB server, so call it only when the workflow needs that metadata. Do not list objects and then lock each table in sequence as though the whole backup represented one point in time: DDL can create, rename, or drop objects between steps, and new objects can escape the logical snapshot.

If the workflow requires locking and flushing, lock a defined set or use a global read lock according to the consistency protocol; measure wait time and keep the lock only as long as necessary. `FLUSH LOGS` starts a new log file, which can make a manifest's starting boundary easier to manage, but it also closes and reopens related logs. Ensure older logs have been archived and retention will not remove PITR history before rotating. Record coordinates tied to the consistency point. In MySQL 8.4, use `SHOW BINARY LOG STATUS` for source binlog position/GTID and `SHOW REPLICA STATUS` for replica channel/applier state. A command may not apply or may lack permission for a given role, so save what is available and record which command was inapplicable. The book's `SHOW MASTER STATUS` / `SHOW SLAVE STATUS` names are old syntax.

## Protect against corruption and know repair limits

InnoDB crash recovery handles ordinary crashes; corruption can come from RAM/storage, devices that falsely report flush completion, unprotected writeback caches, bugs, or bad operations. The extent of damage determines the recovery path:

- **Secondary-index corruption:** the index can often be rebuilt from clustered data if the original rows are readable.
- **Clustered-index corruption:** the rows themselves are affected; recovery may require dumping small ranges to skip pages that crash the read, with possible data loss in unreadable ranges.
- **System-structure corruption:** damage to redo/transaction logs, the undo area, or the data dictionary may require exporting whatever is readable and rebuilding from a good backup.

If InnoDB will not start, `innodb_force_recovery` is an emergency mechanism for attempting to read/export data, not a repair procedure for resuming production. Value 0 is normal startup; levels 1–6 progressively skip recovery or checks so the server may stay available long enough to extract data. In MySQL 8.4, the levels mean:

| Level | What is skipped | What it means |
| ---: | --- | --- |
| 1 | Ignore some corrupt-page detections and try to let `SELECT` skip corrupt records/pages | You may read intact portions; the dump can omit the damaged area. |
| 2 | Stop the master and purge threads | Avoids repeated crashes in background/purge work; this is not a normal operating state. |
| 3 | Do not roll back transactions after crash recovery | Incomplete transactions may leave traces; treat the dump as emergency extraction. |
| 4 | Do not merge the change buffer or calculate some table statistics | InnoDB becomes read-only; data files can be permanently corrupted and secondary indexes may need rebuilding. |
| 5 | Do not scan undo logs at startup, so incomplete transactions can be treated as committed | This can expose inconsistent state and corrupt data files. |
| 6 | Do not apply redo logs to roll forward | Pages remain stale, potentially corrupting B-trees and other structures further. |

At every nonzero level, MySQL 8.4 blocks `INSERT`, `UPDATE`, and `DELETE`; level 4 and above is read-only, and level 4+ can permanently corrupt data files. Start at 1 and increase one level only if the previous level cannot start/read the server; test level 4+ on a separate physical copy before considering any production instance. Once readable, dump data elsewhere and rebuild from a clean backup/schema; do not clear the option and keep using the data directory as if it had been repaired. If corruption prevents reading a whole table, try extracting small ranges; a descending primary-key scan may sometimes recover the portion after the damaged region, but success is not guaranteed and must be cross-checked.

The book describes levels 1–6 and treats up to level 4 as relatively less dangerous in its publication-era context. Do not carry that advice over to MySQL 8.4: the current manual warns that level 4 and higher can permanently corrupt data files. Follow the exact release manual and prefer restoring a good backup over repairing system structures in place.

Do not modify the original backup while investigating. Preserve a copy, logs/coordinates, file hashes, and a record of every action. If the file set may be inconsistent, prefer a verified backup over forcing a damaged data directory to continue.

## Transfer a large backup while controlling failure

A backup file moving from source to destination may be limited by compression CPU, read/write speed, network bandwidth, SSH encryption, or decompression speed. The sequential approach “compress to a file → copy the file → decompress it” often reads and writes intermediate data several times. A pipeline lets stages run concurrently and reduces intermediate disk I/O:

```bash
set -o pipefail
gzip -1 -c backup.sql | ssh backup-host 'cat > backup.sql.gz.tmp'
```

This only illustrates the data flow; a production script must check exit status, host authentication, file permissions, free space, and cleanup after failure. Rename the temporary file to its final name only after the stream completes and validation succeeds. Fast compression may save CPU while adding little transfer size; stronger compression may make CPU the bottleneck. Benchmark on a setup resembling production.

SSH provides encryption and peer authentication when configured correctly, at a CPU cost. Raw transfer with `nc` skips that protection; do not use it on an untrusted network or for sensitive data. `rsync` is useful when a transfer must resume or send only differences, but its efficiency depends on delta reuse and the destination state. For an immutable backup file, copying the whole object may be simpler.

Successful validation should include the exit status of the whole pipeline, expected size, a checksum compared across both ends when required by the threat model, and the ability to read or restore the backup. A gzip CRC catches some accidental corruption; it does not replace a cryptographic checksum when identity or tampering matters. Do not copy live InnoDB files as if they were a consistent snapshot; use an engine-aware physical-backup tool or a correctly coordinated snapshot method.

Before adding parallel streams, measure CPU, disk queue/latency, network throughput, and MySQL I/O. More workers can reduce duration when capacity is available; too many can make the backup compete with the primary workload and slow both.

## Check your understanding

**Does last night’s full backup meet a five-minute RPO?** No. You need continuous binary logs that can be replayed, retained outside the source failure domain, with their archive lag measured.

**Does `--single-transaction` make every engine/table consistent?** No. It snapshots transactional tables; concurrent DDL and nontransactional tables need separate planning.

**Is a snapshot a complete backup as soon as it is created?** No. Copy it to independent storage, keep enough copy-on-write headroom while copying, and test restore/recovery.

**Is PITR finished when binlog replay ends?** Not yet. Validation, warmup, endpoint cutover, client reconnection, and confirmation of actual RTO/RPO remain.

**Can you set `innodb_force_recovery=4` because the book calls it relatively safe?** Do not carry that old advice into MySQL 8.4. The current manual treats level 4 and higher as dangerous to data files; test on a separate copy and raise the level one step at a time only to extract data.

**Are levels 3 and 5 equivalent because both skip rollback?** No. Level 3 skips transaction undo after crash recovery; level 5 skips undo-log scanning at startup and can treat incomplete transactions as committed, a different and higher-risk behavior.

Primary source: *High Performance MySQL*, Chapter 15, PDF pp. 692–693 (printed pp. 662–663) on backup-script building blocks and PDF pp. 686–688 (printed pp. 656–658) on crash recovery, corruption types, and `innodb_force_recovery` levels. Tools such as `mylvmbackup`, `mysqlhotcopy`, Maatkit, the `expire_logs_days` option, and replication command examples in the book belong to an older release era and should be verified before use. Current backup behavior was cross-checked against the MySQL 8.4 documentation for [backup and recovery](https://dev.mysql.com/doc/refman/8.4/en/backup-and-recovery.html), [backup types](https://dev.mysql.com/doc/refman/8.4/en/backup-types.html), [backup methods](https://dev.mysql.com/doc/refman/8.4/en/backup-methods.html), [mysqldump](https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html), [PITR](https://dev.mysql.com/doc/refman/8.4/en/point-in-time-recovery.html), [binary-log retention/purge](https://dev.mysql.com/doc/refman/8.4/en/replication-options-binary-log.html), [`SHOW BINARY LOG STATUS`](https://dev.mysql.com/doc/refman/8.4/en/show-binary-log-status.html), [`SHOW REPLICA STATUS`](https://dev.mysql.com/doc/refman/8.4/en/show-replica-status.html), [START REPLICA UNTIL](https://dev.mysql.com/doc/refman/8.4/en/start-replica.html), [table-level replication filters](https://dev.mysql.com/doc/refman/8.4/en/replication-rules-table-options.html), [server shutdown](https://dev.mysql.com/doc/refman/8.4/en/server-shutdown.html), and [forced InnoDB recovery levels](https://dev.mysql.com/doc/refman/8.4/en/forcing-innodb-recovery.html).
