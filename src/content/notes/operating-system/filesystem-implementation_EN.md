---
title: "Filesystem implementation: blocks, inodes, and free space"
category: "Operating System"
tags: ["filesystem", "block allocation", "inode"]
description: "Explore superblocks, inodes, bitmaps, data blocks, and how filesystems map large files."
updated: 2026-10-16
translationKey: "operating-system/filesystem-implementation"
---

Applications see files and directories; storage devices operate on blocks. A filesystem maps logical concepts to blocks, tracks which blocks are used, and updates metadata so it can be mounted again after reboot.

## Basic metadata regions

A traditional filesystem may contain a superblock with overview information, an inode table, a bitmap/free-space map, and data blocks. Modern filesystems may use trees, extents, journals, checksums, and other structures. The classic diagram teaches roles; it does not describe every exact format.

An inode must map file offsets to data blocks. A simple design uses direct pointers for small files and multi-level indirect blocks for large ones. Modern filesystems often use extents: a contiguous on-disk range described by its start and length, reducing metadata for contiguous files.

## Block allocation

A bitmap uses one bit per block to track free/allocated state; other structures may use a free list or tree. When writing a file, the filesystem chooses blocks and updates inode mapping, size, and metadata. An interrupted update can leave structures inconsistent without a recovery mechanism.

Choosing nearby blocks often improves locality, but files can fragment as a system ages. Allocation balances fast search, coalescing free regions, and scalability.

## Exercise: infer state from disk

In a small simulated filesystem, run the same workload with several random seeds and compare before/after state to infer block and inode allocation rules. Then reduce the number of data blocks to a very small amount, and separately reduce the number of inodes; predict which operations still succeed and which fail.

These are different limits: running out of data blocks may prevent content growth, while running out of inodes may prevent new files even when many data blocks remain. Do not look only at total free capacity; identify which metadata/resource is exhausted.

## A directory is structured data

A directory may begin as a list of name-entry pairs; linear lookup becomes slow as it grows, so a filesystem may use an index or tree. Directories also need rules for `.`/`..`, hard links, and updates that need atomicity.

Separating filename from inode lets a rename within one filesystem mostly update a directory entry instead of copying data. Moving across filesystems commonly requires copying and then deleting because inode/block mappings belong to separate filesystems.

## Caching and writeback

The kernel commonly caches file data and metadata in RAM. Repeated reads may avoid the device; writes may be grouped and flushed later. This improves speed but leaves RAM and device state different for a period.

Applications needing durability must use the right synchronization primitives and understand filesystem/device semantics. `close()` is not always equivalent to “durable through power loss.”

## Trace a cold I/O and metadata cost

With empty caches, `open("/foo/bar")` may read inode and directory data at each pathname level to find the final inode. A later `read` follows the inode to data blocks; an ordinary read does not need the allocation bitmap because the inode already identifies the file's blocks. Dentry, inode, and data caches make repeated accesses much cheaper.

Writing into a new file region may need additional I/O for the data bitmap, inode mapping, and content block. Creating a file also needs a new inode and directory entry; if the directory must grow, it needs another block and related updates. In an uncached VSFS model, allocating a new block for a write can cause several metadata operations in addition to the data write. This is why write buffering, batching, journaling, and allocation policy matter. Exact I/O counts in a real filesystem vary with cache, layout, transactions, and implementation.

## Summary

- A filesystem maps logical files to blocks and metadata on a device.
- Inodes, extents, and pointers connect file offsets to data blocks.
- Bitmaps/free-space structures track available capacity.
- Locality and fragmentation affect device access count.
- Caching/writeback improve speed but require durability and recovery policies.
- A cold `open` may read structures along each pathname level; normal data reads do not need the allocation bitmap.
- New-block writes and file creation amplify I/O through bitmap, inode, and directory updates.

## Check your understanding

**Does an inode usually contain all file contents?** No. It contains metadata and mappings to blocks/extents.

**Does a bitmap with many free bits mean there is one large contiguous region?** Not necessarily; free blocks may be scattered.

**Does a filesystem cache only contents, not metadata?** Many metadata structures are cached too.

## Read next

Locality is an important principle for block placement and high-performance filesystem design.
