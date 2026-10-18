---
title: "CPU Pipelines and Their Hazards"
category: "Operating System"
tags: ["computer-architecture", "cpu", "pipeline"]
description: "Follow instructions through a pipeline and understand how data, control, and structural hazards reduce throughput."
updated: 2026-10-17
translationKey: "operating-system/cpu-instruction-pipeline-hazards"
---

A pipeline divides instruction execution into stages such as fetch, decode, execute, memory, and writeback. Once full, instructions in different stages can make progress in parallel. The goal is to increase throughput; the latency of one instruction does not necessarily decrease by the same proportion.

## Three types of hazards

- **Data hazard:** A later instruction needs a result that an earlier instruction has not written yet. Forwarding passes a result between stages; if that is not enough, the pipeline inserts a stall or bubble.
- **Control hazard:** A branch makes the next instruction uncertain. The CPU may predict the branch; a wrong prediction discards speculative work and fetches from the correct path.
- **Structural hazard:** Two operations need the same hardware resource at once, such as a shared memory port that cannot serve them simultaneously.

## CPI and throughput

In an ideal **single-issue** model, a pipeline can complete close to one instruction per cycle after it fills. A superscalar CPU may issue several instructions per cycle, so its theoretical limit is higher. Stalls, cache misses, dependencies, and branch mispredictions lower IPC relative to the design's limit. Total time also depends on clock frequency and instruction count; lowering CPI does not guarantee a faster program if frequency or instruction count changes.

A compiler can schedule instructions to hide latency when semantics permit; an out-of-order CPU can find independent later instructions. Both must preserve architecturally observable results.

## Check your understanding

**Does a five-stage pipeline mean each instruction completes in one-fifth of a cycle?** No; stages operate in parallel on different instructions.

**Does a branch misprediction produce an incorrect program result?** No; speculative results are discarded before becoming architectural state.

**Are throughput and latency the same?** No.

## Further reading

Branch predictors guess branch direction to reduce bubbles, while speculative execution does more work before the branch is known for certain.
