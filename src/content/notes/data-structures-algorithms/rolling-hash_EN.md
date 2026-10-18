---
title: "Rolling hash: compare substrings through fingerprints"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/rolling-hash"
series: "Advanced DSA"
seriesOrder: 28
tags: ["string", "rolling-hash", "rabin-karp", "collision"]
description: "Polynomial prefix hashes, constant-time substring fingerprints, and the limits imposed by collisions."
draft: false
updated: 2026-10-15
---

Comparing millions of substring pairs character by character can cost more than the rest of an algorithm. Rolling hash assigns a number to each substring as a quick filter: different hashes prove different content; equal hashes mean the content **might** be equal. These implications are not symmetric.

We will build a polynomial fingerprint for bytes, derive substring queries, and use them for matching. The goal is to understand both the speedup and the risk; this rolling hash is not a cryptographic security hash.

## Prefix hashes preserve positional multiplication

Choose a base B and modulus M, commonly prime, and map bytes to positive integers. Set `H[0]=0`, `H[i+1]=(H[i]B+v_i) mod M`, and `P[k]=B^k mod M`. With a=1,b=2,c=3,B=10,M=101, the prefix values for abc are 0,1,12,22 because 123 has remainder 22.

B≠1 gives position a role; at B=1, ab and ba both sum to 3 even before reduction. But choosing a base other than 1 does not make hashes injective: there are more strings than residues, so collisions remain possible.

```note-visualization
{"id":"hash-prefix","preset":"normal"}
```

For [l,r), H[r] includes the prefix before l multiplied by B^(r−l), plus the desired substring. Subtracting H[l]P[r−l] removes that prefix:

`hash(l,r)=(H[r]−H[l]P[r−l]) mod M`.

For bc in abc, `22−1·100=−78`, normalized modulo 101 to 23, exactly 2·10+3. Compare appropriate lengths too; a short and a long substring sharing a hash does not justify ignoring length.

```go
func SliceHash(prefix, power []int64, l, r int, mod int64) int64 {
    x := (prefix[r] - prefix[l]*power[r-l]) % mod
    if x < 0 { x += mod }
    return x
}
```

The Go function needs prefix/power tables covering the string, a positive modulus, `0≤l≤r<len(prefix)`, and multiplication that fits int64. For normalized operands, add mod once when the final remainder is negative. Large moduli need safe modular multiplication; %mod cannot repair an overflowing product.

```note-visualization
{"id":"hash-substring","preset":"normal"}
```

Building both tables takes O(n) time/memory; one substring query takes O(1) machine operations under these arithmetic assumptions. Indices are byte offsets. For rune-based text, construct and query a consistent rune sequence; do not mix a pattern's byte length with rune ranges.

## Use hashes as a matching filter

For a length-m pattern, compare its hash with every length-m text window. There are n−m+1 windows when m≤n. Preprocessing and fingerprint comparison take O(n+m) operations in the constant-time arithmetic model. Prefix scanning itself does not need an expected-time assumption.

Accepting every equal-hash window can report false matches. For certainty, compare actual characters at candidates. Collisions or many true matches requiring full comparisons can make this naive verification O(nm) in the worst case. For m>n there are no windows; empty patterns need an API convention first.

```note-visualization
{"id":"hash-window","preset":"normal"}
```

Two well-chosen hashes make simultaneous collisions less likely but do not prove equality. Multiplying two collision probabilities requires an independence model; using two moduli alone does not establish it. Adversaries knowing fixed parameters can exploit structure. Randomizing the base at runtime can support an appropriate fixed-input model; KMP/Z provide exact matching with no fingerprint risk.

## Repeated substrings and common lengths

Substring hashes can group possible equals or compare two suffixes up to a trial length. For the longest common prefix of two suffixes, “their first k symbols match” is monotone: if true at k, it is true for shorter lengths. Binary search makes O(log n) length checks, each O(1) hash queries, but treating hash equality as content equality retains collision risk.

For longest common substring across two strings, “some common substring of length k exists” is also monotone. Store length-k window hashes from one string in a set and query windows from the other. This is different from comparing one suffix pair: each check scans windows and performs set operations. Account for memory, hash-table cost, and verification when exact results are required.

A small modulus exposes risk by hand. With B=10,M=7,a=1,b=2,c=3, ab=12 has remainder 5 and ba=21 has remainder 0; aa=11 has remainder 4 and bc=23 remainder 2. Not every permutation pair collides when B≠1: compute a real counterexample. For example, aa=11 and cb=32 both have remainder 4 despite different equal-length content.

## Try and explain

1. With B=10,M=101, what is hash(abc), and how does prefix subtraction give hash(bc)?
2. Why subtract H[l]P[r−l] without dividing by a power of B?
3. With B=10,M=7, do aa and cb collide? What if absolute correctness is required?

**Answers:** (1) 22; `22−100≡23`. (2) The prefix convention gives left-hand characters higher powers, so subtraction already leaves the substring at the desired scale. (3) Both 11 and 32 give remainder 4. Verify content or use an exact algorithm; another modulus reduces risk without proving collision freedom.

## Further reading

[Karp and Rabin — Efficient randomized pattern-matching algorithms](https://doi.org/10.1147/rd.312.0249) introduced fingerprints for matching. [KMP](/en/notes/data-structures-algorithms/string-matching/) and [Z-function](/en/notes/data-structures-algorithms/z-function/) are exact alternatives for a single pattern.
