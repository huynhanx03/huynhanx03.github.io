---
title: "Proportional-Share Scheduling: Dividing CPU by Weight"
category: "Operating System"
tags: ["scheduling", "lottery scheduling", "fairness"]
description: "Understand tickets and lottery scheduling, stride scheduling, and how CPU time can be divided according to desired proportions."
updated: 2026-10-16
translationKey: "operating-system/proportional-share-scheduling"
---

Round Robin divides turns in queue order, but a system may need group A to receive about 70% of CPU and group B 30%. **Proportional-share scheduling** represents entitlement with weights and divides CPU time close to the desired ratio over a sufficiently long interval.

## Lottery scheduling

Each process receives tickets. The scheduler draws a random number; the process holding the winning ticket runs for one quantum. If A has 70 tickets and B has 30, A has about a 70% chance of winning each draw.

The actual ratio can vary over a short window; more draws generally bring it closer to the expected ratio. Tickets can be divided among child processes or transferred through a client/server relationship to reflect ownership, but the policy must define how.

## Stride scheduling

Stride is a deterministic model: each process gets a stride inversely proportional to its ticket count. The scheduler selects the process with the lowest pass value, runs it, then adds its stride to the pass value. This produces a less random approximation of the ratio, but must handle overflow, new processes, and state resets.

## Weight is not absolute priority

A 2x weight usually aims for nearly twice the CPU share under comparable contention; if CPU is idle, a task may use more than its entitlement. Cgroup CPU shares, nice values, and scheduler policies have different semantics; consult kernel or runtime documentation before mapping textbook terms to Linux settings.

## Fairness across groups

If one user creates 100 processes and another creates one, equal division by process gives the first user more CPU. Hierarchical scheduling divides by group first, then within each group. Fairness must define its unit: thread, process, tenant, or user.

## Summary

- Proportional-share scheduling targets CPU division according to weights.
- Lottery scheduling chooses by ticket count; short-term results vary.
- Stride scheduling approximates the ratio deterministically using pass values.
- CPU share matters when there is contention, and semantics depend on the scheduler.
- Fairness per process differs from fairness per user or tenant.

## Check your understanding

**Do 70/30 tickets mean exactly 7 and 3 quanta in every window of 10?** No; a lottery varies in small samples.

**Does twice the weight always make a program finish twice as quickly?** No; it only changes relative CPU allocation under certain conditions.

**Is equal sharing per PID always fair?** No, especially if users create different numbers of PIDs.

## Further reading

The **Processes & Scheduling** topic combines proportional share with latency, fairness, and multicore goals.
