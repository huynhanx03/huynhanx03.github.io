---
title: "Minimax and alpha–beta: choosing moves without exploring every branch"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/alpha-beta-pruning"
series: "Advanced DSA"
seriesOrder: 36
tags: ["game-theory", "minimax", "alpha-beta", "search"]
description: "Derive safe game-tree pruning from the alternatives already bounded by alpha and beta."
draft: false
updated: 2026-10-15
---

Max has two moves. The left branch lets opponent Min force the score to five. On the right, one examined Min choice scores three. Must every remaining right-side choice be examined? No: Min can already hold that branch to at most three, so Max prefers the known five.

Alpha–beta formalizes this argument for a minimax tree. It removes work that cannot change an ancestor's decision while preserving the root value at the chosen depth. This differs from discarding a branch based on an unproved prediction.

## Define a node's value first

Assume two players, complete information, no randomness, and zero-sum scores: Max wants larger, Min smaller. Evaluate every leaf from Max's perspective. A Max node takes its maximum child value; a Min node its minimum. Searching a finite tree to terminal states gives the outcome Max can guarantee under optimal play.

A Max root with two Min children having leaves [5,8] and [3,9] receives child values five and three, so chooses five. Leaf nine alone does not establish that the right branch is good: Min can avoid it.

```note-visualization
{"id":"minimax","preset":"normal"}
```

A full branching-b, depth-d tree contains O(b^d) nodes. Many games require depth limits and heuristic evaluation rather than terminal search. Minimax then optimizes that evaluated tree, without guaranteeing globally optimal play in the full game.

## Alpha and beta remember ancestors' alternatives

Alpha is a lower bound Max can guarantee through an already considered choice; beta an upper bound Min can enforce, both in Max's score units. They carry information down the search path rather than necessarily being exact values of the current node.

After the left branch, root alpha is five. At the right Min node, seeing three lowers beta to three. Whether the remaining leaf is nine or a hundred, Min can still choose three or less; the branch cannot beat Max's known five. Once alpha≥beta, unexplored work cannot improve the ancestor's decision and may be pruned.

```note-visualization
{"id":"alpha-beta","preset":"normal"}
```

Reordering the right leaves to nine then three prevents pruning after nine, which could still beat five. Only three provides a sufficient bound. Ordering changes the work, not the correct minimax value.

## Carry bounds through DFS

```go
func AlphaBeta(node State, depth int, alpha, beta int) int {
    if depth == 0 || node.Terminal() { return node.Evaluate() }
    if node.MaxTurn() {
        best := -inf
        for _, child := range node.Moves() {
            best = max(best, AlphaBeta(child, depth-1, alpha, beta))
            alpha = max(alpha, best)
            if alpha >= beta { break }
        }
        return best
    }
    best := inf
    for _, child := range node.Moves() {
        best = min(best, AlphaBeta(child, depth-1, alpha, beta))
        beta = min(beta, best)
        if alpha >= beta { break }
    }
    return best
}
```

This is Go-style pseudocode: the game defines State, Terminal, Evaluate, Moves, MaxTurn, and inf. Call root with nonnegative depth and alpha=−inf,beta=inf; **every valid score must lie strictly between −inf and inf**. Bounding only the maximum score is insufficient when negative scores have magnitude greater than inf: the initial best of −inf could exceed every real child value. Every nonterminal state must have at least one move; losing, drawing, or passing when no moves exist must be represented by the game model. Use built-in max/min in supporting Go versions or equivalent helpers.

At Max, best and alpha rise with better children; at Min, best and beta fall. Test pruning after updating because the new child may make bounds meet. A pruned call may provide only a sufficient bound rather than an exact subtree value. The essential guarantee is the final full-window root value, not exact evaluation of every subtree.

If a move grants another turn, MaxTurn must reflect the next state rather than blindly alternating every depth. Leaf scores use one perspective. Dice require expectation nodes such as expectiminimax; replacing chance with min changes the problem.

## How much work is saved?

Trying strong moves first tightens bounds early. Favorable ordering on a regular tree can approach O(b^(d/2)) work, while worst-case remains O(b^d). These count nodes without erasing move generation, state copying, or evaluation costs.

Iterative deepening searches successive depths and uses the previous best move to order the next search. Transposition tables help when multiple paths reach one state, but entries need sufficient depth and must distinguish exact scores from lower/upper bounds returned after pruning. Treating a bound as exact can produce wrong results even with correct alpha–beta logic.

Repeated states and draw rules belong in the model; memoization cannot ignore history when repetition rules depend on it. Depth/evaluation choices also produce horizon effects: a bad consequence just beyond the cutoff may be invisible. Alpha–beta does not repair that modeling error.

## Predict before reading

1. With Min branches [5,8] and [3,9] under Max, left first, which leaf is skipped?
2. With right branch [9,3], why cannot three be skipped after seeing nine?
3. Does pruning at alpha≥beta change root value? Is stopping at depth zero equivalent?

**Answers:** (1) Left establishes alpha five; right's three lowers beta to three, so skip nine. (2) Min's current upper bound nine does not establish whether it can fall below five; continue. (3) Alpha–beta preserves minimax of the selected tree. A depth limit replaces terminal outcomes with Evaluate and changes the evaluated problem. These are different reasons for stopping.

## References

[UC Berkeley CS188 — Minimax](https://inst.eecs.berkeley.edu/~cs188/textbook/games/minimax.html) and [Games: Minimax and Alpha–Beta](https://inst.eecs.berkeley.edu/~cs188/sp24/assets/lectures/cs188-sp24-lec05.pdf) explain bounds and move ordering. For finite impartial games decomposable into independent sums, see [Nim and Sprague–Grundy](/en/notes/data-structures-algorithms/nim-sprague-grundy/) for stronger invariants that can avoid tree search.
