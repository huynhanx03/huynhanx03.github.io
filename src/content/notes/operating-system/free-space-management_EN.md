---
title: "Free-space management: fit, split, and coalesce"
category: "Operating System"
tags: ["memory", "allocator", "fragmentation", "free list"]
description: "Compare first fit, best fit, splitting, coalescing, and the effects of alignment on allocators."
updated: 2026-10-16
translationKey: "operating-system/free-space-management"
---

An allocator must find a free region large enough for a request, record the allocation, and reuse it when the caller frees it. Its free-space data structure affects search speed, fragmentation, and metadata overhead.

## First fit and best fit

First fit scans from the start of a list and chooses the first sufficiently large block. It is simple but can leave many small fragments near the beginning. Best fit chooses the smallest block that still satisfies the request. This tries to reduce leftover space for one allocation, but requires a deeper search and may create tiny fragments that are hard to reuse.

Worst fit takes the largest free block, intending to leave a large remainder. Despite the intuition, it often scans the entire list and can fragment poorly. Next fit resumes from the previous search position to avoid accumulating small fragments at the front. With first fit, keeping the free list ordered by address can make neighboring blocks easier to find for coalescing.

Segregated lists keep separate lists for common sizes. A slab allocator, often used in kernels, caches frequently used object types such as inodes or locks. It obtains slabs from a general allocator and returns a slab when its objects are no longer in use. Some slab allocators keep freed objects initialized to avoid repeated setup and teardown costs.

A buddy allocator starts with a region sized to a power of two and recursively splits it until the smallest block that can hold the request is reached. On free, it checks the same-sized buddy; if both are free, they merge, and the process can repeat at the next larger level. This structured address relationship makes coalescing fast and predictable, but power-of-two allocation can waste part of a block through internal fragmentation.

No heuristic is best for every size and lifetime distribution. Linked-list scans can be slow when the list is large; advanced allocators use balanced trees or other structures, trading complexity for faster searches or better scaling on multi-threaded workloads.

## Split and coalesce

If a free block is larger than the request, an allocator can split it into an allocated block and a remainder. When a block is freed, coalescing merges free neighbors into a larger region. Immediate coalescing simplifies later allocation but has metadata and layout costs.

The `free(ptr)` API does not receive a size, so the allocator must recover it from metadata associated with the block. One common approach places a header immediately before the memory returned to the program. The header can store size and a check value. When `free` receives the pointer, the allocator steps back to the header, validates metadata, and returns the whole block—including the header—to free space. Thus a request for `N` bytes usually consumes more than `N` bytes.

A free list does not have to live in a separate metadata area. Once a block is free, its own memory can hold links such as `next` and the node size. The allocator therefore does not need to call `malloc` to allocate list nodes while managing the heap. Allocation splits the required region, including its header, from a free chunk; freeing links it back. If adjacent address ranges are only linked rather than merged, the heap can appear to have many small fragments even when total free space is sufficient. Coalescing restores adjacent regions into larger extents.

Real allocators use boundary tags or equivalent metadata to find neighbors; the exact layout varies. Metadata corrupted by an overflow can crash the allocator or create a memory-safety vulnerability.

## Alignment and size classes

Some data types require alignment for correct or efficient CPU access. An allocator rounds size/alignment and stores metadata. Size classes make lookup faster but can leave unused space inside a block (internal fragmentation). Blocks are managed within arenas or pages, so freeing a small object does not necessarily return a page to the kernel.

## Evaluating an allocator

Measure allocation rate, latency percentiles, fragmentation, resident memory, and live object counts on a representative workload. A microbenchmark that repeats one size may measure only the fast path; real workloads have varied sizes and lifetimes.

### Exercise: inspect a free list

Keep the same allocation/free trace and compare first fit, best fit, and worst fit. Record the chosen block, remainder after splitting, and number of list nodes scanned. Then reorder the free list by address and by size. Run a longer trace with coalescing enabled and disabled while varying the fraction of blocks kept live. Observe how a large request can fail even when total free bytes are sufficient if free regions are fragmented. Results depend on the trace and list order; one run cannot prove one policy is universally better.

## Summary

- Fit policy chooses which free block to use.
- Splitting uses a larger block; coalescing merges free neighbors.
- Size classes and alignment trade speed against internal fragmentation.
- Freeing an object may not return its page to the kernel.
- Benchmarks should reflect real object sizes and lifetimes.
- Compare allocators with the same trace while varying fit policy, list order, and coalescing.

## Check your understanding

**Does best fit always reduce total fragmentation?** No. Small fragments can accumulate and searching can be expensive.

**Does coalescing merge every free block in the heap?** Only adjacent regions that are compatible under the allocator's rules.

**Does freeing a small object immediately reduce RSS?** Not necessarily.

## Read next

At the kernel level, page tables also need to manage space efficiently for sparse addresses.
