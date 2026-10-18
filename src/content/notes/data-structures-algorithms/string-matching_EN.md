---
title: "String matching: KMP and Boyer–Moore"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/string-matching"
series: "Advanced DSA"
seriesOrder: 19
tags: ["string-matching", "kmp", "boyer-moore", "prefix-function"]
description: "Reuse matched prefixes with KMP or shift using right-side mismatch information with Boyer–Moore."
draft: false
updated: 2026-10-15
---

Where does aa appear in aaa? At positions 0 and 1, since occurrences may overlap. A correct matching API must specify that convention while avoiding repeated comparisons when many characters look alike.

For text length n and pattern length m, trying each starting position naively costs O(nm) in the worst case. This lesson develops two uses of pattern information: KMP preserves a reusable prefix; Boyer–Moore uses right-side mismatches to shift. The KMP Go code operates on bytes and returns byte offsets.

## What matched suffix can KMP reuse?

Suppose a pattern begins ababa... and ababa has matched, but the next character fails. The matched text ends with aba, also a pattern prefix. Retaining those three characters avoids starting over completely.

A string that is both prefix and suffix is a border; we need a **proper** border, shorter than the whole string. Prefix function pi[i] is the longest proper border length of p[:i+1]. For ababaca, it is [0,0,1,2,3,0,1].

```note-visualization
{"id":"prefix-function","preset":"normal"}
```

At i=4, ababa has border aba, so pi[4]=3. At c, i=5, extending that border expects b but finds c. Fall back to pi[2]=1, then pi[0]=0; neither extends, giving pi[5]=0. Links enumerate possible borders rather than arbitrary lengths.

```go
func Prefix(p []byte) []int {
    pi := make([]int, len(p))
    for i := 1; i < len(p); i++ {
        j := pi[i-1]
        for j > 0 && p[i] != p[j] { j = pi[j-1] }
        if p[i] == p[j] { j++ }
        pi[i] = j
    }
    return pi
}
```

The Go function returns an empty table for an empty pattern because its loop never runs. Otherwise, j starts as the best border of the preceding prefix. After mismatch, a shorter candidate must itself border the old border; j=pi[j−1] therefore skips no valid possibility. A match increments j and stores it.

Each advance in i increases j at most once, and fallback decreases it. Total increases/decreases are linear in m, giving O(m) time and memory. A while nested in a for is not automatically O(m²); track the quantity that rises and falls.

## Scan the text with the same fallback

Let j count pattern characters matched at the end of text read so far. On a new character, follow pi until extension works or j=0. At j=m, report i−m+1, then fall back immediately to retain overlapping matches.

```go
// Convention: the empty pattern matches every byte boundary, including the end.
func FindAll(text, pattern string) []int {
    p := []byte(pattern)
    if len(p) == 0 {
        positions := make([]int, len(text)+1)
        for i := range positions { positions[i] = i }
        return positions
    }
    pi := Prefix(p)
    positions := []int{}
    j := 0
    for i := 0; i < len(text); i++ {
        for j > 0 && text[i] != p[j] { j = pi[j-1] }
        if text[i] == p[j] { j++ }
        if j == len(p) {
            positions = append(positions, i-len(p)+1)
            j = pi[j-1]
        }
    }
    return positions
}
```

Combine this function with Prefix above. Its empty-pattern convention uses **byte boundaries**, not Unicode character positions. Other APIs may choose differently but must handle the case before accessing p[0].

For aba in ababa, the first three characters report 0. Then j=pi[2]=1 retains the final a as the next occurrence's start. Reading b,a reports 2. Resetting j to zero after a full match would miss this overlap.

```note-visualization
{"id":"kmp-search","preset":"normal"}
```

Building takes O(m), scanning O(n), and working memory O(m) beyond output. Storing occ results additionally costs O(occ). Streaming can retain j across chunks; resetting at each boundary misses patterns spanning chunks.

## Boyer–Moore uses information from the right

Align the pattern under a text window and compare right to left. At a mismatch at pattern index j, the suffix after j has already matched. Two heuristics use different information.

**Bad character** examines the mismatching text character. Shift so a suitable pattern occurrence aligns with it, or move past it when none exists. A simple last-occurrence table must clamp the shift to at least 1 if its occurrence lies right of j; a table using a suitable occurrence before j can provide a stronger shift.

**Good suffix** reuses the matched ending: align it with another valid pattern occurrence or align a suffix of it with a pattern prefix. Validity and boundary cases make this table harder to implement than a character-position table.

```note-visualization
{"id":"boyer-moore","preset":"normal"}
```

The rules can produce large jumps, especially with wider alphabets and suitable patterns. But a bad-character-only variant does not inherit every worst-case guarantee of full versions with additional rules. Do not assign one bound to Boyer–Moore, a simplification, and other optimizations merely because they share a name. KMP gives a direct linear proof for all occurrences; Boyer–Moore can fit when data and library implementation support it.

## Choose a consistent unit before matching

Go strings are UTF-8 bytes. This code matches bytes exactly and returns byte rather than rune indices. For code points, convert both strings to runes and retain a mapping if original offsets are needed. Displayed characters require graphemes; visually equivalent Unicode encodings may require normalization. The algorithm cannot choose what counts as the same letter for the application.

## Try these

1. Compute pi for aabaaab.
2. Find aba in ababa; how much remains matched after the first occurrence?
3. Why does shifting only one position after every mismatch waste information?

**Answers:** (1) [0,1,0,1,2,2,3]; at the sixth a, a fallback to border length 2 still extends. (2) Positions 0 and 2, retaining j=1. (3) Pattern structure rules out some alignments: KMP uses borders and Boyer–Moore the bad character/good suffix. Such reasoning is needed to jump safely without losing a real match.

## Further reading

[Knuth, Morris, and Pratt — Fast Pattern Matching in Strings](https://epubs.siam.org/doi/10.1137/0206024) develops linear matching; [Boyer and Moore — A Fast String Searching Algorithm](https://www.cs.utexas.edu/~moore/publications/fstrpos.pdf) compares from the right. [Z-function](/en/notes/data-structures-algorithms/z-function/) stores related information in another form, and [Aho–Corasick](/en/notes/data-structures-algorithms/aho-corasick/) shares fallback across many patterns.
