---
title: "Atomic Operations and Memory Ordering"
category: "Operating System"
tags: ["concurrency", "atomic", "memory model"]
description: "Understand read-modify-write, compare-and-swap, happens-before, and why atomics alone do not protect larger invariants."
updated: 2026-10-16
translationKey: "operating-system/atomic-operations-memory-order"
---

An atomic operation lets a small operation, such as changing a value or performing compare-and-swap, be observed as one unit under the CPU or language contract. Atomics are building blocks for locks and concurrent data structures, but using them correctly requires understanding memory ordering too.

## Read-modify-write

`fetch_add`, `exchange`, and compare-and-swap (CAS) combine a read with an atomic update. CAS works as follows: if the current value equals `expected`, replace it with `desired`; otherwise return the actual value so the caller can try again.

```text
old = atomic_load(x)
repeat:
  new = old + delta
  if compare_exchange(x, old, new): break
  old = observed_value
```

This is pseudocode; CAS APIs may update the expected argument and offer different memory orders. A retry loop can consume CPU under high contention.

## Atomicity is different from ordering

Atomicity protects the operation on that variable according to its contract. Memory ordering specifies how other operations may be observed before or after it. A relaxed atomic guarantees atomicity but does not necessarily publish other writes. Release/acquire often establishes synchronization when an acquire reads a value released by another operation, creating a happens-before relation.

Sequential consistency places sequentially consistent operations in one shared total order, which is easier to reason about but may have a cost; it does not place every memory operation in that order. Compiler and CPU mappings vary. Choose a weaker memory order only after proving correctness and measuring a benefit.

## Invariants spanning multiple values

If state consists of a `pointer` and a `length`, making the pointer atomic does not make the pair update atomic. A lock, versioning protocol, or proven data structure is needed. Atomically incrementing a counter does not enforce “never exceed a limit” if the check and update are separate.

## Reclamation and ABA

A lock-free linked structure may be reading a node while another thread frees it. Safe reclamation requires hazard pointers, epochs/RCU, or another mechanism. The ABA problem occurs when a value changes A→B→A, making CAS believe the state is unchanged even though an intermediate change occurred. Tagged pointers or versions can reduce the risk, but have wraparound and architecture limits.

## Summary

- Atomic read-modify-write combines a small update into one operation.
- Atomicity differs from memory ordering and happens-before.
- Relaxed atomics do not automatically publish related state.
- Invariants across multiple fields require a broader protocol than one atomic variable.
- Lock-free structures must handle memory reclamation and ABA.

## Check your understanding

**Does an atomic counter protect the object it counts?** No; only the counter update is atomic.

**Does acquire/release order every variable even without a synchronization relation?** No; an appropriate matching relation is required.

**Is a CAS loop always lock-free and starvation-free?** No. Progress guarantees depend on the algorithm, and a thread may retry indefinitely.

## Further reading

Lock implementations use atomic primitives to transfer ownership, but a mutex also needs mechanisms to sleep and wake threads.
