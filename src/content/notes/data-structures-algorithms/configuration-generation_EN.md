---
title: "Ordered generation: bit strings, subsets, and permutations"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/configuration-generation"
series: "DSA Foundations"
seriesOrder: 13
tags: ["enumeration", "subsets", "permutations", "combinatorics"]
description: "Enumerate every configuration exactly once and account for unavoidable output-size costs."
draft: false
updated: 2026-10-15
---

Three two-state switches allow listing every on/off configuration. As switch count grows, an improvised list risks omissions and duplicates. Configuration generation needs a rule producing every valid object exactly once, in an agreed order, with a clear end condition.

We represent configurations as bit strings, index lists, and permutations, following how one state produces its successor. Arrays/slices, loops, and recursion are prerequisites; search optimization is not yet needed.

## Three switches become a binary counter

For n=3, bit-string lexicographic order is `000,001,010,011,100,101,110,111`. Moving 011 to 100 resets the exhausted trailing ones to zero and increments the zero before them. This is binary addition by one.

Generally start with all zeros. Find the last zero, change it to one, and reset everything right of it. The all-one suffix cannot increase with its prefix fixed, so that zero is the rightmost position that must change. Resetting the suffix creates the smallest larger configuration. All ones means no incrementable position and termination.

There are 2^n configurations, one of two independent choices at each position. A machine integer can count zero through 2^n−1 only when it fits; beyond its width, use a bit slice or another representation rather than assuming shifts fit. Printing/copying an entire bit string costs Θ(n), giving Θ(n2^n) output work. No algorithm prints this complete list in polynomial time in n.

```note-visualization
{"id":"binary-configurations","preset":"normal"}
```

## A subset interprets a decision sequence

For index set {0,1,2}, bit i says whether index i is selected. The bijection between subsets and bit strings proves completeness and uniqueness. Another implementation makes exclude/include decisions successively without an integer counter:

```go
func VisitSubsets(n int, visit func([]int)) {
    chosen := make([]int, 0, n)
    var walk func(int)
    walk = func(i int) {
        if i == n {
            visit(append([]int(nil), chosen...))
            return
        }
        walk(i + 1) // do not select i
        chosen = append(chosen, i)
        walk(i + 1) // select i
        chosen = chosen[:len(chosen)-1]
    }
    walk(0)
}
```

This is a Go function declaration requiring n≥0 and a valid visit callback. Calling `VisitSubsets(2,func(s []int){fmt.Println(s)})` with fmt imported is expected to print `[]`, `[1]`, `[0]`, `[0 1]`. Index zero is considered first but its exclusion branch first; this is not ordinary lexicographic order of index lists.

Before walk(i), chosen contains exactly selected indices below i. The two branches partition all possibilities by whether i is selected. Shortening chosen after inclusion restores its previous decision state. The callback receives a copy because subsequent branches reuse chosen's storage; retained results stay independent. At n=0, the callback still receives the empty subset once.

For source `[a,a,b]`, choosing position zero differs from choosing one despite identical value a, giving eight index subsets. Distinct value selections retaining multiplicity instead give `∅,{a},{a,a},{b},{a,b},{a,a,b}`. Mathematical sets discarding multiplicity give only `∅,{a},{b},{a,b}`. Define output equivalence before deduplicating.

## Increase a permutation by the smallest necessary change

n distinct items have n! permutations. Start sorted to generate lexicographically. For `[1,3,2]`, decreasing suffix `[3,2]` cannot increase merely by rearrangement. Increase one by swapping with the smallest larger right-side value, two, then minimize the suffix to obtain `[2,1,3]`.

Generally find the rightmost i with a[i]<a[i+1]. The following suffix is nonincreasing: adjacent elements may be equal. Scan backward for the first value greater than a[i], swap, then reverse the suffix. This changes the rightmost possible prefix position, increases it minimally, and minimizes its suffix, skipping no intermediate permutation. If no i exists, the nonincreasing sequence is last.

One step is worst-case O(n), also the cost of printing a complete permutation. With duplicates, sorted initialization and strict comparisons visit distinct value permutations instead of treating equal copies as different objects.

```note-visualization
{"id":"next-permutation","preset":"normal"}
```

## Generate only combinations of exactly k elements

Avoid producing all 2^n subsets and filtering for size k. Keep `c[0]<...<c[k−1]`, initially `[0,1,...,k−1]`. Position i cannot exceed n−k+i or insufficient room remains afterward. Find the rightmost incrementable position, increase it once, and reset its suffix to the smallest consecutive values.

For n=5,k=3, after `[0,1,4]`, four cannot rise, so increment one to two and set the last position to three, yielding `[0,2,3]`. There are C(n,k) results, each storing/printing k indices. k=0 has one empty combination; k<0 or k>n has none.

## Check your reasoning

**1.** What follows 1011? **2.** What follows `[1,3,2]` and `[3,2,1]`? **3.** Why cannot every subset be listed quickly for large n?

**Explanation:** 1011 becomes 1100 by incrementing its last zero and clearing the suffix. `[1,3,2]` becomes `[2,1,3]`; `[3,2,1]` is final, with no larger successor. Subsets already number 2^n; full length-n indicator strings require Θ(n2^n) characters. Representation changes per-result costs without removing the number of results.

When only some configurations can be valid, [backtracking](/en/notes/data-structures-algorithms/backtracking/) can discard a branch before completing every configuration.
