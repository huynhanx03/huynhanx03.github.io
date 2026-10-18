---
title: "Assembly, Addressing Modes, and Function Calls"
category: "Operating System"
tags: ["computer architecture", "assembly", "abi", "stack"]
description: "Read assembly instructions, distinguish addressing modes, and follow registers and the stack through a function call."
updated: 2026-10-16
translationKey: "operating-system/assembly-addressing-and-calls"
---

Assembly is a more readable notation for machine instructions, but it is still tied to a particular ISA. `mov`, `add`, `load`, and `branch` do not have the same syntax and semantics on every architecture. A compiler often emits assembly before encoding it as bytes, or passes through an intermediate representation first.

## Addressing modes

An instruction may get an operand from an immediate constant, a register, a direct memory address, or an address computed from a base, index, and offset. For example, pseudocode `load r1, [r2 + 8]` reads data at address `r2+8`; an ISA may use different syntax or restrict the available access forms.

Addressing modes affect instruction count, expressiveness, and decode complexity. Having more instruction forms does not necessarily make a program faster; the microarchitecture determines how instructions are decoded and dispatched.

## A function call is an ABI contract

When calling a function, the caller and callee must agree on where arguments and results go, which registers must be preserved, which may be overwritten, how the stack is aligned, and how control returns. The ABI defines these conventions.

A conceptual prologue and epilogue may save required registers, create a stack frame, allocate local space, and restore state before returning. Compiler optimizations may omit the frame pointer, keep values in registers, or inline the function; not every function creates a textbook frame.

## Stack frames and recursion

Each unfinished call needs enough state to resume after the function returns. Recursion creates multiple activation records, usually on the thread's stack. Deep recursion or large frames can exhaust the stack. Tail-call optimization can reduce frames when the compiler and ABI permit it; do not assume every language performs it.

A pointer to a local variable is valid only for the appropriate lifetime. The language and compilation model determine whether a value escapes to the heap or becomes a dangling pointer error.

## From assembly to a process

An executable contains code, data, and metadata that the loader uses to map sections, resolve dynamic libraries, and set the entry point. The loader does not necessarily read the entire file immediately; demand paging may bring in a page when it is accessed.

## Summary

- Assembly is notation for an ISA, not an architecture-independent language.
- Addressing modes define where operands come from.
- The ABI coordinates registers, arguments, results, and stack use between functions.
- A stack frame is a model for call state; compilers may optimize it away or change its form.
- The loader maps an executable into a process; pages may be loaded on demand.

## Check your understanding

**Does every function call always push all local variables onto the stack?** No; register allocation, inlining, and optimization change that.

**Does the same `add` mnemonic always have the same encoding?** No; the ISA and operand form determine it.

**Is the entire executable read into RAM before it runs?** Not necessarily; the loader may use demand paging.

## Further reading

The CPU processes multiple instructions through a pipeline; modern designs use superscalar execution and dynamic scheduling to maintain throughput.
