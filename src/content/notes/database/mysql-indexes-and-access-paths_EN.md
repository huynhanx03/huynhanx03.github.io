---
title: "MySQL Indexes: Choosing Order and Understanding Access Paths"
category: "Database"
description: "Design InnoDB indexes for equality, ranges, sorting, and covering queries while balancing reads with write and locking costs."
updated: 2026-10-18
translationKey: "database/mysql-indexes-and-access-paths"
---

In MySQL, indexes are part of query design and storage-engine design. `CREATE INDEX` does not guarantee a fast query: the optimizer must estimate that the index is cheaper, the structure must fit the predicate, and the engine may still need to fetch rows from the clustered index. Start with the query path and choose an index that can be verified.

## Different index types answer different questions

InnoDB uses B-trees for primary and secondary indexes. B-trees support equality, ranges, prefixes, and compatible key ordering. A hash index is not a general optional InnoDB access method; the MEMORY engine supports hash and B-tree indexes with different behavior. R-trees serve spatial data in engines/features that support them; FULLTEXT indexes text tokens with their own search semantics. Choose a type only after confirming that its operators match the query.

An application can sometimes build its own hash index with a helper table containing a hash and the original value. Hash collisions require checking the original value; storing only the hash as a unique key can return the wrong result. A helper table adds consistency, cleanup, and transaction work, so use it only for a measured use case.

For a very long string such as a URL, an application can store an additional hash to make an equality-lookup index smaller. But a hash only finds candidates: two different URLs can share a hash, so the query must check both the hash and the original URL. The hash must also be maintained atomically with the URL; this trades index size for another column and invariant.

The **prefix-compressed index** in the book's chapter is a historical MyISAM feature: keys sharing a prefix within a block are stored by writing the first key in full and encoding the differences in later keys. It saves index bytes and lets more keys fit in cache, at the cost of decompression during reads. Do not assume InnoDB B-trees use the same compression; the engine and version determine the actual layout.


### What a B-tree can do, and how far each key part contributes

Conceptually, a B-tree keeps keys ordered in pages; internal nodes route to leaves, while leaves point to data in an engine-specific way. This lets a B-tree seek to a key, continue through a contiguous key range, and return compatible order. Leaf entries do not have one universal row-pointer format: older MyISAM used row locations; an InnoDB clustered leaf holds the row, while a secondary leaf stores its secondary key plus the primary key.

For `(last_name, first_name, dob)`, queries can use contiguous key paths for a full three-column key; a prefix such as `(last_name)` or `(last_name, first_name)`; a character prefix such as `last_name LIKE 'Sm%'`; a range on `last_name`; or equality on `last_name` and a range on the next column. In contrast, searching only by `first_name`, only by `dob`, or by a name suffix does not start at a suitable position for a seek. Skipping `first_name` also does not create one contiguous region for `(last_name, dob)`.

The first range condition usually ends the key parts that can narrow one contiguous range. For `(a,b,c)` with `a = ? AND b > ? AND c = ?`, `a` plus the range on `b` defines the scan region; `c` does not further narrow that same region. However, `c` may still help test index entries, use index condition pushdown (ICP), or cover output depending on the plan/version. Distinguish “used for seek/range,” “filtered in the index,” and “returns data without a row lookup” instead of saying suffixes are completely useless. Current MySQL supports ICP to evaluate conditions readable from an index entry before fetching the full row; see the [8.4 manual](https://dev.mysql.com/doc/refman/8.4/en/index-condition-pushdown-optimization.html).

`IN (...)` is a list of multiple equality values even though `EXPLAIN` may label its access type `range`; it differs from one continuous `>`, `<`, or `BETWEEN` range. In some queries, multiple equality values in the prefix let later columns contribute more than an open-ended range would. `OR`/`AND` predicates on separate indexes may be handled with Index Merge (union/intersection), but creating and combining row candidates also costs CPU, memory, and I/O. Compare it with a composite index or scan under concurrent workload; `index_merge` in a plan does not prove it is the best choice.

## Composite B-trees follow the leftmost prefix

An index on `(tenant_id, status, created_at)` is ordered by `tenant_id`, then `status`, then `created_at`. It may help a query filtering by the `tenant_id` prefix, or by both `tenant_id` and `status`, followed by a range/order on `created_at`. It does not replace an index on `(status)` for a query filtering only on status, because status values are grouped by tenant first.

Choose column order from the workload: equality conditions, ranges, sorting, tenant grouping, and data distribution. The column with the highest cardinality does not always belong first; frequently used query prefixes matter more. A **prefix index** stores only the beginning of a string. Its declared length is measured in characters for nonbinary strings, while index limits are measured in bytes, so the two differ with multibyte character sets. The actual limit also depends on the storage engine and row format.

A prefix index must be long enough to distinguish most values in real data. You can compare `COUNT(DISTINCT LEFT(city, n)) / COUNT(*)` for several lengths on a representative sample, then compare size and query latency. This ratio is only an average statistic: if a few popular prefixes create hot ranges, inspect the distribution by prefix rather than relying on one number. If a search term is longer than the indexed prefix, the index can exclude nonmatching candidates, but the engine must check the full value for the remaining candidates. Because the index omits the suffix, it cannot cover a query that needs the complete string, guarantee full `ORDER BY city` ordering between values with the same prefix, or support a Loose Index Scan that groups by the full value. A query may still use the index to find candidates; that differs from using it to return the complete result, order, or grouping.

Predicates also need to let the optimizer reach the key. With an index on `created_at`, writing `DATE(created_at) = '2026-10-17'` often prevents a direct range on the original value. Rewrite it as a half-open interval: `created_at >= '2026-10-17' AND created_at < '2026-10-18'`. Similarly, `LIKE '%tail'` has no fixed leading prefix for a B-tree seek; changing the index cannot fix a predicate that has no compatible key order.

If the workload repeatedly searches a **suffix**, such as email addresses at `@example.com`, reverse the string when storing it. Then `alice@example.com` becomes `moc.elpmaxe@ecila`; searching for values that begin with `moc.elpmaxe@` becomes a prefix range a B-tree can consider. The book's approach stores the reversed value in a separate column maintained by triggers. MySQL 8.4 can instead index a generated column, for example:

```sql
CREATE TABLE account (
  email VARCHAR(320) NOT NULL,
  reversed_email VARCHAR(320)
    GENERATED ALWAYS AS (REVERSE(email)) STORED,
  KEY idx_reversed_email (reversed_email)
);

SELECT email
FROM account
WHERE reversed_email LIKE CONCAT(REVERSE('@example.com'), '%');
```

This is a trick for a fixed suffix, not a full-text or arbitrary-substring index. Check collation and case-folding so reversal preserves the intended matching semantics; escape wildcard characters in a user-supplied suffix. Generated-column indexes are supported by [MySQL 8.4](https://dev.mysql.com/doc/refman/8.4/en/generated-column-index-optimizations.html).

**Selectivity** is the fraction of rows left after a predicate; the fewer rows match, the more useful an index often is. **Cardinality** is the estimated number of distinct index values. They are related but not interchangeable: a `status` with four values has low cardinality, yet one status may be extremely rare within a tenant. Choose index order for the query, needed prefixes, sort, and distribution within each group; do not treat one table-wide statistic as a fixed rule.


## Choose an access method for the search shape

- **B-tree:** the general-purpose choice for equality, ranges, prefixes, and compatible ordering. Equality on a full key can reach a point; a range reads a contiguous region. It cannot turn `LIKE '%suffix'` into a seek because the leading key part is unknown.
- **Hash:** some engines, such as MEMORY, offer hash indexes. Hashing is compact and useful for equality (`=`, `IN`, and null-safe equality where supported), but it has no ordering, so it cannot support ranges, prefixes, or `ORDER BY`; a composite hash lookup needs all key parts. On collision, the engine must verify the original value. InnoDB has no user-declared hash index in place of B-tree; InnoDB's adaptive hash is a separate internal mechanism.
- **Spatial R-tree:** indexes multidimensional bounding rectangles for supported geometry predicates; it does not follow B-tree leftmost-prefix rules. This is a specialized access method requiring spatial columns, SRID/semantics, and compatible predicates. MySQL 8.4 supports SPATIAL indexes for InnoDB and MyISAM; see the [spatial analysis manual](https://dev.mysql.com/doc/refman/8.4/en/optimizing-spatial-analysis.html).
- **FULLTEXT:** tokenizes text for term searches under engine-specific modes; it is not arbitrary substring search like `LIKE '%word%'`. Token length, stopwords, parser/language, ranking, and update cost affect results. MySQL 8.4 supports FULLTEXT for InnoDB and MyISAM on CHAR/VARCHAR/TEXT; see [InnoDB full-text indexes](https://dev.mysql.com/doc/refman/8.4/en/innodb-fulltext-index.html).
- The book names TokuDB fractal trees, ScaleDB Patricia tries, and analytic engines such as InfiniDB/Infobright. These are historical examples showing that engines may choose other structures for particular workloads; verify current product support instead of treating them as default MySQL choices.

An index is not always the best access method. A table scan can be cheaper for a small table; very large datasets may need partition/pruning, clustering, summaries, or data skipping rather than one oversized row-by-row index.

## A clustered index changes where rows live

InnoDB table data is organized by the clustered index, usually the primary key. Clustered B-tree leaves hold rows and transaction/MVCC metadata; the primary index is the table’s data organization. MyISAM instead keeps a separate data file with rows in storage order and B-tree leaves pointing to row locations; its primary key is a unique index, not a clustering of rows by key. InnoDB secondary indexes store primary-key values as locators rather than physical addresses. This makes secondary leaves wider, but row movement/page splits do not require rewriting every physical pointer. A lookup through an InnoDB secondary index may therefore need two page paths: the secondary leaf and then the clustered leaf. If a query needs many scattered rows, random lookups may cost more than a scan.

A short primary key keeps secondary indexes smaller. Sequentially increasing keys tend to insert toward one side of the tree, while random keys distribute inserts; page splits and locality depend on fill, buffering, and workload. Physical cost should be balanced with global uniqueness or unpredictability requirements.


### When a B-tree can provide the requested order

An index scan can avoid a sort when an equality prefix fixes the earlier key parts and the remaining columns match `ORDER BY`. For example, `(tenant_id, created_at, order_id)` may serve `WHERE tenant_id = ? ORDER BY created_at, order_id`; mixed ASC/DESC directions, skipping a key part, sorting on a column outside the index, or an incompatible join order may require another sort. After a range on an earlier key, the optimizer generally cannot use the suffix as a new arbitrary total order as if the prefix were fixed. A range predicate on one index and sorting by an independent index also compete: one access path cannot both narrow an arbitrary region and emit unrelated order.

An index-ordered scan is not always faster than filesort. If the query must fetch clustered rows randomly for hundreds of thousands of entries, sorting a smaller candidate set or scanning the table may be better. The clearest gains occur with a small range, a covering plan, or `ORDER BY ... LIMIT` that can stop after few entries. `EXPLAIN` uses “filesort” for an additional sort operation; it does not guarantee the sort spilled to disk.

## Covering indexes avoid some row reads

Suppose a query filters by `tenant_id`, orders by `created_at`, and returns only `order_id`. If a secondary index contains everything needed to filter, order, and return the result, the engine may read directly from its leaves without visiting the clustered index for each row. An InnoDB secondary leaf already contains the primary key. Adding other payload columns may reduce row lookups, but it also widens the index, increases buffer-pool and storage use, and raises write-maintenance cost. Consider covering indexes for specific query classes instead of adding every column everywhere.

Covering and **index condition pushdown (ICP)** are different. Covering means the index contains enough data to return the result. ICP lets the storage engine test some conditions from an index entry before fetching the full row, though a row fetch may still be needed. The book describes older MySQL versions that might fetch a row before applying a residual filter; current behavior depends on the plan and version. Check `EXPLAIN ANALYZE`, actual rows, `Using index`, and `Using index condition` instead of inferring from the column list.

If a query needs wide columns but returns few rows, **deferred lookup** can read IDs and sort keys from an index, apply filters and `LIMIT`, and fetch full rows only for the final results. It avoids lookups for discarded candidates; if nearly every candidate is returned, an extra derived table/join may cost more. Measure both forms with representative data and concurrency.


There is an important exception to sequential inserts: they are often an efficient load path with good locality, but a high-concurrency write workload can send every insert to the final leaf of the primary B-tree or contend on `AUTO_INCREMENT` allocation. That can become a hot spot. Consider changing key/distribution or insert mode only after lock/wait metrics demonstrate the contention; random keys reduce one hot leaf but increase splits, random I/O, and index size. This is a tradeoff between local contention and overall locality, not a rule that sequential IDs are always best.

## Indexes affect locks and writes

InnoDB commonly locks scanned index records or ranges for locking reads, updates, and deletes. Under some isolation levels and range predicates, gap/next-key locks prevent inserts into a range. A suitable index can make the scanned range smaller; a missing index or a predicate that is difficult to use with an index can cause more rows or ranges to be examined and locked. Inspect `EXPLAIN`, lock waits, and deadlocks, not only the final row count.

Every index adds cost to inserts, deletes, and updates of indexed columns. Redundant indexes also consume the buffer pool, disk, redo, and backup time. Some prefix-duplicate indexes can be consolidated, but consider sort direction, uniqueness, collation, optimizer behavior, and other workloads first.


Remember that cardinality in `SHOW INDEX` is an estimate, not an exact count for each value. Index/column skew can make an average estimate wrong for an exceptional tenant or user; after bulk loading or a major distribution change, `ANALYZE TABLE` may refresh statistics, then compare estimates with actual rows in `EXPLAIN ANALYZE`. Effects of `ANALYZE`, histograms, and sampling vary by release.

**Observer effect in the MySQL 5.5 era:** InnoDB estimated cardinality by sampling pages. The book says that commands which appear observational—`SHOW INDEX`, `SHOW TABLE STATUS`, some `INFORMATION_SCHEMA` queries, and even client autocomplete—could trigger resampling when `innodb_stats_on_metadata` was enabled. On a large table or slow storage, observing statistics could itself create I/O, locks, and load; the values being observed could also be recalculated. A frequent monitoring poll could therefore make plans unstable instead of merely recording a problem.

Tie this behavior to a release and statistics mode; do not carry the MySQL 5.5 conclusion to every server unchanged. In [MySQL 8.4](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html), the variable still exists but affects only non-persistent statistics and defaults to `OFF`; persistent statistics are enabled by default. During a production investigation, check `innodb_stats_persistent`, the effective setting, and the manual for the exact release before attributing a spike to `SHOW INDEX`.

Distinguish three forms of fragmentation: a row split across pieces; logically adjacent pages/keys scattered physically; and pages with excess free space. They affect point lookups, range scans, and full scans differently. `OPTIMIZE TABLE`, index/table rebuild, or dump/reload may reclaim space/order, but consume I/O, temporary disk, locks, and replica capacity; choose for the engine/version and measure before and after. When corruption is suspected, investigate disk/RAM/filesystem, external file manipulation, crashes, or bugs; preserve a copy and recovery path first. `REPAIR TABLE` is not an InnoDB repair procedure.

## Statistics and maintenance

The optimizer relies on cardinality estimates and index statistics. If data is skewed or has changed substantially, `ANALYZE TABLE` may update statistics; the decision to create an index still needs a plan. MySQL supports invisible indexes to test the effect of ignoring an index without dropping its structure in supported versions.

Do not repair table corruption with a generic maintenance command before identifying the engine and state. `CHECK TABLE`, `REPAIR TABLE`, and `OPTIMIZE TABLE` have different semantics by engine. `REPAIR TABLE` is not an InnoDB repair tool in the same way it is used for MyISAM. For InnoDB, `OPTIMIZE TABLE` may rebuild a table; account for I/O, space, and metadata locks. See [index optimization](https://dev.mysql.com/doc/refman/8.4/en/optimization-indexes.html), [InnoDB indexes](https://dev.mysql.com/doc/refman/8.4/en/innodb-indexes.html), [ANALYZE TABLE](https://dev.mysql.com/doc/refman/8.4/en/analyze-table.html), [invisible indexes](https://dev.mysql.com/doc/refman/8.4/en/invisible-indexes.html), [spatial indexes](https://dev.mysql.com/doc/refman/8.4/en/optimizing-spatial-analysis.html), and maintenance documentation for the correct engine.


The book's case study builds a search form with many optional filters. Instead of creating one index for every combination, count the real query patterns and choose common prefixes; a low-selectivity, infrequent filter may be cheaper to check after a primary prefix narrows the candidates. `IN(...)` on a low-cardinality dimension can let a query reuse an index with an equality prefix when the user omitted that dimension, but the product of lists can explode the number of branches/ranges; cap list size and measure CPU/plan. Put a range such as `age BETWEEN ...` near the end because suffixes after a range contribute less to seek narrowing. With independent ranges, choose the one that best reduces candidates, or use an approximate flag such as `active` while retaining exact time as a residual filter.

For `ORDER BY`/deep `LIMIT`, a suitable index can provide order and stop early; large `OFFSET` still walks past skipped entries. Limit result-page depth if the product allows, or use keyset pagination. A deferred join reads PK and sort keys through a covering index, skips candidates before fetching full rows, and is especially useful when payload is wide and only a small final page is returned.

## Work through a filter-and-sort case

Suppose a query filters by `tenant_id`, a range of `created_at`, and `status`, then sorts by `created_at`. Do not create an index by copying the column order from the SQL. Classify predicates as equality or range, determine which prefixes must be supported, estimate matching rows, and consider sort order and returned data. Start with one candidate index, inspect `EXPLAIN`, measure read latency and write throughput, and add a separate index only if another query justifies it.

If a query has two independent range conditions, a composite B-tree generally cannot use both to narrow one contiguous range as we might expect. We may choose the more important range, use Index Merge if the optimizer finds it appropriate, or change the query/schema. The book's case studies emphasize testing real filters and sorts instead of building one “giant index” intended to guess every query.

## Follow a search query through its decisions

Suppose an orders page filters by tenant and state, reads orders in a date range, sorts newest first, and returns 30 rows:

```sql
SELECT order_id, created_at, total
FROM orders
WHERE tenant_id = 42
  AND status = 'paid'
  AND created_at >= '2026-10-01'
  AND created_at <  '2026-11-01'
ORDER BY created_at DESC, order_id DESC
LIMIT 30;
```

One candidate is `(tenant_id, status, created_at, order_id)`: the equality prefix narrows to a tenant/state; the date continues as a range; the date and ID order may support the result order when direction and optimizer plan fit. `total` is not in the index, so each result may need a row lookup. If measurements show those lookups are expensive, try adding `total` for coverage, but compare index size and write throughput too.

Adding `total > 500` does not mean the engine can carve out a small region on the same B-tree after entering the `created_at` range. If `total` is not in the index, the engine must read rows to check it; if it is added after the sort keys, ICP can filter some row lookups while the scan may still visit many entries in the date range. With two ranges and skewed distributions, the best key order can change; measure actual candidates and plans instead of applying “the most selective column always comes first.”

If predicates are on separate indexes, the optimizer may consider Index Merge to combine candidate rows. That is not always faster: it may read many entries, retain/combine row-ID lists, and add CPU/memory work. Compare it with a composite index and table scan under the same workload; do not force Index Merge just because a query has several predicates.

For a search form with optional filters, an index `(sex, country, region, city, age)` is useful only when a query has a compatible leftmost prefix. Creating an index for every possible filter combination can inflate writes and storage. Use query logs/profiles to group common patterns, run `EXPLAIN ANALYZE` on important patterns, then choose a small set of indexes that serves most of the workload. Check skewed data separately—a tenant or user with far more rows than others can be hidden by average estimates.

Avoid paginating with `OFFSET 500000` when the next page can continue from the last key received. With stable ordering `(created_at, order_id)`, keyset pagination adds a condition after the previous position:

```sql
WHERE tenant_id = 42
  AND status = 'paid'
  AND (created_at, order_id) < (?, ?)
ORDER BY created_at DESC, order_id DESC
LIMIT 30;
```

If rows have wide payloads, a deferred lookup can first read IDs and sort keys from an index, limit to 30 rows, then fetch full rows for those IDs. This reduces row fetches for candidates that would be discarded, but the outer query must preserve order and the semantics must remain correct under concurrent updates.

## Read statistics and remove indexes with evidence

`SHOW INDEX`/`INFORMATION_SCHEMA.STATISTICS` reports estimated cardinality, not a promise about the exact number of rows per value. After a bulk load or a major distribution change, `ANALYZE TABLE` updates key statistics; histograms may help the optimizer estimate a column's distribution. These operations have costs and do not guarantee that the new plan is faster. Compare `EXPLAIN` with `EXPLAIN ANALYZE`, inspect actual rows/time, and measure the workload after updating statistics.

Duplicate indexes with the same key order often repeat maintenance work. An index `(a,b)` can serve some queries using the `a` prefix, but `(a)` may still help if it is substantially smaller or if workload/uniqueness semantics differ. Before dropping a rarely used index, check a history long enough to cover batches, reports, and scheduled jobs; usage data that was just reset or comes from only one node can mislead. On MySQL versions with invisible indexes, make the index invisible and observe plans/latency before dropping it; monitor every critical query and replica workload for a representative period.

Fragmentation may mean a row is split across pieces, logically adjacent pages are physically scattered, or pages contain excessive free space. These affect point lookups, range scans, and full scans differently. The book notes that MyISAM can experience all three forms, while InnoDB in the version it describes moves/rewrites short rows as one piece; this is engine/version-specific detail, not a rule to generalize to every current layout.

The book presents `OPTIMIZE TABLE` or dump/reload as engine-dependent rebuild methods, but their effects differ: some engines rebuild indexes in sorted order, while older InnoDB rebuild paths mainly recreated clustered data; recreating secondary indexes could require dropping and adding them again. The examples using `ALTER TABLE ... ENGINE=...`, Percona's `expand_fast_index_creation`, and `XtraBackup --stats` belong to the book's publication-era ecosystem and are not default MySQL 8.4 procedures. Check which online/copy algorithm and rebuild scope the deployed version supports before choosing a tool.

Do not run `OPTIMIZE TABLE` just because a file looks large. Measure reads/writes, page use, free space, and rebuild duration. Packing pages too tightly can make later updates trigger page splits/reorganization, raising latency until the data reaches a new steady state. A rebuild may need temporary disk and I/O, take locks, and cause replica lag; its expected benefit must exceed the cost and operational risk. Corruption calls for investigating hardware, filesystem, and backup paths before issuing repair commands; MyISAM maintenance commands are not an InnoDB recovery procedure.


### Three structural benefits and the cost of indexes

A B-tree provides three related benefits: examining fewer rows by navigating to relevant candidates; reading nearby keys in order to improve locality and avoid some sorting/grouping work; and returning results from the index alone when it covers the needed data. The book describes a **three-star index** model: one star if relevant rows are close together in the index, a second if index order matches query order, and a third if the index contains every needed column so no row lookup is required. This is a way to reason about an access path, not a guarantee that the query will be faster.

Not every query can earn all three stars with a reasonable index size. For example, a mixed ASC/DESC `ORDER BY` may not match key order, and adding every output column to cover a query can make the index large and expensive to write. Choose the best workload tradeoff, or consider summary/denormalized data when an important query cannot be served efficiently by an index. Every index also adds storage, buffer-pool pressure, redo, backup, and write maintenance; add one only when you can identify a query class and a metric it should improve.

Dropping an identical duplicate index is often safe after constraint checks; a leftmost-prefix “redundant” index needs more thought. `(a,b)` can serve some lookups on `a`, but `(a)` is smaller and may be faster for scans/cache or preserve different constraint/order semantics. InnoDB secondary leaves implicitly include the PK; `(a)` is effectively ordered like `(a, PK)`, while `(a,b)` changes the suffix before the PK, so `WHERE a=? ORDER BY PK` may need filesort after adding `b`. Compare the actual workload before consolidating.

## Check your understanding

**Why might an index on `(a,b)` not help a query filtering only by `b`?** Keys are ordered by `a` first, so all values of `b` do not form one contiguous tree range.

**Does `Using filesort` in `EXPLAIN` mean the sort always uses disk?** No. It names an additional sort step; data may sort in memory or spill depending on its size and settings.

**If an index exists but the optimizer does not use it, should you force a hint?** First check statistics, selectivity, type/collation, parameters, and the plan. A hint may become stale as data changes.

Reading: *High Performance MySQL*, chapter 5 and the chapter 6 case study; [MySQL index optimization](https://dev.mysql.com/doc/refman/8.4/en/optimization-indexes.html), [column and prefix indexes](https://dev.mysql.com/doc/refman/8.4/en/column-indexes.html), [ORDER BY optimization](https://dev.mysql.com/doc/refman/8.4/en/order-by-optimization.html), [GROUP BY optimization](https://dev.mysql.com/doc/refman/8.4/en/group-by-optimization.html), and [InnoDB indexes](https://dev.mysql.com/doc/refman/8.4/en/innodb-indexes.html).
