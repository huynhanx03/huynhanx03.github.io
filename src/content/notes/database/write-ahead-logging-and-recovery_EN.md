---
title: "WAL, Buffer Caches, and Crash Recovery"
category: "Database"
description: "Learn why a database logs changes before data pages, when a commit is acknowledged, and how recovery reconstructs state after an abrupt stop."
updated: 2026-10-17
translationKey: "database/write-ahead-logging-and-recovery"
---

A database can report a transaction committed before the page containing its new data is written to the table file. If the machine loses power immediately afterward, where is the new data? The answer is commonly a write-ahead log (WAL) or redo log: the database first writes enough durable recovery information to a log, then writes data pages gradually.

## A buffer cache separates logical updates from physical page writes

Reading a storage page is usually more expensive than accessing RAM, so engines keep recently used pages in a **buffer pool/cache**. When a transaction modifies a page, the in-memory copy becomes dirty. Commit does not necessarily require every dirty page to be written immediately to its final table-file location; the engine may acknowledge commit after the required log is durable.

When the cache is full, the buffer manager must choose a page to replace. FIFO removes the page that arrived first; LRU approximates the least recently used page; CLOCK uses a reference bit to reduce the cost of exact tracking; LFU considers access frequency. A large scan can pollute the cache holding hot data, so engines often use special policies for scans or special page types. No simple replacement algorithm can predict every next access.

While a thread modifies a page, a latch protects its in-memory contents. A page being written or pinned may not yet be evictable. Transaction locks and page latches protect different scopes.

## The write-ahead rule

WAL follows a core rule: before a data page is written to durable storage, the log describing its corresponding changes must be durable. When a transaction requests `COMMIT`, the database must follow the durability policy of the product and configuration. In a typical synchronous configuration, the commit log is flushed to a durable boundary before success is returned; asynchronous modes may relax that guarantee.

Log records often carry an order such as an LSN (log sequence number). A page records the latest LSN applied to it. Recovery can then determine which log records to replay for a page without relying on whether the transaction managed to write its data page before a crash.

Two common kinds of log information are:

- A **redo log/physiological log** describes changes sufficiently to apply them again to a page, often with page and location context.
- A **logical or operation log** describes a higher-level action, such as “increment the counter” or “insert a record”; recovery interprets the action's semantics.

Many engines mix logging levels or keep different logs for different purposes. Do not assume that one system uses one logging style for everything.

Another approach is **shadow paging**: replace an old page with a copied version, keep the new page unpublished until the transaction succeeds, and then change a root/pointer to publish it. If a crash occurs before the pointer flip, readers still see the old page; if the flip is durable, the new page becomes current. This can reduce the need for traditional undo logging for those pages, but copying pages/trees and reclaiming old pages can cost more, create fragmentation, and make multi-page updates harder to batch efficiently. WAL append logs and shadow paging both need an atomic/durable publication rule; neither is free.

## Why recovery may need both redo and undo

Databases commonly allow **steal**: the buffer manager may write a page containing uncommitted changes to storage to free memory. If that transaction later aborts, recovery must remove the uncommitted change. Conversely, with **no-force**, a commit does not require every page from that transaction to be written immediately; after a crash, recovery must redo committed changes that are not yet on their pages.

Combining steal and no-force requires both undo and redo. An ARIES-style design logs enough information for recovery and follows three conceptual phases:

1. **Analysis**: read from a checkpoint to reconstruct which transactions were active and which pages may need redo.
2. **Redo**: replay the required history to bring pages to the state recorded in the log.
3. **Undo**: roll back uncommitted transactions, recording compensation log records so the undo process can itself recover if another crash occurs.

This is an explanatory model, not a claim that every database implements ARIES unchanged. Engines use different redo/undo, page-oriented logging, or snapshot designs.

## Checkpoints limit recovery work

If recovery had to scan the entire log since the database was created, startup could take too long. A checkpoint records information that lets recovery begin closer to the end of the log. A checkpoint does not necessarily mean that every page is clean or every transaction is finished; its exact meaning depends on the engine.

Checkpoints that are too frequent can increase I/O and create bursts of writes; checkpoints that are too far apart may lengthen recovery and require retaining more WAL. Engines regulate background writers and checkpoints to balance throughput, latency, and recovery time.

PostgreSQL calls its recovery log WAL; the [WAL documentation](https://www.postgresql.org/docs/current/wal.html) describes durability, checkpoints, recovery, configuration, and WAL levels. InnoDB has its own redo/undo and checkpoint mechanisms; see [InnoDB redo logs](https://dev.mysql.com/doc/refman/8.4/en/innodb-redo-log.html). The general ideas overlap, but files, configuration, and commit guarantees cannot be copied unchanged from one system to another.

## Recovery does not replace backups

Crash recovery brings a database to a consistent state using the log available. It cannot restore data that was validly deleted, incorrectly overwritten, or lost along with every durable copy. Backup and point-in-time recovery require a base copy and logs that are retained and managed correctly.

Replication is not a backup by itself either: an accidental delete may be copied to replicas. A recovery design states which failures it must tolerate, how much data it can afford to lose (RPO), how long recovery may take (RTO), and whether a restore was tested recently.

## Read a crash scenario

Suppose transaction T changes a balance from 10 to 7. The engine writes a record describing the change, then flushes the commit log. The table page remains dirty in memory. The machine crashes. On startup, recovery finds the commit record, determines that the page does not yet reflect the change, and redoes it so the recovered balance is 7. If T had not committed, recovery would undo it or otherwise ensure the uncommitted change does not become the final state.

This example omits checksums, torn pages, group commit, replica acknowledgments, and storage-device caches. To assess real durability, read the engine's sync/flush settings and consider the filesystem, device, and replication topology.

## Check your understanding

**Why can a database report a successful commit before writing a data page?** The log already contains enough recovery information and has been made durable according to the durability policy.

**Does a checkpoint remove the need to retain logs?** No. WAL may still be needed for crash recovery, replication, or point-in-time recovery; retention can discard it only when all consumers and policies allow.

**Does a completed recovery mean there is a valid backup?** No. Recovery handles a crash using available logs; a backup is needed for data loss, user errors, and restoring to a chosen point in time.

Reading: *Database Internals*, chapter 5; *PostgreSQL 14 Internals*, Part II; PostgreSQL WAL and InnoDB redo-log documentation.
