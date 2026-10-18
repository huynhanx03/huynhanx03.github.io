---
title: "RAID: performance, capacity, and fault tolerance"
category: "Operating System"
tags: ["storage", "raid", "reliability"]
description: "Understand striping, mirroring, parity, and why RAID does not replace backups."
updated: 2026-10-16
translationKey: "operating-system/raid-redundancy-and-performance"
---

RAID combines multiple storage devices into a configuration intended to increase throughput, keep operating after some drive failures, or both. Every RAID level trades usable capacity and performance against the failure modes it can tolerate.

## Striping and mirroring

**Striping** splits blocks across several drives. It can increase bandwidth when requests run in parallel, but does not provide redundancy by itself: one member failure may lose the volume, depending on the configuration.

**Mirroring** stores copies on multiple drives. Reads may be distributed; writes must update the copies according to controller or software semantics. A mirror commonly tolerates one member failure in each pair, but does not protect against accidental deletion, malware, software errors, or loss of the entire enclosure.

## Parity and write cost

RAID parity stores redundant information that can reconstruct data after a drive fails. With single-parity XOR, a missing block can be calculated from the remaining blocks and parity block. Many small writes may require reading and writing both data and parity, creating a write penalty. A cache or controller may reduce some cost but cannot remove the underlying constraint.

RAID 5 commonly tolerates one drive failure; RAID 6 uses two parity blocks and can tolerate two failures in a standard configuration. RAID 10 combines mirroring and striping, uses capacity differently, and its fault tolerance depends on which drives fail. Always verify the actual RAID level and implementation.

## Rebuilds and secondary risks

After replacing a failed drive, a rebuild reads large amounts of data from remaining drives and writes it to the replacement. Performance can fall during this time, and an additional error may make the volume unrecoverable depending on the RAID level. Large drives, heavy load, and long rebuild times require careful monitoring.

RAID is not a backup. It does not preserve version history or recover a file that was deleted or overwritten and synchronized to every copy. Backups need failure independence, versioning, and tested restores.

## Hardware, software, and observability

RAID can be implemented by a hardware controller or in kernel software. Understand where metadata lives, the drive replacement procedure, write-cache policy, battery or flash protection, and health alerts. “The volume is still mounted” does not prove every drive is healthy.

## Summary

- Striping distributes data for performance but provides no redundancy by itself.
- Mirroring keeps copies; parity stores information that can reconstruct some failures.
- RAID levels trade capacity and performance for different failure tolerance.
- Rebuilds are risky periods and can affect performance.
- RAID maintains availability through some drive failures; backups restore data history.

## Check your understanding

**Is RAID 1 a backup?** No. Deletion or incorrect writes can be mirrored to the other copy.

**Can RAID 0 tolerate one drive failing?** Usually not; data is distributed across members.

**Can RAID 6 always safely lose any two drives in every implementation?** Consider configuration, simultaneous failures, and data health; RAID does not replace backup and restore processes.

## Read next

RAID provides a logical device; the filesystem above it organizes files and directories.
