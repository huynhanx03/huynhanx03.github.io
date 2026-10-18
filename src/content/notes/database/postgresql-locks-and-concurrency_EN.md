---
title: "PostgreSQL Locks, Concurrency, and Wait Diagnosis"
category: "Database"
description: "Distinguish table, row, predicate, and internal locks, then trace blocking and deadlocks."
updated: 2026-10-18
translationKey: "database/postgresql-locks-and-concurrency"
---

MVCC lets readers continue using a snapshot while a writer creates a new version, but it does not remove every conflict. Two writers changing the same row must coordinate; DDL may wait for transactions using a table; the executor and buffer manager need internal locks to protect shared structures. Identifying the lock type helps distinguish a “slow query” from a “query waiting on something.”

## Table locks and row locks

Each SQL command acquires a table-level lock mode, and modes have a compatibility matrix. A `SELECT` usually takes `ACCESS SHARE`, while many DDL operations take more conflicting modes. A table lock usually does not lock every row; it protects the relation at the operation level and is held until transaction end.

`UPDATE`, `DELETE`, and `SELECT ... FOR UPDATE/SHARE` can acquire row-level locks. A row lock blocks conflicting writers or lockers, while an ordinary MVCC SELECT generally continues to read a version visible to its snapshot. An update also acquires its table-level mode. `FOR UPDATE` is useful when a transaction reads and then changes a row while preventing competing writers; keep the lock short to reduce queues.

Advisory locks are application-defined locks, available at session or transaction scope. PostgreSQL does not assign business meaning to a key; all relevant clients must follow the same convention. Do not use advisory locks instead of constraints when a unique or foreign-key constraint can express the invariant.

## Predicate locks and SERIALIZABLE

At `SERIALIZABLE`, SSI tracks read/write dependencies that could create a non-serializable history. Predicate/SIREAD locks record reads to detect conflicts; they do not necessarily block a writer immediately like row locks. PostgreSQL may abort a transaction to preserve correctness. Applications must retry the transaction after a serialization failure and make external side effects safe against repetition.

## Deadlocks and lock ordering

A deadlock occurs when T1 holds A and waits for B while T2 holds B and waits for A. PostgreSQL detects a cycle after a wait and aborts one side. Access rows/tables in a consistent order, keep transactions short, and retry deadlock errors to reduce impact. Increasing `deadlock_timeout` changes detection timing and logging cost; it does not fix a cycle.

```text
T1: lock account 1 ── waits for account 2
T2: lock account 2 ── waits for account 1
                         ↑ cycle → abort one transaction
```

## Internal locks are different from row locks

Spinlocks, lightweight locks (LWLocks), buffer pins, and predicate locks serve internal structures or snapshot tracking. A backend waiting on an LWLock does not mean another transaction holds the row it wants to update. Use wait events and monitoring/stack evidence before changing a query. Do not manipulate shared memory directly.

## Find who is waiting

Combine `pg_stat_activity`, `pg_locks`, `pg_blocking_pids(pid)`, `wait_event_type`, `wait_event`, `query_start`, and transaction age. Log lock waits and deadlocks with sufficient context. An `idle in transaction` session can retain a lock or snapshot while executing no SQL. Before terminating a backend, identify its owner, rollback impact, and waiting requests; termination can cause a large rollback but may sometimes be a controlled recovery action.

*PostgreSQL Internals 14*, Part III, covers lock modes, wait queues, multitransactions, and LWLocks. The matrices follow [PostgreSQL 14 explicit locking](https://www.postgresql.org/docs/14/explicit-locking.html); for current monitoring see [explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html), [lock monitoring](https://www.postgresql.org/docs/current/monitoring-locks.html), [SSI](https://www.postgresql.org/docs/current/transaction-iso.html#XACT-SERIALIZABLE), and [system statistics](https://www.postgresql.org/docs/current/monitoring-stats.html); predicate-lock settings are documented in [PostgreSQL 14 lock management](https://www.postgresql.org/docs/14/runtime-config-locks.html).


## Deeper mechanisms from Parts III: object locks and memory locks


### What resource does a lock protect, and how long does it live?

Locks can protect database objects such as relations, pages, tuples, or abstract resources named by an application; internal locks can protect a hash table, buffer, or shared-memory structure. When resources form a hierarchy from table to page to tuple, coarse table locks are simpler but restrict concurrency; fine-grained locks allow more independent work but need more metadata and coordination. PostgreSQL uses multiple mechanisms instead of forcing every scope into one lock type.

A heavyweight lock commonly lives until transaction end and has modes, a wait queue, deadlock detection, and visibility in `pg_locks`. Short-term locks such as LWLocks/spinlocks protect shared-memory regions briefly and do not necessarily appear as business-level locks in `pg_locks`. Not seeing a row lock in that view does not prove there is no wait; a waiter may be waiting for the owner's transaction ID.

In PostgreSQL 14, `max_locks_per_transaction` sizes the shared lock table; the pool capacity is related to this value multiplied by `max_connections`. It is not a hard limit saying that one transaction can acquire exactly that many locks. Transactions share the pool, so total concurrent demand matters. Changing this sizing setting requires a restart. Raising it without evidence can increase shared-memory use without fixing blockers or contention.

Each transaction holds an exclusive lock on its own virtual transaction ID; after it receives a permanent XID, a corresponding lock appears as well. Another process can request a shared lock on that transaction ID to wait for commit/abort. In `pg_locks`, read `locktype`, resource ID, `mode`, and `granted` together: `granted=false` means the request is waiting; a transaction-ID lock can explain a wait even when the tuple itself does not appear as a row in the view.

### Relation locks and the heavyweight wait queue

Relation locks protect tables, indexes, and other objects; PostgreSQL usually keeps them until transaction end. Modes mean more than “read” and “write”: for example, SELECT's `ACCESS SHARE` is compatible with most operations but conflicts with `ACCESS EXCLUSIVE`; `ROW EXCLUSIVE` from INSERT/UPDATE/DELETE does not block ordinary SELECT; VACUUM's `SHARE UPDATE EXCLUSIVE` coexists with normal queries and DML but excludes some other maintenance operations. To understand blocked DDL, inspect both held locks and strong locks waiting ahead in the queue.

Heavyweight locks are managed in shared memory and appear in `pg_locks`. A backend may hold many locks; `max_locks_per_transaction` sizes the shared lock table and is not a cap on the number of row locks in a transaction. When one transaction waits for another, PostgreSQL can hold a lock on a transaction ID or virtual transaction ID. Thus `pg_locks` can show `transactionid` or `virtualxid` rows; do not conclude that no row is blocked just because no row-level lock appears.

The wait queue is ordered so new compatible requests cannot indefinitely bypass a stronger request already waiting. As a result, a light SELECT behind a waiting `ACCESS EXCLUSIVE` request can queue even if it is compatible with the writer currently holding the lock. This is why lock timeouts and DDL rollouts must account for the queue and blocker chain, not only current lock holders.

### Row locks live in tuples; waiting needs a heavyweight lock

Because of MVCC, a reader does not lock a tuple to read an older version. A row lock usually records transaction/mode information in the tuple header through `xmax` and hint bits. Weaker/stronger row modes distinguish updates that preserve a key from those that change it, and determine compatibility with forms of `SELECT FOR ...`. When several transactions hold row locks, `xmax` can point to a MultiXact that stores multiple members and modes rather than one transaction.

The tuple header is not a wait queue. When a backend wants a row held by another transaction, it waits on a heavyweight lock for that transaction ID; after the owner finishes, the waiter wakes, rereads the tuple/version, and rechecks conditions. At Read Committed, UPDATE/SELECT FOR UPDATE may follow the new version and reevaluate the predicate. A hot row can therefore build a long queue even when each operation is short. `SKIP LOCKED` helps workers claim jobs but deliberately skips busy rows; `NOWAIT` errors immediately so the caller can retry later.

For a transfer between two accounts, lock them in ascending ID order. If T1 locks A and waits for B while T2 locks B and waits for A, the wait-for graph contains a cycle and deadlock detection aborts one transaction. Retry the whole rolled-back transaction, not only its last SQL statement. A consistent resource order reduces cycles but does not eliminate the need to handle remaining deadlocks.

### Other locks beyond relations and tuples

Transaction-ID locks let a backend wait for commit/abort; a virtual transaction ID represents a transaction before it has a permanent XID. Advisory locks use application-defined keys and can be session- or transaction-scoped; only code following the same convention coordinates. They are not a protection boundary when some writer ignores the advisory protocol.

Relation extension locks coordinate backends adding pages at the end of a relation, so two backends do not extend the same boundary concurrently. Index access methods also use page/bucket locks; the index type affects how long a lock is held and its concurrency. Serializable Snapshot Isolation uses predicate/SIREAD locks to record read regions, including rows/pages/ranges that do not exist as tuples to lock. They do not block writers like traditional locks; PostgreSQL detects dangerous dependency cycles and aborts a transaction to preserve serializability. `pg_locks` can show several granularities, but an SIREAD entry does not mean a backend is blocking another.



### Object, relation-extension, and page locks

A heavyweight `object` lock protects a system-catalog object that is not represented as an ordinary relation lock. In `pg_locks`, the resource is identified by `database`, `classid`, and `objid`: database gives the database scope (or zero for a cluster-wide object), `classid` identifies the catalog describing the object type, and `objid` is that object's OID. For example, creating a table can hold a lock on the `public` schema so another transaction cannot drop the schema midway; dropping an object also needs exclusive locks on the object and relevant dependencies.

When a heap table runs out of room on existing pages, a backend must add pages at the end of the relation file. A relation-extension heavyweight lock ensures only one backend extends that boundary at a time; it is also used in some index-vacuum steps to prevent page additions during a scan. This lock is usually released as soon as the extension is created, does not wait for transaction end, and does not enter the ordinary wait-for graph. PostgreSQL 14 can extend a heap by several pages per turn to reduce contention; B-tree indexes are a common exception and extend one page at a time. If extension takes longer than `deadlock_timeout`, a deadlock check can still be triggered even though the extension lock itself does not normally create a wait-for edge.

Page-level heavyweight locks are rarer; the book describes them in a GIN path. With `fastupdate`, new terms are added quickly to a pending list and moved in batches into the main index structure. A transfer needs an exclusive metapage lock to prevent two workers from merging the pending entries at once; this does not block ordinary index use as if the entire index were locked. The page lock is released when the operation finishes rather than at transaction end.

### Advisory locks use an application-owned protocol

Advisory locks are useful when the resource has no corresponding row or relation, but PostgreSQL does not acquire them on the application's behalf. Two clients are protected only if every relevant code path uses the same key and acquire/release protocol. A resource name can be hashed to a numeric key, but consider collisions and use a stable encoding across processes.

The `pg_advisory_*` function names suggest their behavior: `lock` may wait, `try` attempts without waiting, `unlock` releases, `share` uses a shared mode, and `xact` holds the lock until transaction end. Without `xact`, many advisory locks live until session end, so `COMMIT` does not release them; call unlock or close the session. Transaction-scoped locks are often easier to manage, while session-scoped locks can span transactions but may leak when a connection pool reuses a session.

### Predicate locks describe a read footprint; they do not hold it exclusively

Under SSI, PostgreSQL records the regions read by a `SERIALIZABLE` transaction as `SIReadLock` entries visible in `pg_locks`. These are not locks that block an `INSERT` or `UPDATE`; they record read/write dependencies so PostgreSQL can detect a combination of transactions that may produce a non-serializable history. One reader/writer pair does not necessarily cause an abort. If the dependencies form a dangerous structure, PostgreSQL may end a transaction with SQLSTATE `40001`, and the application must retry the **entire transaction** from the beginning. If an invariant depends on related transactions, those transactions must also use `SERIALIZABLE`; a transaction at a weaker isolation level does not receive the same SSI protection.

The SIREAD footprint depends on the execution plan, so an SQL predicate does not always map to an exact lock on only its matching rows:

| Read plan | Possible SIREAD footprint | Consequence |
| --- | --- | --- |
| Sequential scan with `WHERE n > 100` | Relation-level | Tracks the whole relation even though the filter selects only some rows |
| B-tree index scan with `WHERE n BETWEEN 1000 AND 1001` | Read tuples and relevant index leaf/range pages | Tracks a narrower region while still covering possible phantoms |

SIREAD does not prevent a writer from inserting `n=150`. It records that the write could affect the read result if the transaction order were reversed. Read `EXPLAIN` together with `SIReadLock` entries in `pg_locks`: a change from an index scan to a sequential scan can broaden the tracked region and increase conservative aborts.

To avoid exhausting predicate-lock memory, PostgreSQL can promote many fine-grained locks to coarser ones: tuples on one page become a page lock, then many tuples/pages from one relation become a relation lock. `max_pred_locks_per_page` and `max_pred_locks_per_relation` control these thresholds. A broader footprint can abort a transaction even when the writes would not actually create an anomaly (**false positive**); correctness is preserved, but throughput and retry cost can worsen. Raising thresholds may reduce promotion but uses more memory. `max_pred_locks_per_transaction` sizes the average object-lock budget in the shared predicate-lock table; it is **not** a cap on the number of rows that can be locked. PostgreSQL 14 defaults are 2 rows per page, `-2` for the relation threshold ratio, and 64 objects per transaction on average; check the server configuration before tuning.

SIREAD locks can outlive the reading transaction until overlapping read/write transactions no longer need the dependency. A `SERIALIZABLE READ ONLY` transaction may be proven safe and avoid or release predicate locks. If the application declares `SERIALIZABLE READ ONLY DEFERRABLE`, PostgreSQL can wait before reading for a safe snapshot; startup takes longer in exchange for a read result that does not need to be discarded because of a serialization anomaly.

### Spinlocks, LWLocks, and transaction locks

Heavyweight locks protect application objects across transactions. Spinlocks and lightweight locks (LWLocks) protect shared-memory structures such as buffer mappings, buffer headers, WAL insertion, and process arrays. A spinlock has only an exclusive mode and uses atomic instructions to busy-wait; after contention persists, a process may yield and try again. It has no deadlock detection or instrumentation, so PostgreSQL core must hold it briefly and implement it correctly. An LWLock has shared/exclusive modes for reading or changing a structure and, unlike a spinlock, can be observed through wait events. In the PostgreSQL 14 behavior described by the book, LWLock waiters have no FIFO fairness guarantee; under high contention, which waiter proceeds can be uneven. Holding an LWLock too long, especially around I/O, can stall work even when no query waits on a row/table lock. A buffer I/O lock signals that a page is being read or written; it is different from a transaction lock on a tuple.

Read `pg_stat_activity.wait_event_type`/`wait_event` over time to distinguish `Lock`, `LWLock`, `IO`, `BufferPin`, `Client`, or `IPC`. One snapshot does not show frequency; sample periodically or use a wait-sampling extension to see a distribution. Connect the waiting PID to blocker PIDs, query/transaction age, relation/object, and event; do not diagnose from a single top-wait sample. PostgreSQL 14 docs: [explicit locking](https://www.postgresql.org/docs/14/explicit-locking.html), [lock monitoring](https://www.postgresql.org/docs/14/monitoring-locks.html), and [transaction isolation](https://www.postgresql.org/docs/14/transaction-iso.html), and [lock-management settings](https://www.postgresql.org/docs/14/runtime-config-locks.html).


### Which locks protect the buffer cache and WAL buffers?

Lock names help trace a wait to the structure it protects. In the buffer cache, buffer-mapping locks protect partitions of the hash table mapping relation/fork/block to buffers; lookups take shared access, while changing a mapping needs exclusive access. A buffer-header spinlock protects tiny metadata updates; some counters can use atomic operations. A BufferContent lock protects page contents while tuples are read or changed; a pin prevents eviction but does not replace the content lock. BufferIO state tells other backends that a page is being read or written and they must wait for I/O to finish. The buffer-strategy spinlock protects the free-list/clock hand.

WAL buffers also have a mapping structure, but the book describes one WALBufMapping LWLock because the cache is smaller and access is more ordered. WALWrite coordinates WAL-page writes. When creating a WAL record, a backend reserves space in order using a spinlock on the insert position; after reservation, multiple backends can fill payloads concurrently through LWLocks in the WALInsert tranche. These protect different steps: a `WALWrite` wait does not automatically mean the same bottleneck as a wait on `WALInsert`.

### Read wait events and sample them carefully

`pg_stat_activity` shows a snapshot of the current wait, not usually a cumulative history. `wait_event_type` groups waits such as `Lock`, `LWLock`, `BufferPin`, `IO`, `Client`, `IPC`, `Extension`, `Activity`, and `Timeout`; `wait_event` gives the specific event. A background worker in `Activity` may simply be idle in its normal loop, while `ClientRead` often means the backend is waiting for the client to send its next command—not necessarily that the database is stalled. `log_lock_waits` records heavyweight-lock waits longer than `deadlock_timeout`, preserving evidence over time.

A blank `wait_event` means the view did not report an instrumented wait at the sampled instant; it does not prove that all backend time was useful work. Some waits may not be instrumented on a particular release or code path, so query time can exceed the time explained by visible wait events.

To get a time distribution, sample periodically or use an extension such as `pg_wait_sampling`. Sparse samples miss short waits; a higher sampling rate improves detection but adds overhead, and very short-lived sessions may not last long enough for a useful profile. A profile count estimates time only when the sampling period is known and each sample is treated as representing its corresponding interval. Event names and instrumentation change across releases. Combine samples with blocker chains, SQL, transaction age, and host I/O instead of treating an event count as a root cause.

## Check your understanding

**Can an ordinary SELECT be blocked by UPDATE?** Usually not because of MVCC, though DDL/table locks and other cases can still create waits.

**Does a predicate lock always block a writer?** No. In SSI it primarily helps detect dangerous dependencies; a transaction may be aborted later.

**Does a larger deadlock timeout eliminate deadlocks?** No. It changes detection timing, not the wait cycle.
