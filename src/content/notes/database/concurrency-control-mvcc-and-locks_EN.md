---
title: "Database Concurrency: MVCC, Locks, and Deadlocks"
category: "Database"
description: "Follow two transactions touching the same data to distinguish isolation, MVCC, locks, and latches; learn how deadlocks form and how databases handle them."
updated: 2026-10-17
translationKey: "database/concurrency-control-mvcc-and-locks"
---

Two customers try to buy the last chair. Both read a quantity of 1, both subtract 1, and the system records two orders. Each SQL statement may succeed even though the combined result violates a business rule. A database needs concurrency control to decide which changes transactions can see, which transactions must wait, and which execution schedules may commit.

## Which execution schedule can a transaction see?

If transactions ran one at a time in a fixed order, the result would be a **serial schedule**. Real databases interleave operations to use CPU, I/O, and multiple connections efficiently. Isolation limits which interleavings are allowed according to the product's guarantees.

Common anomalies include:

- **Dirty read**: reading another transaction's uncommitted change; if that transaction rolls back, the value never became committed data.
- **Non-repeatable read**: reading the same row twice and seeing a different value after another transaction commits an update.
- **Phantom**: repeating a predicate query and seeing the matching row set change because another transaction inserted or deleted rows.
- **Lost update**: two transactions read an old value and write separate results, so the later write erases the earlier effect.
- **Dirty write**: one transaction overwrites another transaction's uncommitted value. If the first transaction rolls back, the database must recover a value that the second transaction already used; DBMSs generally prevent dirty writes.
- **Write skew**: two transactions read different rows but rely on one overall condition; each changes a separate row and together they make the condition false.

An isolation-level name is not enough to infer every behavior. SQL standards describe levels through phenomena, while a DBMS may use snapshots, locks, or other mechanisms. PostgreSQL, for example, treats Read Uncommitted as Read Committed and its Repeatable Read prevents phantoms; MySQL InnoDB has its own snapshot and range-lock behavior. Read the guarantees of the actual engine, such as [PostgreSQL isolation](https://www.postgresql.org/docs/current/transaction-iso.html) and [InnoDB isolation](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html).

## MVCC keeps versions so readers can use snapshots

**Multiversion Concurrency Control (MVCC)** keeps several versions of a row for some time. Instead of always making readers and writers block each other on the same data, the database chooses which version is visible to a transaction's snapshot.

For example, transaction A starts before B changes `quantity` from 4 to 3. A may continue reading the old version from its snapshot, while a transaction started after B commits reads the new version. Snapshot selection differs by product and isolation level: a statement snapshot is not necessarily the same snapshot held for an entire transaction.

MVCC reduces some read/write conflicts but does not remove every lock. Two writers changing the same row still need coordination; DDL, explicit locks, and operations on physical structures can also wait. Old versions must remain until no valid snapshot needs them, then they can be reclaimed. PostgreSQL calls its tuple cleanup process vacuum; other engines have their own purge or garbage-collection mechanisms.

## Locks protect logical conflicts

A lock is associated with data or an object a transaction wants to access. Shared locks allow compatible readers; exclusive locks usually exclude other writers. A `SELECT ... FOR UPDATE` commonly signals an intent to update and holds a lock until the transaction boundary, but syntax and the set of locked objects depend on the engine.

If transactions need several rows, lock order can create a deadlock:

1. A locks row 1.
2. B locks row 2.
3. A waits for row 2, held by B.
4. B waits for row 1, held by A.

Neither transaction can make progress. The database detects the wait cycle and aborts one transaction as a victim. The application must handle the deadlock error and, when the operation is safe to retry, rerun the **entire** unit of work with suitable limits and backoff. Retrying only the last statement may use changed data or omit earlier steps.

Range locks such as gap or next-key locks can prevent inserts into an index range to protect a predicate under some isolation levels. They can also make otherwise valid inserts wait. Because locks often follow access paths, the chosen index can affect the range scanned and locked.

## Latches protect in-memory structures

A **latch** is usually a short-lived synchronization primitive that protects a shared memory structure, such as a buffer page or index node. Transaction locks usually protect logical meaning for longer and may remain held across SQL operations; latches protect a structure's integrity while a thread reads or modifies it.

While searching a B-tree, a thread may latch a parent and then a child. If the child is safe and an operation cannot split changes upward, a technique such as latch crabbing may release the parent latch early. The safe rule depends on the operation and structure; releasing too early can let a reader follow an outdated pointer.

A B-link tree adds high keys and sibling links so a reader can move sideways during certain structural changes. This is a technique for reducing tight node locking, not a promise that updates need no coordination.

## OCC and PCC choose when to detect conflicts

**Pessimistic concurrency control** assumes conflicts are likely and locks before or during the operation. It avoids some repeated work but can make requests wait and create deadlocks.

**Optimistic concurrency control (OCC)** lets transactions proceed without long-held locks, then checks during validation or commit whether read data changed in a conflicting way. If so, the transaction is rejected and must retry. OCC fits some low-conflict workloads; when many transactions contend for the same data, retry costs can grow.

MVCC, locks, and OCC are not mutually exclusive choices. A DBMS can use MVCC for snapshot reads, locks for write conflicts, latches for in-memory pages, and optimistic validation for Serializable isolation.

## Read a schedule to check serializability

A **schedule** is the order in which database operations actually run; pure computation that does not touch state is omitted. A schedule is serializable if its result is equivalent to some order that runs transactions one at a time. For conflict serializability, consider pairs of operations from different transactions on the same item where at least one is a write. Their conflict order creates an edge in a precedence graph: if `T1` acts before `T2` on an item, draw `T1 → T2`. An acyclic graph has an equivalent topological order; a cycle means the schedule is not conflict-serializable.

For example, `T1: read(x), write(x)` and `T2: read(x), write(x)` interleave as `r1(x), r2(x), w1(x), w2(x)`. Conflicts create both `T1 → T2` (r1 before w2) and `T2 → T1` (r2 before w1), so the graph has a cycle. Both may read an old value and write separate results, losing an update. Locks, validation, or serialization-graph testing must block or abort such a schedule.

Anomalies help reveal some bad schedules; serializability is the more general criterion. Snapshot isolation prevents two transactions from writing the same item through first-committer-wins, but can still permit write skew when they write different items. Therefore, “no dirty reads” does not prove that an application invariant is preserved.

## OCC has three phases and still needs a commit order

In OCC, a transaction runs a read phase in a private context, collecting read and write sets; validation checks whether overlapping transactions made the old read set stale or caused write conflicts; only then does a write phase publish the valid result. If validation fails, the transaction discards its context and starts again. When validation usually succeeds, OCC avoids long-held locks; under contention, retries and discarded work can reduce throughput.

Validation still has a critical section: commits must be checked in a consistent order so two transactions do not both pass against stale state. OCC does not mean “no locks or coordination”; it moves most conflict detection to the end of the transaction.

## Timestamp ordering and two-phase locking

Timestamp ordering gives each transaction a logical order. For every item, the system tracks the greatest timestamp that read it (`readTS`) and wrote it (`writeTS`). If an older transaction tries to read a value already written by a newer transaction, or to write a value already read by a newer transaction, it aborts so it does not violate timestamp order. An older write than `writeTS` may instead be discarded as obsolete under the **Thomas Write Rule**. An aborted transaction must restart with a new timestamp; reusing the old timestamp can guarantee another abort. This may abort many transactions, but it does not create wait cycles like a lock-based scheme.

**Two-phase locking (2PL)** has a growing phase that only acquires locks and a shrinking phase that only releases them; after the first release, no new lock can be acquired. The rule governs lock acquisition and release; it does not prohibit transaction operations during either phase. Conservative 2PL is a variant that requires all locks before execution, which can reject a transaction early but reduces concurrency. 2PL differs from **two-phase commit**: 2PL controls transaction conflicts inside a database; 2PC coordinates a commit decision among distributed participants. Deadlocks are often found with a wait-for graph; a cycle is a deadlock. A system may check periodically or whenever a new wait edge is added. A timeout is simple but may abort a slow transaction that is not deadlocked; conservative 2PL avoids waiting by not starting until all locks are available.

To prevent deadlocks based on transaction age, **wait-die** lets an older transaction wait for a younger one, while a younger transaction needing a lock held by an older one aborts. **Wound-wait** lets an older transaction abort a younger lock holder; a younger transaction may wait for an older one. Each rule forces wait edges in one age direction, preventing cycles; aborted transactions must retry, and timestamp/priority policy matters to avoid starvation.

## Reader-writer latches and latch crabbing on a tree

A reader-writer latch lets multiple threads hold a shared latch while reading a page; a writer needs an exclusive latch and waits for other readers/writers. When a page is only read, an exclusive latch would reduce concurrency without adding safety. Some primitives use blocking queues; for a very short critical section, a spin/queue lock may avoid a context switch but burns CPU during a long wait. The choice depends on hold time and contention.

An upgradeable latch starts in shared mode and changes to exclusive when a structural update becomes necessary. If two readers try to upgrade at once, they can wait on each other; implementations often allow one upgrader or make a thread release and retry. Upgrading reduces exclusive hold time for read paths, but needs a rule to prevent upgrade deadlocks.

With **latch crabbing**, a thread descends from the root, latches a child before releasing its parent. During insert, if the child is not full and a split cannot propagate upward, the parent latch can be released. During delete, if the child has enough keys to avoid underflow/merge, the parent can also be released. If a child may trigger a split/merge that reaches the parent, keep latches along the path to update the parent safely. Structural changes rarely reach the root, so the root may be latched optimistically; if a node splits during descent, the thread detects it through high keys/siblings and follows the pointer or retries.

A B-link tree uses high keys and sibling links so a search can move to the correct sibling when the parent pointer has not yet been updated after a split. A node may be in a half-split state: the new page and sibling link are published, while the parent separator is added later. The reader compares the search key with the high key; if it exceeds the boundary, it moves right and does not miss the key. This lets searches run during some structural modifications and avoids holding latches from leaf back to root longer than needed.

## Turn guarantees into a business rule

For the last chair, reading inventory and decrementing it in a later statement can race. One solution is a conditional update:

```sql
UPDATE inventory
SET quantity = quantity - 1
WHERE product_id = 17 AND quantity > 0;
```

The application checks how many rows were updated. If zero, the product is out of stock or does not exist. With several related tables, the remaining steps still need a suitable transaction. Depending on the requirement, the design may need constraints, row locks, stronger isolation, or serialization-failure retries.

Choose a mechanism after stating the invariant: “never sell more than the available quantity,” “at least one doctor remains on call,” or “an idempotency key is recorded only once.” Then construct an interleaving that could violate it, read the isolation semantics, and test how the actual database performs the operation.

## Check your understanding

**Does MVCC mean a writer never waits for a reader?** Do not generalize that far. Some reads and writes do not block each other, but other locks, DDL, vacuum, or resource limits can still cause waits.

**Does a deadlock mean a transaction was written incorrectly?** Not necessarily. Each operation may be valid alone; the wait cycle forces the database to abort one side. Applications should treat deadlocks as a possible concurrency outcome and handle them by design.

**Can an application skip retries when Serializable is enabled?** No. Serializable may detect a schedule that is not equivalent to a serial order by aborting a transaction; the application must handle that result.

Reading: *Database Internals*, chapter 5; *High Performance MySQL*, chapters 1 and 5; *PostgreSQL 14 Internals*, Parts I and III; isolation and locking documentation for the specific database.
