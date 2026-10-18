---
title: "MySQL Architecture and Storage Engines"
category: "Database"
description: "Follow a query through MySQL's layers and distinguish the server's responsibilities from InnoDB and other storage engines."
updated: 2026-10-18
translationKey: "database/mysql-architecture-and-storage-engines"
---

MySQL is a database server that can use several storage engines. An application sends SQL through a connector; the server authenticates the connection, parses and plans the query; a storage engine performs physical table reads and writes. This boundary explains why two tables on the same server can differ in transaction, locking, indexing, and crash-recovery support.

## Which layers does a query pass through?

A client uses the MySQL protocol over TCP or a socket. The server manages connections, authentication, and privileges, then parses syntax, checks names and types, applies rewrites, and invokes the optimizer. The optimizer chooses an access path; the executor coordinates with the storage engine to read or change rows. The server formats results and sends them back to the client.

The server layer provides shared services such as SQL parsing, the optimizer, privilege system, data dictionary, logging/replication interfaces, and protocol. A storage engine owns table/index storage, locking, transaction semantics, and some recovery mechanisms. So the question “Does MySQL support X?” should be refined: is X in the server or engine, which engine does this table use, and how is it configured?

In a transaction that touches tables from several engines, atomicity may differ from a transaction using only InnoDB. Avoid mixing transactional and nontransactional engines when the application needs a uniform rollback; read the rules for each table type.

### A connection retains state across statements

A client opens a TCP/socket connection, negotiates the protocol and TLS if configured, then authenticates an account against its host and privileges. After connecting, the server handles commands in a session and retains session state such as a transaction, isolation level, user/system variables, temporary tables, prepared statements, character set, and default schema. Closing the connection releases that state; a connection pool reuses connections, so state must be reset or managed carefully when a connection moves between users' requests.

Pooling reduces handshake and thread creation costs, but a connection holding a transaction or temporary table is not an “idle” resource. Pool limits must balance against the concurrency CPU, locks, buffer pool, and storage can handle. Raising `max_connections` mostly increases queueing capacity and per-connection memory when the workload is already saturated. The thread cache reuses threads on some paths; it is not an application connection pool and does not limit sessions.

In MySQL 8.4, the default model still uses one execution thread per client connection; Enterprise Thread Pool is a separate server-side mechanism that schedules statements through thread groups when there are many sessions. It does not replace an application connection pool: a connection pool reduces connection setup costs and manages sessions, while the server thread pool manages how many threads execute statements concurrently. These mechanisms live at different layers and address different pressure. See [MySQL Enterprise Thread Pool](https://dev.mysql.com/doc/refman/8.4/en/faqs-thread-pool.html).

### The optimizer proposes a plan; the executor runs it

The parser checks syntax and builds an internal representation; the resolver finds objects/columns and checks privileges; the optimizer considers join order, indexes, predicate transformations, and cost estimates; the executor runs iterators/operators and calls the handler API to read or write through a storage engine. A storage engine does not parse SQL or plan the whole query: it receives access requests through the server interface and returns rows/cursors/status. A plan that looks fast can still be slow because of bad estimates, skewed data, cache misses, lock waits, a slow client, or a large result transfer.

This boundary explains why `EXPLAIN` can describe access-path choices but not all endpoint costs. For a slow query, combine the plan with actual rows/loops, engine waits, connection-pool state, and application timing. See the [query-planning lesson](./mysql-query-planning-and-execution_EN.md) for a complete walkthrough.

## Lock granularity is an engine decision

Two clients changing the same data need coordination to avoid overwrites or corrupted state. Locks protect correctness, but each lock has allocation, checking, holding, and release costs. Broad locks reduce the number of locks to manage but block unrelated work; narrow locks increase concurrency while requiring more metadata and possibly creating deadlocks. No granularity fits every workload.

The MySQL server has some SQL/object-level locks; storage engines control locks tied to records/indexes and transactions. MyISAM mainly uses table-level locking, while InnoDB coordinates record/range locks with MVCC. The same `UPDATE` can therefore have different concurrency, rollback, and crash behavior on different engines. `LOCK TABLES` at the server layer is not a replacement for a transaction or engine-level row lock. MySQL 8.4 recommends avoiding it; to get exclusive write access to selected rows, use a transaction with `SELECT ... FOR UPDATE`. See [InnoDB best practices](https://dev.mysql.com/doc/refman/8.4/en/innodb-best-practices.html).

A deadlock is a cycle in a wait-for graph, not necessarily a server bug. If transaction A holds row 1 and waits for row 2 while transaction B holds row 2 and waits for row 1, neither can proceed. The engine detects the cycle and rolls one side back; the application should retry the whole transaction with bounded/backoff behavior and operations safe to retry. Consistent access order and shorter transactions reduce deadlock likelihood. See [concurrency control](./concurrency-control-mvcc-and-locks) for isolation and locks in depth.

## A transaction defines a boundary across statements

A transaction groups changes into one commit/rollback unit. In MySQL 8.4, InnoDB has `autocommit` enabled by default: each successful statement is usually its own transaction. A transfer needs debit and credit inside one `START TRANSACTION ... COMMIT`; if a later step fails, use `ROLLBACK`. This guarantee comes from a transactional engine for the tables it touches; it is not a global promise covering every engine or files outside the database.

Some DDL statements cause an implicit commit under MySQL's rules; do not assume an `ALTER TABLE` can roll back together with earlier DML. Also, “transaction committed” does not mean every replica has applied it, a cache has refreshed, or a message has reached another service. Those boundaries need application-level outbox/CDC, idempotency, and reconciliation. See [ACID](./acid), [MVCC and locks](./concurrency-control-mvcc-and-locks), and [WAL/recovery](./write-ahead-logging-and-recovery) for the deeper mechanisms.

## InnoDB is the important default

In MySQL 8.4, InnoDB is the default storage engine. It provides transactions, crash recovery, MVCC consistent reads, row-level locking, foreign-key constraints, clustered indexes, and a buffer pool. An InnoDB table is commonly organized by its primary key: clustered-index leaves contain row data; secondary-index entries usually carry the primary key to find a row. A wide primary key can make secondary indexes larger.

The buffer pool keeps data and index pages in RAM. Redo/undo support commit, recovery, and versioning; background threads flush dirty pages, purge obsolete versions, and handle change-buffer/adaptive mechanisms according to version and configuration. See [InnoDB architecture](https://dev.mysql.com/doc/refman/8.4/en/innodb-architecture.html), [multi-versioning](https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html), and [physical structure](https://dev.mysql.com/doc/refman/8.4/en/innodb-physical-structure.html).

Variable names and defaults change across releases. For example, MySQL 8.4 differs from MySQL 8.0 in some InnoDB defaults; do not copy an old benchmark configuration into production unchanged.

## Other storage engines serve different needs

| Engine | Model and limitations to understand |
| --- | --- |
| InnoDB | Transactional, row locks, MVCC, foreign keys, crash recovery; the MySQL 8.4 default. |
| MyISAM | Table-level locking and no InnoDB-style transactions; historically used for read-mostly workloads but not a replacement for InnoDB when transactional recovery/locking matters. |
| MEMORY | Tables live in RAM and lose data after server restart; suited to temporary areas or non-durable caches, with type and locking limits. |
| CSV | Stores delimited text; useful for data exchange but has distinct scan and update behavior. |
| ARCHIVE | Compressed/append-oriented for archived data; indexes and update capabilities are limited. |
| BLACKHOLE | Accepts writes without retaining rows; can help in some replication/logging flows but is not data storage. |
| MERGE | Presents compatible MyISAM tables as a logical group; inherits MyISAM characteristics. |
| FEDERATED | Accesses a remote server's table; network and remote failures become part of the query path. |
| NDB Cluster | A distributed shared-nothing engine with transactions and operations unlike InnoDB; it is not included in every standard MySQL Server binary. |
| XtraDB | An InnoDB-compatible branch in some historical distributions; check the product, status, and differences for the specific version. |
| TokuDB | A historical engine using Fractal Trees for write-heavy/large data; it is not a default option in current MySQL. |
| Infobright / InfiniDB | Columnar engines for analytics/warehousing; they reduce column reads and use compression/metadata, but belong to separate distributions. |
| Aria / PBXT / Falcon | Historical names in the MySQL/MariaDB ecosystem; do not treat descriptions in an older edition as current deployment recommendations. |

Engines can differ in lock granularity, transactions, indexes, row formats, storage, backups, replication, and SQL features. The [storage engine table](https://dev.mysql.com/doc/refman/8.4/en/storage-engines.html) and [pluggable architecture](https://dev.mysql.com/doc/refman/8.4/en/pluggable-storage-overview.html) are starting points; confirm the engine exists in the target distribution.

Changing `ENGINE` with `ALTER TABLE` may rebuild data and need time, temporary space, locks, or a migration plan. The server may also fall back to its default if a requested engine is unavailable; enabling `NO_ENGINE_SUBSTITUTION` turns that confusion into a clear error instead of silently creating the table with another engine.

When inspecting a real table, do not rely only on the schema migration. `SHOW TABLE STATUS` or corresponding `INFORMATION_SCHEMA` metadata can show the engine, row format, estimated row count, data/index size, collation, auto-increment, and other table details. This is a quick way to catch a table using the wrong engine or growing unexpectedly; values may be estimated or engine-dependent, so they do not replace optimizer statistics or workload measurement. Exact fields also vary by version.

The book explains that table definitions were stored in `.frm` files at the time, while the engine stored rows/indexes. Do not apply that file layout to current MySQL: the data dictionary has changed. The lasting idea is that server schema metadata and engine data files are separate layers; database/table case sensitivity still depends on the OS and `lower_case_table_names`.

## Engines differ in storage and failure behavior

MyISAM shows the tradeoff between low overhead and weaker safety. It uses table locks and has no transactions or InnoDB-style crash recovery; a table commonly separates data in `.MYD` from indexes in `.MYI`, with fixed or dynamic rows depending on the schema. Some append operations can run concurrently with readers, but updates/writes generally contend on the table lock. The engine has full-text indexes and some prefix-index support for `TEXT`/`BLOB`; these are engine capabilities, not an automatic reason to choose it for transactional tables. `CHECK TABLE`, `REPAIR TABLE`, or `myisamchk` can check/repair structure after a failure, but they do not roll back transactions; damaged rows may be lost. The key cache can also become a contention point at high concurrency.

Some versions support delayed index writes with `DELAY_KEY_WRITE`: this reduces small writes while running, but a crash can corrupt indexes. Compressed MyISAM suits immutable data, reducing space/I/O while retaining indexes, but the table is read-only until unpacked. These file/row and engine-specific details belong to the book’s historical context; verify them against the exact MySQL/MariaDB release before depending on them.

Special-purpose engines also have limits that are easy to confuse:

- **ARCHIVE** in the book is described as favoring inserts/logging by buffering writes and compressing records; reads often scan the table. It has a few distinct consistency behaviors—for example, a read sees rows that existed when its query began, and bulk inserts become visible only when complete—but these are not InnoDB transactions or rollback. Check engine features and status in the target release.
- **CSV** supports text-file interchange but does not provide ordinary engine indexes.
- **MEMORY** keeps rows in RAM and loses data after restart; a user-created MEMORY table is not automatically converted to disk when it exceeds a limit. It has table locking and its own type/layout limits, so it is not simply a faster InnoDB. It differs from `CREATE TEMPORARY TABLE`: a temporary table is a connection-scoped visibility/lifetime property and may use another engine. The book says internal temporary tables could spill from MEMORY to MyISAM; in MySQL 8.4, the server uses TempTable for in-memory internal temporary tables and InnoDB for on-disk ones. See the [MEMORY engine](https://dev.mysql.com/doc/refman/8.4/en/memory-storage-engine.html) and [internal temporary tables](https://dev.mysql.com/doc/refman/8.4/en/internal-temporary-tables.html) documentation.
- **BLACKHOLE** discards inserted data; statement logging/replication may still occur. It is not data storage, and replication tricks need careful evaluation.
- **FEDERATED** makes the remote server part of query latency and the failure path.
- **NDB Cluster** has its own distributed shared-nothing architecture; do not conflate its semantics with InnoDB merely because both use MySQL's SQL layer.

The book also describes XtraDB, PBXT, TokuDB/Fractal Tree, Infobright, and InfiniDB. These represent the ecosystem at publication time. The durable lesson is to match data layout to workload: row stores suit ordinary record access/transactions; column stores can help when reading a subset of columns across very large datasets with effective compression. Verify engine names, support, licensing, and maintenance status separately.

## Choose an engine from workload and migration plan

Do not choose based on “MyISAM is faster than InnoDB.” Ask whether transactions/constraints are required, what online backup and crash recovery must provide, how reads/writes and access paths behave, how capacity/indexes grow, and whether the engine has a required feature. InnoDB is usually the transactional default; use another engine when its measured benefit justifies its limitations.

| workload in the book | current design lesson |
| --- | --- |
| Large logging/ingest | Separate ingestion from reporting with replicas, time buckets/partitions, or another pipeline; do not trade crash safety for an insert win on a small benchmark. |
| Read-heavy catalog | Measure real queries and cache behavior. A fast table lock or `COUNT(*)` in one engine does not represent all queries and concurrency. |
| Order processing | Transactions, constraints, and recovery matter; prefer a transactional engine and keep business steps within the right transaction boundary. |
| Forum with hot counters | An engine swap does not fix N+1 queries, hot rows, or aggregate-counter contention; profile and redesign queries/counter strategy. |
| Immutable/packaged data | Compression helps if it reduces I/O; account for read-only semantics and update/restore workflows. |
| Very large warehouse | Compare columnar/analytic engines on the real workload instead of extrapolating from OLTP row lookups. |

Engine conversion can use `ALTER TABLE ... ENGINE=...` (often a copy/rebuild), dump/import, or a new table populated with batched `INSERT ... SELECT`. Batches limit oversized transactions/logs but require a consistent snapshot and a way to catch up concurrent writes without losing changes. Online schema-change tools can reduce downtime but introduce trigger/copy/cutover failure modes. Before cutover, compare row counts/checksums, indexes/constraints, query plans, replication lag, and rollback path; do not assume engine-specific features survive conversion.

### Version context in the book

The history chapter describes releases 3.23–5.x and a time when 5.6 was still upcoming; it explains why MySQL has a server layer and storage-engine API, not which version to choose today. The development-model section distinguishes development milestones/lab previews from GA: before deployment, use a supported release, check lifecycle, and test the upgrade path. Query cache, engine plugins, file formats, and forks must be checked against the specific MySQL version/distribution; “drop-in compatible” does not guarantee matching replication, backup, data dictionary, or execution behavior.

## Read older books against the current version

*High Performance MySQL* explains the server architecture, engines, and history, but many examples belong to versions older than MySQL 8.4. A prominent example is the **query cache**: older editions describe a cache of query results, but the query cache was removed from newer releases; MySQL 8.4 docs say it has been removed. Do not apply `SQL_CACHE`/`SQL_NO_CACHE` directives from the book to a current server. The [SELECT documentation](https://dev.mysql.com/doc/refman/8.4/en/select.html) states its current status.

When evaluating a feature, record the MySQL version, engine, edition, and topology. Features such as InnoDB Cluster, NDB, MySQL Enterprise Backup, or MySQL HeatWave may not be available in the same installation package or edition.

## The timeline explains why the server has multiple layers

The book's history helps explain how architectural decisions accumulated. MySQL 3.23 brought MyISAM, full-text search, and replication into widespread use; InnoDB was not always included in standard binaries at the time. 4.0 bundled InnoDB more broadly, added SSL, and improved replica threading; 4.1 expanded SQL, UTF-8 character sets, and prepared statements/binary protocol; 5.0 added views, triggers, stored procedures/functions; 5.1 added partitioning, row-based replication, and plugin APIs; 5.5 made InnoDB the default, expanded Performance Schema, and removed many legacy behaviors. Appendix A continues the story through forks and distributions.

This is a timeline from an older edition, not a current feature chart. In particular, “5.6 coming soon” and “6.0 canceled” only make sense in the book's publication context. When choosing a server release, compare lifecycle, support window, deprecations, bug fixes, upgrade path, and required features in current documentation; do not choose based on historical benchmark or release advice.

## Historical benchmarks teach how to read results, not how to configure

The book measured older MySQL versions with a read-only workload, a 2.5 GB dataset in a 4 GB buffer pool, a machine with multiple CPUs/RAM, and several concurrency levels. Results show that a build can be slower for one thread yet scale better at higher concurrency; added features and code paths can add overhead to a very simple query. The lesson is that performance depends on workload, hardware, cache state, and concurrency.

The transactions/second figures, server model, versions, and conclusions do not represent MySQL 8.4. Treat them as an example of measurement design: warmup, a steady-state window, periodic samples, and a concurrency sweep. To compare current releases, keep data distribution and durability policy constant, use realistic read/write workloads, repeat runs, retain raw time series, and compare p95/p99, errors, resources, and throughput. See the [benchmarking lesson](./mysql-measuring-and-tuning-performance_EN.md).

## Evaluate MySQL distributions and forks

Appendix A describes Percona Server, MariaDB, Drizzle, and Linux-distribution builds as they existed at publication time. These choices are not the same kind of product: **Percona Server** aims to stay close to MySQL while adding instrumentation/features; **MariaDB Server** follows a separate development branch with a growing set of differences; **Drizzle database server** is a fork discussed in the book's historical context, so assess its project status and supportability before treating it as a production option. The name Drizzle is also used by a separate TypeScript ORM project today, so distinguish them. A Linux distribution package may also differ from upstream in build flags, patches, and lifecycle.

### Three development directions in the book's context

In the edition described by the book, Percona Server grew from patches for concrete operational problems. Its three stated goals were **transparency** (more status, instrumentation, and slow-log detail to inspect the server), **performance** (speed, scalability, and latency predictability, with much focus on InnoDB), and **operational flexibility** (removing limits that made operations harder). The book presents it as a compatible replacement with Percona XtraDB standing in for InnoDB at the time; some improvements later appeared upstream or were reimplemented. This is historical context, not a promise of file-format or drop-in compatibility across every current Percona/MySQL release.

MariaDB in that context pursued community development and broader server, optimizer, replication, and storage-engine changes. The book cites Aria for internal temporary tables, XtraDB, SphinxSE, and PBXT; it also describes optimizer work on subqueries/joins, hash joins, dynamic columns, role-based access control, and microsecond timestamps in a particular release. Do not carry that feature list or performance comparison into a current release: MariaDB and MySQL are now separate product lines, so check version-specific compatibility, especially for replication, engines, authentication, SQL behavior, and data formats.

The book calls Drizzle a true fork that is not application-compatible with MySQL because SQL and behavior changed. Its design aimed for a lean server for web workloads, removing legacy behavior and choices; a microkernel architecture placed many features in plugins. Historical examples include a simplified type/character-set set, Protocol Buffers for replication, and benchmarks focused on high concurrency. These details explain the project's direction; they are not a recommendation to install Drizzle today.

Beyond those three names, the book mentions custom builds maintained by large companies, smaller forks, and Linux packages that could contain upstream-divergent patches/builds while retaining the MySQL name. Binary provenance is therefore an operational concern: record the vendor, repository, package version, build options, patch policy, and support owner. A product name alone is not enough to reproduce server behavior.

The appendix's closing selection advice reflects its time: consider Percona Server for closeness to MySQL plus instrumentation/performance, MariaDB for a broader set of community changes, or Drizzle for a minimal core when incompatibility is acceptable. Another practical reason to choose a variant is who controls the source and can fix a bug: a vendor can support its own fork but cannot decide whether a patch enters upstream. Turn that principle into current questions: which feature is required, who owns bug response, what are the SLA/support window, and are upgrade and rollback paths supported?

A similar protocol or the phrase “drop-in replacement” describes one layer of compatibility. It does not prove identical plans, GTIDs, replication, plugins, binary logs, defaults, data dictionaries, backup formats, or upgrade paths. MariaDB’s replication-compatibility matrix depends on versions and source/replica direction. Percona Server now has separate 8.4 documentation and a feature comparison with MySQL; compare each feature you use instead of inferring from shared ancestry.

Before changing distributions, build a compatibility matrix for SQL/DDL, collations/charsets, routines, engines, plugins, authentication, replication topology/GTIDs, backup/restore tools, monitoring agents, connectors, OS packages, and support windows. Test restoring a backup on the target, replaying workload or validating query plans, practicing failover/rollback, and moving a reversible canary before cutover. Confirm downgrade support in particular: once the data dictionary or file format has been upgraded, an older binary may no longer be supported.

Current references: [Percona Server for MySQL 8.4](https://docs.percona.com/percona-server/8.4/), [Percona Server/MySQL feature comparison](https://docs.percona.com/percona-server/8.4/feature-comparison.html), [MariaDB and MySQL compatibility](https://mariadb.com/docs/release-notes/community-server/about/compatibility-and-differences/mariadb-vs-mysql-compatibility), and [replication compatibility](https://mariadb.com/docs/release-notes/community-server/about/compatibility-and-differences/replication-compatibility-between-mariadb-and-mysql).

## When should another engine be selected?

Choose another engine only when there is a measured requirement InnoDB does not meet and the limits in transactions, recovery, concurrency, schema, backups, monitoring, failover, and team operations are acceptable. A transaction may touch several tables; multiple engines increase the number of models to understand and complicate backup/recovery procedures.

Before migrating a large table, confirm disk headroom, copy/rebuild duration, metadata locks, replication lag, and rollback path. `ALTER TABLE ... ENGINE=...` may read and rewrite all data/indexes; on an active table that can compete for I/O and hold locks. Test on a copy of comparable size, measure impact, use an appropriate online tool if needed, then validate row counts, constraints, indexes, query plans, and replication. Short syntax does not make a migration risk-free.

Database/table names can also depend on the filesystem and `lower_case_table_names`. This setting must be selected when initializing the data directory and cannot be changed casually afterward. Keep casing consistent in schema/code and test dump/restore across operating systems before moving environments; an application on a case-insensitive filesystem may hide errors that appear on Linux.

## Check your understanding

**If the MySQL server supports transactions, does a MEMORY table support transactions too?** No. Transactions are an engine/table capability; MEMORY does not provide transactions like InnoDB.

**Can every MySQL installation be assumed to include NDB?** No. NDB Cluster has separate distributions and requirements.

**Should the query cache be used because the book says repeated queries become faster?** Not on MySQL 8.4; the query cache was removed. Measure an application cache, buffer pool, or current mechanism instead.

Reading: *High Performance MySQL*, chapter 1 (PDF pp. 31–64); [connection interfaces](https://dev.mysql.com/doc/refman/8.4/en/connection-interfaces.html), [storage engine architecture](https://dev.mysql.com/doc/refman/8.4/en/pluggable-storage-overview.html), [transaction/commit](https://dev.mysql.com/doc/refman/8.4/en/commit.html), [identifier case sensitivity](https://dev.mysql.com/doc/refman/8.4/en/identifier-case-sensitivity.html), and the storage engine/InnoDB sections of the [MySQL 8.4 Reference Manual](https://dev.mysql.com/doc/refman/8.4/en/).
