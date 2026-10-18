---
title: "x86-64 Registers, the Stack, and Calling Conventions"
category: "Operating System"
tags: ["computer-architecture", "x86-64", "assembly"]
description: "Read registers and the stack during x86-64 function calls, and distinguish calling conventions from the CPU instruction set."
updated: 2026-10-16
translationKey: "operating-system/x86-64-registers-calling-convention"
---

An instruction set defines operations a CPU can perform; a calling convention is a software agreement about passing arguments, preserving registers, and returning results. The same ISA may use different ABIs depending on the operating system and platform.

## Registers and stack frames

x86-64 has 64-bit general-purpose registers such as RAX, RBX, RCX, RDX, RSI, RDI, RSP, and RBP, as well as others. RSP points to the current stack area; the stack commonly grows toward lower addresses. A compiler may use RBP as a frame pointer or use it for another purpose when optimizing.

A stack frame may contain a return address, local data, and saved registers, but compiler optimization may omit the frame pointer or keep variables in registers. Real assembly therefore does not necessarily match a textbook diagram with one stack slot per variable.

## ABI and functions

A calling convention defines which registers pass arguments or return values, which are caller-saved or callee-saved, stack alignment, and handling of variadic functions. The System V AMD64 ABI (common on Linux/macOS) and Windows x64 ABI differ in argument registers, shadow space, and other rules.

A caller-saved register may be overwritten by a called function; the caller must save it if the value is still needed. A callee-saved register must be restored by the function before it returns. Following an ABI lets object code from different compilers or libraries call each other.

## A system call differs from a function call

A function call usually changes the instruction pointer within the same privilege level. A system call uses an architectural mechanism to enter kernel mode; the kernel ABI defines registers for the syscall number and arguments and how errors are reported. Do not confuse a userspace function-calling convention with the syscall convention.

## Check your understanding

**Does the CPU instruction set define argument registers for every language?** No; the ABI and calling convention define their use.

**Is RBP always a frame pointer?** No.

**Is a system call only a function call to an address?** No; it changes privilege through a controlled CPU mechanism.

## Further reading

Instruction formats, addressing modes, and data representation help when reading specific assembly.
