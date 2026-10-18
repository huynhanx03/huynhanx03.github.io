---
title: "Tries and radix trees: indexing by prefix"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/tries-radix-trees"
series: "Advanced DSA"
seriesOrder: 8
tags: ["trie", "radix-tree", "prefix-search", "unicode"]
description: "Prefix search, end-of-key markers, Unicode choices, deletion, and compressed single-child paths."
draft: false
updated: 2026-10-15
---

A directory contains an,and,ant. Typing an gives a shared prefix for all three. Hash tables handle full-key lookup but do not automatically group prefixes; a trie shares the keys' initial symbols as paths.

For a length-L key, ordinary trie search/insertion/deletion crosses O(L) edges if child selection is constant-time; maps commonly give a corresponding expected bound. Key count does not directly determine path length, but memory and prefix-query output can still be large.

## A node is a prefix, not necessarily a key

Root represents the empty prefix. Edges a then n reach an. A terminal/End flag marks that prefix as a complete key. Without it, {and} is indistinguishable from {an,and}.

Looking up key an needs the path **and** End; prefix lookup only needs the path. A node may be terminal while having children: an is a key, with d and t extending it.

This Go declaration uses runes. Allocate a nonnil root, for example root := &TrieNode{}. Child maps are created on demand rather than at every new node.

```go
type TrieNode struct {
    End bool
    Next map[rune]*TrieNode
}

func Insert(root *TrieNode, word string) {
    node := root
    for _, ch := range word {
        if node.Next == nil { node.Next = make(map[rune]*TrieNode) }
        if node.Next[ch] == nil { node.Next[ch] = &TrieNode{} }
        node = node.Next[ch]
    }
    node.End = true
}
```

Inserting an creates a→n and sets End at n. Inserting and reuses those edges and adds d, preserving End at n. Reinserting an merely sets an already-true flag, so this code models a set, not multiplicity counts.

```note-visualization
{"id":"trie-insert-search","preset":"normal"}
```

An empty string has no range iterations and sets End at root. Reject it before Insert if the application disallows empty keys; the loop does not reject it automatically. New edges always descend one symbol, so correctly managed insertion creates no cycles.

## Unicode determines what L counts

Go's string range decodes UTF-8 into rune code points. One displayed character may contain several code points through combining marks. Visually equivalent encodings can produce different paths unless insertion/search/deletion normalize consistently.

Choose normalization appropriate to the intended equivalence, and possibly a separate case policy. These are distinct relationships rather than one universal “Unicode normalization” operation. [Go: Text normalization](https://go.dev/blog/normalization) explains representation equivalence.

The code suits valid UTF-8. Invalid bytes can produce replacement runes; applications distinguishing every arbitrary byte sequence should choose byte tries or validation. Fix byte/rune units before promising key equality.

Rune maps save space compared with enormous arrays at sparse nodes, but every map has overhead. Small fixed alphabets can use arrays for worst-case constant child access at the cost of empty slots. Assess memory by actual node/edge counts and layout, not only one key's length.

## Deletion preserves paths serving other keys

Deleting an from {an,and,ant} only clears End at n; its d,t children still matter. Deleting and clears d's End and can remove d if childless, while n remains for an or ant.

Walking backward, remove a node only if it is **nonterminal and childless**. Confirm key existence first; deleting an absent key must not decrement counts or dismantle another prefix's path.

```note-visualization
{"id":"trie-delete","preset":"normal"}
```

For {to,tea,ten}, root has t; t branches to o,e; e branches to a,n. Removing tea removes a but preserves e for ten and t for to. This small case checks against excessive upward deletion.

To count keys below a prefix, maintain subtreeCount along paths. A duplicate insertion increases it only for a multiset contract; a set must detect whether a new key was actually created. Deletion needs the symmetric rule. End and counts are related but not freely interchangeable.

## Radix trees compress paths that have not branched

A sequence of nonterminal single-child nodes can become one edge labeled by a substring. Replacing t→e→s→t→i→n→g with testing reduces nodes. An interior terminal such as test is a boundary that must remain represented.

With edge testing, inserting test splits after four symbols: test reaches a terminal node, then ing reaches testing's terminal. Inserting team instead shares te, branching into sting and am. Compare symbols along the label, not only its first symbol.

```note-visualization
{"id":"radix-compression","preset":"normal"}
```

If deletion leaves a nonterminal node with one child, concatenate edge labels and remove the intermediate node. Root and terminal nodes have distinct roles, so one child alone is not sufficient. Compression reduces nodes/pointers, but total symbols compared still depend on L; fewer edges do not make long-key lookup O(1).

## Prefix queries must also return their results

Follow the prefix to a node or an interior radix-edge point, then enumerate descendants. Cost exceeds O(prefix length) when many keys qualify. An empty prefix can request the entire dictionary; autocomplete limits need a defined ordering or ranking policy.

Go map iteration is unspecified, so DFS through child maps does not produce stable lexicographic order automatically. Sort child symbols or use ordered storage and count that cost. Code-point order also differs from language-specific name collation.

## Check your understanding

**1.** Does te succeed in {to,tea,ten}? **2.** Which nodes disappear when deleting tea? **3.** Where does inserting test into testing put the terminal flag?

**Answers:** Prefix lookup succeeds through t,e; exact-key lookup fails if e is not End. Deleting tea clears End and removes a, retaining e for n and t for other keys. Split the radix edge at test, mark the split terminal, and retain ing for testing. All three require distinguishing an existing path from a key ending there.
