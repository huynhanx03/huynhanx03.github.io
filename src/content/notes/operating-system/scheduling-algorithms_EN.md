---
title: "FCFS, SJF, Round Robin, and feedback queues"
category: "Operating System"
tags: ["scheduling", "round robin", "operating system"]
description: "Compare classic scheduling algorithms and see which tradeoffs fit different workloads."
updated: 2026-10-17
translationKey: "operating-system/scheduling-algorithms"
---

Classic scheduling algorithms help reveal which goal a policy favors. They are reasoning models; general-purpose OS schedulers are usually more complex, with multiple classes and multicore behavior.

## FCFS: first come, first served

First-Come, First-Served runs jobs in arrival order and is usually non-preemptive. It is easy to understand and has little policy overhead. But a long job at the front can make many short jobs wait—the convoy effect.

FCFS can suit similar jobs or a simple ordering requirement; it often serves interactive workloads poorly when CPU burst lengths vary widely.

## SJF and shortest remaining time

Shortest Job First chooses the job with the shortest predicted CPU burst. In a single-CPU model where all jobs are ready at the same time, execution is non-preemptive, and CPU bursts are known, sorting by burst length minimizes average waiting time. With different arrival times or other constraints, this conclusion does not apply unchanged. A kernel usually cannot know future bursts, so systems must estimate from history or use heuristics.

Shortest Remaining Time First is preemptive: a new job with less remaining work can interrupt the current job. This can improve response for short jobs but may leave a long job waiting indefinitely if short jobs keep arriving.

## Round Robin

Round Robin gives each job a time quantum. If it is not finished when the quantum expires, it goes to the end of the ready queue. A very long quantum approaches FCFS; a very short one increases context switches and can spend much of the time on scheduling overhead.

The quantum is not a job's completion time; it is the maximum CPU turn before the scheduler reconsiders. Interactive workloads often need a balance between response and overhead. Real values are selected by OS and configuration.

## Multi-level feedback queue

MLFQ uses several queues with different priorities. A new job may start at high priority; if it repeatedly uses its full quantum, the system moves it to a lower queue. A job that often waits for I/O and yields early may remain high, reflecting interactive behavior.

Feedback rules must account for total CPU allotment at each level, not only one quantum. Otherwise, a process might issue I/O just before its quantum expires to keep high priority and consume more CPU. Once it uses the full allotment at a level, it moves down whether it spent the CPU time in one long turn or many short turns.

If a high-priority queue is always busy, lower-priority processes can starve. Periodically boosting all processes to the highest queue can reduce starvation and let a process be reevaluated if its workload changes from CPU-bound to interactive. The boost interval depends on workload: too infrequent means long waits; too frequent weakens classification.

Short quanta at high levels help interactive response; lower levels can use longer quanta to reduce overhead for CPU-bound jobs. Queue count, quantum, allotment, and boost interval vary by implementation. MLFQ is a family of policies that learns from observed behavior, not one fixed configuration.

## Choose a policy for the workload

| Workload | Main concern | Tradeoff direction |
| --- | --- | --- |
| Batch jobs | throughput, turnaround | group work or favor short jobs while preventing starvation |
| Interactive desktop | quick response | preemption and priority for interactive tasks |
| Multi-user server | fairness, tail latency | groups, weights, quotas, and load observation |
| Real-time system | deadlines | schedulability analysis and suitable priorities |

Do not change process priority just because a CPU graph is high. First identify the slow task, whether it is ready or blocked, and which service objective needs improvement.

## Calculate response and turnaround

For a job arriving at `arrival`, first running at `first_run`, and finishing at `finish`:

```text
response time   = first_run - arrival
turnaround time = finish - arrival
waiting time    = turnaround time - total CPU burst
```

The waiting-time formula above is correct for a CPU-only job with no blocking. With I/O, blocked time remains inside turnaround but is not ready-queue waiting. In that case, `ready waiting = turnaround - total CPU burst - total blocked time`, or add the intervals when the job is ready directly. Turnaround from arrival to completion includes running, ready waiting, and blocking. To compare schedulers, keep arrival times and bursts the same so results reflect policy rather than a different workload.

### Exercise: trace one workload

Draw timelines for three jobs arriving together. First give them equal bursts, then use 100, 200, and 300 units. Calculate each job's response, turnaround, and waiting time under FIFO, SJF, and Round Robin; vary the RR quantum from 1 to a larger value. Change arrival order and check when SJF and FIFO produce the same result. With `N` jobs ready together, RR quantum `q`, and no overhead, the last job in a round can wait about `(N−1)q` before its first turn; context-switch overhead increases real time. State assumptions before comparing measurements.

### Exercise: read an MLFQ trace

Draw a trace for two jobs across two queues with a short quantum. Change one condition at a time: different CPU bursts, frequent I/O blocking, where a job returns after I/O, or the timing of a priority boost. Measure CPU time received by each job and the longest wait for the long job.

Compare CPU-allotment accounting with a rule based only on yielding. Try a job that yields just before its quantum expires and see whether it can keep high priority unfairly. This distinguishes yielding because it is waiting for I/O from yielding to evade accounting. Simulator values are not guarantees about a modern OS scheduler.

## Summary

- FCFS is simple but can create a convoy.
- SJF has useful properties when burst lengths are known, but future bursts are not available.
- Round Robin trades quantum size between response and overhead.
- MLFQ adjusts priority from observed behavior and needs starvation prevention.
- Real schedulers also account for multicore systems, user groups, priorities, and resource limits.

## Check your understanding

**Is an arbitrarily small Round Robin quantum always fairer?** No. Overhead grows, and fairness depends on workload and groups.

**Can a kernel implement exact SJF?** Not when future bursts are unknown; it can only estimate.

**Can an MLFQ starve a CPU-bound job?** Yes, without aging or a balancing policy.

## Read next

On a multicore machine, the scheduler must also choose which CPU runs each task and balance load.
