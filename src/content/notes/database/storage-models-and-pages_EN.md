---
title: "How Databases Store Data: Rows, Columns, and Pages"
category: "Database"
description: "Follow data from a logical record down to storage blocks to understand row stores, column stores, pages, buffers, and why physical layout affects performance."
updated: 2026-10-17
translationKey: "database/storage-models-and-pages"
---

An application asks for “order 42,” but a storage device does not know what an order is. It reads and writes regions of bytes. A database must turn a logical row into a physical format, locate the region containing that row, bring the region into memory, and make updates recoverable after failures.

## How does a request move through a DBMS?

In a client/server model, an application sends a query over transport to a database node. The query processor parses and validates syntax/objects; access control checks privileges; the optimizer uses schema, statistics, and data placement to choose an execution plan. The execution engine runs operators in that plan and may call a local storage engine or send work to another cluster node.

A storage engine coordinates several roles: the transaction manager tracks begin/commit/abort; the lock/concurrency manager handles conflicts; an access method such as a heap, hash, or B-tree finds data; the buffer manager keeps active pages in RAM; and the recovery manager uses logs to restore state after a crash. Module names and boundaries differ by product, and performance optimizations can couple them more tightly than a conceptual diagram suggests.

This gives us better questions when a query is slow: is the client waiting on network or a server queue? Did the optimizer choose a poor plan? Is the lock manager waiting? Is the buffer manager repeatedly missing? Is the storage device slow? Looking only at total time can make different causes look like “the database is slow.”

For example, consider `SELECT total FROM orders WHERE id=42`: transport receives the request; the parser checks SQL; privileges are verified; the optimizer compares a table scan with a primary-key lookup; the execution engine calls the access method; the B-tree finds the page containing the key; the buffer manager returns it from cache or requests a read; transaction/MVCC rules check the visible version; and the result returns to the client. Each step can be a different bottleneck with different metrics.

## Workload is another classification axis

**OLTP** commonly handles many short requests, small transactions, and point/range lookups; **OLAP** commonly scans large datasets for aggregates; **HTAP** combines both but must manage resource competition between scans/ingest and interactive transactions. A database can also separate frequently accessed hot data, long-retained cold history, and large blobs into different storage approaches. These describe workload, not a required file format: row/column layout, RAM/disk, and SQL/NoSQL are other classification axes.

## From a table to files and pages

A DBMS usually separates at least three layers: the logical structures queried by an application, the storage structures managed by a storage engine, and the device or filesystem that ultimately holds bytes. A single `SELECT` can pass through a parser, optimizer, access method, and buffer manager before requesting a page from the operating system.

Disks and SSDs transfer data in units larger than one SQL value. A database groups several records or index entries into a **page** (also called a block in some contexts). A page is a common unit for caching, reading, writing, and space management. Page sizes and formats depend on the engine; do not assume every database uses the same size.

A large table may span many pages. The engine needs ways to locate a page, find a row inside it, and handle a row that no longer fits in the remaining free space. It must also distinguish data pages from index pages and metadata. PostgreSQL's [page layout documentation](https://www.postgresql.org/docs/current/storage-page-layout.html) describes its header, item identifiers, and data area; InnoDB has its own record and page formats, documented in [InnoDB physical structure](https://dev.mysql.com/doc/refman/8.4/en/innodb-physical-structure.html).

Databases use their own file formats to optimize three goals together: reduce metadata/space per record, find records in fewer steps/page transfers, and update as few bytes/pages as possible. An index is an auxiliary structure mapping a search key to a row or primary key; it uses space and must be updated with data, but avoids scanning the whole table. A data file usually holds records and an index file holds lookup paths; an index-organized engine may combine both roles in one tree.

## Why do disk-resident structures differ from in-memory ones?

An HDD moves its read head and waits for the platter to rotate to another position; a random seek can cost much more than reading a contiguous run of blocks. HDD-oriented structures therefore try to reduce jumps and use sequential I/O. An SSD has no mechanical head, so random reads are usually less disadvantaged, but page/block transfers, queue depth, controller parallelism, and write amplification still matter.

NAND flash commonly reads/writes in pages but erases larger blocks. The controller's Flash Translation Layer (FTL) maps logical blocks to physical pages, collects garbage, and moves live pages before erasing a block; a small/random write can therefore trigger more internal work. Filesystem and database add buffering/logging layers above that. “SSD is fast” does not mean every random write is free, and a benchmark should use production-like devices, filesystem, queue, and block size.

## Does a database run mainly in RAM or on disk?

A disk-based DBMS keeps most of its dataset on SSD/HDD and uses RAM for cache or temporary work. A main-memory DBMS keeps the active dataset mostly in RAM; this reduces latency and permits memory-specific data structures, but RAM costs more and loses contents when a process or machine stops. “In-memory” does not answer durability by itself: the system still needs a policy for logs, snapshots, backups, and recovery.

### Durability in a main-memory system

A common path records a change in a write-ahead log before acknowledging it, then updates a disk snapshot in batches. A snapshot/checkpoint reduces the log that must be replayed after restart: if the latest snapshot is current through time T, recovery loads T and replays the log after T. A disk-based database also uses RAM for its buffer pool, but it is not equivalent to a main-memory engine whose layout, pointers, and concurrency control are designed around RAM.

## Row stores and column stores

### Row layout: fetch many fields from a few records

With **row-oriented storage**, columns from the same row are stored close together. When an application fetches an entire order by key, the engine may read a few pages containing that row's columns. This layout suits many transactional workloads: reading or changing a small number of rows while using several attributes from each row.

### Column layout: scan a few fields across many records

With **column-oriented storage**, values from the same column are stored close together. An analytical query that aggregates one column across millions of rows can read mostly that column instead of bringing every column into memory. Similar values also tend to compress well. Reconstructing a complete row may require reading several column regions, however, and updating an individual cell can involve different work.

### Vectorization, hybrid layouts, and workload limits

Do not turn this into a rule that “OLTP is always row, analytics is always column.” Engines may use hybrid layouts, store selected columns separately, or optimize for several query shapes. The useful questions are which units the workload reads and writes, how much data it scans, and how the engine actually organizes pages.

Columnar scans can also process many values of one type with vectorized operations, compress better because similar values sit together, and read only the required columns. Row layout often helps when fetching many fields from a few records; column layout often helps when scanning many records but only a few fields. Reconstructing rows or frequently updating one cell can shift the tradeoff.

### A wide-column store is not columnar analytics

A **wide-column store is not a columnar analytics store.** A Bigtable/HBase-style model looks up by row key and organizes column families, qualifiers, and timestamped versions. Rows can have different sparse qualifiers; a column family is often a physical organization/storage unit. Row-key design determines locality and range scans, so a key prefix can create a hot region if writes concentrate at one end. This model fits deliberate key or key-range access; it does not automatically replace relational joins or columnar aggregates.

## Inside a page

A page needs metadata so the database can identify its format version, count its items, locate free space, and protect integrity. A common design for a page containing variable-length records is a **slotted page**:

1. A header sits at the beginning of the page.
2. A slot array records the location and length of each cell.
3. Cells are often placed from the end of the page while the slot array grows from the beginning.
4. The gap between them is available for inserts or updates.

Slots indirectly point to cells instead of requiring a cell to stay at a fixed position. If a record moves within the same page during compaction, the engine can update its slot without changing every external reference to that data location. Exact layouts differ among engines.

A cell contains encoded fields. Numbers may use binary representations; strings may need a length and encoding; nullable values need a null marker; flags can be packed to save space. The format must support correct reading across version changes and detect damage such as a corrupted page. File formats, checksums, alignment, and upgrade rules are therefore part of storage design, not decoration.

If a variable-length value does not fit on a page, an engine may store most of it out of line and keep a pointer or metadata in the main record. This limits tuple or page size but can require extra I/O for a query. PostgreSQL uses TOAST for large values; other systems have their own mechanisms.

## An index is another storage structure

An index is not a free list attached to a table. It is a data structure with its own pages, ordered keys or buckets, row references, metadata, and maintenance costs. Depending on the engine, a table may be a separate heap with secondary indexes pointing to tuples, or the table data may be organized by a primary index. A secondary index may then point to a primary key instead of directly to a row location.

This explains why a wide primary key can make secondary indexes larger in some engines and why changing indexes requires additional writes. Details are product-specific: InnoDB organizes table data by a clustered index, while PostgreSQL heap and index structures have separate lifecycles. The note on [B-trees and indexes](../database/btree-indexes-and-maintenance/) continues with how an index finds keys.

### Data files can use heap, hash, or key order

A data file can be a **heap** (records are generally placed in write order), **hash-organized** (a bucket is selected from a key hash), or **index-organized** (records live in a key-ordered tree). Heap files make appends convenient but need an index for lookup; hash fits equality but has no range order; index-organized files support ranges by key but inserts/updates must maintain the tree.

### Index files and record locators

A secondary index can point directly to an offset/row locator or store a primary key and go through the primary index. Direct pointers save a read but must be updated when records move; indirection costs another lookup but lets the storage layer move records without rewriting every secondary index. This trades read-path work against write/maintenance cost. InnoDB uses its clustered primary index as the main row structure; PostgreSQL heap and index are separate relations.


### A primary index can add an indirection step

The names **primary key** and **primary index** describe different things. A primary key is a data-level rule: its value uniquely identifies a row. A primary index is the physical structure that finds rows by that key, or by whichever key the engine uses as its main access path. Many systems build a primary index from the primary key, but a SQL constraint and a page layout are not the same thing.

### Clustered order and physical row placement

**Clustered** describes the relationship between index order and row placement. When rows are stored in the order of a search key, the index is clustered by that key; an index that does not determine the physical order of rows is called nonclustered or unclustered in the relevant context. An index-organized table stores rows inside the index structure, so it is clustered by its organizing key. Another engine may keep a separate heap while still trying to maintain locality for an index. Terminology differs across products, so check whether documentation means row order, payload stored in leaf pages, or how secondary indexes refer to rows.

If an index is ordered by key while the data lives in a separate file, an index entry needs enough information to locate a record: perhaps an offset, row locator, or bucket ID. When a record moves, an old offset can become invalid. Indirection through a primary key reduces the number of places to update when data moves, but a secondary-index lookup may require another lookup. Some designs use a hybrid: try the offset first, then fall back through the key if the location has changed. This is a choice between read cost and index-update cost; no option is best for every workload.

### Updates and deletes can leave older versions behind

Not every storage engine immediately overwrites or removes the old bytes in a page. In some log-structured designs, an update creates a new entry for the same key, while a delete creates a **tombstone** containing the key and version or time information. Reads must select the newest valid value and avoid exposing an older copy just because it lives in another file.

Data shadowed by a newer value still occupies space until cleanup reads the relevant regions, keeps live versions, and writes them to a new location. LSM calls this work compaction; other structures have their own reclamation mechanisms. A `DELETE` can therefore finish by writing a small marker while space reclamation happens later. If a tombstone is removed too early while a replica or old run still contains the previous record, deleted data can reappear.
## Three axes for comparing storage engines

Instead of memorizing structure names alone, ask three questions:

| Axis | Question | Common tradeoff |
| --- | --- | --- |
| Buffering | Are writes collected in memory before flushing a block? | Batching amortizes I/O, but unflushed data needs log/recovery and extra memory. |
| Mutability | Are pages/files updated in place or are new immutable runs/pages created? | In-place updates reduce copying but need concurrency/recovery; immutable files support snapshots but need merge/GC. |
| Ordering | Are records stored by key or by insertion/append order? | Key order supports range scans; append order helps sequential writes but queries need other indexes/merges. |

The axes are relatively independent: a B-tree can use buffering; a Bw-tree takes B-tree inspiration but uses immutable deltas; an LSM combines a memtable, immutable sorted files, and compaction. They help explain why two engines that both call an index a B-tree can still have very different write paths and maintenance.

## A buffer cache changes how often storage is touched

Databases usually keep pages in a buffer cache to avoid reading them from the device again. If a query needs a page already in cache, that is a cache hit. If not, the engine must read it; when the cache is full, it chooses a page to evict. This helps with devices slower than RAM and with SSDs faster than disks, because I/O still has finite latency and bandwidth.

A query that reads 100 rows does not necessarily cause 100 disk reads. Several rows may share a page, the page may already be cached, and the access pattern may be sequential. Conversely, an index lookup that jumps among many pages can cause many cache misses even when it returns few rows. To reason about performance, distinguish the logical row count from the number of pages touched.

## Logical data does not reveal the whole physical layout

Two tables with the same SQL schema can use different layouts, page sizes, compression, and location methods. Physical layout affects write amplification, locality, cache hits, compression, index size, and vacuum or compaction work.

When diagnosing a workload, start with its access pattern: which columns do queries need, which keys do they filter on, do they scan sequentially or jump between pages, are writes ordered or random, and can updates make rows larger? Then inspect cache and I/O statistics, index sizes, and storage state for the actual engine. Do not infer an optimal configuration from a table diagram alone.

Foundational reading: *Database Internals*, chapters 1 and 3; *PostgreSQL 14 Internals*, the introduction on files, pages, tuples, and TOAST.
