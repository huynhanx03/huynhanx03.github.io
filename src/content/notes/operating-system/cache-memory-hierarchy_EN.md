---
title: "Caches and the memory system: keeping data close to the CPU"
category: "Operating System"
tags: ["cache", "memory hierarchy", "locality", "computer architecture"]
description: "Learn why memory has multiple levels and how programs benefit from locality."
updated: 2026-10-16
translationKey: "operating-system/cache-memory-hierarchy"
---

A CPU can calculate much faster than RAM can provide data. If every addition had to wait for RAM, many execution units would be idle. Computers address this gap with a hierarchy: small, fast storage near the CPU and larger, slower storage farther away.

```text
Registers → L1 cache → L2 cache → L3 cache → RAM → SSD/HDD
fast, small                                      larger, more durable
```

This conceptual diagram does not mean every CPU has these exact levels or configuration. SSD/HDD is not a RAM cache in the same physical sense; the diagram highlights tradeoffs in capacity, latency, and cost.

## A cache keeps a copy for faster access

A cache keeps a copy of some data from a farther level. When the CPU requests an address:

- **Cache hit:** data is present in the level being checked.
- **Cache miss:** the system must search a lower level or RAM, which usually takes longer.

A cache does not hold all of RAM. It keeps a selected subset and replaces entries when space is needed. Hardware commonly transfers data in **cache lines**, contiguous blocks whose size depends on the CPU. Reading one byte can therefore fetch nearby bytes too.

L1, L2, and L3 often differ in capacity, latency, sharing among cores, and organization. Do not assume one size or latency applies to every machine; check CPU documentation or measure the target system.

## Locality helps the cache predict useful data

Caches work well because many programs exhibit locality:

- **Temporal locality:** recently used data is likely to be used again soon.
- **Spatial locality:** data near a recently used address is likely to be accessed next.

A loop over an array in order often uses both: the next element is nearby, and a region may be revisited. Traversing scattered nodes in a linked structure may have worse locality even when it visits the same number of elements.

Locality is a tendency, not a guarantee. A workload may exceed cache capacity, access randomly, or use data only once. In those cases the hit rate and benefit may be low.

## Where a cache line can go: flexibility versus lookup cost

When a block arrives from RAM, the cache needs a rule for where it can be stored. **Direct-mapped** gives each block one location: lookup is fast, but two blocks mapping to the same line evict one another even when other cache space is free. **Fully associative** permits any line, reducing such conflicts but requiring a broader tag search. **N-way set-associative** divides the cache into sets; a block maps to one set but can occupy one of N ways. More associativity reduces some conflict misses but adds comparison/selection logic and may increase latency/complexity. Real designs balance capacity, latency, energy, and workload.

## Working sets, streaming, and cache pollution

A **working set** is the code/data a program uses repeatedly during a period. If it fits in a cache level, temporal locality can create many hits. Streaming data may have good spatial locality but little temporal reuse; loading it all can evict code or data that would be reused (**cache pollution**). Some architectures separate L1 instruction and data caches partly because their access patterns differ. Streaming/non-temporal policies depend on CPU and are not always helpful; measure the workload.

## When a cache is full: which line should be replaced?

On a miss, if the target set is full, the cache must evict an old line. Replacement policies try to exploit temporal locality: a recently used line may be needed again soon. Ideally, it would discard the line needed farthest in the future, but the future is unknown. **LRU** (least recently used) uses recent history as a signal; exact LRU can require costly hardware, so systems often use approximations such as pseudo-LRU. FIFO or random selection is simpler and may suit some designs.

Replacement chooses among ways in the address's mapped set, not necessarily any line in the whole cache. Associativity and replacement policy therefore both affect conflict misses. No policy wins for every workload.

## Cache-line size is a tradeoff

Large lines exploit spatial locality when a program soon uses nearby bytes. But at fixed cache capacity they reduce the number of lines held, may fetch unneeded data, and consume more bandwidth per miss. Smaller lines retain a working set at finer granularity but may miss some sequential-access benefits. Architecture chooses the actual size; applications rarely change it directly.

## Writing data: write-through and write-back

A cache must also decide what happens when the CPU changes data. With **write-through**, each write is sent immediately to the lower level; lower levels see updates sooner, but every write adds traffic. With **write-back**, the cache updates its copy first and delays writing to the lower level until eviction. This can reduce repeated write traffic, but the cache tracks dirty lines and must coordinate writeback correctly.

This is a basic model. Multiple cache levels, cores, DMA/I/O, and coherence protocols make consistency more complex than the book's one-CPU/one-L1 example. **Write-back also does not mean data is durable on an SSD/HDD**: CPU caching and power-loss durability are different problems.

## Several causes of cache misses

An introductory classification is:

1. **Compulsory miss:** first access to a cache line.
2. **Capacity miss:** the working set exceeds the cache's useful capacity.
3. **Conflict miss:** addresses compete for the same line/set under the mapping policy.

This is a reasoning framework, not a perfect diagnosis for every CPU. Prefetchers, multiple cache levels, core sharing, and replacement policy add complexity.

## Example: traversing a matrix

In a language that lays out a two-dimensional array by rows, walking each row accesses consecutive addresses:

```c
for (int row = 0; row < n; row++)
  for (int col = 0; col < n; col++)
    total += matrix[row][col];
```

Reversing the loop order can make successive reads jump over a large region, using fewer useful bytes per cache line. The result depends on layout, matrix size, compiler, and machine. Benchmark the actual program; do not turn one example into a rule for every language or structure.

## Caches and multiple cores

If several cores have copies of one cache line, a write by one core may require other copies to be updated or invalidated to preserve coherence. Coherence protocols let cores follow consistent rules, but communication has a cost.

Two independent variables on the same cache line can make cores repeatedly compete for the line—**false sharing**. The program can be logically correct but slow due to data layout. This is an advanced optimization problem; first measure and distinguish it from contention on the same variable.

## A cache is not durability

CPU caches primarily make access faster; they are not a durable copy on disk. Data in a cache may not yet have reached RAM or a device. The OS and hardware have separate mechanisms for write ordering and persistence. This distinction returns in filesystem and crash-consistency topics.

## Summary

- A memory hierarchy balances speed, capacity, and cost.
- A cache keeps copies to reduce trips to slower levels.
- Temporal and spatial locality explain why some access patterns have better hit rates.
- Misses, random access, and core contention can make a program wait.
- A CPU cache does not guarantee data is durable on storage.

## Check your understanding

**Does a cache hit mean data came from RAM faster?** No. It means the data was found in that cache level.

**Is sequential array traversal always faster than every other traversal?** Not without knowing layout, workload, and platform; locality is a reason to measure.

**Does cache coherence mean cross-core access has no cost?** No. It maintains consistency rules but can require communication and contention.

## Read next

Caches are part of the memory system. Explore address spaces, paging, and virtual memory in the **Memory** topic.
