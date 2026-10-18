---
title: "PostgreSQL Shared Buffers, Eviction, and WAL Modes"
category: "Database"
description: "Understand clock-sweep buffer caching, bulk I/O, checkpoints, full-page images, and wal_level choices."
updated: 2026-10-18
translationKey: "database/postgresql-buffer-cache-and-wal-modes"
---

PostgreSQL reads pages into shared buffers for backends; the kernel page cache may keep another copy. A buffer hit does not mean the data is in CPU cache, and a `shared read` does not necessarily trigger physical disk I/O. Diagnose shared-buffer hits/reads, OS cache, and storage separately.

## Buffer lookup and clock sweep

The shared-buffer directory maps relation/fork/block to a buffer ID. A backend pins a buffer while using it; replacement is possible when it is unpinned. PostgreSQL uses clock-sweep with a usage count as an approximation of recency rather than exact LRU. A victim must be unpinned; if all buffers are pinned or dirty pages cannot flush fast enough, a backend may wait.

A dirty page needs WAL flushed before the data page is written. The background writer proactively writes buffers to reduce backend-initiated flushes; the checkpointer writes pages needed by a checkpoint. Too many tiny checkpoints add I/O; too few can create write bursts/longer recovery. `max_wal_size` is a soft target; timeout/force conditions also trigger checkpoints.

## Bulk scans and local buffers

A large sequential scan can evict useful pages. In the PostgreSQL 14 implementation described by the book, a bulk-read ring is used for a sequential scan when the table exceeds `shared_buffers / 4`; the ring has 32 pages, so a 4,097-page table scan leaves about 32 pages in shared cache. An index scan does not use this ring and can bring both the table and index into cache. These thresholds and sizes are implementation details for the version and configuration in the book, not guarantees for every release.

A ring does not pin pages in a private cache: pages remain in shared buffers and can be used by other operations. If the ring is about to reuse a pinned buffer or one with a high usage count, it detaches that buffer and obtains another; the scan need not wait for a dirty page to be written just to get a buffer. Concurrent sequential scans can share an existing ring to avoid duplicate I/O. The bulk-write ring in the book applies to `COPY`, `CREATE TABLE AS SELECT`, materialized-view creation, and some table rewrites; its default is 16 MB and it is capped at `shared_buffers / 8`. Vacuum has its own 256 KiB (32-page) ring when it scans the whole table without using the visibility map. Rings do not always help: `UPDATE`/`DELETE` keeps pages dirty, while toasted values are reached through an index and bypass the bulk-read ring.

Temporary tables use separate local buffers rather than shared buffers. `pg_prewarm` can load data ahead, but pages can still be evicted; warming helps only when the working set fits and OS/storage state is understood. PostgreSQL 14 also has an autoprewarm worker: when the module is loaded through `shared_preload_libraries`, it periodically records shared-buffer page identities in `autoprewarm.blocks` and reloads them after restart. This file is a list for warming the cache, not a data snapshot or a promise that pages stay resident; see the [PostgreSQL 14 pg_prewarm docs](https://www.postgresql.org/docs/14/pgprewarm.html).

A buffer hit ratio alone does not prove performance: data may be in the OS cache, a query may hit many buffers but be CPU-heavy, or a miss may be an expected scan. Read `EXPLAIN (BUFFERS)`, `pg_stat_io`/version-specific stats, and host I/O together.

## WAL records and checkpoints

A WAL record contains a record header, resource-manager information, and payload; its logical LSN advances through the byte stream. A checkpoint writes a redo point, flushes required buffers, and saves control state. Crash recovery starts at the checkpoint redo point and replays WAL. A full-page image after a checkpoint protects against torn pages; `wal_compression` can reduce WAL bytes at CPU cost.

`fsync=off` can cause unrecoverable corruption after an OS crash/power loss; `synchronous_commit=off` allows recent commits to be lost while keeping the database recoverable. `full_page_writes=off` reduces WAL but makes torn-write assumptions a risk. These are not routine tuning settings.

## WAL levels

`wal_level=minimal` emits enough WAL for crash recovery in supported workloads/operations but does not support streaming replication/PITR like `replica`; `logical` adds information for logical decoding and increases WAL. A lower level can be restricted when archive/replication/slots are enabled. Check current release docs and downtime/restart requirements.

Measure WAL bytes, checkpoint timing, `pg_stat_bgwriter`/`pg_stat_checkpointer`, and `pg_stat_wal` by release. When WAL grows, find bulk updates/index builds/full-page images/slot retention instead of only adding disk.


### What do the three wal_level settings preserve?

Think of `wal_level` as the amount of WAL information retained for progressively broader uses. `minimal` preserves crash recovery for supported operations but omits row-level logging for some bulk operations on a relation created or truncated in the same transaction; the data is written through a separate path. The book's trace runs `TRUNCATE`, inserts many rows in the same transaction past `wal_skip_threshold`, then commits. `pg_waldump` shows relation-file creation, catalog/index changes, and commit, but not a record for the entire data load. If the operation crashes before commit, the new data is not considered valid because the transaction/catalog changes did not commit.

That makes `minimal` unsuitable for PITR or physical replication: a backup may need WAL replay across many checkpoints, while a standby needs every data change plus transaction/lock information for consistent snapshots. `replica` adds standby information such as running-transaction state and relevant locks; it is the common level for archiving and physical standbys. `logical` adds information for logical decoding and logical replication. Higher levels include the information of lower levels but may generate more WAL.

In PostgreSQL 14, changing `wal_level` requires a restart; `minimal` is also incompatible with some replication configurations such as nonzero `max_wal_senders`. Exact thresholds and constraints depend on release. Do not lower the level just to save disk if you still need archiving/PITR, a physical standby, or a logical consumer. `wal_level` is not a “durability” switch: crash recovery is a different requirement from retaining information for replication/decoding.

*PostgreSQL Internals 14*, Part II, explains buffer design/hits/misses/eviction, checkpoints, background writing, and WAL levels. See [WAL configuration](https://www.postgresql.org/docs/current/runtime-config-wal.html), [resource consumption](https://www.postgresql.org/docs/current/runtime-config-resource.html), and [I/O monitoring](https://www.postgresql.org/docs/current/monitoring-stats.html).


## Reading Chapters 9–11 in depth: cache misses, checkpoints, and durability

### A read passes through two caches

Each shared buffer has a tag identifying relation/fork/block, dirty state, pin count, and usage count. A backend checks the buffer mapping to see whether the page is resident. A pin prevents eviction while a backend uses the buffer; a content lock coordinates page reads/writes; mapping and buffer-header locks protect short-lived metadata. These are different forms of coordination: a pin is not a row lock, and a content lock is not a transaction lock.

On a miss, the backend needs a free buffer or a victim selected by clock sweep. The sweep lowers usage counts and chooses an unpinned buffer; a dirty victim must be written before reuse. PostgreSQL may also use the OS page cache, so a `shared read` only means the page was absent from shared buffers; it does not prove a physical device read. This is why choosing `shared_buffers` by a fixed formula or looking only at hit ratio can mislead. Compare the working set, `EXPLAIN (BUFFERS)`, cache hits/misses, OS memory, and I/O under the workload.

Bulk scans can use a ring buffer to keep a large table scan from evicting hot pages. Compatible backends can share a ring during the same scan; temporary relations use a local buffer pool; `pg_prewarm` loads data ahead of time but does not guarantee it stays resident or that storage is warm. Warming is useful only when the commonly used pages are understood and cold-start effects have been measured.


### Trace a cache hit, cache miss, and pin

Buffer lookup uses a composite key of relation file, fork, and block number to find a buffer ID in a hash table. The hash table makes a particular page quick to find; it is not convenient for listing every page belonging to a relation, so PostgreSQL needs a separate path when it must remove all of a relation's pages from cache. If an entry exists, the backend pins the buffer before using the page. Several backends can pin one buffer; while its pin count is above zero, it cannot be replaced by another page. A pin protects the buffer's lifetime, while a content lock protects the page contents; these are not interchangeable.

`EXPLAIN (ANALYZE, BUFFERS)` gives a small trace. If a plan reports `shared hit=1`, the page needed by the scan was already in shared buffers. After a restart with an empty cache, the same read may report `shared read=1`; PostgreSQL had to bring the page into shared buffers. Because PostgreSQL uses buffered I/O, the data may still come from the OS page cache rather than a physical device. A scan can also dirty a page by setting a hint bit. Thus `hit`, `read`, and `dirtied` describe PostgreSQL buffer operations, not a complete measurement of device I/O.

Pin count and usage count have different jobs. A pin means the buffer cannot be replaced; usage count tells clock sweep how recently the page has been used. In the book's example, reading raises the usage count, then an open cursor keeps a pin while it may need the page again. If ordinary VACUUM encounters a pinned page, it may skip that page for the current pass; an operation needing stronger cleanup/freezing access may have to wait for the pin to be released. Closing the cursor or ending its transaction drops the pin to zero. An INSERT can modify a resident page and mark its buffer dirty; PostgreSQL normally delays writing that page to the file so reads and writes can be combined more efficiently.

When no free buffer remains, the clock hand visits buffers, lowers usage counts, and selects an unpinned buffer whose count reaches zero. A page with a higher count gets more chances to remain cached; this approximates recency/frequency rather than implementing exact LRU. If the victim is dirty, it must be written before reuse. If no suitable victim is ready, the sweep may make additional passes; long-held pins or slow dirty-page writes can increase waits. Per-relation cache activity is available through `pg_statio_*`; measuring I/O time depends on `track_io_timing` in the relevant release.

The book also compares shared buffers with the OS page cache. PostgreSQL 14 reads and writes relations through buffered file I/O, so a shared-buffer miss can still be served from the operating system's RAM. Direct I/O and asynchronous I/O are discussed as an architectural direction for reducing copies and waits, but they require separate prefetching and OS-specific handling; do not read that discussion as the I/O path PostgreSQL 14 uses.


### Choose cache size and warm it with measurements

There is no universally correct `shared_buffers` size. The ideal cache holds the frequently used working set while leaving room for one-time data. A cache that is too small makes hot pages evict each other; an excessively large cache takes RAM away from the OS page cache and increases management cost. The book's suggestion to start near one quarter of RAM is an experiment starting point, not a required formula. Test representative workloads on a production-like system, change one value at a time, and compare latency, I/O, and eviction. `shared_buffers` is allocated at server startup, so changing it requires a restart.

`pg_buffercache` can show which relations occupy buffers, their usage counts, and the fraction of a relation currently resident. This is a snapshot that can vary between queries; repeat it a few times, but do not poll continuously because the extension briefly locks/touches buffers while inspecting them. A usage count above one is only a heuristic for “hot,” not a precise measure of application demand. The book's example can have an entire table and index cached even though those pages are rarely accessed after the scan: “in RAM” is not the same as “frequently used by the workload.”

After a restart, `pg_prewarm` can load selected pages into shared buffers or the OS cache. PostgreSQL 14's autoprewarm mechanism can write page identities to `autoprewarm.blocks` and reload them after the next start; the file identifies pages to warm but does not contain their contents. Warming a whole relation is justified only when there is evidence the working set will use it immediately; otherwise, prewarming may evict more important pages.

Temporary tables use a session's local buffers instead of shared buffers. They still need page lookup, pinning, and eviction, but do not need inter-process metadata locks because only the owning session accesses them. `temp_buffers` limits local buffer memory per session; it is different from `temp_file_limit`, which limits temporary files used for query intermediates such as sort/hash spills. In `EXPLAIN (BUFFERS)`, local hits/reads are reported separately from shared hits/reads.

### WAL records and the redo boundary

A WAL record has a header, transaction ID, resource manager, and an operation payload; one record can affect multiple blocks. An LSN is a byte position in the cluster-wide stream, not a transaction number. A page stores `pd_lsn`; recovery compares LSNs to avoid replaying redo already present. A page being written needs durable WAL through its LSN; the data page may be written after commit.

A checkpoint writes the required dirty pages and updates the redo point/control state after preserving WAL-before-data ordering. After a crash, startup reads the latest checkpoint, replays records from the redo point, and treats transactions without a commit record as aborted based on XID state. Checkpoints that are too close together increase write amplification and full-page images; checkpoints too far apart lengthen recovery, retain more WAL, and can cause bursts when a checkpoint forces many buffers to flush. `checkpoint_timeout` and `max_wal_size` influence this behavior but are triggers/targets, not a simple hard quota.

### WAL modes define the protection boundary

A synchronous commit usually waits for WAL flush, not for the heap page to flush. Group commit lets multiple transactions share a sync. Asynchronous commit skips the local flush wait for that transaction, reducing latency but potentially losing the most recent commits if the OS/machine fails. It is different from `fsync=off`: disabling fsync drops a durability assumption recovery relies on and can corrupt a cluster after power loss.

`full_page_writes` logs the first full-page image after a checkpoint so recovery can repair a torn write; `wal_log_hints` can do similarly for hint-bit changes depending on configuration. Data checksums detect page corruption but do not repair a page and must be enabled appropriately at initdb. WAL levels `minimal`, `replica`, and `logical` represent different amounts of information; choose `logical` for decoding/replication needs, not because it is “more durable.” Views, process metrics, and settings in the book must be checked against the PostgreSQL release in use; defaults change over time.

In practice, connect `pg_stat_wal`, checkpoint statistics, version-appropriate `pg_stat_io`/I/O counters, `pg_stat_database`, and OS metrics. Compare WAL bytes per transaction, checkpoint duration, backend fsync, and commit latency. PostgreSQL 14 references: [buffer configuration](https://www.postgresql.org/docs/14/runtime-config-resource.html), [WAL configuration](https://www.postgresql.org/docs/14/runtime-config-wal.html), [WAL internals](https://www.postgresql.org/docs/14/wal-internals.html), and [reliability](https://www.postgresql.org/docs/14/wal-reliability.html).

## Check your understanding

**Does a buffer hit prove the page avoided disk?** Not by itself; the OS page cache and other metrics matter too.

**Does `wal_level=minimal` fit a streaming standby?** No; replication needs a suitable WAL level.

**Is turning off fsync like turning off synchronous_commit?** No; fsync off can corrupt the database after a crash, unlike losing only recent commits.
