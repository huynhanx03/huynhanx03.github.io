---
title: "How a Database Plans and Runs a Query"
category: "Database"
description: "Follow a query from SQL text to an execution plan, then learn how statistics, access paths, joins, and sorts make the same statement fast or slow."
updated: 2026-10-17
translationKey: "database/query-processing-and-planning"
---

Two SQL statements can return the same result using different methods. To join `orders` with `customers`, a database might scan each order and look up its customer through an index, build an in-memory hash table, or sort both inputs and merge them. The optimizer must select a plan using estimates; understanding that choice helps us find causes instead of changing queries by intuition.

## From SQL text to an execution plan

A query commonly passes through these conceptual stages:

1. **Parse**: validate syntax and build a representation of the statement.
2. **Transform/bind**: resolve tables, columns, types, functions, privileges, and names into known references.
3. **Rewrite**: apply rules such as view expansion or equivalent transformations.
4. **Plan**: generate feasible scans, joins, sorts, and aggregates, then estimate their costs.
5. **Execute**: run the plan, fetch pages from cache or storage, combine rows, and return results through a protocol.

Boundaries and names differ by product. A prepared statement may be parsed and planned at different times; some databases choose a custom plan for a parameter while others reuse a generic plan. The first execution plan therefore may not represent every input value.

## The optimizer estimates cost; it does not measure elapsed time

The optimizer compares plans using estimates of row counts, CPU work, page access, sorting, network, or memory. These values are usually relative cost units for choosing a plan, not guaranteed milliseconds.

To estimate row counts, a database needs statistics: distinct-value counts, frequent values, histograms, `NULL` fractions, average column widths, correlation between physical order and values, or dependencies across columns. `ANALYZE` or automatic statistics updates some of this information. Sampled statistics may miss skew or cross-column correlation.

Suppose `status='pending'` matches 1% of a table, but most recent orders are also pending. Estimating each condition independently may badly predict the rows matching both at once. PostgreSQL has extended statistics for some multicolumn relationships; other engines collect and use statistics differently. Large estimation errors can lead the optimizer to choose the wrong join or access path.

## Access paths: scan the table or follow an index?

A **sequential scan** reads most table pages in storage order. If a query needs most rows, one sequential pass can be cheaper than using an index and jumping to many scattered pages.

An **index scan** finds matching keys through an index and fetches their rows. It is more useful when a predicate selects few rows, the index has the right order, and heap/table access remains reasonable. An **index-only scan** may return data from the index if it contains the required columns and the engine can verify visibility without visiting the heap. A **bitmap scan** can collect row locations from one or more indexes and then read heap pages in groups to reduce scattered access.

A parallel scan divides pages among workers, but coordination has a cost and helps only when the query is large enough, workers are available, and the rest of the plan permits parallel work. Particular functions, locks, protocols, or operations may restrict parallelism.

## Joins: nested loop, hash, or merge?

With a **nested-loop join**, the database takes each outer row and searches for a matching inner row. This works well when the outer input is small and the inner side has a suitable index. If the outer input is large and each iteration rescans the inner side, the cost can explode. A small cache such as memoization can help when many outer rows repeat the same join key.

With a **hash join**, the database builds a hash table from one side and probes it with rows from the other. When the hash table fits its memory grant, a one-pass join is straightforward. If it does not fit, the engine may partition the data and spill temporary files; multiple passes or large spills slow the query and create temporary I/O.

With a **merge join**, both inputs are ordered by the join key and scanned together. If an index or earlier step already provides the required order, the join can avoid sorting; otherwise, sorting may be a major cost. Merge joins are useful for large inputs with compatible ordering.

There is no universally best join algorithm. Cardinality, skew, memory, indexes, input order, and spilling all influence the choice. Forcing a join with a hint may hide a statistics problem today and hurt when the data changes.

## Sorts, aggregates, and memory limits

A small sort may use an in-memory quicksort; `ORDER BY ... LIMIT n` may keep only the top-N elements in a heap instead of sorting all rows. If input exceeds memory, the engine writes sorted runs to temporary files and merges them—an external sort. Incremental sort uses an already ordered prefix to sort only the remaining groups.

`GROUP BY` and `DISTINCT` may use a hash aggregate or sort and group. A hash aggregate needs memory proportional to the number of groups; sorting needs memory proportional to its input and may spill. Even a query that “only counts” may read many pages if it lacks suitable metadata or an index.

A memory grant is not an unlimited resource reserved for one query. Too little can cause spills; too much across concurrent queries can pressure RAM. Inspect the execution plan together with actual rows, loops, buffers, and temporary I/O for the specific database.

## Read plans by comparing estimates with actuals

When investigating a slow query:

1. Record the query, parameters, transaction context, and measurement time.
2. Get the database's plan; when possible, compare estimated rows with actual rows.
3. Find the first node where estimates diverge significantly: errors often start there and propagate to higher joins and sorts.
4. Inspect page/buffer counts, loops, waits, spills, locks, and I/O; do not look only at total time.
5. Change one factor, measure again on a representative workload, and keep the change only when evidence supports it.

PostgreSQL explains `EXPLAIN` and `EXPLAIN ANALYZE` in [Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html). MySQL's [`EXPLAIN`](https://dev.mysql.com/doc/refman/8.4/en/explain.html) offers formats and extra details that depend on version. PostgreSQL `EXPLAIN ANALYZE` actually executes the statement; understand the effects before using it on writes or functions with side effects.

## A slow query does not automatically mean a bad optimizer

An optimizer may choose a reasonable plan from its statistics while the query remains slow because the application requests too many rows, fetches unnecessary columns, sends too many round trips, holds transactions too long, lacks a useful index, runs on saturated storage, or waits on locks. A query plan is part of a diagnosis, not the whole system.

A sound measurement uses a production-like workload, states whether the cache is warm or cold, uses representative data and concurrency, and reports latency distribution. Do not draw broad conclusions by comparing one small run with a long benchmark.

## Check your understanding

**Why can a sequential scan be faster than an index scan?** Reading a large region sequentially may cost less than jumping to many scattered pages when most rows must be returned.

**What might an estimate thousands of times lower than actual rows suggest?** Statistics may be stale, data may be skewed, correlation may be unmodeled, or a particular parameter may make the estimate wrong. Find the earliest divergence.

**Should you add an index as soon as you see a full table scan?** Not yet. If the query needs most of the table, a full scan may be correct. Consider selectivity, page access, write workload, and the actual plan.

Reading: *High Performance MySQL*, chapter 6; *PostgreSQL 14 Internals*, Part IV; PostgreSQL and MySQL `EXPLAIN` documentation.
