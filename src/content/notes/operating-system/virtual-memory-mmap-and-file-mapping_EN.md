---
title: "mmap, File Mapping, and Shared Memory"
category: "Operating System"
tags: ["operating-system", "memory", "mmap"]
description: "Trace how mmap associates a file with a virtual address space and distinguish private from shared mappings."
updated: 2026-10-16
translationKey: "operating-system/virtual-memory-mmap-and-file-mapping"
---

`mmap` creates a virtual-address region associated with a file or anonymous memory. A process reads and writes it with ordinary loads and stores; page faults cause the kernel to bring needed pages into RAM. Mapping allows access to a file by offset and can share data without a `read` or `write` system call for every operation.

## Private and shared mappings

`MAP_PRIVATE` uses copy-on-write: multiple processes may see the initial page, but a write creates a private copy for the process. Under the usual mapping semantics, changes are not written back to the file.

`MAP_SHARED` allows changes to be visible through shared mappings and may write them back to the file. When data reaches storage is different from whether an application has requested durability; `msync`, `fsync`, and the filesystem/device contract still matter.

## Faults and file size

Mapping a large file does not necessarily load it all. Access to a nonresident page causes a fault; the kernel locates the data or reports an error. Access beyond the file length may cause `SIGBUS`; access to an invalid region may cause `SIGSEGV`. Truncating a file while it remains mapped can create difficult-to-predict application failures.

## When to use it

Memory mapping is useful for random access, large-format parsers, sharing read-only pages, or correctly synchronized IPC. It does not make I/O free: page faults, dirty writeback, the page cache, the TLB, and address-space limits still exist. For a small sequential file, simple buffered I/O may be efficient and easier to handle correctly.

## Check your understanding

**Does `mmap` guarantee that an assignment is durable on disk?** No.

**Is `MAP_PRIVATE` a way to edit a file in place?** No.

**Does mapping a large file immediately consume RAM equal to its size?** No; pages are faulted in as accessed.

## Further reading

File pages are shared with the page cache; buffered and direct I/O have different cache semantics.
