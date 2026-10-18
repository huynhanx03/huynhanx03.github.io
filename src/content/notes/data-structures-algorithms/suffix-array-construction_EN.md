---
title: "Suffix arrays: doubling, LCP, and queries"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/suffix-array-construction"
series: "Advanced DSA"
seriesOrder: 32
tags: ["string", "suffix-array", "lcp", "kasai"]
description: "Build ranks in doubling rounds, compute LCP in linear time, and search a suffix interval."
draft: false
updated: 2026-10-15
---

In banana, suffix ana precedes anana because it ends after their shared ana. Sorting suffixes by reading characters each time repeatedly compares long common prefixes. Doubling replaces previously classified segments with ranks, so each comparison in the next round uses just two numbers.

This follows [suffix structures](/en/notes/data-structures-algorithms/suffix-approximate/). We build the suffix array, compute LCP, and answer queries. Indices start at zero, intervals are half-open, and byte/rune choices must remain consistent with the alphabet order.

## A rank condenses an earlier comparison

Initially rank[i] orders symbol s[i], compressed into nonnegative integers. For banana, a=0,b=1,n=2 gives [1,0,2,0,2,0]. Equal ranks mean equal one-symbol prefixes, not equal whole suffixes.

Suppose ranks correctly classify length-k segments. The length-2k prefix at i has key `(rank[i],rank[i+k])`. Lexicographic order compares its first half before its second, so rank pairs preserve order. Use −1 outside the string, smaller than valid ranks, to put a shorter suffix before an extension of the same prefix.

```go
// Comparison key in round k; the rank beyond the string is -1.
func pair(rank []int, i, k int) (int, int) {
    second := -1
    if i+k < len(rank) { second = rank[i+k] }
    return rank[i], second
}
```

This Go helper makes a key. A comparator actually needs **suffix positions** from sa. sort.Slice passes indices i,j within sa, so call pair(rank,sa[i],k), not pair(rank,i,k). Positions in the sorted container differ from positions in the text.

```note-visualization
{"id":"suffix-doubling","preset":"normal"}
```

## Work through banana's first two rounds

At k=1, keys at positions 0..5 are `(1,0),(0,2),(2,0),(0,2),(2,0),(0,−1)`. Sorting with index-order ties gives [5,1,3,0,2,4]. New ranks are [2,1,3,1,3,0]. Positions 1 and 3 remain equal because both start an; their final order is not yet established.

At k=2, use these as the **old ranks for the entire round**. Keys become `(2,3),(1,1),(3,3),(1,0),(3,−1),(0,−1)`. Sorting gives [5,3,1,0,4,2]. All groups differ, so stop; final ranks by original position are [3,2,5,1,4,0].

After sorting, compare neighboring keys and assign new classes. Do not overwrite ranks while comparisons or class assignment still need old keys: otherwise they no longer describe the same segment length. Fill a new array, then replace the old one.

After each round, ranks correctly order length-2k prefixes including truncated endings. Once the length covers n or ranks are all distinct, this suffices for complete suffix order. Empty input has an empty SA; a single symbol is already distinct and needs no next-pair access.

### Sorting determines the time bound

There are O(log n) doubling rounds. Comparison sorting costs O(n log n) per round with O(1) comparisons, giving O(n log²n) time and O(n) space. For O(n log n), use stable counting/radix sorts on compressed integer ranks: second component first, then first component, in O(n) per round. Map sentinel −1 into a suitable nonnegative index range.

Thus naming doubling does not justify O(n log n) for an implementation using sort.Slice every round. Ignoring the sort can omit a logarithmic factor.

## LCP reuses a shared prefix after removing one character

Define lcp[r] as the common-prefix length of suffix sa[r] and sa[r−1], with lcp[0]=0. For banana, LCP is [0,1,3,0,0,2].

Kasai constructs position[i], the suffix rank, and scans i in **original text order**, retaining reusable length h. If suffix i shares h symbols with its predecessor, removing each first symbol leaves two suffixes sharing at least h−1. The predecessor of i+1 may differ from the old predecessor plus one, but suffixes sharing a prefix form a contiguous interval: a closer predecessor shares at least that prefix too. This supplies the crucial h−1 lower bound.

```note-visualization
{"id":"kasai-lcp","preset":"normal"}
```

For position[i]>0, set j=sa[position[i]−1], continue comparing from h, save the LCP, then decrement h if positive for i+1. At rank zero there is no predecessor; reset h=0. Each iteration decreases h by at most one, and total increases are bounded by scanned characters, giving O(n) time. position and LCP use O(n) memory.

The reused value is a **lower bound**, not a claim that every next LCP equals h−1. Continue extending it; omitting that comparison loses longer matches.

## Answering questions with SA and LCP

Maximum LCP gives the longest repeated substring. If X occurs at two suffixes, all suffixes starting X lie in one interval, so some adjacent pair has LCP at least |X|. Conversely, an LCP of k proves two occurrences of a length-k substring. These directions explain why adjacent pairs suffice instead of O(n²) pairs.

Banana's maximum 3 gives ana at positions 3 and 1; they may overlap. Nonoverlapping repeats require a positional condition. Counting distinct contents is another query, not the maximum LCP.

For a pattern p, binary-search the two boundaries of suffixes with prefix p. A basic comparator reads at most |p| symbols per step, giving O(|p|log n), plus O(occ) output. This excludes index construction. An empty pattern often matches n+1 boundaries, but this SA stores only n nonempty suffixes; handle it separately rather than missing the final boundary.

## Try these

1. Why does position 5's first-round pair contain −1 for banana?
2. What is its adjacent LCP array and longest repeated substring?
3. Is doubling with sort.Slice every round O(n log n)?

**Answers:** (1) There is no second symbol; the sentinel puts a before ana/anana. (2) [0,1,3,0,0,2], yielding ana of length 3. (3) No: O(log n) rounds times O(n log n) sorting gives O(n log²n). Counting/radix sorting ranks yields O(n log n).

## References

[Kasai et al. — Linear-Time Longest-Common-Prefix Computation in Suffix Arrays](https://www.ime.usp.br/~cris/aulas/19_1_6957/KasaiLAAP2001-LCP.pdf) explains linear LCP computation. [VNOI — Suffix Array](https://wiki.vnoi.info/algo/string/suffix-array) presents construction methods for practice.
