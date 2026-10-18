---
title: "Aho–Corasick: searching many patterns together"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/aho-corasick"
series: "Advanced DSA"
seriesOrder: 31
tags: ["string", "trie", "aho-corasick", "failure-link"]
description: "Add failure links to a trie to scan text once and report overlapping patterns."
draft: false
updated: 2026-10-15
---

In `ushers`, search simultaneously for `he`, `she`, and `hers`. Reading e completes both she and he. Reporting only the longest current pattern loses a valid match; running KMP separately for thousands of patterns instead rescans the text repeatedly.

Aho–Corasick shares pattern prefixes in a trie and adds fallback paths preserving useful suffixes. This article assumes tries, BFS, and [KMP](/en/notes/data-structures-algorithms/string-matching/)'s border/fallback idea. Example positions are zero-based.

## A trie identifies the prefix being read

Insert every pattern; node v represents the string along its root path. Mark **every pattern-ending node** terminal, not just leaves: he remains terminal even with an extension to hers. If one pattern has several application IDs, decide whether to retain one or all; the structure does not merge their business meanings automatically.

```note-visualization
{"id":"aho-trie","preset":"normal"}
```

During scanning, state should represent the longest suffix of consumed text that is also a trie prefix. Follow an edge for the next symbol when possible. Returning directly to root on failure could discard a shorter suffix that still accepts that symbol; failure links preserve it.

## Failure links select the longest valid fallback

`fail[v]` points to the node representing the longest **proper** suffix of v's string that also occurs as a trie prefix. Root fails to itself; its immediate children fail to root. For example, she fails to he. If she lacks an r edge, failing to he and following r retains her rather than forgetting all consumed context.

```note-visualization
{"id":"aho-failure","preset":"normal"}
```

Build links by BFS. For edge u —c→ v, start from fail[u] and follow fallback until a c edge is found; its destination becomes fail[v], or root if none exists. Handle root children separately to avoid self-links. Failure states are shallower, so BFS makes the needed prior-level information available.

For a small alphabet, fill all transitions: missing root transitions return to root, others inherit their failure state's transition. Scanning then reads `next[state][c]` without a fallback while loop. Sparse storage instead retains trie edges and traverses failure links when needed. These represent the same behavior; do not confuse an absent trie edge with an already completed transition.

## Report patterns along the failure chain too

After e at position three of ushers, state she reports she starting at one; failure state he reports he starting at two. Reading r falls from she to he, follows r, then s completes hers starting at two. Overlapping matches must all survive.

```note-visualization
{"id":"aho-scan","preset":"normal"}
```

Construction can merge failure outputs into each state's output, simplifying scan but copying many IDs when patterns have pattern suffixes. Alternatively, output links lead to the nearest terminal on the failure chain and then successive terminals, avoiding duplicate full output lists at every state.

```go
// After building the automaton, next[state][c] is the completed
// transition; output[state] contains IDs of patterns ending in this state.
func Scan(text string, next [][26]int, output [][]int, lengths []int,
    report func(patternID, start int)) {
    state := 0
    for i := 0; i < len(text); i++ {
        c := int(text[i] - 'a')
        if c < 0 || c >= 26 { state = 0; continue }
        state = next[state][c]
        for _, id := range output[state] {
            report(id, i+1-lengths[id])
        }
    }
}
```

This Go function is only the scan **after automaton construction**. Every next row must contain all 26 transitions; output must include failure-derived matches; lengths maps IDs to pattern lengths; report is caller-provided. It is neither a complete builder nor usable with an incomplete trie-edge table substituted for next.

Patterns here contain only a..z. Text outside that alphabet resets state, meaning valid matches cannot cross that character. Case folding or Vietnamese support requires an alphabet/normalization policy rather than changing only subtraction of 'a'. Report returns byte offsets; UTF-8/rune patterns require transitions and lengths to share the chosen unit. Empty patterns match every boundary and need a separate convention before using this scanner.

## Why scanning does not inspect every pattern per symbol

Let L be total pattern length and n text length. The trie has at most L+1 nodes. For alphabet σ and completed transitions, constructing the transition/failure tables alone costs O(Lσ), while scanning transitions costs O(n). Copying inherited output lists as used by Scan adds O(Q) construction time and space, where Q is the total number of IDs stored across all output lists. Every copied ID requires a write; construction must account for that work. Output links avoid duplicating complete lists. Reporting matches gives O(n+matches) scan time assuming O(1) per report callback; additional callback work must be counted separately.

With sparse edges and expected O(1) lookup, following an edge increases depth by at most one while failure decreases it. Total fallbacks are bounded by total increases, yielding the standard linear scan plus output. Tree-based lookup may add log σ; copying outputs adds separate storage costs beyond transitions. Bounds depend on representation as well as the algorithm name.

## Counting instead of reporting every position

Increment visit[state] on each scanned state. Afterwards process nodes from deeper to shallower, adding visit[v] into visit[fail[v]]. Each arrival at v also completes suffixes along its failure path; propagation gives occurrence counts at terminals. This avoids enumerating every match when only totals are needed, while still returning counts for requested patterns.

This is a static automaton. A new pattern can introduce a longer suffix-prefix affecting old failure links, so inserting its branch alone need not preserve correctness. Usually rebuild when the dictionary changes; frequent additions/deletions require another dynamic design or multiple automatons. Choose Aho–Corasick when many patterns benefit from sharing one scan, rather than merely because one pattern can fit in a trie.

## Try it yourself

1. Adding his to he,she,hers: does he lose its terminal flag?
2. Which matches end at e in ushers, and where do they start?
3. What is lost if only the current state's own outputs are examined without propagated outputs/output links?

**Answers:** (1) No: a terminal flag indicates a pattern ends there, independently of children. (2) she at one and he at two. (3) he is missed while at she; hers at two remains another later match. BFS failure construction and output reporting address related but separate requirements.

## References

[Aho and Corasick — Efficient String Matching: An Aid to Bibliographic Search](https://doi.org/10.1145/360825.360855) presents multi-keyword matching; [VNOI — Aho–Corasick](https://wiki.vnoi.info/algo/string/aho-corasick) provides implementation practice.
