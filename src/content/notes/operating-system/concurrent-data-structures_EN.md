---
title: "Concurrent data structures: from one lock to sharding"
category: "Operating System"
tags: ["concurrency", "data structures", "lock"]
description: "Design safe queues, counters, and hash tables for multiple threads, then optimize contention based on measurements."
updated: 2026-10-17
translationKey: "operating-system/concurrent-data-structures"
---

A sequential data structure commonly assumes that only one thread changes its state at a time. When multiple threads call `push`, `pop`, or update a hash table, define which operations should appear atomic and which invariants must always hold.

## Start with a coarse-grained lock

The easiest design to verify is to put a mutex around each public operation. For a queue, the lock keeps head, tail, and count consistent. This is a reasonable design for many workloads; do not use lock-free code just because there are multiple threads.

The drawback is that independent operations also wait for one another. If the critical section is short and contention low, the cost may be acceptable. Measure throughput and latency before splitting the lock.

## Fine-grained locking

Use a separate lock for each hash-table bucket so operations on different buckets can run in parallel. Resizing then needs a coordination protocol to ensure no thread sees a half-migrated structure. Each smaller lock increases potential parallelism but adds metadata, lock ordering, and error paths.

Lock ordering helps avoid deadlock: if an operation needs two locks, every thread must take them in the same global order. Avoid locking a container in an unstable hash-based order if that can create a cycle.

## Sharding and partitioning

Sharding splits state into pieces by key or worker. For example, each shard can have its own counter; the program sums them when needed. This reduces contention on one hot variable but makes consistent snapshots and merging more complex.

One example is a **sloppy counter**: each CPU has a local counter/lock and periodically transfers accumulated values to a global counter. With unit nonnegative increments and each local counter flushed and reset at threshold S, a `get()` that reads only the global counter can omit at most `number of CPUs × S` units still held locally. If one update can add more than 1, a counter may overshoot S before the flush; include the maximum overshoot in the error bound. A lower threshold reduces this error but increases contention on the global lock; a higher threshold speeds updates while making the global value staler. If updates can be negative, derive the bound from the actual flush rule and update sizes. Choose according to requirements: telemetry may tolerate temporary inaccuracy; an account balance may not.

Partitioning works when operations are distributed across shards. If every request uses the same key, contention remains on that shard. An uneven hash distribution also creates hot spots.

## Lock-free does not mean no waiting

A lock-free algorithm uses atomic operations to update state without holding a mutex, but a thread may still retry its loop many times and CPUs may contend for a cache line. Wait-free is stronger: each operation completes in a finite number of steps for each thread under the algorithm's definition, but it is difficult to build and not offered by every library.

A CAS loop must handle ABA, memory reclamation, and memory ordering. A small lock-free queue may look concise but be harder to prove correct and slower than a mutex under real workloads. Use a verified implementation when needed.

## Choose a structure for the API and workload

First specify: read/write ratio, need for global ordering, whether the queue is bounded, whether threads may block, and tail-latency requirements. An SPSC queue (one producer, one consumer) has simpler assumptions than an MPMC queue (multiple producers/consumers); changing worker count can invalidate an implementation.

A linked list can start with one lock for the whole list. Move to fine-grained or hand-over-hand locking only after measurement shows a bottleneck. Locking each node increases concurrency during traversal, but acquisition and release at every node may cost more than they save.

A queue can also use one lock. Another design splits `head` and `tail` across two locks, usually with a dummy node, so enqueue and dequeue contend less often. This design still needs safe publication of the `next` link between enqueuers and dequeuers, such as an atomic link with suitable release/acquire semantics; the two locks alone do not synchronize that field. The [Michael–Scott two-lock queue pseudocode](https://www.cs.rochester.edu/research/synchronization/pseudocode/queues.html) shows the basic structure, while an implementation must follow its language's memory model.

A hash table commonly partitions by bucket, with a separate list and lock in each bucket. This lets operations on different buckets run in parallel.

Narrowing the locked region also reduces rare error paths: allocate a node before locking if the allocator is thread-safe, then lock only while linking it into the list. Every return/error path must release the lock. Start with a coarse-grained version that is easy to verify, then measure and optimize the actual bottleneck.

## Summary

- A coarse lock that protects invariants is a good starting point.
- Fine-grained locks increase parallelism but complicate lock ordering.
- Sharding reduces hot spots when the workload can be distributed.
- Lock-free algorithms still have retries, cache contention, and reclamation problems.
- Choose for the workload and API contract; benchmark before optimizing.

## Check your understanding

**Does lock-free mean every thread always progresses equally?** No. A thread may retry while the system progresses through another thread.

**Will replacing a mutex with CAS definitely reduce latency?** No. Cache-line contention and retries can make it worse.

**Can an SPSC queue be reused unchanged with multiple producers?** No. Different concurrency assumptions invalidate its guarantees.

## Read next

When concurrency problems become threads waiting on one another indefinitely, see deadlock and livelock.
