---
title: "Page-table size and sparse address mappings"
category: "Operating System"
tags: ["memory", "page table", "paging", "address space"]
description: "Calculate the cost of flat page tables and understand multi-level tables, huge pages, and sparse address spaces."
updated: 2026-10-17
translationKey: "operating-system/page-table-size-and-multilevel"
---

A flat page table has an entry for every virtual page in the supported address space. With 32-bit addresses and 4 KiB pages, there are `2^32 / 2^12 = 2^20` pages. If each PTE is 4 bytes, one contiguous table needs 4 MiB per process, even if most of its address space is unused.

This is an illustrative assumption, not a description of every CPU or OS. With 64-bit addresses, the potential space is much larger, making a flat table even more wasteful.

## Multi-level page tables

Split the virtual page number into fields for different levels. In a two-level example, a page-directory entry (PDE) says whether the corresponding child table exists and which frame contains it; entries in that child table (PTEs) identify virtual-page mappings, frames, and permissions. If a PDE is invalid, there is no child table to walk. If it is valid, the remaining index selects a PTE. A valid PDE therefore says at least one PTE exists in that child table's region; it does not replace each PTE's own valid bit.

Child tables are commonly divided so each piece fits in a physical page. For example, consider a 14-bit address with 64-byte pages: the offset takes 6 bits, leaving an 8-bit VPN. With 4-byte PTEs, a linear table has 256 entries (1 KiB), or 16 page-table pages. Split the VPN into a 4-bit directory index and a 4-bit table index. If only code, heap, and stack near opposite ends are used, the system needs only the child-table pieces containing those mappings plus the directory, rather than all 16 contiguous table pages.

Sparse spaces save substantial metadata, and child tables can occupy arbitrary frames, but page walks become more complex. A TLB hit still returns a mapping directly; on a miss, a two-level table reads the PDE and then the PTE, more reads than a linear lookup. More levels save more space but make a TLB miss more expensive.

## Huge pages

A huge page maps a larger physical region with one translation entry. It can reduce page-table metadata and TLB pressure, particularly for large contiguous working sets. The tradeoff is harder allocation/compaction, more fragmentation, and coarser protection and copy-on-write granularity. Transparent huge pages let the kernel choose according to policy; explicit huge pages require application or administrator management.

## Kernel mappings and shared tables

The kernel can use common mappings in multiple address spaces to make entering kernel mode efficient, with appropriate protection. Processes may share page-table mappings for libraries or shared memory. Fork with copy-on-write can share initial pages and copy them on write.

## Other organizations

Some historical systems combined segmentation and paging: each segment had its own page table, while the segment's base and bounds pointed to and limited that table. This avoided entries for large gaps between code, heap, and stack but retained the address-space segmentation model. Sparse regions inside a segment could still waste space, and variable-sized page tables could again suffer external fragmentation.

An **inverted page table** reverses the organization: one shared table has an entry for every physical frame, recording the process/address space and virtual page using that frame. This reduces metadata tied to the number of virtual pages, but makes reverse lookup harder; systems often need a hash lookup rather than a linear scan. Page tables also need RAM. Some designs can page out the page table of a process that is not running; the kernel must bring it back before scheduling that process. This is not an ordinary page replacement on each memory access; see these [paging lecture notes](https://cs.nyu.edu/~gottlieb/courses/2000s/2009-10-fall/os2250/lectures/lecture-11.html).

### Exercise: trace a page walk

For each configuration, calculate offset bits from page size, remaining VPN bits, entries per page-table page (page size divided by PTE size), and the VPN fields assigned to each level. Then trace an address through the directory and child table, checking your result with a page-table simulator if available. Compare one, two, and three levels: what condition permits each walk to continue, how many levels can be skipped when a PDE is invalid, and how many child tables are needed for an address space using code, heap, and stack in only a few regions? A deeper walk makes a TLB miss more expensive; it does not make every access that slow when the TLB hits.

## Summary

- A flat table allocates entries even for sparse address spaces.
- Multi-level tables create child tables only for used regions, at the cost of deeper page walks.
- A PDE points to a page-table portion; a PTE maps one page to a frame and permissions.
- An inverted table saves metadata based on physical frames but needs efficient reverse lookup.
- TLBs and page-walk caches reduce repeated translation cost.
- Huge pages reduce translation pressure but increase granularity and fragmentation.
- Shared mappings still have permissions; sharing does not grant every process write access.
- Computing entries per page and splitting the VPN makes page walks easier to verify.

## Check your understanding

**Does a 64-bit address space make a flat page table cheaper?** No. The number of possible pages is much larger.

**Do huge pages always reduce memory use?** They reduce metadata but can waste data-page space.

**Does a TLB replace the page table?** No. It caches some translation results.

## Read next

Page tables describe mappings, but the kernel must also decide which pages are resident and handle swapping.
