---
title: "PostgreSQL Lock Modes and Deadlock Walkthroughs"
category: "Database"
description: "Compare relation/row lock modes, MultiXacts, wait queues, and two common deadlock histories."
updated: 2026-10-17
translationKey: "database/postgresql-lock-modes-and-deadlock-examples"
---

PostgreSQL has a lock manager for transaction/object locks and separate mechanisms for latches on memory. An `UPDATE` commonly takes a relation `ROW EXCLUSIVE` lock plus a tuple row lock; these layers protect different things. For DDL waits, inspect relation locks; for two writers waiting on the same row, inspect tuple locks/transaction waits.

## Relation lock modes

Common modes include `ACCESS SHARE` (SELECT), `ROW SHARE` (locking SELECT), `ROW EXCLUSIVE` (INSERT/UPDATE/DELETE), `SHARE UPDATE EXCLUSIVE` (some maintenance), `SHARE`, `SHARE ROW EXCLUSIVE`, `EXCLUSIVE`, and `ACCESS EXCLUSIVE` (many DDL operations). A compatibility matrix determines conflicts; a mode named “ROW EXCLUSIVE” is relation-level, not a lock on individual rows.

Locks are generally held to transaction end, even after the statement finishes. `LOCK TABLE` can request a mode explicitly; DDL such as `ALTER TABLE` commonly needs a strong mode. A long transaction can hold `ACCESS SHARE` and block DDL waiting for `ACCESS EXCLUSIVE`; once DDL is queued, later requests may queue behind it, making SELECTs appear stuck.

### Read relation-lock conflicts

In the matrix, `X` means the requested mode in a row conflicts with the mode already held in a column. A blank means both transactions can hold those modes on the same relation. A mode containing `ROW` is still a **table/relation lock**, not a row lock.

| Request ↓ / Held → | AS | RS | RX | SUE | S | SRE | E | AE |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ACCESS SHARE (AS) |  |  |  |  |  |  |  | X |
| ROW SHARE (RS) |  |  |  |  |  |  | X | X |
| ROW EXCLUSIVE (RX) |  |  |  |  | X | X | X | X |
| SHARE UPDATE EXCLUSIVE (SUE) |  |  |  | X | X | X | X | X |
| SHARE (S) |  |  | X | X |  | X | X | X |
| SHARE ROW EXCLUSIVE (SRE) |  |  | X | X | X | X | X | X |
| EXCLUSIVE (E) |  | X | X | X | X | X | X | X |
| ACCESS EXCLUSIVE (AE) | X | X | X | X | X | X | X | X |

A few useful reads of the matrix:

- `SELECT` takes `ACCESS SHARE`, so only `ACCESS EXCLUSIVE` blocks it.
- `INSERT`/`UPDATE`/`DELETE` take `ROW EXCLUSIVE`; they can run alongside one another but conflict with `SHARE` from ordinary `CREATE INDEX`. `CREATE INDEX CONCURRENTLY` uses `SHARE UPDATE EXCLUSIVE`, allowing normal DML to continue while excluding some other maintenance operations.
- `ACCESS EXCLUSIVE` conflicts with every mode; `TRUNCATE`, `DROP TABLE`, and many DDL commands require it.

A stronger request ahead in the wait queue can also affect compatible requests: a new SELECT may wait behind a queued `ACCESS EXCLUSIVE` request so the DDL is not starved.

## Row locks and MultiXacts

Row lock modes encode conflict strength: `FOR KEY SHARE`, `FOR SHARE`, `FOR NO KEY UPDATE`, `FOR UPDATE`. An update to a non-key column often conflicts less than changing a primary/unique key. PostgreSQL can store locker transaction IDs in a tuple; a waiter waits for transaction completion instead of creating a separate lock object for every tuple.

Several transactions locking one row use a multitransaction (MultiXact). Large tables can face MultiXact ID wraparound pressure like XID wraparound; vacuum/freezing and monitoring MultiXact age are operational requirements.

### Row-lock compatibility matrix

| Request ↓ / Held → | KEY SHARE | SHARE | NO KEY UPDATE | UPDATE |
| --- | --- | --- | --- | --- |
| KEY SHARE |  |  |  | X |
| SHARE |  |  | X | X |
| NO KEY UPDATE |  | X | X | X |
| UPDATE | X | X | X | X |

`UPDATE` is the strongest mode. `NO KEY UPDATE` remains compatible with `KEY SHARE`, so a foreign-key check can protect a reference while another transaction changes a non-key column. Weaker modes allow more concurrency, but are correct only when the operation truly does not change a key used by a unique index/foreign key.

### Why is the row-lock wait queue subtle?

Row-lock state lives in a tuple's `xmax`, so the tuple itself has no list of waiting sessions. PostgreSQL 14 combines tuple state with heavyweight tuple locks and transaction-ID locks to order waiters:

1. T1 holds `FOR NO KEY UPDATE` on a row.
2. T2 wants to `UPDATE` that row: it acquires the heavyweight tuple lock used to queue contenders, then waits for T1's transaction ID.
3. T3 and T4 also want to update the row; they queue behind T2 on the tuple lock.
4. T1 commits; T2 proceeds and creates a new row version. At `READ COMMITTED`, T3/T4 reread that version and recheck their conditions. Waiters may then wait on T2's XID; the original queue is no longer strict FIFO, and those waiters can race when T2 finishes.

At `REPEATABLE READ`/`SERIALIZABLE`, a row change after the snapshot can make a waiting transaction fail with a serialization error. The application must retry the whole transaction. This is a PostgreSQL 14 implementation detail; a tuple lock does not guarantee absolute fairness at every isolation level.

### A compatible request can pass a waiter

A compatible mode can be granted even while a stronger waiter is queued. For example, T1 holds `FOR KEY SHARE`; T2 requests `FOR UPDATE` and waits, but T3 also requests `FOR KEY SHARE`, which is compatible with T1. T3 may be granted before T2. If more light requests keep arriving, the writer can wait a long time. This is mode-based starvation, not a deadlock: there is no wait cycle for the detector to abort.

The two-layer mechanism helps PostgreSQL order waiters and reduce contention, but it does not guarantee absolute fairness when compatible modes keep passing a waiter. For a hot row, keep transactions short, avoid holding locks while calling external services, and monitor waiter/blocker age. An application queue or a coordinated single writer may help when work constantly targets the same row; `NOWAIT`/a timeout only bounds waiting time and does not increase that row's throughput.

## A deadlock with two updates

T1 updates row A then B; T2 updates B then A. After each first step, T1 holds A and waits for B while T2 holds B and waits for A. PostgreSQL detects the cycle and aborts one transaction after `deadlock_timeout`. Taking locks in a consistent ID order turns that history into a queue instead of a cycle.

Deadlocks can also involve relation locks, foreign-key checks, advisory locks, or multiple tables/indexes. The deadlock log describes processes, SQL, and lock types. Retry the victim's entire transaction; unbounded retry can add overload.

### Reproduce a deadlock with two sessions

Prepare two rows in an accounts table:

```sql
CREATE TABLE accounts (id integer PRIMARY KEY, balance integer NOT NULL);
INSERT INTO accounts VALUES (1, 1000), (2, 1000);
```

Open two sessions and run the steps in order. Pause at the waiting statements to switch to the other session:

| Step | Session A | Session B |
| --- | --- | --- |
| 1 | `BEGIN;` |  |
| 2 | `UPDATE accounts SET balance = balance - 100 WHERE id = 1;` |  |
| 3 |  | `BEGIN;` |
| 4 |  | `UPDATE accounts SET balance = balance - 100 WHERE id = 2;` |
| 5 | `UPDATE accounts SET balance = balance + 100 WHERE id = 2;` — waits for B |  |
| 6 |  | `UPDATE accounts SET balance = balance + 100 WHERE id = 1;` — waits for A; PostgreSQL detects the cycle |

After step 4, A holds row 1 and B holds row 2. At step 5, A waits for row 2 held by B. Step 6 adds the reverse edge: B waits for row 1 held by A. The cycle `A → B → A` cannot make progress, so the deadlock detector chooses a transaction as the victim; that session receives an error and must `ROLLBACK`. The other transaction proceeds after the victim releases its locks. Do not assume the same session will always be selected.

If both transfers lock account IDs in the same order, such as always locking the lower ID first, one transaction waits for the other without forming a cycle. Consistent ordering reduces deadlocks; it does not rule out every deadlock involving other locks in the same transaction.


## Two UPDATE statements can lock rows in opposite orders

An `UPDATE` does not lock every qualifying row first and then modify them; the executor finds and updates rows incrementally. Two statements that update many rows can therefore deadlock if their plans visit rows in different orders. For example, one statement may use a sequential scan in heap order while another uses a descending index scan. The first locks the first row and then the next; the second locks the last row and works backward. When each needs a row held by the other, the wait-for graph forms a cycle even though each SQL statement looks like one operation.

The book constructs this history with a three-row table, a `pg_sleep` function to slow the expression, and `pgrowlocks` to observe row owners. The exact result depends on plan, physical order, indexes, and timing; the planner does not promise a stable lock order just because query text is unchanged. The lesson is not to force `enable_seqscan` in production, but to avoid assuming that a bulk UPDATE has a global lock order. If concurrent transactions modify the same set of rows, lock them first in a canonical order (often ascending key), use controlled batches, keep transactions short, and still retry the entire transaction after a deadlock.

## Wait queues, NOWAIT, and SKIP LOCKED

Waiters queue, and the lock manager must avoid starvation/incompatible bypass. `NOWAIT` errors immediately when a lock cannot be acquired; `SKIP LOCKED` ignores locked rows, useful for queue workers but not a complete snapshot. Do not use SKIP LOCKED for a report that must include every row.

Advisory locks use an application-defined integer/64-bit keyspace; they do not automatically relate to table/row locks. SSI predicate/SIREAD locks are not blocking row locks either. Spinlocks/LWLocks protect shared memory and commonly appear through other wait events.

## Diagnose waits

Join `pg_locks` with `pg_stat_activity` and `pg_blocking_pids()`, grouped by blocking tree. Inspect transaction age, query start, wait event, lock mode, and application name. A blocking PID may be `idle in transaction`; lack of active SQL does not mean no lock is held. Before cancel/terminate, understand rollback scope and client retry behavior.

The query below joins each blocked backend to its direct blockers. `blocked_for` measures how long the current query has run; `blocker_xact_age` shows how long the lock-holding transaction has been open:

```sql
SELECT blocked.pid AS blocked_pid,
       blocked.application_name AS blocked_app,
       now() - blocked.query_start AS blocked_for,
       blocked.wait_event_type,
       blocked.wait_event,
       blocker.pid AS blocker_pid,
       blocker.application_name AS blocker_app,
       blocker.state AS blocker_state,
       now() - blocker.xact_start AS blocker_xact_age,
       blocked.query AS blocked_query,
       blocker.query AS blocker_query
FROM pg_stat_activity AS blocked
CROSS JOIN LATERAL unnest(pg_blocking_pids(blocked.pid)) AS p(blocker_pid)
JOIN pg_stat_activity AS blocker ON blocker.pid = p.blocker_pid
ORDER BY blocker.xact_start NULLS LAST;
```

If a blocker is `idle in transaction`, read `blocker_query` as that session's most recent statement, not as an active query. Each row shows a direct wait relationship; to understand the full chain, follow any blocker PID that is itself waiting. Do not choose a transaction to cancel from duration alone: check workload ownership and rollback impact first.

*PostgreSQL Internals 14*, Part III, covers heavyweight, row, multitransaction, advisory/predicate, spin/LWLock, and wait sampling. Compare the matrices with [PostgreSQL 14 explicit locking](https://www.postgresql.org/docs/14/explicit-locking.html); for current behavior see [explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html), [lock monitoring](https://www.postgresql.org/docs/current/monitoring-locks.html), and [pg_locks](https://www.postgresql.org/docs/current/view-pg-locks.html).

## Check your understanding

**Is `ROW EXCLUSIVE` a row lock?** No; it is a relation-level mode.

**Does `SKIP LOCKED` guarantee every row is returned?** No; it skips rows currently locked.

**Why does a consistent lock order reduce deadlocks?** It removes the A→B/B→A wait cycle.
