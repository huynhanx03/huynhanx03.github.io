---
title: "Nim and Sprague–Grundy: understanding winning positions"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/nim-sprague-grundy"
series: "Advanced DSA"
seriesOrder: 35
tags: ["game-theory", "nim", "sprague-grundy", "mex"]
description: "Normal play, the Nim xor invariant, mex values, and independent sums of impartial games."
draft: false
updated: 2026-10-15
---

Three piles contain 3,4,5 stones. A move removes at least one stone from exactly one pile; the player with no legal move loses. Searching the entire move tree is possible, but the state count grows quickly. Nim supplies an xor test; Sprague–Grundy explains when it extends to other games.

We consider alternating two-player games with no randomness, complete information, and normal play: having no move means losing. Grundy theory additionally requires **impartiality**: legal moves from a position do not depend on the player's identity. The direct DP here uses a finite acyclic state graph. Draws, cycles, or a rule that the last player to move loses require different analysis.

## Winning means handing the opponent a losing position

A position with no moves loses. A position wins if at least one move leads to a losing position for the next player; it loses if every move leads to a winning one. This works backward from the end of a game and assumes optimal play, rather than promising that an uninformed player always chooses correctly.

On an acyclic graph, compute from terminal states or use recursive memoization. With cycles, recursive calls need not reach a base case, and winning/losing labels alone may not describe a game allowing draws.

## Nim: why is xor zero losing?

Set `x=a₁ xor ... xor a_k`. Xor is zero when every bit column contains an even number of ones. For 3,4,5, the binary values `011,100,101` xor to 010, or 2.

If x=0, reducing one pile from a to b<a makes the new xor `a xor b`, which cannot be zero for different values. Thus no move takes a zero-xor position to another zero-xor position.

If x≠0, take its highest set bit. Some pile a has that bit set. Set `b=a xor x`. Higher bits stay unchanged and this bit changes from 1 to 0, so b<a: a legal removal. The new xor is `x xor a xor b=0`.

```note-visualization
{"id":"nim-xor","preset":"normal"}
```

For [3,4,5], choose a=3,b=3 xor 2=1. Removing two stones from the first pile leaves [1,4,5] with xor zero. Thereafter, whenever the opponent makes it nonzero, we can restore zero. Every move decreases the total stones, so the game ends with the opponent facing empty piles.

```note-visualization
{"id":"nim-winning-move","preset":"normal"}
```

```go
func NimWinning(piles []uint64) bool {
    var x uint64
    for _, pile := range piles { x ^= pile }
    return x != 0
}
```

This Go function returns whether a winning move exists, not the move itself; the highest-bit construction provides it. Time is O(k), memory O(1). All-empty piles give xor zero and a first-player loss as required. If the rules allow only one or two stones per move, b=a xor x may be illegal, so using raw pile sizes in Nim's formula is unjustified.

## Grundy values retain more than a winning/losing label

For a position s, define `g(s)=mex{g(t)}` over its legal next positions. Mex is the smallest absent nonnegative integer: mex{0,2,2}=1 and mex{1,2}=0. Duplicate values do not change it.

A terminal position has the empty set and g=0. When g=0, no move reaches g=0; when g≠0, zero must appear among the options, giving a move to a losing position. Winning therefore corresponds to g≠0. Values above 1 are needed to combine subgames; one winning/losing bit discards that information.

For a pile allowing removal of one or two:

| Stones n | Grundy values of options | g(n) |
| --- | --- | --- |
| 0 | Empty set | 0 |
| 1 | {0} | 1 |
| 2 | {1,0} | 2 |
| 3 | {2,1} | 0 |
| 4 | {0,2} | 1 |

The two previous positions always supply the other two values in {0,1,2}, proving by induction that g(n)=n mod 3. This comes from the actual legal moves, rather than treating n as a Nim pile under different rules.

```note-visualization
{"id":"grundy-mex","preset":"normal"}
```

## When may subgames be combined by xor?

The Sprague–Grundy theorem says the sum of independent impartial games under normal play has Grundy value equal to the xor of their values. A sum means a move changes exactly one subgame; all others stay unchanged. Drawing several piles on a screen does not establish independence.

Two piles of sizes 4 and 5 with one-or-two removal have values 1 and 2, so xor 3 and a winning position. A move making the xor zero must still correspond to a legal edge in the original game. If a move changes both piles, or allowed removals depend on a previously selected pile, this sum model cannot be applied directly.

Memoization avoids recomputing states reached along several paths. On a finite graph, efficient mex work depends on outgoing edges and the relevant value range; evaluating a state with many moves is not automatically O(1). The feasible number of states determines whether direct DP is practical.

## Check your reasoning

1. Find a winning move for [3,4,5] and verify its xor.
2. List g(0..6) for one-or-two removal.
3. Two independent games each have g=1. Does their sum win? Which rule changes would invalidate the conclusion?

**Answers:** (1) Reduce 3 to 1; 1 xor 4 xor 5=0. (2) 0,1,2,0,1,2,0. (3) Their xor is zero, so the sum loses under normal play with one-component moves. Simultaneous moves or misère rules need another analysis. Changing rules can change the answer for the same visible position.

## References

[MIT — Theory of impartial games](https://ocw.mit.edu/courses/es-268-the-mathematics-in-toys-and-games-spring-2010/a56c2f19070acfc62af446e3d7ddc4b4_MITES_268S10_Ses1_slides.pdf) presents the assumptions of Sprague–Grundy. [Minimax and alpha–beta](/en/notes/data-structures-algorithms/alpha-beta-pruning/) considers adversarial search using evaluation values.
