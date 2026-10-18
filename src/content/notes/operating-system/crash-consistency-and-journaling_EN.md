---
title: "Crash consistency and journaling: recovery after power loss"
category: "Operating System"
tags: ["filesystem", "journaling", "crash consistency"]
description: "Analyze multi-block updates, write ordering, journaling, and durability limits applications need to understand."
updated: 2026-10-16
translationKey: "operating-system/crash-consistency-and-journaling"
---

Creating a file may update a directory entry, inode, bitmap, and data block. If power fails after only some writes reach the device, the filesystem can become inconsistent: a name may point to an unallocated block, or a block may be allocated with no file referring to it.

## At what level is an operation atomic?

A system call can look like one operation to an application while the filesystem updates several blocks. The device need not write them all at once. **Crash consistency** asks which structures remain valid and which data survives after a crash at any point.

A successful `write()` usually means the kernel accepted some bytes; data may still be cached. `fsync()` or a corresponding primitive requests synchronization under the system contract, but the correct file and directory may both need syncing after creation or rename to ensure required metadata is durable. Check filesystem and portability details.

Appending a block may require writing three things: the new data block, an inode with a larger size and pointer to the block, and a bitmap marking the block allocated. If only the inode is written, it may point to garbage while the bitmap still says the block is free. If only the bitmap is written, the block is consumed but owned by no file. Some write orders merely lose the new append; others create inconsistency or leak space. A syscall is not a promise that all physical blocks update atomically.

## Journaling

A filesystem journal first records metadata updates or a transaction, then applies them to their home locations. After a crash, recovery reads the journal and completes or discards an uncommitted operation according to the protocol. Metadata journaling helps restore filesystem structure quickly, but does not automatically make all application data durable.

In a redo-logging model, a transaction proceeds in phases: write its begin record and updates to the journal; only after the log contents are durable write a commit/end marker; then checkpoint the new blocks to their final locations. On mount, a transaction without a commit marker is discarded; a committed transaction with incomplete checkpointing is replayed. Log and commit writes need durable ordering. If a device has a write cache, merely waiting for a write command to complete may not be enough. Filesystems use flushes, barriers, or equivalent mechanisms; details depend on implementation.

To record several blocks safely, the log needs a way to recognize a complete transaction, such as a commit marker and checksum; it cannot assume a large write reaches media in order. A crash during checkpointing does not lose a committed transaction: recovery can write the committed blocks again.

A finite journal is often circular: once a transaction is checkpointed, its log space can be released and reused. A filesystem can group nearby changes into one transaction to avoid repeatedly writing the same bitmap, inode, or directory. The tradeoff is a longer period when dirty state exists only in RAM.

In metadata-only journaling, file data is not written to the journal. To prevent a recovered inode from pointing to unwritten data, ordered mode forces data blocks to disk before committing metadata. Writeback mode has weaker ordering; journaling can leave metadata consistent without preserving the newest contents. Journaling both data and metadata lowers content risk but increases writes because data is logged and then checkpointed again.

Block reuse creates a subtle case: an old journal transaction may contain directory/data for a block that has since been freed and reallocated to a new file. Blindly replaying the old transaction could overwrite new data. Some journals use revoke records to tell recovery not to replay old contents for that block.

## What does fsck repair, and why can it be slow?

A filesystem checker commonly runs before a filesystem is made available. It checks the superblock (possibly using a backup), scans inodes and indirect blocks to reconstruct allocation bitmaps, compares inode/link counts with the directory tree, finds duplicate or out-of-range block references, and validates directory entries. An allocated inode with no directory reference may be placed in `lost+found`, depending on the tool and filesystem.

A checker can restore metadata structure but cannot infer correct user content if a block contains garbage. Scanning an entire volume takes time proportional to filesystem size. Journaling shortens recovery by focusing on unfinished transactions, while a full check remains useful for errors that journaling does not address.

## Other design approaches

Soft Updates preserve consistency by ordering writes among structures—for example, writing a target block before the inode that points to it. This avoids journaling data but requires precise knowledge of each filesystem's dependencies. Copy-on-write writes a new version into free blocks, then changes a root pointer to publish the new tree rather than overwriting the old version in place. These approaches trade complexity, I/O, and space reclamation differently.

The book also discusses less common research directions: backpointer-based consistency adds reverse references to detect mismatched pointers on read; optimistic crash consistency permits multiple writes and uses checksums or similar mechanisms to detect incomplete transactions. These are design examples, not universal interfaces present on every filesystem.

Some filesystems journal all data; others journal metadata only or use copy-on-write trees. Journaling mode and write ordering affect semantics and performance. The word “journal” alone does not mean every file's content is always preserved.

## Ordering and flushes

Correct transactions depend on the filesystem and device preserving required write order. Write barriers, flushes, and force unit access relate to ordering and durability. A device cache can mean data has not reached the medium even when the OS believes an operation completed, unless the right mechanism is used.

This boundary spans the application, filesystem, block layer, driver, and device. Durability is an end-to-end property, not just one function call.

## Atomic rename and file-update patterns

A common pattern writes contents to a temporary file, syncs the file, renames it to its final location, and syncs the directory according to required semantics. Rename within one filesystem is commonly atomic as an observable name change, but does not by itself make contents durable if flushes are omitted.

The exact pattern depends on OS, filesystem, and application requirements. Important data needs a documented protocol and crash/recovery testing.

## Summary

- A file operation can update several blocks; a crash between writes can leave them inconsistent.
- Data blocks, inodes, and allocation bitmaps can disagree after a partial update.
- Journaling records updates for recovery, but its data guarantees depend on what the filesystem journals.
- Redo journaling commits a transaction before checkpointing; recovery replays only committed transactions.
- Journals can batch transactions and reuse log space circularly; ordered mode writes data before committing metadata.
- Revoke records prevent recovery from replaying stale data after a block has been reused.
- `fsck` reconstructs or checks metadata, but requires a broad scan and cannot restore lost file contents.
- Soft Updates preserve consistency through write ordering; copy-on-write writes a new version before switching the root.
- Journal recovery can scan the log instead of the full volume; other designs use backpointers or optimistic checks.
- A successful `write()` does not prove durability; use synchronization primitives that match the required guarantee.
- Ordering and flush behavior must hold across the filesystem, driver, and device.
- Atomic rename changes a name atomically but does not by itself make file contents durable.

## Check your understanding

**Does filesystem journaling guarantee that all application data survives power loss?** Not necessarily; many modes journal metadata only.

**Does `fsync` on a file always guarantee its new name survives a crash?** A directory sync may also be required under the system's semantics.

**Does atomic rename alone make a file update durable?** No. The file and relevant directory may need synchronization.

## Read next

For integrity checks, recovery, snapshots, and backups, see [Filesystem integrity and recovery](/en/notes/operating-system/filesystem-integrity-and-recovery/).
