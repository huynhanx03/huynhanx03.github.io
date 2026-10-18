---
title: "Page replacement: OPT, FIFO, LRU, and Clock"
category: "Operating System"
tags: ["memory", "page replacement", "lru", "paging"]
description: "Simulate a page-reference string to compare fault counts and trade-offs among replacement policies."
updated: 2026-10-16
translationKey: "operating-system/page-replacement-algorithms"
---

Suppose there are three frames and the reference string is `1, 2, 3, 1, 4, 1, 2`. A page fault occurs whenever a page is not resident; when memory is full, the policy chooses a victim. This example shows that an algorithm changes the fault count, but real workloads have more complex locality and page sizes.

RAM can be viewed as a cache of virtual pages. The goal is often to reduce misses/page faults, but a fault that needs storage is usually far more expensive than accessing a resident page. A simple expected-cost model is `E[T] = P(hit) × T_hit + P(fault) × T_fault`, where `T_hit` and `T_fault` are the total service times conditional on each outcome. Because `T_fault` is often large, even a small fault rate can dominate average time. This is only a simplified model: some faults need no storage access, and costs depend on the backing layer and system state.

## OPT

OPT replaces the page whose next use is farthest in the future. In the example, before page 4 is needed, frames hold 1, 2, and 3; later references use 1 and 2 but not 3, so OPT replaces 3. OPT is an ideal lower bound, not an implementable policy, because the kernel does not know the future. Comparing a real algorithm's hit rate to OPT on the same trace shows the remaining gap.

## FIFO

FIFO replaces the page that was loaded earliest. It is simple, but an old page may still be used frequently. FIFO can exhibit **Belady's anomaly**: increasing the number of frames can increase the fault count for some reference strings.

A page-reference string is commonly analyzed using three cache-miss types: **compulsory/cold-start** is the first access to a page; **capacity** occurs because there are not enough frames to hold the working set; **conflict** in hardware caches occurs because set placement is restricted. An OS page cache is commonly fully associative, so it does not have conflict misses in that set-associative sense. FIFO lacks the stack property: increasing capacity can increase misses (Belady's anomaly); LRU has a stack property, so the pages held with N frames are a subset of those held with N+1.

## LRU and Clock

LRU replaces the page least recently used, exploiting temporal locality. Exact LRU needs to update order on every memory reference, not only on faults; doing so frequently can be expensive. Clock approximates LRU with a circular frame scan and reference bits: a recently used page receives a “second chance,” its bit is cleared, and the scan continues until it finds a page with bit 0. Random or FIFO may sometimes outperform LRU for a sequential cycle through N+1 pages when the cache holds N, so choose policies based on workload rather than intuition alone.

Clock can also consider a dirty bit. A clean page can often be discarded and reread from its source; a dirty page must be written out before the frame is reused. A policy may therefore prefer a page that is both not recently used and clean, then select a dirty page if needed.

Page replacement chooses a victim; the OS also has a policy for when to load pages. Demand paging waits for the first access, while prefetching loads pages in advance based on predicted locality. A wrong guess wastes I/O and memory. Batching dirty-page writes can reduce storage-device cost.

## Count faults correctly

The result depends on the initial frames, loading rules, whether first-access faults are counted, and the reference string. Changing one variable in a program may touch several pages. Fault count is not directly equal to runtime because page source, cache, device, and concurrency differ.

## Practice: which policy fits which trace?

Create two reference strings of equal length: one that chooses pages nearly at random and one that repeats a small group of pages, then occasionally switches groups. Run each with FIFO, LRU, Clock, and OPT; keep the trace fixed and change only policy or frame count. Record fault counts in a table, then plot faults against frame count.

When reading results, check three things: does OPT provide the ideal lower bound; does FIFO show Belady's anomaly on any trace; and do LRU/Clock benefit from reuse in the local trace? Vary the size of the frequently used page group to see how a growing working set needs more frames. Do not conclude from one trace: the access sequence determines which policy helps.

## Summary

- OPT is an ideal lower bound; FIFO is simple but ignores locality.
- LRU exploits recency; Clock approximates it with reference bits.
- Belady's anomaly shows FIFO can fault more with additional frames.
- Fault counts require clear assumptions.
- Runtime latency depends on the page source and I/O layers.

## Check your understanding

**Does LRU always have fewer faults than FIFO for every string?** Do not generalize without comparing the specific policies and trace.

**Can a kernel use OPT?** It does not know future references.

**Does fewer page faults always mean faster execution?** Not necessarily; fault costs differ.

## Read next

When the working set exceeds RAM, even a good policy cannot prevent thrashing.
