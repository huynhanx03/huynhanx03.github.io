---
title: "VAX/VMS case study: page faults, working sets, and backing store"
category: "Operating System"
tags: ["memory", "virtual memory", "case study", "vms"]
description: "Use a historical VAX/VMS design to see how paging policy, working sets, and backing store fit together."
updated: 2026-10-16
translationKey: "operating-system/vax-vms-virtual-memory-case-study"
---

A historical case study is useful not for learning VAX commands used every day, but for seeing paging principles under a specific architecture's constraints. VAX/VMS combined address-translation hardware, per-process working sets, and backing store to manage finite RAM.

## Address space and VAX hardware

The VAX-11 used 32-bit virtual addresses and 512-byte pages, so an address had a 23-bit VPN and 9-bit offset. The two high VPN bits selected one of three regions:

- **P0:** lower process region for the program and heap; this region grows toward higher addresses.
- **P1:** upper process region for the user stack; the stack grows toward lower addresses, toward P0.
- **S:** shared system space for protected kernel code/data in each process address space.

User page zero was unmapped. A null pointer has address zero, so accessing it found an invalid page, trapped into the kernel, and usually caused a process error. A guard page like this helps catch pointer bugs early.

Each process had separate P0 and P1 page tables. Segment base registers pointed to a page table; bounds described its valid entries. System space was shared, so a context switch changed P0/P1 registers for the new process while retaining system mappings. PTE permissions prevented user mode from freely reading or writing kernel regions. Since user page tables lived in kernel virtual memory, P0/P1 tables could themselves be paged under memory pressure. Translating an address might first access the system page table before reaching the user table; the TLB avoided most of those repeated walks.

## Per-process working sets

Each process had a maximum **resident set size (RSS)**: the number of pages it could keep in RAM. When it exceeded the limit, VMS removed the oldest page using a per-process FIFO. FIFO did not know which page was recently accessed, but it did not need a hardware reference bit—important because VAX PTEs lacked one.

To reduce costly FIFO page-ins, VMS put pages leaving a resident set on one of two global second-chance lists: clean pages and dirty pages. Another process needing a frame could take a clean page from the list head; its original contents remained in a file. If its owner faulted on the page before another process reused the frame, it could reclaim the page without disk I/O. The sizes of the second-chance lists affected how closely segmented FIFO approximated LRU.

Address-space size alone does not tell us how much RAM is immediately needed. Temporal locality determines the active subset of pages.

## Backing store and page-in/page-out

Code and file-backed pages can be read from their files; dirty anonymous pages need storage for their contents while nonresident. The system organizes swap/backing store to reload pages on a fault. VAX pages were 512 bytes, smaller than an efficient disk I/O, so dirty pages were grouped into larger writes. Grouping reduces small-I/O operations and uses storage more efficiently.

Without a hardware reference bit, VMS could approximate page usage by temporarily marking a page inaccessible in its PTE while keeping its real permissions in kernel metadata. The next access trapped; the kernel recognized that the page was otherwise valid, restored permissions, and treated the trap as evidence that it had recently been used. This adds overhead on the first access after each sampling period, so sampling frequency must balance accuracy and trap cost.

If a workload continually changes a working set larger than RAM, paging increases and the CPU does less application work: **thrashing**. Admission and working-set policies must balance system throughput with each process's latency.

## Delayed work: demand-zero and copy-on-write

When a heap grows, the kernel need not allocate and zero pages immediately. With **demand-zero**, the kernel records a new untouched region; the first access traps, obtains a frame, clears old contents for security, and maps it into the process. If the program never touches the page, the allocation work is avoided.

With **copy-on-write (COW)**, two address spaces can initially map one read-only page. Reads need no copy. When one side writes, a protection fault tells the kernel to allocate a new page, copy contents, and update the writer's mapping. `fork()` uses this idea to avoid immediately copying an entire address space, especially when a process soon calls `exec()` and replaces most of its contents.

## Design lessons

- Address translation and page faults are mechanisms; working-set/replacement policies determine how they are used.
- Segmented FIFO limits per-process RSS, then gives pages a second chance on global clean/dirty lists.
- Backing sources differ for code, file-mapped, and anonymous pages.
- Reference bits can be approximated with protection traps, balancing accuracy and overhead.
- Demand-zero and COW delay allocating/copying a page until access requires it.
- Batched/clustered I/O can improve throughput but does not remove latency.
- CPU architecture constrains page tables and OS permissions.
- A historical case study reveals principles; its policy should not be copied into a modern kernel without analysis.

## Summary

- VAX/VMS illustrates working-set policy in a real virtual-memory system.
- Resident sets need to respond to locality and memory pressure.
- A page's backing source determines whether it needs a swap write or file read.
- Thrashing occurs when total working-set demand exceeds RAM.
- Separate mechanisms from policies when analyzing a system.

## Check your understanding

**Does a process with a 1 GiB address space need 1 GiB of RAM?** No. Only the needed resident subset must be in RAM.

**Does every page fault read swap?** No. It may zero-fill a page or read from a file/cache.

**Did VMS use exact LRU?** No. It used segmented FIFO and second-chance lists, a design suited to hardware without a reference bit and to per-process RSS limits.

**Is this historical VMS algorithm optimal for modern Linux?** No. Workloads, hardware, and kernels differ.

## Read next

Compare the historical implementation with [Levy and Lipman, “Virtual Memory Management in the VAX/VMS Operating System”](https://pages.cs.wisc.edu/~swift/classes/cs736-fa06/papers/vax-vms.pdf), then connect these mechanisms to [page replacement and thrashing](/en/notes/operating-system/page-replacement-and-thrashing/).
