---
title: "Filesystem locality and the FFS design"
category: "Operating System"
tags: ["filesystem", "locality", "ffs", "storage"]
description: "Learn why placing related data nearby reduces I/O and how FFS cylinder groups preserve locality."
updated: 2026-10-16
translationKey: "operating-system/filesystem-locality-and-ffs"
---

A filesystem does not only find free blocks; it tries to place blocks likely to be read together near one another. If directory metadata is far from a file's data, opening and reading the file may require several HDD head movements.

## Locality and workload

Files in one directory, files belonging to one application, or metadata next to data may be accessed close together in time. Placing them nearby reduces HDD seeks and helps sequential reads. SSDs remove mechanical seek costs, but locality still affects caching, request batching, and fragmentation.

There is no single access pattern for every system. File servers, build trees, and databases have different workloads, so filesystems use heuristics to predict likely access.

## The cylinder-group idea

The Fast File System (FFS) divides a filesystem into groups of nearby regions, each with metadata and data blocks. When possible, a directory and related files are placed in the same or neighboring groups. This aims to preserve locality instead of putting all inodes at one end and data at the other.

FFS also uses allocation policies to keep a file's blocks contiguous, distribute directories across groups for balance, and reserve some free capacity to avoid severe fragmentation. These are historical contributions and foundations; modern filesystems may use different structures, but locality remains a concern.

When creating a directory, FFS favors a group with relatively few directories and enough free inodes so new files can fit there. A file's inode and data are often kept in the same group, and files in one directory are placed nearby. Very large files are an exception: after an initial section, larger subsequent chunks can move to another group so one file does not consume the whole group and push related files away. Chunks must be large enough for transfer time to offset seeks between groups; sequential reads may then seek between chunks.

## The free-space tradeoff

When a filesystem is nearly full, it is harder to find contiguous space, so allocation can become more fragmented and slower. Keeping free space gives the allocator better choices but trades away immediately usable capacity. Reserve ratios and behavior depend on the filesystem; there is no universal percentage for every workload.

Historical FFS also used sub-blocks smaller than the standard block so small files did not waste nearly half a block; as a file grew, sub-blocks could be gathered/copied into a full block. Some older disks needed time between consecutive sector reads, so FFS used rotationally interleaved layouts to place the next sector where the host could request it in time. Modern controllers often buffer a full track internally, so filesystems rarely need to manage rotational geometry this way.

## Locality on SSDs

An SSD does not need to reduce HDD head seeks, but flash is written in pages and erased in blocks, while its controller performs garbage collection. Filesystems still care about locality for caches, prefetching, metadata, and sequential request patterns. HDD-specific tuning should not be copied directly to SSDs.

## Summary

- Locality places related data nearby to reduce access cost.
- FFS uses cylinder groups and allocation policy to preserve locality.
- FFS groups inode/data, places files from one directory nearby, and moves chunks of very large files to avoid consuming a whole group.
- Nearly full filesystems have fewer good placements and can fragment more.
- Sub-blocks reduce waste for small files; rotational interleaving helped older disks serve sequential reads in time.
- SSD hardware changes, but locality is still useful.
- Placement policies are workload heuristics, not a guarantee that access is always nearby.

## Check your understanding

**Does FFS keep every block of a file contiguous forever?** No. Fragmentation and updates can change placement over time.

**Does locality stop mattering on an SSD because there is no mechanical seek?** No. Caches, batching, and layout still affect behavior.

**Is a filesystem at 99% capacity guaranteed to be twice as slow?** No fixed ratio exists; measure the workload and fragmentation.

## Read next

Locality helps performance; crash consistency keeps structures valid after power loss during an update.
