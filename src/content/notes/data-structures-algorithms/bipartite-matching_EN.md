---
title: "Bipartite matching and assignment"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/bipartite-matching"
series: "Advanced DSA"
seriesOrder: 17
tags: ["bipartite-matching", "augmenting-path", "assignment", "hopcroft-karp"]
description: "Use augmenting paths for maximum matching, then distinguish cardinality from assignment cost."
draft: false
updated: 2026-10-15
---

Two people A,B and jobs one,two: A can do either, B only one. Matching A to one first leaves B unable to take the vacant two directly. Yet moving A to two and B to one matches both. Reassigning accepted pairs is central to matching algorithms.

A bipartite graph divides vertices into L,R with edges only across sides. A matching has no shared endpoints. A **maximum** matching has greatest cardinality; **maximal** merely means no further edge can be directly added. `{A-1}` here is maximal without being maximum.

## An augmenting path describes the reassignment exactly

`B→1→A→2` starts at a free left vertex and ends at a free right one, alternating unmatched and matched edges. Remove A-1, add B-1,A-2, increasing cardinality from one to two. Generally an augmenting path has exactly one more unmatched than matched edge; flipping them retains at most one partner per vertex.

An augmenting path proves the matching is not maximum. Berge's theorem gives the converse: compare with a larger matching, considering edges belonging to exactly one. Components are alternating paths/cycles; some component must have more edges from the larger matching, forming an augmenting path for the current one. Thus absence of augmenting paths certifies maximum, stronger than no directly addable edge.

```note-visualization
{"id":"bipartite-augment","preset":"normal"}
```

## DFS finds a new place for an existing partner

Keep matchR[v], the left partner of right vertex v or an unmatched sentinel. From a left vertex, try right neighbors. Accept a free one; for an occupied one, recursively relocate its current partner. Update matches only when recursion succeeds, ensuring the reassignment chain reaches an actually free vertex.

Visited prevents cycling within one search and must reset for every augmenting-path search because the matching has changed. A previously blocked vertex can participate after a flip; retaining global visited can stop at maximal rather than maximum.

A DFS examines at most O(E) edges, and the basic algorithm tries at most |L| left vertices, giving O(|L|E) search work. Visited bookkeeping also counts: clearing a length-V array every time can add O(|L|V). Search timestamps or clearing only touched entries, together with skipping isolated vertices, avoid that full-array reset; initializing/reading the input still costs O(V+E).

Hopcroft–Karp builds shortest-augmenting-path BFS layers, then DFS finds an **inclusion-maximal** family of vertex-disjoint shortest augmenting paths: no further shortest path can be added without intersecting those selected. The family need not have maximum cardinality, but choosing an arbitrary few paths is insufficient. This blocking property makes all remaining augmenting paths longer after the phase. There are O(√V) phases, V=|L|+|R|; after excluding isolated vertices, the main algorithm costs O(E√V), plus O(V) to handle the original vertices. [Cornell CS 6820: Matchings](https://www.cs.cornell.edu/courses/cs6820/2024fa/handouts/matchings.pdf) explains construction of the blocking family and phase analysis.

## Convert matching into integral flow

Connect source to every left vertex with capacity one, direct original edges L→R with capacity one, and connect right vertices to sink with capacity one. A size-k matching gives k units along source–left–right–sink paths.

Conversely, integral flow selects at most one crossing edge per left/right vertex because boundary capacities are one. Crossing edges carrying one form a matching. Integer-capacity augmenting algorithms preserve integrality, so max flow yields maximum matching. Larger capacities model multiple assignments per person/group, changing the original one-to-one problem.

```note-visualization
{"id":"matching-as-flow","preset":"normal"}
```

## Cardinality and total cost are different objectives

Let costs be A-1:1,A-2:2,B-1:2,B-2:100. Both complete matchings have two pairs. `{A-1,B-2}` costs 101, `{A-2,B-1}` four. Cardinality-only matching contains no criterion preferring the latter.

Assignment requires one job per person while minimizing total cost. Standard square-matrix Hungarian implementations take O(n³). General capacity/cost networks can use [min-cost flow](/en/notes/data-structures-algorithms/min-cost-flow/). Establish sufficient valid pairs before cost optimization; a perfect matching need not exist.

Forbidden pairs should be absent edges where the model allows. A huge matrix cost must exceed every relevant valid solution comparison without overflowing sums; afterwards verify no forbidden pair was selected. A large number does not turn infeasibility into a valid assignment.

```note-visualization
{"id":"min-cost-assignment","preset":"normal"}
```

**Check your understanding:** Which path improves `{A-1}` initially? Why does no directly addable edge not prove optimality? How far apart are the complete cost examples?

**Explanation:** Flip B-1-A-2, replacing A-1 with B-1,A-2. Improvement may require a chain of reassignments even without an edge directly joining two free vertices. Totals 101 and four differ by ninety-seven; equal cardinality hides cost differences. An assignment specification needs both coverage and cost objectives.
