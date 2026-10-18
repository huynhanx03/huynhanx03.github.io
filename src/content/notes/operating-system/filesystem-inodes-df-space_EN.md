---
title: "Inodes, Blocks, and Why a Filesystem Runs Out of Space"
category: "Operating System"
tags: ["operating-system", "filesystem", "storage"]
description: "Diagnose a filesystem that is out of blocks or inodes, or whose space is held by deleted files that remain open."
updated: 2026-10-16
translationKey: "operating-system/filesystem-inodes-df-space"
---

A filesystem manages both data blocks and metadata such as inodes. Free byte capacity and free inode count are independent resources. A system may be unable to create a file even when `df -h` shows free space if the filesystem has run out of inodes.

## Blocks and inodes

`df -h` reports block capacity; `df -i` reports inode capacity. Many small files consume many inodes even when their total size is small. Directory trees and metadata also use blocks. `du` walks files that still have paths; `df` reflects blocks allocated by the filesystem.

## Deleted files that still consume space

Unlinking removes the directory entry, but if a process still has the file descriptor open, its inode and data remain until that descriptor closes. As a result, `df` can report more used space than `du`. `lsof +L1` can find some deleted-but-open files; restart or rotate files correctly so the process closes its descriptor.

## Quotas and reserved blocks

Quotas can limit a user, group, or project before the entire filesystem is full. Some filesystems reserve capacity for root or internal operations. Check quotas, mounts, inode usage, and open files before deleting data at random.

## Check your understanding

**Must `du` and `df` always show the same amount?** No.

**Does running out of inodes mean all data blocks are full?** No.

**Does deleting a large file that is still open immediately free its space?** No.

## Further reading

A directory entry points to an inode; the hard-link count determines when its data can be reclaimed.
