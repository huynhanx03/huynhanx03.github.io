---
title: "Page Faults: Demand-Zero, File-Backed Pages, and Copy-on-Write"
category: "Operating System"
tags: ["operating-system", "memory", "page-fault"]
description: "Distinguish a valid page fault from a protection error, and trace demand-zero, file mapping, and COW handling."
updated: 2026-10-16
translationKey: "operating-system/page-fault-types-and-copy-on-write"
---

A page fault is an exception raised when the current page table cannot complete a translation. It does not by itself mean the page “is not in RAM” or that the program is wrong; the kernel checks the address, permissions, and mapping to decide what to do.

## Common handling paths

- **Demand-zero:** The address belongs to a valid region, but does not yet have its own page. The kernel allocates a zeroed page (or uses a shared zero page for a read) and updates the mapping.
- **File-backed:** The page belongs to a file mapping but is not resident. The kernel reads it from the page cache or storage; the thread may block while waiting for I/O.
- **Copy-on-write:** A page is shared read-only. On a write, the kernel allocates and copies a private page, then updates the mapping and permissions.
- **Protection fault:** The access is outside a valid region or violates permissions (for example, writing to a read-only page that is not COW). The kernel may send a signal such as `SIGSEGV`.

## Cost

A minor fault can be handled without reading from a storage device, for example when the page is already in the page cache or the kernel only needs to allocate it and update the mapping. A major fault waits for storage I/O and is usually much more expensive. Exact classification depends on the OS; a high fault rate may come from a large working set, memory pressure, mapping access patterns, or a newly started application.

## Check your understanding

**Does every page fault require a disk read?** No.

**Does writing a COW-shared page always cause a segmentation fault?** No; the kernel may allocate a private copy.

**Is a fault on a valid address necessarily major?** No.

## Further reading

Swap and reclaim handle pressure when resident pages exceed available RAM.
