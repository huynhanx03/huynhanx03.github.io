---
title: "Branch prediction and speculative execution"
category: "Operating System"
tags: ["cpu", "branch prediction", "speculation", "security"]
description: "Learn how predictors guess control flow, pipelines flush, and speculation rollback can still leave a side channel."
updated: 2026-10-16
translationKey: "operating-system/branch-prediction-and-speculation"
---

A CPU wants to keep fetching instructions before a branch condition has finished computing. A branch predictor uses history to guess the target and direction; speculative execution runs ahead using that guess. Once the result is known, the CPU keeps the correct work or squashes the incorrect work.

## Predictors and misprediction

A predictor may use recent patterns, a branch target buffer, and a history table. A regular repeating branch is often easy to predict; random data is harder. A misprediction makes the pipeline discard speculative work and fetch the correct path again. The cost depends on pipeline depth and microarchitecture.

A predictor may combine several signals. A **loop predictor** recognizes a loop-exit branch and learns its usual iteration count, reducing prediction errors when the loop exits—an outcome a basic branch counter may predict poorly. An **indirect branch predictor** learns possible targets for the same indirect branch and uses context or history to choose one. This is useful for dispatch tables, virtual calls, and control flow with changing targets. These are families of techniques; their specific structures and algorithms differ across CPU generations.

A **hardware loop buffer** can keep the instructions of a small loop in the front end so they need not be fetched again from the instruction cache on each iteration. It can save front-end work and energy, but does not replace branch prediction generally and helps only with suitable loop patterns.

A historical design such as Pentium 4's trace cache stored decoded micro-operations along a predicted control-flow path. This could avoid some repeated decoding and reduce a post-branch bubble on a trace-cache hit. On a miss, instructions still had to be fetched and decoded again; it did not remove the branch predictor or misprediction penalty. Treat it as a particular implementation, not a feature of every CPU.

## Architectural rollback and microarchitectural side effects

Speculative results that have not retired are discarded so architectural state remains correct. But cache, TLB, or predictor state may have changed and can be measured indirectly through timing. Side-channel attacks such as Spectre exploit speculative access to leak data through microarchitectural state.

Mitigations include compiler barriers, bounds checks and speculation-safe patterns, microcode or OS controls, and isolation. Each has conditions, costs, and platform requirements. A simple code snippet cannot prove that every CPU is protected.

## Summary

- A predictor guesses branches to keep the pipeline busy.
- A misprediction discards speculative work and fetches the correct path.
- Architectural rollback does not erase every microarchitectural side effect.
- Side channels exploit timing or cache behavior; mitigation depends on compiler, CPU, and OS.
- Speculation affects both performance and security.

## Check your understanding

**Does a mispredicted branch commit the wrong result?** Architectural state must discard it.

**Does rollback return the cache to its old state?** Not necessarily.

**Is disabling all speculation a free mitigation?** No. It affects performance and CPU design.

## Read next

Combine this with pipeline hazards and cache locality to understand performance effects.
