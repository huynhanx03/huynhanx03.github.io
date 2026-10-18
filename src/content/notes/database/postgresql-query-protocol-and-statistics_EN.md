---
title: "PostgreSQL Query Protocol and Planner Statistics"
category: "Database"
description: "Trace simple/extended protocol, parse-bind-execute, plan caching, and cardinality estimates."
updated: 2026-10-17
translationKey: "database/postgresql-query-protocol-and-statistics"
---

Before PostgreSQL can choose how to read data, a query passes through the client's protocol. The planner then uses statistics to estimate row counts and the cost of each path. The topics meet when a prepared statement runs with different parameters: the protocol can retain a statement, while plan quality still depends on the planner's estimate of the data.

## Chapter 16: from client protocol to execution

### Simple Query and Extended Query protocols

Simple Query sends SQL text in a `Query` message; one message can contain multiple SQL statements separated by semicolons. Extended Query separates `Parse`, `Bind`, `Describe`, `Execute`, and `Sync`. `Parse` prepares a statement; `Bind` attaches parameter values to a portal; `Describe` requests metadata; `Execute` runs the portal; and `Sync` marks a protocol synchronization boundary. A driver can pipeline the steps to reduce network round trips, while parameter binding keeps values separate from SQL text.

A prepared statement stores state in a session/backend. If a connection pool uses transaction pooling and sends the next transaction to a different backend, the statement or portal may not exist there unless the pooler supports the relevant mechanism. Check the protocol together with the pool topology instead of assuming that “prepared” means every connection shares the statement.


The extended protocol keeps the parsed tree in the backend after `Parse`; this is a per-session/backend cache, not a cluster-wide cache. Another backend must parse its own copy, but backends do not contend for one global query cache. `pg_prepared_statements` shows statements in the current session; unnamed statements created by a driver/protocol are not necessarily listed as named statements. A pool that moves a transaction to another backend may find that the statement or portal does not exist there.

Parameter binding separates values from SQL structure: the parse tree already says `$1` is a parameter, so user input cannot become new SQL syntax as it can when literals are concatenated. But a parameter substitutes a **value**; it cannot stand in for a table/column name, keyword, or sort direction. For dynamic identifiers, use an allowlist and correct identifier quoting rather than assuming a bind parameter can protect every SQL fragment.

The extended protocol also lets a client retrieve results in batches through a portal. Small batches reduce client memory but add round trips; large batches use the network more efficiently but retain more data/buffers. SQL cursors provide a similar idea but require transaction/portal management; the plan may favor the first `cursor_tuple_fraction` rows, unlike a plan optimized to consume the full result.

### Generic plans and custom plans

A custom plan is calculated for specific parameter values; a generic plan is reused without optimizing for each value. Suppose `status='rare'` matches two rows while `status='active'` matches 40% of the table. An index path may fit the first case and perform poorly for the second; one generic plan cannot specialize perfectly for both. PostgreSQL can compare the estimated costs of generic and custom planning. When measuring, compare representative parameter values, inspect the actual plans, and separate parse/plan time from execution. A prepared statement may avoid repeated preparation in some situations; it does not guarantee a faster query.


In PostgreSQL 14, the server normally tries custom plans for the first five executions of a parameterized prepared statement. It then compares the estimated average cost of custom plans with a generic plan; if the generic plan is estimated to be cheaper after accounting for repeated planning, the server may reuse it. This is an estimate-based heuristic, not a measurement of actual runtime that predicts every future value. A skewed parameter can make a generic plan good for a common value but poor for a rare one, or the reverse. Inspect `pg_prepared_statements.generic_plans`/`custom_plans`, use representative values with `EXPLAIN EXECUTE`, and use PostgreSQL 14's `plan_cache_mode` to force `force_custom_plan` or `force_generic_plan` when diagnosing.

For example, the same predicate `total_amount > ...` may match only a few bookings at a high threshold, making bitmap/index access attractive; a low threshold may match nearly the whole table, where a sequential scan is usually better. One prepared statement with both parameter values must balance planning reuse against parameter sensitivity. Benchmark with production-like value distributions and concurrency; do not choose custom/generic based on one execution.

## Chapter 17: how the planner builds cardinality estimates

### Relation statistics and ANALYZE freshness

`pg_class` stores relation-scale estimates such as `reltuples`, `relpages`, and `relallvisible`; the planner uses these for costing, but they are not exact counters for every query. `relallvisible` estimates pages marked all-visible in the visibility map, which helps the planner cost whether an index-only scan can avoid heap reads. These values are not updated for every row; `ANALYZE`, `VACUUM`, and some DDL commands update them, sometimes from a sample and then scaled to the current physical size. `ANALYZE` samples data to build column statistics, and autovacuum can trigger analyze as well. After a bulk load or a major distribution change, stale statistics can mislead the planner. A new table that has not been analyzed may lack a reliable estimate; the book illustrates this state with `reltuples = -1`, which differs from a table known to be empty.


### How ANALYZE samples, and why reltuples can be stale

PostgreSQL does not count every row in a large table each time `ANALYZE` runs. In PostgreSQL 14, the target sample size is proportional to `300 × default_statistics_target`; the sampler selects random pages and samples rows from them. A small table therefore reads fewer pages, while a large table still uses a bounded sample rather than a full scan. Raising a target for a column can improve MCV/histogram detail, but increases sample scanning, processing, and catalog storage; it does not turn statistics into an exact count.

`reltuples`, `relpages`, and `relallvisible` are relation-level estimates. `ANALYZE` and `VACUUM` refine them; some operations such as bulk loads or rewrites can also refresh or help PostgreSQL infer relation size. If a table has never been analyzed, `reltuples = -1` means no trustworthy estimate is available, not “the table is empty”; the planner must use rough assumptions based on pages/row width. After deletes or distribution changes, estimates can drift until the next analysis. Verify with actual row counts/plans when the gap could change a decision instead of treating catalog estimates as live counters.

MCVs also have a practical size limit: the book notes that PostgreSQL 14 excludes some values larger than roughly 1 kB from statistics to keep catalog size and planning work bounded. Large/unique values are often poor candidates for a most-common list anyway; for specialized data types, check their statistics/operator class and release rather than assuming every value can appear in an MCV list.

### NULLs, distinct values, MCVs, and histograms

Column statistics in `pg_stats` commonly include `null_frac`, `n_distinct`, `most_common_vals`, `most_common_freqs`, and a histogram for the remaining values. They answer different questions. If a table has 10,000 rows and `null_frac = 0.05`, an `IS NULL` condition starts with an estimate of about 500 rows. Positive `n_distinct` is an estimated number of distinct values; a negative value represents the fraction of rows that are distinct. For example, `-1` means the distinct count is about the row count, as with a nearly unique column. If a column has about 100 distinct values and there is no better information, equality with a value not listed may be estimated roughly uniformly over the remainder. But if one value appears much more often, the MCV list records that value and its frequency so the planner does not apply the uniform assumption where it fails. A histogram divides the remaining distribution—excluding MCVs—into ranges with approximately equal populations for estimating range predicates; it does not replace MCVs for prominent skew.

This is still a model built from a sample. `default_statistics_target` and per-column targets affect the amount and detail collected; raising a target can help a skewed column but costs analyze time and catalog space. Adjust columns with evidence of estimation errors rather than raising targets everywhere by instinct.

### Data types, average width, and correlation

Some non-scalar types have statistics suited to their operators. For arrays, `pg_stats` can hold `most_common_elems`, the frequency of rows containing each element, and a histogram of distinct element counts per array; these differ from statistics about whole-array values. Such statistics matter only for operators and operator classes the planner knows how to estimate. `avg_width` estimates the average value size in bytes and affects estimated intermediate tuple sizes, sorts, and data sent through a plan. A poor width estimate can distort memory and cost calculations even when row counts are close.

`correlation` in `pg_stats` describes how closely a column's value order matches the table's physical row order. It does not measure a relationship between two columns. If matching rows are near one another in the heap, an index scan may read fewer scattered pages; if they are spread across the table, heap fetches can require more I/O. Correlation therefore mainly affects access-path cost; it does not by itself predict how many rows a predicate matches.

### Expression statistics and expression indexes

Statistics for `email` do not automatically describe the distribution of `lower(email)` or `extract(month FROM timestamp)`. PostgreSQL 14 can collect expression statistics with `CREATE STATISTICS ... ON (expression) ...` followed by `ANALYZE`; expression indexes also have statistics for their indexed expression. These help estimates when a query uses the corresponding expression, but statistics only help the planner predict—they do not create an index or a new access path. For faster lookup, an appropriate access path is needed; for better estimates, the planner needs statistics it can use.

For example, to let the planner learn the distribution of months extracted from a timestamp:

```sql
CREATE STATISTICS events_month_stats
    ON (extract(month FROM occurred_at))
    FROM events;
ANALYZE events;
```

### Multivariate statistics: dependencies, ndistinct, and MCVs

When a query filters on several columns, the planner often needs to avoid assuming all conditions are independent. If `country='VN'` almost always accompanies `currency='VND'`, multiplying separate selectivities can underestimate the row count. `CREATE STATISTICS` supports three useful forms: `dependencies` describe functional dependencies; `ndistinct` estimates the number of distinct combinations, useful for grouping/distinct; and multivariate MCVs record common value combinations to model specific skew. In PostgreSQL 14 they are collected from a sample when `ANALYZE` runs; creating a statistics object only declares which statistics to collect. Choose groups of columns for a reason rather than every possible combination. These are statistics, not constraints: they do not guarantee that data follows the relationship. In PostgreSQL 14, extended statistics are not used for join selectivity estimates between tables; functional dependencies also apply only to certain equality conditions against constants/`IN`, not automatically to range predicates or every expression.

```sql
CREATE STATISTICS orders_geo_stats (dependencies, mcv)
    ON country, currency
    FROM orders;
ANALYZE orders;
```

In the book's `flights` example, `flight_no='PG0007' AND departure_airport='VKO'` returns 396 actual rows, but the initial estimate is only 15 because of the independence assumption. After extended statistics are created and collected, the estimate rises to 277—closer, but still not exact. The lesson is that statistics can correct a systematically wrong assumption; estimated and actual rows still need to be compared on the real workload.

## Find where the estimate first goes wrong

In `EXPLAIN ANALYZE`, compare estimated `rows` with `actual rows` at each node. For a node that runs repeatedly, multiply actual rows by `loops` to understand total work. Find the first node with a large discrepancy; its error can propagate through joins and lead the planner to choose another join order or algorithm. Check when `ANALYZE` last ran, skew, MCVs/histograms, column correlation, expressions, parameters, and targets before trying to force a plan.

`EXPLAIN ANALYZE` executes the statement. An `UPDATE` or `DELETE` really changes data; rolling back a transaction protects PostgreSQL changes but may not undo external side effects from a function or trigger. Use a data copy or another appropriate safe inspection method.

Versioned sources: *PostgreSQL Internals 14*, Part IV, chapters 16–17. PostgreSQL 14 docs: [protocol](https://www.postgresql.org/docs/14/protocol.html), [planner statistics](https://www.postgresql.org/docs/14/planner-stats.html), [`pg_stats` columns](https://www.postgresql.org/docs/14/view-pg-stats.html), [CREATE STATISTICS](https://www.postgresql.org/docs/14/sql-createstatistics.html), and [PREPARE](https://www.postgresql.org/docs/14/sql-prepare.html).

## Check your understanding

**Does a prepared statement always replan for each parameter?** No; generic/custom plan behavior depends on server and workload.

**Can a histogram replace MCV statistics for skewed data?** No; they describe different distribution properties.

**Do extended statistics directly make a query faster?** They improve estimates; the planner may then choose a better plan.
