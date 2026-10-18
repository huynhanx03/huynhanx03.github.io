---
title: "MLFQ: Feedback, Priority Boosts, and Inferring Workloads"
category: "Operating System"
tags: ["operating-system", "scheduling", "mlfq"]
description: "Understand how MLFQ adjusts priority based on CPU behavior, the limits of its heuristics, and ways to prevent starvation."
updated: 2026-10-16
translationKey: "operating-system/mlfq-priority-boost-and-feedback"
---

A Multi-Level Feedback Queue (MLFQ) places runnable jobs in queues with different priorities. New jobs usually start at a high priority to improve response time; a job that uses its entire CPU quantum is demoted to a lower queue. A job that often yields early may be treated as interactive or I/O-bound and keep a higher priority.

## The scheduler learns from behavior

MLFQ does not need to know in advance whether a job is short or long. It adjusts priority based on recent CPU use. This helps with mixed workloads, but a job may be able to “game” the scheduler by yielding just before its quantum ends.

## Priority boosts and starvation

If new short jobs continually push a long job down, it may wait too long. A periodic priority boost moves jobs back to higher queues, giving low-priority jobs a chance to run and making the scheduler forget behavior from too far in the past. Boosting too often reduces workload differentiation; doing so too rarely risks starvation.

Quanta often grow in lower-priority queues to reduce context-switch overhead for CPU-bound jobs. Parameters must balance response time, throughput, and fairness; no single MLFQ configuration is optimal for every workload.

## Check your understanding

**Does MLFQ know exactly how much CPU time a job has left?** No.

**Is an I/O-bound job always prioritized correctly under every load?** No; the heuristic depends on workload and parameters.

**Are priority boosts only for speed?** No; they also help prevent starvation.

## Further reading

A proportional-share scheduler optimizes a different goal: divide CPU time by weights instead of inferring job duration.
