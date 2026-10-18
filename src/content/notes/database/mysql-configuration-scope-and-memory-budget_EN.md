---
title: "MySQL Configuration Scope and Memory Budgets"
category: "Database"
description: "Read variable scope/dynamic behavior, distinguish global and session memory, and tune through safe benchmarks."
updated: 2026-10-17
translationKey: "database/mysql-configuration-scope-and-memory-budget"
---

A MySQL setting may be global, session-scoped, or both; some variables are read only at startup, some are dynamic, and some changes affect only new connections. Writing a config file does not prove the server uses it: inspect `SHOW VARIABLES`, startup logs, and loaded option sources.

## Trace the effective configuration

`mysqld` can read multiple option files, receive options from a service manager or command line, and then load persisted system variables from `mysqld-auto.cnf`. For the server, persisted values are processed after option files and can override earlier values. Editing one file may therefore not change the active setting. Packages, containers, and managed services also have their own startup paths.

Check the server binary, service startup command, option files, and the `[mysqld]` group; `[client]` applies to client programs. `mysqld --verbose --help` shows the default option-file paths for that binary. Then inspect runtime values, persisted sources, and the error log. Record units too: a variable may be measured in bytes, seconds, connections, or pages.

MySQL processes options in order, and later options generally win. `SET GLOBAL` changes only the current instance. `SET PERSIST` changes the global runtime value and saves it to `mysqld-auto.cnf`; `SET PERSIST_ONLY` saves a value for startup for eligible variables. To remove a persisted value, use `RESET PERSIST` instead of editing the server-managed file directly. If two configuration sources disagree, record both in the change so a restart does not unexpectedly restore an old value.

## Global and session scope

`SET GLOBAL x=...` changes the default for new sessions and usually does not change open sessions; `SET SESSION` affects only the current connection. A long-lived connection pool can carry isolation/sql_mode/timezone from one request to another unless the application resets them. `SET PERSIST`, in supported versions, saves a value across restarts; manage config files and persisted variables together to prevent drift.

Dynamic does not mean instantly safe: increasing a buffer/cache can allocate memory, while lowering a limit may not release it immediately or can affect running work. Check version-specific `SET` scope/dynamic metadata and try in staging.

A `GLOBAL` value commonly initializes new connections; existing sessions keep their own session value. After changing a global `max_execution_time` or `sql_mode`, an old connection in a long-lived pool may still use the previous value. Check both global and session values on a representative connection, and determine whether the application resets session state when returning a connection to the pool.

## Global and per-connection memory

The InnoDB buffer pool, redo buffers/capacity, key cache, table/open cache, and thread cache differ from per-connection sort/join/read buffers, temporary tables, and binlog/replication buffers. Estimate peak:

```text
RAM ≈ global buffers + active_connections × worst-case per-connection use
      + OS/page cache + agents + safety headroom
```

This is an upper-bound planning model, not a claim that all memory is always allocated. Still, `max_connections × buffer settings` explains OOM caused by a configuration that looks reasonable for one connection but is dangerous during a burst.

`sort_buffer_size`, `join_buffer_size`, `read_buffer_size`, and `read_rnd_buffer_size` are easy to oversize because a connection or query may allocate them for operations. A query joining several tables may need several join buffers; it does not necessarily use just one per connection. A 256 MB sort buffer will not make every sort faster: it can consume substantial RAM and initialization time even when a query sorts few rows. First inspect the plan, number of rows to sort, and whether an index can avoid sorting.

If a specific analytical query really needs a larger buffer, you can set a session value only around that query, save the previous value, and restore it immediately. Do this only when the variable supports session scope and you have the required privilege; do not let a connection pool reuse the connection with an unintended value.

Temporary tables must also be understood by release. MySQL 8.4 uses `TempTable` by default for internal in-memory temporary tables; `tmp_table_size` limits each table, while `temptable_max_ram` limits the engine's shared RAM. For internal tables using the `MEMORY` engine, both `tmp_table_size` and `max_heap_table_size` participate in the limit. The book describes conversion to on-disk MyISAM; that is not current behavior. Spilling to disk can be safer than allowing every query to hold a large temporary table in RAM.

## Verifiable safe configuration

Do not set every variable from a benchmark template. Set `max_connections` from pool/capacity, enable slow logging with retention, verify `sql_mode`, charset, timezone, `read_only`/super_read_only on replicas, binary logging, and durability policy. Do not change `skip-networking`/bind broadly without reason; authentication/TLS/ACL and firewall must match topology.

Before changing settings, capture effective variables, workload baseline, memory/latency/errors. Change few variables, restart if required in a staged order, inspect server logs/config warnings, then measure again. Variable docs are versioned; a name may be deprecated/renamed or have a changed default.

Give each change a specific hypothesis: “the sort buffer is repeatedly allocated while query X sorts two million rows; does a session-level trial at Y reduce p95 without raising RSS under concurrent load?” Run a workload with the same read/write mix, concurrency, dataset, warm-up, and durability. Change one or two variables, wait for steady state, and compare latency percentiles, throughput, errors, RSS, swap, disk I/O, and related operations. Record negative results too.

Do not optimize only for a cache hit ratio, “buffer pool hit,” or a tuning script's output. A ratio may look good while queries wait on I/O, locks, or CPU; a benchmark for one query type may slow another. Chapter 8's configuration file is a historical example, not a current template: the query cache is gone from modern MySQL, the old `innodb_log_file_size` approach has been replaced by redo-capacity configuration in newer releases, and the temporary-table engine has changed.

## Configuration mechanisms emphasized in chapter 8

### Start with the workload and change few variables

The chapter opens with a principle that is easy to miss: do not start by asking “how much RAM does this machine have, and which settings should I enable?” First find the slow queries, how much work they do, and whether the server is waiting on CPU, locks, or storage. Then choose a setting that can affect that path. Most systems need sound schema, indexes, queries, and a few basic settings; deeper tuning knobs often offer less benefit than the risk of an oversized configuration.

Before a change, capture multiple snapshots at peak and ordinary load. Cumulative status counters need a delta over an interval; a total since server startup does not describe the current rate. Record the version, global/session variables, configuration source, workload, latency percentiles, throughput, errors, RSS, swap, and storage queue. Change a small group against a clear hypothesis, observe through steady state, and roll back if the target query improves while the overall workload gets worse.

Benchmarks remain useful for capacity planning, choosing servers/storage, measuring recovery time, or comparing workloads before and after a migration. When using them to change configuration, replay real queries on near-production data and preserve the read/write mix, concurrency, warmup, and durability policy. Do not tune by hit ratio or script, and do not treat a crash-log formula as an upper bound on memory: prepared statements, temporary results, query complexity, and concurrency change the footprint. Keep configuration in version control, record why each setting exists, and revisit it after schema, workload, or version changes.

### Each cache holds a different kind of data

The InnoDB buffer pool holds data/index pages and internal structures; the MyISAM key cache holds index blocks while data files usually rely on the OS page cache. When increasing the key cache, account for RAM that the OS needs to cache MyISAM data. A “99% index hit rate” is not enough by itself: physical reads per second and miss latency reveal whether storage is a bottleneck. On MySQL 8.4, many systems do not use MyISAM, so the key cache is often not a primary setting.

The thread cache reuses a worker when one connection closes and another opens; it reduces thread-creation cost when connection churn is high. It is not a connection pool and does not reduce the number of active sessions. Track `Threads_created` over time alongside `Threads_connected` instead of choosing a large number by instinct.

The table-open cache holds resources for open tables; the table-definition cache holds parsed definitions. The book describes their separation beginning in MySQL 5.1; verify current names and behavior in the manual for the target release. Too small a cache causes repeated opens; too large a cache can hit file-descriptor limits or increase lookup cost. A rising `Opened_tables` counter alone does not prove a cache miss problem, because temporary tables and DDL also change it. InnoDB also has its own data dictionary. On an older server with tens of thousands of tables, metadata memory and statistics work could increase memory use and slow startup. Do not call this a leak when memory grows with cached metadata; measure table count, RSS, and startup time.

### Global buffers are not the whole memory budget

The chapter separates process/OS limits, per-connection demand, and the remaining memory for caches. Per-connection buffers may be allocated per operation: one query joining several tables can need multiple join buffers; sort/read buffers may be allocated for individual operations. Therefore, `max_connections × every buffer` is a very conservative ceiling, not normal usage. But looking only at one query's memory ignores burst concurrency.

The buffer pool does not need to exceed a useful working set just because RAM is available. A larger pool reduces repeated storage reads but can lengthen warmup and dirty-page flushing during shutdown; resizing it online also allocates memory in chunks. Current MySQL can save a page list and reload it at startup; this shortens warmup but does not guarantee every hot page stays resident. Watch `Innodb_buffer_pool_pages_dirty`, pages read/flushed, disk latency, and throughput during reload.

### Data safety is part of tuning

`innodb_flush_log_at_trx_commit` controls when redo is written/flushed around commit: stronger durability requires more I/O, while looser settings accept a window in which transactions can be lost during a crash. With binary logging enabled, `sync_binlog` contributes to durability and replication/PITR consistency. Choose both by the RPO and test on the actual hardware; an OS or controller reporting a completed flush does not always mean data reached durable media. Current documentation describes the pair of settings for high durability; do not relax them just to improve a benchmark.

Variables such as `max_allowed_packet`, `sql_mode`, `skip_name_resolve`, `read_only`/`super_read_only`, binary-log retention, and startup failure behavior can prevent data or operational errors, but are not general speed controls. `skip_name_resolve` requires compatible IP/hostname grants; strict SQL mode can make an older application fail on invalid inserts; retention must be long enough for restore/PITR but fit within disk capacity. Test in staging and check application expectations before applying these settings.

### Advanced InnoDB controls need evidence

Chapter 8 presents `innodb_buffer_pool_instances` as a way to reduce pool contention at very large sizes; MySQL 8.4 derives a default from pool size/CPU, and each instance must be large enough to be useful. Do not copy the old benchmark's “eight instances.” `innodb_read_io_threads`/`innodb_write_io_threads` control background I/O workers, not query parallelism; increasing them matters only if measurements show an I/O queue the workers cannot service fast enough.

Chapter 8 presents `innodb_io_capacity` as a way to tell InnoDB how many I/O operations per second the storage can support for background work. The book-era server assumed about 100 IOPS by default; do not use that number for a current system. MySQL 8.4 defaults to 10,000, while the variable still represents estimated capacity for work such as flushing dirty pages and merging the change buffer, not a hard limit on all I/O. If set too low, dirty-page flushing and change-buffer merges can fall behind and increase checkpoint pressure; if too high, pages can leave the buffer pool too quickly and reduce the cache benefit. `innodb_io_capacity_max` allows more aggressive work when a backlog builds; if `innodb_io_capacity` is set at startup and the maximum is omitted, the maximum defaults to twice the capacity. Measure the actual volume's IOPS in its real environment, checkpoint age, dirty pages, pending flushes, and latency before and after; do not guess from spindle count or SSD type.

MySQL 8.4 also changed two InnoDB defaults: adaptive hash indexing changed from on to off, and change buffering changed from `all` to `none`. The adaptive hash index can shorten repeated B-tree lookups for suitable access patterns, but it costs memory and can create latch contention; benchmark both states with the real workload. Change buffering delays some updates to non-unique secondary indexes when the relevant page is not in the buffer pool, so I/O can be batched later; it may help some random-write workloads, but is less useful when the working set is already in RAM or there are few secondary indexes. Do not restore an old default just because the book or an old benchmark recommended it; observe index writes, merge backlog, I/O, and p95.

`innodb_thread_concurrency` limits threads inside InnoDB, while `innodb_commit_concurrency` limits concurrent commits. They can reduce oversubscription for a particular workload but can also add queues and latency; MySQL 8.4 defaults to no InnoDB concurrency limit. Experiment only after measuring contention/scheduler pressure and compare with the default. `innodb_autoinc_lock_mode` changes how insert statements allocate auto-increment values; the 8.4 interleaved default fits row-based replication, but can produce gaps and does not guarantee consecutive ranges between concurrent statements. `innodb_strict_mode` changes some dangerous table-definition conditions from warnings to errors, so check DDL/restore before enabling it.

`innodb_old_blocks_time` controls how long a page stays in the LRU “old” sublist before it can be promoted. It may keep a one-off full scan from pushing hot pages out of cache, but it can also delay promotion of a page that is genuinely reused. Change it only when cache pollution is observed; test scans and the ordinary workload together. The book's buffer-pool-instance, concurrency-ticket, and thread-limit numbers describe older servers, not current defaults.

### Temporary tables, BLOB/TEXT, and filesort must be read by release

Temporary-table counters help reveal queries creating many intermediates, but they do not identify each query that spills. Move from global counters to query digests/plans and Performance Schema to find the source. The book recommends enough `tmpdir` space and considers a memory filesystem for older MySQL; today, account for RAM, swap, container cgroups, and ensure temporary storage does not turn all memory into system pressure.

The book describes BLOB/TEXT forcing some temporary tables to disk and its version's two-pass filesort algorithm. MySQL 8.4 TempTable supports BLOB/TEXT in some internal temporary-table paths; spilling depends on the query, memory limits, and data types. The `max_length_for_sort_data`/`max_sort_length` variables and sort algorithms also depend on release. Do not enlarge sort buffers or sort entire long payloads to “fix” a query. Reduce materialized columns, choose an appropriate index, paginate by key, and measure merge passes/temporary bytes. InnoDB external-storage details change with row format and page size, so the prefix/page figures in the book are useful only for understanding why fetching an unnecessary BLOB can cause I/O.

## When configuration is wrong

OOM killer, swapping, too-many-connections, temp-table spill, and buffer-pool pressure have different signs. Correlate `SHOW GLOBAL STATUS`, Performance Schema, process RSS, OS memory, disk queue, and connection pool. Rolling back config may not restore runtime state immediately; a restart has outage/cold-cache impact.

*High Performance MySQL*, chapter 8 and Appendix B, cover config scope, status variables, memory caches, and safety settings. Compare [option files](https://dev.mysql.com/doc/refman/8.4/en/option-files.html), [server system variables](https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html), [SET](https://dev.mysql.com/doc/refman/8.4/en/set-variable.html), [persisted variables](https://dev.mysql.com/doc/refman/8.4/en/persisted-system-variables.html), [internal temporary tables](https://dev.mysql.com/doc/refman/8.4/en/internal-temporary-tables.html), [memory use](https://dev.mysql.com/doc/refman/8.4/en/memory-use.html), [redo logging](https://dev.mysql.com/doc/refman/8.4/en/optimizing-innodb-logging.html), [transaction durability](https://dev.mysql.com/doc/refman/8.4/en/optimizing-innodb-transaction-management.html), [binary-log durability](https://dev.mysql.com/doc/refman/8.4/en/replication-options-binary-log.html), [buffer-pool warmup](https://dev.mysql.com/doc/refman/8.4/en/innodb-preload-buffer-pool.html), [InnoDB variables](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html), and [background I/O threads](https://dev.mysql.com/doc/refman/8.4/en/innodb-performance-multiple_io_threads.html), [I/O capacity](https://dev.mysql.com/doc/refman/8.4/en/innodb-configuring-io-capacity.html), [adaptive hash index](https://dev.mysql.com/doc/refman/8.4/en/innodb-adaptive-hash.html), [change buffer](https://dev.mysql.com/doc/refman/8.4/en/innodb-change-buffer.html), and [MySQL 8.4 default changes](https://dev.mysql.com/doc/refman/8.4/en/upgrading-from-previous-series.html).

## Check your understanding

**Does `SET GLOBAL` change existing pool connections?** Usually not; it sets defaults for new sessions.

**Can memory be estimated only from global buffers?** No; concurrency multiplies per-connection allocations.

**Is a config file proof of the effective setting?** No; inspect runtime variables and startup logs.

**Does `SET PERSIST` only change the running server?** No; it also saves the setting for startup. Inspect persisted values and configuration sources before the next restart.

**Does increasing `tmp_table_size` guarantee every temporary table stays in RAM?** No; the TempTable global limit, storage engine, and data type also matter.

**Does a low cache hit ratio prove that a cache should be enlarged?** No; connect the ratio to latency, I/O, workload, and overall impact.
