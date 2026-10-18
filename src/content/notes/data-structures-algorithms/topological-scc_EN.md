---
title: "Topological order and strongly connected components"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/topological-scc"
series: "Advanced DSA"
seriesOrder: 11
tags: ["topological-sort", "scc", "dag", "kahn", "tarjan"]
description: "Order dependencies in a DAG, then group directed cycles into strongly connected components."
draft: false
updated: 2026-10-15
---

Deployment needs a finished build; a build needs source and dependencies. An edge u→v says u must come before v. A topological order arranges all vertices so these constraints hold. It exists exactly for directed acyclic graphs, or DAGs.

For circular dependencies, instead of forcing vertices around a cycle into a line, group mutually reachable vertices. Strongly connected components provide these groups, and the graph between groups becomes a DAG.

## Kahn removes work with no remaining predecessors

Compute indegree[v], the number of incoming edges. Queue every zero-indegree vertex. Remove u, append it to output, decrement indegrees along u→v, and queue v when its indegree becomes zero. Interpret indegree as incoming edges **from unprocessed vertices**: decrementing removes completed work's dependency.

For 0→1,0→2,1→3,2→3, initial indegrees are [0,1,1,2]. Removing 0 readies 1 and 2. Removing 1 leaves 3 at indegree 1; only after removing 2 does 3 become ready. Both 0,1,2,3 and 0,2,1,3 are valid.

Add 3→1. After removing 0 and 2, the queue empties while 1 and 3 wait for each other. Only two of four vertices are returned, so no complete topological order exists. Unprocessed vertices contain a cycle, but need not all lie on a cycle: downstream dependencies can also remain stuck.

```note-visualization
{"id":"kahn-topo","preset":"normal"}
```

Each vertex enters once and each edge causes one decrement: O(V+E) time, O(V) auxiliary space. For the lexicographically smallest ID order, replace the queue with a min-heap. A simple bound is O((V+E)log V); more precisely heap operations are per vertex while scanning edges remains linear.

## DFS outputs a vertex after its successors

DFS can record each vertex after processing outgoing edges, then reverse finish order. For u→v in a DAG, v finishes before u if reached through u, or has already finished in another branch. Reversal puts u before v.

The DAG condition must be checked. Use three colors: unseen, on the current recursion stack, and finished. An edge to a current-stack vertex closes a cycle. One visited bit cannot distinguish that from an edge to finished work. DFS also takes O(V+E), with stack depth up to O(V).

```note-visualization
{"id":"dfs-topo","preset":"normal"}
```

## SCCs group mutual reachability

Vertices u,v share a strongly connected component if paths exist both u→v and v→u. Each SCC is maximal under that relation. For 0↔1,1→2,2↔3, the groups are {0,1} and {2,3}, with an edge from the first to the second.

Contract each group into one vertex to form the condensation graph. It cannot contain a cycle: groups around a directed cycle would all be mutually reachable and therefore one SCC. Scheduling is possible between groups, though each group's internal circular dependencies still need their own resolution.

```note-visualization
{"id":"scc-condensation","preset":"normal"}
```

## Tarjan keeps vertices whose components are still open

DFS assigns discovery time disc[u] and pushes u onto an SCC stack. This differs from the call stack: a call may return while its vertex remains on the SCC stack until its group is finalized. low[u] records the smallest discovery index reachable under the DFS rules through this still-open region.

For a tree edge to unseen v, recurse and update low[u]=min(low[u],low[v]). For an already-seen v **still on the SCC stack**, use disc[v]. If v has been popped into a completed SCC, do not use that edge to lower low. These branches define this Tarjan variant; substituting low[v] for disc[v] on a visited edge changes the invariant and must not be mixed casually across variants.

When low[u]==disc[u], no connection requires u's group to stay open with a vertex discovered before it. Pop through u inclusive; those vertices form an SCC. Each vertex enters/leaves once and each edge is examined once: O(V+E) time, O(V) auxiliary memory.

```note-visualization
{"id":"tarjan-scc","preset":"normal"}
```

Kosaraju separates the task into two passes: DFS the original graph for finish order, reverse all edges, then DFS in decreasing finish order. Each second-pass traversal collects one SCC. This also costs O(V+E), but storing the reverse graph needs edge storage in addition to the O(V) arrays.

```note-visualization
{"id":"kosaraju-scc","preset":"normal"}
```

**Check:** What does an incomplete Kahn output prove? Which SCCs occur in the example? Can an edge to a finalized SCC lower low in this Tarjan version?

**Answers:** It proves a cycle remains, not that every unprocessed vertex belongs to one. The example has {0,1} and {2,3}, condensed to one directed edge. An edge to a closed component does not lower low because that component is outside the stack awaiting grouping. Distinguishing the SCC stack from the call stack is essential when simulating Tarjan.
