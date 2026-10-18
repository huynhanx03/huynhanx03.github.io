---
title: "Memory: a process's address space"
category: "Operating System"
tags: ["memory", "address space", "operating system"]
description: "Learn why each process can see its own address range and how the kernel turns those addresses into safe accesses."
updated: 2026-10-16
translationKey: "operating-system/memory-address-space"
---

A program uses addresses as if it had memory of its own: instructions in one area, global data elsewhere, a stack for function calls, and a heap for dynamically allocated data. But RAM is finite and shared by many processes. How can two programs both use address `0x1000` without overwriting each other?

The answer is a **virtual address space**. Each process works within an address space managed by the operating system and hardware. An address produced by a program does not have to be a physical location in RAM.

## Virtual and physical addresses

- **Virtual address:** the address used by a process.
- **Physical address:** a location in physical memory.
- **MMU:** hardware that translates addresses using the current page-table mappings.

When a process runs, the CPU produces a virtual address. The MMU works with the operating system to find a valid mapping. A valid access reaches the corresponding physical location; otherwise, the CPU raises an exception for the kernel to handle, such as a protection error or a request to load a page from storage.

```text
CPU produces a virtual address
             ↓
            MMU ── looks up the mapping
             ↓                    ↘ invalid / not present
       physical RAM                 trap into kernel
```

Processes A and B can both use virtual address `0x1000` while their page tables point to different physical pages. Translation also lets the operating system move a page in physical memory without rewriting every pointer in the program.

For example, A's table might map `0x1000` to frame 42, while B's table maps the same address to frame 91. When the CPU runs A, the MMU uses A's table; when it runs B, it uses B's. Both programs can therefore use the same virtual address while accessing separate RAM regions.

## A typical address space

A conceptual diagram often places program code, global data, the heap, and the stack in separate regions. Their locations, growth directions, and number vary by architecture, operating system, executable format, and security mechanism. A textbook diagram is not a fixed map of every Linux process.

**Text/code** contains instructions and may be mapped read-only and shared by processes running the same program. **Data** holds initialized global variables; **BSS** holds zero-initialized globals according to executable-format conventions. The **heap** supports dynamically lived allocations through an allocator. The **stack** stores function-call state according to runtime and ABI conventions.

These are not the only regions. Shared libraries, memory mappings, per-thread regions, runtime buffers, and mapped files can also appear. A virtual region may be reserved without immediately occupying physical RAM.

## Why not use physical addresses directly?

If every program chose physical addresses itself, the operating system could not reliably isolate data or load multiple programs at once. Virtual mappings provide:

- **Isolation:** a process cannot freely read or write another process's memory.
- **Relocation:** a program can use a different physical page while keeping familiar virtual addresses.
- **Controlled sharing:** processes can map the same physical region, for example a read-only library or shared memory.
- **Access permissions:** pages can be marked readable, writable, or executable according to the architecture's rules.
- **On-demand loading:** only the data currently needed has to be resident in RAM.

These capabilities require coordination among the kernel, MMU, executable format, and allocation policy. Virtual addresses alone do not guarantee isolation if the kernel is misconfigured or hardware/software has a vulnerability.

## Virtual memory does not mean every byte is in RAM

The name “virtual memory” can suggest a complete copy of every process's address space on disk. In reality, an address may be unmapped, backed by a file, resident in RAM, or temporarily nonresident. The kernel can reserve an address range and allocate physical pages only when the program touches it.

If a valid access reaches a page that is not resident, a page fault gives the kernel a chance to create or load its contents. If the access violates permissions or falls outside a valid region, the process may receive an error such as a segmentation fault. The error's name does not mean that the machine uses the older hardware segmentation mechanism.

## Summary

- A process produces virtual addresses; the MMU translates them through page tables into physical addresses.
- Address spaces support isolation, relocation, controlled sharing, and access permissions.
- Code, data, heap, and stack are a useful model, but not the process's entire memory map.
- A virtual address range does not imply that every page occupies RAM.
- A page fault is an event handled by the kernel; its cause can be valid or an invalid access.

## Check your understanding

**If two processes use the same virtual address, do they necessarily write the same RAM byte?** No. Their page tables can contain different mappings.

**Does reserving virtual addresses mean that the same amount of physical RAM has been allocated?** Not necessarily. A page might be allocated only on first access or backed by a file.

**Does a segmentation fault prove that the CPU is using segmentation to translate addresses?** No. It is a common name for an invalid memory access.

## Read next

Next: [Paging and page tables](/en/notes/operating-system/paging-page-tables/), a common mechanism for mapping an address space.
