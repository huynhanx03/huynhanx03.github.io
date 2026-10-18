---
title: "Filesystem integrity: checksums, checking, and data recovery"
category: "Operating System"
tags: ["filesystem", "integrity", "recovery", "storage"]
description: "Distinguish structural consistency from data integrity, and understand checksums, fsck, snapshots, and backups."
updated: 2026-10-17
translationKey: "operating-system/filesystem-integrity-and-recovery"
---

After a crash, a filesystem may mount while some files are corrupted; or the data may be intact while metadata prevents a filename from being reached. Distinguish **structural consistency**, **content integrity**, and **durability** of data acknowledged as written.

## Structural checks and fsck

A filesystem checker can compare inodes, directories, block allocation, and metadata. If it finds a mismatch, it may repair it according to filesystem rules, but that repair may choose one interpretation after some original data is already lost. Usually, do not run `fsck` on a mounted filesystem: the kernel and checker could both modify it, causing inconsistency and more damage. Check the filesystem-specific instructions and ensure it is unmounted or otherwise safe before repair.

On the ext2/ext3/ext4 family, `fsck` commonly identifies the filesystem and invokes a tool such as `e2fsck`. `fsck` is a general interface; checking details and options depend on the filesystem.

A journal helps recover metadata transactions; fsck performs deeper checks when needed. They have different goals and do not completely replace each other.

## Checksums detect corruption

A checksum/hash records a signature of a block or object so unexpected changes can be detected. A stronger checksum reduces collision probability but cannot restore data by itself. A filesystem with redundancy or replication may use another copy to repair data; designs such as copy-on-write checksummed trees combine detection with recovery depending on configuration.

An unrecoverable read error (latent sector error) is usually reported by the device; a mirror/parity array may fetch or reconstruct another block if enough redundancy remains. Silent corruption is more dangerous: the disk returns a readable but wrong block. A checksum can detect it before the system chooses a recovery copy. A simple XOR is fast but can miss compensating changes; Fletcher/CRC detect more patterns, though no finite checksum eliminates collisions. A checksum detects an error; it does not prove correctness if data and checksum were both changed.

Checksums should be tied to the correct block. Metadata checksums may include expected identity/location (such as file, block offset, or device address) to detect a misdirected write, where valid contents were written to the wrong location. A lost write is different: the device acknowledges completion but retains an old block, and a checksum stored beside that old block may still match. Keeping checksums in parent metadata (inode/indirect block) or doing read-after-write can detect this, depending on design and cost.

Periodic scrubbing reads even rarely accessed data so checksums are checked before an error accumulates across every copy. Scrubbing can find latent errors/corruption and use redundancy to recover, but consumes I/O; schedule and rate must be balanced against workload. Checksumming also costs CPU and checksum storage. Keeping checksums separate from data may require extra I/O, while checking during copying can reduce CPU overhead.

A checksum does not stop an attacker who can change both the data and the checksum: the attacker can recompute it. To authenticate content against someone without the key, use a keyed mechanism such as a MAC/HMAC or a digital signature, and protect the key and authentication metadata. This differs from detecting random errors with a checksum; see [RFC 2104 on HMAC](https://www.rfc-editor.org/rfc/rfc2104.html).

## Snapshots and backups

A snapshot records state at a point in time using copy-on-write or a volume manager. It is useful for rollback or a consistent point, but is often on the same storage system and does not protect against device failure, ransomware, or an administrative mistake that destroys the whole volume.

A backup needs an independent copy, version history, access control, and a practiced restore procedure. A backup never restored is only a hypothesis about recoverability.

## Summary

- Structural consistency differs from content integrity and durability.
- Journals recover transactions; checkers detect/repair inconsistencies according to filesystem rules.
- Checksums detect changes but do not restore data by themselves.
- A device may report a latent read error; checksums reveal silent corruption before redundancy can repair it.
- Identity in a checksum can detect misdirected writes; parent metadata checksums can help detect lost writes.
- Scrubbing checks rarely read data at an I/O/CPU cost.
- A snapshot is convenient for rollback but is not an independent copy.
- Backups need versions, isolation from failures, and regular restore tests.

## Check your understanding

**Can a checksum repair a corrupted file?** Not without suitable redundant data.

**Does a snapshot on the same drive protect against drive failure?** No.

**Does a successful mount prove every file's contents are correct?** No. It only means the filesystem is accessible to some extent.

## Read next

After local-disk filesystems, the Network topic expands to distributed filesystems and network file access.
