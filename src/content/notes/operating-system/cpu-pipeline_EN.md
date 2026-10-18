---
title: "CPU pipelines: overlapping instruction work"
category: "Operating System"
tags: ["cpu", "pipeline", "hazards", "computer architecture"]
description: "Understand pipeline stages and the three kinds of hazards that make a CPU wait or change how it executes."
updated: 2026-10-17
translationKey: "operating-system/cpu-pipeline"
---

If each instruction had to finish all its work before the CPU started the next, many hardware units would sit idle at different times. A pipeline divides instruction processing into stages, like an assembly line: one instruction is decoded while the previous one executes and the next one is fetched.

A pipeline improves **throughput**—the number of instructions completed per unit of time—by overlapping work. It does not necessarily reduce the **latency** of one instruction. This distinction matters when saying “pipelining makes a CPU faster.”

## A five-stage model

A common teaching model divides an instruction into:

| Stage | General task |
| --- | --- |
| IF | Fetch an instruction from instruction memory/cache |
| ID | Decode it and read registers |
| EX | Calculate or compute an address |
| MEM | Access data memory if needed |
| WB | Write a result back to a register |

This is a simplified diagram, not the design of every CPU. Real CPUs may have more stages, multiple execution units, several cache levels, and internal queues.

For independent instructions, an ideal **single-issue** full pipeline may complete nearly one instruction per cycle. A superscalar CPU can issue multiple instructions per cycle; the slowest stage and the number of execution units both set limits. Dependencies and waits create gaps. Pipelining does not turn one addition into five additions on the same data at once.

## Filling the pipeline and real throughput

In an ideal single-issue model with `k` stages, each taking `T/k`, the first instruction needs about `T` to pass through. Once full, the pipeline can complete one instruction every `T/k`. Long streams benefit most; short programs pay the fill and drain cost. If four stages each take 1 ns and process four instructions, the first result arrives after 4 ns and another can follow each nanosecond. A few instructions do not achieve steady-state throughput.

Measure throughput in instructions per cycle (IPC), then convert to instructions per second with `IPC / clock period`. Average IPC is below the design's theoretical limit while the pipeline fills or has bubbles. A stall makes a bubble travel through the pipeline; when it reaches write-back, that cycle completes no instruction. Instruction latency is the number of cycles spent in the pipeline: often at least its depth, and longer if stalled.

A deeper pipeline helps only if stages are balanced and the clock can actually run faster. The clock is limited by the slowest stage; faster stages wait. More stages also require control and buffering and take longer to refill after a flush. The ideal speedup equal to the number of stages is an upper bound, not a prediction of real performance.

## What is a hazard?

A hazard prevents the pipeline from following its ideal schedule. Three common groups are:

1. **Structural hazard:** two operations need the same hardware resource at once.
2. **Data hazard:** an instruction needs a result that an earlier instruction has not produced yet.
3. **Control hazard:** the CPU does not yet know the next path because a branch depends on a condition.

CPU designs can add resources, forward results, delay instructions, or predict a path. These techniques reduce some waiting but make hardware more complex.

## Data hazards and forwarding

```text
add r3, r1, r2
sub r4, r3, r5
```

The second instruction needs `r3`, produced by the first. If the pipeline reads registers before `add` writes its result, `sub` must wait. The CPU can **forward** the result directly from the stage holding it to the next operation's input, without waiting for a register-file write and read.

Forwarding does not solve every dependency. A load may not have received data from cache when the next instruction needs it:

```text
load r3, [r1]
add  r4, r3, r5
```

This is a load-use dependency. The CPU may insert a bubble—a cycle in which no useful instruction enters that stage—then continue when data is ready. The delay depends on the CPU and memory state.

An out-of-order CPU may execute later independent instructions while a load waits. But if many instructions depend on missing data, reordering cannot create it.

## Control hazards and branch prediction

```text
if (x == 0) {
    do_a();
} else {
    do_b();
}
```

The CPU must know which branch to fetch next. It can wait for the condition or predict. A correct prediction avoids some waiting. On a wrong prediction, instructions on the predicted path may be discarded before producing visible architectural results, and the CPU resumes on the correct path.

Not every `if` makes a program slow; predictors learn stable branches. Cost depends on predictability and pipeline depth. Rewriting code to remove a branch helps only if measurements show it is a bottleneck and the new version remains understandable.

## Structural hazards

In a model with one shared memory port, instruction fetch and data access may contend for the same resource. A CPU can pause one operation or use separate paths/caches to reduce conflict. The solution depends on the microarchitecture; an introductory pipeline diagram should not be treated as an exact picture of a specific chip.

## Why a deeper pipeline is not always better

Splitting work into shorter stages can support a higher clock frequency, but raises the cost of a wrong branch prediction and adds more stage boundaries. A higher clock alone does not guarantee more work completed per second. Performance depends on cycles per instruction, parallelism, caches, power, and workload.

## Summary

- A pipeline overlaps stages of several instructions to improve throughput.
- Hazards come from resource contention, data dependencies, or branches.
- Forwarding and out-of-order execution can reduce waits but cannot remove true dependencies.
- Branch prediction lets the CPU work ahead; a wrong prediction discards speculative work.
- A pipeline is a microarchitectural detail; CPUs with the same ISA can differ.

## Check your understanding

**Does a five-stage pipeline mean every instruction always finishes in five cycles?** No. Stages overlap, and actual latency depends on design and hazards.

**Does forwarding remove every data hazard?** No. A load-use dependency may still need to wait for data.

**When branch prediction is wrong, can the CPU undo every side effect?** The CPU discards speculative architectural state. External side effects such as device access are not ordinary computations that can be freely reversed.

## Read next

Review [CPU execution](/en/notes/operating-system/cpu-execution/) and then read [the cache and memory system](/en/notes/operating-system/cache-memory-hierarchy/).
