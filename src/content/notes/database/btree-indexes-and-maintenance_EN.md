---
title: "B-Trees and Indexes: From a Key to a Data Page"
category: "Database"
description: "Follow how a B-tree finds, inserts, and deletes keys in page-based storage; learn which queries an index supports, what it costs, and what its variants change."
updated: 2026-10-17
translationKey: "database/btree-indexes-and-maintenance"
---

Suppose a table contains hundreds of millions of orders. A query for `order_id = 4207` cannot scan every row and still respond reasonably. An index must narrow the search to a small number of page reads while remaining updateable as orders are inserted and deleted. B-trees are common because they keep keys ordered and remain shallow when each page holds many keys.

## Why not use an ordinary binary tree?

A binary search tree can find a key in O(log n) comparisons when balanced. In a database, however, small nodes scattered through memory can require many storage reads. For a database, fetching a page that is not cached is usually far more expensive than performing many comparisons in RAM.

If keys are inserted in increasing order into an unbalanced BST, the tree can become a chain: worst-case lookup grows from O(log n) to O(n). AVL/red-black trees use rotations after inserts/deletes to restore a height bound, but each node still has few children and each step may touch a separate location. A B-tree reduces levels by placing many separators in a page; one lookup can perform several comparisons in RAM after each page is loaded.

In RAM, a child pointer is usually an address that can be dereferenced directly. On disk, a structure commonly stores an offset or page ID; following a pointer to an uncached page makes the database read the whole page, not just the few bytes around a key. Packing several BST nodes into one page improves locality, but the tree still has low fan-out, and balancing may move nodes and require pointer updates. A B-tree shapes its nodes around page transfers: many separators fit in one page, reducing trips to storage.

A B-tree places many keys and child pointers in one node or page. A node may have hundreds of children, depending on key and page sizes. Its height is therefore usually small: a lookup goes from the root through a few internal pages to a leaf. O(log n) still describes the number of levels as the data grows, but the large fan-out is what keeps the number of page accesses low in practice.

### Separate page reads from comparisons

Suppose an internal page holds about 100 separators and a leaf page about 100 entries. For roughly one million entries, a root could point to about 100 internal pages, which point to about 10,000 leaf pages. A lookup touches about three pages if the root is not cached; each page needs a binary search of about `log2(100)`, or roughly seven comparisons in RAM. This is an illustration: separator size, occupancy, duplicate keys, and caching change real counts.

Thus `O(log n)` hides two different costs: page transfers are close to tree height, while total comparisons across nodes are also logarithmic in the number of keys. Root/internal pages are often hot in the buffer cache, so a real query may read only the leaf from storage; cache misses, I/O queues, and random reads still determine tail latency.

## When is it a B-tree, and when is it a B+ tree?

The name **B-tree** is often used for a family of multiway trees. In a general B-tree, keys and values may live in both internal and leaf nodes. In a **B+ tree**, internal nodes keep separators for routing while records or data entries live at the leaves. Every search reaches a leaf, so lookup time is consistent with tree height. Many database indexes called B-trees use rules close to a B+ tree; when tracing an operation, follow the implementation's convention.

If a node can hold at most `N` separators, it needs at most `N + 1` children. The tree maintains occupancy bounds; in many B-tree designs, a non-root node must stay at least about half full. The root is an exception because a small tree may consist of a single root/leaf. Exact thresholds depend on how “order” is defined and whether an engine counts keys or bytes. The important point is that nodes cannot become arbitrarily empty: occupancy bounds keep the tree shallow, while splits, borrowing, and merges restore those bounds after inserts and deletes.


An internal node does not need to contain complete records. It holds separator keys and pointers to children. For ranges `(-∞, 20)`, `[20, 50)`, and `[50, +∞)`, the search key determines the next child. A leaf holds the final index entries; an entry may contain a value, row identifier, or primary key depending on the storage engine.

An internal node with N separators needs N+1 child pointers to represent the range before the first key, ranges between keys, and the range after the last key. For example, separators `[20, 50]` define three ranges; without the final pointer there is no path for keys at least 50. Some implementations store that pointer separately in the header or represent the upper boundary with a high key; see [B-trees on disk](./btree-implementation-variants_EN.md).

To find key 42, compare it at the root, choose the range containing 42, descend, and repeat until reaching a leaf. If the leaf contains the key, the index returns the data or location needed to read the row. If not, the lookup ends after checking the appropriate leaf; it does not search every other page.

A common variant links leaves in order. This lets a range scan continue from its first matching leaf to following leaves instead of returning to the root for each key. B-trees therefore support more than equality lookups: they can help with `<`, `>`, `BETWEEN`, ordered prefixes, and `ORDER BY` when the indexed column order fits.

## Inserts can split pages

If a leaf has room, an insert places the key in order. If the page is full, the engine splits its entries across two pages and promotes a separator to the parent. If the parent is also full, the split can propagate upward. A root split increases the tree's height by one.

Suppose a page holds `[10, 20, 30, 40]` and has room for only four entries. Inserting `25` may produce leaves `[10, 20]` and `[25, 30, 40]`, then update the parent with an appropriate separator. Exact rules depend on the algorithm: B-trees and B+ trees differ in where they keep data keys, separator conventions, and leaf linking.

A split proceeds by finding the leaf and insertion point; allocating a page; distributing entries around a split point; placing a new separator and pointer in the parent; and completing the insert in the correct leaf according to that separator. If the parent is full, splitting continues upward; splitting the root creates a new root. In a B-tree internal split, a separator may be **promoted** as the boundary and removed from the child, while a B+ tree retains keys/values in leaves under its own convention. When reading an implementation, identify its convention before simulating the operation.

Inserting many keys in ascending order often behaves differently from inserting random keys. Bulk loading can build nearly full leaves in key order and reduce initial splits. Pages that are too full, however, may split more during later updates. Fill factor is a workload choice, not a universally optimal number.

### Trace one split and one borrowed key

Consider a small B+ tree whose leaves can hold at most three entries. After some inserts, its root has separator `30`, and its two leaves are linked: `[10, 20] → [30, 40, 50]`.

With a capacity of three, start from a leaf `[10, 20, 30]`. Inserting `40` temporarily gives `[10, 20, 30, 40]`; the tree splits into `[10, 20] → [30, 40]`, and the parent receives separator `30` under this B+ tree convention. Inserting `50` then makes the right leaf `[30, 40, 50]`. To search for `35`, compare it with `30` at the root, follow the right pointer, and confirm it is absent between `30` and `40`. A range from `18` through `35` starts in the left leaf, reads `20`, follows the sibling link, reads `30`, then stops before `40`.

Suppose ordinary nodes must hold at least two entries. Deleting `20` leaves `[10]` on the left, below the limit. If the right leaf has three entries, it can lend its smallest entry, `30`: the leaves become `[10, 30] → [40, 50]`, and the parent separator changes to `40`. If a sibling cannot lend but the leaves fit together, the tree merges them and removes the corresponding separator/pointer from the parent. If the parent then has too few entries, repair may continue upward; when the root has only one child, the tree can lose a level.

This trace teaches the invariants; it is not a specification for every B-tree. A classical B-tree may **promote** a separator and remove it from the child, while a B+ tree usually keeps the separator's key at the leaf and copies its boundary to the parent. Check leaf capacity, minimum occupancy, and separator rules before using a trace to reason about a specific engine.

## Deletes, merges, and empty space

Deleting a leaf entry does not necessarily return its page to the operating system immediately. The tree must preserve balance and may borrow a key from a sibling or merge pages when occupancy gets low. Under concurrent writes, the structure must also prevent a reader descending through the tree from following an invalid pointer. Some engines delay rebalancing or use other mechanisms to reduce synchronization.

When internal pages merge, the corresponding separator in the parent is commonly pulled down between the two child groups; the pointer to the removed page must also be deleted. Underflow can propagate upward just as overflow does during a split. If two siblings cannot fit together within capacity, redistribute entries and update the separator instead of forcing a merge.

Even when the tree remains logically correct, updates and deletes can leave underused pages, dead entries, or free space. Depending on the index type, the engine may need vacuuming, page compaction, merging, rebuilding, or other maintenance. Do not run a “rebuild” merely because a page is not full: first understand how the engine reclaims free space and what locks, I/O, or downtime the operation requires.

## Which queries can an index support?

B-trees suit operators that need key order: equality, ranges, prefixes with compatible collation, or sorting. A composite index `(tenant_id, created_at)` often supports conditions that begin with `tenant_id` and then filter or sort by `created_at`; it is not automatically equivalent to an index on `created_at` alone.

A **covering** index contains enough columns to return a result without reading the heap or table in some engines and situations. An index can reduce page reads for a query, but it increases storage, adds work to inserts and updates, consumes cache, and creates maintenance work. Every index should have a real workload to serve.

The optimizer is not guaranteed to use an index. If a query returns most of a table, a sequential read may be cheaper than many random lookups. Inaccurate statistics or skewed data can also lead to a poor row-count estimate. Inspect the execution plan and measure the workload before and after instead of treating the presence of an index as proof that a query is fast.

## Why engines organize trees differently

Some B-tree variants change update policies to reduce in-place writes or locking:

- A **copy-on-write tree** writes new pages during an update and then publishes a new root. Readers can keep using the old tree, but updates produce additional writes and old versions must be reclaimed safely.
- A **lazy B-tree** batches or delays some structural changes to reduce the number of pages written immediately; reads or maintenance must then handle accumulated state.
- **FD-trees and log-structured tree variants** use several sorted runs, batch writes, and merge later; they are closer to the LSM family than to a directly updated B-tree.
- A **Bw-tree** uses delta/update chains and atomic operations such as compare-and-swap to reduce node locking; it must periodically consolidate chains and reclaim memory safely.
- **Cache-oblivious layouts** arrange pages to exploit locality across cache levels without targeting one fixed cache size; results depend on workload and implementation.

These are design directions, not guarantees of every database called a B-tree. *Database Internals* discusses examples such as LMDB, WiredTiger, and the Bw-tree to show how the same goal of key lookup can trade off writes, synchronization, and page reclamation differently.

## B-trees are not every kind of index

Hash indexes optimize equality in a different way but do not provide range order. GiST, GIN, SP-GiST, and BRIN target different data domains or search methods. PostgreSQL documents them as access methods with their own operator classes; MySQL also has index types and rules that depend on the storage engine. We will study product-specific structures in each product topic instead of calling every index a B-tree.

## Check your understanding

**Why does a high-fan-out B-tree reduce storage reads?** Each internal page routes to many children, so one level covers far more keys than a binary tree level.

**Does an index on `created_at` guarantee that `ORDER BY created_at` is always fast?** No. The optimizer considers row counts, index order, filters, heap access costs, and statistics. Check the plan against real data.

**Can adding an index make a system slower?** Yes. Writes may update another structure, and the index consumes cache and storage. Create indexes when a workload justifies them.

Reading: *Database Internals*, chapters 2, 4, and 6; *High Performance MySQL*, chapter 5; [PostgreSQL B-trees](https://www.postgresql.org/docs/current/btree.html) and [examining index usage](https://www.postgresql.org/docs/current/indexes-examine.html).
