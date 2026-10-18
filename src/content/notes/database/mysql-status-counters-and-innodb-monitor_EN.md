---
title: "Reading Status Counters and the InnoDB Monitor"
category: "Database"
description: "Turn MySQL status into contextual evidence by reading scope, deltas, counter groups, and InnoDB Monitor sections."
updated: 2026-10-18
translationKey: "database/mysql-status-counters-and-innodb-monitor"
---

A MySQL number rarely explains its own cause. `Threads_running = 80` could mean a normal rise in load, lock waits, or too many operations competing at once. A rising `Created_tmp_disk_tables` counter does not prove that the disk is the bottleneck. To diagnose from status, identify what the value measures, the interval it covers, whether it is global or session-scoped, and which other signals support the hypothesis.

This lesson moves from snapshots to reasoning. Names such as `SHOW SLAVE STATUS`, `Qcache_*`, and `INFORMATION_SCHEMA.GLOBAL_STATUS` in *High Performance MySQL* describe MySQL 5.x. Treat them as historical context; on MySQL 8.4, prefer current statements, Performance Schema, and the `sys` schema.

## Three kinds of information to keep separate

A **system variable** is configuration or configuration state, usually read with `SHOW VARIABLES`. For example, `max_connections` is a configured limit. A **status variable** is a measurement exposed through `SHOW STATUS`. **Event instrumentation** records timed or related events such as statements, waits, transactions, and locks in Performance Schema. These layers answer different questions: how the server is configured, how much work it has done, and where that work spent time or waited.

`SHOW GLOBAL STATUS` returns global values or server-wide aggregates; `SHOW SESSION STATUS` returns values for the current connection. Without a scope modifier, MySQL defaults to session scope. Two people running `SHOW STATUS` in separate sessions can therefore see different values on the same server. Some variables exist at both scopes, others at only one. Check each variable's definition and scope in the manual for the server version.

Status values also differ in behavior. A **counter** usually increases since startup or reset, such as the number of connection attempts. A **gauge** represents a current level and can rise or fall, such as connected threads. A variable name alone may not make its category clear. Check the documentation and observe how it changes over time.

## Snapshots, deltas, and rates

Absolute counter values are often less useful than their rate of change. Take two samples with the same scope from the same server, separated by a known interval:

```text
rate = (counter_t2 - counter_t1) / (t2 - t1)
```

If `Connections` rises from 12,000 to 12,600 in 60 seconds, the server is accepting 10 connection attempts per second. That is not the number of open connections: use `Threads_connected` for the current gauge, and `Max_used_connections` for the peak since startup.

A collector should record the timestamp, host/instance, version, scope, and restart state. If the server restarts between samples, counters can fall; a negative delta does not mean “negative work.” Avoid dividing by an uneven sampling interval, and do not compare samples from two different primaries as if they were one continuous counter. Short intervals catch spikes but are noisy; long intervals smooth spikes and may hide brief incidents. Keep raw samples so you can analyze them with a different window later.

MySQL 8.4 supports `SHOW GLOBAL STATUS` and `SHOW SESSION STATUS`; `LIKE` can narrow the result. The right snapshot method depends on the collector and its privileges. When reading status through Performance Schema, remember that collection behavior depends on which threads are instrumented. Reading status has a cost and can itself affect some temporary-table counters, so polling more frequently is not automatically better.

## Read related status groups as one story

### Connections, threads, and network

`Connections` counts connection attempts, `Threads_connected` is the number of currently open connections, and `Threads_running` describes threads executing work rather than merely sleeping. `Threads_created` and `Threads_cached` help explain the thread cache, but growth in `Threads_created` alone does not prove the cache should be enlarged. `Aborted_connects` often points toward handshake errors, credentials, timeouts, or clients that fail to finish connecting; `Aborted_clients` usually concerns a connection closed abnormally after it was established. `Bytes_received` and `Bytes_sent` are cumulative traffic counters.

Ask paired questions: did the connection rate rise along with `Threads_connected`, or is there connection churn? Did `Threads_running` rise with CPU, lock waits, or disk latency? Is high bytes-sent caused by large results, excess round trips, or replication/client traffic? One variable suggests a direction; the process list, statement digests, network metrics, and logs add context.

### Commands, SELECTs, handlers, sorting, and temporary work

`Com_*` counts SQL/protocol command categories. `Questions` and similarly named variables have their own definitions, so do not assume they equal the sum of every `Com_*` value. Client pings can also increase `Com_admin_commands`. If an application pings immediately before each query, it adds a network round trip without guaranteeing the server is still healthy for the next command; that adds latency and creates a “check then use” race. Repeated `USE` calls can make `Com_change_db` large. Treat these as clues to inspect client/ORM connection behavior, not counters to reduce at any cost.

`Binlog_cache_use` and `Binlog_cache_disk_use` count transactions that use the binary log cache and transactions that exceed `binlog_cache_size` and write statements to a temporary file. They can point to large write transactions. A hit ratio alone is not enough to size `binlog_cache_size`: inspect deltas, transaction size/type, disk pressure, and memory limits when many sessions run concurrently.

`Created_tmp_*` mainly counts implicit temporary tables/files created internally while executing queries; it does not reveal their size or identify the query. Distinguish user-created temporary objects from execution work, then connect them to statement instrumentation for the deployed version.

Some `Select_*` values, such as `Select_scan`, `Select_full_join`, and `Select_range_check`, describe access or join patterns that occurred. They are not a universal good/bad ranking: a scan can be correct when a query needs most rows; a join without a matching condition deserves investigation. Check the plan and actual rows before adding an index.

`Handler_*` reflects calls through the storage-engine interface, such as reading the next row or looking up a key. `Sort_*` describes queries that sort rather than obtaining rows in index order; `Sort_scan` and `Sort_range` classify by the query's access pattern, not different sorting algorithms. `Sort_merge_passes` rises when runs need to be merged through the sort buffer, but it is not an independent reason to increase `sort_buffer_size`. Sort/temporary counters do not directly identify the query, its size, or user impact. Correlate them with statement digests, `EXPLAIN ANALYZE`, temporary-table instrumentation, memory/disk metrics, and latency. `Key_*`, `Open_*`, and `Qcache_*` in the book relate to MyISAM, table files, or the old query cache; the query cache was removed in MySQL 8.0, so do not apply historical sizing advice.

`Table_locks_immediate` and `Table_locks_waited` measure server-layer locks. They do not count InnoDB row/gap locks; low values do not rule out a transaction waiting on one record. Use Performance Schema lock/wait tables to inspect the right layer.

### InnoDB, redo, buffer pool, and I/O

The `Innodb_*` family includes counters, gauges, and version-specific measurements. Do not rely on a single “hit ratio” to declare the buffer pool healthy: a high ratio can hide a skewed workload, and a brief low ratio during a scan may not be a problem. Track deltas for logical and physical reads, dirty/free pages, pending I/O, redo/checkpoint activity, and waits; correlate them with disk latency, throughput, and workload.

Insert/change buffer and adaptive hash index fields in the book explain historical architecture, but not all of their old status or behavior remains the same in MySQL 8.4. Names, meaning, configurability, and presence in monitor output depend on version. Interpret a particular variable using current documentation, not a similar-sounding name.

## Read the InnoDB Monitor section by section

`SHOW ENGINE INNODB STATUS\G` is a dense text snapshot. It is useful when read with the incident timestamp, but it is not a timeline; the latest recorded deadlock may predate the current incident. Statement output has a size limit, so some data may be omitted.

- **BACKGROUND THREAD** shows activity such as flushing and writing by background threads. Compare it with workload and checkpoint progress; do not treat a loop count alone as a conclusion.
- **SEMAPHORES** includes spins, rounds, and OS waits. Spinning spends CPU waiting briefly; sleeping in the OS avoids burning CPU but has context-switch cost. Older monitor output also shows wait-array reservations/signals; the difference between samples is more useful than a total since startup. Suspect contention only when values rise over a time window and coincide with unusual CPU or throughput.
- **LATEST FOREIGN KEY ERROR** records a recent foreign-key error; it does not represent every constraint failure in history. Separate invalid data from an invalid schema definition: the referenced side may lack an index beginning with the FK columns, or the two sides may have nonmatching types such as `INT` and `INT UNSIGNED`. Check the constraint/table, operation, and actual index before changing the schema.
- **LATEST DETECTED DEADLOCK** describes the most recent cycle detected by InnoDB: transactions, statements, indexes/records, and related locks. Identify which transaction was rolled back because the output can be long or truncated. Compare the graph with the application's resource access order; consistent ordering or shorter transactions is usually more durable than endless retries.
- **TRANSACTIONS** helps find active transactions, their age, read views, lock waits, and purge state. A long transaction retaining an old snapshot can prevent purge from removing obsolete versions; the history list/undo can grow even when the current query is short. Identify the owning session and request before ending a connection, since rollback can take time and generate I/O.
- **FILE I/O** summarizes pending reads/writes/fsyncs and I/O activity. Correlate queues and pending counts with device latency and timestamps; pending work alone does not prove overload if completions are also fast.
- **LOG** reports LSN, checkpoint, and flush information. Interpret the distance between current redo and checkpoint in the context of write rate, flushing, and log capacity; there is no workload-independent universal threshold.
- **BUFFER POOL AND MEMORY** reports pages in free/database/modified states and pending I/O. The monitor's hit rate is averaged over a short interval, not an SLA; read it with working set, reads, and latency.
- **ROW OPERATIONS** and background-thread states help reveal whether engine processing or flushing is active or idle. They are activity clues, not per-query profiles.

Average values in the output do not necessarily cover the same interval: some are measured since the previous status print, while others have an internal reset interval; the output is not an atomic snapshot from one instant either. In the MySQL 5.x versions described by the book, some `Innodb_*` status collection could hold a global lock and scan the whole buffer pool, blocking other threads and skewing `Threads_running`. This behavior is version-dependent and should not be assumed for a current release. Check the manual for the deployed version and measure collection overhead in staging; still avoid excessive polling and retain timestamps. The book also shows 64-bit transaction IDs as separate high/low 32-bit values; for that old format, combine them as `(high << 32) + low`, but do not apply that interpretation to newer output if its format differs.

## The process list is a thread snapshot, not query history

`SHOW PROCESSLIST` answers what a thread is doing at the moment of collection. Useful columns include the ID for finding the connection; user/host/database for identifying its origin; `Command` to distinguish a query from a `Sleep` session; `Time` for how long the thread has been in its current state; `State` for the current step or wait; and `Info` for the statement. One exception matters: for a replica SQL thread, `Time` relates to the timestamp of the last applied event and the replica host's clock, not ordinary query runtime. Many states are brief, so one unchanged-looking row is not enough to conclude that a thread is stuck. Take timestamped samples and correlate them with query, lock waits, transaction age, and logs.

Use `SHOW FULL PROCESSLIST` when you need the complete SQL text: without `FULL`, `Info` shows only the first 100 characters. The `PROCESS` privilege allows visibility into other users' threads; without it, information may be limited to the current user's sessions. Query text can contain sensitive values, so do not publish raw output indiscriminately.

`KILL QUERY` requests cancellation of the current statement; `KILL CONNECTION` closes the session. Neither means all work disappears immediately: InnoDB may need to roll back a transaction, and a large rollback can continue consuming I/O/CPU. Before killing, identify the affected transaction, whether the request will be retried, and how long rollback may take. On MySQL 8.4, you can read `performance_schema.processlist`; this implementation queries Performance Schema rather than using the thread manager's mutex and has better performance characteristics on busy systems. See [SHOW PROCESSLIST](https://dev.mysql.com/doc/refman/8.4/en/show-processlist.html) and the [processlist table](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-processlist-table.html).

## Compare mutex statistics over a time window

`SHOW ENGINE INNODB MUTEX` helps inspect InnoDB mutex and read/write-lock activity and requires the `PROCESS` privilege. The book shows older output with `os_waits`; MySQL 8.4 documents `spins`, `waits`, and `calls`. A lock with waits is a lead to investigate, not proof of a bottleneck: a large lifetime total may remain even after contention has stopped. Take two snapshots from the same instance and examine the delta while latency/throughput is poor; correlate the mutex name with CPU, waits, and workload over that same interval.

The output is not a complete inventory. Mutexes/rw-locks that have never waited may be omitted; locks for every buffer-pool block are not listed individually, while `BUF_BLOCK_MUTEX` has aggregate statistics. On MySQL 8.4, mutex-stat collection can be enabled with `SET GLOBAL innodb_monitor_enable='latch'` and reset with `SET GLOBAL innodb_monitor_reset='latch'`; resetting changes the baseline used by collectors, so record it explicitly. Performance Schema mutex-wait instrumentation is a separate layer and may be disabled by default; inspect `setup_instruments`/consumers and startup requirements before relying on its data. Do not compare counts across different versions/builds or change concurrency based on one `waits` value. MySQL 8.4 documents the statement and monitoring in [SHOW ENGINE](https://dev.mysql.com/doc/refman/8.4/en/show-engine.html) and [Monitoring InnoDB mutex waits with Performance Schema](https://dev.mysql.com/doc/refman/8.4/en/monitor-innodb-mutex-waits-performance-schema.html).

## INFORMATION_SCHEMA turns metadata into SQL

`INFORMATION_SCHEMA` is a SQL-readable metadata layer: database, table, and column names; data types; privileges; indexes; and some server state. Think of it as a catalog, not an application table. Read it with `SELECT`; do not use `INSERT`, `UPDATE`, or `DELETE` to change metadata there. Its advantage over many `SHOW` statements is that you can filter, sort, join, and aggregate the result in one query.

This example finds columns named `actor_id` in Sakila:

```sql
SELECT TABLE_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'sakila'
  AND COLUMN_NAME = 'actor_id'
  AND TABLE_NAME <> 'actor'
ORDER BY TABLE_NAME, ORDINAL_POSITION;
```

This is a way to find candidates for investigation, not proof that those columns have a foreign-key relationship to `actor.actor_id`. Two same-named columns can mean different things. To confirm a constraint, query `KEY_COLUMN_USAGE` and inspect `REFERENCED_TABLE_SCHEMA`, `REFERENCED_TABLE_NAME`, and `REFERENCED_COLUMN_NAME`. That table describes columns participating in constraints; it is not a complete catalog of every kind of index key part.

For indexes, `STATISTICS` has one row per index part. `SEQ_IN_INDEX` gives the part's position; order matters because an index on `(a, b)` is not equivalent to one on `(b, a)`, and queries usually benefit most from a matching leftmost prefix. The query below groups index parts in order so composite indexes are easier to read:

```sql
SELECT TABLE_NAME, INDEX_NAME,
       GROUP_CONCAT(COALESCE(COLUMN_NAME, EXPRESSION)
                    ORDER BY SEQ_IN_INDEX) AS key_parts
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'sakila'
GROUP BY TABLE_NAME, INDEX_NAME
HAVING COUNT(*) > 1
ORDER BY TABLE_NAME, INDEX_NAME;
```

`HAVING COUNT(*) > 1` selects indexes with multiple parts; it does not tell you whether an index is good or whether a query uses it. MySQL 8.4 also supports functional key parts: `COLUMN_NAME` is `NULL`, while `EXPRESSION` contains the expression. `COALESCE` makes both forms visible in this example. Metadata shows the definition; to learn whether the optimizer chooses an index for a particular query, inspect `EXPLAIN` and the real workload.

Keep the book's version context in mind. On the older MySQL releases it describes, some metadata queries could build temporary tables or read substantial metadata, so broad scans on a large server could be expensive. MySQL 8.4 integrates many views with the data dictionary and optimizes some access paths, but that does not make every query free. In particular, table and index statistics in `TABLES` and `STATISTICS` can be cached; `information_schema_stats_expiry` defaults to 86400 seconds. Setting it to `0` requests fresh statistics directly from the storage engine, at a possible performance cost. Restrict the schema and tables, inspect `EXPLAIN` where appropriate, and request dynamic statistics only when the question needs them.

The book also introduces InnoDB tables in `INFORMATION_SCHEMA`, including `INNODB_TRX`, `INNODB_LOCKS`, and `INNODB_LOCK_WAITS`. This is a useful example of connecting metadata with transaction state, but lock instrumentation has changed across versions: on MySQL 8.4, inspect held and requested locks in `performance_schema.data_locks` and blocker-to-waiter relationships in `performance_schema.data_lock_waits`; `INNODB_TRX` still reports transaction state. The `sys.innodb_lock_waits` view can present wait relationships in a more readable form. Correlate the result with the process list and sample time because a lock can disappear while you investigate it.

Sources: *High Performance MySQL*, Appendix B, “The INFORMATION_SCHEMA” and “InnoDB Tables” (PDF pp. 739–740); [INFORMATION_SCHEMA overview](https://dev.mysql.com/doc/refman/8.4/en/information-schema-introduction.html), [query optimization](https://dev.mysql.com/doc/refman/8.4/en/information-schema-optimization.html), [STATISTICS table](https://dev.mysql.com/doc/refman/8.4/en/information-schema-statistics-table.html), [KEY_COLUMN_USAGE](https://dev.mysql.com/doc/refman/8.4/en/information-schema-key-column-usage-table.html), [data_lock_waits](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-data-lock-waits-table.html), [sys lock-wait view](https://dev.mysql.com/doc/refman/8.4/en/sys-innodb-lock-waits.html).

## Turn a signal into a testable hypothesis

Suppose throughput falls, `Threads_running` rises, and the application reports high p99 latency. That is not enough reason to increase `max_connections`. Capture signals at the same time: connection-pool wait, process list, statement digests, data-lock waits, CPU, disk latency, replication lag, and InnoDB status. If many threads wait on one row lock, more connections only add people to the queue. If CPU is saturated by one digest, inspect its plan and execution frequency. If pending I/O and device latency rise while flushing, investigate the write workload and checkpoint. Choose a hypothesis, change one factor, and check whether the predicted signals move.

A sample checklist:

1. Confirm the instance, version, timezone, and incident start time.
2. Collect multiple timestamped snapshots; mark restarts, failovers, and counter resets.
3. Classify each value as a counter, gauge, or configuration setting; confirm global/session scope.
4. Calculate deltas/rates and compare them with latency, throughput, and errors over the same window.
5. Use Performance Schema and `sys` to move from event groups to digests, waits, transactions, or locks.
6. Record the hypothesis, supporting and contradicting evidence, a small change, and its rollback.

Do not optimize merely to make a counter look better. The goal is to improve a user-relevant property without harming correctness, durability, or resource limits.

## Current tools and their limits

In MySQL 8.4, Performance Schema exposes event, wait, statement, thread, lock, and status instrumentation; `sys` adds views and procedures that help interpret it. To understand why an event is or is not present, follow four layers:

1. **Instrument** (`setup_instruments`) identifies the kind of server activity that can be measured, such as statements, stages, waits, or mutexes. The instrument must be enabled; `TIMED=NO` means events may be counted without recording their duration.
2. **Thread filter** determines which threads are instrumented. `setup_consumers` includes `thread_instrumentation`, while `performance_schema.threads` shows whether each thread is instrumented and whether its history is recorded.
3. **Consumer** (`setup_consumers`) determines where events are retained: `_current` tables hold running events, `_history` holds a limited number of recent events per thread, and `_history_long` holds a limited number globally. Enabling an instrument is not enough to get history if the corresponding consumer is disabled.
4. **Summary** groups many events by thread, account, digest, or object. Summaries help find groups with high accumulated time; history helps inspect a few specific executions. A cumulative total does not preserve the full order and detail of every run.

You can inspect this configuration without changing it:

```sql
SELECT NAME, ENABLED, TIMED
FROM performance_schema.setup_instruments
WHERE NAME LIKE 'statement/%'
ORDER BY NAME;

SELECT NAME, ENABLED
FROM performance_schema.setup_consumers
WHERE NAME LIKE 'events_statements%'
ORDER BY NAME;
```

History tables have bounded capacity; older events are replaced as the tables fill. Digests normalize literals to group similar queries, but digest length is bounded and the sample statement does not represent every input value. The book measured early MySQL 5.5 releases: roughly 8–11% overhead when enabled without collecting events, and 19–25% with all consumers enabled, depending on workload. These are release/machine/test-specific historical benchmarks, not estimates for MySQL 8.4; measure the instruments and collector you use against your workload. Before enabling long history or detailed instruments, check the storage, retention, and expected overhead of that specific configuration.

`SHOW PROCESSLIST` answers “where is a thread now?”; digest summaries answer “which statement groups accumulated time?”; event history may show a recent execution; `SHOW ENGINE INNODB STATUS` summarizes selected internal areas. `INFORMATION_SCHEMA` remains useful for structured metadata, but not every view has the same cost. Choose a source for the question and limit diagnostic queries on production.

Sources: *High Performance MySQL*, Appendix B (PDF pp. 715–744); [SHOW STATUS and scope](https://dev.mysql.com/doc/refman/8.4/en/show-status.html), [server status variables](https://dev.mysql.com/doc/refman/8.4/en/server-status-variables.html), [binary log cache variables](https://dev.mysql.com/doc/refman/8.4/en/replication-options-binary-log.html), [SHOW PROCESSLIST](https://dev.mysql.com/doc/refman/8.4/en/show-processlist.html), [Performance Schema processlist table](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-processlist-table.html), [Performance Schema event tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-event-tables.html), [setup_instruments](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-setup-instruments-table.html), [setup_consumers](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-setup-consumers-table.html), [SHOW ENGINE](https://dev.mysql.com/doc/refman/8.4/en/show-engine.html), [Monitoring InnoDB mutex waits](https://dev.mysql.com/doc/refman/8.4/en/monitor-innodb-mutex-waits-performance-schema.html), [InnoDB Monitor](https://dev.mysql.com/doc/refman/8.4/en/innodb-standard-monitor.html), [Performance Schema status tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-status-variable-tables.html), [statement digests](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-digests.html), [sys schema](https://dev.mysql.com/doc/refman/8.4/en/sys-schema.html).

## Check your understanding

**Does rising `Threads_connected` mean more queries are executing simultaneously?** No. It counts open sessions; `Threads_running` is closer to active execution, but waits and workload still matter.

**Does a nonzero `Select_scan` mean an index is missing?** No. A scan can be the right plan when most rows are needed. Check predicates, actual rows, and cost.

**Does an old `LATEST DETECTED DEADLOCK` prove the current incident is a deadlock?** No. It is only the latest deadlock retained in that output; correlate timestamps, logs, and lock instrumentation.

**Should I tune a buffer or connection setting as soon as a counter looks bad?** Not yet. Establish a baseline, find the statement or wait behind the signal, and test a measurable, reversible change.
