---
title: "Multiprocessor scheduling: affinity, load balance, and locality"
category: "Operating System"
tags: ["scheduling", "multiprocessor", "cpu affinity"]
description: "Explore how a scheduler distributes tasks across cores while keeping data close to where it runs."
updated: 2026-10-17
translationKey: "operating-system/multiprocessor-scheduling"
---

On a multicore machine, a scheduler asks not only “which task runs next?” but “on which core should it run?” A choice can balance load but lose cache locality; keeping a task on one core can leave another core idle while that core's queue is overloaded.

## Global and per-CPU queues

A single global queue lets every CPU take work from one place, but requires synchronization on shared state and can contend. A separate queue per CPU reduces contention, but work can become uneven as load changes.

Modern schedulers often combine local queues with periodic or demand-driven load balancing. Details and algorithms depend on OS, topology configuration, and kernel version.

One redistribution method is **work stealing**: an underloaded CPU/queue occasionally checks another queue and takes some tasks when imbalance is large enough. Checking too often adds synchronization and search costs; checking too rarely lets imbalance persist. Migration is a tradeoff between CPU utilization and cache/NUMA locality, not simply “move work to an idle core.”

## CPU affinity and cache locality

A task that recently ran on CPU 0 may have its data in a cache near CPU 0. Moving to CPU 1 may require reloading some data or exchanging cache-coherent contents. **CPU affinity** limits the CPUs on which a task may run and can restrict migration.

Pinning a task to a core can help locality-sensitive workloads, but may create uneven load and reduce scheduler flexibility. Use affinity when measurements show a need and the machine's NUMA/cache layout is understood.

## NUMA and memory placement

In a NUMA system, each socket has RAM that is lower-latency to access than memory attached to another socket. A task running on one node but accessing mostly remote-node memory may pay a higher access cost. Schedulers and allocators try to keep CPU and memory near each other, but moving a process or its data can break locality.

NUMA locality differs from cache locality: one concerns RAM location relative to a node; the other concerns copies of data in caches. Both can affect large workloads.

## Load balancing and fairness

When one CPU has many ready tasks and another is idle, the kernel may migrate tasks. Migration helps use more cores but also incurs scheduling and locality costs. A scheduler balances load, priorities, affinity, and resource groups.

Multithreaded tasks also complicate fairness: a task with many runnable threads can consume more CPU time than one with a single thread under some policies. Cgroup/resource controls, priorities, and scheduler policy influence the result. More cores do not automatically produce linear speedup when work is serial, lock-bound, or limited by memory bandwidth; use Amdahl's law and profiling to find the limit.

## Summary

- Global queues simplify work selection but can contend; per-CPU queues scale better but may become imbalanced.
- Work stealing trades balancing cost against utilization.
- Affinity can preserve locality but overly strict pinning can unbalance load.
- NUMA makes memory location relative to the CPU important.
- A task's runnable thread count and resource controls can affect its CPU share.
- More cores do not give linear speedup when locks, bandwidth, or serial work are bottlenecks.

## Check your understanding

**Does pinning every worker to one core guarantee better speed?** No. It can bottleneck that core and waste others.

**Does CPU migration cost only a program-counter change?** No. Cache and memory locality can also be affected.

**Will an eight-core machine run a program eight times faster?** Only under ideal parallelism and resource conditions; most workloads fall short.

## Read next

The **Concurrency & Synchronization** topic explains why running multiple threads can still require waiting on locks or shared data.
