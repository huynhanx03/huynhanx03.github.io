---
title: "What Does an Operating System Do? Three Pillars and Design Goals"
category: "Operating System"
tags: ["operating system", "virtualization", "concurrency", "persistence"]
description: "Understand the OS as a resource manager and service interface through virtualization, concurrency, and persistent storage."
updated: 2026-10-16
translationKey: "operating-system/operating-system-principles"
---

A running program repeatedly fetches instructions from memory, decodes them, and executes them. But a computer usually needs to run many programs, share RAM and devices, and preserve data after power is turned off. The operating system coordinates hardware and applications so these tasks can happen without every program having to control the entire machine itself.

An OS is both a **resource manager**, distributing physical resources, and a provider of **abstractions and APIs** through which programs request services. Some of this interface looks like a library, but privileged operations pass through system calls so the kernel can check permissions and protect machine state.

The subject can be organized around three big questions:

| Pillar | Problem to solve | Familiar abstractions |
| --- | --- | --- |
| **Virtualization** | Share CPUs, RAM, and devices among programs while providing a usable interface | process, virtual address space, file |
| **Concurrency** | Keep programs and the kernel correct when work interleaves or runs in parallel | thread, lock, condition variable, atomic operation |
| **Persistence** | Preserve data across crashes or power loss, and organize and retrieve it efficiently | file, directory, filesystem, storage device |

These areas are connected, but they are not interchangeable. A process can be scheduled to use a CPU, processes can access the same file, and the filesystem must coordinate concurrent requests while remaining recoverable after failures.

## Virtualization: one physical resource, many logical interfaces

### Turning a CPU into processes

On a single CPU core, the kernel runs one process for a while, saves its state, and switches to another. This rotation creates the impression that each process has its own CPU. The scheduler chooses what runs; interrupts and privilege mechanisms let the kernel regain control when needed.

### Turning RAM into separate address spaces

A process sees its own virtual addresses. The MMU and page tables map them to physical RAM; another process can use the same virtual address number but receive a different mapping. This private view provides isolation while letting the kernel manage shared RAM. An address printed by a program is therefore not automatically a physical address.

### Accessing disks and devices through APIs

Applications request services through system calls such as `open`, `read`, and `write`; the kernel and drivers communicate with devices. However, a filesystem does not necessarily create a separate disk for every process. Files are often intentionally shared by an editor, compiler, and running program. Permissions and concurrency semantics determine whether that sharing is safe.

Two common ways to share resources are **time sharing** and **space sharing**. CPU time is divided over time; memory and disk blocks are usually divided into regions or units of space. A resource can use both approaches depending on the mechanism: a network link may divide transmission time among flows, while its buffers are divided by capacity. The choice affects latency, utilization, and isolation.

## Concurrency: happening together does not mean being safe

Concurrency exists when multiple tasks can make progress in overlapping intervals; on a multicore machine, some tasks also run at the same instant. Even a seemingly simple operation such as `counter++` usually involves reading a value, adding one, and writing it back. Two threads can read the same old value and overwrite each other's result.

This is not only an application problem. Interrupts, multiple CPUs, and kernel workers may all access a process table, page table, or filesystem metadata. Synchronization primitives protect invariants. “It worked once” or “it rarely fails” does not prove correctness under every possible interleaving.

## Persistence: `write` does not mean the data is durable

RAM is volatile: a crash or power loss can erase data that has not been saved. A filesystem manages files on storage devices, chooses block locations, updates metadata, and performs I/O. To improve performance, a system may batch or delay writes; to preserve consistency, it needs write-ordering rules and a recovery method such as journaling or copy-on-write.

It is therefore important to distinguish a write call returning from data reaching the level of durability the application requires. Buffers, caches, the filesystem, and the device may all sit between the application and persistent storage. The exact guarantee depends on the API, filesystem, device, and configuration.

## Mechanism, policy, and design goals

A **mechanism** is how the system implements a capability—for example, a timer interrupt gives the kernel an opportunity to reclaim the CPU. A **policy** is the decision about how to use that capability—for example, which process runs next. Separating them makes it possible to change decisions without redesigning all the underlying machinery.

Operating systems balance several goals:

- **Abstraction and usability:** provide understandable interfaces instead of requiring each application to control hardware directly.
- **Performance:** reduce time and memory overhead while retaining necessary functionality.
- **Protection and isolation:** prevent a faulty or malicious application from arbitrarily damaging another application or the kernel.
- **Reliability:** keep the system running and recover a reasonable state when software or hardware fails.
- **Energy efficiency, security, and mobility:** priorities vary among servers, desktops, embedded devices, and phones.

No single policy optimizes every goal at once. OS design means choosing trade-offs for a workload and environment, then measuring whether the mechanism adds overhead or new failure modes.

## Why did operating systems grow privileged modes?

Early systems largely provided I/O libraries and left operators to schedule batch jobs. As multiple programs began sharing a machine, letting applications read disks or overwrite one another's RAM became unsafe. System calls and user/kernel modes created a controlled entry point for privileged operations.

Multiprogramming let the kernel run another job while one waited for I/O, improving CPU utilization but creating a need for memory protection and synchronization. Unix later popularized combining small programs through a shell and pipes. Early PC systems had more limited control models; many modern operating systems brought protection, preemption, and time-sharing ideas back. This is a conceptual history, not a complete list of OS families or a single path that every OS followed.

## Summary

- An operating system manages resources and provides abstractions to applications.
- Its three pillars are virtualization, concurrency, and persistence.
- Processes and virtual address spaces provide interfaces for sharing CPU and RAM with isolation; a filesystem organizes persistent data without necessarily giving every app its own disk.
- Concurrency exposes races in applications and kernels; persistence requires write ordering and recovery.
- Mechanisms describe how a capability works; policies choose what to do.
- Performance, usability, protection, reliability, energy use, and security require trade-offs.

## Check your understanding

**Does every process really have its own CPU and physical RAM?** Usually not. The OS and hardware create abstractions for sharing physical resources.

**Is an increment atomic because it fits on one line?** No. The compiler or CPU may perform several steps; competing accesses need synchronization.

**Does `write()` returning guarantee that data survives a power loss?** Not necessarily. Durability depends on API semantics and the storage layers below it.

**Is there one correct OS policy for every machine?** No. Goals and workloads differ, so trade-offs differ too.

## Read next

Continue with [processes](/en/notes/operating-system/process-model/), [address spaces](/en/notes/operating-system/memory-address-space/), [concurrency](/en/notes/operating-system/concurrency-fundamentals/), and [filesystems](/en/notes/operating-system/filesystem-implementation/).
