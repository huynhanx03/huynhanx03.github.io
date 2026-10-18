---
title: "Cache Coherence and False Sharing"
category: "Operating System"
tags: ["computer-architecture", "cache", "multiprocessor"]
description: "Distinguish real data sharing from false sharing, and understand how cache-line ownership hurts multicore performance."
updated: 2026-10-16
translationKey: "operating-system/cache-coherence-false-sharing"
---

Each core may keep a copy of a cache line in its private cache. If several cores only read it, the copies can be shared efficiently. When a core writes, the coherence protocol must ensure other cores do not keep using stale copies. Transferring ownership of a cache line has a cost, even when threads modify different variables.

## False sharing

Suppose two independent counters occupy the same cache line. A thread on core A increments the first counter while a thread on core B increments the second. Logically, there is no data race between the variables, but the cache line repeatedly transfers write ownership between cores. Performance falls even though the data is “shared” only because of its memory layout.

## Detect and address it

Measure scaling as thread count increases and use a profiler or hardware counters to detect cache-to-cache transfers when available. Padding or rearranging data so frequently written variables occupy separate cache lines may help, but it increases footprint and can cause other problems.

Atomic counters do not automatically fix false sharing: atomics protect access semantics, but the cache line still needs to transfer ownership. Sharding a counter per thread and combining values periodically often reduces contention.

## Check your understanding

**Does false sharing mean two threads write the same variable?** No; they may write different variables on the same cache line.

**Is padding always beneficial?** No; measure and consider memory and cache footprint.

**Do atomics eliminate cache-coherence traffic?** No.

## Further reading

Memory ordering defines which access orderings are visible across cores, alongside coherence for each cache line.
