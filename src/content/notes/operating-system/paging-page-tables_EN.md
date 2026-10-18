---
title: "Paging and page tables: mapping memory in pages"
category: "Operating System"
tags: ["memory", "paging", "page table"]
description: "Follow how an address splits into a page number and offset, then maps a virtual page to a physical frame."
updated: 2026-10-16
translationKey: "operating-system/paging-page-tables"
---

Mapping every virtual byte to a physical byte would require an enormous table. Paging divides an address space into fixed-size blocks called **pages**; physical RAM is divided into same-sized **frames**. A page table maps virtual pages to physical frames.

Pages and frames have equal size but are different concepts: a page belongs to a virtual address space, while a frame is a location in RAM. Page sizes depend on architecture and OS support; do not assume there is only one size.

## Splitting an address into page number and offset

Suppose, for illustration, that a page is 4 KiB = 4096 bytes. The offset requires 12 bits because `2^12 = 4096`. A virtual address can be viewed as:

```text
virtual address = virtual page number | offset
```

The MMU looks up the virtual page number in the page table to find a frame. The offset stays unchanged because the position within the page is preserved:

```text
page table[virtual page number] = physical frame number
physical address = physical frame number | offset
```

For example, if a virtual page maps to physical frame 20 and the offset is 37, the requested byte is at offset 37 within frame 20. This illustrates the arithmetic; real addresses depend on CPU width and paging mode.

## What does a page-table entry contain?

A **page-table entry (PTE)** usually contains a frame number and control bits: whether the page is present in RAM, whether it is readable/writable/executable, whether user mode may access it, and state such as accessed or dirty. The exact set of bits varies by architecture.

A PTE can represent a nonresident page or a special mapping. The kernel creates and changes page tables; hardware uses them during execution. If a PTE does not permit an operation, the CPU raises a page or protection fault for the kernel.

In a simple linear table, hardware takes the VPN and computes the PTE location as `page-table base + VPN × sizeof(PTE)`. A valid PTE supplies the frame to combine with the offset. An invalid PTE commonly means the address is not mapped; a valid PTE whose permissions disallow the operation causes a protection fault. Real architectures have more detail, but this distinction explains why not all address errors are the same.

Page tables in RAM also cost time: without translation caching, a data access requires reading a PTE and then reading or writing the data. Instruction fetches also need translation. The TLB caches recent mappings so a PTE need not be read from RAM for every reference.

## Multi-level tables address table size

Wide address spaces make a flat table expensive because it contains entries for every possible page, including unused regions. Many architectures use multi-level page tables: upper levels point to child tables, and only needed branches are created. This saves space for sparse address spaces but makes lookup more complex.

An address may be split into several index fields:

```text
level-1 index | level-2 index | ... | page offset
```

The MMU follows these indices to the final PTE. The number of levels and width of each index depend on the architecture; large pages can reduce the number of entries needed for some workloads.

## Internal fragmentation and physical memory

Paging removes external fragmentation from fixed-size frame allocation: a process does not need contiguous physical frames. But the last page of a region may contain unused bytes, causing internal fragmentation. Page tables also consume RAM, and allocating a page does not mean the program uses every byte in it.

Scattered physical frames can still back a contiguous virtual address range. This lets the kernel and allocators provide convenient memory even when physical RAM is fragmented.

## Page permissions protect code and data

The kernel can mark a region read-only or non-executable. For example, program code usually does not need write permission; under modern protection policies, a stack usually does not need execute permission. Exact permissions depend on platform and configuration.

If a program writes to a read-only page, a protection fault prevents erroneous or unauthorized access. Copy-on-write is a special case: two processes temporarily share a read-only page; when one writes, the kernel creates a private copy and updates its mapping.

## Summary

- Paging maps virtual pages to same-sized physical frames.
- An address splits into page number and offset; translation changes the page number and preserves the offset.
- A PTE contains a frame plus relevant permissions and state.
- Multi-level page tables save space for sparse address spaces.
- Paging removes the need for contiguous physical memory but still costs page-table space and may waste part of a page.

## Check your understanding

**Are a page and a frame the same object?** No. A page is a virtual block; a frame is a physical RAM block.

**Does paging eliminate all memory waste?** No. The last page can be partly unused, and page tables consume space.

**Does the offset change during translation?** No. The MMU finds the frame and preserves the position within the page.

## Read next

Multi-level tables still need fast lookup. [The TLB and address translation](/en/notes/operating-system/tlb-address-translation/) explains the cache for recent mappings.
