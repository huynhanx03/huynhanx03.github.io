---
title: "Virtual machines and hypervisors: virtualizing a complete machine"
category: "Operating System"
tags: ["virtualization", "virtual machine", "hypervisor"]
description: "Distinguish VMs from processes and containers, understand hypervisors, and see how guests appear to own hardware."
updated: 2026-10-16
translationKey: "operating-system/virtual-machines-and-hypervisors"
---

A virtual machine (VM) gives a guest operating system a virtualized hardware environment: CPU, memory, devices, and firmware. A hypervisor manages multiple guests sharing a host machine. A guest usually has its own kernel, the fundamental difference from an ordinary container.

## Type 1 and Type 2 are conceptual categories

In textbook classification, a Type 1 hypervisor runs directly on hardware; a Type 2 runs as an application on a host OS. Modern products combine architectures and drivers in several layers, so the label alone is not enough to compare performance or security.

A hypervisor must isolate CPU state, memory, and devices among guests. Hardware virtualization extensions help trap some sensitive operations into the hypervisor, but do not make every operation free.

## CPU virtualization

A guest believes it has logical CPUs and runs its own kernel. The hypervisor schedules physical CPU time among virtual CPUs (vCPUs). When the guest performs a controlled operation, the CPU/hypervisor transfers to the management layer. If a VM has many vCPUs but the host lacks enough free physical CPUs, guest tasks can wait for the host scheduler.

In a classic software-virtualization model, the guest kernel runs at lower privilege than the hypervisor. The guest still installs its own trap handler; the hypervisor records it and forwards appropriate traps into the guest. If the guest attempts a privileged instruction such as updating a TLB or returning from a trap, its lower privilege causes a trap back to the hypervisor for checking or emulation. This extra layer can make system calls and TLB misses more expensive. Modern VT-x/AMD-V hardware assistance handles many cases differently, so this is a historical explanatory model, not a description of every current machine.

CPU time as seen by guest and host differs. Oversubscription makes latency variable. Pinning vCPUs can improve locality but reduces scheduling flexibility.

## Device virtualization

An emulated device imitates familiar hardware so a guest can use common drivers, but may add overhead. A paravirtualized device such as virtio uses an interface designed for VMs and requires a suitable driver. Passthrough assigns a physical device more directly to a VM, improving performance or access but complicating sharing, migration, and isolation.

## Snapshots and migration

A snapshot may save disk state and sometimes VM state; long-lived snapshots create dependency chains and consume storage. Migration moves VM state to another host and requires compatible CPU, network, storage, and devices. A snapshot is not an independent backup.

## When to accept VM costs

A VM is useful when a separate guest OS/kernel is needed: testing a distribution or system change with better isolation, running software that depends on another OS, or providing a cloud server with a clear guest boundary. In return, each VM must boot and update a full OS, run its required background services, and manage its own dependencies. Many small VMs can cost time, RAM, storage, and operational effort.

Containers often start processes quickly and share the host kernel, making them useful for packaging, replicating, or updating applications within the same kernel family. But containers do not eliminate host management. When many instances run across hosts, an orchestrator such as Kubernetes handles placement, restart, networking, and rollout, while adding another layer of configuration and infrastructure to operate. Choose based on kernel boundary, compatibility, isolation, and administration cost—not only startup speed.

## Memory translation and the information gap

A guest process uses virtual address → guest physical frame through the guest OS's page tables; the hypervisor maps guest physical → machine/host frame as well. Shadow page tables can combine mappings for direct hardware use; nested paging lets the MMU walk multiple levels but makes TLB misses require extra lookups. The hypervisor must also handle guest attempts to update page tables/TLB according to architecture-specific mechanisms.

The hypervisor often cannot tell whether the guest OS is idle or zeroing pages, for security reasons. This “information gap” can lead to poor CPU allocation or a page being zeroed twice. Implicit inference estimates some state without changing the interface; paravirtualization lets a guest cooperate explicitly, but requires guest support and trades transparency/compatibility.

## Summary

- A VM has its own guest OS/kernel; the hypervisor shares host hardware.
- A vCPU is virtual and scheduled onto physical CPUs by the host.
- Emulation, paravirtualization, and passthrough have different tradeoffs.
- A VMM controls privileged operations, traps/TLBs, and guest-physical-to-machine-memory mapping.
- Shadow/nested paging and TLBs change translation costs; paravirtualization can reduce some information gaps but requires guest support.
- Oversubscription can create latency even when the guest sees many vCPUs.
- Snapshots and migration depend on storage, devices, and host compatibility.

## Check your understanding

**Does a VM always run directly on hardware?** No. In the common classification, a Type 2 hypervisor runs on a host OS.

**Does a guest with eight vCPUs have eight guaranteed physical cores?** No. The host schedules virtual resources.

**Does a VM snapshot replace a backup?** No. A snapshot often depends on the same infrastructure and storage.

## Read next

Containers share the host kernel; the next note compares these isolation levels.
