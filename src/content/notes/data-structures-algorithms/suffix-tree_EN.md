---
title: "Suffix trees: a compressed trie of all suffixes"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/suffix-tree"
series: "Advanced DSA"
seriesOrder: 34
tags: ["string", "suffix-tree", "compressed-trie", "ukkonen"]
description: "Understand edge splitting in a simple construction before studying active points and suffix links in Ukkonen."
draft: false
updated: 2026-10-15
---

Putting every suffix of banana into a trie stores many paths with only one continuation. A suffix tree compresses those paths into edges labeled with whole substrings. Crucially, an edge label is stored as indices into the original text rather than a separate copied string.

We first construct a version that is easy to follow, then examine how Ukkonen avoids repeated work. This assumes tries and suffix arrays. The Ukkonen section maps its mechanisms rather than providing a complete linear-time implementation.

## Compress paths while retaining every substring

A root path in a suffix trie spells a suffix prefix, hence a text substring. The raw trie can contain Θ(n²) nodes/symbols. Compressing single-child paths into edges labeled by [start,end) preserves their spelling without storing intermediate nodes.

Append a sentinel # absent from s and build for t=s+#. Every suffix of t ends at its own leaf, including the suffix # alone. No suffix is a proper prefix of another because # occurs only at the end. Without a sentinel, implicit ending points are possible but need explicit handling rather than assuming every suffix reaches a leaf.

```note-visualization
{"id":"suffix-trie-compress","preset":"normal"}
```

For N=|t|, there are N leaves. Every nonroot internal node has at least two children after compression, giving O(N) internal nodes/edges. Two indices store each label in O(1), making memory linear. Copying full edge labels can invalidate that space argument.

## Insert suffixes to understand edge splitting

Start at root and choose an edge by the suffix's first symbol. If absent, add a leaf for the remainder. Otherwise compare along the label. Consume a whole matching edge and descend; on a mismatch within an edge, create a branching node there, split the old label, and add another edge for the new suffix remainder.

```text
banana#
Suffix 5: a#
Suffix 3: ana#  → shared prefix a; split the edge at a
Suffix 1: anana# → continue sharing the ana branch
```

The text example shows shared prefixes among suffixes ending in #. a# and ana# share a, then split at # versus n. Adding anana# can share ana and split afterward. Update edge start/end at the split; each leaf also retains its suffix's starting position for occurrence output.

After each insertion, all processed suffixes have root-to-leaf paths and sibling edges have different first symbols. Splitting preserves the old route and adds exactly the new one. One insertion can compare O(n) symbols, totaling O(n²) time despite O(n) final tree size. A compact result does not prove a fast construction.

## Ukkonen avoids restarting every suffix at root

Ukkonen appends symbols left to right, maintaining a tree for processed text and implicitly managing suffixes needing updates. An active point consists of a node, an edge, and an offset within that edge, representing a position without making every interior point explicit.

A suffix link from a node spelling cX reaches the node spelling X, allowing the next suffix to continue after dropping its first symbol. Leaf edges can share one end variable that advances each phase; extending every existing leaf then needs no separate write per leaf.

These ideas alone are insufficient if the implementation still rereads labels or traverses regions repeatedly. Full construction organizes extensions, stops when the needed extension already exists, and uses skip/count to cross edges by length. With fixed alphabet and suitable transitions, amortized analysis gives O(n). Balanced edge lookup for a large alphabet adds its lookup cost.

Learning the O(n²) compressed insertion first clarifies splits and invariants. Implementing Ukkonen requires its complete active-point/link/end rules, not merely those variable names followed by an unsupported linear-time claim.

## A query can end inside an edge

Follow the pattern's labels from root. A mismatch or missing edge means absence. If the entire pattern has been consumed, even inside an edge, every descendant leaf gives an occurrence; the pattern need not end at an explicit node.

```note-visualization
{"id":"suffix-tree-search","preset":"normal"}
```

With O(1) edge lookup, finding and reporting occ positions costs O(|p|+occ). Empty patterns and sentinels need an API convention; users commonly query original s without treating # as real content. Existence alone does not require visiting every leaf.

The deepest internal node by **total label length**, not edge count, gives a longest repeated substring. At least two descendant leaves prove two occurrences. In banana, suffixes at 1 and 3 share ana; they overlap, so nonoverlapping repetition needs an added positional condition.

## Two texts in one tree

For A#B$ with distinct sentinels absent from both texts, classify leaves by whether their start belongs to A or B. The deepest internal node with leaves from both sources gives the longest common substring. Depth counts symbols before separators; crossing a separator does not produce a valid substring of both sources. Distinct sentinels preserve separate endings and prevent false cross-boundary sharing.

For static texts, suffix arrays are often smaller and simpler, while trees directly expose prefix branches and descendant enumeration. Choose by queries and memory rather than only the best linear construction bound. Byte/rune/grapheme units must remain consistent too.

## Try and compare

1. What root edges occur in aba#'s compressed trie, and how does a branch?
2. Why must the sentinel be absent from input?
3. Which banana suffixes share ana, and why measure label length instead of edge count?

**Answers:** (1) Root edges start a,b,#. After a, split into # for a# and ba# for aba#; b leads through ba#. (2) It marks distinct endings without being mistaken for interior content, giving the correct suffix leaves. (3) Positions 1 and 3; compressed edges can span many symbols, so edge count is not string length.

## References

[Ukkonen — On-line construction of suffix trees](https://www.cs.helsinki.fi/u/ukkonen/SuffixT1withFigs.pdf) develops compressed suffix trees and online construction. [Suffix-array construction](/en/notes/data-structures-algorithms/suffix-array-construction/) offers an alternative for a static array-based index.
