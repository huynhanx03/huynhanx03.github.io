---
title: "MySQL COUNT, JOIN, GROUP BY, and Pagination Patterns"
category: "Database"
description: "Optimize for data actually read, choose query decomposition, and avoid expensive counts/offsets."
updated: 2026-10-17
translationKey: "database/mysql-query-patterns-count-pagination-and-joins"
---

A slow query is usually not slow because the SQL is “long”; the server may read too many rows, sort too much data, send excess bytes, or repeat queries from the application. Start by estimating work: rows examined, rows returned, response size, round trips, and lock time. Choose query shape by semantics, then verify with EXPLAIN and benchmarks.

## Read less

Avoid `SELECT *` when only a few columns are needed; it increases I/O, buffer pressure, and network traffic and can prevent index-only access. Filter early with sargable predicates; wrapping an indexed column in a function/cast can hurt the access path. Adding an index does not help if the application fetches millions of rows and discards them.

Response time includes query service time and queue/lock/network waits. The rows-examined/returned ratio can show wasted work, though a high ratio may be reasonable for a rare filter. Measure both endpoint end-to-end and query alone.

## One complex query or several smaller queries?

Database joins reduce network round trips and let the optimizer choose join order; a very wide join can create a large intermediate result. Splitting a query can help caching or application-side parallel work, but adds round trips, consistency gaps, and application-side merging. Join decomposition fits when one large join reads much irrelevant data, not as a universal rule.

Check join-key type/collation, indexes on both sides for the access pattern, and cardinality. An outer-join filter in `WHERE` can change semantics to an inner join; place a predicate in `ON` or `WHERE` according to the intended result.

## COUNT and summaries

`COUNT(*)` counts matching rows and may read an index/table; InnoDB does not keep one cheap exact row count because transaction visibility differs. `COUNT(column)` skips NULL; `COUNT(DISTINCT)` adds dedup/sort/hash work. If a UI can use an approximate number, sampling/summary tables reduce work but need explicit staleness/error semantics.

A counter table updated on every request can become a hot row with lock contention. Sharded counters or batched aggregation reduce contention but are not immediately exact. A manually maintained summary needs transactional updates, backfill, and reconciliation.

## Pagination and LIMIT

`ORDER BY ... LIMIT` needs a stable order with a tie-breaker. `LIMIT 20 OFFSET 100000` still walks many rows before discarding them; keyset pagination uses a condition such as `(created_at,id) < (?,?)` to continue from a cursor. It is faster for deep pages but cannot jump arbitrarily to a page number and needs an index matching sort/filter.

Historical `SQL_CALC_FOUND_ROWS` forced the server to continue finding the full result even when returning one page; it has been deprecated since MySQL 8.0.17. Separate page/count queries add a round trip; consider async/cached counts if the UX does not need an exact immediate number.

## GROUP BY, DISTINCT, UNION

GROUP BY may use index order or a temporary table/sort; `DISTINCT` still costs work when many rows must be deduplicated. `UNION` removes duplicates; `UNION ALL` does not, so choose by semantics. `GROUP BY WITH ROLLUP` adds subtotal levels. Inspect EXPLAIN, temporary tables, filesort, rows examined, and memory spills.

### One measured analysis loop

Suppose an endpoint fetches 20 newest orders for one customer, but the slow log reports 180,000 rows examined. Do not start by adding an arbitrary index. First record the exact filter/order and uniqueness: `WHERE customer_id=? ORDER BY created_at DESC, id DESC LIMIT 20`. Then inspect `EXPLAIN`: access type, key, estimated rows, chosen order, and extra sort. An index on `(customer_id, created_at, id)` may support filtering and ordered reads, but scan direction and column direction should be checked for the MySQL version/query.

Run `EXPLAIN ANALYZE` on representative data to compare actual rows/loops with estimates; if estimates are wrong, inspect histograms/statistics and data skew. After a change, measure p95/p99, rows examined, bytes, and write cost under the same workload. A new index is not a win if a query saves 2 ms but makes inserts much slower or grows the buffer pool beyond its budget.

For a query joining `orders` with `order_items`, choose the grain first: one row per order or one per item? Joining before aggregation can multiply each order amount by its item count; aggregate items to order grain first or total at the intended grain. Compare results on a small dataset with one order and several items to catch a logic error before tuning.

## Case study: a queue table

A MySQL queue can claim tasks in a transaction with `SELECT ... FOR UPDATE SKIP LOCKED` on a supporting server; verify version/isolation, an index on status/due time, lease, retry, and dead-letter behavior. Claim then commit quickly, perform work outside the transaction, and update status by task ID/version. Do not hold a lock for long processing; a worker crash needs an expired lease so the task can be claimed again.

The book's case uses one `UPDATE ... WHERE owner=0 AND status='unsent' LIMIT n` statement to claim a batch, stores the connection ID as owner, and then reads that owner's rows. One statement shortens the gap between selecting work and claiming it compared with `SELECT ... FOR UPDATE` followed by `UPDATE`. However, connection-ID ownership and cleanup for a lost connection are not durable leases: the connection can disappear, an ID can be reused, and work outside the transaction can take a long time. A current design often uses a random claim token, `claimed_at`/lease deadline, retry count, and conditional updates. `SKIP LOCKED` can distribute rows among workers but does not guarantee absolute fairness. Do not use `SLEEP()` plus `KILL QUERY` as a production notification mechanism; it is a book-era illustration, while notifications or a broker fit better once polling becomes load.

*High Performance MySQL*, chapter 6, covers rows examined, query decomposition, COUNT/JOIN/GROUP BY/LIMIT, UNION, and a queue case. Compare [EXPLAIN](https://dev.mysql.com/doc/refman/8.4/en/explain.html), [locking reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html), and [SKIP LOCKED](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html#innodb-locking-reads-skip-locked).


## Splitting a query: reduce one cost, possibly create another

A request might fetch a post, then its author, then its comments, creating N+1 queries. Combining them with a join or fetching a batch of IDs with `IN (...)` often reduces round trips. But a large join can multiply rows: one post with 5 comments and 4 tags can produce 20 intermediate rows if both relationships are joined at once. Identify the result grain, aggregate each relationship separately when needed, and measure bytes as well as query count.

Splitting one join into several queries can help when each part has a useful cache, results are reused, or the application can process them concurrently without increasing database load. In return, round trips increase, the application must merge data, and queries at different times can observe different snapshots. If correctness depends on all data coming from one state, use a transaction with suitable isolation or keep one query.

The book's join-decomposition examples name specific cases: an object cache may skip a query or remove already-cached IDs from an `IN` list; fetching IDs first and then loading rows by ID may reduce repeated access; and application code can combine data from different shards/servers. The costs matter too: cache invalidation across tables becomes harder, a large ID list has packet and planning limits, separate queries may observe inconsistent snapshots, and the application must handle duplicate or missing rows. Compare total server work, network bytes, cache hit rate, round trips, and consistency requirements.

“Chopping up a query” in the book means splitting a large write into batches, such as deleting by primary-key ranges. Each batch bounds locked rows, undo/redo work, and transaction duration, and gives replicas a chance to catch up. Choose batch size from observed latency and load; save a checkpoint after each batch so work can resume. Use a stable predicate to avoid skipping rows; account for triggers/cascades, foreign keys, binlog behavior, and retries. Multiple batches are not globally atomic: applications may see partial progress, so design them to be idempotent.

## COUNT, grouping, and approximate numbers

`COUNT(*)` counts rows in the result; `COUNT(expression)` counts only rows where the expression is not `NULL`. Thus, `COUNT(nullable_column)` differs from `COUNT(*)`. `COUNT(DISTINCT x)` also removes duplicates. InnoDB must account for row versions visible to the transaction snapshot; it cannot always return one exact metadata counter cheaply for every transaction. The book notes that MyISAM can answer unconditional `COUNT(*)` quickly because the engine stores the total row count, but `COUNT(*) WHERE ...` and `COUNT(DISTINCT ...)` still require work.

If a user only needs to know whether another page exists, fetch `page_size + 1` rows and use the extra row for a Next link. If an approximate count is acceptable, use estimates or periodically refreshed counters and state their staleness/error. If an exact count is continuously required, a summary table or counter must update in the same transaction and handle hot-row contention, backfills, and reconciliation. “Fast, accurate, and simple” often forces a product tradeoff.

Conditional aggregation can count several groups in one scan, such as `SUM(color = 'blue')` and `SUM(color = 'red')`, but boolean and `NULL` behavior must match the intended meaning. Do not copy the old `COUNT(boolean OR NULL)` trick without checking NULLs, SQL mode, and version. Prove the result on a small fixture before tuning it.

The book also illustrates taking the table total and subtracting the small excluded set, for example total cities minus rows with low IDs. This is cheap only if the engine can obtain the full total very cheaply and the excluded set is small and indexed. With InnoDB, an unconditional total is not automatically a precise constant; compare the plan and rows read before using subtraction.

## GROUP BY, DISTINCT, and deterministic results

An index in the right order may let the server read groups consecutively; otherwise, it may sort or use a temporary structure. `GROUP BY ... WITH ROLLUP` adds subtotal rows at several levels. Inspect the plan and compare the output with a small calculation. Do not select arbitrary columns outside the group: if `ONLY_FULL_GROUP_BY` does not permit them, establish a functional dependency or use an intentional aggregate. Add `ORDER BY` when the user needs ordering; SQL does not promise an order just because rows happen to arrive through an index.

Optimization must preserve meaning. If `orders` has one row per order and `order_items` has several rows per order, joining them and calculating `SUM(orders.total)` counts each order repeatedly. First define whether the total is per order or item; you can aggregate `order_items` to one row per order and then join. Check with a small fixture containing one order with several items to catch a grain error before benchmarking.

## User variables are historical examples, not a modern ranking tool

The book uses session variables such as `@rank` and `@previous_count` to assign ranks in one pass; the example shows how evaluation stages and the query plan can affect SQL. MySQL does not guarantee the evaluation order of user-variable reads and writes inside one statement. `ORDER BY`, `GROUP BY`, a temporary table, or an optimizer change can make assignments run at a different stage than expected. Variables also persist across statements on the same connection, so an unreset value can leak through a connection pool.

In current MySQL, prefer `ROW_NUMBER()`, `RANK()`, or `DENSE_RANK()` with a deterministic order. User variables can carry values into a query, but avoid assigning to and reading the same variable in one statement; do not rely on side effects for ranking, counting updated rows, or a “lazy UNION.” See [user-defined variable rules in 8.4](https://dev.mysql.com/doc/refman/8.4/en/user-variables.html).

Other book examples use variables to retain `NOW()` after an UPDATE, distinguish insert/update branches in an upsert, compute running totals/averages, or read an archive table only when the primary table has no match. They illustrate expressive tricks but depend on expression evaluation timing and session state. A modern approach is usually to retain input in the application, use a window function, affected-row metadata, explicit queries, or a transaction with deterministic predicates. Keep a variable trick only after verifying semantics for the exact driver/version and showing a measurable reason.

## Radius search: filter cheaply before calculating precisely

Running Haversine for every row can consume CPU and does not let an ordinary B-tree remove candidates. The case study's approach has two stages: build a latitude/longitude bounding box to find a smaller candidate set through an index, then calculate exact distance for those candidates. The box is only a coarse filter, not the final answer; an exact-distance predicate must remove points in the square's corners that lie outside the radius.

Coordinates on Earth require more care than the book's simple example: a degree of longitude represents a different distance at different latitudes; polar regions and the antimeridian can break a naive box; coordinate systems, units, and input precision define what accuracy means. If spatial queries are central to the workload, check spatial types, indexes, and functions in the MySQL version in use instead of inventing a grid encoding. Test at boundaries, poles, and the antimeridian.

The book also demonstrates turning a bounding box into an equality prefix: store `FLOOR(latitude)` and `FLOOR(longitude)` in helper columns, index `(lat_cell, lon_cell)`, and enumerate the grid cells around the search point. For a center near `38.03, -78.48` and a 100-mile radius, its example checks latitude floors 36–40 and longitude floors -80 through -77. The index narrows candidates using cell values; an exact coordinate predicate or Haversine calculation must still filter them because the cells form a wider square than the circle. This coarse grid has write-maintenance cost and does not replace a spatial index; cell generation must handle high latitudes and the antimeridian.

## When SQL should not do all the computation

The book's UDF case moves an expensive bit operation into a separate C program called through a MySQL extension. The lesson is not “C is always faster than SQL”; it is to choose the right place for the work. Before writing a UDF, try reducing candidates with indexes, using native functions, precomputing derived data, or processing batches outside the database. A native UDF risks crashing the server, adds privilege and ABI/version dependencies, and complicates deployment. A separate daemon adds network timeouts, retries, protocol, and failure modes. Move work only when profiling proves database CPU is the bottleneck and end-to-end measurements justify it.

The book's benchmark—a C daemon using SSE4.2 to process millions of strings very quickly—is specific to its workload, hardware, and code. Do not use its number to predict a current system. The reusable lesson is that CPU-heavy work can move outside a database transaction when measurements show database CPU is constrained; then include serialization, network, batching, timeouts, and the operational cost of another service.

## Check your understanding

**Does `COUNT(*)` on InnoDB always read one metadata counter?** No; exact count depends on visibility and may require a scan.

**Does OFFSET pagination cost stay constant across pages?** No; a large offset must skip many rows.

**Should a queue worker hold a row lock while calling an API?** No; claim and commit quickly, work outside the transaction, then record the result idempotently.
