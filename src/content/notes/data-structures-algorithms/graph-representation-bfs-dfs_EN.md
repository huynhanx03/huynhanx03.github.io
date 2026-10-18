---
title: "Your first graph: representations, BFS, and DFS"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/graph-representation-bfs-dfs"
series: "DSA Foundations"
seriesOrder: 18
tags: ["graph", "adjacency-list", "bfs", "dfs", "go"]
description: "Choose a graph representation and understand why BFS finds paths with the fewest edges."
draft: false
updated: 2026-10-15
---

A connection diagram answers distinct questions: can A reach B, and what is the fewest road segments required? Graphs represent locations as vertices and connections as edges. BFS and DFS use the same representation but organize exploration differently, supporting different conclusions.

Before coding, establish whether edges are directed or undirected, weighted or unweighted, how vertices are numbered, and whether parallel edges or self-loops are allowed. `u→v` permits travel only from `u` to `v`; an undirected edge permits both directions. Algorithms here assume vertex indices `0..V-1`.

## Choose a representation for the operations needed

An adjacency list `adj[u]` stores vertices reached by an edge from `u`. It uses `O(V+E)` memory and suits scanning actual neighbors. An undirected edge `{u,v}` usually appears twice, in `adj[u]` and `adj[v]`; `2E` records remain `O(V+E)`. These two records represent one edge, whereas parallel edges are distinct and may need separate IDs.

An adjacency matrix reserves one cell per vertex pair, using `O(V²)` memory even with few edges, but testing `(u,v)` takes `O(1)`. Enumerating neighbors scans a whole `V`-cell row, so the `O(V+E)` traversal bounds below assume adjacency lists. For parallel edges, a boolean cell preserves only existence; counting or weighted problems need a convention such as multiplicity, a list, or the best weight. Matrices suit dense graphs and some all-pairs algorithms.

```note-visualization
{"id":"graph-adjacency","preset":"normal"}
```

## BFS expands successive distance layers

For undirected edges `0-1,0-2,1-3,2-3`, start at 0 with queue `[0]`. Processing 0 discovers 1,2 at distance 1. Processing 1 discovers 3 at distance 2. When 2 is processed, 3 is already marked and is not enqueued again. Distances are `[0,1,1,2]` even if adjacency order processes 2 before 1.

### Implement the queue and distance table

```go
func Distances(adj [][]int, source int) []int {
	dist := make([]int, len(adj))
	for i := range dist {
		dist[i] = -1
	}

	queue := []int{source}
	dist[source] = 0 // Mark when enqueuing.
	for head := 0; head < len(queue); head++ {
		u := queue[head]
		for _, v := range adj[u] {
			if dist[v] != -1 {
				continue
			}
			dist[v] = dist[u] + 1
			queue = append(queue, v)
		}
	}
	return dist
}
```

This Go function accepts adjacency lists and a valid `source`; all neighbors must also be valid indices. `-1` means undiscovered during traversal and unreachable afterwards. The queue uses a `head` index instead of deleting its first slice element; vertices are marked before appending.

Queue distances are nondecreasing: processing layer `d` discovers only layer `d+1`, behind already waiting vertices. First discovering `v` from `u` yields a route of `dist[u]+1` edges. A shorter route would have a predecessor in an earlier layer and would already have discovered `v`, a contradiction. First discovery therefore gives the fewest edges.

Marking on dequeue could let both 1 and 2 enqueue 3 before it is processed. Marking on enqueue prevents that duplication. At most `V` enqueues and one scan per adjacency record give `O(V+E)` time and `O(V)` extra memory. To output a path, record `parent[v]=u` at discovery and trace backwards from the destination.

```note-visualization
{"id":"bfs","preset":"normal"}
```

BFS minimizes edge count, not arbitrary weight sums. A one-edge route of weight 10 has fewer edges than a two-edge route of weights 2+2. Equal positive edge weights make the objectives coincide; differing weights need [shortest-path algorithms](/en/notes/data-structures-algorithms/shortest-paths/).

## DFS keeps one branch open

DFS enters an unvisited neighbor, descends until blocked, then returns. Recursion remembers unfinished branches on the call stack; an explicit stack is another option. To reproduce recursive completion times, stack entries need adjacency progress or entry/exit events, not merely arbitrary vertex pushes.

`visited` prevents endless cycling. Directed-cycle detection needs three states: unvisited, on the recursion stack, and finished. An edge to an on-stack vertex closes a cycle; an edge to a finished vertex alone does not prove one. In an undirected graph, a child's edge to its parent is the reverse record of the tree edge, not a new cycle. For parallel edges, skip the exact parent edge ID rather than every edge to the parent vertex.

```note-visualization
{"id":"dfs","preset":"normal"}
```

DFS also takes `O(V+E)` on lists, with `O(V)` possible stack depth on a chain. One traversal visits only the source-reachable region. To cover a disconnected graph, start from each unvisited vertex. In undirected graphs, each new start identifies a connected component; in directed graphs this start count does not give the number of strongly connected components.

**Check yourself:** Does discovering 1 before 2 change distance to 3? Why does late marking duplicate entries? How do you count undirected components?

**Explanations:** Distance stays 2, though 3's parent may be 1 or 2. Late marking lets two predecessors both see 3 as not yet processed and enqueue it. Scan all vertices, incrementing a counter whenever starting a DFS at an unvisited vertex, then mark that entire component. Visit order depends on adjacency order; demand a particular order only when the output contract specifies one.
