---
title: "MLFQ: Priority Boosts, Aging, and Preventing Starvation"
category: "Operating System"
tags: ["scheduling", "mlfq", "starvation", "fairness"]
description: "Review MLFQ rules, why CPU allotment matters, and how priority boosts prevent starvation."
updated: 2026-10-16
translationKey: "operating-system/mlfq-aging-and-starvation"
---

A multi-level feedback queue places tasks into several priority levels. MLFQ predicts behavior from history: a task that often yields CPU early may be interactive; one that uses its whole quantum may be CPU-bound. Predictions can be wrong, so policy needs a way to restore fairness.

## Typical rules

- New tasks enter the highest-priority queue.
- Each level has its own quantum, often longer in lower-priority queues.
- Using the full CPU allotment demotes a task, even across several turns.
- Yielding early for I/O may keep it at a higher level.
- Periodically boosting all tasks reduces starvation and stale behavioral assumptions.

If the scheduler only counts each individual quantum, a task may yield just before the quantum expires and pretend to be interactive indefinitely. A cumulative CPU allotment at each priority level limits this gaming.

## Trade-offs

Periodic boosts improve fairness but may promote CPU-bound tasks and affect latency. Boosts that are too frequent create overhead and churn; boosts that are too infrequent leave jobs waiting too long. Parameters must be measured against the workload.

## Starvation and priority inversion

A low-priority task may not run while higher-priority tasks remain ready. Aging gradually raises priority with wait time; quotas and weights limit groups. Priority inversion occurs when a high-priority task waits for a lock held by a low-priority task that is preempted by a medium-priority task. Inheritance or priority ceilings help in some schedulers.

## Summary

- MLFQ infers interactivity from CPU and I/O behavior.
- Cumulative allotments prevent gaming through voluntary yields.
- Priority boosts and aging reduce starvation.
- Parameters trade response time, fairness, and throughput.
- Priority inversion differs from starvation but also involves priorities.

## Check your understanding

**Does a task that yields before its quantum always keep high priority?** A sound MLFQ should account for cumulative allotment.

**Do priority boosts have no effect on throughput?** They can cause churn and change resource allocation.

**Does priority inheritance eliminate all lock contention?** No; it reduces one form of inversion.

## Further reading

Real-time scheduling with deadlines requires different analysis from ordinary MLFQ.
