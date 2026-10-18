---
title: "CPU scheduling: which goal should be optimized?"
category: "Operating System"
tags: ["scheduling", "process", "operating system"]
description: "Distinguish response time, turnaround, waiting time, fairness, and utilization before choosing a scheduling algorithm."
updated: 2026-10-16
translationKey: "operating-system/scheduling-goals"
---

A CPU core cannot run every process at once. When several processes are ready, the scheduler chooses which one runs next. There is no best algorithm for every situation: interactive systems, batch jobs, and servers care about different goals.

## Metrics to distinguish

- **Turnaround time:** from a job's arrival until it completes.
- **Waiting time:** the total time a job waits in the ready queue.
- **Response time:** from a request until its first useful response.
- **Throughput:** jobs completed per unit of time.
- **CPU utilization:** the measured fraction of time the CPU does useful work.
- **Fairness:** how equitably work is distributed among jobs or user groups.

Reducing average turnaround may make long jobs wait longer. Increasing throughput by batching work may make interactive users experience slower responses. Choose metrics for the system's purpose and measure the appropriate percentiles.

## Preemptive and non-preemptive scheduling

A **non-preemptive** scheduler lets a running process continue until it yields or finishes. This is simple, but a long job can make interactive work wait.

A **preemptive** scheduler can pause a process, save its state, and switch to another, for example when a timer quantum expires or a higher-priority job becomes ready. Preemption improves responsiveness but adds context-switch overhead and requires careful kernel synchronization.

## A trade-off example

Suppose A needs 20 ms of CPU and B needs 2 ms, and they arrive at nearly the same time. If A runs first non-preemptively, B waits nearly 20 ms before it gets a result. If the run times are known and the shorter job runs first, average waiting time can fall. But in an interactive system, continually favoring short jobs can starve long ones.

In practice, a scheduler rarely knows the exact remaining runtime. It approximates its goals using priority, quantum, usage history, and resource groups.

## Fairness does not automatically mean equal shares

Giving equal CPU time to each task may not be fair between one user's task and a tenant with thousands of workers. A system may use weights, quotas, or group-level fairness. The definition of fairness must account for user, service, and priority boundaries.

Sustained high priority can starve other tasks. Aging, quotas, and time limits are tools for reducing starvation. Each policy has operational implications and should be monitored.

## Summary

- The scheduler selects a ready process or thread to use the CPU.
- Turnaround, waiting, response, throughput, and utilization are different goals.
- Preemption improves responsiveness but adds overhead and complexity.
- Shortest-job-first can reduce average waiting while starving long jobs.
- Fairness depends on groups and weights, not only equal time slices.

## Check your understanding

**Does reducing first-response time mean the job completes sooner?** No. Response time and turnaround measure different points.

**Is preemptive scheduling free of cost?** No. Saving state, switching context, and cache contention can consume resources.

**Is higher priority always a good policy?** Only with clear goals and limits; otherwise, other tasks may starve.

## Read next

FCFS, SJF, Round Robin, and multi-level feedback queues implement these trade-offs in different ways.
