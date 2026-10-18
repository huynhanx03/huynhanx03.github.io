---
title: "PostgreSQL Architecture and On-Disk Data Layout"
category: "Database"
description: "Follow a row from a logical table to pages, tuples, TOAST, and PostgreSQL server processes."
updated: 2026-10-17
translationKey: "database/postgresql-architecture-and-data-layout"
---

When PostgreSQL runs a `SELECT`, it does not open a file named after the table and read it like a spreadsheet. A cluster contains databases; each database has schemas and relations; relations map to files, forks, and pages. These layers help explain table size, cache misses, vacuum, and why an update can add data instead of overwriting an old row.

## Cluster, database, and relation

In PostgreSQL, a **cluster** is a data area managed by one server instance; “cluster” here does not necessarily mean multiple machines. It contains databases. A normal connection works in one database. A database contains schemas, and schemas contain tables, indexes, views, sequences, and other objects.

Tables and indexes are **relations**. System catalogs store their metadata: OIDs, relation kinds, columns, constraints, and storage locations. Because names are metadata rather than physical filenames, do not locate or edit files in `PGDATA` while the server is running. Use SQL catalogs or supported tools to inspect them.

## Files, forks, and pages

A large relation is split across segment files, each with a size limit that avoids one enormous file. A relation can have several **forks**: the main fork stores primary data; the free-space map (FSM) estimates which pages have room; the visibility map (VM) records pages that can skip some visibility checks or support index-only scans; an init fork is used to reset some unlogged relations after initialization.

Files are divided into fixed-size pages, commonly 8 KiB in the default build, though page size is a build-time property. A heap page has a header, line pointers, and tuple area. Line pointers reference tuples; tuples need not be packed in row order. After tuple growth or replacement, free space can be scattered across a page.

```text
relation file → page
                 ├─ page header
                 ├─ line pointers → tuple A, tuple B
                 └─ free space
```

A page contains checks and LSN-related information. PostgreSQL relies on page layout to find and validate data; checksums, depending on build and configuration, can help detect corruption but do not repair it.

## Heap tuples and TOAST

The default table organization is a heap: tuples are generally stored where space is available, not in primary-key order. A tuple carries transaction metadata such as `xmin` (the transaction that created the version) and `xmax` (the transaction that deleted or superseded it), along with a NULL bitmap, metadata, and column values. Representation varies by version and data type; SQL is a more stable interface than binary details.

A very large value does not have to fit in the row's page. TOAST can compress or move it to a secondary relation, leaving a pointer in the main tuple. This lets PostgreSQL store large `text`, `jsonb`, and other values, but reading may require more page access and decompression. TOAST does not make large rows free: consider payload size, read frequency, updates, and table boundaries.

## Server processes and shared memory

PostgreSQL uses a process model: a parent manages the server, and each client is usually served by a backend process; background processes handle checkpoints, WAL writing, background writing, autovacuum, and other work. Shared memory contains shared buffers and synchronization structures. Each backend also has private memory for sorts, hashes, and query state. Since every connection has a process and memory overhead, too many connections are costly; a pooler often helps cap active backends.

When a backend reads a page, it checks shared buffers first. If the page is absent, the operating system or storage supplies it to the database cache. `EXPLAIN (ANALYZE, BUFFERS)` reports buffer activity for a query, while system statistics provide a wider view. A PostgreSQL “read” statistic can mean loading into shared buffers; it does not necessarily mean physical I/O because the OS page cache may serve the data.

## From SQL to catalogs

The client sends a command over the PostgreSQL protocol. The parser builds a syntax tree, analysis resolves names and types using catalogs, rewrite applies rules and views, the planner chooses a plan, and the executor runs it. Catalogs tell PostgreSQL what a relation is; row data lives in heap and index storage, not in the catalogs.

*PostgreSQL Internals* describes version 14. Its concepts around relations, pages, tuples, forks, and backends are useful, but byte layouts and process names must be checked against the target release and build. At the time of writing, the current PostgreSQL documentation is version 18. See [database physical storage](https://www.postgresql.org/docs/current/storage.html), [database page layout](https://www.postgresql.org/docs/current/storage-page-layout.html), [TOAST](https://www.postgresql.org/docs/current/storage-toast.html), and [server processes](https://www.postgresql.org/docs/current/progress-reporting.html).

## Debug from logical to physical

First confirm the database, schema, relation, size, and statistics with SQL. Then inspect the query plan, buffers, bloat indicators, vacuum progress, and configuration. Read raw files or pages only with specialized tools and a safe copy; never edit pages by hand. For moving data between machines, use supported backup/restore or replication instead of copying live relation files.

## Learn the system by checking it yourself

The conclusion of *PostgreSQL Internals 14* argues that a book's lasting value is not just a list of facts; it is a way to ask questions and examine the system. Documentation, books, and online answers can become stale or omit context. Use them to form a hypothesis, then verify it against the release you run.

A compact verification loop looks like this:

1. Record the question, `server_version_num`, relevant settings, and workload.
2. Predict what should happen before running it: which index the plan will use, how many buffers it will touch, or which operation should wait.
3. Try it with representative data in a safe environment. For read queries, compare `EXPLAIN (ANALYZE, BUFFERS)` with catalog and monitoring data; remember that `ANALYZE` executes the statement.
4. Change one condition at a time, save the plan and results, and check whether the evidence supports the hypothesis.
5. If results differ from the documentation, check the release, settings, schema, and matching source code before generalizing the behavior.

For example, if you expect an index-only scan not to visit the heap, do not rely on the plan-node name alone: inspect `Heap Fetches`, visibility-map/buffer activity, and the result after vacuum on a test copy. The goal is to understand the conditions that produce the behavior, not memorize an answer detached from its version and data.

## Check your understanding

**Does `PGDATA` contain one readable file per table?** No. A relation can have multiple segments and forks, whose physical identity is managed by the server.

**Is 8 KiB always the page size for every PostgreSQL build?** No. It is common; page size is chosen at build time.

**Does a TOAST pointer mean the large value is already in RAM?** No. It means the value is stored outside the tuple; reading it may still require page access and decompression.

Sources: *PostgreSQL Internals 14*, introduction, “Pages and Tuples,” and “Conclusion” (p. 619); [PostgreSQL 18 Documentation: Database Physical Storage](https://www.postgresql.org/docs/current/storage.html).
