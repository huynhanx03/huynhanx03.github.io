---
title: "Memory protection and sharing: page permissions, mmap, and copy-on-write"
category: "Operating System"
tags: ["memory", "protection", "mmap", "copy-on-write"]
description: "Learn read/write/execute permissions, file mappings, and how processes can share pages safely."
updated: 2026-10-16
translationKey: "operating-system/shared-memory-and-copy-on-write"
---

Separate address spaces isolate processes, but the OS sometimes needs to share data deliberately: shared libraries, interprocess communication regions, or files mapped into memory. Sharing avoids unnecessary copies, but raises questions about who may read or write and when changes become visible.

## Page permissions define an access boundary

Memory mappings commonly have read, write, and execute permissions, as well as user/kernel permissions. The CPU checks permissions when an instruction accesses memory. Read-only code mappings help prevent instructions from being overwritten; non-executable data regions reduce one class of risk when data is mistakenly interpreted as code.

Page permissions are one defense layer, not the only security boundary. A buggy program can still corrupt its own data; the kernel or hardware may have vulnerabilities; file permissions and process policy also matter.

## File-backed mappings

`mmap` on Unix-like systems maps part of a file into an address space. A program can read or write the region like memory; the kernel loads pages on demand and manages their relationship to the file. This is convenient for random access or sharing, but does not mean the entire file is read immediately.

The effect of writing to a mapping depends on the mapping flags and file type. A shared mapping can share changes among processes and write them back according to system rules; a private mapping usually isolates changes using copy-on-write. Do not infer that every write is immediately durable.

## Copy-on-write

After `fork`, the parent and child may initially map the same physical pages as read-only. If one process attempts a write, a page fault indicates that a copy is needed. The kernel allocates a new frame, copies the contents, updates the writer's page table, and resumes the instruction.

This avoids copying every page as soon as a process is created. If a child quickly calls `exec`, many old pages may never need to be copied. The cost is proportional to the pages actually written; a workload that writes across a large region still pays the copying cost.

## Shared memory does not mean safe data

Two processes mapping the same region can read and write quickly without sending every byte through a socket. But if they update the same structure concurrently, they still need an interprocess synchronization protocol, atomic operations, or suitable locks. Mapping alone creates no ordering, atomicity, or business-level consistency.

The lifecycle of shared objects, access permissions, structure size, and handling a process dying mid-operation must also be managed. Shared memory reduces some data-transfer costs but increases design requirements.

## Summary

- Page permissions restrict how user code reads, writes, or executes memory.
- File mapping accesses file contents through virtual addresses and loads pages on demand.
- Copy-on-write delays copying until the first write.
- Shared memory does not provide synchronization or business guarantees by itself.
- A write to a mapping does not prove that data is durable on the device.

## Check your understanding

**Does a private mapping mean the kernel never reads data from the file?** No. Initial contents can still come from the file; writes are isolated according to the mapping rules.

**Does copy-on-write make `fork` free?** No. It delays some costs; page tables, process management, and later writes still have costs.

**Do two processes mapping the same region avoid needing locks?** No, not when accesses conflict; they still need synchronization.

## Read next

The [process and system-call](/en/notes/operating-system/process-model/) topics connect memory mechanisms to process lifecycle.
