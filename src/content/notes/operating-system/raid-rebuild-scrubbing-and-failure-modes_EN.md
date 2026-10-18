---
title: "RAID Rebuilds, Scrubbing, and Failure Modes"
category: "Operating System"
tags: ["operating-system", "raid", "storage"]
description: "Understand rebuilds after a disk failure and latent sector errors, and why RAID does not replace backups or integrity checks."
updated: 2026-10-17
translationKey: "operating-system/raid-rebuild-scrubbing-and-failure-modes"
---

RAID uses redundancy to keep service or data available when some devices fail, depending on the RAID level. When a disk is replaced, the system rebuilds data or parity onto the new disk. This reads a large amount of data from the remaining disks, can take a long time, and adds load when the array is already most vulnerable.

## Rebuilds and risks

RAID 1 copies data; RAID 5/6 reconstruct data from parity. During a rebuild, an additional failure beyond the redundancy level may lose data or make most of the array inaccessible. A large array may encounter latent unreadable sectors while reading all its data; RAID cannot repair them without sufficient redundancy or another integrity source.

A latent-sector error (LSE) is a block the device cannot read and reports as an error; this differs from silent corruption, where the device returns incorrect data without reporting it. After losing a disk in RAID 4/5, the system must read the remaining disks; an LSE in a stripe that needs reconstruction can make the rebuild fail when only one parity remains. Two parity sets, as in RAID 6/RAID-DP, add tolerance for simultaneous failures but do not eliminate every form of corruption or failures beyond the redundancy level.

## Scrubbing and checksums

Scrubbing reads regions periodically to detect inconsistency or read errors before data sits untouched for a long time. With parity RAID, parity can be compared and repaired, but without content checksums the system may not know which copy is correct when it finds a mismatch. A checksum tied to block identity also helps detect a block written to the wrong location; a checksum stored only beside its data may not detect a lost write if the old data and old checksum remain together. Filesystems such as ZFS/Btrfs have end-to-end checksums for some data types and can repair from a valid replica.

## RAID is not a backup

RAID does not protect against accidental deletion, ransomware, metadata damage, loss of a host/controller, fire, or a bad write replicated across every mirror. Backups need an independent copy, versioning/retention, and restore tests.

## Check your understanding

**Does RAID 1 protect against deleting a file?** No; the deletion is mirrored.

**Does a parity mismatch always identify the correct data copy?** No, not without a checksum or authoritative replica.

**Is a rebuild only a lightweight metadata operation?** No; it reads and writes large amounts of data.

## Further reading

Durability requires understanding flushes, write caches, and controllers; RAID is only one part of the storage path.
