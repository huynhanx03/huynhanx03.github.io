---
title: "Filesystem Journal Modes and Data After a Crash"
category: "Operating System"
tags: ["operating-system", "filesystem", "journaling"]
description: "Distinguish writeback, ordered, and data journaling, including what each mode does and does not guarantee after power loss."
updated: 2026-10-16
translationKey: "operating-system/filesystem-journal-modes-data-integrity"
---

A journaling filesystem records intended changes in a journal so it can restore consistent metadata after a crash. Modes differ in whether file data is written to the journal or whether they only enforce an ordering between data and metadata. Exact names and semantics depend on the filesystem.

## Three general modes

- **Writeback:** Metadata is journaled, but data writes may not reach the device before the metadata commit. After a crash, a new file may contain old or otherwise different data, depending on the filesystem and device.
- **Ordered:** Related data writes are requested before metadata that refers to them is committed. This often avoids exposing old data in a newly created file, but does not guarantee all data is durable.
- **Data journaling:** Both data and metadata are journaled, increasing protection but adding I/O and reducing usable capacity.

## Limits

A journal is not an application transaction across multiple files, and does not replace `fsync`, backups, or end-to-end checksums. A device write cache may lose data reported as complete if flush semantics or hardware behavior are inadequate. After a crash, journal replay restores structure but does not necessarily recover the last content a user expected.

## Check your understanding

**Does journaling guarantee that an application committed its data?** No.

**Does metadata consistency mean the latest file contents are intact?** No.

**Is data journaling free?** No; it adds writes and overhead.

## Further reading

Applications need `fsync` and an appropriate file-update protocol for their durability requirements.
