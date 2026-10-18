---
title: "Acquire/Release and Happens-Before"
category: "Operating System"
tags: ["concurrency", "atomic", "memory-model"]
description: "Connect atomic operations with ordering between threads, understand acquire/release, and avoid relying on source-code order alone."
updated: 2026-10-16
translationKey: "operating-system/memory-ordering-acquire-release"
---

Compilers and CPUs can reorder memory operations while preserving single-threaded results. On multiple cores, two threads may observe accesses in a different order unless they synchronize. A memory model defines which orderings are allowed and which primitives create a happens-before relationship.

## Release and acquire

A producer thread writes data, then stores a flag with release ordering. A consumer thread loads the flag with acquire ordering; if the load reads the corresponding released value, writes before the release are guaranteed to be visible after the acquire. Making only the flag atomic is not enough if the memory order is too weak or other data has no synchronization relationship.

## Relaxed ordering

A relaxed atomic guarantees that operations on that atomic object are atomic and have a modification order, but it does not order accesses to other data. It suits an independent counter, but does not safely publish data through a flag by itself.

## Fences and locks

A mutex API usually provides acquire semantics when locking succeeds and release semantics when unlocking; code does not need to add a replacement fence manually. A fence does not fix a data race without a consistent atomic protocol. Languages such as C and C++ define data races on ordinary variables as undefined behavior.

## Check your understanding

**Does a relaxed atomic safely publish another object?** Not by itself.

**Does acquire/release mean flushing every cache to RAM?** No; these are ordering and coherence semantics defined by the memory model.

**Is reading source code in order enough?** No, if synchronization is missing.

## Further reading

Locks and condition variables provide higher-level synchronization that is easier to reason about than hand-written atomic operations.
