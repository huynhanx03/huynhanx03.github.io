---
title: "PostgreSQL Index Types and Operator Classes"
category: "Database"
description: "Choose B-tree, Hash, GiST, SP-GiST, GIN, or BRIN by operator and data distribution."
updated: 2026-10-17
translationKey: "database/postgresql-index-types-and-operator-classes"
---

An index helps only when its structure supports the operation a query needs and the planner estimates that path to be cheaper. PostgreSQL has several access methods because “find equal values,” “find a range,” “find nearby values,” and “find a component in JSON or an array” are different problems.

## B-tree is the default for many queries

B-tree supports equality, ranges, sorting, and suitable prefix searches under a collation. A composite index `(tenant_id, created_at)` often serves a tenant filter followed by a time range; column order matters because B-tree uses the left prefix. `INCLUDE` can add payload columns for index-only scans but increases size and write cost. Null ordering, collation, and operator class affect whether the index matches.

## Other access methods

| Method | Useful for | Tradeoffs |
| --- | --- | --- |
| Hash | Equality | Equality only; WAL-logged in current versions, and does not replace B-tree for ranges or sorting. |
| GiST | Generalized search trees: geometry, ranges, nearest-neighbor depending on opclass | Operators are defined by the operator class; split/penalty choices affect quality. |
| SP-GiST | Partitioned spatial data such as tries, quad-trees, radix trees | Needs a compatible data type/opclass and a suitable partitioning distribution. |
| GIN | Inverted index over components: arrays, full text, JSONB by opclass | Writes/updates can be expensive; pending lists and `fastupdate` affect latency. |
| BRIN | Very large tables whose values correlate with physical order | Small and lossy; heap rechecks are normal, and effectiveness depends on correlation. |

An operator class maps data types and operators to index strategies; an operator family groups compatible classes, such as comparisons across types. Thus, an existing index may not match a query that uses a different cast, operator, or collation. Extensions such as `pg_trgm` add operator/index support but must be installed and version-checked.

## Choose for the real query

For `WHERE email = ...`, a unique B-tree fits and also enforces uniqueness. For `ORDER BY created_at DESC LIMIT 20` within one tenant, a composite B-tree can filter and provide order. JSONB containment may need GIN with a suitable opclass. For a huge append-only table, BRIN can reduce footprint if timestamps correlate with storage position.

Indexes are not free: each write updates relevant indexes, indexes consume cache/disk, the planner has more alternatives, and vacuum/reindex must maintain them. Evaluate with `pg_stat_user_indexes`, `pg_stat_statements`, execution plans, and representative workloads. Do not drop an index only because `idx_scan = 0` in a short window: a constraint, rare query, or batch cycle may depend on it.

## Build and replace indexes safely

`CREATE INDEX CONCURRENTLY` reduces write blocking compared with a regular build, but runs multiple phases, can fail, and may leave an invalid index to inspect. It cannot run inside a normal transaction block. `REINDEX CONCURRENTLY` and partition operations have their own rules. Check temporary disk, replication lag, progress, and state after failures.

*PostgreSQL Internals 14*, Part V, explores B-tree. Current documentation covers [index types](https://www.postgresql.org/docs/current/indexes-types.html), [operator classes](https://www.postgresql.org/docs/current/indexes-opclass.html), [multicolumn indexes](https://www.postgresql.org/docs/current/indexes-multicolumn.html), [GIN](https://www.postgresql.org/docs/current/gin.html), and [BRIN](https://www.postgresql.org/docs/current/brin.html).

## Read Chapter 19 in depth: which operations can an index perform?

### An index is auxiliary; an access method is a contract

An index can be dropped and rebuilt from the heap. Besides speeding up reads, it can enforce `PRIMARY KEY`, `UNIQUE`, or exclusion constraints. PostgreSQL 14 has six core access methods: B-tree, Hash, GiST, GIN, SP-GiST, and BRIN. Extensions can add methods such as Bloom without changing core. Although their storage differs, an index commonly returns TIDs; the indexing engine fetches heap tuples, checks visibility under the snapshot, and rechecks conditions when a method returns only approximate candidates.

A method does not understand every data type by itself. `pg_am` lists methods and handlers; an operator class (opclass) connects a method to a type and a set of operators/support functions. For example, B-tree `text_ops` defines ordering under a collation, while `text_pattern_ops` uses byte-oriented comparisons suitable for some prefix patterns. An operator family groups opclasses with compatible semantics, including comparisons across types; the planner can use a family to compare `integer` with `bigint` without casting everything to one type. Inspect `pg_opclass`, `pg_opfamily`, `pg_amop`, and `pg_amproc` when an index is not used as expected.

### Why might `LIKE 'ELENA%'` not use an ordinary B-tree?

A B-tree helps only when a condition can be translated to operators supported by the index's opclass. Under a non-`C` locale, text order under collation need not match bytewise prefix order. The book creates an ordinary index on `passenger_name`, but the planner uses a sequential scan for `LIKE 'ELENA%'`; an index using `text_pattern_ops` allows the prefix to become a range (`>= 'ELENA'` and `< 'ELENB'`), after which a heap recheck applies `LIKE` to remove false positives. Read `Index Cond` and `Filter` in the plan: the index condition narrows the search, while the filter confirms final semantics.

A condition also needs to expose the indexed expression in a form the planner recognizes: `column operator expression`, or the reversed form when a commutator is available. `initcap(name) = ...` cannot use an ordinary index on `name`; an expression index on exactly `initcap(name)` can. Functions in expression indexes must be immutable so results remain stable over time and configuration; otherwise a heap scan and index could disagree.

### Read capabilities instead of guessing from a method's name

PostgreSQL exposes three layers of properties: access-method (`pg_indexam_has_property`), a particular index (`pg_index_has_property`), and one index column (`pg_index_column_has_property`). These answer different questions: can the method guarantee order/uniqueness/multiple columns/INCLUDE; can this index do a regular scan, bitmap scan, backward scan, or clustering; can this column sort in a direction, provide distance ordering, return values, search multiple array elements, or search NULLs? For example, GiST can provide nearest-neighbor ordering with `<->` if its opclass declares distance support; B-tree can provide ordered values, Hash cannot. `ORDER BY point <-> query_point LIMIT 3` can stop after finding the nearest leaves if GiST supports ordering; otherwise the executor must calculate and sort candidates.

A unique constraint is a data rule; a unique index is one mechanism to enforce it. An exclusion constraint is more general: it forbids a pair of rows from simultaneously satisfying an operator, often `&&` for overlapping time ranges. Do not treat them as interchangeable: exclusion keys cannot replace primary/unique keys in every context such as foreign keys.

### Composite keys and INCLUDE columns do different jobs

A B-tree on `(ticket_no, flight_id)` can search by both conditions or the `ticket_no` prefix; a condition only on `flight_id` usually cannot narrow the range efficiently because keys are ordered first by `ticket_no`. Other methods can have different multicolumn rules, so do not apply the “leftmost prefix” rule to every index.

`INCLUDE (status)` adds payload for returning `status` without making it a comparison key. A unique index on `(flight_id) INCLUDE (status)` still requires only `flight_id` to be unique; `status` does not participate in uniqueness. Index-only scans still depend on the visibility map. `INCLUDE` enlarges leaf pages, increases write work, and has tuple-size limits, so add only columns the query needs.

Operator classes, families, and capabilities form the contract between data types, operators, indexes, and the planner. When a plan skips an index, ask in order: does the expression/cast/collation match; is the operator in the opclass/family; does the method expose the needed capability; does the partial-index predicate apply; and only then investigate cost and statistics.

Book source: *PostgreSQL Internals 14*, Chapter 19, pp. 357–375. See PostgreSQL 14 documentation for [index extensibility](https://www.postgresql.org/docs/14/xindex.html), [operator classes](https://www.postgresql.org/docs/14/indexes-opclass.html), [operator families](https://www.postgresql.org/docs/14/xindex.html#XINDEX-OPFAMILY), [collation](https://www.postgresql.org/docs/14/collation.html), [expression indexes](https://www.postgresql.org/docs/14/indexes-expressional.html), and [index-only scans](https://www.postgresql.org/docs/14/indexes-index-only-scans.html).

## Check your understanding

**Does a composite B-tree `(a,b)` optimize a query filtering only `b`?** Usually not as effectively as an index starting with `b`; check the plan and version-specific optimizations.

**Is GIN always better than B-tree?** No. They support different operations and GIN has its own write/storage tradeoffs.

**Does BRIN always return exact matches directly from the index?** No. BRIN is often lossy and the heap rechecks candidates.
