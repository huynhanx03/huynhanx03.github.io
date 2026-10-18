---
title: "Combinatorics and inclusion–exclusion: counting without enumeration"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/combinatorics-inclusion-exclusion"
series: "Math for Algorithms"
seriesOrder: 7
tags: ["combinatorics", "permutation", "combination", "inclusion-exclusion"]
description: "Derive ordered and unordered counts, then correct overlapping counts with alternating intersections."
draft: false
updated: 2026-10-15
---

Five people supply twenty ways to choose a leader and deputy, but only ten ways to choose an equal-role pair. Before choosing a formula, decide whether changing order creates a different outcome.

Combinatorics avoids enumerating millions of configurations, but formulas depend on the model. We move from ordered to unordered choices, then handle objects counted repeatedly.

## Add disjoint branches, multiply sequential choices

Add counts when choosing between disjoint alternatives. For two stages with exactly b continuations for every first-stage choice, multiply the first count by b. If continuation counts vary, add the respective counts instead.

Two distinct offices among five people give five choices then four, or twenty. The stages depend on not reusing a person, yet multiplication holds because every first choice has four continuations. The counting product rule does not require probabilistic independence.

## Why divide combinations by k!?

There are n! orders of n distinct objects. Ordered selections of k without repetition give `n!/(n−k)!`. Ignoring order makes each k-object group occur k! times, so

`C(n,k)=n!/(k!(n−k)!)`.

For two of five, (An,Bình) and (Bình,An) represent one group, giving twenty divided by two equals ten. Distinct offices instead make them genuinely different; division would lose outcomes.

```note-visualization
{"id":"permutations-count","preset":"normal"}
```

```note-visualization
{"id":"combinations-count","preset":"normal"}
```

With repeated types, define distinguishability too. Temporarily labeling A₁,A₂ in AAB gives six orders; dropping labels counts each value sequence twice, leaving AAB,ABA,BAA. Groups of sizes a₁,…,a_t generalize to `n!/(a₁!...a_t!)` distinct sequences.

Repeated/nonrepeated choices, distinguishable/indistinguishable objects, and labeled/unlabeled boxes are different models. Check a tiny case by listing configurations and asking whether the formula merges exactly those considered equivalent.

## Inclusion–exclusion repairs each object's multiplicity

In 1..100, fifty integers are divisible by two and thirty-three by three. Their sum eighty-three counts multiples of six twice; subtract sixteen to get sixty-seven divisible by at least one.

This is `|A∪B|=|A|+|B|−|A∩B|`. For k sets, add single sets, subtract pair intersections, add triple intersections, and continue:

`|∪A_i|=Σ_{∅≠S⊆[k]}(−1)^(|S|+1)|∩_{i∈S}A_i|`.

An element in exactly t sets receives coefficient `C(t,1)−C(t,2)+...=1` by (1−1)^t, so it is counted once regardless of overlap. This explains alternating signs instead of memorizing separate patterns.

```note-visualization
{"id":"inclusion-exclusion","preset":"normal"}
```

Intersecting divisibility sets for d_i requires multiples of their lcm. Distinct primes have product lcm, but four and six have lcm twelve rather than twenty-four. Wrong intersection denominators defeat an otherwise correct-looking formula.

To count elements in none, subtract the union from the universe. In 1..60, integers divisible by neither two nor three number `60−30−20+10=20`. State “not divisible by two **and** not divisible by three” explicitly to avoid ambiguous natural-language OR.

Directly handling k sets considers 2^k−1 intersections, suitable for small k or specially grouped intersections. Include intersection-computation costs and lcm overflow. If lcm exceeds N, that intersection has no multiples in 1..N.

## When a closed form is inconvenient, divide into two cases

To count C(n,k), consider the last element: selecting it leaves C(n−1,k−1); excluding it leaves C(n−1,k). Disjoint exhaustive cases give

`C(n,k)=C(n−1,k−1)+C(n−1,k)`.

Initialize C(n,0)=1 and C(n,k)=0 for k>n. DP through n,k costs O(nk); one row takes O(k) space if updated from larger k downward to avoid reusing this row's newly written values. Only addition is needed, so composite moduli work without factorial inverses, although sums may overflow before reduction.

The n=4 row is 1,4,6,4,1; n=5,k=2 becomes 4+6=10. This recounts five-choose-two through case splitting rather than factorial division.

## Try before reading

1. How many four-bit strings have at least one one?
2. Count 1..60 divisible by neither two nor three.
3. How many distinct arrangements does AABB have?

**Answers:** (1) Of 2⁴ strings, exclude only 0000, leaving fifteen; complement counting avoids separate one-count cases. (2) `60−30−20+10=20`, with multiples of six in the intersection. (3) `4!/(2!2!)=6`; swapping within either identical group creates no new sequence. Individually labeled objects would change the answer.

## Continue reading

[VNOI — inclusion–exclusion](https://wiki.vnoi.info/algo/algebra/pie) gives counting applications. [Modular combinations, Lucas, and Wilson](/en/notes/data-structures-algorithms/binomial-lucas-wilson/) explains when factorial division fails modulo a number; [probability](/en/notes/data-structures-algorithms/probability-for-algorithms/) uses counts in equally likely distributions.
