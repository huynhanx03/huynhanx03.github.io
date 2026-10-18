---
title: "TLB Shootdowns and Address-Space Switching"
category: "Operating System"
tags: ["operating-system", "memory", "tlb", "multiprocessor"]
description: "Understand why page-table changes require invalidating translation caches on one or more cores."
updated: 2026-10-16
translationKey: "operating-system/tlb-shootdown-and-address-space-switch"
---

The TLB caches translations from virtual to physical addresses along with access permissions. When the kernel changes a page table, an old TLB entry may no longer be valid. If the CPU uses the stale entry, it may access the wrong page or bypass a new permission; the kernel must therefore invalidate the relevant translation.

## Local invalidation and address spaces

When a thread switches to another address space, the architecture may require a TLB flush or may use address-space identifiers to retain entries from multiple processes without confusing them. ASID/PCID can avoid flushing everything, but entries still need synchronization when mappings change.

## Multicore shootdowns

A process may run on several cores, each with its own TLB. If a page table changes while another core holds an old entry, the kernel must send an interrupt/IPI asking that core to invalidate it. This is a TLB shootdown. It adds latency, especially when mappings change frequently or many cores are involved.

Unmapping a page is an important example: before reusing a physical frame for other data, the kernel must ensure no core can still access it through an old translation. Batching invalidations may reduce cost, but must preserve ordering and safety.

## Performance and observation

Huge pages can reduce TLB pressure for large contiguous regions, but increase granularity, may waste memory when used poorly, and can affect reclaim and compaction. Large-scale mapping or unmapping may trigger many shootdowns. Optimize by measuring workload, TLB misses, and kernel cost rather than enabling huge pages by default.

## Check your understanding

**Does editing a page table automatically clear every TLB entry on every core?** No.

**Can a TLB shootdown involve an IPI?** Commonly, on multicore systems, to ask another core to invalidate an entry.

**Are huge pages always faster?** No; benefits and costs depend on the workload.

## Further reading

Copy-on-write also changes mapping permissions and can cause a page fault when a process writes to a shared page.
