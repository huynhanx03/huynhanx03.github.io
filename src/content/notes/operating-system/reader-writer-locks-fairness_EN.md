---
title: "Reader-Writer Locks and Fairness"
category: "Operating System"
tags: ["concurrency", "locks", "fairness"]
description: "Compare reader-writer locks with mutexes, recognize starvation, and weigh their cost for real workloads."
updated: 2026-10-16
translationKey: "operating-system/reader-writer-locks-fairness"
---

A reader-writer lock lets multiple readers hold the lock together, while a writer needs exclusive access. It can increase parallelism when reads are frequent and writes are rare, but is not automatically faster than a mutex: bookkeeping, cache contention, and writer wait time all have costs.

## Waiting policies

A reader-preferring implementation may keep admitting new readers, causing a writer to wait indefinitely under continuous read load. A writer-preferring implementation may block new readers while a writer waits, but must handle reader starvation. A fair lock queues access more evenly, but may reduce throughput or locality.

## Risks

Upgrading from a read lock to a write lock is usually not atomic; two readers attempting to upgrade while retaining their read locks can deadlock. Downgrading a write lock to a read lock may be supported by the API, but its semantics must be understood. Recursive acquisition and lock ordering also depend on the implementation.

A read lock is safe only if the data truly remains unchanged during the read or mutations are synchronized separately. A pointer to an object may become invalid after the reader releases the lock; lifetime must be managed with ownership, reference counts, epochs, or an appropriate mechanism.

## Choose by measurement

Use a reader-writer lock when there is evidence that a mutex is a bottleneck, the read critical section is long enough to outweigh the cost, and the write ratio and fairness needs fit. For small data, atomic snapshots, immutable structures, or sharding may work better. Measure writer tail latency, not just overall throughput.

## Check your understanding

**Do more readers always make the program faster?** No; lock overhead and cache-line contention may outweigh the benefit.

**Does reader preference guarantee that writers will not starve?** No.

**Does a read lock protect an object's lifetime after being released?** No.

## Further reading

When data can be divided into independent regions, sharding reduces contention with multiple smaller locks.
