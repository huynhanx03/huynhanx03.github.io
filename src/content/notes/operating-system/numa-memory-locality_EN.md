---
title: "NUMA: CPUs, Memory Nodes, and Locality"
category: "Operating System"
tags: ["operating-system", "memory", "numa"]
description: "Understand why remote NUMA memory access is slower and how affinity and first-touch placement affect performance."
updated: 2026-10-16
translationKey: "operating-system/numa-memory-locality"
---

In a NUMA machine, each socket or node has a memory controller and RAM close to a group of CPUs. A core can access RAM on another node, but latency and bandwidth are usually worse than for local access. The kernel must place threads and pages to provide suitable locality.

## First-touch and placement

With a first-touch policy, a page is often allocated near the node of the CPU that first writes to it. If one thread initializes an entire buffer and other threads process it on different nodes, the data may be remote. Interleaving distributes pages among nodes; binding fixes placement. The right choice depends on the access pattern.

## CPU affinity and memory policy

`numactl --hardware` shows topology; `numactl --show` shows a process's policy; `numastat` reports local and remote statistics. CPU affinity specifies where a thread can run, while memory policy controls page placement. The two need to be coordinated.

## Why locality has trade-offs

Pinning a thread can preserve cache and memory locality but reduce scheduler flexibility, unbalance load, and affect power management. Containers and VMs may see a different NUMA topology from the physical host. Measure per-node bandwidth, remote access, latency, and application tail latency before pinning.

## Check your understanding

**Can a remote NUMA node not be accessed?** It can be accessed, usually at a different cost.

**Does CPU pinning automatically place memory near the CPU?** Not necessarily.

**Is one policy optimal for every workload?** No.

## Further reading

False sharing can also increase cache-coherence costs between cores, whether memory is local or remote.
