---
title: "Dynamic memory APIs: malloc, free, realloc, and lifetime"
category: "Operating System"
tags: ["memory", "malloc", "heap", "allocation"]
description: "Understand dynamic-allocation contracts, ownership, use-after-free bugs, and the difference between an API and virtual memory."
updated: 2026-10-16
translationKey: "operating-system/dynamic-memory-api"
---

A dynamic memory API lets a program request a region of a specified size at runtime. In C, `malloc` returns a pointer or NULL, `free` releases a region according to the allocator contract, `calloc` allocates and zero-initializes according to its semantics, and `realloc` attempts to resize a region. These are userspace APIs; each call does not directly map one physical block.

## Ownership and lifetime

After `malloc`, the caller is responsible for using the region within its bounds and releasing it exactly once when no one refers to it. `free` does not clear every copy of the pointer; other pointers to the same region become dangling. Using one after free is use-after-free; freeing twice can corrupt the allocator.

A clear ownership rule reduces errors: one component owns a region while others borrow it for a defined period, or use reference counting, garbage collection, or another suitable runtime. A borrowed pointer must specify whether it can be retained after the function returns.

## `realloc` and the old pointer

`realloc(p, n)` may grow the region in place or allocate a new region and copy it. After success, the old pointer must no longer be used. If it fails and `n > 0`, the old region usually remains valid under C semantics. Assigning the result directly to `p` can lose the original pointer when allocation fails:

```c
void *tmp = realloc(p, new_size);
if (tmp != NULL) p = tmp;
```

Real code should handle a size of zero according to the C standard and the libc in use.

## Integer overflow and sizes

When allocating `count * sizeof(item)`, check that multiplication does not exceed `SIZE_MAX`. On overflow, the allocator may receive a region that is too small while the code writes many items, causing corruption. Use an overflow-checking helper and validate input before allocation.

Some common C errors may not be caught by the compiler: writing through an unallocated pointer; allocating too few bytes for a C string (which needs space for `\0`); using `sizeof(pointer)` instead of `count * sizeof(*pointer)` for an array; or reading freshly allocated `malloc` memory before initializing it. `calloc` zero-initializes a region under its contract, but does not determine whether every field is logically valid.

Call `free` only with a valid, not-yet-freed allocator pointer; do not pass an interior pointer, a stack address, or the same block twice. Returning a pointer to a local stack variable after its function returns is also wrong because the variable's lifetime has ended. For a short-lived process, the kernel reclaims its address space at exit; in a long-running server, accumulated leaks can exhaust resources. Explicit ownership cleanup still makes code easier to review and reuse.

## Allocation APIs differ from memory mappings

An allocator manages small objects; `mmap` usually maps page-sized regions and can map files or anonymous memory. A runtime may use `mmap` underneath its allocator. The APIs have different lifetimes, alignment, and semantics.

The low-level `brk`/`sbrk` interfaces are used by some allocators to expand the heap; ordinary applications should not call them directly because they can conflict with the allocator managing the same region. `mmap` fits independent regions or file mappings, but requires separate handling of page alignment, permissions, and unmapping.

## Practice: find lifetime bugs

Create small examples with a null dereference, leak, out-of-bounds write, read after `free`, and invalid `free`. Use a debugger to inspect failures and a memory-analysis tool such as AddressSanitizer or Valgrind to find different bug classes. Then write a dynamic vector using `realloc`, handle allocation failure without losing the old pointer, and check again for leaks and out-of-bounds access.

Running a test can demonstrate a bug but does not make undefined behavior predictable; one successful run does not prove the program is safe.

## Summary

- Dynamic allocation needs clear ownership and lifetime.
- `free` makes old pointers unsafe; aliases become dangling too.
- `realloc` may move the region; handle failure and the old pointer correctly.
- Allocation-size calculations must guard against integer overflow.
- The malloc allocator and virtual-memory page mapping are different layers.

## Check your understanding

**Does `free(p)` set every copy of `p` to NULL?** No.

**Does `realloc` always keep the old address?** No. The region may move.

**Does a successful allocation mean every page has occupied RAM?** Not necessarily; overcommit and demand paging may defer physical allocation.

## Read next

An allocator must choose blocks and coalesce free regions; see free-space management strategies.
