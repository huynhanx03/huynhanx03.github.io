---
title: "Measuring and Tuning MySQL Performance"
category: "Database"
description: "Build repeatable benchmarks, profile from the application to storage, and adjust MySQL using evidence instead of one configuration number."
updated: 2026-10-18
translationKey: "database/mysql-measuring-and-tuning-performance"
---

Saying a server is “30% faster” is meaningful only if we know which workload, hardware, and measurement point were compared. MySQL tuning starts with a reproducible baseline, then locates the bottleneck in the application, query, engine, operating system, or storage. Changing buffer sizes before identifying the problem often moves the bottleneck somewhere else.

## Turn the goal into a measurement

Write the question before running a benchmark: for example, how much write throughput can increase while p95 remains below 80 ms at 300 connections? Keep MySQL version, configuration, schema, data size/skew, hardware, client, concurrency, and cache state fixed. If runs differ in many factors, we cannot tell which change caused the result.

Choose a benchmark for the question:

- A **microbenchmark** isolates CPU, file I/O, one query, or a storage primitive; it compares components but does not model a complete application.
- A **database workload benchmark** replays transaction patterns such as OLTP to observe the engine under concurrency.
- An **end-to-end benchmark** includes clients, network, connection pools, and the application path; it is more realistic but needs metrics to locate the slow layer.

Do not use one single-threaded query to conclude that a server works well when many connections contend for CPU, buffer pool, locks, and disk. Data should be large enough to exceed cache effects if the goal is storage measurement, or explicitly state that warm-cache behavior is being measured.

Track throughput, p50/p95/p99 latency, error rate, CPU, memory, disk IOPS/latency, bytes read/written, lock waits, rows examined, temporary tables/spills, and replication lag if relevant. Repeat runs, warm up the system, separate startup noise, and save configuration logs. Plot over time to find saturation, checkpoint spikes, or declining throughput; a single average hides tail latency.

The book mentions `sysbench`, DBT-2/TPC-C, `http_load`, and the MySQL benchmark suite. Older tools and versions need current verification; the lasting ideas are workload, isolation, measurement window, and repeatable method.

## Do not collapse throughput, latency, and concurrency into one number

**Throughput** is the number of operations completed per unit of time. **Response time** is the duration from a request's start to completion, including time spent waiting in queues. **Concurrency** is the number of operations actively running or waiting at a layer; logged-in sessions or open connections are not the same as requests concurrently using the database.

As concurrency rises, throughput often increases first, then flattens when CPU, I/O, locks, or the connection pool becomes the bottleneck. Queues then grow and p95/p99 can climb rapidly. For example, 100 requests/second at p99 40 ms may serve users better than 110 requests/second at p99 2 seconds. A batch workload may care about its completion time; an interactive API often cares more about tail latency and error rate than the average.

Measure **scalability** by changing one axis deliberately—client count, core count, data volume, or replica count—and observing how output changes. An ideal system scales linearly, but contention, coordination, caches, and hardware limits usually produce diminishing returns. Record the starting point and workload; saying “it scaled by two” without naming the metric is not a conclusion.

## Make a benchmark repeatable

Before each run, record a manifest: the question; binary version; configuration; schema and indexes; row count and data distribution; transaction mix and read/write ratio; client count; cache state; warm-up; measurement duration; CPU/I/O limits; and commit/durability policy. Use representative data when possible. If synthetic data is necessary, model skew too: a uniform table is easier than real data with hot keys and uneven distributions.

When replaying a query log, preserve connection identity, request order, and concurrency. Replaying each line sequentially turns a multi-client workload into a single-threaded one. Repeating identical queries may measure only cache hits; a tiny dataset says little about behavior when the working set exceeds RAM. Check errors, rollbacks, and server logs to ensure the benchmark ran the intended work rather than measuring how quickly it reports a failure.

Separate **warm-up** from the measurement window when measuring steady state. If restart recovery time matters, measure cold start separately. A short benchmark may miss checkpoints, flushing, compaction, cache building, or scheduled jobs. Run long enough for metrics to stabilize across background workload cycles; keep each run separate and use a consistent data setup.

Collect time-series samples for at least throughput, latency histogram/percentiles, errors, CPU, memory/swap, disk latency/IOPS, network, status counters, lock waits, checkpoints/dirty pages, and replication lag when relevant. Save raw samples with configuration, timestamps, and commands. Plot the series: a flat average can hide a sharp throughput drop while caches are cold or dirty pages flush. When an anomaly appears, compare metrics at the same timestamp to find what changed; do not infer the cause from the chart's shape alone.

For an A/B comparison, keep conditions identical, change one factor at a time when possible, and repeat enough times to observe run-to-run variation. Avoid benchmarking alongside backups, cron jobs, consistency scans, or other workloads. With shared storage, neighboring hosts are another variable. Record bad runs, errors, and run conditions too; keeping only the best result makes the measurement irreproducible.

## Choose a tool for the layer you need to understand

- A **full-stack load test** sends requests through the application, web server, connection pool, network, and MySQL. It answers user-facing questions such as “how many requests per second keep p99 below the threshold?” but needs tracing and per-layer metrics to locate the bottleneck.
- A **database workload benchmark** isolates MySQL more. Current `sysbench` includes OLTP workloads as well as CPU, file-I/O, memory, threads, and mutex tests; a CPU test cannot predict database query performance. The workload script determines what is being measured.
- A **transactional benchmark such as TPC-C/DBT-2** mixes transaction types, reads/writes, and workload constraints. It is closer to a synthetic OLTP pattern than one query, but still does not represent every application. Read the transaction mix, scale factor, rollbacks, latency histogram, and ramp-up duration along with throughput.
- A **microbenchmark** isolates one expression, system call, or I/O operation to compare components. It can form a hypothesis; it does not replace end-to-end measurement.

The book uses older versions of `http_load`, MySQL Benchmark Suite, DBT-2, and sysbench. Treat historical commands as examples of workload design and verify each tool/version before running it. The current [MySQL 8.4 guidance for custom benchmarks](https://dev.mysql.com/doc/refman/8.4/en/custom-benchmarks.html) and [Performance Schema](https://dev.mysql.com/doc/refman/8.4/en/performance-schema.html), together with the [current sysbench README](https://github.com/akopytov/sysbench/blob/master/README.md), describe current capabilities and instrumentation.

### Read each tool's output for what it actually measures

At the end-to-end layer, the book's `ab` example repeatedly hits one URL as fast as possible. That can be a rough check, but it does not model varied user behavior. `http_load` can choose URLs from a list, cap concurrent clients, or send requests at a configured rate. As the offered rate rises, inspect completed requests, connection/response times, and status codes together: if the target is 20 requests/second but the server completes only about 11, the gap is queued or unserved work. JMeter can model multiple steps, ramp-up, and other protocols; the more flexible the script, the more important it is to preserve it for fair comparison. These examples explain benchmark categories, not a recommendation to use the book's old tool versions.

At the MySQL layer, `mysqlslap` creates concurrent connections and runs SQL supplied on the command line or in a file. If it generates queries from the schema, verify that they represent the workload in question. The MySQL Benchmark Suite (`sql-bench`) provides predefined tests useful for a rough comparison of operations or engines, but it is serial, single-user, and uses a small dataset. It therefore cannot measure the benefit of multiple CPUs or behavior when data exceeds RAM. Its per-test output also separates wall-clock time from client CPU time: time spent by the client is not server execution time. Do not treat a suite ranking as a production forecast.

Read `sysbench` results by test mode. The CPU test's prime calculation mainly describes CPU performance on that particular task. The file-I/O test needs files larger than RAM if the goal is to avoid measuring the OS page cache instead of storage. Sequential write, sequential rewrite, sequential read, random read, random write, and mixed random read/write create different pressure. Record block size, read/write ratio, thread count, synchronous mode, `fsync`, and percentiles; MB/s alone does not describe latency or write durability. The OLTP test prepares its data first, runs multiple threads for a fixed window, and reports transactions/second, queries/second, deadlocks, min/average/max/p95 latency, and thread fairness. The book's sysbench 0.4 commands are historical; current releases have different invocation and workload details, so use documentation for the version actually installed rather than copying old commands verbatim.

DBT-2 is a free implementation in the style of TPC-C, not a TPC-certified result; its `tpmC` and `Price/tpmC` cannot be directly compared with official TPC-C results. Scale factor/warehouses, database connections, terminal count, transaction mix, ramp-up, duration, think time, and rollbacks all affect the measurement. A zero-think-time mode stresses the server but assumes users issue work continuously, which can be unrealistic. The book's TPCC-MySQL tool also models a TPC-C-like workload and reports transaction mix, latency percentiles, transaction/time constraints, and tpmC; inspect those checks and histograms, not only the final score. Whichever suite is used, retain commands, generated data, configuration, raw output, and concurrent system metrics so differences between runs can be explained.

## From an API to a query: find the layer paying the cost

Profile the application to see whether time is spent in network calls, the connection pool, serialization, retries, or the database. Instrument requests with query counts, duration, and fingerprints; avoid uncontrolled logging of sensitive data or entire parameters. An N+1 query pattern often appears as many round trips even though each query is fast.

In MySQL, the slow query log and Performance Schema help find top workloads by time, frequency, examined rows, or waits. `SHOW PROCESSLIST` is a session snapshot; a query log is history; Performance Schema provides structured events. They answer different questions. Global status counters need a delta over a time window; a process list is not a substitute for history.

For a slow query, record its fingerprint, representative parameters, plan, estimated/actual rows, session isolation, transaction age, lock waits, and server load around the same time. If many queries slow down together, examine connection saturation, CPU, buffer-pool churn, disk, checkpoints/redo, temporary tables, replication, or lock contention.

`SHOW PROFILE` in older books is historical context; MySQL 8.4 marks it deprecated and points to Performance Schema. Current analysis should generally prefer Performance Schema and `EXPLAIN ANALYZE` when supported by the version. Profiling also has overhead; use sampling or a narrow scope when production is sensitive.

## Match the profile to the question

First choose the unit you need to investigate:

- **The whole application:** time in the request, database, cache, external services, serialization, and application code. Propagate a trace/request ID so spans from one request can be compared.
- **The whole MySQL workload:** group queries by digest/fingerprint and total their time and execution count. A 10 ms query run 100,000 times can consume more server time than a query that runs once for two seconds.
- **One statement:** inspect its plan, rows examined/returned, stage timings, waits, and lock chain around that execution.
- **Server internals:** use wait/event instrumentation or an OS profiler when query-level measurements do not explain CPU, mutex, I/O, or context-switch costs.

A profile reports time or events captured by its instrument; it does not explain their cause. A tool may omit waiting time, combine executions into an average, or fail to retain a latency distribution. If a profile says a query consumes 40% of total time, ask whether that is the total across runs, the average per execution, or a small but very slow tail. Check histograms/percentiles and execution count before optimizing.

## Catch incidents that happen only occasionally

A dashboard averaged over a day can erase a stall lasting a few seconds. Build a near-real-time **trigger** from signals such as `Threads_running` staying high across several samples or throughput falling while waiting connections rise. Set thresholds from a baseline and require the condition to persist for several samples to avoid capturing harmless spikes. A threshold set too high creates false negatives; one set too low creates false positives and can make monitoring itself expensive.

When the trigger fires, record timestamp-aligned snapshots: status-counter deltas, process-list/wait states, query digests and slow-query samples, transaction age/lock waits, CPU, memory/swap, `iostat`/disk latency, network, error log, and replication state. Take multiple samples during the incident and keep some healthy baseline samples to learn what normal looks like. Collect only what is needed: a process list is an instant snapshot; query logs may contain sensitive data; deep profilers or stack traces can add overhead.

Move from observation to hypothesis: “throughput fell while `Threads_running` rose” is an observation; “the disk is saturated” is a hypothesis to verify. Correlate sources by time, check which queries ran, which waits increased, and which device actually performed I/O. Look for evidence that contradicts the first guess. If application and MySQL logs both exist, a correlation ID can reveal which request generated repeated queries or retries.

For example, simultaneous cache expiration may cause many workers to rebuild hot keys together. Query volume rises, queries using sorts/temp tables produce I/O, and the database appears stalled. Increasing the buffer pool may not address the cause; spread expirations, limit concurrent cache rebuilds, then check the workload and I/O again. This remains a hypothesis until the timeline and query samples support it.

In MySQL 8.4, `SHOW PROFILE` and `SHOW PROFILES` still exist but are **deprecated**; use Performance Schema for statement, stage, and wait events. Start with history/summary tables or `sys` views, then narrow by thread, digest, and time range. The [MySQL 8.4 manual](https://dev.mysql.com/doc/refman/8.4/en/show-profiles.html) documents the deprecation and points to [query profiling with Performance Schema](https://dev.mysql.com/doc/refman/8.4/en/performance-schema.html).

## A profile is a priority map, not a complete explanation

In its profiling chapter, the book defines performance as **the time required to complete a task**. For a database, that is usually statement response time in a defined workload. CPU, I/O, and queries per second are signals or secondary goals: CPU can rise after an upgrade because the server is doing more useful work; a query waiting on I/O can be slow even when CPU is low. Measure the goal directly, then use resource measurements to explain it.

A task spends time in two broad ways: **working** or **waiting**. Execution-time profiling ranks work that consumes time; wait analysis finds where tasks are blocked, such as I/O, mutexes, locks, or queues. A useful profile groups similar tasks and reports at least their call count, total response time, average time per call, and share of total time; sorting by total time descending shows which query classes consume the largest part of the budget. If a CPU profile does not explain a stalled request, measure waits rather than continuing to optimize SQL blindly.

Totals and averages discard distributions. One query digest may combine thousands of fast executions with a few very slow ones. Use histograms, percentiles, standard deviation, and dispersion to find outliers; a rare query with terrible p99 can harm users even when it does not rank highly by total time. A profile may also have **lost time**—task wall-clock time that measured events do not explain—because instrumentation is incomplete, values are rounded, or measurement itself costs time. Record that gap instead of treating a report's sum as the whole truth.

Choose work by both time share and user/business value. By Amdahl's law, if one query class consumes 5% of total response time, making it infinitely fast can improve the total by at most about 5% under the same conditions. Conversely, an infrequent query that causes severe tail latency may deserve priority because its impact is hidden in the total. Stop when expected benefit no longer justifies implementation, operational, and risk costs.

## Profile from the request down to the statement, then to the event

Start at the application because the request is what users actually wait for. Measure total request time, database, cache, and external services; propagate a trace/request ID to connect spans and reveal N+1 queries, retries, or repeated statements. Instrumentation has overhead, so balance detail against cost: some systems sample a fraction of requests, but retain enough production samples and healthy baselines to catch rare paths. Product and PHP profiler names in the book—New Relic, xhprof, xdebug, and IfP—reflect its publication era; the lasting point is to measure across the stack, choose supported tools, and not assume staging behaves like production.

If the question is “which queries create load?”, capture a representative workload window and group it by digest/fingerprint. The slow query log can be configured to capture more than queries above the “slow” threshold, but logging every query indefinitely adds I/O and consumes disk; set a collection window, rotation, and access controls. The general log records statements arriving at the server but not their completion time, so it does not replace the slow log for profiling. Use a parser such as `pt-query-digest` to rank total time, frequency, averages, distributions, and outliers; read the report before opening raw samples. A digest groups statements with the same shape, so return to the real query and parameters when investigating plans or data skew. Read the histogram too: one peak around hundreds of milliseconds and another thousands of times faster may indicate distinct execution paths, such as skewed values or a group of cache hits. A normalized digest alone cannot explain differences between literals. Dispersion measures such as the variance-to-mean ratio can flag variable query classes, but inspect fast/slow samples and context before assigning a cause.

If the question is “what happened during this execution?”, scope measurement to that statement and session. The book uses `SHOW PROFILE` for stage timings, `SHOW STATUS` for counters such as temporary tables and handler reads, an expanded slow-query log for more detail, and Performance Schema for waits/events. Counters need before/after samples and the correct session/global scope; the diagnostic statement itself can change the counters. `EXPLAIN` shows an estimated plan, while counters/events provide evidence about what actually occurred, but every measurement has overhead and blind spots. On current MySQL, prefer Performance Schema/`sys` and supported plan tools; `SHOW PROFILE` is a historical API that is deprecated.

## Catch rare incidents with a trigger and timestamped evidence

When a server is occasionally slow, first distinguish **one isolated query** from a **server-wide** problem. If QPS drops while `Threads_running` or queues rise, a slow query may be a victim of shared contention. If only one fingerprint slows while the rest remain healthy, narrow the investigation to that query, plan, parameters, and locks. Time-series samples of `SHOW GLOBAL STATUS`, process-list/wait snapshots, and query logs make changes easier to spot than a single snapshot after the incident has ended.

Build a trigger from a healthy baseline—for example, the number of running threads above a threshold for several consecutive samples, or an unusual process-list state that persists. A trigger that is too sensitive creates false positives and excess data; one set too high misses incidents. The book uses `pt-stalk`/`pt-collect` to trigger and save timestamped snapshots; the command names are historical, but the design remains useful: check free disk, bound collection time/volume, retain healthy snapshots, then correlate query/transaction activity, InnoDB status, OS CPU/memory, `iostat`, network, and error logs. Synchronize clocks across hosts to correlate events.

One case in the book begins with intermittent `max_connections` errors. During the incident, many queries wait and disk writes surge even though the database is small and the workload is mostly SELECT. InnoDB's state resembles a checkpoint stall, but deltas in `Innodb_buffer_pool_pages_flushed`, dirty-page counts, and checkpoint distance do not support that theory. `df`/`lsof` data shows MySQL temporary-file space growing sharply; the process list contains many queries in “Copying to tmp table” and “Sorting result.” Together, the evidence points to simultaneous cache expiration causing many workers to rebuild the same data, duplicate queries, and on-disk temporary tables. The lesson is not “a cache stampede is always the cause”; test evidence that supports and contradicts a theory. Flushing can be a symptom of blocked I/O rather than the root cause. Do not use query count as a proxy for cost: a few heavy `UPDATE`s can consume more resources than hundreds of light `SELECT`s. Conversely, a plan containing filesort or a temporary table is a clue to investigate in context, not automatic proof of the root cause. The case also lacked a perfect measurement of every I/O source on its older software versions; the conclusion came from several matching clues, with remaining uncertainty stated explicitly.

When investigation must reach the operating system, distinguish a CPU profiler from a syscall tracer: the book's `oprofile` samples CPU symbols; `strace` times system calls and can expose I/O waits, but attaching it broadly to `mysqld` has high overhead and can change the incident. GDB stack traces aggregated with `pt-pmp` can show many threads waiting on one queue/mutex, but need symbols and internals knowledge to interpret. Percona/MariaDB once provided `USER_STATISTICS` for finding heavily or rarely used users, tables, and indexes; versions and schemas change, so verify before relying on it. Use these deeper tools only when the question requires them and their overhead is acceptable.

## Tune the server for the constrained resource

The **buffer pool** holds InnoDB pages. Too little causes churn and repeat reads; too much can force OS swapping or take RAM from connections and other workloads. Measure hits/misses, dirty pages, evictions, memory pressure, and workload before increasing it.

**Redo logs/checkpoints** affect write throughput and recovery windows. Low log capacity may force more frequent checkpoints; increasing it is not free: it needs disk, affects recovery time, and must be understood across versions. **Temporary tables/sort/join buffers** may be allocated per connection or query; increasing global limits while many sessions run can multiply memory use dramatically.

**Connections and threads**: excessive connections consume memory and scheduler time; use a pool but bound real concurrency. **Table/open caches** affect many-table workloads but must fit file-descriptor limits. **I/O settings**, fsync, storage scheduling, and filesystems need measurement on actual devices. Do not disable durability settings to win a benchmark when production must preserve commits across crashes.

The book's tuning checklist covers caches, threads, table cache, temporary tables, sorting, join buffers, network, OS file descriptors, CPU, RAM, filesystem, and disks. There is no universal value set; MySQL 8.4 changes defaults, so start with [MySQL 8.4 configuration](https://dev.mysql.com/doc/refman/8.4/en/server-configuration.html), [InnoDB buffer pool](https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool.html), and [memory use](https://dev.mysql.com/doc/refman/8.4/en/memory-use.html), then verify by measurement.

## Distinguish response time from throughput

Response time includes service time and waiting for queues/resources. Near saturation, more concurrency may increase throughput slightly while sharply increasing latency through queueing and lock contention. A small test with repeated cache hits can be fast but fail to predict tail latency under load.

Run each configuration long enough to reach steady state, and monitor warm-up, checkpoints, and background jobs. Keep workload mix and client count stable, and repeat runs. If profiling shows fast queries but a slow API, investigate network, application code, pooling, or payloads instead of continuing to increase database caches.

## Optimize at the application layer

Reduce round trips with batching or transactions when semantics allow. Fetch only required rows and columns; use keyset pagination for large sets; set timeouts and bounded retry behavior. Connection pooling avoids connecting and disconnecting on every request but does not justify long-held transactions. Application caching needs TTL/invalidation, memory limits, and an explicit tolerance for stale data.

Stored procedures can reduce communication or package logic near data, but add complexity in deployment and observability. A user-defined function inside a query may run for every row and prevent optimizer transformations. Measure the whole application, not only the query engine.

## Diagnose intermittent incidents

If a problem appears only occasionally, collect triggered data: slow-query logs, status deltas, process list, wait events, replication state, and OS resources around the event. Keep timestamps sufficient for correlation while limiting volume and sensitive data. A daily average profile may miss a 20-second spike.

Distinguish one slow query from all queries slowing together; intermittent symptoms may come from a lock chain, batch job, backup, page flush, network burst, or hot key. Use `strace` or a system profiler only after forming a hypothesis about system calls or I/O; broad tracing can add overhead and produce hard-to-interpret output.

## Check your understanding

**Does increasing `innodb_buffer_pool_size` always improve performance?** No. It can trigger swapping or take RAM from connections and the operating system; examine cache misses and memory pressure.

**Does higher throughput always make the user experience faster?** No. Tail latency may rise even as total transactions per second increase.

**Can a benchmark on one query and a small dataset predict production?** Not unless it reproduces row counts, skew, concurrency, cache, I/O, and query mix.

Reading: *High Performance MySQL*, chapters 2, 3, 8, 9, and 14; [MySQL optimization](https://dev.mysql.com/doc/refman/8.4/en/optimization.html) and [Performance Schema](https://dev.mysql.com/doc/refman/8.4/en/performance-schema.html).
