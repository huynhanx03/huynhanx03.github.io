---
title: "On-Disk B-Trees: Splits, Merges, and Variants"
category: "Database"
description: "Study separator keys, page split/merge, bulk loading, and tradeoffs of copy-on-write, lazy, FD-tree, and Bw-tree designs."
updated: 2026-10-17
translationKey: "database/btree-implementation-variants"
---

B-trees reduce page reads: each node holds many keys, giving high fanout and low height. But an insert can fill a page, split it, and propagate a separator to the parent; deletes can leave sparse pages that need merging/redistribution. On disk, the algorithm balances I/O, write amplification, concurrency, and recovery.

## Separators and lookup

An internal page stores separators dividing key ranges and child pointers. Lookup starts at the root, binary-searches a separator, and follows a child to a leaf. A range scan finds the first leaf and follows sibling links. Taller nodes and long keys reduce fanout; prefix compression among adjacent keys saves space but adds decode CPU.

## Propagating splits

When a leaf fills, the engine distributes keys across two pages, updates sibling links/high keys if used, and inserts a new separator into the parent. A full parent splits in turn; propagation may reach the root and create a new level. Increasing-order appends often make the rightmost page hot; a 50/50 split can leave the left page full and the new right page nearly empty. Bulk loading sorts first and builds levels in batches to improve page density.

Deletes can redistribute from a sibling or merge. Merging lowers tree height but writes multiple pages and the parent; lazy deletion defers cleanup to reduce writes. Fragmentation and free-space reuse depend on the engine. Updating a variable-size key can move a cell/overflow and trigger unexpected splits.

### Follow one split

Suppose a leaf can hold at most three keys for illustration, currently `[10, 20, 30]`, and we insert `25`:

1. Search from the root to the leaf using separators, then detect that the page is full.
2. Allocate another page and distribute the four sorted keys, for example left `[10, 20]`, right `[25, 30]`. The exact distribution depends on split policy and record byte sizes.
3. Update sibling links/high keys if the implementation uses them to keep searches correct while the parent is not yet updated.
4. Insert a separator representing the boundary between leaves into the parent. Search for `25` must choose the right page; a range scan following sibling links must still see every key in order.
5. If the parent is also full, repeat the split upward. If the root splits, create a new root and increase tree height by one.

A concurrent reader may be following the old path when a split occurs; latch coupling, sibling links/high keys, or versioned page mappings are part of correctness. Recovery must also know which split steps completed if a crash occurs midway. B-link, COW, and delta designs differ in how they publish changes while preserving ordered search.

## Page metadata controls navigation

A page header commonly stores page type/level, cell count, free-space boundaries, and status flags; a magic number or version helps detect a page read with the wrong type/format. A checksum detects some corruption but does not repair data. Header interpretation is engine-specific, so never edit database-file bytes directly.

A slotted page may keep cells in insertion order while a slot-offset array preserves logical key order. Binary search operates on the sorted array: choose the middle slot, dereference its offset to read the key, compare, and narrow the remaining half. This avoids moving every cell when inserting in the middle, but each comparison adds indirection and the slot array still needs updating.

An internal node with N separators usually has N+1 child pointers: the final pointer has no separator after it. An implementation can store that rightmost pointer in the header; a B-link tree can instead represent a node's upper bound with a **high key** plus a sibling pointer. If a search reaches an old node after a split and its key exceeds the high key, it moves to the right sibling. This lets concurrent splits remain searchable without requiring every reader to immediately return to the updated parent.

### When should a node use a rightmost pointer or a high key?

A node with `N` separators must route to `N + 1` children. The final pointer has no separator paired with it, so an implementation must represent it separately. One option is to store a **rightmost pointer** in the page header. If the rightmost child splits, the parent inserts a separator for the new boundary and replaces its rightmost pointer with the new page on the right; every child pointer must still route to the correct key range.

Another option uses a **high key** as the upper bound served by the current page, together with a link to its right sibling. If a reader follows an old parent path and reaches a page whose high key is below the target key, it moves to the sibling. This lets the reader finish a lookup while the parent is being updated. Bidirectional links also support moving backward, but a split/merge must update the current page's `next` and the next sibling's `prev`; that is a cross-page write and may need another latch/lock. A high key does not replace the parent's separator: the two mechanisms cooperate during the transition after a split.

## Large keys/payloads and overflow pages

Pages have fixed sizes while keys/values may be variable length. If a large payload can consume an entire page, a node may run out of bytes before reaching its entry-count limit. Some formats cap inline payload and link overflow pages; the chain must manage links, free space, and reclamation when a record is replaced/deleted. Search often keeps enough key material on the main page for comparison, while fetching a large record requires visiting the overflow chain.

For example, a 4 KiB B-tree page can hold dozens of short keys but only a few long payloads. Keeping every payload inline reduces fanout and can increase tree height; spilling payload keeps navigation nodes smaller but adds I/O to fetch the value. If nearly every record is a large blob, a dedicated object/blob store may fit better than treating overflow as free.

## Breadcrumbs, rebalancing, and fast appends

To split a leaf and update its parent, the engine needs a path upward. It can store parent pointers (which must be repaired when a parent splits/merges) or retain **breadcrumbs** in a stack while descending from root to leaf. The stack records visited nodes/child positions and is popped to propagate a split upward. If a parent changed concurrently, a saved position may be stale; revalidate the key/range before using it.

Before splitting/merging, an engine can move entries between siblings to improve occupancy. A B*-tree may redistribute two full nodes into three nodes at roughly two-thirds occupancy; the tradeoff is locking/updating more siblings and separators. Monotonic auto-increment keys can enable a **right-most fast path**: if each insert is greater than the current keys, the engine may operate on a cached rightmost leaf instead of searching from the root again. This optimizes append workloads, not random keys or updates.

With sorted input, bulk loading writes leaves page by page and builds parent levels bottom-up; it can write the entire leaf level before constructing parents, avoiding ordinary splits/merges during loading and keeping only the path from the leaf being filled to the root in RAM. An immutable tree can fill pages more completely because it does not need spare room for future updates; a mutable tree usually leaves space to reduce later splits.

A monotonically increasing insert has a **fast path** when its key exceeds the keys in the rightmost leaf and that page has room: the engine can use the cached rightmost leaf without reading the path from the root again. If the rightmost page is full and every new key is still the largest, some implementations such as quick-balance can allocate a new rightmost leaf instead of splitting the page into two halves. The new page starts sparse but subsequent appends are expected to fill it. This helps only when data really arrives in order; a late insert with a smaller key needs the normal search and split path.

Page compression has a different tradeoff: compressing each page allows independent reads/decompression, while compressing a whole file may require decompressing a large region to find one page. A compressed page smaller than a transfer block may still cause the device to read extra bytes from that block; a page spanning multiple blocks may require another read. Compression increases cache/I/O density but consumes CPU and memory for compressed/decompressed buffers. Choose based on block size, access patterns, and measurements on real data.

## Fragmentation and page reclamation

A deleted cell or one shadowed by a newer version may still occupy bytes on a page. While a reader/transaction can still see that version, the engine cannot safely overwrite it; once no reader needs it, the cell becomes reclaimable garbage. Removing a slot pointer makes a cell unreachable from the tree but does not gather scattered free regions. Total free bytes can therefore be sufficient even when no contiguous region is large enough for an insert.

Compaction/vacuum reads live cells, rewrites them in logical order, updates slots/offsets, and writes a new page. A completely empty page may enter a **free page list/freelist** for reuse; freelist metadata must be durable and recovered consistently after a crash, or one page could be allocated to two records. Rewriting a page may also change its physical location, so every external pointer must use indirection or be updated according to the engine's rules.

Maintenance has a cost: page reads/writes, contention, WAL, and possible latency impact. Track page splits, index size, dead tuples/garbage, free-space reuse, and latency, then choose rebuild/vacuum behavior by engine. Backup/recovery must protect metadata/freelist changes so a page is not allocated to two objects after a crash.

## Variants shaped by the write path

**Copy-on-write** writes new nodes instead of overwriting old ones, then swaps the root pointer; snapshots can read the old root safely, but an update rewrites multiple nodes and old versions must be reclaimed. LMDB is an mmap/COW example.

**Lazy B-trees** accumulate changes in deltas/buffers and apply them in batches; they reduce random writes, but reads reconcile deltas and compaction can create spikes. WiredTiger uses version-specific update structures.

**FD-trees** keep a small hot component and multiple sorted runs; fractional cascading helps search across runs. Writes are more sequential, while read/merge amplification rises.

**Bw-trees** map logical page IDs to physical pages and use immutable delta chains; CAS updates avoid ordinary page latches. Chains need consolidation/GC, mapping updates can contend, and crash consistency remains complex.

**Cache-oblivious trees** use recursive layouts such as van Emde Boas to work across block sizes without knowing page size in advance; implementation/updates are more complex than a standard B-tree.

## Three axes for reading a storage engine

The opening of *Database Internals* compares storage structures with three questions: where does **buffering** defer or batch writes; does **immutability** overwrite old data or create new versions/files; and does **ordering** keep keys sorted for range access? These are independent axes, not mutually exclusive engine categories.

Buffering reduces immediate write amplification by combining changes, but may move work to flush or compaction. Immutability lets readers keep using a stable version and often permits denser pages, but old copies must be reclaimed and deferred write amplification may appear later. Dropping order makes append simple, as in Bitcask; preserving order supports range scans but requires sorting/merging, as in an LSM tree. COW is a useful exception: it creates new immutable pages while copying and updating a path to preserve B-tree order.

When choosing a design, mark all three axes and ask where the workload can afford to pay: foreground writes, reads, temporary space, or maintenance. This lens explains new designs as combinations of familiar ideas rather than as unrelated names to memorize.

## What work does each variant move?

### Copy-on-write: publish a new root

When a leaf changes, COW copies that leaf and each ancestor on the path to the root; unchanged branches are reused. A writer builds a new tree beside the old one and atomically publishes its root. A reader already in progress can keep using the old root without seeing a half-updated page; new readers use the new root. Pages used only by the old version can be reclaimed after its readers finish.

For example, updating one key in a four-level tree usually creates at least the pages on that path instead of overwriting pages currently used by readers. The tradeoff is temporary page duplication, write amplification along the tree height, and tracking readers/versions so pages are not reclaimed too early. LMDB is a memory-mapped COW example; an append-style design without sibling links may need to ascend to a parent to find the next leaf during a range scan. COW simplifies reader synchronization, but it does not mean independent writers can publish concurrently without coordination.

In the *Database Internals* description, LMDB accesses data directly through a memory map, copies branch pages on the root-to-leaf path, and retains the current root plus the root being built by a transaction. Old readers keep using the old version; its pages are reused only after those readers finish. This describes one LMDB design and does not imply that every COW engine can omit page caches, WAL, or checkpoints.

### How is a node update represented in memory?

An engine can edit bytes in a cached/mapped page directly; materialize the page as an object/native struct and serialize on flush; or use a wrapper that changes the backing buffer as methods run. An object representation can simplify logic but holds both bytes and objects in RAM; a direct buffer avoids a copy but requires careful alignment, lifetime, and concurrent-access control. Keeping the file image, cached page, and in-memory representation as separate lifecycles also allows updates to be buffered and reconciled later.

### Lazy B-tree: buffer and reconcile later

One way to avoid immediate page updates is to materialize a page into a separate in-memory structure and keep deltas in an update buffer. In the WiredTiger-style design described by the book, a read combines the base page with its update buffer to see recent state; on flush, reconciliation merges changes into a page image and may split it if it grows too large. A background thread handles structural work so foreground requests need not immediately write every page.

The LA-Tree extends this idea with subtree buffers: inserts enter a buffer near the root; when it fills, changes are batched down a level; at leaves, many changes are applied together. Batching reduces random I/O and repeated splits, but lookups must consider buffers along the path or merge state, and flushes create background work spikes. Measure read amplification and flush latency alongside write throughput.

### FD-tree: a head tree plus sorted runs

An FD-tree keeps a small mutable head B-tree and immutable sorted runs. When the head fills, records move into a run; merges proceed through size-growing levels to bound the number of runs. Deletes are recorded as tombstones that hide older items in lower runs; a tombstone can be discarded only after compaction has passed every copy it shadows.

Searching several runs may require a binary search at each level. Fractional cascading adds bridges/fences: after a search in an upper level, a pointer leads near the target in the next level, reducing repeated search. Bridges use space and must be rebuilt during merges. The design trades random page updates for sequential append/merge, but pays with read/space amplification and compaction—tradeoffs shared with LSM trees.

Think of the levels as sorted arrays. Binary-search the upper array; near the target, a bridge points into a small interval in the next array. The lower level does not need a full search from the beginning, and the gaps between bridges are bounded by sampling elements from a lower level into the upper one. For example, with `[12, 24, 25, 30, 32, 34, 39]` and `[16, 22, 25, 26, 28, 30, 35]`, searching for `28` first narrows the upper array to the area around `25–30`; a bridge starts the next search near the corresponding region. The bridge elements and pointers cost space and must be rebuilt when runs merge.

### Bw-tree: delta chains and a mapping table

A Bw-tree keeps an immutable base node and prepends a new delta node for each update. A logical page ID goes through an in-memory mapping table to resolve the latest physical base/delta. A writer creates a delta and uses compare-and-swap to replace the mapping pointer; if two writers expect the old pointer, only one CAS succeeds and the other rereads and retries. A reader reconstructs node state by applying deltas from newest to base.

When a chain gets long, consolidation creates a new base and updates the mapping. A split can publish a sibling through a split delta before the parent is updated; readers follow that link so they do not miss keys. A merge also needs a phase that publishes combined contents before changing the parent. Old pages cannot be freed immediately because lock-free readers may still hold pointers; epoch-based reclamation waits for readers from the older epoch to finish. “Lock-free” node updates do not remove contention, retries, structural modifications, or garbage collection.

A structural modification operation (SMO) still takes several steps. For a split, the engine consolidates deltas to learn the current contents, creates a sibling, appends a split delta with a separator/link to the old node, and only then installs the child pointer in the parent. Between the last two steps, a reader may encounter a half-split and follow the sibling link. A merge first links the right node's contents into the left node, then removes the right-child link from the parent. Threads may encounter an unfinished SMO and help complete it; an abort delta on the parent serializes competing splits/merges. This coordinates through immutable states and CAS; it does not make every structural change a single CAS.

### Cache-oblivious: layout across cache levels

A cache-aware B-tree chooses node/page size for one transfer unit; a cache-oblivious layout aims to work well without hard-coding block/cache-line size. A van Emde Boas layout recursively places related subtrees in contiguous regions; a dynamic structure can use a packed array with gaps placed according to a density threshold. Inserts move elements to create gaps; a region is rebuilt when density is too high or low. This is an idea for multi-level locality, but updates/relocation and practical implementation are complex, so it is not automatically a production choice.

## Compare where the cost is paid

| Design | Where do writes pay? | Where do reads pay? | Cleanup |
| --- | --- | --- | --- |
| COW | Copy path and temporarily retain old versions | Reader chooses a root version | Reclaim after old readers finish |
| Lazy buffers | Background batch flush/reconciliation | Merge base with delta buffers | Reconcile, split/merge |
| FD-tree | Append runs and compact across levels | Search several runs; bridges reduce repeated work | Merge tombstones and runs |
| Bw-tree | Append deltas and CAS the mapping | Replay the delta chain | Consolidation and epoch GC |
| Cache-oblivious | Relocate/rebuild regions when density shifts | Locality from recursive layout | Rebuild packed regions |

No design removes work; it moves work among foreground writes, the read path, and maintenance. Choose based on read/write balance, tail latency, concurrency, memory, crash recovery, and space-amplification limits.

No variant wins every workload. COW fits snapshots/read concurrency, lazy/delta structures fit append-heavy or buffered writes, and standard B-trees offer predictable access. Evaluate p99, storage amplification, recovery, range scans, and compaction too.

*Database Internals*, chapters 2, 4, and 6, analyze basic B-trees, page split/merge, and variants (LMDB, WiredTiger, FD-tree, Bw-tree, cache-oblivious). See also [B-tree indexes and maintenance](./btree-indexes-and-maintenance).

## Check your understanding

**Why is a separator promoted after a leaf split?** It creates a boundary that lets searches choose the correct child.

**Does a COW update write only one page?** It usually writes nodes along the root-to-leaf path and then swaps the root.

**Does a lazy update eliminate write amplification?** No; it defers/batches writes, while merge/reconciliation still occurs.
