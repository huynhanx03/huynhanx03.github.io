---
title: "InnoDB Pages, B-trees, and Flushing"
category: "Database"
description: "Follow a row from its clustered index through pages, the buffer pool, redo, doublewrite, and checkpoints in MySQL."
updated: 2026-10-17
translationKey: "database/mysql-innodb-pages-and-flushing"
---

InnoDB reads and writes data in **pages**, not as independent fields. A query that fetches one row usually has to locate the page containing it; several rows on one page may be served by one read. Row width, key order, B-tree depth, and cache hits therefore affect latency.

## From a table to pages

Every InnoDB table has a clustered index. Its B-tree leaf pages contain table records ordered by primary key; internal pages hold separator keys and pointers to child pages. A secondary index is another B-tree, but each leaf entry contains the secondary key plus the primary key used to find the row. If a query needs only columns already present in a secondary index, the engine can avoid the lookup back to the clustered index: this is a covering index.

A page has a header, directory/slot metadata, records, and free space. Inserting into a page with room is relatively cheap. When a page fills, InnoDB may split it: create another page, distribute records, and update the parent. Increasing-key inserts often have better locality than random keys, but can still create contention and splits at the right edge. Wider indexes fit fewer entries per page, can make the tree taller, and reduce how many keys fit in cache.

InnoDB groups pages into tablespaces and extents for physical allocation. A file-per-table setup does not mean one file always corresponds to one kind of data or that all metadata sits next to rows. System, undo, temporary, and redo tablespaces have distinct roles; inspect the actual configuration before inferring meaning from filenames.

## Buffer pool and dirty pages

For a read, InnoDB checks the buffer pool. A cache hit avoids I/O; a miss reads the page from storage into memory. An update usually changes the buffer-pool copy first, marks it **dirty**, and records redo so the change can be reconstructed after a crash. The data page can be flushed later, so commit need not wait for every transaction page to reach its final on-disk location.

The buffer pool needs room for the active workload. Too little memory causes repeated storage reads; too much can push out the OS cache or application. A one-time sequential scan can also evict useful pages, so InnoDB uses a multi-part LRU and read-ahead strategies. Track hit behavior alongside latency, dirty-page age, and I/O; a high hit ratio by itself does not prove a healthy system.

## Redo, doublewrite, and checkpoints

Redo is an ordered change log used to replay changes that were made durable when crash recovery is needed. Data pages are written page-wise; power loss during a write can leave a torn page if the device does not write atomically. Doublewrite writes a complete page to an intermediate area before its final location, giving recovery a valid copy for torn-page cases. Details and optimizations depend on version, filesystem, and device.

A checkpoint advances as dirty pages are flushed far enough to limit how much redo must be replayed after a crash. If the application dirties pages faster than the system flushes them, checkpoint age grows and can eventually create write pressure even before a query hits a CPU limit. Flushing too aggressively creates competing I/O. Background flushing, redo capacity, and workload need to be balanced using measurements.

The book describes the older circular redo log using `innodb_log_file_size` and `innodb_log_files_in_group`. MySQL 8.4 uses `innodb_redo_log_capacity`; too little capacity makes checkpointing chase writes and can force urgent flushing, while too much can increase the recovery work after a crash. Choose based on redo generation rate, dirty-page age, checkpoint pressure, and recovery time tested in practice, not a fixed ratio of database size. `innodb_log_buffer_size` is RAM for redo before it is flushed; increasing it mainly helps large transactions avoid flushing before commit. It does not make the log more durable unless the durability policy also changes.

### Commit durability and flushing

`innodb_flush_log_at_trx_commit=1` writes and flushes redo for every commit. With `2`, redo is written at commit but flushed to durable storage periodically; with `0`, both writing and flushing happen periodically instead of per commit. Looser values can lose recent transactions on a crash, depending on the interval; the application must explicitly accept that window. With binary logging, `sync_binlog=1` synchronizes the binlog at each commit to reduce the risk of data and replication logs diverging. The two files use separate I/O paths, so storage latency and the reliability of a controller cache matter directly. Check the target release's semantics/defaults and recognize that process crash, OS crash, and power loss have different failure boundaries.

Group commit combines a group of commits into fewer I/O operations. The version in the book was constrained by the binary log/InnoDB interaction, but do not assume that behavior applies to MySQL 8.4. Keep both commit settings appropriate for the current release, measure fsync/commit latency, and confirm that storage honors flushes. A battery-backed write cache can reduce latency safely during power loss; an unprotected write-back cache can make durability settings ineffective.

`innodb_flush_method` controls interaction between the buffer pool and the operating-system page cache. The book compares buffered I/O with `O_DIRECT` in the context of older kernels, filesystems, and RAID. Double buffering can help the OS batch or schedule I/O; direct I/O can avoid keeping the same page in two caches. There is no universal answer: check support on the OS, whether device write cache is protected, memory pressure, warmup, and measured throughput/latency. Do not use `nosync`/development modes or disable flushes to make a production benchmark look faster.

### Tablespaces, purge, and DDL cost

System-tablespace files are concatenated in their configured order; placing several files on different mount points does not automatically distribute I/O in parallel. The RAID/storage layer must actually stripe data for that. An autoextending file does not shrink after rows are deleted, so plan bounds and space reclamation in advance. `innodb_file_per_table` isolates, rebuilds, and moves a table's tablespace more easily, but dropping a large table may take time to remove files/pages and compete for buffer-pool work. This is an operational tradeoff, not a universal one-time setting.

MVCC keeps old row versions in undo while transactions still need their snapshots. Long transactions can hold back the purge horizon and grow undo/history even after the application deletes data. Monitor the oldest transaction, purge progress, and history-list growth; shortening transactions is usually safer than forcing purge through a throttle. Do not copy `innodb_max_purge_lag` values from the old book without checking the current version's behavior.

### Doublewrite protects pages from partial writes

Doublewrite writes a batch of pages to a protected area before writing them to their final tablespace locations. If a crash leaves a torn page, recovery can use the valid copy. This does not replace redo: redo reconstructs committed logical changes, while doublewrite helps ensure that physical pages were not only partially written. It adds I/O but can reduce the need to synchronize each page separately.

MySQL 8.4 still enables doublewrite by default and documents modes such as `DETECT_AND_RECOVER` and `DETECT_ONLY`. Change or disable it only when storage guarantees atomic page writes and crash recovery has been tested on the exact platform; a wrong assumption can turn a crash into corruption. See the [doublewrite buffer documentation](https://dev.mysql.com/doc/refman/8.4/en/innodb-doublewrite-buffer.html) before using any hardware-specific optimization.

### MyISAM is a separate historical path

Chapter 8 also describes MyISAM's `key_buffer_size`, key-cache block size, `delay_key_write`, recovery, and concurrent inserts. The key cache holds indexes only; data pages rely heavily on the OS cache. Delayed key writes can batch writes, but a crash before flushing can corrupt the index. MyISAM lacks InnoDB's transaction/MVCC behavior and uses table-level locking, so do not apply these settings to InnoDB. If the system still has MyISAM, verify backup/recovery, integrity, and permissions before using legacy features.

## One update, step by step

Suppose we update `orders.status` for `order_id=42`:

1. The optimizer chooses a primary-key lookup; InnoDB follows the clustered B-tree from root to leaf.
2. If the leaf page is absent from the buffer pool, the engine reads it. Lock/MVCC rules check the transaction and matching record.
3. The engine creates undo needed for rollback/old versions, changes the record in the page in memory, and records redo describing the change.
4. At commit, durability depends on redo-flush policy and storage flush behavior; the data page may remain dirty.
5. A background writer flushes the page to its tablespace. The checkpoint advances as older changes become safe in data files.

If `status` has a secondary index, that index also needs an update. Adding an index to a column can make every write more expensive: it adds page accesses, redo, dirty pages, storage, and purge work when index entries change or disappear.

## Diagnosing slow work

Distinguish cache misses from a poor query plan, lock waits, and slow devices. Read `EXPLAIN ANALYZE`, buffer-pool metrics, file-I/O waits, dirty pages, redo/checkpoint counters, and lock waits over the same time interval. Do not increase the buffer pool merely because physical reads are visible, or disable doublewrite/flush for a prettier benchmark. Every durability change should state the acceptable data-loss window.

*High Performance MySQL*, chapters 1–2, 5, and 8, introduces InnoDB architecture, performance measurement, indexes, and settings. For MySQL 8.4, compare the official [InnoDB physical structure](https://dev.mysql.com/doc/refman/8.4/en/innodb-physical-structure.html), [buffer pool](https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool.html), [doublewrite buffer](https://dev.mysql.com/doc/refman/8.4/en/innodb-doublewrite-buffer.html), [redo logging](https://dev.mysql.com/doc/refman/8.4/en/optimizing-innodb-logging.html), [transaction durability](https://dev.mysql.com/doc/refman/8.4/en/optimizing-innodb-transaction-management.html), [InnoDB I/O optimization](https://dev.mysql.com/doc/refman/8.4/en/optimizing-innodb-diskio.html), [undo tablespaces](https://dev.mysql.com/doc/refman/8.4/en/innodb-undo-tablespaces.html), and [InnoDB variables](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html) documentation.

## Check your understanding

**Why does a secondary-index entry contain the primary key?** It uses it to find the record in the clustered-index leaf; the tradeoff is that a wide primary key enlarges every secondary index.

**Does commit mean the data page has reached its final location?** Not necessarily; redo can make a commit durable while the dirty page is flushed later.

**Does a larger buffer pool always make queries faster?** No. It does not fix a lock, CPU, plan, or saturated-storage bottleneck, and it takes memory from other components.
