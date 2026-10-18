---
title: "Suffix automata: group substrings by ending positions"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/suffix-automaton"
series: "Advanced DSA"
seriesOrder: 33
tags: ["string", "suffix-automaton", "substring", "endpos"]
description: "Understand endpos classes, suffix links, cloning, distinct substring counts, and occurrence propagation."
draft: false
updated: 2026-10-15
---

The string ab has three distinct nonempty substrings: a,b,ab. A length-n string can have Θ(n²) substrings, yet we want membership queries or counts without storing each one. A suffix automaton groups substrings sharing the same ending-position set into a much smaller graph.

This lesson assumes automata, suffixes, and labeled edges. We focus on state meaning: memorizing clone instructions without understanding the class being split makes implementation errors hard to repair.

## Different strings can share an ending-position set

In ab, both b and ab end only at index 1. They can share state endpos={1}. A ends at 0 and belongs elsewhere. A state therefore represents an equivalence class, not necessarily one substring.

Starting at the root, follow a string's symbols; an existing path proves substring membership. To recognize **suffixes**, additionally mark suffix-terminal states. Reaching a state tests a substring without requiring that state to be terminal. Do not confuse these queries or treat SAM as a different spelling of suffix tree.

State v stores len[v], its class's maximum string length. link[v] identifies the longest suffix in a different class. Every length from len[link[v]]+1 through len[v] has exactly one string in the class, nested suffixes of its longest representative. Thus the distinct nonempty substring count is

`Σ_{v≠root}(len[v]−len[link[v]])`.

For ab, a's state contributes length 1, and the b/ab state contributes lengths 1..2: total 1+2=3. Classes are disjoint and each class has one string per length, so no duplicates arise without enumeration.

```note-visualization
{"id":"sam-substring-count","preset":"normal"}
```

## Extension updates every suffix just lengthened

Initially root has len=0,link=−1; last represents the entire processed prefix. Appending c creates cur with len=len[last]+1. Walk suffix links from last; wherever p lacks a c edge, add p —c→ cur. Those suffixes have gained a new extension.

At the first p already having c→q, there are three cases:

1. No such p before −1: link[cur]=root.
2. len[p]+1=len[q]: q has the appropriate length, so link[cur]=q.
3. len[p]+1<len[q]: the new route reaches q at a shorter length than its maximum, requiring a clone to split the class.

Copy q's transitions and suffix link to clone, but set len[clone]=len[p]+1. Redirect c edges from suffix ancestors still targeting q toward clone; set link[q]=link[cur]=clone. Finally last=cur. A transition map copy must be independent if later edits occur; assigning the same mutable map to both states breaks the split.

```note-visualization
{"id":"sam-extend","preset":"normal"}
```

## Why cloning matters: abb

After ab, b and ab share endpos={1} in q with len=2. Appending another b creates cur for abb. The ab state lacks b, so add an edge to cur. At root, b already leads to q, but len[root]+1=1<len[q]=2.

Now b ends at {1,2}, whereas ab still ends only at {1}. They no longer belong together. Clone with len=1 represents b; q retains ab. Root's b edge targets clone, and q and cur link to clone. Clone inherits q's continuation routes but does **not** create a new text ending position itself.

Cloning is therefore not merely a memory optimization. Omitting it breaks endpos classes and len/link intervals, hence counts and queries. Each appended symbol creates at most one cur and one clone, giving O(n) states. The standard 2n−1 bound applies for n≥2; n=1 has root plus one state, or 2, and the empty string has only root.

## Occurrence counts propagate along suffix links

Initialize each new cur with count 1 because it records one new ending position; initialize clones with 0. Process states in decreasing len, adding count[v] to count[link[v]]. Every ending of a longer string is also an ending of its suffix, so propagation recovers endpos counts.

After reading pattern p from root, the reached state's count is p's occurrence count even if p is not the longest class member. In abb, b has count 2 and ab count 1. Decreasing-length order matters: arbitrary creation order can pass incomplete counts to ancestors. Empty patterns have n+1 boundaries and need their own convention; do not mechanically return count[root].

## Queries and their cost assumptions

A length-m pattern needs O(m) transitions with constant-time lookup. For longest common substring with another string, scan it while retaining state and matched length. On a missing edge, follow links to shorten the suffix; on an available edge, extend and track the maximum. Update length when following a link rather than retaining a value above the new state's len.

There are O(n) states/edges. Standard construction is linear for a fixed alphabet and appropriate transition operations. Merely creating at most two states per character does not bound every map-copy or edge-search implementation. Small transition arrays give stable constants but cost alphabet-sized storage per state; sparse maps suit larger alphabets with real lookup/memory costs and implementation-dependent average bounds.

For UTF-8, choose bytes or runes before construction: n, len, and endpos positions use that symbol unit. A byte SAM is valid for byte queries but does not automatically count displayed characters.

## Try these

1. What do ab's two nonroot states contribute to the substring count?
2. Why must b and ab split when a b is appended? What initial count does clone receive?
3. Why cannot two classes count the same substring in len−len[link]?

**Answers:** (1) 1 and 2, totaling a,b,ab. (2) B has endpos {1,2}, ab only {1}; clone starts at 0, the new cur at 1, and propagation produces correct totals. (3) A substring has one ending-position set and therefore one class; each length in that class identifies one suffix. Both facts are needed to prove no double counting.

## References

[Ukkonen — On-line construction of suffix trees](https://www.cs.helsinki.fi/u/ukkonen/SuffixT1withFigs.pdf), including its suffix automata/DAWG discussion, connects suffix links with automata. [VNOI — Suffix Automaton](https://wiki.vnoi.info/algo/string/suffix-automaton) explains extension and cloning for implementation practice.
