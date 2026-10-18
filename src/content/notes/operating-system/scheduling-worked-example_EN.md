---
title: "Scheduling Example: Calculating Waiting, Turnaround, and Response Time"
category: "Operating System"
tags: ["scheduling", "fcfs", "round robin", "metrics"]
description: "Calculate Gantt charts for FCFS, SJF, and Round Robin to see how metrics change with the policy."
updated: 2026-10-16
translationKey: "operating-system/scheduling-worked-example"
---

Suppose three jobs all arrive at time 0 with CPU bursts A=6 ms, B=2 ms, and C=4 ms. Ignore context-switch cost for this example. Waiting time is time spent in the ready queue; turnaround is completion time minus arrival time; response is the first run time minus arrival time.

## FCFS

```text
0 ───── A ───── 6 ─ B ─ 8 ─── C ─── 12
```

Completion: A=6, B=8, C=12. Waiting: A=0, B=6, C=8; average `14/3`. Turnaround: 6, 8, 12. In this non-preemptive model, response time equals start time.

## Non-preemptive SJF

```text
0 ─ B ─ 2 ─── C ─── 6 ───── A ───── 12
```

Waiting: B=0, C=2, A=6; average `8/3`. However, the kernel does not know future burst lengths exactly; this is a comparison model.

## Round Robin with a 2 ms quantum

```text
0 A 2 B 4 C 6 A 8 C 10 A 12
```

Response: A=0, B=2, C=4. Completion: B=4, C=10, A=12. RR improves the initial response for new jobs compared with FCFS, but A and C finish later than with SJF in this example.

## Using the metrics

Nonzero arrival times, I/O blocking, or context-switch cost change the result. Average turnaround can improve while response for long jobs gets worse. Choose metrics based on the system, not a single number.

## Check your understanding

**Does RR always reduce turnaround?** No; the quantum, arrivals, and workload matter.

**Is a job's response time the time until completion?** No; it is the time until the first response.

**Is it safe to ignore context-switch cost in a real benchmark?** Only for a model; a real system must account for overhead.

## Further reading

Real schedulers also handle fairness, priority, multicore systems, and cgroup policies.
