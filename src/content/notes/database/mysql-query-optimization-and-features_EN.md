---
title: "MySQL Query Optimization and Advanced Features"
category: "Database"
description: "From the optimizer and execution plans to partitioning, views, routines, and query patterns that can surprise MySQL users."
updated: 2026-10-17
translationKey: "database/mysql-query-optimization-and-features"
---

When an API is slow, we often look at SQL first. Sound optimization starts by determining how many rows a query reads, which index path it follows, in what order it joins tables, and how much data it sorts. MySQL chooses an execution plan using schema, indexes, statistics, parameters, and estimated costs; a query that “looks short” does not necessarily have a cheap plan.

## Measure the right question before rewriting

Distinguish one slow query from a server-wide issue. The slow query log and Performance Schema help identify workload; `SHOW PROCESSLIST` tells whether sessions are running or waiting; status counters can reveal rows, temporary tables, scans, or locks. Counters often accumulate over time, so compare snapshots with a known interval instead of interpreting one number alone.

`EXPLAIN` shows how the optimizer plans to access tables and order joins, which indexes may be used, access types, estimated rows, and extra steps. MySQL 8.4 `EXPLAIN ANALYZE` executes the query and reports actual timing/rows for the iterator plan; use it carefully with writes. Compare estimates with actuals and find the first node that diverges sharply. See [EXPLAIN](https://dev.mysql.com/doc/refman/8.4/en/explain.html) and [execution plans](https://dev.mysql.com/doc/refman/8.4/en/execution-plan-information.html).

Query optimization often means reducing data access: do not fetch unused columns, do not read millions of rows to return a few dozen, push filters earlier when semantics permit, and avoid returning data the application will discard. But counting round trips alone is not enough: combining queries may send too much data, while splitting them can create N+1 requests and observe different snapshots.

## Joins, subqueries, and optimizer limits

The MySQL optimizer can transform some subqueries, change inner-join order, and use nested-loop, hash-join, or other access paths. A correlated subquery may run once per outer row; an indexed lookup may be cheap, or it may become millions of iterations. `UNION` usually removes duplicates while `UNION ALL` keeps them; avoid duplicate elimination when semantics do not require it.

Index Merge can combine results from multiple indexes but is not automatically better than a composite index. Equality propagation can infer a condition from a join, but type conversion or collation can remove an index opportunity. MySQL Server 8.4 does not provide a general parallel scan that automatically divides every SELECT among CPUs. Other products or engines in the MySQL family have distinct distributed execution paths; for example, NDB can push joins to data nodes. Do not apply one product's behavior to InnoDB on MySQL Server. See [SELECT optimizations in MySQL 8.4](https://dev.mysql.com/doc/refman/8.4/en/select-optimization.html).

MySQL 8.4 uses hash joins when appropriate; do not infer this from an older book. Verify the join algorithm, memory, and plan for the version in use. A hint can force join order or an algorithm but make the query sensitive to future data; add one only with measurements and a removal plan.

## Query patterns have their own traps

- `COUNT(*)` must read or aggregate data according to engine/isolation semantics. Do not rely on the belief that MyISAM always keeps an exact row count for every predicate; cached counters also need synchronization.
- `GROUP BY`/`DISTINCT` may sort or use a temporary structure; inspect actual rows, memory, and disk temporary tables.
- `LIMIT offset, count` still skips the rows in the offset. Keyset pagination over a stable order often scales better than a deep offset.
- `SQL_CALC_FOUND_ROWS`/`FOUND_ROWS()` have been deprecated since MySQL 8.0.17; the 8.4 manual says they are expected to be removed in a future release. Commonly, the page query and count run separately or another approach is chosen for the required consistency.
- A correlated subquery can be best when the outer set is small and the inner side is indexed; do not mechanically rewrite every subquery as a join.
- User-defined variables do not guarantee evaluation order across expressions; older ranking patterns based on variables should give way to window functions when the version supports them and semantics fit.

## Partitioning divides one table, not server load

MySQL partitioning divides the data and indexes of one table by RANGE, LIST, HASH, or KEY; pruning skips partitions that cannot match. It can help manage time-based data or scan a subset, but a query without a predicate on the partition key may still inspect many partitions.

Partitioning is not sharding: it does not distribute writes across multiple MySQL servers. In MySQL 8.4, InnoDB and NDB provide native partition support. InnoDB partitioned tables are incompatible with foreign-key references; the partition key is also constrained by unique and primary keys. Before designing, read the [partitioning overview](https://dev.mysql.com/doc/refman/8.4/en/partitioning-overview.html), [pruning](https://dev.mysql.com/doc/refman/8.4/en/partitioning-pruning.html), and restrictions. Too many or too-small partitions also add metadata and operational overhead.

## Views, routines, triggers, and events

A view packages a query and access policy; the optimizer may merge it into the outer query or materialize a temporary result depending on its shape. A view is not automatically a materialized result refreshed on a schedule. A complex view can obscure the plan and limit updates.

Stored procedures/functions run logic in the server, reducing round trips or packaging operations, but add versioning, deployment, permissions, observability, and portability concerns. Triggers run implicitly when rows change, so they can create hidden side effects and increase write cost; keep them small, discoverable, and test ordering/cascades. The event scheduler runs timed work inside the MySQL server; it needs monitoring, retry handling, and protection against duplicate work after restart. Cursors process rows sequentially in stored programs; set-based SQL is often more efficient but not always easier to express.

Foreign-key constraints protect referential integrity and can affect locking and DDL. Do not disable a constraint to “speed things up” without a replacement check and a process to repair invalid data.

## Two case studies need workload reasoning

A queue table may store status, priority, creation time, and worker claims. If many workers run `SELECT ... WHERE status='ready' ORDER BY priority LIMIT ... FOR UPDATE`, the index must support filtering and ordering, while lock semantics and `SKIP LOCKED` behavior depend on version. Claim updates must be atomic; if a worker dies, the design needs a lease/visibility timeout, retry, and idempotency. Keep a queue in MySQL only when its throughput, contention, scheduling, and recovery fit better than a broker.

Computing geographic distance for every row can make the database repeat an expensive formula many times. For radius search, first use a bounding box to reduce candidates, then calculate exact distance; or use spatial types/indexes where supported. Define units and coordinate systems, handle poles/antimeridian, and compare accuracy as well as speed.


## The book's limitations are a snapshot of older MySQL

Chapter 6 describes Oracle MySQL 5.5: many `IN` queries were rewritten as dependent subqueries for each outer row; joins were mainly nested loops; hash joins and several rewrites were missing. This is useful history for understanding optimizer development, but not a rule for MySQL 8.4. Newer releases may use semijoin/antijoin transformations for `IN`/`EXISTS`, materialize a subquery, use a hash join, or stop after the first match. These transformations have conditions, so inspect the actual plan instead of declaring “subqueries are slow” or “joins are always faster.” See [MySQL 8.4 semijoin and antijoin transformations](https://dev.mysql.com/doc/refman/8.4/en/semijoins-antijoins.html).

A question such as “does at least one related row exist?” naturally maps to `EXISTS`; a `JOIN` can duplicate the outer row when several inner rows match. If the result needs one row per customer, `EXISTS` avoids producing duplicates and then removing them with `DISTINCT`. If the result needs data from both tables, a join expresses that result. Start with the result's grain, then measure how the plan produces it.

`UNION` requires two levels of reasoning: `UNION` removes duplicates, while `UNION ALL` keeps them; duplicate removal may require aggregation work. A final `ORDER BY` defines the order of the combined result. Pushing `LIMIT` into each branch is safe only if you can prove it cannot discard a row that belongs in the final top set; this often requires the same sort order, a tie-breaker, and enough candidates from each branch. Current MySQL can optimize or materialize forms differently, so use `EXPLAIN` rather than assuming every UNION writes its full input to one temporary table.

Index Merge combines results from multiple indexes on the same table, for example through union or intersection. It can help when separate predicates have separate indexes, but it reads multiple streams and combines row identifiers; a composite index may do less work when the workload commonly combines those predicates. Compare actual rows and the write cost of extra indexes. Multiple indexes in a plan do not by themselves prove the query is faster.

The book's “loose scan” and the current manual can refer to different strategies. Semijoin `LooseScan` chooses one representative from each value group to avoid duplicates; a loose index scan for some `GROUP BY`/MIN/MAX queries skips between index groups. Neither means MySQL can skip arbitrary noncontiguous sections of every index. MySQL 8.4 also has Skip Scan under separate conditions. Read the exact operator and requirements in [SELECT optimization](https://dev.mysql.com/doc/refman/8.4/en/select-optimization.html).

`MIN()`/`MAX()` can be cheap when an index provides the first/last value for the relevant group; if the filter is not supported by an index, the query may still examine many rows. Do not replace it with `LIMIT 1` without a deterministic order: among several matching rows, an arbitrary row is not guaranteed to contain the minimum or maximum. To preserve the meaning, order by the extremum column and use suitable predicates and indexes.

## Plan hints need evidence and a review date

The book lists `STRAIGHT_JOIN`, `USE INDEX`, `FORCE INDEX`, grouping hints, table-lock priority modifiers, and old syntax such as `DELAYED`. In MySQL 8.4, optimizer hints can control join order, semijoin strategy, materialization, Index Merge, access methods, execution time, and more. Enabling a hint makes a strategy available when applicable; it does not guarantee that strategy is always selected. Some historical hints such as `HASH_JOIN` have no effect in 8.4, and older index hints are being superseded. Check the exact release in the [MySQL 8.4 Optimizer Hints manual](https://dev.mysql.com/doc/refman/8.4/en/optimizer-hints.html) and [Index Hints manual](https://dev.mysql.com/doc/refman/8.4/en/index-hints.html).

Some modifiers in the book are not optimizer hints in the strict sense. `HIGH_PRIORITY`/`LOW_PRIORITY` change statement scheduling on table-locking engines such as MyISAM; they do not grant more CPU or make a query execute faster. `SQL_SMALL_RESULT`/`SQL_BIG_RESULT` suggest how to process `GROUP BY`/`DISTINCT`, but usually do not need to be forced. `SQL_BUFFER_RESULT` creates a server-side temporary result so table locks can be released sooner when sending takes a long time; this differs from client buffering and trades lock time for server RAM/temp I/O. `FOR UPDATE` and `LOCK IN SHARE MODE` control locking reads, not access-plan selection; the modern spelling is `FOR SHARE`. `INSERT DELAYED` was deprecated in 5.6 and is ignored with a warning in 8.4, so do not use it for asynchronous inserts. See [SELECT modifiers in 8.4](https://dev.mysql.com/doc/refman/8.4/en/select.html), [locking reads in 8.4](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html), and [INSERT DELAYED in 8.4](https://dev.mysql.com/doc/refman/8.4/en/insert-delayed.html).

Before adding a hint, record the query, schema, data distribution, statistics, version, intended plan, and observed plan. Measure repeatedly with representative data; write down the reason, metrics to watch, and when to review it after an upgrade or data change. A hint addresses one plan choice; it does not replace fixing a bad cardinality estimate, unsuitable index, or query returning too much data.

## Equality propagation and updates from the same table

Equality propagation can carry a condition through columns already constrained to be equal. If `a.id = b.id` and the query has `a.id IN (...)`, the optimizer may infer a corresponding condition on `b`, opening another access path. With a very large list, copying and processing many values can make optimization more expensive; measure optimization time separately from execution time. This behavior depends on version and query shape; it is not a reason to remove a correct predicate.

The book also shows updating a table from an aggregate derived from that same table through a materialized derived table. MySQL prohibits some forms that modify a table while reading it in a subquery, but there is an exception when the derived table is materialized rather than merged. For a form such as `UPDATE target JOIN (SELECT ... FROM target ...) AS summary ...`, verify the plan/materialization on the current release. State the result grain and join key so one target row cannot match multiple aggregate rows. See the [target-table subquery restriction](https://dev.mysql.com/doc/refman/8.4/en/subquery-restrictions.html) and verify the result on test data.

## Static query analysis complements runtime measurement

Static analysis such as query linting can flag patterns worth reviewing: `SELECT *`, non-sargable predicates, unbounded queries, or unnecessary `DISTINCT`. The book mentions `pt-query-advisor`, a Percona ecosystem tool from that period; support status for individual tools changes over time. A static rule only creates a hypothesis: it cannot know data distribution, cache state, row width, or endpoint p95. Combine linting with slow logs/statement digests and runtime plans; do not turn every warning into a mechanical rewrite rule.

## Check your understanding

**If a query uses an index, is it definitely fast?** No. It may read too many rows randomly; a full scan can be cheaper. Inspect the actual plan and workload.

**Does a partitioned table replace sharding?** No. Partitioning organizes one table inside an engine; sharding distributes data across servers and requires routing/coordination.

**Does a trigger change data in the same transaction?** A trigger is invoked by a statement and is generally part of its transaction, but it may perform operations and take locks that the caller cannot see. Check the engine, trigger semantics, and failure behavior.

Reading: *High Performance MySQL*, chapters 6–7 and case studies; [MySQL 8.4 optimization](https://dev.mysql.com/doc/refman/8.4/en/optimization.html) and [partitioning](https://dev.mysql.com/doc/refman/8.4/en/partitioning.html).
