---
title: "Superscalar and out-of-order execution"
category: "Operating System"
tags: ["cpu", "superscalar", "out-of-order", "computer architecture"]
description: "Understand issuing multiple instructions per cycle, register renaming, reorder buffers, and preserving architectural results."
updated: 2026-10-16
translationKey: "operating-system/superscalar-out-of-order-execution"
---

A pipeline overlaps instructions; a **superscalar** CPU can issue multiple micro-operations in one cycle when it has enough execution units and independent instructions. This increases instruction-level parallelism (ILP) without asking programmers to create a separate thread for every operation.

## Finding independent instructions

```text
a = b + c
d = e * f
g = a + d
```

The first two computations are independent and could run in parallel if suitable CPU units are available. The last depends on both, so it must wait. The CPU examines an instruction window for ready work; true dependencies set a limit.

## Execution units need data bandwidth

Two ALUs are not enough to run two instructions at once. They must read operands and write results concurrently. If each instruction reads two operands and writes one result, two ALUs may need four read ports and two write ports to the register file in one cycle. More ports increase register-file area and can increase access time. Real designs balance issue width against port count, execution-unit types, and register-file organization. Integer, floating-point, load/store, and branch operations often use different units.

## Instruction windows and issue conditions

The front end often places decoded instructions in buffers; back-end execution units take work when operands and resources are ready. This separation can absorb a short fetch/decode hiccup while buffers still contain instructions. Dispatch commonly preserves program order to allocate tracking resources; issue may reorder among execution units; retirement/commit returns to original order.

An instruction can dispatch only when there is room in the reorder buffer (ROB), an appropriate reservation station, needed renamed registers, and an available execution unit/slot. Decode width or ALU count alone does not determine how many instructions execute per cycle. A wider instruction window lets the CPU look farther ahead but costs area and power; buffer sizes must balance pipeline depth and the number of in-flight instructions.

### Combining operations to reduce instruction-window pressure

An ISA instruction may decode into several micro-ops. For some pairs—such as calculating a store address and preparing its data, or loading and operating on the loaded value—the CPU may use **micro-op fusion**: the front end tracks them as one queue/ROB entry while the back end executes the parts on suitable units. A store's two parts can run in parallel; a load-op must wait for the load. This lets a finite window track more ISA instructions and reduces bookkeeping/decode pressure. Which instructions fuse depends on microarchitecture.

Another technique is **macro-fusion**: before decode, certain ISA pairs such as compare/test followed by a conditional branch are handled as one macro-operation. This reduces dispatch/retirement entries and front-end pressure, but applies only to specific patterns and conditions. The names are similar, but fusion occurs at different stages.

### Case study: grouped dispatch

The PowerPC 970/G5 grouped internal operations into five-operation groups for dispatch and completion. This let the design track groups instead of every operation in a backend with many instructions in flight. In return, branch-position rules, operation types allowed in each slot, issue-queue space, rename registers, and completion-table space could make a whole group wait or leave slots empty. This is **internal fragmentation** of a dispatch group: a wide backend can still lose throughput when a group is not full. It is a historical example; the general lesson is that batching reduces bookkeeping but can sacrifice flexibility.

## Register renaming

The finite set of ISA register names can be reused across instructions. If a later instruction writes a register that an earlier instruction also writes, but does not need its old value, a false WAR/WAW dependency exists on the register name. Register renaming maps architectural names to separate physical registers and removes some false dependencies.

A RAW dependency (a later instruction reads an earlier result) is a true data dependency and cannot be removed by renaming.

## Reorder buffer and retirement

An out-of-order CPU can execute any instruction whose operands are ready, even while an earlier instruction waits for memory. The reorder buffer retains results and state so they can commit in architectural order. If branch prediction is wrong or an exception occurs, the CPU discards speculative results that have not committed.

In-order retirement makes architectural state appear as if the program ran sequentially, even though internal execution differed. Side channels/speculative execution are separate security issues: rolled-back work can still leave microarchitectural traces in caches.

## Different superscalar designs

Two designs can both be superscalar while spending transistor budgets differently. A **wide and shallow** design has many execution units and a short pipeline; a **narrow and deep** design has a long pipeline, many in-flight instructions, and larger buffers to sustain instruction flow. These describe historical designs in the book (PowerPC G4e and Pentium 4), not rigid categories for modern CPUs. A deep pipeline can raise clock rate but makes flushing/refilling more expensive; a wide pipeline needs enough ILP and dispatch/issue bandwidth to use its units.

Pentium 4 used a **trace cache** to store decoded micro-op sequences, including predicted branch paths. On a hit, the CPU avoided decoding that x86 code again; on a miss, it fetched/decoded and created a trace. This was a specific historical design, unlike a conventional instruction cache. The broader principle is caching decode results to reduce front-end pressure. Do not assume all CPUs use trace caches.

## Limits to ILP

Wrong branches, cache misses, dependency chains, register pressure, and resource contention reduce parallel issue. Increasing superscalar width costs energy/area and has diminishing returns when a program lacks independent instructions.

### Loads and stores can reorder, but meaning must be preserved

A store's address may not yet be calculated while a later load already knows its address. If the CPU waits for every earlier store to prove it does not touch the same address, it may suffer **false aliasing**: independent accesses appear to conflict. Some microarchitectures predict the relationship so the load can run early, then check when the store address is known. If the load read wrong data because there really was an alias, dependent operations are canceled/replayed with correct data. Architectural results must still retire in order and follow the memory model; early execution does not permit an invalid order to be observed.

## Summary

- Superscalar CPUs issue multiple operations per cycle when resources and dependencies allow.
- Register renaming removes false WAR/WAW dependencies, not true RAW dependencies.
- Out-of-order execution exploits ILP; a reorder buffer supports in-order architectural retirement.
- Speculative results can be rolled back, while side channels may still pose security risks.
- Dependency chains, branches, and memory latency limit speedup.

## Check your understanding

**Can a CPU execute `g = a + d` before `a` and `d` are ready?** No. It has a true data dependency.

**Does register renaming remove every dependency?** No. RAW remains a real dependency.

**Does rolling back speculation mean there are no traces?** No. Caches and other microarchitectural state can retain observable effects.

## Read next

Cache and memory hierarchy determine whether load instructions get data in time.
