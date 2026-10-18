---
title: "P, NP, and NP-hardness: decision problems and reductions"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/complexity-classes"
series: "Advanced DSA"
seriesOrder: 22
tags: ["complexity-theory", "p", "np", "np-complete", "reduction"]
description: "Distinguish finding solutions from checking certificates, and follow reductions in the correct direction."
draft: false
updated: 2026-10-15
---

Someone gives you an ordering of cities and claims it is a valid cycle. Checking its edges need not require discovering the route yourself. The difference between **finding** a solution and **checking** a proposed one motivates P and NP.

These classes concern general problems across input sizes within a computational model. They do not measure one instance's runtime or imply every NP-hard instance takes a long time.

## First ask a yes/no question

An optimization problem asks for the shortest tour length. Its decision counterpart asks whether a tour of length at most K exists. Related though their outputs differ, P and NP conventionally classify **decision problems** here.

P contains problems solvable deterministically in polynomial time in the **encoded input length**. NP contains problems whose yes-instances have a polynomial-length certificate checked by a polynomial-time verifier. For no-instances, no certificate may make that verifier accept incorrectly. NP does not mean “non-polynomial,” nor must the verifier find a certificate quickly.

Every P problem is in NP: a verifier can solve the instance and ignore its certificate. Hence `P⊆NP`. Whether `P=NP` remains [listed as unsolved by the Clay Mathematics Institute](https://www.claymath.org/millennium/p-vs-np/) as checked on 2026-10-15. The NP definition does not establish that every NP problem lies outside P.

## A Hamiltonian-cycle certificate

For a graph with n vertices, ask whether a cycle visits every vertex exactly once and returns to its start. A certificate lists the n vertices in traversal order. Check that there are n valid distinct vertices, every consecutive pair is an edge, and the last–first pair is an edge too.

For `[A,C,B,D]`, checking A–C,C–B,B–D is insufficient: D–A matters. Without it, the certificate describes a path rather than a cycle. Marking vertices detects repetition. With suitable graph storage these checks are polynomial; representation can change the precise exponent without changing membership in NP.

```note-visualization
{"id":"hamilton-certificate","preset":"normal"}
```

Quickly checking one certificate does not make trying all orders polynomial. There may be n! candidate orders. This shows a polynomial verifier; establishing hardness requires an additional reduction.

## A number's value differs from its encoding length

The 0/1 knapsack decision problem asks whether selected items have total weight at most W and value at least K. A certificate contains n selection bits. Sum selected weights/values and compare to W,K. Arithmetic must account for bit lengths but verification remains polynomial in encoded input size.

A DP indexed by n and W commonly needs O(nW) arithmetic operations under an appropriate model. If W has b binary bits, it can be about `2^b`; O(nW) can therefore be O(n2^b), not polynomial in b. Moving W from roughly twenty to forty bits does much more than double the table's index range.

An algorithm polynomial in **numeric value** without being polynomial in encoding length is called pseudo-polynomial. This DP is useful when W is small, but does not prove binary-encoded general knapsack belongs to P. Specify parameters and encodings instead of drawing conclusions from the name “DP.”

## A reduction must point the right way

`A ≤p B` means a polynomial-time transformation f maps every A-instance x to a B-instance such that x is yes **if and only if** f(x) is yes. A fast B algorithm combined with f would solve A quickly. Under this reduction, B is at least as hard as A.

To prove a new B NP-hard, start from a known NP-hard A and construct `A ≤p B`. `B ≤p A` only shows that B can use A to solve itself, without proving B hard. The transformation needs polynomial-size output and both directions of answer preservation, rather than merely a plausible-looking construction.

H is NP-hard if every NP problem polynomially reduces to it under the appropriate interpretation. If H is also a decision problem in NP, it is NP-complete. An optimization problem may be NP-hard without automatically being NP-complete under this decision-problem definition.

## Check both directions in one construction

From an undirected n-vertex Hamiltonian-cycle instance, build a complete graph on the same vertices: original edges weigh one, missing edges weigh two. Ask whether a TSP tour visits each vertex once, returns to its start, and costs at most n. Creating at most O(n²) edges is polynomial.

An original Hamiltonian cycle gives an n-edge tour of ones, costing n. Conversely, any n-vertex tour has n edges, each costing at least one. Cost at most n forces every edge to weigh one, so all are original edges and form a Hamiltonian cycle. The threshold n and return-to-start condition are essential to equivalence.

Given known NP-hardness of Hamiltonian cycle, the reduction establishes hardness of this TSP decision version. NP-completeness additionally needs its verifier: check tour validity and sum weights in polynomial time in the encoding.

## General hardness leaves conditional practical choices

NP-hardness does not select a practical algorithm. Small instances may suit backtracking/branch-and-bound; a small parameter can make parameter-based DP useful. Approximation must state its guaranteed ratio and problem assumptions; heuristics need quality evaluation without promising optimality. Special graph classes may admit better algorithms than the general class.

Distinguish failure to find a good answer within a deadline, a valid answer of unknown optimality, and a proof of nonexistence. A failed heuristic does not prove a no-instance. Quickly solving one small example also does not contradict a class's worst-case hardness.

## Check your reasoning

**1.** What certifies a clique of size at least k? **2.** Why can an nW table be enormous when W is written briefly? **3.** Where does the hardness reduction begin?

**Explanation:** List k distinct vertices and check each pair has an edge, requiring O(k²) pair checks and a polynomial verifier. A b-bit W can approach 2^b, making a W-indexed table exponential in b. Start from known-hard A and reduce to B: a fast B solution would imply a fast A solution. B must additionally belong to NP for NP-completeness.
