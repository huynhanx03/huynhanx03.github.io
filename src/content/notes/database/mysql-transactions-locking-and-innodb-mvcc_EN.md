---
title: "InnoDB Transactions, Locks, and MVCC"
category: "Database"
description: "Trace autocommit, consistent reads, undo/redo, row locks, and deadlocks in a MySQL transaction."
updated: 2026-10-18
translationKey: "database/mysql-transactions-locking-and-innodb-mvcc"
---

InnoDB must let many transactions read and write concurrently while protecting data. It combines MVCC for consistent reads with locks for writes/conflicts. Understanding them separately explains why a SELECT often does not block UPDATE while `SELECT ... FOR UPDATE` can wait on a lock.

## Transaction boundaries and autocommit

MySQL normally enables autocommit: each successful statement is its own transaction unless an explicit transaction is started. `START TRANSACTION` groups statements until `COMMIT`/`ROLLBACK`. A transaction holds locks until it finishes, so opening one and then waiting on a user/network can retain locks and row versions.

Many DDL statements cause implicit commits; do not assume every migration can be rolled back like DML. A session has its own isolation/configuration, so inspect session variables and connection-pool state. Returning a pooled connection with an open transaction is a serious bug.

## MVCC and undo logs

InnoDB keeps transaction/version information so a consistent read can reconstruct an older version from undo records. A writer changes a record; a reader's read view decides which transactions committed and which version is visible. Undo supports rollback and previous-version reads; purge removes undo no longer needed after the oldest snapshot advances.

For example, T1 opens a consistent snapshot and reads balance=100; T2 updates it to 130 and commits. T1 may read 100 again under its snapshot, while a new transaction reads 130. At `READ COMMITTED`, each consistent read usually gets a fresh snapshot; at `REPEATABLE READ`, consistent reads are more stable within the transaction. Locking reads follow different rules and can wait for a writer.

### Two SELECT forms can see different versions

Suppose `account(id=7)` has `balance=100` and the isolation level is `REPEATABLE READ`:

| Time | Session T1 | Session T2 |
| --- | --- | --- |
| 1 | `START TRANSACTION;` | |
| 2 | `SELECT balance FROM account WHERE id=7;` → `100`; T1's read view is created | |
| 3 | | `UPDATE account SET balance=130 WHERE id=7; COMMIT;` |
| 4 | The same ordinary `SELECT` reads its consistent snapshot → `100` | |
| 5 | `SELECT balance FROM account WHERE id=7 FOR UPDATE;` is a locking read; it needs current state to lock and may return `130` | |

Do not mix consistent reads and locking reads while assuming they always use the same snapshot. If the application must “read a balance, then decide whether to write,” use a locking read in a short transaction or a conditional update such as `UPDATE ... WHERE balance >= amount`, then check the affected-row count. The latter often combines the check and change in one statement; complex business rules may still need an explicit transaction and locks. Identify the isolation level, when the read view was created, and which SELECT form ran before explaining the result.

## Row, gap/next-key locks, and isolation

InnoDB row locks attach to index records accessed by the query. Without a suitable index, a scan can examine/lock more records than expected. For range predicates, `REPEATABLE READ` may use next-key locks (record plus gap) to prevent a matching phantom insert; details depend on query plan and isolation. A gap lock is not simply “a lock on a nonexistent row.”

`SELECT ... FOR UPDATE` fits read-then-update of the same record; `FOR SHARE` has its own locking-read semantics. Use exact predicates and indexes to keep lock ranges small. Do not hold locks while calling external APIs.

### The index determines which ranges are locked

Suppose `account.id` is the primary key and the table has IDs `10` and `20`. Under `REPEATABLE READ`, a range locking query may need to protect the scanned index range, not only the two rows returned:

```sql
-- Session T1
START TRANSACTION;
SELECT * FROM account WHERE id BETWEEN 10 AND 20 FOR UPDATE;

-- Session T2: may wait for T1
INSERT INTO account (id, balance) VALUES (15, 500);
```

`id=15` does not exist yet, but it lies between keys inside the range. InnoDB uses next-key locks (a record plus the preceding gap) to prevent an insert from creating a phantom in the locked range. A lookup by a complete unique key usually needs only the found record; a non-unique/range predicate can lock index records scanned by the execution plan, including records later rejected by another condition. Therefore, a narrow-looking `WHERE` clause does not guarantee a narrow lock: inspect the index and plan, then examine `data_locks`.

At `READ COMMITTED`, InnoDB generally disables gap locking for ordinary searches/index scans, so phantoms may appear; gap locks remain for foreign-key and duplicate-key checks. Choose isolation based on the invariant to protect, not only to reduce lock waits. Changing an index can change the scanned range and lock footprint even when SQL stays the same.

## Redo, commit, and crash recovery

Redo logs record enough changes for InnoDB to replay them; dirty data pages can flush later. Commit durability depends on redo flush policy, binary-log coordination, and storage flush semantics. `innodb_flush_log_at_trx_commit` and `sync_binlog` change the tradeoff; weaker values can lose a recently acknowledged transaction on crash/power loss. Account for OS/storage caches too.

Undo and redo have different roles: undo supports rollback/old versions, while redo recovers logged changes. During an update, the buffer pool holds pages in memory; background flushing/checkpointing bounds recovery work. A hot copy of data files is not a substitute for a backup.

## Deadlocks and mixed storage engines

A deadlock occurs when transactions hold locks in a cycle. InnoDB detects it and rolls back a victim; applications should retry the whole transaction after a deadlock, use a consistent lock order, and keep transactions short. A lock-wait timeout does not always roll back the full transaction like a detected deadlock; apply an explicit rollback policy.

### Trace a deadlock with two accounts

Suppose two sessions transfer money between accounts 1 and 2, but acquire locks in opposite order:

The code below is a **two-session schedule** to read row by row, not one script for a single connection. Each transaction has updated its own row before requesting the other row:

```sql
-- T1                           -- T2
START TRANSACTION;              START TRANSACTION;
UPDATE account                  UPDATE account
SET balance = balance - 10      SET balance = balance - 20
WHERE id = 1;                   WHERE id = 2;
-- T1 holds row 1               -- T2 holds row 2

UPDATE account                  UPDATE account
SET balance = balance + 10      SET balance = balance + 20
WHERE id = 2;                   WHERE id = 1;
-- T1 waits for T2               -- T2 needs row 1 held by T1
```

After the last two statements, the wait edges are `T1 → T2` (T1 needs row 2) and `T2 → T1` (T2 needs row 1), forming a cycle. InnoDB chooses a victim to break it; the other transaction can continue after the lock is released. The application should not resume halfway through the failed transaction: roll back/retry the **whole money transfer** with the same invariant, cap retries, and use jittered backoff. If every code path locks IDs in ascending order (1, then 2), that consistent order removes this cycle pattern, though other deadlocks can arise from index/foreign-key locks or different code paths.

A deadlock differs from a lock-wait timeout: a timeout says a request waited too long, but there may be no cycle. When InnoDB detects a deadlock, it rolls back the victim; on timeout, the default usually rolls back only the statement that timed out unless `innodb_rollback_on_timeout` is enabled to roll back the whole transaction. The application should deliberately return the transaction to a known state before reusing the connection.

A transaction touching InnoDB and MyISAM tables has no unified atomic rollback because MyISAM is nontransactional. Keep related invariant-bearing data in transactional engines.

## Investigation

Use `performance_schema.data_locks`, `data_lock_waits`, `SHOW ENGINE INNODB STATUS`, process lists, and slow-query evidence to find blockers. Inspect transaction age, SQL, indexes, lock modes, and the wait graph. Do not only increase timeouts; locate the query/transaction creating a broad lock range.

*High Performance MySQL*, chapter 1, explains architecture, transactions, MVCC, and locks; current behavior: [InnoDB transaction model](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html), [consistent reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html), [locking reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html), [locks set by statements](https://dev.mysql.com/doc/refman/8.4/en/innodb-locks-set.html), [gap and next-key locks](https://dev.mysql.com/doc/refman/8.4/en/innodb-next-key-locking.html), [deadlocks](https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlocks.html), and [InnoDB parameters](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html).

## Check your understanding

**Does MVCC mean a writer needs no lock?** No; MVCC supports versioned reads while conflicting writers still need locks.

**Why can a missing index widen lock waits?** A scan must inspect more index records/rows and may lock a wider range.

**Should only one statement be retried after a deadlock?** Usually retry the whole transaction so its logic runs against a consistent state.
