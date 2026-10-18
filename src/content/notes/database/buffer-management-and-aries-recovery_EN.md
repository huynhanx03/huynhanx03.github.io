---
title: "Buffer Pools, Page Replacement, and ARIES Recovery"
category: "Database"
description: "From page caching and eviction to WAL semantics and ARIES analysis, redo, and undo phases."
updated: 2026-10-18
translationKey: "database/buffer-management-and-aries-recovery"
---

A database cannot read every page from disk for every query, so it keeps pages in a buffer pool. The buffer manager decides which pages stay in RAM, pins them while in use, and chooses a victim when space is needed. Recovery must also ensure a dirty page is not written before its required log. These concerns are linked: eviction affects I/O, while WAL protects durability.

## Buffer hits, pins, and dirty pages

When a query needs a page, the buffer pool looks up its page ID. A hit uses the RAM frame; a miss chooses a reusable frame, writes a dirty page if needed, and reads the new page. A pin/reference count prevents replacement while an operation uses the frame; a latch protects page contents from concurrent mutation. A pin/latch is not a transaction lock.

A database can use its own buffer pool instead of letting the kernel page cache manage the file. If both caches hold the same page, it can consume RAM twice and make eviction harder for the engine to control; some engines use direct I/O to avoid the kernel cache layer. This trades database control over I/O/memory for operating-system and storage alignment, behavior, and durability requirements. A pinned page must be unpinned before it becomes an eviction candidate; a background writer may flush dirty pages before they are needed so eviction does not wait for I/O on a query path.

### Two cache layers and choosing an I/O path

Imagine the same data block in both the database buffer pool and the kernel page cache. Keeping two cached copies can avoid some physical reads, but it spends RAM on the same data and makes it harder for the engine to predict which copy will be evicted. `O_DIRECT` on some operating systems reduces or bypasses kernel caching of file contents to avoid double buffering; alignment requirements and support depend on the operating system, filesystem, device, and database engine.

`O_DIRECT` does not mean data is durable on the device. Durability still needs an appropriate flush path such as `fsync`/`fdatasync`, and the device must report writes correctly. Do not choose direct I/O only to improve a hit ratio or because of a generic benchmark. For example, MySQL 8.4 documents `innodb_flush_method` as platform-dependent and recommends measuring on production-like hardware and workloads; PostgreSQL relies on both `shared_buffers` and the operating-system cache. This is an engine- and workload-specific decision, not a universal rule.

The kernel can also receive sequential/random access advice through `posix_fadvise`, but advice does not force it to retain or discard a page. Memory mapping (`mmap`) lets a program access a file through memory addresses, while pages remain managed by the kernel page cache; a database gives up some direct control over caching/writeback in exchange for a different access path. When reading documentation or a benchmark, ask which I/O path is in use, which cache is counted, and whether the measurement uses a cold or warm cache.

A dirty page differs from disk. A database may use steal (flush a page with uncommitted changes) or no-steal; force (flush every transaction page on commit) or no-force. Steal needs undo to roll back uncommitted data; no-force needs redo to recover an acknowledged commit whose data page was not written. WAL typically must be durable before a dirty page (write-ahead rule).

The page cache separates a tree's logical page address from its location in RAM: it receives a page ID, finds the frame that contains it or reads it from its storage address, then returns a buffer to the storage engine. Since a page can occupy any frame in RAM, frame order need not match disk order. An engine can **prefetch** upcoming leaves during a range scan so I/O starts before the query needs them. Conversely, a page read for a one-pass scan can be evicted early; PostgreSQL uses a circular buffer for some large sequential scans. Pinning nodes near the root can keep upper B-tree levels in RAM and reduce disk visits. Structural changes accumulated in cache can also be written with fewer I/O operations.

## FIFO, LRU, CLOCK, and scan pollution

Replacement policy affects disk reads, but “more cache always means fewer evictions” is not true for every algorithm: **Bélády's anomaly** describes cases where adding frames increases page faults under some replacement policies. FIFO sees only load order, so it can evict a root page first even when that page is used often. LRU moves a recently accessed page to the end of its queue, but updating the list on every hit can create contention among concurrent threads.

CLOCK-sweep keeps pages and access bits in a circle. The clock hand skips a page that is currently referenced; for an unreferenced page, it clears a bit set to 1 to give the page another chance, while a bit already at 0 makes the page a victim candidate. This scan is cheaper than exact LRU; a circular buffer and compare-and-swap can keep updates compact, though behavior depends on the variant. Two-queue policies such as 2Q distinguish first touches from reused pages; LRU-K uses the last K references to estimate how hot a page is.

LFU considers frequency rather than recency. TinyLFU uses a compact histogram to estimate frequency without retaining the complete access history. In the book's model, a new page enters an admission queue, a page without proven reuse stays in probation, and a page accessed again may move to protected. When a new page is considered for retention, its frequency is compared with the victim; it is kept only when it has stronger reuse evidence. If protected is full, a page may move back to probation. This makes a one-pass scan less likely to displace hot pages, but a bounded histogram and changing workloads can still lead to poor predictions.

A large sequential scan can evict the working set (scan pollution). Buffer pools may use scan-resistant regions, pinning, or engine-specific methods; applications can also chunk queries or bound scans. Cache policy must match workload, not just maximize aggregate hit ratio.

## ARIES: analysis, redo, undo

ARIES is a WAL-based recovery model with LSNs, a dirty-page table, and transaction table. After a crash:

1. **Analysis** starts at a checkpoint and reconstructs in-flight transactions and dirty pages with their earliest `recLSN`.
2. **Redo** starts at the smallest required LSN and repeats history so every update is reflected on pages; pageLSN lets recovery skip an already applied record.
3. **Undo** walks backward through loser transactions and writes compensation log records (CLRs), making undo resumable after another crash.

For example, a transaction writes page A then B, but its commit record was not flushed at crash. Recovery may redo both updates, then undo the loser transaction so the final state contains no uncommitted change. A transaction committed before the crash is redone even if its pages were not flushed.

### Trace `recLSN`, `pageLSN`, and CLRs

The three phases give the broad order. To see how recovery decides what to do with each record, follow a small log: at LSN 10, T1 changes page P from 4 to 5; at LSN 20, T2 changes page Q; at LSN 30, T1 commits; at LSN 40, T2 changes P from 5 to 8; then the machine stops before T2 commits. At the crash, P may already be on disk at LSN 10, while Q may not have been written.

**Analysis** reads from the checkpoint and rebuilds the transaction table (T1 committed, T2 still active) and dirty page table. If P was first dirtied at LSN 10, then `recLSN(P)=10`; if Q was first dirtied at LSN 20, then `recLSN(Q)=20`. A page's `recLSN` is the earliest point at which it may be missing an update, not its most recent LSN. Redo therefore starts at `min(recLSN)=10`, rather than scanning older log records that no page needs.

**Redo repeats history**, so it considers T2's update even though T2 did not commit. For each update or CLR, the record must first belong to a page still in the dirty page table and be at or after that page's `recLSN`. Recovery then reads the page: if the `pageLSN` on disk is equal to or greater than the record's LSN, the change is already present and is skipped; if it is smaller, recovery reapplies the change and sets `pageLSN` to the record's LSN. In this example, P is at LSN 10, so record 40 is redone and its value becomes 8. This does not mistakenly commit T2: redo reconstructs the exact state at the instant of the crash before removing incomplete transactions.

**Undo** handles only losers such as T2. It follows T2's `prevLSN` chain backward, undoing the update to P and then the update to Q. Each undo creates a **compensation log record (CLR)** that can be redone but is never itself undone; it stores `undoNextLSN`, the earlier record that the next undo step should process. If the system crashes after writing the CLR for LSN 40 but before undoing LSN 20, recovery redoes the CLR to keep P at value 5, then resumes undo at `undoNextLSN=20`. The next recovery does not undo P a second time.

`recLSN` narrows the scan; `pageLSN` prevents applying a change twice to one page; a CLR records undo progress. They answer different questions and cannot replace one another. This walkthrough expands the ARIES model in chapter 5; the complete algorithm also specifies transaction and dirty-page tables, log chains, fuzzy checkpoints, partial rollback, and WAL rules. See the [original ARIES paper](https://www.cs.cmu.edu/~15849g/readings/mohan92.pdf).

During Redo, each log record is checked in order; these conditions avoid unnecessary reads or reapplication:

| Record considered for redo | Decision | Reason |
| --- | --- | --- |
| Its page is absent from the dirty-page table | Skip | Recovery has recorded no possibly unflushed update for this page since the checkpoint. |
| The record LSN is less than `recLSN(page)` | Skip | A record before this point cannot be the earliest update still missing from the page. |
| The on-disk `pageLSN` is ≥ the record LSN | Skip | The page already contains this record or a newer change. |
| The page is dirty, the record is ≥ `recLSN`, and `pageLSN` is less than the record | Redo | This change may still be missing from the page needed to reconstruct crash-time state. |

This is the page-level decision order; recovery also considers record type, log chains, and transaction state. `recLSN` bounds the log region worth examining, while `pageLSN` decides whether that specific page already has the change.

Three events are easy to confuse: **a log record was created**, **the log was durably flushed**, and **the data page was flushed**. WAL requires the relevant log to be durable before a dirty page is written; commit policy determines when an ACK is sent. `pageLSN` and checksums help identify replay/torn-page issues but cannot compensate for storage that claims a flush completed before it is durable.

Checkpoints reduce how much log must be scanned, but they are not full database snapshots or a point where old WAL can always be discarded. Log truncation depends on checkpoints, backups/replication, and consumers that still need the log.

In an ARIES-style fuzzy checkpoint, the system writes `begin_checkpoint`, lets transactions continue, and then writes `end_checkpoint` containing the transaction table and dirty-page table. The log header points to the checkpoint only after the required work is complete under the protocol. Since pages can flush asynchronously, recovery still uses each dirty page’s `recLSN` to determine where redo starts; the checkpoint does not claim every earlier page is clean. Fuzzy checkpoints avoid stopping writes to flush everything, in exchange for recovery processing the checkpoint tables and relevant log tail.

## Log semantics

A WAL is append-only; each record receives a monotonically increasing **LSN**. Records are batched in a log buffer and flushed sequentially. A transaction is acknowledged as committed only after the log is durable through its commit LSN. This differs from writing the data page: a transaction may commit while its page is still dirty in cache. A checkpoint narrows the log needed at startup, but records can be trimmed only when required pages are synchronized and no backup, replica, or consumer still needs that segment. A fuzzy checkpoint records its start and end together with a transaction table and dirty-page table; transactions keep running while it proceeds.

A **physical log** stores a before/after image or byte changes to a page; redo is direct, but tied to the layout. A **logical log** stores an operation such as “insert record X for key Y”; it expresses operation-level undo but must define which state it applies to and preserve ordering/idempotence. An engine may combine logical undo with physical redo. Shadow paging is another option: write new pages with copy-on-write, then publish them by switching a pointer from the old version to the new one.

Durability also depends on whether the operating system and storage device actually complete a flush. `fsync` requests synchronization to storage, but I/O errors and operating-system error reporting can be subtle; a database must design for, test, and react to flush failures instead of assuming that one successful call proves every page was written correctly.

### `fsync` errors can arrive late and depend on the operating system

With buffered I/O, a `write` can put data only in the kernel's page cache. The real error may appear later when the kernel writes that page to the device, so an application can see it on a subsequent `fsync`, possibly through a different descriptor open on the same file. On Linux, kernel 4.13 improved writeback error tracking: most local filesystems report an error to file descriptors that were open when the error was recorded. A descriptor opened afterward is not guaranteed to see an older error; network filesystems may track the descriptor responsible more precisely. Behavior therefore varies by filesystem and version.

This is more than a logging problem. After a writeback failure, some operating systems may not know exactly which data remains in the page cache; another `fsync` can report success even though an earlier write was forgotten. PostgreSQL 14 defaults `data_sync_retry` to `off`: a data-file flush failure raises PANIC and stops the server rather than continuing with uncertain state. Enabling `data_sync_retry` lets the server report an error and retry the flush at a later checkpoint, but should be considered only after understanding the OS and storage semantics. PostgreSQL 14 separately warns that during startup synchronization of files before crash recovery, Linux before 5.8 might not report some I/O errors to PostgreSQL; the message may appear only in the kernel log. When a flush fails, diagnose the hardware/filesystem and follow WAL recovery procedures; a successful retry alone does not prove the data is safe.

Keep three events distinct: the kernel accepted a write, writeback failure became visible, and data became durable on the device. Read [PostgreSQL 14 error handling](https://www.postgresql.org/docs/14/runtime-config-error-handling.html), [Linux `fsync(2)`](https://man7.org/linux/man-pages/man2/fsync.2.html), and [Linux VFS writeback errors](https://www.kernel.org/doc/html/latest/filesystems/vfs.html#handling-errors-during-writeback) for the deployed OS and filesystem.

Recovery must handle torn pages, checksums, partial writes, doublewrite/copy-on-write, and disk-flush behavior specific to the engine. This is why WAL, checkpoints, and buffer eviction form one protocol: a dirty page cannot be forgotten while the log needed to reconstruct or undo it is gone.

*Database Internals*, chapter 5, uses ARIES as a recovery framework and analyzes cache replacement. Compare engine semantics in [InnoDB redo log](https://dev.mysql.com/doc/refman/8.4/en/innodb-redo-log.html), [MySQL 8.4 `innodb_flush_method`](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html#sysvar_innodb_flush_method), [PostgreSQL 14 resource consumption](https://www.postgresql.org/docs/14/runtime-config-resource.html), [Linux page cache](https://docs.kernel.org/6.10/mm/page_cache.html), [PostgreSQL WAL](https://www.postgresql.org/docs/current/wal-intro.html), and [SQLite atomic commit](https://www.sqlite.org/atomiccommit.html).

## Check your understanding

**Why does no-force need redo?** A commit can be durable while its data page has not yet been flushed.

**Why does steal need undo?** A page with uncommitted changes may already have reached disk.

**Is CLOCK exact LRU?** No; it is a lower-overhead approximation.
