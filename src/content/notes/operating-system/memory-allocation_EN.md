---
title: "Memory allocation: how does an allocator manage free space?"
category: "Operating System"
tags: ["memory", "allocator", "heap"]
description: "Explore free lists, allocation sizes, fragmentation, and hidden costs of allocating memory."
updated: 2026-10-16
translationKey: "operating-system/memory-allocation"
---

When a program requests memory, a runtime or allocator must find a suitable region, mark it in use, and return its address to the caller. When the region is freed, the allocator records that it may be reused. This is part of heap management; it differs from mapping virtual pages to physical frames, which the kernel and MMU handle.

## From a program request to a memory block

A program may request any number of bytes, but an allocator often manages blocks by size class, alignment, or slab. An allocation of 17 bytes can consume more than 17 because of metadata, alignment, and rounding. Exact amounts depend on the allocator and runtime.

An allocator may obtain a large region from the kernel and split it to serve many requests. Therefore, a call to `malloc` does not necessarily make a system call; many small allocations can be served in userspace from memory already obtained. The allocator interacts with the kernel through system-specific mechanisms when it needs more space or can reclaim some.

## Free lists and block selection

A teaching model is a free list: a list of unused blocks. To satisfy a request for `n` bytes, an algorithm searches for a block of suitable size, splits the remainder if worthwhile, and records metadata. Strategies such as first fit or best fit help explain trade-offs, but production allocators commonly use specialized structures, per-thread caches, and multiple arenas.

Splitting a block too aggressively can create many fragments that are hard to use; keeping a larger block can increase internal waste. Coalescing adjacent free blocks may reduce fragmentation, but not all free blocks are adjacent.

## Two types of fragmentation

**External fragmentation** occurs when total free capacity is large but divided into separated regions that cannot satisfy a large request. **Internal fragmentation** is unused space inside an allocated block, for example because the allocation is rounded to a size class.

For example, if an allocator manages 16-byte size classes and a program requests 18 bytes, it may need to allocate a 32-byte block; the remaining 14 bytes cannot be allocated separately in that structure. This is an illustration, not a claim that every allocator uses 16-byte size classes.

## Allocation, lifetime, and safety

An allocator cannot know which objects a program still uses when a language requires explicit freeing; the caller must avoid use-after-free and double-free. A garbage-collected runtime reclaims unreachable objects, but may keep freed regions for reuse instead of returning them to the OS immediately.

Heap or stack location does not by itself determine speed. A heap allocation may be cheap on a fast path for a short-lived object; a stack frame may be large or create cache pressure. Measure allocation time, live-object volume, and GC or allocator costs before optimizing.

## When does memory return to the OS?

An allocator often keeps some free regions to satisfy future requests and avoid asking the kernel for pages again. Therefore, freeing an object does not imply that the process's RSS drops immediately. A large region may be returned to the kernel only when its layout and allocator policy permit; a region between live objects is harder to return independently.

RSS is the amount of resident pages attributed to a process under the OS's measurement; it is not simply the total size of useful objects. When investigating a memory leak, examine heap profiles, reachable objects, resident pages, and allocator behavior together.

## Summary

- An allocator serves object requests and manages free space; the kernel manages physical-page mappings.
- An allocation request does not necessarily call the kernel every time.
- Metadata, alignment, and size classes make consumed space differ from requested bytes.
- Fragmentation and object lifetimes affect reuse and reclamation.
- A freed object may remain in allocator-managed memory, so RSS may not fall.

## Check your understanding

**Does calling `free` guarantee that RAM is immediately returned to the OS?** No. The allocator may keep it for reuse.

**Is every dynamic allocation slow because it makes a system call?** No. Many allocations come from memory the allocator already obtained.

**Does a large heap prove there is a memory leak?** Not by itself. Distinguish live objects, useful caches, memory retained by the allocator, and resident pages.

## Read next

See [Stack and heap](/en/notes/operating-system/stack_vs_heap/) to distinguish data lifetime from allocation location; that note uses Go examples.
