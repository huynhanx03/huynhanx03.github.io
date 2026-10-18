---
title: "Log-structured filesystems: sequential writes and cleaning"
category: "Operating System"
tags: ["filesystem", "log structured", "storage"]
description: "Understand writing data and metadata as new log records, checkpoints, and segment cleaning in an LFS."
updated: 2026-10-16
translationKey: "operating-system/log-structured-filesystems"
---

A log-structured filesystem (LFS) writes changes into sequential segments instead of updating blocks in place. The idea takes advantage of sequential write throughput, especially for workloads with many small writes. When a new version is written, the old block becomes stale but cannot necessarily be reused immediately.

An LFS buffers both data and metadata in RAM, then writes a large segment sequentially. Writing individual blocks sequentially but far apart in time may still incur nearly a full rotation between operations; batching them into one large write amortizes that cost. In a simple HDD model, if positioning time is `T_position` and peak rate is `R_peak`, reaching fraction `F` of peak requires a segment roughly `D = (F / (1-F)) × R_peak × T_position`. This illustrates a trade-off: approaching peak requires a larger buffer and longer wait.

## Inode map and checkpoint

An LFS needs to find the latest version of an inode or data. An inode map connects a logical inode to its current block location; a checkpoint provides a starting point for fast mount and recovery. Periodic checkpoints and logged metadata help recover after a crash.

The checkpoint region points to the latest parts of the inode map; the inode map locates each current inode; the inode points to data blocks. Once the checkpoint region and inode map are cached, accessing an inode requires another mapping lookup. Directories still map names to inode numbers as in ordinary Unix filesystems, so moving an inode does not require updating every directory entry up to the root. This indirection avoids the recursive update problem in a system that does not overwrite in place.

## Segment cleaning

When the log fills, a cleaner reads segments, identifies live blocks, copies them into new segments, and reuses the old segments. If a segment contains many live blocks, cleaning requires substantial I/O and reduces write throughput. Victim-selection policy affects long-term performance.

To determine whether a block is live, the segment summary records the inode number and file offset for each block. The cleaner follows the inode map to the latest inode and checks whether that inode still points the offset to the old block address. A version number can quickly exclude data from a file that was deleted or truncated. A classic policy favors cleaning cold segments with few live blocks; hot segments tend to create stale blocks as they continue to be overwritten, so waiting may help. Cleaning can run periodically, while the disk is idle, or when space is needed.

## Crash recovery

The checkpoint region (CR) is a fixed starting point for locating the inode map. To avoid a partially written CR, an LFS keeps two copies and alternates updates; headers, bodies, trailers, and timestamps help choose the newest consistent copy after a crash. On reboot, the system uses the last valid checkpoint and may **roll forward** by scanning newer segments for valid updates after the checkpoint.

Older versions create garbage but can also become history or snapshots if the filesystem retains them. This reduces pressure to clean immediately, but needs a policy to limit and reclaim old versions so capacity does not run out.

## Trade-offs

Sequential append improves write efficiency, but random reads need mapping lookups; the filesystem must manage snapshots, versions, and garbage collection. SSDs have their own flash translation layer and garbage collection, so an LFS on SSD can interact with the controller; it is not automatically better than an ordinary filesystem.

## Summary

- An LFS writes updates sequentially as log segments.
- Batching updates in a segment amortizes HDD positioning costs.
- The inode map and checkpoint locate current versions and support recovery.
- Checkpoint region → inode map → inode → data; indirection avoids cascading directory updates when an inode moves.
- Old blocks become stale; a cleaner gathers live blocks to reclaim a segment.
- Segment summaries plus inode map/inode identify live blocks; hot/cold policy affects cleaning cost.
- Cleaning cost depends on live-data fraction and policy.
- Two checkpoint regions and roll-forward support crash recovery.
- SSD/controller garbage collection is another layer to consider.

## Check your understanding

**Does an LFS never overwrite or clean?** It appends writes but must clean segments to reclaim capacity.

**Is a log-structured filesystem always better on SSD?** No. Filesystem mapping and garbage collection interact with device behavior.

**Does the checkpoint contain every file's data?** No. It helps locate metadata and log state.

## Read next

Compare LFS with journaling and copy-on-write to understand crash consistency.
