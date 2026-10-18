---
title: "Deadlock, livelock, and starvation"
category: "Operating System"
tags: ["concurrency", "deadlock", "livelock", "starvation"]
description: "Distinguish three ways concurrent work can fail to complete, understand deadlock conditions, and learn prevention strategies."
updated: 2026-10-16
translationKey: "operating-system/deadlocks-and-livelocks"
---

Two threads can avoid corrupting data and still fail to finish their work. **Deadlock** is a group of threads waiting for resources held by one another, forming a dependency cycle. **Livelock** means threads remain active but keep yielding or changing state without making progress. **Starvation** means a thread is repeatedly denied a resource.

## A deadlock example

Thread A holds lock L1 and waits for L2; thread B holds L2 and waits for L1. Neither can continue:

```text
A: lock(L1) ── waits for L2
B: lock(L2) ── waits for L1
```

The system may still use the CPU elsewhere, so deadlock does not mean the entire machine has frozen. A deadlocked process may hold resources and cause later requests to queue up.

Dining philosophers illustrates circular waiting: each person picks up the left fork and waits for the right. If everyone takes the left fork first, each holds one resource and waits for the neighbor, forming a circular wait. Numbering the forks and always taking them in a global order breaks the cycle; in the five-person example, letting one person take forks in reverse order also breaks symmetry. This removes that deadlock cycle but does not by itself guarantee fairness.

## Coffman's four conditions

Classical deadlock requires all four conditions at once:

1. **Mutual exclusion:** a resource can be used by only one party at a time.
2. **Hold and wait:** a thread holds resources while waiting for more.
3. **No preemption:** a resource cannot be forcibly taken from a thread.
4. **Circular wait:** a cycle of resource dependencies exists.

Deadlock prevention breaks a condition, for example by imposing a global lock order, acquiring all resources at once, or using suitable timeouts and cancellation. A timeout is not a universal solution: an operation may have caused side effects before timing out.

For a function that acquires multiple dynamic locks, order them by a stable key such as mutex address so callers passing `L1,L2` and `L2,L1` still acquire in the same order. `trylock` followed by releasing acquired locks when the next lock is busy can also avoid circular waiting; however, two threads may repeat the same pattern and livelock, so random backoff may help. Lock ordering is usually simpler and easier to verify than a retry protocol.

Distinguish three strategies: **prevention** breaks a necessary condition (commonly circular wait); **avoidance** grants resources or schedules only when future needs and safe states are known (for example, the Banker’s algorithm), so it is rarely used for general workloads; **detection/recovery** lets deadlock occur, finds a cycle, then kills, rolls back, or restarts a victim. Each trades design cost, concurrency, and recovery capability differently.

## Livelock and starvation

Two threads may each release a lock on conflict and retry at the same time. They stay active but neither obtains the resource. Random backoff or fair coordination can help.

Starvation commonly results from fixed priorities or unfair scheduling/resource allocation. Aging, quotas, and fairness queues reduce the risk but may lower throughput elsewhere.

## Prevention and detection techniques

- Define a lock-acquisition order and document it in code.
- Keep critical sections short; avoid I/O or callbacks while holding a lock.
- Use try-lock or timeouts when semantics permit and provide a rollback plan.
- Collect thread dumps or stack traces when the system stalls.
- Log lock waits with resource identity and duration.

Deadlock detection can use a wait-for graph: nodes represent threads or resources, and edges represent waiting or ownership. A cycle indicates a candidate dependency cycle; exact conclusions depend on the resource model and whether resources can be shared.

## Summary

- Deadlock is circular waiting; livelock is activity without progress; starvation is repeated denial.
- Coffman's four conditions provide a framework for deadlock prevention.
- Lock ordering is a practical way to break circular wait.
- Timeouts need side-effect semantics, not just error handling.
- Thread dumps and wait-for graphs help find causes.

## Check your understanding

**Does deadlock always make CPU utilization zero?** No. Other threads can still run.

**Does a timeout guarantee that an operation was rolled back?** No. It may have committed in another layer.

**Is livelock the same as deadlock?** Both fail to complete, but livelock continues consuming work and changing state.

## Read next

Event-based concurrency uses an event loop instead of one thread waiting for each I/O operation; it solves a different class of problem and does not remove every race.
