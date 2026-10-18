---
title: "LSM Lookups, SSTables, and Version Reconciliation"
category: "Database"
description: "Follow get/range scans across memtables and SSTables, use filters/block indexes, and resolve updates and tombstones."
updated: 2026-10-17
translationKey: "database/lsm-lookup-and-reconciliation"
---

A key in an LSM may exist in several places: the active memtable, a memtable being flushed, and several SSTables. A read does not stop at the first file containing the key in an arbitrary order; it must consider **recency**, sequence number/timestamp, the transaction's snapshot, and tombstones. Dropping an old version too early or choosing the wrong one can resurrect stale data.

## Find a point key without opening every file

The engine commonly proceeds from cheaper checks to more expensive ones:

1. Check the mutable memtable and immutable memtables awaiting flush.
2. Use SSTable metadata such as min/max key to skip files outside the key range.
3. Use a Bloom filter to reject a file/block that definitely lacks the key.
4. Find the approximate block in a sparse index or index block.
5. Read the data block, find the key, and check sequence/tombstone state.

A Bloom filter returns `definitely absent` or `maybe present`: a false positive causes only an extra read; false negatives are not allowed. A sparse index keeps a fence key per block rather than one pointer per record; it saves RAM but requires reading the chosen block. A block cache can retain hot data/index/filter blocks. A good filter does not make a key whose newest version is in several runs free: candidate versions from relevant sources may still need comparison.

For example, key `customer:42` may be outside SSTable A's range, B's Bloom filter may say it is definitely absent, and C's may say it could be present. Only C's block needs checking; after finding a record, the engine still compares it with the memtable and any newer sources before returning a result.

### Bloom filter: bit array, hashes, and false positives

A Bloom filter starts with an all-zero bit array. For each key, it computes several hashes and sets the bit at each resulting position. During lookup, if any bit is zero, the key was definitely never added. If every bit is one, the key may be present: different keys may have set the same positions. For example, in a 16-bit array, `key1` sets `{3,5,10}` and `key2` sets `{5,8,14}`. `key3` maps to `{3,10,14}`, so the filter says “possibly present” even though `key3` was never added—a false positive. `key4` maps to `{5,9,15}`; bits 9 and 15 are still zero, so the filter can safely say it is absent.

False positives only make the engine read/check more; false negatives would lose data, so a filter must be built and read consistently with its table. A larger bit array relative to the key count usually reduces collisions but consumes RAM; more hash functions help distinguish keys up to a point, but add CPU and cannot improve the result without limit. An immutable SSTable knows its key set at build time, so its filter can be sized for that table. Key-range metadata can reject a file more cheaply first; the filter mainly avoids opening a file whose range overlaps the target but that does not actually contain the key.

## Multiway merge for a range scan

Each sorted source has its own iterator/cursor. Put the first item from each iterator in a min-heap. Each step takes the smallest key, advances that source, and puts its next item in the heap. With `k` sources and `n` consumed records, choosing an item costs about `O(log k)` per step; the benefit is that the entire dataset does not need to be loaded into RAM and resorted.

Suppose three sources are ordered newest to oldest:

| Source | Records |
| --- | --- |
| memtable | `b → B2 (seq 10)` |
| new SSTable | `a → A2 (seq 8)`, `c → DELETE (seq 9)` |
| old SSTable | `a → A1 (seq 2)`, `b → B1 (seq 5)`, `c → C1 (seq 3)` |

The merge iterator sees `a` in two sources and keeps `A2`, because sequence 8 is newer than `A1`. For `b`, it chooses `B2` from the memtable over `B1`. For `c`, tombstone seq 9 hides `C1`, so `c` is absent from the range output. The logical result is `a→A2, b→B2`. Source ordering can be a hint, but conflict resolution must follow the engine's version semantics rather than guess from filenames.

A range tombstone hides a key interval, such as `[b,d)`. It must be applied alongside point records and file boundaries; dropping it while an old SSTable still contains `c` can make `c` reappear. TTL also needs explicit semantics: whether expiration creates a tombstone or is filtered at read time, and when old versions can be removed depends on snapshot/replica/compaction policy.

## How is an SSTable organized?

An SSTable is usually immutable and contains data blocks sorted by key along with index/filter/metadata. A footer or meta index leads to block metadata; a sparse index maps fence keys to block offsets. For a point read, the engine reads metadata, identifies a block range, reads a compressed block, decompresses it in memory, and searches within it. A large key may cross block boundaries or use prefix/shared-prefix compression to reduce size; the format needs enough metadata to decode it independently.

Compression reduces disk/cache bytes but a block must be decompressed on read; a dictionary/prefix state can make access depend on preceding data, so block boundaries are chosen to bound decoding. An offset index records the compressed offset/size and uncompressed size. Small blocks add metadata and I/O calls but reduce read amplification for a small result; large blocks improve sequential throughput but can read many extra bytes for a point lookup.

## Flush and table views must change safely

When a memtable reaches its threshold, writers need to switch to a new memtable; the old one must remain readable while it flushes. An incomplete output file must not enter the read view. After the SSTable is written, the engine atomically publishes a new manifest/table version so readers see the SSTable and the corresponding immutable memtable can leave the view. Only after safe publication can the WAL segment holding the flushed writes be trimmed.

Compaction also creates a new view: old files continue serving readers that already opened them; output files must be complete and metadata verified before publication; obsolete files can be deleted only after readers no longer reference them. If concurrent compactions select the same inputs, reservation/version checks are needed to avoid competing outputs. This is a correctness protocol, not mere housekeeping.

*Database Internals*, chapter 7, explains lookups, iterator merging, reconciliation, SSTable/filter structures, and concurrent table-view publication. Read it with the [RocksDB overview](https://github.com/facebook/rocksdb/wiki/RocksDB-Overview) to see how one modern implementation describes blocks, tables, and compaction concepts.

## Check your understanding

**Does `maybe present` from a Bloom filter mean the record is certainly in the file?** No. It means the engine must read/check further.

**If two SSTables have the same key, which file wins?** The version/sequence and snapshot semantics decide; do not use only filename or iterator order.

**Can the WAL be deleted when a memtable begins flushing?** Not yet. It can be trimmed only after the data file is complete and publication makes it the memtable's replacement for recovery/read views.
