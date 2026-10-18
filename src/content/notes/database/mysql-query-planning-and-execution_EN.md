---
title: "From a Request to a MySQL Execution Plan"
category: "Database"
description: "Follow SQL through the protocol, optimizer, and storage engine; read a plan by comparing estimates with actual rows."
updated: 2026-10-17
translationKey: "database/mysql-query-planning-and-execution"
---

A `SELECT` sent by an application does not go straight to a B-tree. MySQL receives the request, parses it, identifies tables and privileges, chooses how to read the data, executes the plan through a storage engine, and sends results to the client. A slow query may spend time at any of these stages: waiting for a connection, reading many pages, repeating lookups in a join, sorting, holding locks, or transferring a large result set.

## The path of a query

With the classic protocol, a client sends a command/query on a connection. The server parses SQL into an internal structure, resolves table/column names and checks privileges, then normalizes some expressions. The optimizer considers the schema, indexes, statistics, and predicates to choose access paths, join order, sort/group strategies, and applicable transformations. The result is an execution plan made of operations/iterators.

The executor runs the plan. Some operations happen in the server layer; reads or writes of rows go through the handler interface to a storage engine such as InnoDB. The engine locates pages, checks records/visibility, and returns matching rows. The server applies remaining filters or expressions, encodes result metadata/rows according to the protocol, and sends them to the client. The client must still receive bytes, decode rows, and perhaps build objects; total request time is therefore not the same as executor time alone.

```text
Client → protocol command → parse/resolve → optimizer + statistics
       → execution iterators ↔ storage-engine handlers/pages
       → result metadata/rows → network → client
```

A process state such as `Sending data` in some versions may include scanning, filtering, reading rows, and preparing the result; do not interpret the state name as meaning the server is only sending bytes over the network. State names/instruments vary by version. On MySQL 8.4, use Performance Schema statement/stage/wait events for structured investigation; correlate query time with network and application traces if endpoint time remains high.

## The optimizer chooses a plan from estimates

The optimizer does not execute every complete plan and then choose the fastest one. It uses a **cost model** and statistics to estimate the work: rows matching predicates, number of lookups, scan/index costs, sorting, joins, and other operations. It compares candidate plans from those estimates. Estimates are predictions from metadata/sampling, so skewed data, missing histograms, or stale statistics may make the decision differ from actual workload behavior.

Suppose a query fetches recent orders for a tenant and joins `order_items`. With a nested-loop join, MySQL may read the matching orders first, then look up items through an index for each order. If there are 40 orders and each lookup returns an average of 3 items, the inner iterator may run about 40 times and produce about 120 rows before later steps. If the optimizer estimates only 2 orders but the actual count is 40,000, an inner lookup that seemed cheap may run tens of thousands of times.

Join order depends on cardinality estimates and predicates. Starting from fewer matching rows is often useful, but it is not the only rule: covering indexes, sort order, join conditions, and row-fetch cost also matter. MySQL 8.4 has several join strategies, including nested-loop variants and hash join when the conditions fit; the optimizer does not necessarily select hash join just because a query has an equality condition. Inspect the actual plan before rewriting the query.

## Read the plan as a work tree

`EXPLAIN` describes the strategy the optimizer intends to use. Ask in this order:

1. Which table is accessed first, and why does this order fit the filters/joins?
2. Which scan, lookup, or range does each iterator use? Which key is selected, and what conditions remain?
3. How many rows are estimated in/out of each step? Is there a sort, temporary table, materialization, or late filter?
4. How many times does the inner side of a join run? A small lookup repeated hundreds of thousands of times is still a lot of work.
5. How many rows/bytes does the query return, and does the client need all of them?

In MySQL 8.4, `EXPLAIN ANALYZE` executes the `SELECT` and displays iterators with actual rows, loops, timing, and estimates. Compare from the top of the tree to the first large mismatch. For example, if the optimizer predicts a predicate will match 20 rows but actual is 80,000, later nodes may be slow because they receive much more input than expected; changing the query at the end of the tree may not fix the root problem.

Read rows and time together with loops. If an inner node returns an average of 3 rows across 40,000 loops, it may process roughly 120,000 rows. Iterator time may include child time in the plan's presentation, so do not mechanically add every displayed number to derive endpoint latency. `EXPLAIN ANALYZE` adds overhead and executes a supported statement. For `SELECT`/`TABLE`, choose a safe read query and an environment that can handle the load; multi-table `UPDATE`/`DELETE` statements modify data, so run them only on recoverable test data.

## When estimates are wrong, find the missing information

Check join-key types/collations, indexes, null fraction, cardinality, skew by tenant/status, and how often data changes. `ANALYZE TABLE` updates key distributions; histograms can describe a column distribution when average index statistics are insufficient. These operations also cost resources and do not fix every estimate, so rerun the plan after updating them.

If `EXPLAIN` does not show why an access path was rejected, an optimizer trace can reveal the transformations, ranges, and cost decisions considered. This is diagnostic data, not a plan to apply directly. Return to checking statistics and workload before adding a hint.

Hints such as `JOIN_ORDER`, `JOIN_INDEX`, or `MAX_EXECUTION_TIME` can help after a specific problem is proven; they can also tie SQL to the current layout/data. A useful hint needs a metric that proves its value, suitable query regression coverage, and an owner who will review it after schema changes, data-distribution changes, or upgrades. The optimizer is cost-based, but it does not know every future workload.

## Connect the plan to the user's wait time

An execution plan explains how the server works, but does not fully show connection-pool queueing, network latency, client decoding, or application work before/after the query. Compare endpoint traces with statement digests/timing in Performance Schema. If the server statement is fast but the endpoint is slow, look at the application, pool, network, or number of round trips. If actual rows/loops are large, focus on reducing reads/join work. If time is spent waiting on locks/resources, a new index may not fix the blocker.

Durable concepts from the book include query plans, estimates, join order, and measuring actual behavior. Algorithms, state names, hash joins, optimizer switches, and `EXPLAIN` formats change by MySQL release; verify current behavior in the [MySQL 8.4 EXPLAIN manual](https://dev.mysql.com/doc/refman/8.4/en/explain.html), [EXPLAIN output](https://dev.mysql.com/doc/refman/8.4/en/explain-output.html), [execution plans](https://dev.mysql.com/doc/refman/8.4/en/execution-plan-information.html), [derived-table materialization](https://dev.mysql.com/doc/refman/8.4/en/derived-table-optimization.html), [cost model](https://dev.mysql.com/doc/refman/8.4/en/cost-model.html), [optimizer controls](https://dev.mysql.com/doc/refman/8.4/en/controlling-optimizer.html), and [Performance Schema](https://dev.mysql.com/doc/refman/8.4/en/performance-schema.html).

## Read traditional EXPLAIN from left to right

Appendix D of *High Performance MySQL* explains the traditional `EXPLAIN` table column by column. Those columns remain useful for recognizing plan intent, but formats and SELECT-type labels change by version. MySQL 8.4 also offers `TREE` and `JSON`; `TREE` describes parent-child relationships more clearly and is the format used by `EXPLAIN ANALYZE`.

- `id` groups SELECT blocks in a complex query. Do not read it as execution time order; subqueries, derived tables, and UNIONs have their own structure.
- `select_type` describes a block's role, such as SIMPLE, PRIMARY, SUBQUERY, DERIVED, or UNION in older versions. Some labels changed or were deprecated in newer releases. Use TREE/JSON to understand the actual materialization, semijoin, or subquery transformation.
- `table` is the data source for a step: a base table, derived result, union result, or `NULL` when the step needs no table. A self-join alias can appear as two different accesses.
- `partitions` lists partitions the optimizer expects to read when partitioning applies. If a query should touch a narrow range but lists many partitions, check whether its predicate permits pruning.
- `type` is the historical name for an access method/join access, not a SQL data type. `const`, `eq_ref`, `ref`, `range`, `index`, and `ALL` often describe access from selective lookup to broad scan, but should not be ranked without table size, loop count, and rows needed.
- `possible_keys` lists indexes the optimizer considered, not a promise that they fit the query. `key` is the chosen index; `NULL` can mean a scan or that no table access is needed.
- `key_len` gives the byte length of the key portion used by a lookup and depends on nullability, character set, and type. It does not say an index is “good” or intuitively count used columns; compare it with the index definition and `ref`.
- `ref` shows the value/column compared with the index key, such as a constant or a column from an earlier step.
- `rows` estimates rows to examine at a step; for nested loops, read it together with loops and the rest of the plan. `filtered` estimates the fraction remaining after conditions. Both estimates can be wrong when statistics are stale or data is skewed.
- `Extra` contains notes such as `Using index` (covering), `Using where`, `Using temporary`, `Using filesort`, or pushed-down conditions. “Filesort” does not prove sorting spills to disk; “temporary” does not always mean a large temporary table. Verify with runtime data and instrumentation.

Consider a join: the optimizer range-scans `customer` to produce about 500 rows, then looks up `orders` by `ref`, estimating two rows per customer. That suggests roughly 1,000 inner rows of work. If `EXPLAIN ANALYZE` reports 500 loops but 40 rows per loop, actual work is about twenty times the estimate. Check the first divergence and data skew before adding an index or hint.

`EXPLAIN FORMAT=TRADITIONAL`, `FORMAT=TREE`, and `FORMAT=JSON` serve different needs. TREE makes operator order and hash joins easier to see; JSON is convenient for structured comparison/tooling; traditional output is compact for many table lookups. In MySQL 8.4, the default format is also affected by `explain_format`. State the format explicitly in incident documentation so snapshots are reproducible.

`EXPLAIN ANALYZE` both plans and executes a supported statement to collect timing, rows, and loops. In MySQL 8.4, it supports `SELECT`, `TABLE`, and multi-table `UPDATE` and `DELETE`; it does not support every DML form. A write can change data, cause I/O/locks, and run triggers, so measure it only on recoverable test data. This does not turn server time into user latency: client, network, and pool remain outside its scope. Ordinary `EXPLAIN` can plan `INSERT`, `REPLACE`, `UPDATE`, and `DELETE` without executing the statement.

### Read DML plans as DML plans

In the book's release era, `EXPLAIN` mainly accepted `SELECT`, so the authors suggested rewriting an `UPDATE` as a similar `SELECT` to inspect access paths. That rewrite can choose a covering index the real write cannot use: an `UPDATE` must also read new values, modify the clustered record and secondary indexes, check constraints, run triggers, hold locks, write undo/redo, and produce binary log events. When the MySQL release supports `EXPLAIN UPDATE/DELETE/INSERT/REPLACE`, explain the actual statement to see the optimizer's plan for that operation. The result is still an intended plan, not a complete simulation of execution cost or trigger/routine side effects.

In MySQL 8.4, `EXPLAIN ANALYZE` executes `SELECT`, `TABLE`, or some DML: multi-table `UPDATE` and `DELETE`. It does not support every write statement, but a supported DML is still the real statement and can modify data; use it only on recoverable test data. Ordinary `EXPLAIN` plans `SELECT`, `INSERT`, `REPLACE`, `UPDATE`, and `DELETE` without executing the statement. After inspecting a write plan, benchmark separately on recoverable test data and observe locks, undo/redo, replication, and completion time.

### EXPLAIN with derived tables and subqueries

The book warns that some `EXPLAIN` operations could first materialize a `FROM` subquery into a temporary table before planning the outer query, making `EXPLAIN` itself expensive on MySQL 5.5. MySQL 5.6 introduced deferred materialization. In MySQL 8.4, the optimizer postpones derived-table materialization until its result is needed; with ordinary `EXPLAIN`, the query is not executed, so some derived tables never need to be materialized. `EXPLAIN ANALYZE` executes a supported statement (`SELECT`, `TABLE`, or multi-table `UPDATE`/`DELETE`) and may cause that work; DML can modify data. Check both the release and the `EXPLAIN` variant before running against a large query/view.

A plan also does not expose every runtime action: triggers, stored functions, or UDFs may add work; some optimizations become clear only during execution; estimates and `Extra` are bounded summaries. Use Performance Schema, statement history, and runtime measurements to connect the visible plan to actual time, waits, and side effects.


## Response time includes waiting

When a user says “the query took 800 ms,” the number may start when the application calls the database and end when the application receives the result. It includes **service time** (the server parses, reads, joins, sorts, and produces rows) and **wait time** (waiting for a pooled connection, a lock, CPU, I/O, network, or another request holding a resource). A statement that runs for 30 ms inside the database can still make an endpoint take 500 ms if the pool is backed up or the application issues many round trips.

The book uses rows examined and rows returned as an initial signal. Reading 100,000 rows to return 20 is worth investigating, but the ratio is not a verdict: a rare predicate may examine many index entries; a wide row costs more bytes than a small row; and a join may repeat a lookup many times. Ask separately how many rows and pages the server read, how many times each step ran, and how many bytes the result sent to the client. Then compare database time with end-to-end request time.

Do not request data just to discard it. Select needed columns instead of using `SELECT *`, filter with predicates that can use an index, and add `LIMIT` when the interface truly needs only part of a result. `LIMIT` reduces work when the engine can stop early, but it does not rescue every query: if the server must sort the entire set first, it may still read and sort many rows before returning a few.

## From a statement to a result through the protocol

In the classic flow, the client sends SQL over a connection. The server parses it, resolves table and column names and permissions, and asks the optimizer for a plan. The execution engine runs the plan's iterators; reads and writes go through the handler interface to the storage engine. Finally, the server encodes metadata and rows for the client. Timing SQL inside the database therefore does not fully represent an API's response time.

The server can often send the first row before producing the entire result set, if the plan permits streaming. On the client, buffered mode reads the complete result into application RAM; the connection is freed sooner, but memory grows with result size. Unbuffered mode lets the application consume rows incrementally and uses less client RAM, but the connection remains busy while the application processes them. If the application reads a cursor while making a slow API call or doing lengthy work, it holds the connection and server resources longer. Choose a mode based on result size, consumption pattern, and the driver's connection lifecycle.

In the classic protocol, the server sends rows in its response; if the application reads 10 rows and stops its loop, that alone does not ask the server to stop the query. `LIMIT 10` sets the bound on the server side. A driver can cancel a statement through a separate mechanism, but that is a different operation with its own cost. Do not rely on “fetching only a few rows” to avoid producing the full result set.

Process-list states such as `Sending data` vary by version and can cover reading, filtering, joining, and preparing results; the label does not prove the server is only sending bytes. Use Performance Schema to inspect statement, stage, and wait events, then correlate them with application traces to find time outside the database.

## How the optimizer builds a plan

The optimizer receives schema, index, and statistics from storage engines. Statistics can include page counts, cardinality, key lengths, and value distributions. It uses them to estimate access-path, join-order, sort, and materialization costs. These are predictions, not measurements: tenant skew, missing histograms, or stale statistics can make them wrong. The cost model also cannot see everything happening in the application or competing workload outside the query.

Some rewrites can be determined from expressions and schema, such as folding constant conditions or recognizing equality through a `JOIN`. Other choices depend on predicate values, statistics, and current data, so they need fresh estimates at execution. A prepared statement may reuse stable work but still has to choose access paths appropriate for its values and data; do not assume the first plan suits every parameter. The book's terms “static” and “dynamic optimization” help distinguish these kinds of decisions, even though implementation details change by release.

Optimizer cost is only an approximation. The book suggests estimating an upper bound for query time by inspecting how many random/sequential page accesses the plan might require and multiplying by device latency. This is not an exact prediction because caching, concurrency, CPU, and queueing vary, but it can reveal a plan with too many physical reads to meet a latency target. Compare the estimate with Performance Schema, buffer-pool/cache state, and benchmarks on representative workloads.

The book describes MySQL's join strategy around version 5.5 mainly as nested loops. Picture an outer table returning three customers; for each one, the inner table is probed through an index; each match becomes a joined row. If the inner lookup returns four rows on average and runs 30,000 times, intermediate work may reach about 120,000 rows. With a `LEFT JOIN`, an unmatched inner side still produces a row whose inner columns are `NULL`. A derived table or `UNION` branch may materialize an intermediate result, but modern optimizers can merge some derived tables; syntax alone is not enough to predict the work.

Join order is often a major decision. In the book's example, starting with 200 actors and probing indexes into two other tables takes about 200 lookups; starting with 951 films takes about 951. The optimizer may therefore reorder tables from the SQL text. With many tables, possible orders grow quickly; the optimizer uses heuristics to bound planning time, so it can still choose poorly. `STRAIGHT_JOIN` or another hint can pin a choice, but that choice may become worse as data and versions change.

MySQL 8.4 also has hash joins for suitable equality joins, alongside nested-loop strategies. A hash join builds a hash table from one side and probes it with rows from the other; it can help when no suitable index exists, but it consumes memory and may not fit a particular workload. Check the strategy in `EXPLAIN` or `EXPLAIN ANALYZE`; do not infer it from the word `JOIN`. The [MySQL 8.4 hash-join manual](https://dev.mysql.com/doc/refman/8.4/en/hash-joins.html) describes when it applies and how to verify the plan.

## Sorting, the executor, and names that mislead

If an index cannot provide the required order, MySQL uses filesort. The name identifies an algorithm; it does not prove that the server writes a file to disk. The book describes older paths that sort row pointers and keys before rereading rows, or keep result columns in the sort buffer. This trades rereads for memory. Algorithms and configuration variables change between releases; the durable lesson is that sorting more rows, or keeping wider rows, costs more. Inspect `Using filesort` together with row counts, buffers, and runtime; it does not automatically mean “disk sort.” With an `ORDER BY` across multiple tables or after a join, sorting may happen only after an intermediate result is built.

The execution engine follows an operator/iterator tree and calls handlers for storage-engine operations. It can read a range, request the next row, apply a filter, stop early, or use different join strategies. A table referenced multiple times can have multiple handler contexts. Distinguishing the server layer from the storage engine helps explain why identical SQL can have different costs across engines: the read/write interface is shared, while page layout, indexes, and locking underneath it differ.

## Keep historical behavior labeled

The query cache is a clear example of version-dependent knowledge. The book explains caching an entire result by query text and invalidating it when related data changes. This is useful historical context for older servers, but MySQL removed the query cache in 8.0. Therefore, `SQL_CACHE` and `SQL_NO_CACHE` in the book are not ways to speed up current MySQL. See the [history of removed features](https://dev.mysql.com/doc/refman/8.0/en/added-deprecated-removed.html).

Likewise, `DEPENDENT SUBQUERY` labels, the claim that UNION always materializes, join limitations, and filesort details describe an older optimizer. Newer MySQL can transform `IN` and `EXISTS` into semijoins or antijoins, then choose materialization or another strategy based on conditions and cost. Keep the lesson about loop counts and intermediate rows, but inspect the actual plan for the version in use. See [MySQL 8.4 semijoin and antijoin transformations](https://dev.mysql.com/doc/refman/8.4/en/semijoins-antijoins.html).

## Check your understanding

**Does ordinary `EXPLAIN` usually run the query to measure actual results?** No. `EXPLAIN ANALYZE` executes the statement to observe iterators, so check its impact before using it.

**Is an inner lookup returning three rows cheap?** Maybe, but multiply by loops; three rows repeated tens of thousands of times is still substantial work.

**If an optimizer estimate is wrong, should you add a hint immediately?** Not yet. Check skew, keys/collations, statistics, and the actual plan; use a hint only after proving a choice is wrong and establishing how it will be reviewed.

Reading: *High Performance MySQL*, chapter 6; [MySQL 8.4 EXPLAIN](https://dev.mysql.com/doc/refman/8.4/en/explain.html) and [Performance Schema](https://dev.mysql.com/doc/refman/8.4/en/performance-schema.html).
