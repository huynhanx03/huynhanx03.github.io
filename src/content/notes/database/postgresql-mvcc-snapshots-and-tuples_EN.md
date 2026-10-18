---
title: "MVCC, Snapshots, and Tuple Lifecycles in PostgreSQL"
category: "Database"
description: "Learn why PostgreSQL keeps multiple row versions, what a snapshot can see, and what an UPDATE creates."
updated: 2026-10-18
translationKey: "database/postgresql-mvcc-snapshots-and-tuples"
---

Suppose one transaction is reading a balance of 100 while another changes it to 130. PostgreSQL usually does not make the reader wait for the writer just to obtain a consistent read. MVCC (multi-version concurrency control) keeps tuple versions and gives each statement or transaction a snapshot that determines which version is visible.

## A snapshot answers “is this version visible?”

Each heap tuple has transaction metadata, notably `xmin` and `xmax`. `xmin` is the XID that created a version; `xmax` usually identifies the transaction that deleted or replaced it. A snapshot is not a copy of the whole table. It records XID boundaries and the transactions active when it was taken, so the executor can reconstruct the data that transaction is allowed to see.

### Snapshot structure: `xmin`, `xmax`, and `xip_list`

In PostgreSQL 14, inspect a snapshot with `pg_current_snapshot()`. Its display form, `xmin:xmax:xip_list`, contains:

- `xmin`: the lower boundary, usually the smallest XID of an active transaction.
- `xmax`: an exclusive upper boundary, one greater than the highest XID completed at snapshot time. XIDs at or above it were not yet complete (they may still be running or not yet assigned) and are not visible.
- `xip_list`: top-level XIDs that were active between the boundaries when the snapshot was taken. It omits subtransaction XIDs; virtual XIDs do not participate in row-visibility checks.

To evaluate a version inserted by XID `x`, first check transaction status: an aborted insert is not visible. If `x < xmin`, no transaction at or below the active horizon was still running at snapshot time, so its committed changes belong to the observed state. If `xmin <= x < xmax`, the change is visible only if `x` is not in `xip_list` and the transaction committed. If `x >= xmax`, that transaction had not completed when the snapshot was taken (it may still be running or not yet exist), so its changes are invisible. For `xmax` on an older version, also ask whether the deleting transaction committed before the snapshot: if it had not, the deletion is not visible and the old version can still be read.

Commit timestamps do not determine visibility. PostgreSQL keeps the active-transaction list in ProcArray shared memory; a snapshot captures that list so it can still identify who was active after those transactions finish. WAL has commit/abort records for recovery, but it is not a complete history from which arbitrary past snapshots can be reconstructed. Keeping old tuples on disk is therefore not enough to ask “what did the database look like at 10:05?”; the system does not retain the active set for every point in time like a temporal database.

### Trace: why one snapshot sees only one version

Suppose transaction `790` is still open, while transaction `791` inserted Bob and committed. A reader takes a snapshot displayed as `790:792:790`: the lower boundary is `790`, the upper boundary is `792`, and `790` is still active. After the snapshot is taken, `790` commits; a new transaction `792` updates Bob from 100 to 200. The old snapshot does not change retroactively:

| Tuple | `xmin` | `xmax` | Result for snapshot `790:792:790` | Reason |
| --- | ---: | ---: | --- | --- |
| Alice inserted by `790` | 790 | 0 | Not visible | `790` was in `xip_list` at snapshot time, even though it committed later. |
| Bob's old version | 791 | 792 | Visible | `791` had committed and was not in `xip_list`; the delete by `792` is outside the snapshot. |
| Bob's new version | 792 | 0 | Not visible | `792` equals the upper boundary, so the change began after the snapshot. |

This snapshot sees Bob with balance 100: it excludes Alice's insert by the active transaction, keeps Bob's old version, and skips the new Bob version. That is why a snapshot records `xip_list`; merely recording “when the read began” is not enough.

### Commands inside one transaction and cursors

A transaction can see its own writes before commit, but command order still matters. A tuple header records `cmin` (the creating command) and `cmax` (the deleting command); PostgreSQL usually packs them into one command ID to save space, using a ComboCID if the same transaction both inserts and deletes a tuple. The snapshot also has an internal command counter so a query/cursor does not see changes made after that query's own boundary.

For example, a cursor is opened to count rows and the transaction then inserts another row. The cursor keeps the snapshot from when it opened, so a later `FETCH` does not silently add the new row merely because the same transaction inserted it. This does not contradict a later statement in the transaction being able to see the earlier write. `cmin`/`cmax` are visibility details useful for diagnosis, not timestamps or a global order across transactions.

## UPDATE usually creates a new version

A normal update marks the old version as superseded and writes a new version. A reader with an older snapshot may still need the old tuple, so PostgreSQL cannot remove it immediately. DELETE also marks a tuple instead of immediately erasing its bytes. Vacuum reclaims versions no longer needed by any valid snapshot.

```sql
BEGIN;
UPDATE account SET balance = 130 WHERE id = 7;
-- A reader with an older snapshot can still read balance = 100.
COMMIT;
```

This is a conceptual model; applications should not depend on tuple addresses or page-write details. Row locks still coordinate conflicting writers, even though ordinary readers do not lock rows in a way that blocks writers.

## Isolation levels change snapshot behavior

At `READ COMMITTED`, each statement normally gets a new snapshot. A transaction may see a commit that occurred between its own SELECT statements. At `REPEATABLE READ`, the snapshot remains stable for the transaction; PostgreSQL implements this level as snapshot isolation, which exceeds the SQL standard in some respects but can still permit write skew under certain histories. `SERIALIZABLE` uses Serializable Snapshot Isolation (SSI) to detect dangerous dependency structures and may abort a transaction; applications must retry the entire transaction after a serialization failure.

Isolation does not replace schema invariants. Unique, foreign-key, and check constraints help protect data rules; multi-step logic still needs an understanding of transactions, locks, and retries. `SELECT ... FOR UPDATE` locks selected rows to coordinate updates; it does not make every read serializable.

## HOT updates and pruning

If an update changes no column referenced by an index and the page has room, PostgreSQL may perform a HOT (heap-only tuple) update: the new tuple stays on the same page, avoiding new entries in every index. This can reduce index writes, but is not guaranteed for every update. Indexing more columns can reduce HOT opportunities.

Pruning removes dead versions from a page when possible, while vacuum works more broadly and updates visibility/free-space metadata. A long transaction or an old replication-slot horizon can keep old versions necessary and cause table growth. See the separate note on [vacuum, freezing, and maintenance](./postgresql-vacuum-freezing-and-maintenance).

## Virtual transactions, savepoints, and errors

### Virtual XIDs exist only while a transaction is active

A transaction needs an identifier that the lock manager and other backends can track even before it has a real XID. PostgreSQL assigns a **virtual transaction ID (VXID)** made from a backend/process ID and a local sequence. A VXID is managed in shared memory, is not written into tuples or persisted to disk, and disappears when the transaction ends; the sequence can be reused later.

A read-only transaction often does not need a real XID. In PostgreSQL 14, `pg_current_xact_id_if_assigned()` returns `NULL` until the transaction needs one; when it starts writing, PostgreSQL assigns a real XID. Thus `pg_stat_activity` can show an active transaction with a virtual ID even when no real XID has been assigned. “No real XID yet” does not mean “no snapshot”: a read-only transaction still has a snapshot and can hold a horizon while it reads.

### A savepoint creates a subtransaction

`SAVEPOINT` lets a transaction cancel part of its work and continue the outer transaction. PostgreSQL implements this with a **subtransaction**, not an independent transaction that can commit on its own. Each subtransaction has its own XID, usually greater than the parent's; Parent-child relationships are stored under `pg_subtrans` in the data directory and read/written through SLRU buffers in shared memory. `pg_current_xact_id()` returns the outer transaction's XID, not the child XID. In PostgreSQL 14, a subtransaction's status is recorded separately; a child status record can carry both committed and aborted bits, while the parent determines the final outcome. If the parent aborts, all child changes are treated as aborted too.

Follow three writes:

```sql
BEGIN;
INSERT INTO t(value) VALUES ('FOO');
SAVEPOINT sp;
INSERT INTO t(value) VALUES ('XYZ');
ROLLBACK TO SAVEPOINT sp;
INSERT INTO t(value) VALUES ('BAR');
COMMIT;
```

`ROLLBACK TO SAVEPOINT` keeps the `sp` marker; later commands can continue in a new subtransaction, while `RELEASE SAVEPOINT` removes the marker but keeps later changes. The logical result after commit is `FOO` and `BAR`; `XYZ` is not visible because its subtransaction was rolled back. That does not mean its bytes disappear from the heap page immediately: the physical tuple may remain with transaction status that makes every snapshot skip it, until pruning/VACUUM can safely reclaim the slot. This separates **rollback in visibility** from **instant byte removal**. Savepoints, PL/pgSQL exception blocks, and some other features use subtransactions implicitly; PostgreSQL does not support nested `BEGIN` as an autonomous transaction.

### An error marks the transaction aborted

If a statement fails inside a transaction block, PostgreSQL marks that transaction as aborted. Later commands are rejected until `ROLLBACK` or rollback to the nearest savepoint. The statement may have written some tuples before hitting the error; continuing as though the statement had not happened would break statement and transaction atomicity. `COMMIT` on a failed transaction ends in rollback; it does not preserve earlier successful commands by committing only part of the transaction.

For example, a statement can update one row before it reaches an error on a later row:

```sql
BEGIN;
UPDATE t SET s = repeat('X', 1 / (id - 4)); -- division by zero at id = 4
SELECT * FROM t; -- rejected: current transaction is aborted
COMMIT;           -- ends as ROLLBACK
```

Do not rely on scan order to predict which row was processed before the error. The key point is that the entire transaction is now failed, so no statement may continue reading the partial changes.

`psql` has `ON_ERROR_ROLLBACK`, which creates a savepoint before each command inside a transaction; if a command fails, the client rolls back to that savepoint and allows the session to continue. It is off by default because each savepoint has overhead. This is a `psql` convenience, not PostgreSQL silently continuing every transaction after an error; an application using a driver must explicitly roll back the transaction or a savepoint.
## When old versions stick around

The `xmin` values of active snapshots form a **transaction horizon**. The horizon alone is not enough: VACUUM must also check transaction status. A tuple inserted by an aborted transaction is dead; a replaced/deleted version is reclaimable only after that change committed and no active snapshot can still see the old version. The tuple’s own old `xmin` does not prove it is dead. PostgreSQL computes the farthest-back (oldest-XID) horizon of relevant transactions. As it advances, VACUUM can prove that more versions are invisible to every reader and reclaim them.

A `REPEATABLE READ`/`SERIALIZABLE` snapshot is generally held until its transaction ends. A transaction with a real XID at `READ COMMITTED` can also hold the horizon while it is `idle in transaction`, even when no operator is running. By contrast, a transaction with only a virtual XID at `READ COMMITTED` generally holds a horizon while operators are running; a virtual transaction without an active snapshot does not need to hold one, although `backend_xmin` can still reflect an older snapshot in some situations described by the book's version. Distinguish an open connection, an open transaction, an assigned real XID, and an active snapshot.

The database horizon is the oldest XID still protected by a transaction in that database. It affects every ordinary table in the database, including tables that transaction has never read. Catalogs use a cluster-wide horizon because shared catalogs serve multiple databases; a temporary table needs to consider only transactions of its owning process. A cursor, exported snapshot, or replication slot can keep a horizon old and let dead tuples accumulate.

Monitor `pg_stat_activity.backend_xmin`, transaction age, `idle in transaction` sessions, replication slots, dead tuples, and autovacuum logs. If vacuum cannot reclaim space, find the transaction/horizon holding it first. Forcing aggressive vacuum or deleting files does not fix the cause and can cause downtime or data loss.

## Fresh snapshots for system catalogs

Catalogs are PostgreSQL tables that describe schemas, columns, indexes, and constraints, but a catalog lookup does not simply reuse the user-data snapshot of the surrounding statement. If DDL has just committed a new constraint, catalog lookups need a fresh enough view to see its definition; an old snapshot could make the server act on stale metadata. PostgreSQL therefore obtains a sufficiently fresh catalog snapshot for the lookup. Conceptually, each catalog query has its own snapshot, but the implementation also caches catalog objects and snapshots to avoid the cost of creating them continuously.

This does not mean an ordinary transaction may read arbitrary user-data changes made after its snapshot. Schema changes have their own locking and synchronization: if another transaction holds a conflicting lock on the table, DDL must wait. User-row snapshots and fresh catalog metadata serve different purposes.

## Sharing one snapshot across workers

When multiple transactions must read exactly the same state — for example, parallel `pg_dump` workers — starting “at about the same time” does not guarantee they take the same snapshot. The exporting transaction creates an identifier with `pg_export_snapshot()` and must remain open while workers import it. Each worker must use `REPEATABLE READ` or `SERIALIZABLE` and call `SET TRANSACTION SNAPSHOT` before its first query:

```sql
-- Exporting worker
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT count(*) FROM accounts; -- establish this transaction's snapshot
SELECT pg_export_snapshot();  -- keep the transaction open for importers

-- Importing worker, before its first query
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET TRANSACTION SNAPSHOT '00000004-0000006E-14';
SELECT count(*) FROM accounts;
```

Both workers see the same starting point. If the exporter deletes a row after export, the importer still reads according to the shared snapshot; ordinary visibility rules still apply and the token does not make later changes visible. The token expires when the exporting transaction ends. Importers must therefore use it before the exporter commits or rolls back; in return, the exporter may hold back the horizon and delay VACUUM.

*PostgreSQL Internals 14*, Part I, covers snapshots, transaction IDs, tuple versions, catalog visibility, exported snapshots, HOT, and pruning. Compare against the same release: [PostgreSQL 14 transaction isolation](https://www.postgresql.org/docs/14/transaction-iso.html), [snapshot information](https://www.postgresql.org/docs/14/functions-info.html#FUNCTIONS-PG-SNAPSHOT), [snapshot synchronization/export](https://www.postgresql.org/docs/14/functions-admin.html#FUNCTIONS-SNAPSHOT-SYNCHRONIZATION), [routine vacuuming](https://www.postgresql.org/docs/14/routine-vacuuming.html), and [heap-only tuples](https://www.postgresql.org/docs/14/storage-hot.html), [SAVEPOINT](https://www.postgresql.org/docs/14/sql-savepoint.html), [ROLLBACK TO SAVEPOINT](https://www.postgresql.org/docs/14/sql-rollback-to.html), and [psql error rollback](https://www.postgresql.org/docs/14/app-psql.html#APP-PSQL-ERROR-ROLLBACK).

## Check your understanding

**What does `790:792:790` record in a snapshot?** XID `790` was still active when the snapshot was taken; `792` is the upper boundary and was not complete; XIDs in `xip_list` are not treated as committed at that point.

**If an XID in `xip_list` commits after the snapshot is taken, does the old snapshot see its change?** No. The active set was captured and does not change retroactively.

**Why can a long transaction make VACUUM retain old tuples from a table it never read?** The horizon is database-wide, not limited to rows queried by that transaction.

**Why can a reader see 100 after a writer has stored 130?** The reader's snapshot predates the writer's commit, so the old version remains valid to that reader.

**Can PostgreSQL remove the old tuple as soon as UPDATE finishes?** Not if a snapshot may still need it; cleanup must wait until it is safe.

**Does `REPEATABLE READ` protect every business invariant?** No. A stable snapshot does not protect every cross-row rule; use constraints, locking, or SERIALIZABLE as appropriate and handle retries.
