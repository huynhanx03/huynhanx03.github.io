---
title: "Controlled MySQL Benchmarking and Profiling"
category: "Database"
description: "Design representative workloads, read latency/throughput, and gather evidence from the application through MySQL."
updated: 2026-10-18
translationKey: "database/mysql-benchmarking-and-profiling"
---

A benchmark can answer only the question represented by its workload. A sequential insert test does not accurately predict an API that reads several indexes; default sysbench does not model production skew, long transactions, and bursts. Before tuning, define the bottleneck to measure and keep the workload representative.

## Choose a goal and workload

Write down the goal: maximum throughput under a latency cap, p99 latency at expected load, failover performance, or restore speed. A workload needs a read/write mix, query mix, dataset larger than cache where appropriate, concurrency, think time, transaction shape, skewed data, and client/network behavior. Use the same dataset/state between runs or reset it in a controlled way.

Measure latency percentiles (p50/p95/p99), throughput, errors, queue depth, CPU, memory, I/O, rows examined, and DB waits. Averages hide tail latency. Increase concurrency in steps to find saturation; too much load can reduce throughput as queues/contention grow.

## Benchmark discipline

Warm caches and connection pools, run long enough to get past startup noise, repeat runs, record version/config/hardware, and avoid competing benchmarks on the same host. Change one variable per run; plot throughput/latency against concurrency. A plot reveals the saturation curve hidden by one “transactions/s” number.

Separate the measurement into phases: prepare data; warm up; run the steady workload; stop load; save raw results and configuration. Exclude warm-up from a steady-state result, but include it when the real question is startup time or cold-cache behavior. If the test resets the database, record how and verify every run starts from the same state. Without a reset, run order can bias results because cache, data, compaction, or checkpoints may have changed.

The load generator also affects the measurement. A **closed-loop** model sends another request after the previous one completes; as the server slows, the offered rate falls, which can hide an overloaded queue. An **open-loop** model tries to send requests at a predetermined rate; it exposes queue growth and overload, but the generator needs a bounded backlog so it does not exhaust its own resources. Record both offered load (what the client intended to send) and completed throughput, along with timeouts/errors. Think time belongs to the user model; removing it can turn an interactive workload into a continuous firehose.

Results are comparable only when dataset, key distribution, query mix, isolation/durability settings, concurrency model, client count, and resource limits are held constant. For close results, repeat runs and report a median/range or dispersion; a difference smaller than the noise is not evidence that tuning helped. Preserve raw latency samples where possible because a histogram, bucketed percentile, or aggregate mean can lose tail detail.

### Example: find the saturation point instead of choosing the largest number

Suppose a profile-reading endpoint must keep p99 below 200 ms. Run the same dataset and query mix at increasing concurrency, collecting completed requests/s, p99, timeouts, CPU, and lock/I/O waits. The values below are **illustrative data**, not a book benchmark or hardware recommendation:

| Concurrent clients | Completed per second | p99 | Timeouts | Related signal |
| ---: | ---: | ---: | ---: | --- |
| 8 | 420 | 42 ms | 0 | CPU 38%, short queue |
| 16 | 760 | 71 ms | 0 | CPU 66% |
| 32 | 910 | 238 ms | 3 | CPU 96%, runnable queue growing |
| 64 | 700 | 1.4 s | 81 | CPU still saturated, requests queueing |

The 64-client run has the most concurrency but completes fewer requests and has worse latency. Under the p99 < 200 ms objective, 16 clients is the measured point that meets the target; 32 shows where saturation begins. Next identify whether statements consume CPU or application fan-out does; reducing concurrency may protect the SLO, while query optimization may raise the saturation point. Raising `max_connections` does not create CPU and may allow a larger queue.

Do not take the final percentile at face value: confirm that the run was long enough, the workload is repeatable, and queues/timeouts were measured on both client and server. If a blocked generator sends less load than intended, completed throughput can hide requests that were rejected or never issued.

Sysbench can generate synthetic workloads; TPC-C/DBT-2 model more multi-step transactions; a full-stack load test measures application/network too. Do not directly rank numbers from different hardware, datasets, durability, or clients. Include longer runs to expose checkpoints, purge, replication, and cache effects.

## From application to query

Profiling starts with a request trace: one request may issue many queries, serialize a large payload, or wait for a pool before MySQL sees a command. Instrument query count, duration, rows, pool wait, and correlation ID. Then distinguish one slow query from total-workload CPU/I/O/lock pressure.

The slow query log/Performance Schema can reveal digest, latency, rows examined, temp tables, sorts, and waits. EXPLAIN/EXPLAIN ANALYZE explains a plan; Performance Schema provides server-wide evidence; OS tools such as `iostat`, `vmstat`, and `pidstat` show host resources. Bound sampling/retention because tracing every query has overhead.

Break request time into measurable pieces: waiting for an application worker/pool, application processing, network round trips, waiting/running in the server, and reading/serializing the response. These pieces may overlap, so do not add them as if every system ran sequentially. A correlation ID and roughly aligned timestamps help connect an application trace to a MySQL thread/statement. If a request takes 900 ms but its query accounts for only 80 ms, index tuning may not fix user latency.

Choose a tool for the question. The slow query log records statements that cross a threshold and can include rows examined; the general log captures much more activity and is usually unsuitable for long-term use under heavy load. Performance Schema aggregates structured events by thread/digest/wait, but history is bounded and depends on instruments/consumers. `EXPLAIN` describes a plan; `EXPLAIN ANALYZE` executes supported statements to measure actual behavior, so use it with awareness of side effects and environment. Each layer has blind spots: app tracing sees pool waits, server history sees query events, and OS metrics see CPU/I/O. No single layer explains the whole request.

## Intermittent incidents

For short spikes, collect ring-buffer metrics and diagnostics before the incident disappears: process list, global-status deltas, active transactions, lock waits, slow log, CPU/I/O/network, and application traces. A single snapshot does not reveal a rate; compare deltas over a period. Keep timestamps aligned across application, database, and host.

With a baseline, test a small hypothesis: raise buffer pool only when evidence shows uncached physical reads; reduce concurrency if CPU queueing/lock contention is high; fix an index if rows examined are excessive. Every change needs before/after measurements and a rollback path.

*High Performance MySQL*, chapters 2–3, covers benchmarking, profiling, and intermittent diagnostics. For MySQL 8.4, use [Performance Schema](https://dev.mysql.com/doc/refman/8.4/en/performance-schema.html), the [slow query log](https://dev.mysql.com/doc/refman/8.4/en/slow-query-log.html), and [EXPLAIN](https://dev.mysql.com/doc/refman/8.4/en/explain.html); the book's `SHOW PROFILE`/`SHOW PROFILES` statements are **deprecated**, and the 8.4 manual points users to Performance Schema. They should not be described as already removed from 8.4.

## Check your understanding

**Is a 10-second benchmark enough to compare configurations?** It may not get past startup/cache noise or represent sustained load.

**Does average latency identify the slowest requests?** No; inspect percentiles and tail latency.

**Does a CPU spike on the database prove the optimizer is wrong?** No; application fan-out, concurrency, locks, or background work may be responsible.
