---
title: "Virtual memory in VMs: nested paging, ballooning, and overcommit"
category: "Operating System"
tags: ["virtualization", "memory", "paging", "hypervisor"]
description: "Trace guest addresses through the hypervisor to host RAM and understand how memory is shared among virtual machines."
updated: 2026-10-16
translationKey: "operating-system/vm-memory-virtualization"
---

A guest OS behaves as if it manages its own physical RAM, but the hypervisor must map “guest physical addresses” to host physical memory. A memory access can therefore need two translation layers: a process virtual address to a guest physical address, then a guest physical address to a host physical address.

## Shadow page tables and nested translation

In an older model, the hypervisor could maintain shadow page tables that combine guest and host mappings for the CPU. Guest page-table updates had to be monitored and reflected, which added overhead.

Modern hardware commonly supports nested paging (called EPT or NPT depending on the vendor), allowing the MMU to coordinate both translation stages. This reduces some traps but increases the number of page-table lookups on a TLB miss; CPUs cache translation results to reduce the cost. Names, limits, and performance depend on the architecture.

## Overcommit and ballooning

A hypervisor may promise guests more total RAM than the host has if it expects that all guests will not use their maximum allocation at the same time. This is **overcommit**. If that expectation is wrong, the host must reclaim or page out memory, increasing latency or causing a guest OOM event.

A balloon driver in a guest can be asked by the hypervisor to “inflate” by holding guest pages, allowing the host to reclaim their backing RAM. The guest knows about memory pressure and may choose more suitable pages than the host can identify from outside. If the driver is missing or the configuration does not support it, the hypervisor may use swapping or another technique with different transparency and effectiveness.

## Two paging layers create two kinds of pressure

A guest may believe it has free RAM while the host is short of memory; the host can swap out a guest backing page before the guest immediately notices. Conversely, the guest kernel may swap while the host still has free RAM. If both layers page at once, I/O and latency can rise sharply.

Investigation should include metrics from both guest and host: guest page faults and swap, host memory pressure, balloon state, VM residency, and storage latency. Some guest faults are normal demand paging; classify the event before drawing a conclusion.

## Summary

- VM memory involves multiple address concepts: guest virtual and physical addresses, and host physical addresses.
- Nested paging lets the MMU translate across layers; the TLB reduces repeated costs.
- Overcommit uses average utilization but creates risk when the host runs short of RAM.
- Ballooning lets the guest coordinate page reclamation with the hypervisor.
- Diagnosing memory pressure requires looking at both guest and host.

## Check your understanding

**Does a guest reporting 16 GiB of RAM mean the host reserved all 16 GiB?** Not necessarily; memory may be overcommitted.

**Does zero guest swap prove that the host is not swapping VM memory?** No. The host or hypervisor can face pressure independently.

**Does nested paging remove all address-translation cost?** No. It reduces some overhead but still involves lookups and TLB misses.

## Read next

Compare this with containers: containers share a kernel and do not have an independent guest page table and kernel in the same model.
