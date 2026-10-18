---
title: "LSM Compaction, SSTables, and Write Amplification"
category: "Database"
description: "Trace put/get/delete through memtables and levels, compare compaction, and measure read/write/space amplification."
updated: 2026-10-17
translationKey: "database/lsm-compaction-and-amplification"
---

An LSM tree trades random in-place updates for sequential writes and batched merges. A `put` typically enters a WAL and memtable; when full, the memtable freezes into a sorted run/SSTable. Reads check memtables, immutable memtables, and files from newer to older levels, choosing the latest version by sequence number. A tombstone represents deletion until compaction proves no older copy is needed.

## Lookup and Bloom filters

An SSTable has sorted data blocks plus index/metadata to locate key ranges. A Bloom filter answers “definitely absent” or “possibly present”; false positives add disk reads, while false negatives are not allowed. A filter only avoids searching files that lack the key; when a key exists in multiple runs, reconciliation is still needed.

Range scans merge-iterate multiple sorted runs; more levels/files add heap/iterator work. Compaction combines same-key records by sequence/tombstone and discards old versions when snapshot/replica policy permits.

## Leveled and size-tiered compaction

Size-tiered compaction groups runs of similar size into a larger run: write throughput is better, but versions of a key may remain in multiple runs and space amplification rises. Leveled compaction limits overlap between files in a level, reducing read amplification; a compaction can rewrite many bytes and raise write amplification. Tiered/leveled hybrids choose a balance.

### View compaction through key ranges

In a leveled design, newly flushed L0 files commonly overlap. When a threshold is reached, the engine selects one or more L0 files and every L1 file whose key range overlaps them, merges them, and writes non-overlapping L1 output ranges. For example, if L0 contains `[a,m]` and `[h,z]`, compaction must consider L1 files `[g,n]` and `[q,t]` because those ranges intersect. L1/L2 continue to compact overlapping files in the next level; capacity often grows geometrically so older data gradually reaches the bottommost level.

The tradeoff is that a hot key may be rewritten through several levels; compaction needs temporary space for output while input files still serve reads. If writes outrun compaction, L0 files/overlap grow, reads search more places, and write stalls protect the disk from unbounded debt. Backpressure is a safety mechanism; it does not prove that a shortage of threads is the only cause.

Size-tiered compaction groups runs by size and often rewrites a key less frequently, but retains more versions/files. **Table starvation** can occur when output becomes small because tombstones remove many records and does not meet the next level's threshold; old tombstones then persist and reads search more data. Some time-series workloads use time-window compaction: grouping files by time can allow an expired TTL window to be dropped as whole files instead of rewriting every record, but only when data/expiration fit that policy and no snapshot still needs them.

Measure amplification for the workload: **write amplification** is storage bytes written/logical write bytes; **read amplification** is bytes/I/Os read for a result; **space amplification** is physical bytes/live logical data. Reducing one often increases another; the RUM conjecture describes read/update/memory tradeoffs in index structures.

To compare B-trees and LSMs, separate the source of write amplification. A B-tree may rewrite a page per update/flush, while an LSM rewrites live records during compaction; results depend on page size, cache, update locality, value size, retention/tombstones, level policy, and device. Do not use one `put/s` benchmark to infer total cost: measure device bytes, read p99, compaction debt, and peak space.

RUM (Read, Update, Memory) is a model for asking whether a structure reduces read cost by spending memory/update work. It is a tradeoff framework, not a configuration law for every engine. A Bloom filter spends memory to reduce file reads; compaction spends writes to reduce versions that must be reconciled; delaying compaction keeps more space occupied but reduces rewrite work right now.

## Concurrency and compaction debt

Background compaction competes with foreground queries for disk bandwidth. If write rate exceeds compaction capacity, overlapping L0 files accumulate, then stalls/backpressure begin and latency rises. Monitor pending compaction bytes, L0 count, write stalls, disk utilization, and tombstone age. More threads do not help when the disk is saturated.

Memtables often use skip lists or another ordered structure for concurrent inserts and range iteration. Immutable SSTables let readers proceed without blocking writes; manifest/version metadata atomically publishes new files, while obsolete files are removed only after old readers no longer need them.

## Bitcask and WiscKey

Bitcask appends a log and keeps an in-memory hash index from key to file offset; lookup is fast but RAM index grows with key count, and compaction reclaims old records. WiscKey separates keys and values: LSM merges small key/value-log pointers while a separate value log appends values, reducing merge bytes; value-log garbage collection is complex and reads add a seek.

## Flash log stacking

Database LSMs, filesystem journaling, and SSD Flash Translation Layers can all log/relocate pages. When multiple layers log, one logical write is rewritten at each layer (write-amplification stacking). TRIM/discard, alignment, open-channel SSDs, and host-managed placement change assumptions. Understand the stack from DB to device before inferring durability/performance from “sequential writes.”

*Database Internals*, chapter 7, covers SSTable/Bloom/skip lists, compaction, amplification, Bitcask/WiscKey, and flash log stacking. Read with the [RocksDB overview](https://github.com/facebook/rocksdb/wiki/RocksDB-Overview) for a modern LSM implementation.

## Check your understanding

**Can a Bloom-filter false positive return a wrong query result?** No; it only causes an extra read. A false negative would lose a result.

**Is leveled compaction always better than tiered?** No; it trades write amplification for read/space behavior.

**Does a tombstone immediately remove every SSTable version?** No; it must compact across relevant files before old versions can safely disappear.
