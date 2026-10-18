---
title: "PostgreSQL Snapshots, Anomalies, and HOT Chains"
category: "Database"
description: "Analyze lost updates, phantoms, write skew, snapshot visibility, savepoints, and page pruning."
updated: 2026-10-18
translationKey: "database/postgresql-snapshot-anomalies-and-hot-chains"
---

An isolation level describes which read/write histories transactions can observe. The name `REPEATABLE READ` alone does not reveal the implementation: PostgreSQL uses snapshot isolation at this level, while `SERIALIZABLE` tracks dependencies to prevent non-serializable histories. Examine concrete histories before choosing an isolation level.

## Anomalies through histories

**Non-repeatable read:** T1 reads row X, T2 updates/commits, then T1 reads again and sees a different value. **Phantom:** T1 reads a predicate-matched set, T2 inserts a matching row/commits, and T1 sees an extra row on reread. PostgreSQL `READ COMMITTED` takes a new snapshot per statement, so changes may appear between statements.

**Lost update:** two transactions read the same value and write computed results; the later update overwrites the earlier intent. Use atomic arithmetic updates, row locks, or optimistic version checks.

**Write skew:** T1 and T2 both read two rows satisfying an invariant, then update different rows and break the invariant even though they did not write the same row. For example, two doctors each see the other on duty and take leave; no one remains on call. Snapshot isolation can allow this; a constraint or SERIALIZABLE/explicit locking must protect the invariant.

## Visibility and a transaction's own writes

A snapshot records transaction-ID state: active at snapshot, committed earlier, or started later. A transaction's own tuple can be visible to itself before commit; another active transaction's row is generally not visible. Exported snapshots let transactions share one view, but the exporting transaction must follow the correct lifecycle and may hold back the vacuum horizon.

Virtual transaction IDs track transactions before a regular XID is needed; subtransactions/savepoints have their own state. A statement error inside a transaction block marks it aborted until `ROLLBACK` or rollback to a savepoint. A `COMMIT` after an error may end in rollback; applications must check state instead of assuming later statements continue normally.

## HOT chains and page pruning

A HOT update avoids new index entries if no indexed column changes and the new tuple fits on the same heap page. Indexes still point to the root tuple; the heap chain links versions. When old snapshots no longer need intermediate versions, page pruning can shorten the chain, update line-pointer redirects, and reuse dead tuples on the page. HOT does not apply when the page lacks space or an indexed column changes.

Repeated updates can create a chain of versions; a reader follows it to find the version visible to its snapshot. Pruning is constrained by the oldest snapshot and page pins/concurrent access. Vacuum works across the relation to clean heap/index state; page pruning does not replace vacuum.

### What pruning does on one page

Pruning is a quick, local cleanup that PostgreSQL can perform while reading or modifying a heap page. It is useful when a previous update could not find room on that same page, or when the page has used the space reserved for updates by `fillfactor`. `fillfactor` is the percentage of a page that INSERT aims to fill; for example, `fillfactor = 75` leaves room for new update versions. This is initial free space, not a promise that every update will be HOT.

Pruning examines one heap page and removes only versions that no snapshot still needs. A long-lived snapshot can keep an older version alive. When cleanup is safe, PostgreSQL can compact free tuple space, but it does not necessarily remove the line pointer: an index may still hold a TID to that slot. The line pointer can become `dead`, allowing an index scan to learn that the heap tuple no longer exists and mark the index entry dead after confirmation. Therefore, **tuple bytes may be reclaimed from the heap while the TID slot/index entry still needs a separate cleanup step**.

In the PostgreSQL 14 book's description, page pruning does not refresh the free space map or visibility map. The recovered space is held for updates on that page instead of immediately advertised as free space for INSERT elsewhere. This is a version-specific implementation detail; `VACUUM` is still needed to scan the relation, clean broader index state, and update maintenance metadata.

### Trace: free space, dead pointers, and an index scan

Suppose a page has `fillfactor = 75`, each row is fairly large, and we insert one row then update it repeatedly. Old versions initially remain because a snapshot may still need them; the current version also occupies space. When the page reaches its reserved-space threshold, the next update can trigger pruning before writing another version. Pruning reclaims bytes from safe old versions and compacts the free area, but old line pointers can remain in the `dead` state because indexes still point to their TIDs.

An index scan through those entries may first visit the heap to confirm that a TID points to a `dead` line pointer. Once it knows the entry cannot produce a visible row, the access method can record the index entry as dead to avoid repeating the heap fetch. The entry is not necessarily physically removed from the index page during that scan. This explains why the heap and index can show different states immediately after pruning: the heap tuple is gone, but an index reference remains until suitable cleanup.

### HOT turns many index entries into one heap chain

A HOT update needs both conditions: it must not change a column referenced by any index (including a column used by an expression index or a partial-index predicate), and the new version must fit on the same heap page as the old version. If either condition fails, PostgreSQL needs a new index entry for the new version; if the tuple moves to another page, a single index TID cannot follow a page-local chain.

When HOT applies, the existing index entry continues to point to the chain head. The tuple header uses `ctid` to link an older version to its successor. An older tuple has the **Heap Hot Updated** bit to say that traversal should continue; a new version not directly referenced by an index has the **Heap Only Tuple** bit. Each version is still checked against the snapshot: finding a chain does not mean returning its newest version regardless of snapshot. A long chain can require more tuple checks; pruning shortens history that is no longer needed.

| Property | Regular UPDATE | HOT UPDATE |
| --- | --- | --- |
| Index condition | May change an indexed column | Does not change any index-referenced column, including expression/partial indexes |
| New tuple location | May be on another page | Must fit on the same heap page |
| New entry in each index | Usually needs an entry for the new version | No new entry merely because a heap version was added |
| How the index reaches versions | Index can hold TIDs for relevant versions | Existing entry leads to the HOT chain in the heap |

A lower `fillfactor` can make same-page room for HOT more likely, but the table occupies more pages initially and the setting cannot help when the workload changes indexed columns. Measure `n_tup_upd` and `n_tup_hot_upd` in `pg_stat_all_tables`, inspect which columns the real indexes/predicates reference, and tune from the workload rather than lowering fillfactor by instinct.

### When a page runs out of room: a HOT chain splits

A HOT chain cannot cross heap pages. If the same page has no room for the next version, PostgreSQL may also be unable to prune because an old snapshot is holding back the horizon; the new update must move to another page and needs a separate index entry. The tuple on the old page ends its HOT chain, while the new tuple on another page starts a different chain. `ctid` may still show a physical link to the next tuple, but if the `Heap Hot Updated` bit is not set, the executor does not follow that link as a HOT chain. The index now has two entries, each pointing to a chain head on its own page.

This is why “the update does not change an indexed column” is not enough to guarantee HOT. Space must remain on that specific page, and old versions must be safe to prune. A long-running `REPEATABLE READ` transaction can retain versions pruning would otherwise remove; HOT effectiveness can fall even though every indexed value stays the same. Check both snapshot age/horizon and page space when investigating a low HOT ratio.

### B-trees have their own pruning before a split

Heap-page pruning and B-tree index-page pruning are different operations. Heap pruning cleans tuples/chains on one heap page. Index pruning cleans entries on a B-tree leaf page, often when an incoming index INSERT is about to force a split. A split can propagate to parent pages and grow the tree; deleting an entry later does not usually merge the two pages, so avoiding a split can prevent additional index pages.

The PostgreSQL 14 book describes two sources of removable entries. First are entries already marked dead by an index scan after checking the heap. If that does not free enough room, PostgreSQL can examine “promising” entries that are duplicate versions of the same logical row: it visits the heap to confirm that a version has passed the horizon and is no longer needed, then deletes it from the leaf page before splitting. Heap access costs something, so PostgreSQL checks suitable candidates rather than every entry; this trades a few visibility checks against a split and additional structure size.

In PostgreSQL 14, **simple deletion** uses the `LP_DEAD` flag left by an index scan; **bottom-up deletion** targets version churn from UPDATEs that do not logically change that index's key. Both are local, incremental cleanup and can defer a split; neither replaces relation-wide VACUUM or guarantees that every garbage entry is found immediately. Do not confuse “a B-tree can remove an entry when a split is imminent” with the index immediately shrinking to its minimum size.

### Pruning a HOT chain preserves its root with a redirect

An index needs a stable TID at the chain head. If pruning removes the first version referenced by an index entry, PostgreSQL cannot simply delete that line pointer. It can turn the root line pointer into a **redirect** to the new chain head; line pointers for intermediate versions with no remaining index reference can become `unused`, and tuple space can be compacted. The index still reaches the original root TID, and the heap redirects traversal to the first surviving version.

Distinguish these `pageinspect` states: `normal` points to a tuple, `dead` is a slot that cannot yet be discarded because a reference still needs handling, and `redirect` preserves the root TID while routing to the new HOT chain. `unused` is a slot available for reuse. Line-pointer state and index-tuple state are separate layers; do not infer that all cleanup is complete from one flag.

## Choose isolation from the invariant

Write the invariant first, then ask whether a single transaction can protect it. Unique/check/FK constraints are often strongest for expressible invariants. If logic reads many rows before deciding to write, use explicit locks, serializable isolation with retries, or a single-owner design. SERIALIZABLE may abort a logically valid transaction; retry the whole database transaction and avoid repeating external side effects.

*PostgreSQL Internals 14*, Part I, analyzes anomalies, snapshots, own changes, exported snapshots, subtransactions, HOT chains, and pruning. Compare [transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html), [snapshot synchronization](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-SNAPSHOT-SYNCHRONIZATION), and [HOT](https://www.postgresql.org/docs/current/storage-hot.html).


## Transaction histories to simulate yourself

### READ COMMITTED when an UPDATE must wait

At Read Committed, each statement gets its own snapshot. If T1 reads and locks a row, then T2 runs `UPDATE ... WHERE balance >= 100` and must wait for T1, PostgreSQL can follow the latest row version after T1 commits and reevaluate the `WHERE` condition. If the predicate no longer holds, T2 skips the row; otherwise it applies the update to the new version. This behavior matters: the statement does not simply overwrite an old snapshot, but multi-statement business logic can still create anomalies when an invariant spans several rows.

At Repeatable Read, the snapshot lasts for the transaction; if T2 wants to update a row changed since its snapshot, PostgreSQL generally raises a serialization failure rather than silently applying it. But two transactions that write different rows can still produce write skew. At Serializable, SSI tracks rw-dependencies; if a dependency pattern risks a cycle, one transaction aborts. A serialization failure is a valid outcome of the mechanism, not corrupt data.

### XIDs, snapshots, and tuple versions

A snapshot has XID boundaries (`xmin`/`xmax`) and a list of active XIDs between them. An XID below the boundary does not by itself prove commit: the transaction may have aborted; commit status is read from transaction status and hint bits may cache that result on the page. Tuple `xmin`/`xmax` values are not wall-clock timestamps. The current transaction's tuples are handled specially so it can see its own writes.

An update chain connects physical versions through `ctid`; an index may point to one version/chain entry, and the heap determines which version is visible to a snapshot. `VACUUM` can remove a version only when no valid snapshot needs it. Therefore, a long `idle in transaction` or exported snapshot can block cleanup even when no query is currently running.

### Distinguish cleanup and rebuild operations

A HOT update requires that no indexed column changes and that space remains on the same heap page. Pruning shortens chains/line pointers within a page when snapshots and pins allow it; regular VACUUM scans the relation to clean index references and reclaim reusable space. Freezing handles XID age, a different goal from bloat cleanup. `VACUUM FULL` writes a new heap and needs a strong lock; `CLUSTER` reorders the heap by an index and also rewrites it; `REINDEX` rebuilds an index without rewriting the heap; an online rewrite tool such as pg_repack must synchronize changes and needs extra disk. Choose an operation by its goal instead of calling them all “compaction.”

Read *PostgreSQL Internals 14*, Part I (pp. 45–168), alongside [PostgreSQL 14 HOT](https://www.postgresql.org/docs/14/storage-hot.html), [PostgreSQL 14 B-tree deletion](https://www.postgresql.org/docs/14/btree-implementation.html#BTREE-DELETION), [the HOT source README](https://github.com/postgres/postgres/blob/REL_14_STABLE/src/backend/access/heap/README.HOT), [the B-tree source README](https://github.com/postgres/postgres/blob/REL_14_STABLE/src/backend/access/nbtree/README), [transaction isolation](https://www.postgresql.org/docs/14/transaction-iso.html), [snapshot synchronization](https://www.postgresql.org/docs/14/functions-admin.html#FUNCTIONS-SNAPSHOT-SYNCHRONIZATION), and [routine vacuum](https://www.postgresql.org/docs/14/routine-vacuuming.html).

## Check your understanding

**Can snapshot isolation have write skew?** Yes; transactions update different rows but jointly break an invariant they read.

**Can a transaction see its own uncommitted writes?** Yes; snapshots treat the current transaction's changes specially.

**Does HOT pruning replace vacuum?** No; pruning cleans a local page chain, while vacuum performs broader maintenance.
