---
title: "SIMD: One Instruction Across Multiple Data Elements"
category: "Operating System"
tags: ["cpu", "simd", "vectorization", "parallelism"]
description: "Understand vector registers and lanes, when compilers vectorize, and limits from alignment, dependencies, and bandwidth."
updated: 2026-10-16
translationKey: "operating-system/simd-data-parallelism"
---

SIMD (Single Instruction, Multiple Data) applies one operation to multiple data lanes in a vector register. Instead of adding each element with separate scalar instructions, the CPU may add several pairs at once when data and dependencies allow it.

## Vector lanes

A 256-bit vector can hold eight 32-bit floating-point values; a vector add performs eight lane additions under that ISA. This describes register capacity, not guaranteed throughput per cycle or an eightfold application speedup.

## Vectorization

A compiler may vectorize a loop when iterations are independent, pointer aliasing does not create dependencies, alignment and stride are suitable, and the remainder can be handled. Conditional branches in a loop may use masks or make vectorization difficult.

## Operations within and across lanes

A vector register packs lanes into a fixed-width bit region. For example, a 128-bit vector can represent sixteen 8-bit integers, eight 16-bit integers, or four 32-bit values; the ISA defines lane types and operations. **Per-lane** operations add, compare, or apply logic to corresponding elements in two vectors. A **reduction** combines multiple lanes into one result; a **permute/shuffle** reorders lanes or selects them from input vectors according to a mask or control vector. These operation groups have different costs and ISA support.

A historical note from the book: PowerPC AltiVec/VMX has a permute instruction with a separate control vector, while early SSE used a different operand format. This illustrates how ISA design can help a compiler or add extra steps; it does not mean every current ISA or extension has the same limitation.

## Limits

- Memory bandwidth or cache misses may be the bottleneck.
- Dependency chains prevent parallel lane execution.
- Unaligned or irregular data can reduce efficiency depending on the ISA.
- CPU extensions differ; binaries may need runtime dispatch for portability.
- CPU frequency may fall under vector-heavy workloads because of power or thermal policy.

## Summary

- SIMD processes multiple data lanes with one instruction.
- Vector width is not end-to-end speedup.
- Compilers need suitable dependencies, aliasing, and data layout.
- Memory bandwidth and power limits can cap the benefit.
- Portable code needs feature dispatch or an abstraction library.

## Check your understanding

**Does a 256-bit vector always make a loop eight times faster?** No.

**Does every x86 CPU support the same AVX extensions?** No; features must be checked.

**Is SIMD multicore parallelism?** No; it is data parallelism within a CPU execution unit.

## Further reading

Measure with a representative benchmark workload to see whether SIMD actually helps.
