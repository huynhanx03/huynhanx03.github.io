---
title: "The TLB: speeding up virtual address translation"
category: "Operating System"
tags: ["memory", "tlb", "paging", "mmu"]
description: "Understand the translation lookaside buffer, TLB misses, context switches, and how locality affects translation."
sources:
  - title: "Linux kernel documentation: Process Addresses"
    url: "https://docs.kernel.org/mm/process_addrs.html"
updated: 2026-10-17
translationKey: "operating-system/tlb-address-translation"
---

Page tables translate virtual addresses, but walking through several levels can require multiple memory reads. If every instruction fetch also required reading page tables from RAM, translation itself would add substantial delay.

CPUs commonly use a **Translation Lookaside Buffer (TLB)**, a small cache of recently used virtual-page-to-frame mappings. The TLB does not replace the page table; it keeps recent lookup results so the MMU can find them faster.

## TLB hit and TLB miss

When the CPU produces a virtual address:

1. The MMU checks the TLB using relevant address fields, such as the virtual page number and address-space identifier.
2. If a valid entry with appropriate permissions is found (**TLB hit**), the MMU can obtain the frame without walking the page table in RAM.
3. If it is absent (**TLB miss**), hardware may walk the page table or trap into the kernel, depending on the architecture.
4. After finding the mapping, the entry may be installed in the TLB for reuse.

A TLB miss does not mean the data is absent from RAM. It may only mean the translation is not cached. A page fault can occur if the page is nonresident or access permissions are invalid. This distinction matters when interpreting performance measurements.

## TLB locality

The TLB benefits from two kinds of locality. **Temporal locality** means a page used recently is likely to be used again soon, as in a loop over the same data. **Spatial locality** means that after accessing one address, a program often accesses nearby addresses; consecutive array elements can share a page. For example, ten 4-byte integers beginning at offset 4 in a 16-byte page touch three pages: the first access to each page may miss, while later elements in that page may hit. Repeating the scan while mappings remain in the TLB can make all accesses hit.

If a working set contains more pages than the TLB can hold, entries are continually replaced and misses rise. Thus, the number of pages covered by the TLB affects random-access performance. Larger pages can increase coverage, at the cost of more fragmentation and coarser management.

When a new entry is installed, an old one may need replacement. LRU uses the idea that a long-unused entry may be less useful; random replacement is simpler and can sometimes avoid poor LRU behavior in cyclic scans over slightly more pages than the TLB holds.

## Who handles a TLB miss?

Depending on the architecture, hardware may walk the page table and load the translation, or raise an exception for the kernel. With a software-managed TLB, a handler looks up the page table, writes an entry using a privileged instruction, and resumes the instruction that missed. This differs from an ordinary system call, which normally continues after the trapping instruction. The handler must avoid causing repeated misses itself; some architectures reserve fixed mappings for handler code and data.

A TLB entry commonly stores a VPN, PFN, permissions, and some state bits; a small fully associative TLB may compare the VPN against entries in parallel. The TLB valid bit says whether the cached entry can be used. On many architectures, a PTE present/valid bit says that the page currently has a usable mapping in RAM; the kernel also tracks virtual-memory-area metadata (a VMA on Linux) to decide whether the address is valid for the process. Bit names and exact meanings vary by architecture, so a TLB's “valid” bit should not be confused with whether an entire address range is valid ([Linux: Process Addresses](https://docs.kernel.org/mm/process_addrs.html)).

A loop over a large memory region can touch many pages even if it reads only one element per page. Larger pages can reduce the number of translations required, but trade off fragmentation, allocation flexibility, and management. No setting is best for every workload.

## TLBs and context switches

Two processes can use the same virtual address with different mappings. A simple solution is to flush the TLB when switching page tables; the new process then incurs cold misses when it accesses its pages. Address-space identifiers (ASIDs) tag entries so multiple processes can retain mappings, provided hardware uses the current ASID correctly. Shared code mappings can point to the same physical frame even when processes use different VPNs.

This creates some context-switch cost, but do not assume every process switch clears every cache and TLB. Modern mechanisms are more complex than the simple “everything is cold after a switch” model.

## TLBs and real memory costs

Access performance depends on both data caches and address translation. An access can hit the TLB but miss the data cache, or miss the TLB while the page is still in RAM. Profiling tools may expose TLB, cache, and page-fault counters, but interpret their names using the processor documentation.

If a program is slow, do not infer “not enough RAM” from one metric. Consider resident set size, page faults, cache/TLB misses, CPU utilization, and access patterns before changing page sizes or data structures.

## Exercise: observe the TLB working set

Allocate a large region, touch one element per page, then repeat long enough for measurements to stabilize. Increase the number of pages and graph average time against working-set size. A rise in cost may suggest pressure on a TLB level, but does not directly reveal its exact entry count.

Initialize the region before measuring to reduce demand-zero/page-fault noise. Ensure the compiler cannot remove the loop; pin the thread to one CPU if comparing one TLB; repeat runs and record variation. Caches, prefetching, page size, frequency scaling, and multiple TLB levels all affect results. The benchmark illustrates a trend; it does not replace CPU documentation or performance counters.

## Summary

- The TLB caches address translations and avoids repeated page-table walks.
- A TLB miss differs from a page fault: one is a missing cache entry, the other concerns page state or permissions.
- Page locality affects TLB hit rate.
- Context switches require address-space distinction but do not always flush all state.
- Data caches and the TLB are separate; measure the right event.

## Check your understanding

**Does a TLB miss mean the page was evicted from RAM?** No. The translation may simply be absent from the TLB.

**Does a TLB hit guarantee data is in L1 cache?** No. The TLB caches mappings; data caches hold memory contents.

**Will larger pages always make a program faster?** No. They can reduce TLB pressure but increase waste and affect allocation.

## Read next

After address translation, see what happens when a valid page is not resident: [Demand paging and page faults](/en/notes/operating-system/demand-paging-page-faults/).
