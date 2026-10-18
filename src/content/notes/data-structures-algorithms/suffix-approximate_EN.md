---
title: "Suffix structures and approximate matching"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/suffix-approximate"
series: "Advanced DSA"
seriesOrder: 20
tags: ["suffix-array", "lcp", "suffix-tree", "approximate-matching"]
description: "Index every suffix for exact queries, then change the dynamic-programming boundary to permit edit errors."
draft: false
updated: 2026-10-15
---

A fixed text receives thousands of search patterns. Running KMP over the entire text each time repeats much reading. Indexing every suffix changes the question to “which suffixes start with this pattern?” Allowing a typing error changes the problem again; an exact index does not automatically solve it.

This lesson separates those needs: suffix structures for repeated exact queries, then dynamic programming to match approximately against a substring starting anywhere. It assumes lexicographic order, binary search, and two-string edit distance.

## Every starting position defines a suffix

Suffix i is s[i:] through the end. For banana, sorted suffixes are:

| Rank | Position | Suffix | LCP with predecessor |
| --- | --- | --- | --- |
| 0 | 5 | a | 0 |
| 1 | 3 | ana | 1 |
| 2 | 1 | anana | 3 |
| 3 | 0 | banana | 0 |
| 4 | 4 | na | 0 |
| 5 | 2 | nana | 2 |

The suffix array is [5,3,1,0,4,2], storing indices rather than copied suffix strings. Pattern ana prefixes ranks 1 and 2. These are contiguous: any string between two strings sharing prefix p must also share p. A different character before p ends would place it before or after the entire interval.

```note-visualization
{"id":"suffix-search","preset":"normal"}
```

Binary search finds both boundaries. A simple comparison reads up to m pattern characters, so a query takes O(m log n), plus result output. Positions arrive in suffix order, not necessarily increasing text position; occurrence-order output needs further organization or sorting.

Building is not free. Direct suffix comparison can read O(n) characters per comparison and cost O(n² log n). Doubling with radix sorting takes O(n log n); suitable algorithms can be linear under alphabet assumptions. [Suffix-array construction](/en/notes/data-structures-algorithms/suffix-array-construction/) explains that cost separately.

## LCP reveals repeated regions

LCP measures the longest common prefix of adjacent suffixes. The maximum here is 3 between ana and anana, so ana is a longest repeated substring at 3 and 1. Occurrences may overlap; nonoverlap requires a separate positional-distance condition.

A suffix tree compresses the suffix trie and can find a pattern in O(m+occ) with appropriate representation and construction, at the cost of edge/pointer overhead and harder implementation. A suffix automaton groups substrings by endpos; it is not a renamed suffix tree. See [suffix trees](/en/notes/data-structures-algorithms/suffix-tree/) and [SAM](/en/notes/data-structures-algorithms/suffix-automaton/). Choose according to queries and implementation cost, not just the best asymptotic construction bound.

## Approximation begins by defining an error

Levenshtein edit distance permits insertion, deletion, and substitution at cost 1. Hamming counts mismatching positions in equal-length strings without insertion/deletion. Both give distance 2 for ab versus ba, so that example does not distinguish them. For abc versus bc, edit distance is 1 by deleting a, whereas standard Hamming is undefined because lengths differ.

Bytes, runes, and graphemes also change the meaning of one error. A Vietnamese displayed letter can contain several UTF-8 bytes. Choose and possibly normalize the symbol sequence before defining the DP.

## Permit any start position through the boundary conditions

Let dp[i][j] be the minimum cost to turn pattern prefix p[:i] into **a substring ending at j** in text t[:j]. Set dp[0][j]=0 to skip leading text for free. Set dp[i][0]=i because an empty text requires deleting all i pattern symbols.

At i,j, minimize three alternatives: delete p[i−1] with dp[i−1][j]+1; insert t[j−1] with dp[i][j−1]+1; or pair them using dp[i−1][j−1] plus 0/1 for equality/mismatch. The recurrence is the same as edit distance; changing the first row changes the objective from matching the entire text to choosing a substring.

```note-visualization
{"id":"approximate-matching","preset":"normal"}
```

For cat in xcuty, the column after t has cost 1: choose cut and replace a with u. Leading x costs nothing because the zero first row permits starting after it. Using the full-string boundary dp[0][j]=j would charge for a text prefix that need not match.

Values dp[m][j] give the best cost for endpoint j. Select columns at most k for qualifying endpoints. Start positions or edit paths need traceback or source information, not only a cost. Several optimal substrings may share an endpoint; the API must choose how to return them.

DP takes O(mn) time and O(mn) memory when retaining a traceback table. Two rows reduce value-only storage to O(n), or another traversal orientation may be used. A threshold k can help restrict work to a diagonal band when the start is bounded. With arbitrary starts, one fixed band around i=j misses many matches; a candidate-dependent band or another suitable method is required.

## Try these

1. What are the suffix array and adjacent LCPs of aba?
2. Why does banana's maximum LCP identify ana without proving nonoverlap?
3. What does a zero first DP row change for cat in xcuty? Does ab versus ba distinguish edit from Hamming?

**Answers:** (1) a(2),aba(0),ba(1): SA=[2,0,1], LCP=[0,1,0]. (2) Positions 1 and 3 are only two apart, less than length 3. (3) The free leading prefix permits cut with cost 1. Both metrics give 2 for ab/ba; abc/bc exposes the length/insertion-deletion difference.

## Further reading

[Kasai et al. — Linear-Time Longest-Common-Prefix Computation](https://www.ime.usp.br/~cris/aulas/19_1_6957/KasaiLAAP2001-LCP.pdf) covers LCP. [Ukkonen — On-line construction of suffix trees](https://www.cs.helsinki.fi/u/ukkonen/SuffixT1withFigs.pdf) presents online tree construction. [Suffix-array construction](/en/notes/data-structures-algorithms/suffix-array-construction/) develops the example into an index-building algorithm.
