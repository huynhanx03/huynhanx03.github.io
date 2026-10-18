---
title: "Bitcask, WiscKey, and Stacked Storage Logs"
category: "Database"
description: "Compare unordered append logs with sorted-key/value LSMs, then follow write amplification from a database down to an SSD."
updated: 2026-10-17
translationKey: "database/lsm-unordered-stores-and-log-stacking"
---

SSTables sort records by key for range scans, but each flush must sort and compaction must merge. For workloads dominated by point-key reads with large values, a design can separate **key order** from **value location**: keep keys in an ordered index and append values to a log. Two designs in *Database Internals* show the benefits and the costs they move elsewhere.

## Bitcask: an in-memory keydir, values appended to a log

Bitcask writes `(key,value,metadata)` records at the end of a data file in insertion order. Its in-memory keydir is a hash map from each key to the offset of its newest record. `put(k,v2)` appends `v2`, then updates the keydir; the old record for `k` remains in the log but is no longer reachable through the keydir. Get looks up the hash map and reads the offset.

The benefits are sequential writes, fast point lookups, and the possibility of using the main log as the recovery source without a separate WAL. Limits: the keydir must fit in RAM and must be rebuilt/verified on restart; data is unsorted, so efficient range scans are unavailable. Compaction reads log segments, keeps live records according to keydir/tombstones, writes new segments, then updates offsets. A crash during segment replacement needs a manifest/commit protocol so neither the old nor new copy is lost.

## WiscKey: sort keys, append values

WiscKey stores keys and pointers to values in an LSM tree, while values are appended to a separate **value log (vLog)**. During compaction, the LSM mostly moves small keys and pointers instead of rewriting large payloads. Get finds the key in the LSM and follows the pointer into the vLog; range scans remain ordered by key, but value reads can be scattered.

The tradeoff is that the vLog retains old/deleted values after updates. Garbage collection must determine which offsets the key tree still references, read the value log, move live values, and update pointers. Segment head/tail metadata can avoid scanning the whole file, but must coordinate with concurrent writes and compaction. The design can fit large values, small keys, and suitable update/delete patterns; for small values or many point reads, extra seeks can outweigh the saved compaction work.

| Property | Bitcask | WiscKey |
| --- | --- | --- |
| Key index | In-memory hash map | LSM tree on storage |
| Value placement | Same append log as keys | Separate append vLog; keys store pointers |
| Range scans | No key order | Ordered keys; value fetches may be random |
| Main cost | RAM/rebuild keydir and compaction | vLog GC, pointer updates, and extra value reads |

## Log stacking: an upper-layer append may not append on the device

A write can pass through several layers: database WAL, memtable flush, SSTable compaction, filesystem journal/writeback, block layer, and SSD FTL. Each layer can copy, reorder, buffer, and garbage-collect independently. An LSM logical append can still create multiple physical writes in compaction, the filesystem, and FTL; unaligned writes from interleaved streams can cause fragmentation and read-modify-write.

In NAND, pages may be programmed, but erasure happens at block granularity. The FTL maps logical pages to physical pages, moves live pages out of a block before erasing it, and distributes wear. A filesystem journal also keeps its own metadata/data log. If database compaction rewrites data and the filesystem/FTL later relocates those pages again, total write amplification can exceed the value measured at the database layer.

Measure from both sides: application logical bytes, database-written bytes, device writes/appropriate SMART or telemetry, latency, and compaction backlog. Alignment, discard/TRIM behavior, filesystem, and device can change the result. Moving WAL to a separate device can sometimes isolate I/O, but only helps after measuring the bottleneck and understanding the durability topology.

## LLAMA and coordination between access method and storage

A storage layer that does not know which files hold keys/values or deltas can only relocate bytes; it might co-locate deltas while readers still have to replay them. LLAMA is a research example of a log-structured, latch-free, **access-method-aware** storage layer for the Bw-tree: when garbage collection reads a logical node's deltas, it can merge them into a new base node at the same time. This reclaims old pages and reduces the chain readers must replay.

The benefit is that a storage layer understands the semantics its upper layer uses, but coupling increases and the API must define versioning, atomic publication, recovery, and reclamation responsibilities. Open-Channel SSDs in the book are a research direction that lets software control placement/GC instead of part of the FTL; hardware support and interfaces change over time, so treat this as historical/research architecture, not the current default.

*Database Internals*, chapter 7, places Bitcask, WiscKey, flash translation, filesystem logging, LLAMA, and Open-Channel SSDs in one story about where data is appended, sorted, relocated, and reclaimed.

## Check your understanding

**Can Bitcask efficiently find a range `key > x` like an LSM?** No; its keydir is a hash map and has no key order.

**Does WiscKey remove compaction/GC?** No; it reduces payload rewrites in the LSM, but the value log still needs dead-value reclamation and pointer updates.

**Does LSM append mean device writes only append?** No; compaction, filesystems, and FTL can rewrite/move data several times.
