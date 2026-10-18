---
title: "Demand paging and page faults: loading data when needed"
category: "Operating System"
tags: ["memory", "demand paging", "page fault", "virtual memory"]
description: "Follow a valid page fault from the trap into the kernel until the process resumes, and distinguish it from an invalid access."
updated: 2026-10-16
translationKey: "operating-system/demand-paging-page-faults"
---

A program's entire data set does not need to be loaded into RAM before it runs. The OS can set up an address space and bring a page into RAM only when the program touches it. This is called **demand paging**.

The first access to a nonresident page causes a **page fault**. The name sounds like an error, but a page fault is a hardware event reported to the kernel; it may be a normal part of demand paging or an invalid access.

## The path of a valid page fault

1. The CPU generates a virtual address and the MMU detects that its mapping is not in RAM.
2. The CPU stops the current execution flow and enters the kernel with information about the address and cause.
3. The kernel checks that the address belongs to a valid region and that the operation has the right permissions.
4. If valid, the kernel obtains the contents: it may create a zero-filled page, read from a mapped file, or bring a page from backing storage into RAM.
5. The kernel updates the page table, may refresh address-translation state, and lets the faulting instruction run again.

If the address is invalid or permissions are wrong, the kernel cannot fix it by loading a page. It reports an error to the process, commonly leading to a signal/exception such as a segmentation fault on Unix-like systems. The signal's name does not describe the paging mechanism underneath.

## Why must the instruction run again?

The instruction stops before completing its memory access. Once the kernel creates the necessary mapping, the CPU can retry it as if waiting for the page were part of servicing that access. If the kernel records the wrong state or resumes before the data is ready, the program observes an incorrect result.

This is a contract between hardware and operating system: hardware detects a special condition; the kernel decides whether it can handle it or must report an error; then state is restored so execution can continue or terminate.

## File-backed and anonymous pages

A page may be backed by a file: the kernel reads the corresponding contents when needed, and a clean page can be read from the file again after eviction. Anonymous regions such as heap or stack usually have no source file; the kernel may create a zero-filled page and use swap to preserve contents temporarily when needed.

Copy-on-write lets multiple processes initially share a read-only page. When one writes, a special page fault tells the kernel to create a private copy. Thus, `fork` can avoid immediately copying all memory; cost is paid when a page is modified.

## Page replacement and dirty pages

If RAM is short, the kernel may choose a less-needed page to free a frame. A clean page can be discarded if its contents can be recovered from a file; a dirty page must be written back before the frame is reused. Modern replacement policies consider access history and other factors; do not assume the system always uses a simple ideal LRU algorithm.

If processes repeatedly need pages that were just evicted, the machine reads and writes pages excessively. This is **thrashing**: the CPU may do little useful work while memory I/O remains busy.

## A page fault does not mean the machine is failing

A new program can cause page faults to load code/data on demand. Counting total faults without distinguishing minor/major faults or access types can mislead. A fault served from RAM or file cache costs differently from one that must read a storage device.

When diagnosing slowness, inspect fault frequency and type, RAM, working set, and disk I/O together. A program's initial faults may be normal; persistent faults from insufficient RAM need further investigation.

## Summary

- Demand paging loads or creates a page when a program accesses it.
- A page fault is a trap for the kernel to handle, not automatically a program error.
- The kernel validates region and permissions, obtains data, updates the mapping, then resumes or reports an error.
- A page may be file-backed, anonymous, copy-on-write, or need swap backing.
- A high fault rate can cause thrashing; classify and measure before concluding.

## Check your understanding

**Does every page fault crash the program?** No. The kernel normally handles many faults.

**Does copy-on-write copy all memory immediately at `fork`?** Usually not. Pages are shared first and copied on write according to the mechanism.

**Can a clean resident page always be discarded immediately?** If a suitable source can restore it, it can be discarded, but victim selection depends on kernel policy and workload.

## Read next

The Memory topic continues with how the OS chooses pages to retain, uses swap, and detects memory pressure.
