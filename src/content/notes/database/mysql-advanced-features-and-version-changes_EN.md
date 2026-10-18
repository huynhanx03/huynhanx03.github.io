---
title: "MySQL Partitioning, Views, Routines, and Advanced Features"
category: "Database"
description: "Understand partitioning, foreign keys, stored code, character sets, full text, and XA with current version limits."
updated: 2026-10-17
translationKey: "database/mysql-advanced-features-and-version-changes"
---

MySQL has features that extend SQL, but each adds rules for optimization, transactions, deployment, or operations. When reading an older edition, separate learning the feature's purpose from verifying whether it still exists, changed semantics, or was replaced in MySQL 8.4.

## Partitioning does not automatically speed queries

Partitioning divides a logical table into physical pieces by range/list/hash/key. Pruning helps only when a predicate lets MySQL eliminate partitions; a query without a partition-key filter may scan many of them. Partitioning can help data lifecycle/drop, locality, or administration, but increases DDL, index maintenance, and complexity.

MySQL 8.4 has engine/key limits: partitioning is supported for InnoDB and NDB; current manual limits say InnoDB partitioned tables do not support foreign keys. The partition key must also appear in every unique key. Design schema, FKs, and partitioning together; do not apply a MySQL 5.x recipe blindly.

Partitioned InnoDB also does not support `FULLTEXT` indexes or searches. This shows that partitioning is not a transparent layer that composes with every feature: check unique keys, foreign keys, index types, and storage engine before creating the table.

Think of partitioning as a way to get a query near a group of rows, not as one giant B-tree that finds any row. Each partition has its own indexes. If the table is partitioned by `created_at` but a query filters only on `customer_id = 42`, the server may need to search the index in many partitions. A good index does not replace partition pruning.

Time partitioning often helps when data lifetime matches partition boundaries: old data can be removed quickly with `DROP PARTITION`. But `REORGANIZE PARTITION` may copy rows. More partitions increase metadata, table-open, and DDL costs; exact limits depend on release and engine, so check the manual instead of treating a number in an older book as a default.

With `PARTITION BY RANGE (YEAR(created_at))`, the predicate must help the optimizer infer the partition. `NULL` or unusual values may widen the set that must be checked. Compare `EXPLAIN`, especially the `partitions` column, before and after adding a predicate on the partition key. If a join repeatedly looks up an index on the partitioned table without pruning, that cost is multiplied by the number of loops.

There are two different strategies: prune to a few partitions and scan them sequentially for huge, mostly cold history; or isolate a small hot region so the working set and indexes fit in memory. These are workload hypotheses, not a rule to remove indexes from large tables. Measure pages/rows read, write time, partitions touched, and maintenance time on representative data.

### MERGE tables are a separate historical mechanism

The MERGE storage engine (`MRG_MyISAM`) groups several structurally matching MyISAM tables so they can be read as one set. It is not InnoDB partitioning. Child tables remain accessible separately, indexes must match, and a primary key in each table does not ensure uniqueness across the whole set. A lookup may need to open several child tables. MySQL 8.4 still documents this engine, but for a new application evaluate InnoDB partitioning, sharding, or a unified table against the workload; do not choose MERGE because its name sounds like partitioning.

## Views and foreign keys

A view is a named query, not automatically a materialized-result cache. Merge/temptable algorithms and updatability affect optimization and writes. Views help abstraction/security but can hide expensive joins/aggregations. MySQL does not provide automatically refreshed materialized views as a core feature; summary tables need an update process.

In a plan, see whether the optimizer can merge the view definition into the outer query (`MERGE`) or must build an intermediate result (`TEMPTABLE`). With a temporary result, an outer filter cannot always be pushed down; a view that aggregates before filtering may process many unnecessary rows. A view has no independent index: indexes belong on base tables. Use `EXPLAIN` on the real query to see joins, sorting, and temporary tables after the view is expanded.

Foreign keys protect referential integrity in supported engines. With InnoDB, indexes and locks used to check constraints affect writes; cascades may touch many rows. Choose ON DELETE/UPDATE by invariant, index related columns, test transactions, and do not assume an FK replaces business validation at every layer.

When inserting a row with a foreign key, InnoDB must find the parent key in an index and ensure it does not disappear during the check. An insert may wait for a transaction deleting or changing the parent row; `ON DELETE CASCADE` adds work and locks on child tables. When investigating a lock wait, follow the related constraints too. Constraints prevent orphaned data more reliably than application-only checks, at the cost of indexes, write work, and coupling between tables.

## Stored code, prepared statements, UDFs, and plugins

Procedures/functions, triggers, and the event scheduler place logic near data, which can help atomic/schema-local work but make logic harder to version, test, and distribute. A trigger runs in the calling statement's transaction; an external side effect does not become atomic. Cursors fit sequential result processing but are often worse than set-based SQL.

Stored procedures fit multi-step work near the data when they significantly reduce round trips or need a clear privilege boundary. Triggers fit local invariants that every write path must maintain; because they run implicitly with a statement, document their side effects and account for them when debugging a transaction. A trigger does not make an HTTP call or message publish part of a MySQL transaction. For reliable delivery, write an outbox row in the transaction and publish it with a worker.

The event scheduler runs timed work but does not guarantee exactly-once execution: consider late runs, overlap, retries, and idempotency. A server-side cursor reads sequentially; if a set-based `UPDATE`, `INSERT ... SELECT`, or JOIN can express the work, it usually avoids loops and round trips. In a procedure, close the cursor and handle end-of-data explicitly.

Prepared statements separate query structure and parameters, helping prevent SQL injection and reuse parsing/planning according to server/client capability. They do not guarantee a fast query; inspect plans and parameter behavior. UDFs/plugins extend the server but bring native code into a larger failure/security boundary; account for ABI/version, deployment, and crash isolation.

Parameters replace values such as `WHERE id = ?`, not table names, column names, or keywords. If identifiers must be chosen dynamically, use an allowlist. A driver may emulate prepared statements on the client or use the server binary protocol; confirm the driver's behavior. Reuse can reduce SQL transfer and parsing, but plans still depend on indexes, data, and release. If parameter distributions are skewed, measure representative values.

UDFs and plugins run inside the database process. A native-code fault can crash the server; ABI or module-loading changes can affect upgrades and security. Put computation in the server only when there is a measured benefit over application code, with a build for the exact release, failure tests, and a coordinated deployment plan. Protect the ability to install or load a module like the ability to change the server binary.

## Character sets, full text, and XA

A character set defines encoding; a collation defines comparison/sort/case behavior. Server, database, table, column, and connection have distinct defaults. Mismatches can cause conversion, unexpected index use, or different comparisons. Specify charset when creating schemas and test Unicode/accented text.

A database-level default does not guarantee that every connection has matching settings. Check `character_set_client`, `character_set_connection`, `character_set_results`, the column charset/collation, and both sides of a JOIN. With multibyte UTF-8, `LENGTH(text)` counts bytes while `CHAR_LENGTH(text)` counts characters; byte and character limits are different.

Full-text indexes have their own tokenizer, stop words, and ranking; they fit basic text search but not every language/query requirement of a search service. XA is a distributed-transaction protocol with prepare/recovery state and coordinator dependency; consider 2PC blocking, timeouts, and heuristic recovery before enabling it.

Full-text search works on tokens; it is not an indexed `LIKE '%word%'`. Tokenization, token length, stop words, language, and ranking determine results. Current InnoDB supports full-text indexes, although the book describes an earlier period when MyISAM was the main option. Test with real data and languages; compare a search service when you need typo tolerance, autocomplete, or complex ranking. Do not choose MyISAM only for full-text: include its locking and crash-recovery behavior.

MySQL has natural-language mode for ordinary text search and Boolean mode for conditions such as `+mysql -legacy`: a word prefixed with `+` must appear, and one prefixed with `-` must be absent. Boolean mode does not automatically sort by relevance; natural-language mode has its own ranking. Both are affected by stop words and token settings. `MATCH(title, body)` needs a FULLTEXT index that matches that column set; an index on `body` alone does not serve every MATCH expression.

A full-text index stores token structures, not the row's text, so it is not a covering index. Phrase searches or an extra selective condition such as `author_id` may still read many candidate rows before further filtering. Sorting by a column other than relevance often requires filesort. Updating a long document also updates many index tokens, so measure writes as well as searches. If you change `innodb_ft_min_token_size`, stop words, or the parser, follow the release instructions for rebuilding the index. The book describes workarounds such as encoding filter tokens into indexed text; treat these as specialized techniques to benchmark, not default schema patterns.

XA uses two-phase commit: a coordinator asks participants to `PREPARE`, records the commit decision, then asks them to finish. After a crash, a participant may retain a prepared transaction and need coordinator recovery to commit or roll back. This is a durable intermediate state; track in-doubt transactions, timeouts, retries, and recovery. Use XA only when an invariant truly requires atomic commit across resources. If eventual consistency is acceptable, an outbox/saga is often easier to operate. Do not infer from the older book that a specific configuration variable must be disabled; InnoDB and binary-log coordination has changed across releases.

Separate application-coordinated XA across resources from the server's internal two-phase commit. MySQL must coordinate InnoDB commit with the binary log so crash recovery and replication do not expose a transaction that was rolled back. In MySQL 8.4, InnoDB support for this two-phase commit is always enabled; `sync_binlog=1` synchronizes the binary log to disk before commit according to the durability policy. Do not disable internal coordination merely because the application does not issue `XA` statements.

## Query cache and versioning

*High Performance MySQL*, chapter 7, describes the historical query cache. It was removed in MySQL 8.0; `SQL_CACHE` was removed and `SQL_NO_CACHE` is deprecated/has no effect in 8.4. Do not build a current system around those directives. Check the release manual for every legacy feature.

The old query cache stored results for an exactly matching query and invalidated entries when a related table changed. One write could discard many cached results. The shared cache also caused contention at high concurrency; memory fragmentation, pruning, and invalidation could stall the server. A high hit ratio alone does not prove it helps: compare latency, throughput, and contention under a production-like read/write mix. The durable lesson is to cache at the right layer and measure invalidation cost. For an application cache, design TTL, stale data, and stampede behavior; for an external cache, define keys, capacity limits, and refresh rules.

On releases that still had the query cache, the book measures hits/misses, pruned entries, free blocks, and fragmentation rather than looking only at allocated memory. Those `Qcache_*` counters were removed with the feature, so old dashboards do not apply to current servers. Today ask which cache is reducing database work, what invalidation costs, and how stale the data is allowed to be.

## Reading the chapter 7 mechanisms in depth

### Partitioning is a routing layer in front of the storage engine

The book describes partitioning as a layer that wraps several storage-engine handlers. SQL still exposes one logical table, while each partition has its own physical structure and indexes. An index on a partitioned table is therefore not one global B-tree: the query must first choose partitions, then search each selected partition's index.

This explains both the benefit and the work involved. An `INSERT` knows the row values and selects one destination partition. A `DELETE` must find its row; an `UPDATE` may find it in the old partition, recompute the partition key, and move the row to another partition. A read can prune partitions when its predicate lets the optimizer infer which partitions could match. The older implementation described in the book opened and set up handlers across partitions before pruning; execution details have changed, but the number of touched partitions and routing cost still need measurement.

RANGE groups ordered intervals and fits time or increasing values and dropping an old interval. LIST maps discrete values to groups. HASH distributes values across partitions but does not, by itself, help range queries. KEY uses a MySQL-selected hash over key columns. RANGE COLUMNS can partition directly on columns in releases that support it. Subpartitioning divides a partition again, but increases the number of objects to manage and does not automatically accelerate queries.

A year-based design can keep old years separately and use a `MAXVALUE` catch-all for unexpected future values. Depending on the partition expression, `NULL` or invalid values can land in an early partition, making a query touch more data than expected. Before using partitions for retention, define how to create the next partition, handle the catch-all, remove old data, back up and restore it, and recover from failed DDL.

Partition pruning is coarse filtering. If a table is partitioned by date but a query filters only `customer_id`, every join lookup may inspect indexes in many partitions. If the partition key is wrapped in a function, the optimizer may not infer the range; write predicates directly against the date column and inspect `EXPLAIN`/`EXPLAIN PARTITIONS`. Current MySQL supports pruning for some expressions the book's version could not handle, so check the manual for the exact release.

### A partition expression is part of schema semantics

MySQL 8.4 places specific limits on partition expressions. Ordinary `RANGE`/`LIST` expressions must resolve to an integer or `NULL`; `RANGE COLUMNS` and `LIST COLUMNS` can use types such as `DATE`, `DATETIME`, and strings directly; `KEY` uses internal hashing and accepts many valid MySQL column types, except `TEXT`/`BLOB` and columns that use index prefixes. Stored functions, UDFs/plugins, and variables cannot appear in the expression. Thus `PARTITION BY RANGE (YEAR(created_at))` is valid, but not every function that looks deterministic is allowed.

A subtle risk appears when the table is created: the expression can depend on `sql_mode`, but a partitioned table does not preserve the mode used at creation. Changing the mode later can make table operations fail or change how rows are distributed. MySQL warns that the table can become inaccessible or suffer data loss/corruption; source and replica should also use the same `sql_mode` so the expression produces the same partition. Keep the mode stable and verify partition calculations before a migration.

The current MySQL 8.4 limit is 8,192 partitions for a table that does not use NDB, including subpartitions. This is a technical ceiling, not a design target: the manual notes that even hundreds of partitions may be inadvisable because of metadata, file handles, and overhead. Choose the count from measured pruning, retention, and DDL costs.

When a table exceeds its working set, partitioning may allow a sequential scan of cold data or keep a hot partition and its indexes in RAM. This is a workload-specific physical strategy. Indexes on every partition can consume space and random I/O and increase write work; removing an index can make point lookups extremely slow. Compare both approaches on representative data. Dropping an old partition usually removes a whole unit quickly; `REORGANIZE` may move rows. Too many partitions increase metadata, table-open, DDL, old-engine file-descriptor, and routing costs. The book's old partition-count recommendation is not a current target.

### MERGE tables do not provide global table semantics

The book creates two MyISAM tables, each with `PRIMARY KEY(a)`, then combines them in a MERGE table. The result can still contain duplicate `a` values: uniqueness is enforced only inside each child table. MERGE does not combine their indexes into a global index either; a query may have to search several child tables and combine results.

Child tables must be MyISAM with compatible columns and indexes. Altering a child can make the MERGE table unusable; operations such as `REPLACE` and `AUTO_INCREMENT` have limitations. `INSERT_METHOD=FIRST/LAST` selects the receiving table; it is not a distribution or load-balancing mechanism. Unlike partitioning, child tables remain individually accessible and can belong to more than one MERGE collection, but the application must maintain their schema and integrity. Treat this mainly as knowledge of a historical mechanism. For new systems, compare InnoDB tables, partitioning, or application-level sharding against the actual requirements.

### A view may be merged into a query or materialized as an intermediate result

`ALGORITHM=MERGE` lets the optimizer combine an outer query with the view definition for joint optimization. `TEMPTABLE` builds an intermediate result. In the book's version, a view with `GROUP BY`, `DISTINCT`, aggregates, or `UNION` often needed this form because there was no longer a simple one-to-one mapping between input and output rows. The older implementation might not push an outer predicate into the view, and a temporary result has no index like a base table.

Modern MySQL has derived-condition pushdown in some cases, but that does not make a view a materialized view or guarantee that every filter is pushed down. Use `EXPLAIN` on the real query; inspect derived/materialized operations, temporary tables, sorting, and rows before and after filtering. Indexes still belong on base tables. A short view expression can hide a large join or aggregation, so measure the expanded query.

A view is generally updatable only when each output row maps unambiguously to a row in one base table. Aggregates, `GROUP BY`, `DISTINCT`, `UNION`, and some joins break that mapping. Even for an updatable joined view, a statement can modify only one base table. `WITH CHECK OPTION` requires inserted or updated rows to continue satisfying the view predicate; without it, a valid base-table update can make a row disappear from the view. MySQL has no `INSTEAD OF` trigger to define writes for a non-updatable view.

Views remain useful for hiding sensitive columns through privileges granted on a view, or as a compatibility layer during staged schema changes. A specially named view used to imitate a temporary view is still a shared schema object, not a per-connection object with its own lifecycle; manage its name, privileges, and cleanup. Keep a readable definition in migrations/source control because the stored server definition may be normalized and lose its original formatting or comments.

### Foreign keys preserve integrity through lookups, indexes, and locks

When a child row is written, InnoDB must find the parent key through an index and hold suitable locks so the parent cannot disappear during the transaction. A statement that appears to write one table can therefore wait or deadlock through another table. Cascading updates/deletes add row-by-row work and may expand the lock footprint.

Foreign-key indexes are not free: they consume pages, add write work, and may have low selectivity. But a foreign key is not inherently slow. A server-side integrity check can be cheaper and more reliable than repeated application round trips, and a cascade can avoid an inconsistent hand-written update sequence. Choose constraints by invariant, observe lock waits/deadlocks, and measure with the real workload. If a small status set is all that must be constrained, consider an `ENUM`, a release-appropriate `CHECK`, or another suitable constraint rather than a lookup table and index used only for the foreign key.

A trigger that imitates a foreign key must handle races. Checking that a parent exists and then inserting a child is not enough: another transaction can delete the parent between those operations. Correct locking and isolation are required, or use the native foreign key. The book's suggestion that dropping foreign keys can improve speed must be balanced against correctness and the cost of repairing invalid data.

### Stored code, triggers, events, and cursors have different costs

Procedures and functions run near the data and can combine small operations into one call, reducing network round trips and parse overhead. The book benchmarks a million sequential inserts and finds a procedure faster than a client sending one query at a time; that number belongs to its old setup, while the reusable principle is to measure the latency and request volume saved. Stored code can also centralize privileges or keep an invariant close to the data. In exchange, deployment, debugging, profiling, replication, and scaling become coupled to the database. A function inside a query can also be hard to cost and may run more times than expected.

Triggers run implicitly for each row, so one multirow `UPDATE` can cause a large amount of secondary work. They are useful when an invariant must be maintained immediately in the same transaction. With InnoDB, trigger changes participate in the calling transaction; with a nontransactional engine, a later failure may not roll back earlier work. Triggers can also create hidden deadlocks. The book shows a `ROW_COUNT()` trick to imitate a statement-level trigger; it relies on accidental, undocumented behavior and should not be used as a production design.

Stored procedures/triggers can contain comments, but some clients used to strip ordinary comments while creating an object. The book describes versioned comments as a way to preserve comments in that older toolchain. In a current project, keep formatted source in migrations and verify the definition after deployment; do not use executable-looking comments as the primary documentation system.

The event scheduler is an in-server schedule, similar to cron but attached to MySQL. An event has no input from a client connection and can overlap with its previous run if the job is long. If you use it, make the task idempotent, prevent overlap with a lock/lease, record run state, and decide whether the event should run on replicas. Ensure cleanup releases a lock even if a procedure fails. A schedule is not an exactly-once guarantee.

MySQL cursors in stored procedures are read-only, forward-only, and materialize the entire query when `OPEN` runs. Fetching one row and closing the cursor may already have read and copied thousands of rows into a temporary table. That table can spill to disk, especially for `BLOB`/`TEXT` results or when it exceeds the memory threshold. If only a few rows are needed, limit the query with `LIMIT`; for set-oriented work, prefer SQL or batches with explicit boundaries.

### Distinguish the three prepared-statement interfaces

A server-side prepared statement sends a template once, then sends bound parameters on execution using the binary protocol. A client driver may emulate preparation by substituting values into SQL text and sending the query again; the APIs may look alike, but the round trips, binding, and server-side protections differ. The SQL interface (`PREPARE`, `EXECUTE`, `DEALLOCATE PREPARE`) can create dynamic SQL inside a procedure, but still uses the text protocol.

Parameters represent literal values. They cannot replace identifiers such as schema/table/column names, keywords, or whole SQL clauses. For dynamic table names, validate identifiers against an allowlist and quote them correctly with the driver/server. Never concatenate untrusted user input into SQL. SQL-level preparation can help with dynamic identifiers or `LIMIT` when placeholders are not allowed, but safety then depends on careful construction.

Preparation can reduce parsing and repeated query-text transfer, but not every optimization decision is fixed. The book separates work performed at prepare time, first execution, and every execution, because parameter values can change partition pruning, range/ref access, join order, or constant folding. A server-side statement belongs to one connection; a pool must manage its lifecycle and deallocate statements to avoid leaks. If a statement runs only once, preparation and extra exchanges can cost more than they save. Verify that the driver really uses server-side preparation and benchmark repetitions, query size, payload, and concurrency.

### UDFs and plugins are inside the server's failure boundary

An SQL stored function differs from a native UDF built against the server ABI. A UDF can perform computation quickly or call operating-system libraries, but it runs inside the database process and can access native memory. A thread-safety, buffer, or ABI fault can crash the server or corrupt data. UDFs generally should not access tables as part of the calling statement's transaction; use them for pure computation only when there is measured benefit, a build for the exact release, source review, and a rollback plan.

Plugins extend more server points: authentication, audit, full-text parsers, daemons, procedures, and `INFORMATION_SCHEMA` tables. Each type has different lifecycle, privilege, and impact. A daemon plugin may open a network port; a parser plugin changes tokenization; an audit plugin observes query events. Before installing one, identify which process runs its code, required privileges, restart/upgrade behavior, replication effects, and removal procedure if it fails.

### Character sets and collations participate in comparisons and query plans

A character set describes how bytes encode characters; a collation describes comparison, sorting, and case behavior. Defaults form a server → database → table → column hierarchy, but only the column determines the encoding of stored values. A connection has separate settings for incoming statements, intermediate strings, and returned results. `SET NAMES` changes the server side; if the client library still sends bytes in the old encoding, data can be corrupted or escaping can become unsafe.

When MySQL joins or compares columns with different character sets/collations, it may need to convert one side. If conversion is applied to an indexed column, the index may not be used as expected. An index supports ordering for the collation under which it was built; `ORDER BY col COLLATE ...` with another collation may require filesort. Keep charset/collation consistent on comparison keys and inspect `EXPLAIN`, `SHOW FULL COLUMNS`, `CHARSET()`, and `COLLATION()` when debugging.

With multibyte encodings, bytes and characters differ: `LENGTH()` counts bytes while `CHAR_LENGTH()` counts characters. The book's UTF-8 examples use a three-byte encoding and old MyISAM key limits; current MySQL has `utf8mb4`, and index limits depend on engine, page size, and release. Preserve the lesson, not the old numbers: byte length, character count, prefix indexes, and temporary-buffer size are different quantities. For imports/exports, establish the encoding at the client, connection, and file boundaries, then test actual multibyte characters rather than ASCII alone.

### Full-text search is its own indexing pipeline

Full-text search tokenizes strings, filters stop words/length according to a parser, then finds documents through an inverted index. Natural-language mode calculates relevance from term frequency and how common terms are across the collection; very common words may be treated as uninformative. Boolean mode provides required `+`, excluded `-`, lower-weight `~`, prefix `*`, groups, and phrases. Boolean results are not automatically sorted by relevance. Syntax and ranking depend on engine/release; the book's examples are from the MyISAM era.

A FULLTEXT index represents the exact column set and parser for which it was defined. It does not retain enough token positions to answer every phrase/proximity query directly; phrase searches may fetch candidate rows to verify them. The index does not contain the full row text, so it is not covering. Ordinary conditions (`author_id`, date) may be applied after full-text has produced candidates, and sorting by a non-relevance column may require filesort. Encoding filter tokens into text, as the book demonstrates, is a benchmark-specific workaround that can become inconsistent; it does not replace an ordinary index design.

Token length and stop words affect both quality and size. Dropping short words makes an index smaller but can make `CD player` lose its meaning; dropping common terms can improve speed but remove important domain vocabulary. Changing a parser, stop-word list, or threshold often requires rebuilding the index. Updating long text can update many postings; a large index outside memory may be slow and fragmented. Measure common queries, no-result queries, candidate counts, write cost, and p95 latency. For typo tolerance, proximity ranking, multilingual search, or distributed scale, consider a dedicated search engine instead of forcing the database to handle every requirement.

### Application XA differs from internal commit coordination

Application XA needs a coordinator and participants: every participant prepares first, the coordinator records the decision, and then it asks participants to commit. If the coordinator fails or a participant remains prepared, the transaction may wait for recovery; timeouts and retries must preserve transaction identity. XA provides atomicity across compatible resources at the cost of extra exchanges and blocking risk; it is not a self-running protocol.

Internal two-phase commit coordinates an engine transaction with the binary log so data and replication logs remain consistent after a crash. It does not mean that an application is using XA. The settings described in the older book have changed; do not disable internal coordination based on historical instructions in MySQL 8.4. Choose XA when a true atomic invariant spans compatible participants. Otherwise, a local transaction with an outbox/saga is often easier to recover.

### The old query cache matched query text and managed its own memory pool

The historical cache distinguished statements and connection context precisely. Queries with the same meaning but different text/case/spacing might not share an entry; some query types were marked uncacheable. When a table changed, the cache invalidated every entry that depended on that table without analyzing which rows affected the result. This was simple, but a small write could discard many results.

In the old implementation, cache lookup happened very early, before the server fully parsed SQL; the server could not inspect every expression to prove that a query was safe. It recognized statement types simply, then some constructs or session state made a query uncacheable. This explains why a query containing a nondeterministic function was not necessarily identified by analyzing that function at lookup time: the server could execute it and later decide not to store its result. Exact rules depend on the old release and matter here only as history.

The pool held query text, table-to-result mappings, block metadata, and results. Entries were allocated in blocks; deletion or size changes could leave small gaps and fragmentation. A larger pool was not always better: invalidation/pruning under a global mutex could block both cache lookups and writes. Historical counters such as hits, inserts, low-memory prunes, and free blocks were useful only alongside throughput/latency and the read/write mix; hit rate alone could mislead.

The book recommends measuring at production-like concurrency, limiting cache/result size, and disabling the cache for write-heavy workloads or severe mutex contention. It also describes batching writes to reduce invalidation events, while warning that large batches can create long stalls. These ideas explain cache-invalidation tradeoffs; they are not MySQL 8.4 settings because the query cache has been removed. A modern cache should live at the appropriate layer, with explicit keys, TTL, capacity, invalidation, and cache-miss behavior.

The book's InnoDB/query-cache interaction also depended on MVCC: transaction visibility and table locks determined which transactions could read or populate an entry. When a transaction holding a lock committed, a table transaction counter could prevent older transactions from using the cache for that table; `SELECT ... FOR UPDATE` also made related queries uncacheable while the lock existed. This mechanism disappeared with the query cache, but the general lesson is that a server cache must respect snapshots and lock state, not just the current row contents.

Sources: *High Performance MySQL*, chapter 7; [partitioning limitations](https://dev.mysql.com/doc/refman/8.4/en/partitioning-limitations.html), [partition types](https://dev.mysql.com/doc/refman/8.4/en/partitioning-types.html), [partition pruning](https://dev.mysql.com/doc/refman/8.4/en/partitioning-pruning.html), [MERGE engine](https://dev.mysql.com/doc/refman/8.4/en/merge-storage-engine.html), [view algorithms](https://dev.mysql.com/doc/refman/8.4/en/view-algorithms.html), [view updatability](https://dev.mysql.com/doc/refman/8.4/en/view-updatability.html), [derived-condition pushdown](https://dev.mysql.com/doc/refman/8.4/en/derived-condition-pushdown-optimization.html), [foreign keys](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html), [stored objects](https://dev.mysql.com/doc/refman/8.4/en/stored-objects.html), [prepared statements](https://dev.mysql.com/doc/refman/8.4/en/prepare.html), [full-text search](https://dev.mysql.com/doc/refman/8.4/en/fulltext-search.html), [character sets](https://dev.mysql.com/doc/refman/8.4/en/charset.html), [XA](https://dev.mysql.com/doc/refman/8.4/en/xa.html), and [binary-log durability and internal two-phase commit](https://dev.mysql.com/doc/refman/8.4/en/binary-log.html).

## Check your understanding

**Does creating partitions automatically prune them for every query?** No; a query needs a predicate compatible with the partition key.

**Does a view cache its result?** Not by default; it is a query abstraction.

**An older book says query cache speeds repeated queries; should MySQL 8.4 use its directive?** No; the query cache was removed from modern MySQL.

**Does partitioning replace indexes?** No. It removes data regions at a coarse granularity; an index may still be needed to find rows quickly inside the remaining partition.

**Can a prepared statement parameterize a column name?** No. A parameter represents a value; identifiers must come from an allowlist.

**Do foreign keys affect only writes issued directly against the parent table?** No. Constraint checks and cascades can lock or update rows in related tables.

**Do XA and an outbox handle atomicity in the same way?** No. XA seeks atomic commit among protocol-capable participants; an outbox records intent in a local transaction and delivers it asynchronously.
