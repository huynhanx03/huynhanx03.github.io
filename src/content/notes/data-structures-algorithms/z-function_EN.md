---
title: "Z-function: how far does each position match the prefix?"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/z-function"
series: "Advanced DSA"
seriesOrder: 29
tags: ["string", "z-function", "pattern-matching"]
description: "Reuse a known prefix-match box to compute Z in linear time and find every pattern occurrence."
draft: false
updated: 2026-10-15
---

At position 2 of ababa, the suffix starts aba, matching three symbols from the beginning. Position 4 has only one a left, matching one. The Z-function records this answer at every position without restarting comparisons each time.

Set Z[0]=0. For i>0, Z[i] is the longest prefix length matching a substring starting at i. Go code indices are byte offsets. First see how a known matching interval supplies information inside it.

## A match box contains reusable information

Maintain [l,r) such that s[l:r] equals the length-(r−l) prefix, with the farthest known right endpoint. For i inside, s[i] corresponds to prefix position i−l. Reuse Z[i−l], but only up to r.

Three cases matter:

- i≥r: no box information applies; start from zero.
- i<r and Z[i−l]<r−i: the known mismatch lies inside the box, so the copied value is complete.
- i<r and Z[i−l]≥r−i: at least r−i symbols match, but nothing beyond r is known; initialize to r−i and extend.

Taking the minimum confines the claim to proved information. Copying a value past r skips unexamined characters and can report a false match.

```note-visualization
{"id":"z-box","preset":"normal"}
```

## Follow a scan

For ababa, i=1 has b≠a, so Z[1]=0. At i=2, aba matches through the end, giving Z[2]=3 and box [2,5). At i=3, the corresponding position 1 has Z[1]=0, below the two remaining box symbols, so zero is already known. At i=4, corresponding Z[2]=3 is clipped to one remaining symbol; the string ends there. The result is [0,0,3,0,1].

```go
func ZFunction(s string) []int {
    z := make([]int, len(s))
    l, r := 0, 0
    for i := 1; i < len(s); i++ {
        if i < r {
            z[i] = z[i-l]
            if z[i] > r-i { z[i] = r-i }
        }
        for i+z[i] < len(s) && s[z[i]] == s[i+z[i]] { z[i]++ }
        if i+z[i] > r { l, r = i, i+z[i] }
    }
    return z
}
```

This independent function needs no imports; empty input returns an empty table. Extension checks i+z[i] remains in range. A farther match updates l=i,r=i+z[i]. Since r is exclusive, remaining box length is r−i rather than r−i+1.

For aaaa, i=1 extends to the end, setting [1,4); later values follow as 2 and 1. Result [0,3,2,1] does not mean 3+2+1 fresh successful comparisons occurred. Interior steps reuse proved work.

### Why is the total linear?

A copied value strictly shorter than the remaining box ends at a known mismatch; the next comparison fails rather than launching a long interior extension. Fresh successes begin at or beyond the right boundary and move it right. R never moves left or exceeds n, so these successes total O(n). Each position contributes at most one stopping mismatch, also O(n).

Time is therefore O(n), memory O(n). The proof counts aggregate boundary progress, rather than assuming the while usually runs little. For UTF-8, n counts bytes; code-point or grapheme semantics require a consistently chosen symbol sequence first.

## Put the pattern at the beginning to find it

Build pattern+delimiter+text, with a delimiter absent from both. Z values in the text region measure agreement with the pattern without confusing the boundary. For aba in ababa, use aba#ababa, whose text starts at 4. Positions 4 and 6 have Z≥3 and correspond to text offsets 0 and 2.

```note-visualization
{"id":"z-pattern","preset":"normal"}
```

Convert combined index i by subtracting len(pattern)+1. Building and computing take O(n+m) time and memory. Empty patterns need a separate convention; applying Z≥0 mechanically can omit a boundary not stored in the combined sequence.

Arbitrary bytes may contain every possible delimiter byte. Use integer symbols with sentinel 256 outside 0..255, or a separate pattern/text implementation. Choosing # when input can contain it invalidates the proof's assumption.

## Z and prefix function store information in opposite directions

KMP stores the border of the prefix **ending at i**; Z stores agreement with the prefix **starting at i**. Both support O(n+m) matching, but questions about many positions matching the start often fit Z naturally.

For example, p is a period under s[i]=s[i−p] for i≥p when Z[p]≥n−p. If the string must be an integer number of length-p blocks, also require p divides n. Having a period differs from repeating whole blocks exactly.

## Try these

1. Compute Z for ababa and explain how the box determines Z[3]=0.
2. For aaaa, what remains after processing i=1?
3. Convert combined positions 4 and 6 in aba#ababa to text offsets.

**Answers:** (1) [0,0,3,0,1]; corresponding position i−l=1 has a mismatch inside the box. (2) The farthest box stays [1,4), with Z[2]=2,Z[3]=1. (3) Subtract 4 to obtain 0,2. A different separator still needs its actual length counted in the chosen symbol unit.

## Further reading

[VNOI — Z-function](https://wiki.vnoi.info/algo/string/z-algo) provides box exercises. [KMP](/en/notes/data-structures-algorithms/string-matching/) offers a comparison with prefix-function state and overlapping matches.
