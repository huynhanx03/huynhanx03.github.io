---
title: "Lottery and Stride Scheduling"
category: "Operating System"
tags: ["operating-system", "scheduling", "fairness"]
description: "Compare randomized lottery scheduling with deterministic stride scheduling for proportional CPU allocation."
updated: 2026-10-16
translationKey: "operating-system/lottery-scheduling-stride"
---

A proportional-share scheduler tries to divide CPU time by weight. In lottery scheduling, each job has tickets; the scheduler draws one at random and runs the job that owns it. More tickets mean a greater chance of receiving CPU over the long term, but short windows vary randomly.

## Tickets and sharing rights

If A has 20 tickets and B has 10, A is expected to receive two-thirds of the CPU time when both are runnable. Lottery scheduling may transfer tickets temporarily from a client to a server serving it, or use a currency abstraction for hierarchical allocation.

The ratio is a probability expectation, not a guarantee after every quantum or in every short interval. As jobs run longer and there are more draws, the observed ratio usually approaches the ticket ratio; a short job may finish before or after another just because of the random sequence. Tickets also do not answer an important governance question by themselves: who should receive how much share?

## Stride scheduling

Stride scheduling turns shares into deterministic intervals. A job with a smaller stride (higher share) is selected when it has the lowest pass value; after it runs, its pass increases by its stride. This reduces random variation and can provide better short-term fairness, but pass values need handling when jobs enter or leave.

## Limits

Shares apply when jobs compete for CPU; a blocked task does not receive CPU just because it has tickets. Multiprocessor scheduling, affinity, and latency make the model more complex. Ticket count is not a real-time deadline guarantee.

## Exercise: probability and fairness

Run a lottery with the same workload but many random seeds. Compare two jobs with equal tickets to a pair with a large imbalance; record each job's completion time and CPU use across time windows. Repeat with a longer quantum to see how short-window variation changes. Finally, plot observed CPU-share ratios over time alongside a stride scheduler.

Ticket ratios are long-term expectations; one run or short window can differ substantially. When comparing fairness, state the metric—CPU share over time or completion-time spread—because they answer different questions.

## Check your understanding

**Does lottery scheduling guarantee the exact ratio in each quantum?** No.

**Will a blocked job use CPU because it has tickets?** No.

**Is stride scheduling random?** No; it selects according to pass values.

## Further reading

A multiprocessor scheduler must also decide which core runs each task to balance fairness and cache locality.
