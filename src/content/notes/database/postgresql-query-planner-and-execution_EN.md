---
title: "The PostgreSQL Planner and Executor"
category: "Database"
description: "Read a query's path through parsing, planning, scans, joins, sorting, and parallel execution."
updated: 2026-10-17
translationKey: "database/postgresql-query-planner-and-execution"
---

Two SQL statements that return the same result can take very different time because PostgreSQL chooses an **execution plan** from statistics and estimated costs. The planner does not reward elegant syntax; it estimates rows, page I/O, CPU, and parallel work, then chooses among alternatives. When a query is slow, the actual plan lets us test which assumption was wrong.

## From SQL to a plan

The parser checks syntax; analysis resolves tables, columns, and types; rewrite handles views and rules; the planner builds scan, join, sort, and aggregate alternatives; the executor runs plan nodes. A prepared statement can use a custom plan based on bound values or a generic shared plan; parameter-sensitive workloads can make one plan unsuitable for every value.

`EXPLAIN` shows estimates. `EXPLAIN (ANALYZE, BUFFERS)` runs the query and reports actual timing, rows, and buffer activity; because it executes writes too, use a rollback transaction or a test environment for mutations. `ANALYZE` in this option means execution and measurement, unlike the `ANALYZE` command that updates statistics.

## Scans and statistics

A sequential scan reads the heap; an index scan navigates the index to tuples; a bitmap scan collects heap addresses and reads pages in groups. An index is not always faster: retrieving many scattered rows can cost more than a sequential pass. The visibility map can let an index-only scan avoid heap fetches when pages qualify.

The planner relies on `ANALYZE` statistics: histograms, most-common values, null fractions, distinct estimates, and correlation. Large gaps between estimated and actual rows can distort join order and memory choices. Extended statistics can help when multiple columns are correlated. After skew changes or a bulk load, refresh statistics and compare again.

## Joins, sorts, and memory

Nested loop works well when the outer input is small and the inner side has an index; hash join builds a hash table for one side and probes it with the other; merge join benefits from sorted inputs. The planner chooses based on estimated sizes and costs. Wrong cardinality estimates can cause a nested loop to repeat millions of times or a hash table to spill to disk.

Sort/hash nodes use `work_mem` per operation/node and per worker; it is not a total server cap. Setting it too high across many connections and parallel workers can cause OOM. Inspect `Sort Method`, disk spills, hash batches, and temp files before raising it. Parallel plans may shorten one query while consuming more workers/CPU, and do not suit every node or workload.

## A way to read EXPLAIN

Read from child nodes upward: `actual rows × loops` approximates repeated work. Compare estimated and actual rows at the earliest node with a large gap; it often drives poor choices above it. Inspect buffer hits/reads, heap fetches, rechecks, temp I/O, and startup/total time. Do not read cost as milliseconds: it is an internal relative unit.

For example, if a filter returns 20 rows but the planner expects 20,000, check statistics, casts, expressions, and skew before forcing an index. If the actual scan reads most of a table, a sequential scan may be correct even when an index exists.

*PostgreSQL Internals 14*, Part IV, covers the planner, executor, and access methods. See [using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html), [planner statistics](https://www.postgresql.org/docs/current/planner-stats.html), and [runtime query configuration](https://www.postgresql.org/docs/current/runtime-config-query.html).


## Read Chapter 16 in depth: a plan is a pipeline with tradeoffs

### A parse tree is not an execution plan

SQL describes the result to return, not the exact steps for reading data. After lexical/syntax parsing, PostgreSQL has an abstract syntax tree; semantic analysis resolves table/column names, types, and permissions. The rewrite stage expands views into their underlying queries, handles rules, and applies transformations such as row-level security. Only then does the planner create a plan tree with nodes such as `Seq Scan`, `Index Scan`, `Nested Loop`, and `Sort`.

A `Range Table Entry` (RTE) in source code does not mean only a physical table: it can represent a table, subquery, or join result—a row source consumed by operators above it. Thus the original syntax tree and plan tree are not the same structure. A view can disappear from the plan and be replaced by its base relations; the planner may change join order or algorithm while preserving the query's logical result.

### The planner cannot try every plan

For each pair of row sources, the planner can consider nested-loop, hash, or merge join; with many tables, it must also consider join order. The number of combinations grows quickly, so PostgreSQL does not enumerate every plan. Dynamic programming plus search heuristics finds candidates within a practical time; when the number of relations passes `geqo_threshold`, PostgreSQL may use GEQO, a faster genetic search that does not guarantee a globally optimal plan. These are search limits in the book/version, not a promise that the optimal plan has been found.

`join_collapse_limit` controls flattening of join structure written in SQL; setting it to 1 can preserve explicit join order and narrow the search. `from_collapse_limit` controls subquery flattening similarly. A CTE may be optimized with the surrounding query or create a boundary depending on version and `MATERIALIZED`/`NOT MATERIALIZED`; SQL functions can be inlined under some conditions. Forcing join order can help when estimates are wrong, but may also hide a better plan when data changes. Tune only after `EXPLAIN (ANALYZE)` shows the problem.

### Startup cost and total cost answer different questions

A plan may do substantial work before returning its first row (a sort may need nearly all its input), then return the rest quickly. Another plan may have low startup cost but a higher total cost. If the client needs all rows, the planner generally optimizes total cost. For a cursor, it considers returning an early fraction through `cursor_tuple_fraction`; PostgreSQL 14 defaults it to 0.1. The choice uses `startup_cost + fraction × (total_cost - startup_cost)`, so a plan optimized for “first row quickly” can differ from one optimized for “finish the whole result quickly.” Startup cost is not simply the observed time for the first row; it estimates prerequisite work before a node can emit output.

### Cost starts with cardinality and selectivity

For each node, the planner estimates input rows and multiplies by predicate selectivity to estimate output rows. Leaf scans use relation size and column statistics; combined predicates may assume independence when extended statistics are absent. Join estimates use the cardinalities of both inputs and join selectivity. An early error propagates upward: the planner may choose a nested loop for a much larger outer input than expected or underestimate hash/sort memory.

Subtree cost is computed recursively: child costs plus the node's own cost based on estimated rows/pages, operation type, and cost parameters. `startup_cost` and `total_cost` are internal relative units, not milliseconds. A sort often has high startup cost because it must consume and order input before returning output; a nested loop may return a row early but repeat its inner operation many times. Read `rows`, `width`, `loops`, and buffer I/O together to see which assumption dominates.

### The executor pulls rows upward

A plan tree commonly operates as a demand/pull pipeline. The root asks a child for a row; that child may ask lower nodes in turn. A scan produces tuples, a filter keeps or drops them, a join reads from both sides, then the parent continues. A `Sort` generally must consume its input before producing output; a `Nested Loop` can produce a result as soon as it finds a matching pair. So execution does not simply proceed “top to bottom” like a directory tree: the root requests work, while rows flow from leaves back toward the root. `EXPLAIN ANALYZE` measures nodes in this model, and `loops` tells how many times a node was called.

## Check your understanding

**Does a cost of 100 mean the query takes 100 ms?** No. Cost is a relative measure used to compare plans.

**Must the planner use an index whenever one exists?** No. A sequential scan can be cheaper when many rows are needed.

**Does `work_mem = 64MB` cap the entire server at 64MB?** No. It applies per operation and can multiply across nodes, workers, queries, and connections.
