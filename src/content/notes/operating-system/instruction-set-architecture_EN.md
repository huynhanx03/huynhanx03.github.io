---
title: "Machine instructions and the ISA: the software–CPU contract"
category: "Operating System"
tags: ["computer architecture", "isa", "machine code"]
description: "Understand machine instructions, registers, memory, and why programs need a clear architectural interface."
updated: 2026-10-16
translationKey: "operating-system/instruction-set-architecture"
---

A CPU does not directly execute an idea such as “sum a list” or “open a window.” It performs small operations encoded as machine instructions: add values, load data from memory, compare values, or transfer control elsewhere.

The instruction set software can rely on is the **Instruction Set Architecture (ISA)**. An ISA is a contract: it describes the state and operations visible to software, while a microarchitecture describes how a particular CPU implements that contract.

## A program becomes a sequence of instructions

A high-level expression might be:

```c
sum = a + b;
```

A compiler could translate it into operations resembling:

```text
load r1, [address_of_a]
load r2, [address_of_b]
add  r3, r1, r2
store [address_of_sum], r3
```

This is pseudocode; instruction names and rules vary by ISA. The point is that a computation may read data, calculate in the CPU, and then write a result. A compiler may choose a different sequence as long as it preserves program meaning.

## State manipulated by machine instructions

A CPU has architectural state, commonly including:

- **Program counter (PC):** the next instruction location under the ISA model.
- **Registers:** small storage locations inside the CPU used by instructions.
- **Status flags:** record results such as zero or overflow, depending on the ISA.
- **Memory:** stores instructions and data accessible under defined rules.

Arithmetic instructions usually operate on registers. A load reads memory into a register; a store writes a register to memory. Not every ISA permits every operation directly on memory.

The PC does not always advance by one simple unit. Conditional branches, calls, returns, and interrupts can change control flow. Instruction size and PC update rules depend on the ISA.

## An ISA defines more than instruction names

For programs and CPUs to interoperate, an ISA specifies instruction and data representation, visible registers, addressing modes, operation behavior, handling of some events, and architectural memory-access rules.

For example, two “load” instructions may differ in data size, signedness, alignment, or address calculation. An ISA may specify what result or flags arise from an overflow. These details affect compilers, operating systems, and low-level software.

## ISA versus microarchitecture

The ISA says **what behavior the CPU must provide**. The microarchitecture says **how the CPU is organized to provide it**.

Two processors can implement the same ISA while differing in core count, pipeline depth, cache sizes, out-of-order execution, and power use. The same machine-code program can run on both but perform differently.

Conversely, a program compiled for one ISA usually cannot run directly on another without recompilation or a translation layer. The OS and ABI add conventions for function calls, executable formats, and libraries; an ISA does not define the whole programming environment.

### An example instruction encoding

Imagine a toy ISA with 16-bit instructions, four registers, and one bit selecting an instruction format. A register addition might encode `mode + opcode + source1 + source2 + destination`, with unused bits set to zero. An immediate format might use the second byte for a constant instead of a second register. Thus `add r1, 5, r2` has different bit fields from `add r1, r3, r2`, even though both use the mnemonic `add`.

This shows that a mnemonic is readable notation; the CPU decodes bit fields according to the ISA format. Opcode width limits the encodable operations, while register-field width limits how many registers can be named. Real ISAs may have more complex, variable-length encodings. Do not infer x86 or ARM encoding from this toy model.

## Why are some instructions privileged?

If an ordinary application could freely change memory mappings, configure devices, or modify another process's state, a small bug could damage the whole machine. CPUs therefore provide privilege levels or execution modes. Some operations are allowed only in privileged mode.

When an application needs a service such as creating a process or accessing a file, it makes a system call. The CPU provides the privilege transition; the kernel checks arguments and permissions before carrying out the request. This is where the ISA meets operating-system design.

## Summary

- The ISA is the contract software can rely on when running on a CPU.
- Machine instructions operate on the PC, registers, memory, and architectural state.
- A compiler translates program meaning into instructions for an ISA.
- Multiple microarchitectures can implement one ISA with different performance.
- Privileged operations let the kernel protect resources from ordinary programs.

## Check your understanding

**Does an ISA specify the number of pipeline stages?** No. That is usually a microarchitectural detail.

**Must two CPUs with the same ISA run a program at the same speed?** No. Caches, cores, pipelines, clock rate, and other factors can differ.

**Is an ISA a programming language?** No. A programming language expresses programs at a higher level; a compiler can translate them into one ISA's instructions.

## Read next

In [How a CPU executes a program](/en/notes/operating-system/cpu-execution/), follow fetch, decode, and execution.
