---
title: "Probability for algorithms: events and expectation"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/probability-for-algorithms"
series: "Math for Algorithms"
seriesOrder: 8
tags: ["probability", "expectation", "conditional-probability", "randomized-algorithms"]
description: "Sample spaces, conditional probability, Bayes, and linearity of expectation for algorithm analysis."
draft: false
updated: 2026-10-15
---

A hash table lookup is described as expected O(1). That does not mean every lookup takes the same amount of work. Expectation needs a specified random source and distribution; otherwise, it is unclear what is being averaged.

This lesson begins with counts that can be checked by hand, then connects them to algorithm costs. It assumes fractions and basic counting. Formulas use discrete random variables; finite examples avoid questions about convergence of infinite expectations.

## The sample space must describe elementary outcomes

Two independent fair dice produce 36 equally likely ordered pairs. Six pairs sum to 7: (1,6),(2,5),...,(6,1), giving probability 1/6. Treating the eleven sums 2..12 as equally likely invents a different, incorrect distribution: more pairs produce 7 than 2.

An **event** is a set of elementary outcomes. If they are equally likely, `P(A)=|A|/|Ω|`; otherwise sum the individual probability weights in A. Choosing a random permutation usually means every permutation is equally likely. Saying each element independently appears specifies a different model and also needs an appearance probability.

```note-visualization
{"id":"probability-outcomes","preset":"normal"}
```

## Disjointness and independence answer different questions

A∪B means at least one event occurs. Adding P(A)+P(B) counts the intersection twice, so `P(A∪B)=P(A)+P(B)−P(A∩B)`.

Disjoint events cannot occur together. Independent events satisfy `P(A∩B)=P(A)P(B)`: learning one occurs does not change the other's probability where the conditional probabilities are defined. On one die, A={roll 1}, B={roll 2} are disjoint but not independent: their intersection has probability zero, while the product is 1/36. Two positive-probability disjoint events cannot be independent.

## Conditioning changes which outcomes remain

`P(A|B)=P(A∩B)/P(B)` for P(B)>0. Retain only outcomes in B and renormalize their probability to 1. Writing the intersection in both directions gives Bayes:

`P(A|B)=P(B|A)P(A)/P(B)`.

Suppose a hypothetical defect check covers 10,000 cases. One hundred actually have the defect, and the check detects 90% of those. Of the 9,900 nondefective cases, 5% give false alarms. Expected positives are 90 true and 495 false. Among positive results, the fraction actually defective is `90/(90+495)≈15.38%`, despite 90% detection among defective cases.

```note-visualization
{"id":"conditional-probability","preset":"normal"}
```

These numbers condition in opposite directions. The 1% base rate strongly affects the answer; discarding it and substituting P(positive|defect) for P(defect|positive) is incorrect. This is a mathematical example, not measured performance of a particular tool.

## Expectations add even when the parts depend on each other

For X, `E[X]=Σ_x xP(X=x)`. This weighted average need not be a possible individual outcome: three fair coin tosses have an expected 1.5 heads, although no trial contains half a head.

An indicator I_A is 1 when A occurs and 0 otherwise. Since `E[I_A]=P(A)`, a sum of indicators satisfies `E[X]=ΣP(A_i)`. Linearity `E[X+Y]=E[X]+E[Y]` does not require independence: distribute addition within the weighted sum over elementary outcomes.

For n fair tosses, each head indicator has expectation 1/2, so the total is n/2. Even dependent tosses retain that expectation if each individual marginal probability is 1/2. Their distribution and variability may differ greatly; linearity does not justify multiplying probabilities or asserting concentration.

```note-visualization
{"id":"expectation","preset":"normal"}
```

## Read an expected algorithm bound correctly

Hash tables usually have good expected costs under assumptions about hash distribution and table load. Collisions can make one lookup slower; adversarial data against a fixed hash function may violate the model used in analysis.

Random-pivot quicksort takes expected O(n log n) time on a fixed input under the appropriate pivot-selection model, but a sequence of unbalanced choices can still cost O(n²). An expectation is neither a worst-case bound nor a specific probability of a slow run. State whether averaging is over the algorithm's random choices or an input distribution.

## Representing probabilities in programs

For exact answers, retain numerator/denominator fractions and reduce with gcd; large values may need big integers. Float64 supports approximations but introduces accumulated error and comparison issues. Displaying 0.1 does not prove an exact 1/10 was used throughout.

Some problems request a probability modulo prime p. If the denominator is invertible, represent a/b as `a·b⁻¹ mod p`. If b is divisible by p, that formula cannot be applied directly. A residue such as p−1 is an algebraic representation, not a real probability outside [0,1].

Monte Carlo simulation estimates by repeated samples from the intended distribution. Choose a suitable generator and sampling method and assess error against sample count and model. A few thousand trials close to theory are not a proof of an exact probability. Analysis assumptions must match how the program samples.

## Check your understanding

1. Why is a dice sum of 7 assigned probability 1/6 rather than 1/11?
2. What is the expected heads count for three fair tosses? Must all eight sequences be listed?
3. Why are two positive-probability disjoint events not independent?

**Answers:** (1) Six of 36 equally likely pairs qualify; the sums are not equally likely. (2) 3/2, the sum of three indicator expectations; enumeration is unnecessary. (3) Their intersection is zero but their product is positive. Do not turn linearity of expectation into an independence assumption absent from the problem.

## Further reading

[VNOI — combinatorics and probability index](https://wiki.vnoi.info/vi/articles) offers exercises. [Rolling hash](/en/notes/data-structures-algorithms/rolling-hash/) illustrates the difference between fast computation, collision risk, and result correctness.
