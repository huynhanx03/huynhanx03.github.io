---
title: "Three classic DP patterns: LIS, knapsack, and edit distance"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/dp-classics"
series: "Advanced DSA"
seriesOrder: 4
tags: ["dynamic-programming", "lis", "knapsack", "edit-distance"]
description: "Three different state definitions and how to avoid table-update errors."
draft: false
updated: 2026-10-15
---

These three problems ask different questions: where an increasing subsequence ends, what value fits a capacity, and how many operations transform two string prefixes. All use DP, but their states and update orders follow their own constraints. Read [Dynamic programming](/en/notes/data-structures-algorithms/dynamic-programming/) first if defining a table cell in words is unfamiliar.

## LIS: what matters about the final element?

A subsequence preserves index order without requiring adjacent elements. Let `dp[i]` be the longest strictly increasing subsequence ending **exactly at** `i`. If its preceding element is `j`, then `j<i` and `a[j]<a[i]`. Take `1+max(dp[j])` over valid `j`, or 1 for `a[i]` alone. The answer is `max dp[i]`, not necessarily the final cell; empty input has LIS length 0.

For `[3,1,2,2,4]`, the table is `[1,1,2,2,3]`. The two 2s cannot extend one another under `<`; one solution is `[1,2,4]`. Each cell examines at most `i` predecessors, giving `O(n²)` time and `O(n)` memory. For nondecreasing subsequences, use `<=`; the example's answer becomes 4 with `[1,2,2,4]`.

The `O(n log n)` approach instead keeps `tails[len-1]`: the smallest possible ending value of an increasing subsequence of length `len` in the processed prefix. For `x`, lower-bound the first position `>=x`, replacing it or appending if none exists. A smaller tail loses no continuation: anything that extends the old tail can extend the smaller one. The `tails` values are increasing, permitting binary search.

Input `[2,3,4,1]` ends with `tails=[1,3,4]`. This is not a subsequence of the input because 1 occurs after 3 and 4. Cells may represent different subsequences; only the table length is the answer. To recover an actual subsequence, retain ending indices by length and a predecessor index per element. For the nondecreasing variant, find the first value **greater than** `x` rather than `>=x`, allowing equal values to extend the sequence.

```note-visualization
{"id":"lis-dp","preset":"normal"}
```

## 0/1 knapsack: one round represents one item

Item `i` has nonnegative integer weight `w_i`, value `v_i`, and integer capacity `W>=0`. Each item may be taken at most once without exceeding capacity. `dp[i][c]` is the greatest value using the first `i` items with capacity at most `c`. Either skip the item or take it once if it fits:

`dp[i][c] = max(dp[i-1][c], dp[i-1][c-w_i]+v_i)`.

When choosing no items is permitted, row 0 is zero for every `c`. The recurrence covers both disjoint decisions about the current item. If the requirement is **exact** weight, initialize unreachable weights as infeasible rather than setting every cell to zero as in the at-most-capacity problem.

There are `n(W+1)` cells: `O(n(W+1))` time and memory, usually written `O(nW)` for `W>=1`. This is pseudo-polynomial: encoding `W` takes `O(log(W+1))` bits (at least one bit), so linear dependence on its numeric value is not polynomial in input encoding length.

Compressing to `dp[c]` requires descending `c`. With one item `(w,v)=(2,3)` and `W=4`, ascending iteration sets `dp[2]=3` and then uses that newly updated cell to set `dp[4]=6`, as though two copies existed. Descending iteration computes `dp[4]` from the preceding round's `dp[2]`, obtaining only 3. In unbounded knapsack, repeated use is intentional, so ascending iteration fits that model.

Zero-weight items need care: 0/1 allows adding the value only once per item; unbounded use with positive value makes the optimum unbounded. Identify the variant before reusing an update loop.

```note-visualization
{"id":"knapsack-dp","preset":"normal"}
```

## Edit distance: the final operation on two prefixes

`dp[i][j]` is the fewest operations transforming the first `i` characters of A into the first `j` of B. Insertion, deletion, and substitution each cost 1. An empty target requires deleting everything, so `dp[i][0]=i`; an empty source requires inserting everything, so `dp[0][j]=j`.

If final characters match, retain them and use `dp[i-1][j-1]`. Otherwise the final operation deletes A's character using `dp[i-1][j]`, inserts B's using `dp[i][j-1]`, or substitutes using `dp[i-1][j-1]`; add 1 to the minimum. For `cat→cut`, retain `c`, replace `a` with `u`, and retain `t`, giving distance 1. It cannot be 0 because the strings differ.

| A / B | empty | c | u | t |
| --- | ---: | ---: | ---: | ---: |
| empty | 0 | 1 | 2 | 3 |
| c | 1 | 0 | 1 | 2 |
| a | 2 | 1 | 1 | 2 |
| t | 3 | 2 | 2 | 1 |

Each cell uses the cell above, left, and diagonally above-left, so evaluate rows/columns in increasing order. Time is `O(mn)`, memory `O(mn)`; retaining two rows when only distance is needed uses `O(min(m,n))` by choosing the shorter dimension for a row. Retain enough decisions/table data to output the operation sequence.

For Vietnamese text, define “character”: UTF-8 bytes, runes, and graphemes yield different problems. Byte edits do not correspond to editing one displayed character. Choose the unit and normalize according to the contract before constructing the table.

```note-visualization
{"id":"edit-distance","preset":"normal"}
```

**Check yourself:** What are the strict LIS and nondecreasing lengths for `[3,1,2,2,4]`? When may one weight-2, value-3 item produce value 6 at `W=4`? What does the final `cat→cut` cell establish?

**Explanations:** The lengths are 3 and 4; only the nondecreasing variant joins both 2s. Value 6 is valid with two copies, but an error for one 0/1 item; iteration direction determines reuse within the current round. The final cell is 1 because the recurrence covers all final operations on the complete strings, and a concrete substitution attains that value.
