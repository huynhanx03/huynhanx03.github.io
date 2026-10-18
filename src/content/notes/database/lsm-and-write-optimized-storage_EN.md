---
title: "LSM Trees and Write-Optimized Storage"
category: "Database"
description: "Follow a write from the WAL and memtable into SSTables, then see how compaction trades read, write, and space costs."
updated: 2026-10-17
translationKey: "database/lsm-and-write-optimized-storage"
---

An updating B-tree may need to find the right page, lock or protect it, modify it, and write changes to storage. Under a write-heavy workload, many random writes can be expensive. An LSM tree organizes the write path differently: it writes sequentially to a log and memory first, then writes sorted files to storage in larger batches.

## The path of a write

A typical LSM implementation has a write-ahead log (WAL) for recovery, one or more in-memory structures called memtables, and immutable sorted files on storage, commonly called SSTables.

When it receives `put(k, v)`, the engine usually writes a record to the WAL first according to its configured durability rule, then updates the memtable. When the memtable fills, it is frozen and flushed as a new SSTable. The file is written sequentially and sorted by key, so many workloads avoid random in-place page updates.

The memtable must preserve order for point lookup and range iteration before flush. A common structure is a **skip list**: nodes have multiple forward pointers at different levels; a tall node skips a larger range, while the lowest level links every item. Randomly chosen heights give expected search/insert near `O(log n)` without rotations. The tradeoff is that small, separately allocated nodes can be less cache-friendly than densely packed B-tree pages.

An LSM can use two large components—a memtable plus one disk tree/file—and merge the corresponding portion during each flush, or retain multiple immutable SSTables and compact them periodically. Two components reduce the number of read sources but require more merge work per flush; many components make flushes simpler but add runs to reads/compaction. Every flush must switch writers to a new memtable, keep the old one readable, and publish the SSTable only after completion.

In the original two-component style, the disk component can be an immutable B-tree with densely filled pages. When flushing a region/subtree from the memtable, the engine finds the corresponding disk-tree region, merges the two sorted streams, and writes a replacement subtree; the old subtree is replaced only after output is complete. This resembles copy-on-write because old pages are not modified in place, while the memtable batches several writes before paying the merge cost. A multi-component design keeps disk tables as separate runs: each flush is cheaper, and compaction merges runs later. The designs differ in when they pay merge cost and how many sources a read must examine.

Deletes are often represented by tombstones instead of immediately removing every old copy. A key may appear in the memtable and several files because newer versions supersede older ones. The engine tracks version order to return the newest value or conclude that the key was deleted.

Secondary indexes share the data lifecycle: an engine may keep an in-memory index for a memtable and an index per SSTable; flush/compaction must create or merge the corresponding index pieces. Keeping indexes alongside immutable tables can align their publication/versioning, but a secondary query may need to search/merge several index views and then follow primary keys to fetch rows. “Adding an index” to an LSM can therefore increase memory, flush work, and compaction work too.

### Trace a skip-list search and update

Search begins on the highest level: move right while the next key is smaller than the target; when the next key is larger, drop to a lower level from the current node. Repeat down to level 0 to find the key or insertion point. Sparse levels skip ranges, while level 0 retains every key in order. The maximum level is bounded by the memtable's configured capacity; each node's height is chosen randomly at insertion.

For insertion, the algorithm records predecessors at the relevant levels, creates a node at its selected height, and connects the corresponding forward pointers. Deletion redirects each predecessor pointer to the following node; it does not rebalance through tree rotations. For example, if level 0 is `1→3→5→7→10` and a higher level is `1→5→10`, searching for `7` follows `1→5`, sees that `10` is too large, descends at `5`, then reaches `7`. This is how a multilevel linked structure achieves expected logarithmic search.

Concurrency still needs a protocol: when a writer updates several levels, a reader must not treat a node as complete before required links are published. One design uses a `fully_linked` flag set after CAS installs all pointers; deleted nodes also need safe reclamation such as reference counting or hazard pointers so an active reader never touches freed memory. These details vary by implementation; a skip list is not automatically concurrency-safe just because it has multiple levels.

### Secondary indexes attached to SSTables

The book uses **SSTable-Attached Secondary Indexes (SASI)** as an example: each SSTable has its own secondary index, built as a memtable flush creates the table; the active memtable also has an in-memory index. A query on a non-primary field searches the index views for the memtable and SSTables, merges candidates like an LSM lookup, then follows primary keys to fetch rows. Compaction creates a new SSTable and its corresponding index; the old index is replaced with the old table when the new view is published.

The advantage is that an index follows the lifecycle of its immutable table instead of updating one global structure in place for every record. In exchange, query/index construction/flush operate across multiple components; secondary indexes consume RAM, flush time, and compaction bytes, and candidates still need version reconciliation. SASI here is the book's implementation example, not a claim that every current Cassandra release uses the same implementation or semantics.

## Reads merge several sources

A lookup may check the memtable, immutable memtables waiting to be flushed, and then SSTables from newest to oldest. The engine uses metadata such as key bounds, sparse indexes, caches, and Bloom filters to skip files that cannot contain the key. A Bloom filter can say “definitely absent” or “possibly present”; it does not produce false negatives but can produce false positives.

When a query searches for many keys in order, the engine must merge-iterate several sorted streams. This is why the number of runs or files affects read latency and storage accesses. More levels or files can keep writes sequential but require reads to examine more places.

## Compaction reduces history

**Compaction** merges SSTables, selects live versions, removes tombstones when safe, and creates new files. This background work limits the number of files a read must inspect, but consumes CPU, I/O, and temporary space. While it runs, it can compete with application queries and writes for resources.

Two common strategies make different tradeoffs:

- **Size-tiered compaction** keeps files or runs of similar size and merges them into larger runs. It often rewrites less data per round, but may retain more versions and consume more space.
- **Leveled compaction** divides data into levels with size limits and controlled key ranges. It usually keeps less duplicated data and can bound file searches more tightly, but a key may be rewritten through several compaction rounds.

Names and details vary by engine. Implementations may use hybrids, such as tiered compaction at lower levels and leveled compaction at higher levels, or workload-specific variants. No policy wins for every dataset.

## Reads, writes, and space are traded against one another

LSM trees often reduce random writes on the foreground path, but compaction rewrites existing data. **Write amplification** describes how many storage bytes must be written compared with the bytes requested by the application. **Read amplification** is the extra read work needed to find a result. **Space amplification** is physical storage compared with the live data currently needed.

These dimensions are related. More compaction can reduce the number of files a read must check but increase background writes. Delaying compaction can reduce immediate write pressure while increasing files, tombstones, reads, and space. The RUM conjecture reminds us that read, update/write, and memory efficiency involve tradeoffs; it is a reasoning framework, not a configuration formula.

A larger Bloom filter may avoid reading irrelevant files but consume RAM. A block cache can improve hit rates, but too little cache or a constantly changing workload reduces its benefit. Choose settings using a real workload: get/put/delete ratios, value sizes, key distribution, read-after-write behavior, latency targets, and storage speed.

## Related storage families

Bitcask illustrates a log-structured key-value store: new data is appended sequentially to a log, while an in-memory index maps each key to its latest location. This works well when values are small or read by key and the index fits in RAM; log compaction must remove old versions and has its own cost.

WiscKey separates keys from large values so compaction mostly moves small keys while values are written to a separate log. This can reduce write amplification for large values, but queries must follow pointers to value records and garbage collection becomes more complex.

Lower layers also log and aggregate data: filesystem journals, SSD flash translation layers, RAID controllers, or applications. If several layers independently batch and rewrite data without knowing each other's policies, latency and write amplification can rise. “Append-only” at one layer does not mean the entire stack avoids rewriting data.

## When is an LSM worth considering?

An LSM can suit some workloads with many writes, key-based access, and tolerance for background compaction. A B-tree may fit better when stable lookup and range access over organized data matter, or when reads need fewer merge levels. The answer depends on the implementation, device, and measured workload.

When monitoring an LSM, inspect write stalls, file counts per level, pending compaction bytes, p95/p99 latency, cache hit rates, Bloom filter effectiveness, tombstone volume, and storage write throughput. A system that reports fast writes while compaction falls behind may only be postponing its cost.

## Check your understanding

**Why can an LSM write many bytes to disk even though its foreground path mostly appends?** Compaction merges and rewrites live keys and values across several files.

**Does a Bloom filter answer of “possibly present” mean a key definitely exists?** No. The file must be checked to confirm; only “definitely absent” safely skips it.

**Can a tombstone always be removed immediately?** No. An older copy in another file could make the key reappear if the tombstone is dropped before compaction safely covers the relevant ranges.

Reading: *Database Internals*, chapter 7, covering LSM trees, SSTables, Bloom filters, skiplists, compaction, Bitcask, WiscKey, and interactions among logging layers.
