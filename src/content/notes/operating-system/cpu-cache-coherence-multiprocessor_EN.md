---
title: "Cache Coherence Across Multiple Cores"
category: "Operating System"
tags: ["cpu", "cache coherence", "multiprocessor", "memory model"]
description: "Understand cache-line ownership, invalidation, false sharing, and the difference between coherence and consistency."
sources:
  - title: "C++ draft: Order and consistency"
    url: "https://eel.is/c%2B%2Bdraft/atomics.order"
updated: 2026-10-17
translationKey: "operating-system/cpu-cache-coherence-multiprocessor"
---

Each CPU core may hold its own copy of a cache line. If core 0 writes to an address that core 1 has cached, the copies need coordination so the other core does not keep reading an old value. A cache-coherence protocol tracks ownership and state for the line to maintain rules for the same address.

## Invalidate/update protocols

One approach is to send invalidations to other caches when writing; the writing core gains ownership of the line. When another core reads it again, it fetches the new version. MESI-like protocols are a common model, but exact states differ among CPUs.

## False sharing

Two threads may modify independent variables on the same cache line. Coherence moves the line back and forth even though there is no logical data sharing—this is false sharing. Padding, alignment, or per-core partitioning may help, but increases memory footprint and must be measured.

## Coherence differs from memory consistency

Coherence helps cores agree on writes to the same address. Memory consistency also defines ordering relationships across operations on different addresses. For example, with two `std::atomic<int>` values initially set to zero, thread A can store `x=1` and then `y=1` using `memory_order_relaxed`; if thread B reads `y=1`, it may still read `x=0`. Each atomic is coherent on its own, but relaxed operations do not synchronize the two stores. If B reads `y` with acquire and that load takes its value from A's release store, the synchronization can make A's earlier write to `x` visible to B ([C++ draft](https://eel.is/c%2B%2Bdraft/atomics.order)). Coherence alone therefore cannot replace a lock or appropriately ordered atomics when publishing a group of state.

## Scalability and traffic

A global counter may serialize through cache-line ownership even when increments are atomic. Sharding a counter reduces write sharing, then results can be combined later. Lock-free algorithms also generate coherence traffic; they do not eliminate hardware contention.

## Summary

- Coherence coordinates cache lines for the same address across cores.
- Invalidation and ownership transfers generate traffic when many cores write.
- False sharing occurs when independent variables occupy the same line.
- Coherence does not replace memory-order synchronization.
- Sharding reduces hot-line contention but requires aggregation and consistency.

## Check your understanding

**Does a coherent cache mean every thread immediately sees every write in source-code order?** No; the memory model and synchronization still matter.

**Is false sharing a race condition?** Not necessarily; the code can be correct but slow.

**Does atomic increment avoid coherence traffic?** No; it still needs ownership of the line.

## Further reading

Connect this to [Atomic Operations and Memory Ordering](/en/notes/operating-system/atomic-operations-memory-order/) and multicore scheduling.
