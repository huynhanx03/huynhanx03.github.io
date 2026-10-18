---
title: "PostgreSQL Index Pages and Maintenance"
category: "Database"
description: "Understand B-tree deduplication, Hash overflow, GiST/SP-GiST routing, GIN posting lists, and BRIN summaries."
updated: 2026-10-17
translationKey: "database/postgresql-index-structures-and-maintenance"
---

PostgreSQL indexes implement an access method through a common interface, but page layouts and search semantics differ. An operator class defines key comparison/consistency; the access method manages pages, concurrency, and vacuum integration. Thus the same index type can use different operator classes for different semantics.

## Hash and B-tree

A Hash index stores hash values and fits equality; collisions require a heap-value recheck. Buckets gain overflow pages as data grows; bucket splits increase capacity. It has no ordering for range scans.

B-tree pages contain pivots/separators at internal levels and items at leaves; sibling links support range scans. Inserting into a full page can split it; concurrent searches use high keys/right links to route correctly while a split is incomplete. Deduplication can compress duplicate keys into a leaf posting list/TID array, reducing size for low-cardinality columns; unique indexes have no duplicates to exploit.

## GiST and SP-GiST

GiST is a framework for balanced search trees whose operator class supplies `consistent`, `union`, `penalty`, `picksplit`, and optionally distance. With bounding boxes, a parent stores regions covering children; a query tests regions and may recheck heap tuples. Good penalty/split choices reduce overlap and search branches. GiST supports exclusion constraints when the operator class defines conflicts.

SP-GiST partitions non-overlapping space using tries, radix trees, quadtrees, or k-d trees. Internal nodes route to partition children; it fits partitionable data. Skew may create deep/unbalanced trees; choose an opclass for data shape.

## GIN for full text, arrays, and JSON

GIN is inverted: an element/lexeme maps to a posting list of heap TIDs. For a multi-token query, it combines posting lists and rechecks semantics. A posting tree stores long lists. `fastupdate` may buffer inserts in a pending list to amortize writes; vacuum/cleanup merges it, and queries can slow when the list grows.

`jsonb_ops` indexes general key/value operator classes; `jsonb_path_ops` is smaller for a narrower set of containment operators and does not support every same query. Array containment and full text use other operator classes. `pg_trgm` adds trigram support for similarity/LIKE/ILIKE patterns, with selectivity depending on the string.

## BRIN summaries

BRIN stores summaries for consecutive heap-block ranges, such as timestamp min/max. A query can eliminate ranges whose summary cannot match; remaining ranges need heap rechecks (lossy). Summarization can happen on insert or through `VACUUM`/`brin_summarize_new_values`; `pages_per_range` trades index size against false positives. Minmax, minmax-multi, inclusion, and bloom opclasses fit different data.

## Maintenance and method choice

Indexes can bloat, become invalid after a failed `CREATE INDEX CONCURRENTLY`, or have stale statistics. Track `pg_stat_user_indexes`, `pg_stat_progress_create_index`, size, query plans, and vacuum. `REINDEX` rewrites an index; concurrent builds reduce write blocking but take longer/more disk and have phases. Do not retain duplicate indexes just because they “might help”; each adds write amplification and cache footprint.

*PostgreSQL Internals 14*, Part V, describes each access method; current references: [index types](https://www.postgresql.org/docs/current/indexes-types.html), [B-tree](https://www.postgresql.org/docs/current/btree.html), [GIN](https://www.postgresql.org/docs/current/gin.html), [GiST](https://www.postgresql.org/docs/current/gist.html), [SP-GiST](https://www.postgresql.org/docs/current/spgist.html), and [BRIN](https://www.postgresql.org/docs/current/brin.html).


## Reading Part V in depth: each access method makes a different promise

### Hash: buckets, overflow, and load-driven splits

A hash index maps a value to a 32-bit hash code and then looks up the corresponding bucket. The original value is not stored in the hash table, so a collision can return a TID whose heap row does not match; PostgreSQL must recheck it. This is an equality index: it cannot provide ranges or ordering, and a hash code cannot enforce uniqueness.

A bucket may need overflow pages as entries accumulate. PostgreSQL grows the table through split points instead of doubling the whole structure immediately: metadata tracks bucket count, split progress, and page allocation; bitmap pages help allocate overflow pages. A skewed hash distribution or many collisions create long overflow chains and slower reads/writes. Hash indexes have been WAL-logged since PostgreSQL 10, but that does not make them the default: B-tree usually supports more query shapes, while Hash is worth considering only when an equality workload is measured and the index is actually smaller or faster.

At the page level, the metapage is block 0; each bucket has a primary bucket page and may link to overflow pages, while bitmap pages mark empty overflow pages for reuse. Entries are ordered by hash code within each page for binary search, but a multi-page chain has no global order. On a split, the system adds a bucket and uses an additional hash-code bit to redistribute entries from the selected bucket. A hash index does not reduce its bucket count after deletes: VACUUM removes dead entries and may shorten chains, while reclaiming the footprint usually requires rebuilding the index. A foreground split can raise the latency of an INSERT.

The metapage also stores an estimated `ffactor` (target entries per bucket), `maxbucket`, masks, and allocated-page metadata. In the book's example, `highmask` produces a candidate bucket number; if it exceeds `maxbucket`, `lowmask` maps it back to an existing bucket. This lets the index add buckets through incremental splits instead of moving every entry whenever the table doubles. New primary pages are allocated in chunks, so physical block count can grow in bursts even while the logical bucket count grows gradually. `ffactor` depends on page size and fillfactor; it is an estimate, not a guarantee that every bucket holds exactly that many rows. Duplicates/skew can overflow one bucket before the total row count reaches a balanced threshold.

A Hash operator class supplies the hash function for a data type and the matching `=` operator. An extension that adds a type needs a compatible operator class/family so the planner knows which equality operation can use the index. PostgreSQL 14 access-method capabilities can be summarized as follows:

| Capability | Hash index |
| --- | --- |
| Equality and bitmap/index scans | Yes; bitmap scans still recheck heap rows |
| Ranges, ordering, clustering, index-only scans | No |
| Unique index, multiple key columns, `INCLUDE` | No |
| Exclusion constraint with `=` | Yes; it can enforce a no-equal-keys invariant, but it is not a unique index |
| `NULL` keys and searching inside arrays | Not supported by the access method described in the book |

The subtle point is that Hash cannot declare `UNIQUE`, yet it can be used in an exclusion constraint with `=`. This is a constraint capability provided by the access method/operator class; it does not turn the index into an ordered structure or provide uniqueness through the normal unique-B-tree mechanism. For ordinary unique keys, use a unique B-tree. Hash supports regular and bitmap index scans; a bitmap path returns heap tuples for rechecking. The book's `pageinspect` examples help examine metapage, bucket, overflow, and bitmap pages, but internal layout inspection is for learning/diagnosis on the matching version, not a stable API.

### Trace: why adding a bucket cannot remove skew overflow

Suppose an index starts with two buckets and an `ffactor` of roughly 307 entries per bucket. Insert 500 rows with the same key: they have the same hash code, so all 500 TIDs land in one bucket. The primary page holds as many as fit; the rest use an overflow page. Adding a bucket does not spread identical keys apart.

Now insert 115 different keys. There are 615 entries, above the two-bucket target of 2 × 307, so the index adds a third bucket and splits one bucket. The distinct keys distribute among buckets according to hash bits; the 500 duplicate rows remain together. This trace separates two causes that are easy to confuse: total volume grows the bucket table, while a skewed value creates an overflow chain in that particular bucket.

### B-tree: search, ranges, splits, and operator classes

Internal pages hold pivot keys that select a child; leaves hold keys and heap TIDs. Equality descends to the matching leaf. A range query finds its starting point and follows sibling links until it passes the upper bound. PostgreSQL can split a full page; the high key and right-link let a search move to the correct sibling when a split has happened but the parent has not yet been updated. Because concurrent inserts can split several levels, the algorithms preserve page consistency while limiting long locks.

A pivot does not need the complete key: suffix truncation removes trailing data that is unnecessary to distinguish branches. Non-unique leaf keys can be deduplicated into one key and a posting list of TIDs; the benefit depends on the operator class's equality semantics and duplicate distribution. The operator class defines comparison/ordering and lets the planner use `<`, `=`, `>`, ranges, sorting, or patterns. If collation or comparison operators are outside the index's operator family, the planner cannot use the index as expected. `(a ASC, b DESC)` has a specific ordering and is not equivalent to a differently directed multicolumn index.

### From a condition to a path through the tree

A B-tree is balanced: every leaf is at the same depth. Each page holds many pivots/entries, so trees are usually shallow. An internal pivot selects a child by a half-open interval, `pivot_i ≤ key < pivot_(i+1)`. An equality search descends from the root to a leaf and searches within that page. Duplicate keys can span several leaves, so a scan must keep following siblings while equal values remain. For a range, it finds the first bound once, then walks linked leaf pages in the required direction. This is why a B-tree supports both equality and ordered sequences.

An insert locates a leaf by key order. If the page lacks room, a split moves some entries to a new page and updates the parent; a full parent can split in turn, and splitting the root can increase tree height. PostgreSQL links siblings at every level so traversal can remain correct while the structure changes. VACUUM/pruning can remove dead entries before a split, but the implementation does not merge two sparse pages afterward; a page split can therefore leave a lasting footprint. Pages need not stay full, and depth/cost depend on key width, fillfactor, duplicate rate, and churn.

Each page has a fixed block size. The metapage identifies the current root and level; the root page can change after a split. A page that is not rightmost at its level has a high key, an upper bound for its keys. If a concurrent split occurs before the parent points to the new page, the right-link and high key let a search move to the sibling. The high key is stored where page operations can use it efficiently, not as an ordinary final key. An internal pivot needs only enough information to route to a child; suffix truncation removes trailing attributes that are unnecessary after a leaf split. A leaf still needs the full key, TID, and any `INCLUDE` payload required for index-only scans.

### Deduplication and operator classes

When a leaf lacks space, PostgreSQL can collapse multiple entries with the same key into one posting tuple containing a list of TIDs. It delays deduplication until space is needed, avoiding work when there is no immediate benefit. This helps non-unique indexes with many duplicates and can also reduce split pressure when an index still references several MVCC row versions. `deduplicate_items` controls the behavior. Deduplication requires equality semantics compatible with the byte image, so some types—such as floating point, `numeric`, `jsonb`, composite/range/array types, nondeterministic collations, and indexes with `INCLUDE`—cannot use it. Inspect `allequalimage` in the metapage for a specific index; do not assume every operator class can deduplicate merely because values repeat.

A B-tree operator class defines five strategy operators: `<`, `<=`, `=`, `>=`, and `>`, plus a comparator that returns -1/0/1. The index, `ORDER BY`, merge joins, and grouping all rely on this ordering rule. A new type may need a natural order different from its default, so the book defines a comparator for composite `capacity(amount, unit)` values by converting them to bytes. Then `(1, 'MB')` is greater than `(512, 'kB')`, although lexicographically comparing the fields would not produce that result. The operator class must keep the comparator consistent with all five operators; otherwise the index can return a wrong order or the planner can apply a condition incorrectly.

### Column order, direction, and NULLs

A multicolumn B-tree orders keys lexicographically: first by column 1, then by column 2 when column 1 is equal. Thus `(book_ref, passenger_name)` can efficiently find a contiguous range for a booking reference and then narrow it by passenger name; a filter on `passenger_name` alone does not identify a contiguous tree range. PostgreSQL 14 did not implement B-tree skip scan to replace a condition on `b` with repeated searches for each distinct value of `a`. If the workload often searches by passenger name, an index beginning with `passenger_name` is a different structure for that query.

An `(a ASC, b ASC)` index scanned forward returns both columns ascending; scanned backward it returns both descending. It cannot directly return `a ASC, b DESC`; that needs a matching direction or an additional sort. The default NULL ordering is `ASC NULLS LAST` and `DESC NULLS FIRST`; a different `NULLS FIRST/LAST` requirement can prevent the planner from using the index order. An already sorted prefix can still help `Incremental Sort`, but sorting within each group remains necessary.

In PostgreSQL 14, B-tree can order values, enforce uniqueness, contain multiple key columns, support equality exclusion constraints, and carry `INCLUDE` columns. It supports regular, bitmap, and backward scans, plus clustering. It is the only core access method that can enforce unique values and provide general ordering. Per-column properties describe direction, NULL order, orderability, returnability, and searches for multiple elements/NULLs. Inspect them with `pg_indexam_has_property`, `pg_index_has_property`, and `pg_index_column_has_property`; these are capability descriptions, not a promise that the planner will choose the index for every query.

### Trace: which queries does one composite index serve?

With `CREATE INDEX ON ticket (booking_ref, passenger_name)`, entries are ordered by booking reference first. A query for one booking reference can find a contiguous leaf range; adding passenger name narrows within that range. `WHERE passenger_name = ...` alone has no bound on the leading column, so the tree cannot jump directly to those names. Changing the index to `(passenger_name, booking_ref)` reverses which query has a contiguous search path.

If the index is `(passenger_name ASC, booking_ref ASC)`, a backward scan satisfies both columns DESC. A query for `passenger_name ASC, booking_ref DESC` needs mixed directions; the planner may use the index for the passenger-name prefix and run incremental sort for booking reference. If it also requests `passenger_name NULLS FIRST`, the default index order may not match and a different sort plan may be required. Check the exact `ORDER BY`, NULL policy, and filters with `EXPLAIN`; column names alone do not determine whether an index fits.

### GiST: bounding predicates and nearest-neighbor search

GiST is a balanced-tree framework. Each internal entry stores a predicate covering the values in its child subtree. A query uses a consistency function to decide which subtrees might match; broad predicates force more branches to be visited. With an R-tree for points, the predicate is often a bounding box: a box outside the query region lets the scan skip the subtree. If it intersects, the heap row may need rechecking because the box is an approximation.

The operator class defines how `union` builds a parent predicate, `penalty` measures the cost of inserting into a branch, `picksplit` divides a page, and `consistent` filters a query. Smaller, less-overlapping boxes improve the tree; repeated inserts/updates can broaden predicates and reduce selectivity, so a rebuild or different partitioning may be needed. Distance support enables nearest-neighbor ordering; exclusion constraints use an operator class to reject conflicting pairs, such as overlapping booking ranges. The same access method can have different semantics under different operator classes.

Connect each support function to an operation: a query calls `consistent` on entries; insertion uses `penalty` to choose a child; when a page fills, `picksplit` divides entries and `union` updates ancestor predicates. In an R-tree, a parent predicate is a rectangle covering child points. A region query skips a subtree when its box does not intersect the query; overlapping boxes create false positives that the heap must verify. The book's RD-tree for full text builds a bit signature for each document and ORs signatures at parent nodes. Since a bit can represent multiple lexemes, a matching signature does not prove that a document contains the query term. These traces show why split quality and predicate selectivity determine how many pages a search reads.

#### R-trees: from geographic points to region queries

For 2D points, a leaf entry is a point and an inner entry is a bounding box covering its child points. A query for points inside a circle/rectangle starts at the root and visits subtrees whose boxes intersect the query; overlapping boxes force extra branches to be checked. At the leaves, the operator class checks the actual point. An R-tree cannot promise a single branch like a B-tree, and a broad box can turn a selective query into many page reads. `penalty` commonly estimates how much a bounding box's area grows when a point is inserted; `picksplit` tries to create small child boxes with little overlap. `union` builds the parent box covering all children. These are heuristics: no split is optimal for every query shape.

In GiST, block 0 is the root rather than a separate metapage. If the root splits, the old root becomes a child page and block 0 is rewritten as the new root. `pageinspect` can show pages/entries; an external extension such as `gevel` can interpret some structures in greater depth. Internal layout inspection is a learning/diagnostic tool for the matching major version, not a stable API.

#### Nearest neighbors: a safe lower-bound ordering

`ORDER BY point <-> target LIMIT k` is a k-nearest-neighbor (KNN) query, not a boolean filter. The operator class supplies an ordering operator and a distance function. For a leaf point, the distance is exact. For an inner bounding box, distance must be a lower bound: the distance from the target to the box, or zero if the target lies inside it. A lower bound may be smaller than the distance to every child point, causing extra branches to be visited; it must never be larger than the true distance, or the engine could skip a closer point and return a wrong result.

The access method visits branches with the smallest lower bound first, keeps the best candidates, and can stop when every unvisited branch has a lower bound larger than candidate k. Since an index scan returns rows incrementally, `LIMIT` can stop early instead of sorting the whole table. KNN works only when the operator class declares suitable distance ordering. GiST over ranges may support overlap/containment without providing distance ordering. Check whether the plan shows `Order By` on the Index Scan; otherwise the planner must sort candidates by another path.

#### Exclusion constraints and practical capabilities

GiST supports exclusion constraints because an operator class can define when a pair of rows conflicts under a commutative operator. For example, a reservation can use `EXCLUDE USING gist (during WITH &&)` to forbid overlapping time ranges; points/circles can forbid airports that are too close. The constraint creates the corresponding index and checks it with writes. For multiple columns, geometry overlap can be combined with `city WITH <>`; `btree_gist` supplies GiST operator classes for scalar types so these conditions can coexist. Using `btree_gist` only to imitate scalar equality/range is usually worse than B-tree; its value is combining scalar conditions with another GiST condition in one index/constraint.

| Capability in PostgreSQL 14 | GiST |
| --- | --- |
| General ordering / uniqueness | No |
| Multiple key columns / `INCLUDE` / exclusion constraints | Yes, subject to operator class and operator |
| Regular index scan / bitmap scan / backward scan | Yes / yes / no |
| Cluster by index / index-only scan | Clustering is possible; index-only depends on the opclass returning the full key |
| NULL and KNN distance | NULLs are stored but can hurt selectivity; distance exists only when the opclass provides it |

A NULL does not widen a bounding predicate, so GiST can place it in any subtree and must search the whole tree when looking for NULL. Do not infer that every opclass supports index-only scans just because GiST can: `returnable` and `distance_orderable` are per-column/operator-class properties.

#### Signature RD-trees for full-text search

A `tsvector` is a document normalized into lexemes and positions; a `tsquery` combines lexemes with `&`, `|`, and `!`, while `@@` checks a match. Stemming/stop-word configuration must match between vector creation and queries. For a generated column, call `to_tsvector` with an explicit configuration so the expression is immutable and reproducible. An expression index avoids storing the vector, but GiST rechecks must rebuild it for each heap row; a stored generated `tsvector` uses more space but avoids that recomputation.

GiST full text uses an RD-tree (Russian Doll): a parent predicate is a set of lexemes covering the sets in all child documents. Listing every lexeme in a large node can exceed the page, so the operator class commonly uses a bit-signature. Each lexeme sets a bit based on its hash; a document signature ORs its lexeme bits, and a parent signature ORs its children. If a query requires a bit that is absent, the document can be rejected; if all required bits are present, it is only a candidate because unrelated lexemes may collide into the same bits. Signatures therefore allow false positives but no false negatives, and GiST must heap-recheck every candidate. A longer signature reduces collisions/rechecks but enlarges the index; a shorter one saves disk while reading more irrelevant rows. Increase `siglen` only when measured recheck/I/O costs justify the extra disk.

A query with several rare terms often produces few candidates; a common term matches many signatures. With `EXPLAIN (ANALYZE, BUFFERS)`, compare `Rows Removed by Index Recheck`, actual rows, buffer reads, and index size before/after changing signature length. Trigram (`pg_trgm`) also uses GiST signatures for similarity/LIKE/ILIKE; selectivity depends on the string and pattern. Other operator classes extend GiST to geometric/cube, range/multirange, inet, `ltree`, `hstore`, integer arrays via extensions, and scalar types via `btree_gist`. The same GiST method has different capabilities, precision, NULL behavior, and KNN support under each operator class.

### SP-GiST: partition space without requiring balance

SP-GiST (space-partitioned GiST) is a framework for partition trees: each node divides a value domain into non-overlapping regions, then routes each value to one region. “Space” means the set of values managed by an operator class; it does not have to be Euclidean coordinates. Quadtrees, k-d trees, and radix tries can all use this framework. The tree need not be balanced. In return, the data's natural structure and the partition rule determine its depth and how many pages a query must read.

#### From a query to a leaf

An inner node stores a prefix or split point and links to child nodes. A link may carry a label, such as a quadrant or the next byte. A leaf stores either the full value or its remaining suffix, together with a TID pointing to the heap row. During a search, `inner_consistent` selects children that could still match; `leaf_consistent` checks the final candidate. During insertion, `choose` selects an existing child, requests a new child, or reports that the current prefix no longer fits so the framework can split the node. When a leaf page fills, `picksplit` divides its entries into new groups.

The framework handles low-level details such as pages, concurrency control, and WAL; the operator class defines the meaning of prefixes, partitions, and checks. Each node has a lower fanout than a B-tree, so page packing has a noticeable effect on reads. In SP-GiST, one page can contain several inner nodes, so logical nodes and physical pages do not have a one-to-one relationship. Leaves belonging to one inner node reside on one page; when it fills, the leaf list can move to another page or be split, but one leaf group is not spread arbitrarily across multiple pages. The framework reuses free space, and the metapage caches recently used pages to reduce allocation work. Page 0 is the metapage, page 1 is the root of the main tree, and NULL values have a separate tree beginning at page 2. The metapage does not contain a root pointer. `pageinspect` does not provide an SP-GiST inspection interface equivalent to those for some other access methods; the book mentions `gevel` as an external extension for examining its structure.

#### Quadtrees and k-d trees for points

With `quad_point_ops`, a 2D plane is divided into four quadrants around a centroid. A point exactly on a boundary is assigned consistently to the lower-numbered quadrant. An inner node has up to four children in a fixed array, so some slots can be empty. A query for “points north of point X” descends only into quadrants that might contain a match; at a leaf, the index checks the predicate against the actual point.

The operator class illustrates `config`, `choose`, `picksplit`, `inner_consistent`, and `leaf_consistent`. When a leaf page fills, the example chooses a new centroid from the average point coordinates, then redistributes points among four quadrants. This attempts to separate data but does not guarantee balanced groups: a dense or skewed cluster can create a long branch. A quadtree fits natural spatial partitioning; inspect depth and actual buffer use rather than assuming the tree is always balanced.

`kd_point_ops` uses a k-d tree: each node splits at a value on one axis, then alternates y/x; in k dimensions it continues through the axes. Nodes usually have two children, and the split value is the prefix. Splitting repeats until each part fits a leaf page. A k-d tree avoids four slots for each split, while a quadtree partitions two axes at once; actual performance depends on point distribution and query shape.

#### Radix trees for strings

SP-GiST `text_ops` groups a shared prefix in an inner node. Each child link is labeled with the next byte, and a leaf stores the remaining suffix. A string can be reconstructed by concatenating the prefixes, labels, and suffix along its path, so some index-only scans can return a value even though the leaf does not contain the entire string. This compresses common leading text, but strings are processed as bytes and node prefixes have their own storage cost; do not interpret a byte as a Unicode character or assume every collation has the same ordering.

Prefix lookups fit a radix tree better than general range scans. Byte-order pattern operators such as `~<~`, `~<=~`, `~>=~`, and `~>` can constrain branches for a pattern like `LIKE 'ivan%'`; this does not follow ordinary collation rules. With a non-`C` collation, character comparisons may not be equivalent to byte comparisons. The `^@` operator expresses starts-with directly and is a clear choice for prefix queries when the operator class supports it. The index does not make every `LIKE` or range query cheap: a leading wildcard, collation order, and the number of matching branches all matter. When an inserted string no longer matches an existing prefix, the tree splits the common prefix at the point of divergence and creates links for the next byte.

#### Capabilities and data types

SP-GiST capabilities depend on the operator class. For the book's point quadtree, the access method supports index scans, bitmap scans, and exclusion constraints; it does not support unique, multicolumn, backward scans, or clustering. The column has no general ordering for `ORDER BY`, does not support array searches, but does support NULL searches through a separate tree. `quad_point_ops` can return values and supports distance ordering/KNN; `text_ops` can reconstruct values but does not support distance ordering. Therefore, do not infer KNN support from the access method name alone.

Other examples in the book show the framework applied to different domains: `box_ops` treats rectangles as points in 4D, which can create 16 partitions; `poly_ops` routes by bounding boxes and needs rechecks because a bounding box does not precisely represent a polygon; `range_ops` treats an interval's two bounds as a 2D point; and `inet_ops` uses a radix tree. For geometric “spaghetti data” with many overlapping objects, SP-GiST's non-overlapping partitions can avoid some of GiST's broad branches. Choose based on the operator class, recheck rate, and actual workload. PostgreSQL 14's properties table and operator-class list are the final checks before designing an index.

### GIN: an inverted index for values with multiple components

GIN (Generalized Inverted Index) fits values that contain multiple independently searchable components: lexemes in a `tsvector`, elements in an array, or keys and values in `jsonb`. Instead of ordering the whole value as a B-tree does, GIN stores each component once and maps it to the rows containing it. This is like the index at the back of a book: look up a word to get the pages where it appears; here, the list contains heap tuple IDs (TIDs).

#### Entry tree, posting lists, and page layout

The entry tree is ordered by key. Each key points to an ordered TID posting list. A short list stays in the entry; a long one moves to its own posting tree. Because TIDs are ordered, they can be compressed as differences from the preceding TID. A GIN entry tree does not store the full document or array. The key tree and TID posting tree are distinct structures with different jobs.

In the book's example, internal nodes omit the lowest separator key because it is redundant; a high key still marks the upper boundary. Siblings at the same level form a one-way chain because traversal proceeds in one direction. `pageinspect` can show metapage information, page flags, and entry leaves; the metapage tracks entry/page counts and pending-list state. A leaf entry can represent many compressed TIDs rather than one TID. When an entry or posting tree page overflows, it is split and keys/TIDs are redistributed.

A key need not be removed from the entry tree immediately when its posting list temporarily becomes empty: that key may appear in another row later. This explains why GIN is designed for repeated keys and why cleanup/vacuum matters. Do not assume that deleting a row immediately removes every trace of its keys from the index structure.

#### Operator classes turn values into keys

GIN is a general framework; an operator class decides which parts of a value become keys and how those keys establish a query condition. Conceptually, `extractValue` decomposes a row value into keys; `extractQuery` decomposes a query into search keys; a comparison function orders keys; and a consistency function decides whether the keys found can satisfy the predicate. Partial search requires an additional comparison for prefixes/partial keys. `consistent` can return a candidate that needs rechecking; `triConsistent` can also distinguish keys known to be present, absent, or unknown, allowing earlier rejection. Function names in implementation code can vary by version, but these roles are the operator-class contract.

Because GIN sees extracted keys rather than the original item, consistency may require a heap recheck. If a query has no key that must be present—for example, a negation—an operator class may need to examine almost every item. This is why negative-only predicates are usually harder for GIN to accelerate than a query containing a rare positive term.

#### Trace a full-text query

For `tsvector @@ tsquery`, GIN extracts lexemes from each document at insert time and search keys from each `tsquery` at read time. For `everywher | oink`, it finds postings for both lexemes, merges their ordered TIDs, and lets consistency interpret the OR to retain candidates. The tree handles keys and membership; the operator class supplies the meaning of `&`, `|`, and `!`.

Term frequency determines much of the work. In the book's `farm & cluck` example, six rows contain `farm` but only two contain `cluck`. GIN can use `cluck` as a mandatory key, then check whether `farm` is present only at those TIDs; it can skip lower TIDs and posting ranges that cannot contain a result. For `farm & (cluck | chick)`, it must choose mandatory keys so the logic remains correct; one rare lexeme may not be enough. A common term such as `wrote` can still produce hundreds of thousands of matches, so an index cannot eliminate the cost of reading a large result set.

GIN supports lexeme prefixes in `tsquery`, such as `pig:*`; the operator class performs partial matching over the ordered keys. On real workloads, use `ts_stat` to inspect document frequencies and measure with `EXPLAIN (ANALYZE, BUFFERS)`, since what counts as rare or common depends on the data.

#### Writes and fast update

One row can produce many keys. An insert or update therefore touches many entries and posting lists, and writing each change directly into the tree can cause many random page writes. `fastupdate` accumulates new changes in a pending list outside the entry tree. Searches examine both the main tree and the pending list; when the list is merged into the tree, concurrent searches must still avoid returning duplicate results. Once the pending list crosses its threshold, cleanup moves entries into the tree in a batch. This reduces routine write cost but can create latency spikes and slower queries when the backlog is large. Vacuum/autovacuum can help with cleanup; disabling `fastupdate` does not merge an existing backlog by itself.

The threshold is affected by `gin_pending_list_limit` globally or by the index storage parameter. A fresh index build also batches keys in `maintenance_work_mem`; more memory can speed the build, subject to the overall maintenance memory budget. For diagnosis, track pending-list size, cleanup duration, keys per row, lexeme frequency, and write amplification. GIN often fits read-heavy workloads better than write-heavy ones; updating a long document can modify many posting lists.

#### Bitmap results and capabilities

GIN returns results through a bitmap rather than one TID at a time. Therefore, the access method does not support ordinary index scans or backward scans, but it does support bitmap index scans. `LIMIT 1000` does not mean the index only needs to build the first 1,000 TIDs: the bitmap may have to be built almost completely before the heap scan applies the limit. GIN also provides no ordering, unique constraint, exclusion constraint, or INCLUDE columns. Multicolumn GIN is supported, but column order is not a B-tree-style prefix: each key is associated with its column number. For full-text GIN, the document is absent from the index, so an index-only scan cannot return the original document.

`gin_fuzzy_search_limit` can make GIN randomly skip some results to approach the requested count. Results are approximate and may vary between executions; the planner does not account for this as exact query semantics. Do not enable it when the application needs the complete result set. It is not equivalent to SQL `LIMIT`.

#### Full text, trigrams, arrays, and JSONB

A full-text GIN index supports lexeme membership but does not preserve lexeme positions in the document. It therefore does not itself accelerate phrase conditions based on word distance or provide relevance ordering. PostgreSQL may recheck a phrase condition on the heap; scoring many candidates also costs time. RUM is an external extension the book uses to illustrate another trade-off: in the implementation described by the book, it has no deferred updates like GIN, so it supports regular index scans and ordering operators. It also attaches extra information such as lexeme positions to each key to speed up phrase search and ranking. In exchange, the index is larger, updates are slower, and the extension’s generic WAL path adds write cost compared with built-in WAL. These are properties of the implementation discussed in the book; check the extension version before applying them to a current system.

`pg_trgm` decomposes strings into trigrams to support LIKE/ILIKE, regular expressions, and similarity. These searches commonly produce candidates that need rechecking; selectivity depends on the pattern and strings. For languages with multibyte characters, an internal trigram representation cannot always be decoded back into the original characters. Trigrams fit fuzzy/substring search; they do not replace full-text language analysis.

`array_ops` indexes individual elements and supports overlap `&&`, contains `@>`, contained-by `<@`, and equality `=`. A contains condition can filter by requiring the query's elements to appear, but equality must also verify that there are no extra elements, so bitmap heap scans commonly recheck. In the book's flight-day example, an array `{2,4,7}` indexes only its elements; many rows sharing them can make a broad candidate set. `btree_gin` adds operator classes that simulate scalar comparisons so ordinary columns can be combined with arrays in a multicolumn GIN, but it does not make scalar comparisons more efficient than a B-tree. Use it only when a multicolumn GIN solves a real workload need.

For `jsonb`, the default `jsonb_ops` creates entries for keys, values, and array elements. It supports containment, key-existence operators (`?`, `?|`, `?&`), and the JSONPath operators listed in the documentation. `jsonb_path_ops` supports fewer operators; it hashes each path from the document root to a value, so a condition such as `{"days_of_week": [6]}` looks up that path/value combination instead of combining the key `days_of_week` with value `6` wherever they occur. This is often more selective and produces a smaller index for containment/path queries, but it does not support standalone key-existence checks. Hash collisions still require rechecks. Choose an operator class by comparing all operators the application needs, not only index size.

Extensions such as `intarray`, `hstore`, and `btree_gin` add operator classes for particular data types. The chapter also mentions `jsquery` and RUM as external options; for PostgreSQL 14 JSONPath and core operators, first check whether built-in support meets the requirement.

### BRIN: use summaries to skip block ranges

BRIN (Block Range Index) divides the heap into consecutive groups of pages. For each group, the index stores a summary of its values instead of a TID for every row. A query uses summaries to eliminate groups that certainly cannot contain a match; the remaining groups are returned in a lossy bitmap, and the heap must check the actual rows. BRIN is therefore like a filter that helps a sequential scan skip much of a table, not like a B-tree that finds each row precisely.

BRIN fits very large tables when values are localized by physical position: nearby rows have similar summary properties. For dates or increasing IDs, values should correlate with page order. A multi-terabyte table with shuffled data may gain little; a small table or a query returning most of it may be cheaper with a sequential scan. The book loads flight data roughly in time order and queries one day; the index is only a few hundred kilobytes on a multi-gigabyte table, while a B-tree is much larger but filters more precisely. Those measurements illustrate one dataset's trade-off, not a general promise.

#### Page layout and the query path

Page 0 is the metapage, which stores the range size and structural metadata. The revmap (range map) maps a range number to its summary tuple; summaries live on other pages. When the revmap needs another page, it can occupy space previously used for summaries, moving those tuples elsewhere. `pageinspect` provides `brin_metapage_info`, `brin_revmap_data`, and `brin_page_items` to inspect these parts.

During a scan, BRIN walks the revmap and summaries. If a summary might match, every heap page in that range is added to the bitmap; the bitmap is always lossy because BRIN does not keep a TID for every row. An unsummarized range must also be treated as a possible match so data is never missed. The heap is then read sequentially by range, with possible prefetching. `Rows Removed by Index Recheck`, lossy heap blocks, and buffer reads in `EXPLAIN (ANALYZE, BUFFERS)` show how many extra rows/pages still need checking.

`pages_per_range` selects how many heap pages one summary represents. Smaller ranges produce more summaries and a larger index, but tighter boundaries; larger ranges save space but usually scan more pages. The book measures multiple days, uses `EXPLAIN (FORMAT JSON)`, and compares the distribution of buffers/efficiency rather than choosing from one lucky query. Tune against real queries, including time-window size, value frequency, and the fraction of heap pages read. There is no single best range size for every table.

#### How summaries are updated

An insert into an already summarized range calls the operator class's add function. If the new value falls outside the current min/max, the summary must widen. If the summary tuple has room, it is updated in place; otherwise BRIN writes a new tuple and updates the revmap. A range without a summary cannot be eliminated, so correctness is preserved while the query scans extra pages.

New ranges are usually summarized during VACUUM or by calling `brin_summarize_new_values`/`brin_summarize_range`. Autosummarize can request a new range be summarized as soon as pages appear, but this slows row-by-row ingestion. Autosummarize sends requests through autovacuum, so the work can be delayed. After a bulk load, inspect and summarize new ranges if the workload needs BRIN promptly.

Summarization does not lock the table against writes. The book describes an implementation using a placeholder tuple: it is inserted before the scan, and concurrent changes are merged into the summary after the scan. This is an internal detail, not an API guarantee across minor releases. PostgreSQL 14.20 fixed an autosummarization bug for expression indexes that need a snapshot; the old bug could leave placeholder tuples behind and bloat the index. If summaries are missing or an index grows unexpectedly, check the release notes for the exact minor version and inspect range state before concluding that data is wrong. Unsummarized ranges must still be scanned, so matching rows are not skipped.

A normal summary only widens; it does not shrink automatically after DELETE or when data order changes. PostgreSQL MVCC can place a new row version into a free page in the middle of the table; even a modest number of updates can make a range's min/max very broad. Lowering table `fillfactor` can leave space for updates near the old row, but enlarges the heap and does not prevent every case. If a summary has become too broad, a range can be desummarized and summarized again; do this only when measurements show that range is causing excess scans. BRIN best fits append-heavy or rarely updated data such as event tables and analytical warehouses.

#### Minmax: ordered values and physical correlation

`minmax` stores the minimum and maximum for each range. For `x >= a AND x < b`, a range can be discarded only when `[min,max]` certainly does not intersect `[a,b)`. Rows within a retained range still need rechecking. Minmax is therefore strongest when page order roughly matches value order. `pg_stats.correlation` is a useful signal; the book measures timestamps near 1.0 in the sequentially loaded table, while flight numbers/passengers near 0 make minmax poorly selective. High correlation with only a few repeated values may still be insufficient.

Smaller `pages_per_range` improves precision at the cost of a larger index. Evaluate representative queries at multiple points in the data distribution and compare heap blocks, recheck rows, index size, and latency. A multicolumn BRIN keeps independent summaries for each column but shares one range map/range size; separate indexes can also be combined by the planner with `BitmapAnd`. Use a multicolumn index when its columns need the same range size; separate them when they need different settings.

#### Minmax-multi: retain several value clusters

One min/max pair becomes broad quickly when a range contains distant clusters or updates/backfills place new values in the middle of the file. `minmax-multi` retains several small points/intervals in each range: the main cluster stays tight, and an outlier does not force the whole summary to become one huge interval. It helps when physical order has local correlation but is no longer one simple run.

The `values_per_range` parameter limits how many points/endpoints the summary retains; once the limit is reached, intervals are reduced/merged. In PostgreSQL 14, the default is 32 and the allowed range is 8 to 256. More values enlarge summaries and the index, but often preserve selectivity. The book tries 16 values for date data after updates degrade ordinary minmax. Choose using the workload and the limits of the PostgreSQL version in use; increasing the setting does not always make queries faster.

#### Inclusion: summarize with a bounding domain

`inclusion` is for types with containment/bounding relationships but no useful linear order. The summary is a union that covers every value in the range: a bounding box for `box`, or an enclosing domain for range/network types. A query such as “point inside this area” can discard a range only when its bounding summary certainly does not intersect the query; a broad bounding box creates many false positives.

The book builds a BRIN expression index on `box(airport_coord)` to illustrate coordinates, then shows the planner still choosing a sequential scan when correlation statistics are insufficient. Disabling `enable_seqscan` only exposes a bitmap index plan for the lesson; it does not make the index a good production choice. Inclusion needs a suitable query, data shape, and cost estimate. Inspect `Rows Removed by Index Recheck`; if many rows are extra, scanning the whole table may be cheaper.

#### Bloom: probabilistic membership per range

A Bloom summary hashes the range's values into a bit signature. If a queried value requires a bit that is not set, the range certainly does not contain it; if all required bits are set, it might, so the heap still needs a recheck. Bloom allows false positives but no false negatives. It supports equality and can help when values have poor ordering/correlation but each range has a manageable number of distinct values.

The operator class options are `n_distinct_per_range` (estimated distinct values per range) and `false_positive_rate` (target false-positive probability). In PostgreSQL 14 the defaults are `n_distinct_per_range = -0.1` (scale the estimate by row count, with a minimum of 16 values) and `false_positive_rate = 0.01`; the allowed probability is 0.0001–0.25. Given `n` distinct values and a target false-positive probability `p`, a Bloom signature needs roughly `m = -n ln(p) / (ln 2)^2` bits; the optimal hash-function count is approximately `(m/n) ln 2`. This model explains the trade-off; BRIN exposes sizing through operator-class options. A larger signature lowers false positives but increases index size. If a range has more distinct values than estimated, the filter saturates and eliminates fewer ranges. The book uses nearly uncorrelated `flight_no` values, estimates distinct values per range, and compares two, four, and eight pages per range. Base the setting on observed distinct counts and workload; smaller ranges also enlarge the index.

Do not confuse BRIN Bloom with the `bloom` extension: BRIN builds one filter per summarized column and block range; the extension has its own access method and can hash several columns of a row for ad hoc equality queries. They solve different problems.

#### Access-method capabilities

In PostgreSQL 14, BRIN does not order results and does not support unique, exclusion, or INCLUDE; it does support multicolumn indexes. It scans through bitmaps only, without ordinary TID-by-TID index scans, backward scans, or clustering. A column can support NULL searches; BRIN does not return a value for index-only scans or order by distance. A table's good physical order does not mean BRIN benefits from `CLUSTER`; rewriting an enormous table can cost substantial time and space.

### How to learn from the book's examples

For each access method, the book moves from the query to the page: which operators are supported, what metadata/page stores them, how search chooses a branch, how insertion changes the structure, and how rechecks/updates affect cost. Inspect operator classes in catalogs and use `EXPLAIN (ANALYZE, BUFFERS)` on representative data. `enable_seqscan=off` can expose an index path in a lesson, but it is not a production tuning method.

See the versioned [PostgreSQL 14 Indexes](https://www.postgresql.org/docs/14/indexes.html), [index access methods](https://www.postgresql.org/docs/14/indexes-types.html), [B-tree implementation](https://www.postgresql.org/docs/14/btree.html), [GiST](https://www.postgresql.org/docs/14/gist.html), [SP-GiST operator classes](https://www.postgresql.org/docs/14/spgist-builtin-opclasses.html), [GIN operator classes](https://www.postgresql.org/docs/14/gin-builtin-opclasses.html), [GIN extensibility](https://www.postgresql.org/docs/14/gin-extensibility.html), [BRIN overview and maintenance](https://www.postgresql.org/docs/14/brin-intro.html), [BRIN operator classes and parameters](https://www.postgresql.org/docs/14/brin-builtin-opclasses.html), [BRIN extensibility](https://www.postgresql.org/docs/14/brin-extensibility.html), [PostgreSQL 14.20 release notes](https://www.postgresql.org/docs/14/release-14-20.html), and [Hash](https://www.postgresql.org/docs/14/hash-index.html).

## Check your understanding

**Does GIN store rows in table order?** No; it maps tokens/elements to posting lists.

**Can BRIN usually avoid heap rechecks?** No; its lossy summaries only eliminate ranges that cannot match.

**What do B-tree high keys/right links help with during a split?** A search can move to the correct sibling while the parent has not yet been fully updated.
