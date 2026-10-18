---
title: "PostgreSQL Tuples, Pages, and TOAST"
category: "Database"
description: "Read heap-page and tuple structure, visibility maps, and how PostgreSQL stores large values."
updated: 2026-10-18
translationKey: "database/postgresql-tuples-pages-and-toast"
---

PostgreSQL stores heap tables in fixed-size pages, usually 8 KiB in a default build. A page contains a header, line pointers, and tuples; a line pointer lets a tuple move within the page while an index still points to a stable slot. An index points to a TID made of a page number and offset/slot, not a fixed byte address.

## What does a heap tuple contain?

The tuple header stores the transaction IDs that created and deleted the version (`xmin`, `xmax`), flags, null information, and the start of the data. Columns follow schema order with alignment; column order can therefore affect padding and size, although reordering is no substitute for sound type choices. NULL values are represented in a null bitmap, rather than always occupying a full value area.

`xmin` is the XID of the transaction that created a tuple version. When a version is deleted or superseded by an `UPDATE`, `xmax` receives the XID of the transaction that performed that operation. Thus, `xmax = 0` usually means no transaction has deleted this version; if `xmax` is nonzero, PostgreSQL still has to check whether that transaction committed or aborted and when the current snapshot began. `xmin` and `xmax` are not wall-clock timestamps. PostgreSQL documentation and source code often abbreviate transaction as **xact**.

### How the tuple header records visibility checks

The header has flag bits that tell PostgreSQL whether it already knows the transaction status associated with `xmin` or `xmax`. For example, `xmin_committed` and `xmin_aborted` describe the tuple creator; the corresponding `xmax` bits describe the deleting or replacing transaction. If the status is not known, PostgreSQL checks the active-transaction list in `ProcArray` and the commit status in the **commit log** (`pg_xact`). `pg_xact` is transaction data in the data directory, not a system-catalog table that applications update with SQL.

After checking the status, PostgreSQL can cache the result in the tuple header as a **hint bit**. These bits are confirmed hints that let later reads avoid another `ProcArray`/`pg_xact` lookup. The transaction inserting a row cannot mark its final outcome in advance because it does not yet know whether it will commit or abort. A later transaction may be the first to confirm the status and dirty the page in the buffer cache. A read-only `SELECT` can therefore sometimes cause a page to be written: it updated a hint bit, not the row's logical data.

When inspecting a page with `pageinspect`, a new tuple may show `xmin` without `xmin_committed` because its creating transaction is still active. `xmax = 0` can appear with the `xmax_aborted` bit set: this marks the dummy value “no deleting transaction,” not evidence that a delete happened and was rolled back. These bits are internal details; use them to understand and diagnose behavior, not to make applications depend on bit masks that may change between versions.

### COMMIT and ROLLBACK do not immediately rewrite every tuple

PostgreSQL records commit/abort status in `pg_xact`. When a transaction commits, PostgreSQL does not necessarily rewrite every tuple page immediately just to update its hint bits. A later ordinary access may look up the status and set the hint bit. When a transaction aborts, PostgreSQL likewise does not visit every page to erase bytes it wrote; it marks the transaction aborted. Tuples it created become invisible, while an aborted `xmax` written to an older tuple is ignored. Pruning or VACUUM can reclaim physical space when safe.

Keep two effects separate: **ROLLBACK changes the logical result visible to other transactions**, while **reclaiming bytes from the heap happens later**. Hint bits are a recomputable cache; they do not replace the authoritative transaction status in `pg_xact`. PostgreSQL still uses WAL to protect committed data changes according to the durability configuration; a hint bit is written safely only when WAL guarantees the required commit record is durable before the page containing that bit. So “ROLLBACK does not immediately erase the tuple” does not mean “PostgreSQL skips crash recovery.” The table below illustrates tuple visibility, not a measurement of physical page state:

| Operation | Old tuple | New tuple | Logical result after completion |
| --- | --- | --- | --- |
| `INSERT` then `COMMIT` | — | `xmin = X`, X committed | The row is visible to a suitable snapshot. |
| `DELETE` then `COMMIT` | `xmax = X`, X committed | — | A new snapshot no longer sees the row; an older snapshot may still need the old version. |
| `DELETE` then `ROLLBACK` | `xmax = X`, X aborted | — | The delete has no effect; the old version can remain visible. |
| `UPDATE` then `COMMIT` | `xmax = X` | New version has `xmin = X` | Old and new snapshots can select different versions. |

A transaction that writes `xmax` on a row can also make another transaction wait before it can modify the same row. In the actual header, `xmax` can represent a deleting/updating transaction, a row lock that did not delete the row (`lock-only`), or a MultiXact when there are multiple lockers; flag bits determine how to interpret it. Thus `xmax` participates in visibility checks and row locking. Do not infer “the row has been deleted” merely because a value appears in `xmax`.

PostgreSQL implements MVCC by adding a tuple version instead of overwriting a version another transaction may still see. An `UPDATE` is often similar to deleting the old version and inserting a new one. An index entry can continue to point at an old tuple until vacuum removes a version that is no longer visible. This is why frequent updates can bloat tables and indexes even when the logical row count stays constant.

### An index does not choose a row version for the snapshot

An index entry does not carry `xmin`/`xmax` to decide whether a row version is visible to the current transaction. It stores a key and a TID into the heap; when one logical row has multiple versions, the query checks the heap against its snapshot. An index scan can therefore find an old TID and still have to skip the tuple because that version is dead to this snapshot.

For example, transaction A at `REPEATABLE READ` keeps an older snapshot and reads account `id=7`. Transaction B updates `balance`, creating a new heap version. A's snapshot can still see the old version; a snapshot started after B commits selects the new one. The index does not contain separate `xmin`/`xmax` pairs for these two snapshots: the heap tuple header and transaction status determine the result. If B changes an indexed column, the index needs an entry for the new key; the old entry can remain until no snapshot needs it and vacuum can remove it.

If only a non-indexed column changes and the new tuple fits on the same heap page, PostgreSQL can use a **HOT update**: it avoids adding an entry to every index; the existing entry leads to the HOT-chain root, and the heap follows the chain to find the visible version. If there is not enough room or an indexed column changes, HOT does not apply and indexes must be updated. Page pruning can shorten the chain after intermediate versions are no longer needed.

An index-only scan is a conditional exception: it can skip the heap only when the index contains all needed columns and the visibility map marks the page all-visible. If that bit is not set or was cleared by a write, the executor must still check the heap. Thus “index-only” depends on vacuum/visibility state, not just the index definition.

## Pages, free space, and visibility

A heap page uses `pd_lower`/`pd_upper` to separate metadata from free space; line pointers locate tuples. When a tuple is deleted, its space is not necessarily returned to the filesystem immediately. Vacuum can mark a line pointer reusable and update the free space map (FSM), helping INSERT find a page with room. The FSM is an estimate used to select pages; rapid changes can make it need correction.

The visibility map has all-visible and all-frozen bits per page. All-visible can make index-only scans safe; all-frozen lets vacuum skip tuples already frozen. A change on a page can clear its all-visible state, so writes can reduce index-only scan opportunities even when the index itself is unchanged.

## TOAST for large values

A tuple cannot grow arbitrarily beyond a page: PostgreSQL does not split one heap tuple across the next page. For varlena columns such as `text`, `bytea`, `jsonb`, and some arrays, PostgreSQL can compress a value, move it out of the main tuple (out of line), or do both. The main tuple then keeps a small pointer; the external value is divided into chunks in a TOAST table associated with the main table. The book says a table with potentially toastable attributes normally gets its own TOAST table when created, even if no value is currently large enough to use it.

TOAST starts working when a row exceeds the target size needed to let a page hold multiple rows. With the default 8 KiB page, the book uses a target of about one quarter of a page after subtracting the header, roughly 2 KiB; this is a heuristic for the version described in the book, not a hard SQL limit. PostgreSQL compresses or moves eligible attributes until the row fits the target. The data type selects a default storage strategy; inspect it with `\d+` in `psql` or `pg_attribute.attstorage`.

| Strategy | Behavior |
| --- | --- |
| `plain` | Neither compress nor move out of line; used for types that do not need TOAST. |
| `extended` | May compress and move out of line; common for potentially large values. |
| `external` | May move out of line but keeps the value uncompressed; substring operations on large `text`/`bytea` values can fetch only the needed chunks and run faster, at the cost of more storage. |
| `main` | Prefers compression and inline storage; moves out of line only if compression still cannot make the row small enough. |

A strategy is a per-attribute processing rule, not a promise that every value always has one physical representation. It balances heap-row size against CPU, I/O, and value-access costs. For example, `external` can make sense when an application often reads part of a large value: a substring operation on uncompressed `text` may fetch only the chunks containing that slice instead of loading and decompressing the whole payload. The tradeoff is more stored bytes.

An index key cannot be moved to a TOAST table the way a heap value can; TOAST for indexes can only compress. Index-key size limits therefore remain and depend on the access method/operator class. Storing large JSON in the heap does not mean an arbitrarily large value can be indexed directly.

TOAST lets heap pages hold more rows, but reading a toasted column can need additional index/table access and chunk assembly. A query that fetches only metadata can avoid loading the blob by not selecting that column. Conversely, `SELECT *`, sorting/hashing payloads, or updating large JSON can increase I/O and CPU. Compression is not free: it uses CPU and its benefit depends on the data.

A TOAST table has version management separate from the main heap, but its chunks are generally added or deleted rather than updated in place. If an `UPDATE` changes another column while the toasted value stays the same, the new heap version can keep referencing the existing TOAST value. If the large value itself changes, PostgreSQL creates a new toasted value/chunks along with the new heap version. This explains why a large payload need not be rewritten just because a small column on the same row changes; the old value still has to remain while a snapshot may need it, until cleanup can reclaim it.

Assume `body` is large enough to be stored out of line:

| Operation | Heap version | TOAST value |
| --- | --- | --- |
| `INSERT` the row | `H1` points `body` to `T1` | Chunks for `T1` are created. |
| `UPDATE title` | Creates `H2`; `body` still points to `T1` | The unchanged payload need not be rewritten. |
| `UPDATE body` | Creates `H3`; `body` points to `T2` | New chunks are created for `T2`; `H2`/`T1` remain for old snapshots. |

After no snapshot needs an old version, VACUUM can reclaim the heap version and TOAST chunks that are no longer referenced. This table shows the lifecycle conceptually; cleanup details depend on when versions become safe to remove.

## Choosing a query shape

Suppose `documents(id, owner_id, title, body jsonb)` has a large `body`. A list screen needs only ID and title. A suitable `(owner_id, id)` index or a covering index that includes title may help if the workload supports it; select only `id,title` so the query does not detoast `body`. If adding title makes the index wide, compare index size and write amplification with heap fetches before deciding.

For a detail screen that fetches `body`, a heap TID lookup followed by TOAST access is reasonable. An application cache may help if repeated reads are measured, but it needs an invalidation/version policy. Do not split every JSON document into many tables just because TOAST exists; choose based on query, update, and integrity requirements.

## Inspecting the behavior

Use `pageinspect` to examine pages/tuples in a diagnostic environment; this extension reads internal structures, needs appropriate privileges, and its output depends on version/build. Track `pgstattuple`, `pg_stat_all_tables`, `n_dead_tup`, index-only scans, and heap fetches; statistics are estimates, not exact page-by-page evidence. For large tables, consider vacuum, fillfactor, update patterns, FSM, and visibility map together.

*PostgreSQL 14 Internals*, Part I, covers pages, tuples, MVCC, HOT, and TOAST. The book-era strategies and thresholds are cross-checked against the versioned [PostgreSQL 14 TOAST documentation](https://www.postgresql.org/docs/14/storage-toast.html); visibility and hint-bit behavior are also cross-checked against the PostgreSQL 14 source for [heap tuple visibility](https://github.com/postgres/postgres/blob/REL_14_STABLE/src/backend/access/heap/heapam_visibility.c), [buffers and hint bits](https://github.com/postgres/postgres/blob/REL_14_STABLE/src/backend/storage/buffer/README), and [transaction status](https://github.com/postgres/postgres/blob/REL_14_STABLE/src/backend/access/transam/README). Also compare the current [database page layout](https://www.postgresql.org/docs/current/storage-page-layout.html), [TOAST](https://www.postgresql.org/docs/current/storage-toast.html), [visibility map](https://www.postgresql.org/docs/current/storage-vm.html), and [index-only scans](https://www.postgresql.org/docs/current/indexes-index-only-scans.html) documentation. The book follows PostgreSQL 14; current documentation links can describe newer releases.

## Check your understanding

**Can an index entry tell whether a version is visible to a snapshot?** No; the entry gives a TID, while heap-version `xmin`/`xmax` information determines visibility.

**Why can a HOT update avoid adding a new index entry?** The indexed key did not change and the new tuple fits on the same page, so the existing entry leads to the HOT chain in the heap.

**Does an index contain the entire PostgreSQL row?** Usually not; it stores keys and a TID, while the heap supplies the tuple and visibility information.

**Does a covering index guarantee an index-only scan?** No; the visibility map must allow the heap visibility check to be skipped, and the planner must consider that path cheaper.

**Does TOAST remove the cost of a large payload?** No; it keeps the main tuple smaller, but reading, compressing, chunking, and updating the payload still use resources.
