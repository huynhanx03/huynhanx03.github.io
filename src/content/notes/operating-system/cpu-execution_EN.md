---
title: "CPU execution: from the program counter to a result"
category: "Operating System"
tags: ["cpu", "instruction cycle", "computer architecture"]
description: "Trace instructions through the program counter, registers, memory, and control flow."
updated: 2026-10-17
translationKey: "operating-system/cpu-execution"
---

We say “the CPU runs a program,” but that phrase hides a sequence of events. The CPU finds the next instruction, determines what it requests, obtains needed data, performs an operation, and chooses what happens next. This model helps with architecture diagrams and explains why memory access can strongly affect runtime.

## The conceptual instruction cycle

A simple model has these steps:

1. **Fetch:** use the PC to locate an instruction.
2. **Decode:** identify the operation and operands.
3. **Read operands:** get needed values from registers or memory.
4. **Execute:** perform an operation or calculate an address.
5. **Write back:** store the result in a register or memory.
6. **Update control flow:** choose the next instruction, sequentially or at a branch target.

This is a way to reason about execution, not necessarily the sequential order used by every modern CPU. A CPU can overlap instructions, execute them out of order, and internally rename registers as long as visible results match the architectural contract.

In a toy ISA with 2-byte instructions, the PC might increase by 2 after each fetch. A branch writes its target address into the PC instead of keeping the sequential value. Arithmetic may update status bits such as zero, negative, or overflow; a conditional branch reads them to choose a path. Real ISAs differ in instruction length, flags, and branch-address calculation.

## A step-by-step example

Suppose two values are already in `r1` and `r2`, and the program wants to add and compare them:

```text
add  r3, r1, r2
cmp  r3, 10
beq  equal_case
```

`add` reads two operands, computes a sum, and writes it to `r3`. `cmp` evaluates `r3` against 10 and may update architectural state. `beq` uses that state to decide whether to move the PC to `equal_case` or continue sequentially.

Another ISA may encode comparison and branching differently. This example explains instruction roles; it is not an exact description of every CPU.

## When data is not in a register

If an instruction needs data in RAM, the CPU must access memory. The data may already be in a nearby cache and arrive much faster than from RAM. Otherwise the CPU may wait for it or continue other work if its microarchitecture can do so. A cache miss is not necessarily a page fault: a cache miss asks where data is cached; a page fault asks whether the virtual page is mapped, resident, and accessible.

This is why two code paths with the same number of additions can take different amounts of time. One may read nearby data and benefit from cache; another may access a large region randomly and often wait for memory. Instruction count is one part of performance, not the whole story.

## Branches change the path

A branch changes which instruction the PC selects next. A conditional branch depends on a value or status flag. Modern CPUs predict a likely path to avoid waiting. Correct prediction keeps the pipeline busy; a wrong prediction requires discarding speculative work and fetching from the correct path. The CPU must preserve architectural behavior even when its internal work was speculative.

## From sequential model to pipeline

Fetch, decode, execute, and write-back describe the logical work. A pipeline overlaps those stages across instructions; superscalar and out-of-order CPUs can do even more internally. Dependencies, branches, and resource conflicts can still stall progress. Thus, reading instructions in source order does not tell the whole story of cycles or performance.

## A CPU does not always execute internally in program order

An out-of-order CPU may start a later instruction before an earlier one finishes when the instructions are independent and resources are available. For example, an addition can finish while a load waits for RAM. The CPU must still make the program's architectural behavior correct, often by completing or committing results according to its design rules.

So, source order and the order of work inside the processor are not always the same. Multithreaded programs also need memory-model and synchronization rules to determine when one core can observe another core's changes. This is why concurrency cannot be understood by looking only at source-line order.

## Summary

- The PC determines control flow; instructions read and write architectural state.
- Fetch/decode/execute is a useful model, not the exact schedule of a modern CPU.
- Caches and memory affect data-wait time.
- Pipelines overlap work; hazards can stall it.
- A CPU can execute internally out of order while preserving architectural behavior.

## Check your understanding

**Does each instruction finish fetch through write-back before the next begins?** No. That is the basic model; modern CPUs often overlap and reorder internal work.

**Does the same number of operations imply the same speed?** No. Memory access, branches, caches, parallelism, and other factors matter.

**Can out-of-order execution expose results in the wrong architectural order?** The CPU must preserve architectural behavior, but shared memory between threads still needs appropriate synchronization.

## Read next

Next: [CPU pipelines and hazards](/en/notes/operating-system/cpu-pipeline/).
