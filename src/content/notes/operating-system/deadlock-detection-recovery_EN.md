---
title: "Deadlock Detection and Recovery"
category: "Operating System"
tags: ["concurrency", "deadlock", "resource"]
description: "When prevention or avoidance is not used, detect cycles and choose a controlled recovery strategy."
updated: 2026-10-16
translationKey: "operating-system/deadlock-detection-recovery"
---

A deadlock occurs when a set of processes or threads wait cyclically for resources and none can progress far enough to release what it holds. If a system does not use prevention or avoidance, it can periodically search for cycles and recover.

## Detection

With one instance of each resource type, a cycle in a wait-for graph indicates deadlock. With multiple instances, an algorithm must consider available resources, allocations, and requests; a simple cycle is not enough to conclude there is deadlock.

In an application, an instrumented lock graph can detect reversed lock ordering. A production system may inspect thread dumps and futex or lock state, but a single snapshot does not always prove deadlock: a thread may be waiting for a legitimate I/O operation.

## Recovery

Options include terminating a task, rolling back a transaction, preempting a resource, or restarting a service. Choose a victim based on priority, completed work, rollback ability, and data impact. Preemption is not possible for every resource; terminating a thread that holds a mutex may leave data corrupted.

Timeouts detect long waits but do not automatically resolve consistency. Cleanup handlers, transaction boundaries, or a supervisor that can safely restart the service may be required.

## Check your understanding

**Does a timeout prove deadlock?** No; the operation may simply be slow.

**Is it always safe to terminate a thread holding a lock?** No.

**Does a cycle always prove deadlock when each resource has multiple instances?** Not as simply as with a single instance.

## Further reading

Prevention often breaks a necessary deadlock condition through lock ordering or allocation rules.
