---
title: "Index Design and Measuring Query Performance"
category: "Database"
description: "Choose indexes for query filters and ordering, then verify their benefits with a repeatable workload and measurement."
updated: 2026-10-17
translationKey: "database/index-design-and-query-performance"
---

An index can turn a scan across millions of rows into a few page reads. The same index can make each write more expensive, use more RAM, and give the optimizer another access path to choose from. Index design is a workload problem: identify important queries, understand data order, then measure effects on reads and writes together.

## Start with a query, not a list of columns

Record the query, its predicates, result order, and expected row count. A query such as:

```sql
SELECT order_id, created_at, total
FROM orders
WHERE tenant_id = 12 AND status = 'paid'
ORDER BY created_at DESC
LIMIT 30;
```

filters by tenant and status, returns the newest orders, and stops after 30 rows. An index on `(tenant_id, status, created_at)` may support this path in some engines, but sort direction, data types, collation, statistics, selectivity, and optimizer choices all affect the result. Treat this as a hypothesis to test, not as an unconditional rule that “WHERE columns go first and ORDER BY goes last.”

## Selectivity and the number of pages actually read

A predicate matching few rows is often more likely to benefit from an index than one matching most of a table. **Selectivity** describes how much a condition narrows the data. Row count alone is not enough: rows may be scattered over many pages or clustered together, and requested values may be in the index or require additional heap/table lookups.

An index on a boolean column is often not selective when values are evenly distributed. It can still help if a workload mostly queries one rare value or if the index has a predicate of its own (a partial/filtered index where supported). Measure with the real distribution.

Predicates should let the engine use an index. Wrapping a column in a function, implicit casts, incompatible collation comparisons, or a leading wildcard may prevent the desired access path, depending on the engine. Do not rewrite a query with a syntax trick until you have confirmed its plan and preserved its semantics.

## Composite indexes are ordered

A multicolumn index is sorted in its defined key order. For `(a, b, c)`, an engine can commonly use the `(a)` and `(a, b)` prefixes; this is not equivalent to an index on `(b)` or `(c)` alone. Equality conditions on a prefix followed by a range on the next column often identify a contiguous index region, but exact rules depend on the access method.

Column order must balance several queries. The most selective column does not automatically belong first; workload prefixes, equality versus range predicates, sorting, and index size all matter. One large index may support several queries while increasing write cost and cache pressure.

## Covering, clustered, and index-only access

If a query needs `order_id`, `created_at`, and `total`, enough data might be placed in the index to avoid reading the base row. This is commonly called a **covering index**. Some engines support included columns that do not participate in key ordering; others have different rules. Wider indexes fit fewer entries per page, occupy more cache, and cost more to update.

In **clustered storage**, the primary-key order also determines how table data is organized. InnoDB stores rows by clustered index; a secondary index may carry the primary key to find a row. A PostgreSQL heap does not automatically maintain physical order by its B-tree. These differences affect secondary-index width, random I/O, and primary-key choices.

An index-only scan avoids the heap/table only when visibility and index contents are sufficient. In PostgreSQL, the visibility map affects whether the heap can be skipped; other engines use other mechanisms. Read the plan instead of inferring behavior from an index's name.

## Every index is also a write path

Inserts, deletes, and many updates must change indexes. If an update does not change an indexed column, some engines can avoid modifying that index; if an indexed key changes, the structure must be updated. Many indexes increase storage, buffer/cache footprint, WAL/redo volume, and maintenance work.

Duplicate or unused indexes can be pure cost. Before dropping an index, observe long enough to cover scheduled workloads and check constraints, foreign keys, and rare queries. An index marked “unused” in a short window may still be needed for a monthly batch or recovery process.

## Measure a workload instead of one statement

A benchmark should answer a specific question. For example: “The new index reduces p95 latency for historical queries without reducing write throughput by more than 5% under 400 concurrent connections.” Then keep data, cache state, concurrency, hardware, version, and configuration stable.

A useful measurement includes:

- A production-like query mix, not only one favorable query.
- Data with similar size, skew, and age distribution to the real system.
- An explicit choice between warm and cold cache, kept consistent.
- Throughput, latency distribution (at least p50/p95/p99), errors, CPU, I/O, lock waits, memory, and temporary spills.
- Enough runtime to move past startup and short fluctuations; repeat runs to identify noise.
- One primary change at a time, with plans, settings, and versions saved for comparison.

A microbenchmark isolates an operation but does not fully predict an application. An end-to-end benchmark reveals interactions among clients, connection pools, networks, databases, and storage; it is harder to diagnose without profiling. Choose tools to match the question.

## Profile to find where time goes

Slow-query logs, query statistics, and execution plans identify statements worth investigating. Server-wide metrics show whether the issue is one query or the whole instance: connection saturation, buffer misses, lock waits, checkpoints, redo/WAL pressure, disk latency, or CPU. A status snapshot needs a time window and baseline; a counter accumulated since startup does not automatically explain what happened in the last minute.

For a sudden slowdown, collect the plan, parameters, actual row counts, waits/events, transaction state, and machine resources around the same time. Sampling avoids excessive overhead but can miss brief events. Profilers such as `strace` can help when investigating system calls or file I/O, but evidence must be interpreted alongside the workload and appropriate privileges.

A system can respond slowly while database query time is low: too many round trips, excess data fetched by the application, a connection pool queue, or expensive JSON serialization may be responsible. Measure each layer before blaming an index.

## An optimization can make a query wrong

Replacing a join with several queries may reduce intermediate data but add round trips or observe different snapshots. Caching a result can be fast but introduces invalidation and stale-data behavior. A summary table reduces read computation but must be updated consistently. A materialized view helps reads but has a refresh delay. Each optimization exchanges one cost for another.

Before release, compare results and transaction semantics, not just latency. Monitor a new index after deployment and keep a rollback path if writes suffer. Avoid hints or global server-variable changes as a first step when a narrow query/index change may solve the problem.

## Check your understanding

**Is one multicolumn index always better than several single-column indexes?** No. It may serve certain prefixes and avoid lookups, but it increases size and write cost and does not support every predicate order.

**Why is a benchmark faster after its first run?** Cache state, page warm-up, JIT or plan cache, or loaded data may have changed. Decide whether you are measuring warm or cold behavior.

**Why measure p95/p99 if the average is good?** An average can hide requests delayed by locks, I/O, queueing, or spills; tail latency affects user experience and request deadlines.

Reading: *High Performance MySQL*, chapters 2–6, 8–9, and 14; [PostgreSQL index-usage examination](https://www.postgresql.org/docs/current/indexes-examine.html) and [MySQL InnoDB optimization](https://dev.mysql.com/doc/refman/8.4/en/optimizing-innodb.html).
