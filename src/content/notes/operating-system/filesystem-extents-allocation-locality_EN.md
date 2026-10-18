---
title: "File Allocation, Extents, and Locality"
category: "Operating System"
tags: ["operating-system", "filesystem", "storage"]
description: "Compare block allocation, extents, and locality; understand fragmentation, metadata overhead, and how data placement affects I/O."
updated: 2026-10-16
translationKey: "operating-system/filesystem-extents-allocation-locality"
---

A filesystem maps variable-length files to blocks on a device. How it maps a file's logical offsets to physical blocks affects sequential and random performance, metadata overhead, and fragmentation.

## Block and extent allocation

Mapping every block individually is easy to represent, but large files need many entries. An extent describes a contiguous run of blocks by its starting point and length, reducing metadata when a file is allocated in one region. A tree or index structure can store multiple extents for a fragmented file.

A file may have empty regions (a sparse file): a logical offset exists without a corresponding data block. Reads from that region return zero bytes according to filesystem semantics without storing the zero bytes. Therefore, `du` and `stat` may report different logical size and allocated space.

## Locality and fragmentation

Rotating disks pay seek and rotational costs, so placing blocks nearby can reduce sequential-read latency. SSDs have no mechanical seek, but locality still affects command count, queueing, caching, and write amplification. Fragmentation increases the number of regions accessed, though its impact depends on the device and workload.

A filesystem may delay allocation (delayed allocation) to observe more writes before selecting a larger region. This can improve extents, but means a disk-full error may appear later than when the application calls `write`. `fsync` and durability contracts still determine when data is required to become stable.

## Metadata space and small files

Small files may still need inodes, directory entries, journal records, and metadata blocks. Many small files can therefore exhaust inodes before data blocks. Check `df -h` for block capacity and `df -i` for inode capacity.

## Check your understanding

**What is an extent?** A description of a contiguous block region by its location and length.

**Can a sparse file have a large logical size but use few blocks?** Yes.

**Does an SSD make locality completely irrelevant?** No; the mechanisms differ from a rotating disk, but I/O count and layout still matter.

## Further reading

After allocation, journaling and crash consistency determine which metadata and files remain valid after power loss.
