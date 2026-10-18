---
title: "PostgreSQL Scans, Joins, Hashing, and Sorting"
category: "Database"
description: "Learn how PostgreSQL reads tables/indexes, picks join algorithms, spills hash/sort work, and uses parallel workers."
updated: 2026-10-18
translationKey: "database/postgresql-scans-joins-and-sorting"
---

An execution plan is an operator tree; each node consumes rows from children and produces rows for its parent. Understanding node algorithms makes plans readable instead of a list of names to memorize. Plan choice depends on cardinality estimates, page locality, memory budget, and startup versus total cost.

## Table and index scans

A sequential scan reads heap pages in physical order; it fits when most of the table is needed or random index fetches are too expensive. A parallel sequential scan divides block ranges among workers; startup/coordination costs make it poor for tiny queries. Worker count, table size, parallel-safe functions, and transaction restrictions limit parallelism.

An index scan follows keys to heap TIDs for tuples. If matches are near each other on disk (high correlation), heap I/O is better; if scattered, random fetches are costly. An index-only scan gets columns from the index but needs the visibility map to confirm all-visible pages; otherwise it fetches the heap. A bitmap scan collects TIDs and sorts by heap block to reduce random I/O, though the bitmap can be lossy and require predicate rechecks.

## Nested loops and memoize

A nested loop runs outer rows and looks for matching inner rows. It fits a small outer input and an indexed inner side; if the outer estimate is low but actual rows are high, `loops` explodes. A parameterized inner scan uses an outer row's values. `Memoize` caches inner results for repeated parameters; hits/misses/eviction depend on distinct parameters and memory.

A semi join needs only a match; an anti join needs no match; an outer join retains unmatched rows. Non-equi joins (such as time ranges) have fewer access paths than equality. A Cartesian product from a missing join predicate can create N×M rows.

## Hash joins

A hash join builds a hash table from one side by join key and probes it with the other. If it fits memory, a one-pass plan is efficient; if it exceeds `work_mem`, PostgreSQL batches and writes partitions to temporary files (multi-pass). `EXPLAIN ANALYZE` reports batches/temp reads/writes; raising global `work_mem` can multiply across operations/workers/queries, so budget it.

Parallel hash joins share a hash table through coordination; memory and key skew matter. A popular key creates a hot bucket; a build side larger than estimated can spill heavily.

## Sorts, merge, and grouping

In-memory quicksort sorts everything; top-N heapsort retains the best K rows for `LIMIT K`; external merge sort writes runs to disk and merges them; incremental sort uses an existing ordered prefix. Merge join reads two sorted inputs by join key in tandem; spilling the required sort can erase its benefit.

`GROUP BY`/`DISTINCT` may use hash aggregate or sort/group. Hash aggregate needs memory by group cardinality; spilling support depends on version/plan. `ORDER BY ... LIMIT` can stop early when an index supplies order; otherwise it may need to process/sort many candidates first.

## Read EXPLAIN as a story

Read leaf-to-root; record estimated/actual rows, loops, buffers, temp I/O, sort method, hash batches, and workers. A parent sees rows filtered by a child, so an early error propagates up the plan. Do not pick an index just from the node name; required result count and physical locality decide.

*PostgreSQL Internals 14*, Part IV, covers scans, nested loops, hash joins, parallel plans, sort/top-N/external/incremental, and merge. See [parallel query](https://www.postgresql.org/docs/current/parallel-query.html), [using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html), and [planner cost constants](https://www.postgresql.org/docs/current/runtime-config-query.html).


## Chapters 18 and 20–23: why a plan chooses a path

### Table access methods and parallel scans

PostgreSQL separates table access methods from the executor to support different relation storage implementations; heap is the default. A sequential scan is not simply a “bad plan”: if a query needs a large fraction of rows, reading pages sequentially and filtering in the executor is often cheaper than following an index and jumping through the heap. A parallel sequential scan divides block ranges among workers; the leader may coordinate and process some work too. Available workers are limited by configuration, CPU, transaction context, function parallel-safety, relation/plan shape, and workers used across the cluster.

`Gather` collects tuples from workers; `Gather Merge` preserves order when each worker emits a sorted stream. Parallel plans add startup, coordination, and tuple-transfer cost, so a small table or query with much serial work may be slower. A non-parallel-safe node can block parallelism above it; compare `Workers Planned` with `Workers Launched` instead of assuming all planned workers start.

### Index, index-only, and bitmap scans

An index scan gets TIDs in index order and visits the heap; high correlation between index key and heap position makes I/O close to sequential, while low correlation can mean many random page visits. An index-only scan can skip heap fetches only when the index contains every needed column and the visibility map marks the page all-visible; if the VM is not current enough, the plan still checks the heap. `INCLUDE` increases leaf payload and may enlarge the index.

A bitmap scan collects TIDs from one or more indexes, combines bitmap AND/OR operations, then reads heap pages by location to reduce random I/O. A bitmap can become lossy under memory pressure: it records “this page might match” instead of individual tuples, so the executor rechecks the predicate against the heap. `Rows Removed by Index Recheck` can therefore be normal for a lossy bitmap, not necessarily a bad index. A bitmap loses B-tree order; a separate sort is needed if the query requires ordering.

### Nested loops and Memoize

A nested loop runs its inner plan for every outer row. It fits a small outer input or cheap parameterized index lookups; an incorrect outer row estimate can multiply inner executions dramatically. Memoize caches inner results by parameter key: repeated outer keys can reuse the result instead of rerunning the index/scan. It has an eviction/budget and helps only when keys repeat; inspect hits/misses/evictions in EXPLAIN ANALYZE. A semi join stops after its first match; an anti join looks for no match; an outer join must preserve nonmatching rows with NULLs, limiting how freely the optimizer can reorder it like an inner join.

### Hash joins: memory, batching, and parallelism

A hash join builds a hash table from the build side and probes it with the other side. If it fits within `work_mem × hash_mem_multiplier`, one pass avoids spill; otherwise, rows are partitioned into batches and written to temporary files for multiple passes. More batches add I/O; skew can make one batch large even when the overall estimate is reasonable. PostgreSQL may adjust batch count at runtime. In parallel hash joins, workers coordinate a shared hash table or batch partitions according to the plan; account for total memory/workers and contention.

`EXPLAIN (ANALYZE, BUFFERS)` shows hash batches, memory use, and temp reads/writes; exact details vary by release. Do not raise server-wide `work_mem` to fix one hash node: the setting can multiply by operations × workers × concurrent queries.

### Merge joins, sorts, and grouping

A merge join needs both inputs ordered by the join key; it advances through the sorted streams and processes groups of duplicate keys. Index order can avoid sorting, while a separate sort may be worthwhile if many rows are read anyway. An in-memory sort uses quicksort; `ORDER BY ... LIMIT N` may use top-N heapsort; larger data produces sorted runs on disk and merges them. Incremental sort uses an existing order prefix and sorts groups instead of the whole relation. Parallel sort divides work but still needs result merging.

Hash aggregation keeps group state in memory and may spill/batch; sort aggregation consumes ordered input and groups adjacent values. `DISTINCT`, `GROUP BY`, merge joins, and `ORDER BY` all benefit from order, but the plan balances row counts, sort cost, and memory. For a slow query, read upward from the scan: estimated/actual rows, loops, buffers, heap fetches, rechecks, temp I/O, and worker counts. The book emphasizes comparing alternatives on representative workloads; forcing `enable_*` is an experiment for understanding cost.

PostgreSQL 14 references: [parallel plans](https://www.postgresql.org/docs/14/parallel-query.html), [index scans](https://www.postgresql.org/docs/14/index-scanning.html), [using EXPLAIN](https://www.postgresql.org/docs/14/using-explain.html), and [resource configuration](https://www.postgresql.org/docs/14/runtime-config-resource.html).

## Read join cardinality, hash batching, and sorting in depth

### Where a join estimate starts

For an equality join, the planner must estimate how many values can match on both sides. One baseline in the book assumes a uniform distribution: selectivity is approximately `min(1 / nd1, 1 / nd2)`, where `nd1` and `nd2` are the estimated distinct-value counts for the two join columns. In plain terms, the side with fewer distinct values often limits the number of groups that can match; the planner then combines this with the sizes of both inputs to estimate joined rows. This is a model, not an exact count.

The uniformity assumption fails when join keys are skewed or the tables are correlated. A foreign key gives the planner information about some key relationships and can improve join estimates, especially for composite keys. MCVs can refine estimates for common values when statistics on both sides support it; a single-column histogram does not describe pairs of values across two tables. PostgreSQL 14 does not apply extended statistics to selectivity estimates for joins between relations, so do not expect `CREATE STATISTICS` to repair every join-estimation error.

In a nested-loop plan, inspect both `actual rows` and `loops` on the inner node. If the outer side has two rows and the inner side returns four rows per call, the inner node runs twice; do not read `actual rows=4 loops=2` as only four total rows processed. Underestimating the outer side can multiply index lookups and turn a plan that looks cheap on paper into expensive work at runtime.

### Hash joins: from one batch to spill

A hash join has an important startup boundary: before it can return its first row, PostgreSQL must read the build side and construct the hash table. The planner usually puts the smaller side in the hash table to reduce its footprint; selecting only needed columns can also make the table narrower. Thus `SELECT *` may increase both transferred data and build-side size.

If the hash table fits its budget, the plan shows `Batches: 1`: the Hash node reads the build side, computes hash keys, and keeps rows in memory; Hash Join then probes it with each row from the other side. If it does not fit `work_mem × hash_mem_multiplier`, rows are partitioned by hash into batches. Build rows for the active batch stay in memory, while other batches are written to temporary files; outer rows are partitioned too, so a row is compared only with the matching batch. More batches mean more temporary reads and writes.

With `EXPLAIN (ANALYZE, BUFFERS)`, compare `Batches` with `Batches: 1`, `Memory Usage`, and `temp read`/`temp written`. More than one batch does not by itself prove a query is bad; inspect runtime and I/O in the real workload. A batch count that grows beyond the estimate can indicate stale statistics, a bad estimate, or key skew. `log_temp_files` records temporary-file details; `temp_file_limit` caps the temporary-file space used by one backend process, and a query can be canceled when it reaches that limit. This setting is a resource guard, not a way to make a join stop spilling.

PostgreSQL can increase the batch count at runtime when the build hash table is larger than expected; in the PostgreSQL 14 implementation described by the book, the count grows by powers of two and is not reduced again during that execution. More batches may not fix skew: rows with the same hash value still land in the same batch. A hot batch can therefore exceed its intended budget. Before increasing `work_mem`, check estimated versus actual rows, MCV/skew for the join key, the width of retained rows, and temp I/O.

### Parallel Hash differs from a Hash Join under Gather

A regular Hash Join inside a parallel plan can make each worker build its own copy of the hash table, multiplying that memory by the number of participating processes. `Parallel Hash` coordinates construction of one shared hash table, with a budget that can combine the participating processes' allocations, avoiding a full duplicate table per worker. Workers still use extra CPU, memory, and synchronization; use `Workers Launched`, memory, and actual runtime rather than the word `Parallel` alone.

When a parallel hash fits memory, workers build the shared table and probe it with their assigned portions of outer rows. If it does not fit, the PostgreSQL 14 algorithm described in the book handles multiple batches differently: processes write partitions of both the build and probe sides to temporary storage first, then workers claim batches to build and join. This multi-phase path reduces contention around one enormous hash table but increases I/O. These details depend on implementation and version; inspect the plan and documentation for the server you run before inferring its exact memory budget.

### How soon can a sort return rows?

A sort normally must consume all input before it can return the complete ordered result. `ORDER BY ... LIMIT K` can use top-N heapsort: keep the best K candidates and update the heap as later rows arrive. This reduces the state it must retain, but it still examines every input row when no ordered access path is available. For `n` inputs, the work is roughly `O(n log K)`, not `O(K)`.

When the data does not fit in memory, external sort creates sorted runs in memory, writes them to temporary files, and merges them. Merging many runs can take multiple passes; each pass adds read/write volume. In `EXPLAIN (ANALYZE, BUFFERS)`, `Sort Method: external merge`, `Disk`, `temp read`, and `temp written` reveal this path. `log_temp_files` adds temporary-file sizes to the log. Spill bytes do not tell you exactly how far the sort exceeded `work_mem`: tuple width, number of runs, merge fan-in, and file handling all matter. `work_mem` also applies to multiple nodes and concurrent queries, so increasing it globally can multiply memory pressure with concurrency.

Incremental Sort uses a prefix that is already ordered. If an index returns `total_amount` in order and the query needs `(total_amount, book_date)`, the executor divides the stream into groups with the same `total_amount`, then sorts `book_date` within each group. It can return rows after sorting the first group rather than waiting for the entire relation; memory is often lower than for a full sort. `Presorted Key`, `Full-sort Groups`, and `Pre-sorted Groups` show which groups needed a full sort and which benefited from the prefix. Skew creates groups of different sizes; incremental sort is not free, and the planner still estimates the number of groups.

`Gather` collects rows in the order workers send them and does not preserve a global sort order. When parallel execution must also preserve `ORDER BY`, the plan uses `Gather Merge`: each worker emits a sorted stream and the leader merges their heads with a small heap. This has comparison and coordination costs. Use `ORDER BY` in SQL to guarantee result order; never rely on an incidental execution-plan order.

Source pages: *PostgreSQL Internals 14*, Part IV, pp. 408–409 (join estimates), 420–439 (hash joins, batching, parallel hash), and 443–460 (merge/sort/incremental sort/Gather Merge). See the PostgreSQL 14 documentation for [planner statistics](https://www.postgresql.org/docs/14/planner-stats.html), [parallel query](https://www.postgresql.org/docs/14/parallel-query.html), [EXPLAIN](https://www.postgresql.org/docs/14/using-explain.html), and [resource configuration](https://www.postgresql.org/docs/14/runtime-config-resource.html).


## Read Chapter 18 in depth: heap scans, cost, and parallel plans

### The table access method is an extension boundary

The executor need not know every detail of how a table stores rows: a table access method (table AM) provides scan/insert/update/delete/lock operations, tuple layout, and visibility rules. Components such as the buffer manager, I/O, optimizer/executor, and index interface remain available from PostgreSQL core; a table AM can use them differently. In PostgreSQL 14, `heap` is the built-in default table AM. The book mentions `zheap` as an experiment in in-place updates with separate undo storage to reduce bloat, and `zedstore` as a columnar idea for analytic workloads. These illustrate extensibility at the time of writing; they are not built-in production choices you can simply enable today.

### Sequential scans and the cost model

`Seq Scan` visits heap pages in physical order; synchronized scans can join a buffer ring already in use instead of always starting at block 0. A sequential scan often fits queries needing a large share of rows: it reads pages in order, benefits from prefetch/OS cache, and filters tuples in the executor. Low selectivity in the sense of “the predicate keeps few rows” often makes an index attractive; if many scattered rows are needed, index lookups plus heap fetches can cost more than a sequential scan.

The planner separates page-read cost from tuple processing. `seq_page_cost` is the baseline for sequential page reads; `random_page_cost` represents random page fetches; `cpu_tuple_cost`/`cpu_operator_cost` account for tuple and predicate work. These are relative cost units, not direct benchmarks. The right ratio depends on storage, cache hit rate, and workload; SSDs change the random-versus-sequential gap compared with HDDs, but setting costs too low can produce poor choices when the working set is not cached. Change costs only after measuring representative workloads and comparing plan with actual I/O.

A `Filter` in `EXPLAIN` shows a condition applied after the scan obtains tuples; `rows` is the estimated output, while `Rows Removed by Filter` in `EXPLAIN ANALYZE` counts actual exclusions. If many heap blocks are read to keep few rows, inspect the index/access path and estimate; if most of the table is needed, that count alone does not prove the sequential scan is wrong.

### Parallel scans divide blocks and combine results

PostgreSQL uses a leader plus parallel workers; workers execute the parallel portion of the plan and send tuples to `Gather`/`Gather Merge`. The leader may also participate when it is not busy receiving data. A parallel sequential scan divides block ranges among processes, while each process reads its own region sequentially. For aggregation, workers commonly produce `Partial Aggregate` results, `Gather` combines them, and `Finalize Aggregate` completes the operation—not every query sends all raw rows to the leader.

The benefit must exceed worker startup and tuple-transfer costs. `parallel_setup_cost` accounts for starting workers; `parallel_tuple_cost` accounts for sending rows to the leader. A small table or mostly serial work can therefore be slower when parallelized. In PG14, the planner considers a parallel table scan only when estimated bytes exceed `min_parallel_table_scan_size`; absent a relation-specific `parallel_workers`, the planned count grows logarithmically with table size relative to the threshold. `max_parallel_workers_per_gather` limits each Gather, while cluster-wide availability and busy workers can make `Workers Launched` lower than `Workers Planned`. Defaults/formulas are version details; inspect the plan and server settings.

### When does PostgreSQL avoid parallel execution?

A plan must be divisible and cannot depend on state private to a single backend. In PostgreSQL 14, parallel query is generally ruled out for writes, cursor/portal queries that need pause/resume, `PARALLEL UNSAFE` functions (the default for many user-defined functions), some subplans that depend on outer rows, or materialized CTE/scans that cannot be divided under the relevant conditions. Some commands such as `CREATE TABLE AS` may parallelize the SELECT while the row-writing step remains serial. Temporary tables use session-local buffers and therefore do not have parallel scans like shared relations. Check `proparallel`, the node creating a boundary, and `Workers Planned` versus `Workers Launched`; do not just raise worker counts when the plan is not parallel-safe.

## Read Chapter 20 in depth: what does an index scan actually cost?

### An index scan traverses both the index and the heap

An access method returns matching TIDs one at a time. The indexing engine uses each TID to read a heap page, checks tuple visibility under the snapshot, and then returns requested columns. Thus, `Index Cond` is a condition the index can narrow; `Filter` is still applied to heap tuples. A query that filters through an index but must fetch many heap pages can cost more than a sequential scan. If the application already knows a TID, `Tid Scan` goes directly to that heap tuple without an index.

Index-scan estimation includes reading/processing index pages and fetching heap tuples. The index portion depends on the method, size, and selectivity. The heap portion depends on rows fetched and the correlation between TID order returned by the index and physical heap order. With correlation near ±1, consecutive TIDs may live on nearby pages; near zero, a result stream can hop across many pages. The planner also estimates whether pages may be cached using `effective_cache_size`—this is a cost assumption, not a memory allocation. `random_page_cost`, `seq_page_cost`, CPU costs, and statistics must therefore reflect the workload relatively, not serve as absolute benchmark numbers.

High correlation does not guarantee query result order: UPDATE creates a new tuple version elsewhere, the planner may choose another path, and SQL ordering is guaranteed only with `ORDER BY`.

### Index-only does not mean the heap is never read

An index-only scan needs the index to contain every value the query requests and the access method to return them. But PostgreSQL indexes do not store visibility for every tuple. The executor consults the visibility map: an all-visible page can be answered from the index; otherwise it visits the heap to confirm visibility. `EXPLAIN (ANALYZE, BUFFERS)` reports `Heap Fetches`; a large count can explain why a plan named Index Only Scan still reads the heap. VACUUM can update the visibility map once a page qualifies, but new writes can clear the all-visible state.

### Bitmap scans trade TID order for locality

Bitmap Index Scan collects TIDs into an in-memory bitmap; Bitmap Heap Scan visits heap blocks in ascending block-number order, reading each page at most once during that pass. This can beat a regular index scan when many matching rows are scattered: it groups random fetches into a more orderly page traversal. In exchange, the bitmap has startup work and does not preserve index order; `ORDER BY` may require a separate Sort.

Bitmap AND/OR can combine several single-column indexes. An exact bitmap retains tuple TIDs. When it exceeds the `work_mem` budget for the bitmap, PostgreSQL may make some regions lossy: each bit represents a page rather than a tuple, so it rechecks the predicate on tuples from those pages. `Recheck Cond` can appear even for an exact bitmap; `Heap Blocks: exact/lossy` and `Rows Removed by Index Recheck` show what happened. Many rechecks do not necessarily mean a bad index; they may be the memory-for-I/O tradeoff. The PostgreSQL 14 book also notes that a very large bitmap is not compressed indefinitely or spilled to disk; its memory limit can be exceeded to retain the full result bitmap.

### Parallel index scans: which work is divided?

A parallel B-tree index scan divides leaf-page scanning among workers; parallel index-only scanning adds heap avoidance for all-visible pages. Parallel bitmap scanning differs: one process builds the index bitmap serially first, then `Parallel Bitmap Heap Scan` divides heap pages among workers. Therefore, the absence of the word `Parallel` on Bitmap Index Scan does not mean the entire bitmap plan is serial.

Tuple CPU work can be divided in a parallel plan, but page I/O does not fall by the same factor because workers coordinate page access. Compare `Workers Planned` with `Workers Launched`, partial/final aggregation, buffers, and elapsed time. More workers do not imply a faster query.

### Scan choice is a curve, not a ranking

Very low selectivity often favors an index scan; fetching many rows with low correlation makes random heap access expensive, so a sequential scan can win. Bitmap scans occupy a middle region when many TIDs are scattered but can be grouped by heap page. An index-only scan can be cheap when it covers needed values and most heap pages are all-visible; with a cold visibility map it degrades toward an ordinary index scan. The book's curves are qualitative: cache, page size, row width, storage, statistics, and `work_mem` move the crossover. Compare plans on a representative workload and record actual buffers/time.

Book source: *PostgreSQL Internals 14*, Chapter 20, pp. 376–399. See PostgreSQL 14 documentation for [index cost estimation](https://www.postgresql.org/docs/14/index-cost-estimation.html), [index-only scans](https://www.postgresql.org/docs/14/indexes-index-only-scans.html), [partial indexes](https://www.postgresql.org/docs/14/indexes-partial.html), [EXPLAIN](https://www.postgresql.org/docs/14/using-explain.html), and [planner cost constants](https://www.postgresql.org/docs/14/runtime-config-query.html).

## Read Chapter 21 in depth: Nested Loop, Materialize, and Memoize

### Separate join type from join algorithm

`INNER`, `LEFT`, `FULL`, semi-join, and anti-join describe the logical result to preserve. Nested Loop, Hash Join, and Merge Join are physical algorithms that produce it. An algorithm supports only some logical types: Nested Loop naturally supports inner/left/semi/anti joins, but cannot preserve every row on both sides and therefore cannot implement a full join by itself. The planner can transform equivalent SQL into the same join node; `EXISTS` commonly becomes a semi-join and `NOT EXISTS` an anti-join.

### Two loops and the cost of each inner call

Nested Loop visits each outer row and calls the inner plan to find matches. The outer row becomes a parameter to the inner scan, for example `ticket_flights.ticket_no = tickets.ticket_no`. This is a parameterized path: an inner index lookup can be cheap when the outer side has only a few rows. But if the outer estimate is wrong—2 rows expected, 200,000 actual—the inner plan may be called far too many times.

In `EXPLAIN ANALYZE`, inspect `loops` on the inner node. `actual rows` is generally the average per loop; multiply `actual rows × loops` to estimate total rows produced (allowing for rounding). For example, inner `actual rows=4 loops=2` means an average of four rows on each of two calls, about eight rows total. Node time is also generally an average per loop; read the format carefully and do not add parent and child times twice because parent time includes its child.

A non-parameterized inner plan may be wrapped in `Materialize`: the executor reads its child once and retains the result for later outer iterations. If it exceeds its memory allowance, Materialize can spill to temporary files. Unlike Memoize, it stores one shared stream rather than caching by key.

### Memoize caches by parameter, not as a global query cache

`Memoize` helps when the inner scan receives the same parameter repeatedly. The first lookup for a key such as `aircraft_code='SU9'` runs the index scan and stores its rows; later calls reuse them. The cache is keyed by parameter values, has a memory budget tied to `work_mem` and `hash_mem_multiplier`, and uses an approximately LRU eviction policy. If one key's result is too large to fit, that key can be bypassed rather than caching an incomplete result.

In `EXPLAIN ANALYZE`, read `Cache Key`, `Hits`, `Misses`, `Evictions`, `Overflows`, and `Memory Usage`. If the outer side has 113 rows but only one key value, expect about one miss and 112 hits. Many distinct keys, evictions, or overflows reduce the benefit. Disable `enable_memoize` only temporarily for a diagnostic comparison; do not change it globally before understanding key distribution and estimates.

### Semi/anti and outer joins change when execution can stop

A semi-join needs only one match for each outer row, so the executor stops the inner scan as soon as it finds one. An anti-join keeps an outer row only after establishing that the inner side has no match; it can also stop immediately when a match is found. Thus, `EXISTS`/`NOT EXISTS` can be cheaper than a regular join when only left-side rows are needed, and they avoid duplicating left rows when the right side has multiple matches.

A left join must return an outer row even when no match exists, filling inner columns with NULL. Join conditions and filters after the join are not interchangeable: `ON` determines a match; `WHERE` runs after the outer join has produced NULL-extended rows. Moving a predicate from `ON` to `WHERE` can accidentally filter away those rows. Nested Loop is asymmetric: it scans the outer side fully and probes the inner side; it cannot preserve all inner rows as a right/full join requires.

### Join cardinality and cost

If the outer side has `N` rows and each matches an average of `M` rows, the result is roughly `N×M` before additional conditions. A declared foreign key gives the planner information about parent/child relationships; otherwise, a baseline equi-join estimate uses distinct counts for both keys and assumes a uniform distribution. MCV statistics can refine popular-key estimates, but skew, NULLs, and correlation can still make the estimate wrong.

Nested Loop startup cost generally combines startup costs of both children. Total cost includes scanning the outer side, the initial inner fetch and its repeated fetches, plus result-row processing. With a parameterized inner path, each outer row triggers its own lookup. With Materialize/Memoize, repeated calls do not mean the entire child is reread every time. Compare estimates with `actual rows`, `loops`, cache counters, buffers, and temp I/O.

Nested Loop can participate in a parallel plan: the outer scan is divided among workers; each worker handles its outer rows and calls the inner plan serially for each parameter. This does not mean multiple workers split one inner lookup. A non-equality condition can also use Nested Loop, but without a suitable index the executor may test many row pairs—effectively a Cartesian product followed by a filter—so the number of pairs can grow as the product of both inputs.

Book source: *PostgreSQL Internals 14*, Chapter 21, pp. 400–419. See [EXPLAIN](https://www.postgresql.org/docs/14/using-explain.html), [planner statistics](https://www.postgresql.org/docs/14/planner-stats.html), and [parallel plans](https://www.postgresql.org/docs/14/parallel-query.html).

## Read Chapters 22–23 in depth: aggregation, merge joins, and algorithm choice

### HashAggregate is not limited to GROUP BY

HashAggregate groups rows by keys in a hash table. It can also implement `DISTINCT` or remove duplicates after `UNION`; `Append` only concatenates inputs and does not itself deduplicate them. With few groups, the hash table can remain small even for a huge input. With high distinct cardinality, the table can exceed `work_mem × hash_mem_multiplier`; the node partitions keys, writes rows to temporary files, and processes each partition. Read `Batches`, `Memory Usage`, `Disk Usage`, and `temp read/write`: one batch does not mean little input, but few enough distinct keys for compact state.

Unlike hash join, aggregation does not need to retain every input row to match it against another input. Values feed hash state, and frequent keys can be grouped early; hash aggregation does not need hash join's skew-bucket optimization. HashAggregate can also appear as `Partial HashAggregate` in workers followed by `Finalize Aggregate` in the leader; not every aggregate is parallel-safe or reduces many rows.

### GroupAggregate, Unique, and MixedAggregate reuse order

If input is already sorted by the group key—for example, a B-tree index provides the order—`GroupAggregate` needs to retain only the current group's state, processes the input in one pass, and often needs less memory than a hash table. `Unique` removes adjacent duplicates from a sorted stream; it can use an index-only scan and does not need to build a hash set. If no suitable order exists, a preceding Sort may consume substantial RAM or temp I/O; include the cost of creating that order when evaluating ordered grouping.

`GROUPING SETS`, `ROLLUP`, and `CUBE` request multiple groupings from the same input. PostgreSQL can combine hash keys, sort keys, and group keys in `MixedAggregate`; do not read the node name as “only hash” or “only sort.” For example, grouping by `aircraft_code`, `flight_no`, and hashing by `departure_airport` can use a sorted stream for two groups and hash state for the other. Inspect all keys and the Sort node below it.

### Merge Join: two ordered streams, advancing in one pass

Merge Join receives both inputs ordered by the join key, keeps a pointer to the current row on each side, advances past the smaller key, and emits matching pairs. Duplicate keys require group handling: every row on one side must match every qualifying duplicate on the other. If indexes provide the order, merge can start early and avoid a large memory structure; if both sides need Sort, startup rises because sorting must consume input first.

In the book's PostgreSQL 14 account, the merge condition needs equality/merge-compatible operators. Inner/left merge joins can preserve useful ordering; right/full joins can lose order because of NULL-extended rows and may need a new Sort. Parallel merge join has no distinct parallel algorithm node: the outer input may be divided among workers, but each worker scans the full inner input; right/full merge joins are not parallel in the book's version.

### Choose Nested Loop, Hash, or Merge from workload shape

- Nested Loop can return rows early and fits a small outer side with cheap/indexed inner lookups; with a large outer side and costly lookup, loop count can explode.
- Hash Join usually scans two large inputs once if the hash table fits memory; it must finish building the inner side before returning the first result, and multiple spill batches add temp I/O. It fits equality joins whose key type supports hashing.
- Merge Join handles small or large streams and uses little memory when inputs are already sorted/indexed, but needs equality-compatible keys; extra Sorts can make it more expensive than hash.

These are trends, not rules: selectivity, startup latency, required output order, distinctness/skew, memory, correlation, cache, and temp I/O move the crossover. The planner still estimates; compare actual plans on the real query and concurrency. Do not disable `enable_hashjoin`, `enable_mergejoin`, or `enable_nestloop` as a default fix; toggling one temporarily can help create a comparison plan.

Book source: *PostgreSQL Internals 14*, Chapter 22 pp. 440–442 and Chapter 23 pp. 443–466. See [aggregate execution](https://www.postgresql.org/docs/14/runtime-config-query.html), [using EXPLAIN](https://www.postgresql.org/docs/14/using-explain.html), and [parallel plans](https://www.postgresql.org/docs/14/parallel-query.html).

## Check your understanding

**Is an index scan always better than a sequential scan?** No; many random heap fetches can cost more than a sequential read.

**What can cause a hash join spill?** The build side exceeds estimate/memory, or key cardinality/skew differs from expectation.

**Does LIMIT 10 always process only 10 rows?** No; without an ordered access path, the engine may read/sort many candidates.
