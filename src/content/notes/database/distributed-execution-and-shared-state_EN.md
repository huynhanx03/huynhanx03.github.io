---
title: "Concurrent Execution and Shared State in Distributed Systems"
category: "Database"
description: "See how interleavings change outcomes, then connect concurrency on one machine to state shared over a network."
updated: 2026-10-17
translationKey: "database/distributed-execution-and-shared-state"
---

A sequential program has a fairly readable execution history: read a value, compute, write the result. When two threads update the same variable, each operation can be correct on its own while the final result depends on how their steps interleave. The same problem appears in distributed databases, where each node has local state and exchanges changes through messages.

In a distributed model, a **participant** (also called a process, node, or replica) keeps local state. Participants exchange messages over links; each process may use a physical or logical clock. A distributed algorithm specifies roles, states, transitions, messages, timing/link assumptions, and the failures it tolerates. These details are part of the algorithm, not implementation trivia that can be omitted.

Scale up by adding CPU, RAM, or storage to one machine; scale out by spreading work across machines. Scale-out can increase capacity and availability, but introduces communication, coordination, and partial failures that a single machine does not have in the same form. Many modern databases are clusters because of those limits, so “running on multiple nodes” always needs an explicit model of state and failure.

## Components and assumptions of a distributed algorithm

## One addition can be overwritten

Suppose `x = 1`. Thread A wants to add 2; thread B wants to multiply by 2. If each operation consists of three separate steps—read `x`, compute a result, write `x`—we can get this history:

| Step | Thread A: add 2 | Thread B: multiply by 2 | Written value |
| --- | --- | --- | --- |
| 1 | Read `x = 1` |  |  |
| 2 |  | Read `x = 1` |  |
| 3 | Compute `1 + 2 = 3` |  |  |
| 4 |  | Compute `1 × 2 = 2` |  |
| 5 | Write `3` |  | 3 |
| 6 |  | Write `2` | 2 |

The final result is 2: the addition is overwritten. If B reads and writes before A starts, the result is 4. If A runs first, the result is 6. Another interleaving can produce 3. The same input can therefore produce several outcomes even though both threads finish; “both operations completed” does not establish correctness.

This is also a useful way to understand a database lost update. Two transactions read the same version, compute from stale data, and overwrite one another. A lock, atomic operation, optimistic validation, or suitable isolation level can rule out histories that should not be allowed.

## Concurrent does not necessarily mean parallel

Two tasks are **concurrent** when their execution intervals overlap: one has started before the other has finished. On one CPU, the operating system can alternate steps between them; they are still concurrent even though only one step runs at a time.

Two tasks are **parallel** when their steps actually run simultaneously on multiple cores or processors. Parallel execution implies concurrency, but concurrency does not require parallelism. This distinction helps separate ordering bugs from the speed benefit of using multiple cores.

## A consistency model limits the histories clients may observe

A consistency model describes the operation order clients can observe. It is a behavioral contract, not merely the name of an algorithm.

- With **linearizability**, each operation can be treated as if it happened at one point between its call and response, while preserving real-time order for operations that do not overlap.
- With **sequential consistency**, everyone observes one shared sequential order that preserves each client's operation order, but that order need not match global real time.
- Under weaker models, some updates may arrive later or replicas may temporarily differ; the system needs merge or repair rules, or limits on which operations are allowed.

Consider two transactions booking the final seat: if both can read “one seat remains” before either writes, the outcome may violate the invariant. We must identify the invariant, then choose a lock, constraint, transaction isolation level, or coordination protocol strong enough to preserve it. Adding replicas does not resolve the conflict by itself; multiple copies may accept concurrent writes.

## A central database is still reached over a network

Putting state in one shared database does not turn it into instantaneous shared memory. Each process still sends a request and waits for a queue, network, and server processing. When no response arrives, the caller cannot tell whether the database is slow, overloaded, crashed, or whether only the response was lost. A timeout is a decision based on a threshold, not a direct observation of the node's state.

So a remote API needs to expose details that affect how it is called: deadlines, retryability, idempotency, required consistency, and error status. A local iterator and a remote query may look alike in code, but their costs and failure behavior differ. Hiding that difference can lead a caller to put a remote call in a large loop, retry a non-idempotent command, or assume a later read must see a recent write.

## From a race condition to a distributed history

On one machine, we often control ordering with a mutex, atomic instruction, or transaction. Across nodes, there is no shared memory through which everyone sees an update at the same instant; messages may be delayed, lost, or reordered. Versions, sequence numbers, quorums, consensus, and conflict resolution define who sees what and when.

When reading a database design, ask three questions: what state is shared; which operations may overlap; and which histories are allowed to be observed? Without the last answer, we cannot judge correctness merely because each node completed its work.

## Check your understanding

**If two threads read `x = 1`, one adds 2 and the other multiplies by 2, why can the result be 2?** Both compute from the old read; the later write overwrites the earlier result.

**Does concurrency mean two commands run at precisely the same instant?** No. Their execution intervals can overlap even if a CPU alternates between their steps.

**Does a central database remove network uncertainty?** No. A caller can still lose the response after the server has processed the request and must decide whether to retry.

Reading: *Database Internals*, chapter 8; the following notes explore consistency, failure detection, and consensus in greater depth.
