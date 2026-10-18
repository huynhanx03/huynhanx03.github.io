---
title: "Backtracking: build solutions and reject invalid branches early"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/backtracking"
series: "DSA Foundations"
seriesOrder: 14
tags: ["backtracking", "pruning", "n-queens", "invariant"]
description: "Use N-queens to design search states, legality checks, and restoration after recursive choices."
draft: false
updated: 2026-10-15
---

While placing queens, a new queen already shares a column with an earlier one. Completing the remaining rows cannot remove that conflict. Backtracking exploits such observations to search among partially constructed solutions.

Each search-tree node represents a decision sequence. Choose a step, update state, recurse, then restore state before another choice. Unlike generating everything and filtering afterwards, backtracking can discard entire subtrees. Pruning must establish that no valid completion exists; a choice merely looking unpromising is insufficient.

## Build the board row by row

N-queens places n queens on an n×n board without shared rows, columns, or diagonals. Placing exactly one per row automatically handles rows. At row, choose a column compatible with earlier rows.

Cells share diagonals when row−col or row+col matches. Offset the possibly negative difference by n−1. For valid row/col, both `row-col+n-1` and `row+col` lie in [0,2n−2]. Three boolean arrays therefore check column/diagonal use in O(1) per attempted placement.

```go
func CountQueens(n int) int {
    col := make([]bool, n)
    diag1, diag2 := make([]bool, 2*n-1), make([]bool, 2*n-1)
    count := 0
    var place func(int)
    place = func(row int) {
        if row == n { count++; return }
        for c := 0; c < n; c++ {
            d1, d2 := row-c+n-1, row+c
            if col[c] || diag1[d1] || diag2[d2] { continue }
            col[c], diag1[d1], diag2[d2] = true, true, true
            place(row+1)
            col[c], diag1[d1], diag2[d2] = false, false, false
        }
    }
    place(0)
    return count
}
```

This complete Go function needs no imports and requires n≥1. At n=0, `2*n-1` is negative and outside the contract. Defining one empty-board placement requires an early special case before allocation. The int counter must also fit the requested solution count. `CountQueens(4)` is expected to return two, counting all placements without merging symmetries.

## Follow a branch to understand restoration

Use zero-based rows/columns. With n=4, try row zero, column zero. Row one cannot use columns zero or one; try two. Row two has no valid column, so return. Clear exactly the marks for (1,2) and try (1,3). That branch also cannot finish, eventually requiring removal of (0,0) before trying column one in row zero.

A later solution has columns `[1,3,0,2]`. Each step passes all three checks. After counting it, return and clear marks to find `[2,0,3,1]`. Forgetting a diagonal mark invents a queen no longer present and can lose solutions.

```note-visualization
{"id":"n-queens","preset":"normal"}
```

Before `place(row)`, exactly one queen occupies every earlier row, none attack each other, and marks correspond exactly to those queens. A legal choice maintains this invariant for the next row. At row==n all rows are complete, justifying the count. Trying every column ensures completeness, and each full placement has exactly one column-choice sequence, avoiding duplicates. Restoration returns state to its pre-attempt form for the next branch.

Arrays and recursion depth both use O(n) space. Distinct columns bound prefixes by partial column permutations; a coarse bound including each n-column trial loop is O(n·n!). Diagonal pruning reduces many actual searches without making the algorithm polynomial.

## A pruning condition must hold for every extension

In subset-sum search with nonnegative numbers, a current sum above target can never fall by adding elements, so pruning is safe. With target five, current sum eight, and a remaining −3, the branch still contains a solution. The original cut depended on nonnegativity; retaining it after removing that assumption is incorrect.

For permutations with duplicates such as `[a,a,b]`, trying both copies of a at one level repeats the same value prefix. Sort and skip equal choices **at the current level**. Banning every further a throughout the tree is wrong: one solution can need both copies at different positions.

Before recursion, identify sufficient state, conditions proving completion impossible, and every changed field requiring restoration. This also explains bugs appearing only after returning from the first branch.

## Change the goal while retaining search structure

Counting needs only a counter. Listing solutions additionally keeps `position[row]=col`; copy it when all rows are placed. Saving only the reused slice can make results share storage overwritten by later branches.

Finding one solution can return bool and stop early. Specify whether early return must restore state for the caller or preserve the successful configuration. Optimization additionally prunes branches unable to improve the incumbent; [branch and bound](/en/notes/data-structures-algorithms/branch-and-bound/) supplies that proof.

**Try it:** Why stop the branch (0,0),(1,2)? What must be copied when saving? Is sum eight always prunable for target five?

**Explanation:** Every column in row two is attacked by an occupied column or diagonal. Copy placement values rather than merely another descriptor of shared slice storage. Eight is prunable only when every extension cannot decrease the sum; −3 disproves it with negative inputs.
