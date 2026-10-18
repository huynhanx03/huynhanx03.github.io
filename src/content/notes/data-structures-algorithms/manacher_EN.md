---
title: "Manacher: palindromes around every center in O(n)"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/manacher"
series: "Advanced DSA"
seriesOrder: 30
tags: ["string", "palindrome", "manacher"]
description: "Use symmetry of the rightmost known palindrome to avoid repeating center expansion."
draft: false
updated: 2026-10-15
---

In an all-a string, expanding one center can reach almost both ends. Expanding the next repeats many comparisons, totaling O(n²) even when the question only asks for the longest palindrome at each center.

Manacher uses symmetry inside a known palindrome to avoid that repeated work. It still visits every center, but new expansion occurs only at the boundary of what is established. Two tables handle odd/even centers here without inserting separators into input.

## Define the radius before writing indices

For an odd center i, `odd[i]=k` means its largest palindrome occupies half-open `[i−k+1,i+k)`, length 2k−1. The center character alone gives radius 1. In aba, odd[1]=2 covers [0,3).

Even center i lies **between i−1 and i**; `even[i]=k` covers `[i−k,i+k)`, length 2k. No matching pair means valid radius 0. In abba, even[2]=2 covers all four symbols; its center is not one of the b characters alone.

```note-visualization
{"id":"manacher-odd","preset":"normal"}
```

```note-visualization
{"id":"manacher-even","preset":"normal"}
```

Two tables avoid choosing a separator absent from input, at the cost of maintaining two exact index formulas. They describe the same symmetry with different center positions.

## Reuse the palindrome reaching farthest right

For odd centers, maintain [l,r] as the discovered palindrome with farthest right boundary, using **inclusive r**. If i lies inside, its reflected center is `mirror=l+r−i`. Pairs wholly inside [l,r] reflect to matching pairs, so initialize with `min(odd[mirror],r−i+1)`.

If the mirrored radius stops before r, its mismatch also reflects to i, giving the full answer. If it reaches the boundary, only the inside is known and comparisons must continue outside. Copying the whole mirrored radius past the boundary is unjustified.

Even centers use the same argument but lie in gaps, giving `mirror=l+r−i+1`. Updating boundaries likewise changes from odd `[i−k+1,i+k−1]` to even `[i−k,i+k−1]`. Copying formulas without drawing centers causes off-by-one errors.

## Implement two independent passes

```go
func PalindromeRadii(s []rune) (odd, even []int) {
    n := len(s)
    odd, even = make([]int, n), make([]int, n)
    l, r := 0, -1 // farthest known odd palindrome, inclusive bounds
    for i := 0; i < n; i++ {
        k := 1
        if i <= r {
            k = odd[l+r-i]
            if k > r-i+1 { k = r-i+1 }
        }
        for i-k >= 0 && i+k < n && s[i-k] == s[i+k] { k++ }
        odd[i] = k
        if i+k-1 > r { l, r = i-k+1, i+k-1 }
    }
    l, r = 0, -1 // farthest known even palindrome
    for i := 0; i < n; i++ {
        k := 0
        if i <= r {
            k = even[l+r-i+1]
            if k > r-i+1 { k = r-i+1 }
        }
        for i-k-1 >= 0 && i+k < n && s[i-k-1] == s[i+k] { k++ }
        even[i] = k
        if i+k-1 > r { l, r = i-k, i+k-1 }
    }
    return odd, even
}
```

This Go function accepts []rune and needs no import. Each pass starts with empty [l,r]=[0,−1]; use reflection only when i≤r. After expansion, k is already the maximum radius under the table convention, so update bounds directly without another decrement in odd/even. Empty input returns two empty slices.

For abba, every odd center contains only itself: odd=[1,1,1,1]. At even[2], b=b gives k=1, a=a gives k=2, then the bounds stop expansion; even=[0,0,2,0]. Reflection in [0,3] at the next step does not create another even palindrome at the last gap.

For aaa, odd=[1,2,1], even=[0,1,1]. There are three singleton palindromes, two aa intervals, and one aaa. Radius sum 1+2+1+0+1+1=6 counts all six occurrences; identical contents at different positions remain distinct occurrences.

## Why only O(n) comparisons?

Comparisons known inside the current palindrome are replaced by mirrored results. If the mirrored radius ends before the boundary, at most one failing comparison stops expansion. If it reaches the boundary, every newly successful comparison extends the right boundary. That boundary never retreats and traverses only n symbols. Add at most one failure per center: one pass is O(n), and two passes remain O(n).

Result arrays use O(n) memory. A while nested inside a for can still be linear because total new expansion is bounded; loop shape alone does not determine complexity.

## Which questions do radii answer?

The longest palindrome is the maximum of `2odd[i]−1` and `2even[i]`; initial interval formulas give its location. Count all nonempty palindrome occurrences by summing odd[i]+even[i]: radius k contains exactly k nested palindromes at that center. The total can be Θ(n²), so the count type must be wide enough despite O(n) arrays.

To test [l,r), set d=r−l. For odd d use center `(l+r−1)/2` and require odd≥(d+1)/2. For even d use gap `(l+r)/2` and require even≥d/2. Handle empty ranges by the API convention before calculating a potentially nonexistent center.

[]rune measures Unicode code points. Vietnamese may use precomposed or combining sequences; displayed-character palindromes need appropriate normalization and grapheme segmentation. Comparing/reversing UTF-8 bytes solves a different problem and may split characters. Choose symbols according to the input requirement.

## Try it

1. Write odd/even for abba and locate its length-4 center.
2. Why does aaaa cause quadratic naive expansion but linear Manacher?
3. Count aaa palindromes using radii. Is the count of distinct contents the same?

**Explanations:** (1) odd=[1,1,1,1], even=[0,0,2,0], gap center i=2. (2) Naive expansion rechecks nested regions; Manacher copies known interior information and only extends the right boundary with new work. (3) Six position-based intervals but three contents a,aa,aaa. Counting distinct substrings needs different tools/arguments.

## References

[Manacher — A New Linear-Time “On-Line” Algorithm for Finding the Smallest Initial Palindrome of a String](https://dl.acm.org/doi/10.1145/321892.321896) is the original linear-time palindrome work; [VNOI — Manacher](https://wiki.vnoi.info/algo/string/manacher) presents an algorithm-training explanation.
