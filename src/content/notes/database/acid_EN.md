---
title: "ACID: what does a transaction protect?"
category: "Database"
description: "Follow a transaction to understand atomicity, consistency, isolation, durability, and the boundaries of their guarantees."
updated: 2026-10-15
translationKey: "database/acid"
---

Transferring 100 units from account A to B involves at least two updates. Debiting A without crediting B leaves stored data representing an incomplete transfer. If concurrent requests read an old balance, individually successful statements can still produce a wrong result.

A **transaction** groups database operations into one unit of work. ACID describes atomicity, consistency, isolation, and durability. Interpret these properties within the transaction boundary and database configuration; the acronym does not protect every application side effect automatically.

## Following a transfer

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

This is an illustrative outline, not a production transfer workflow. Assume integer currency units and two existing accounts; actual code must check affected rows, sufficient balance, authorization, and duplicate requests. Statements must belong to the same properly managed transaction/session.

Starting with A=500 and B=200, the desired committed state is A=400 and B=300. Follow this transfer to see the role of each property.

## Atomicity: commit together or abort together

If the transaction rolls back, its debit and credit must not remain as separately committed outcomes. The database supports this through logging and recovery mechanisms appropriate to its design. [PostgreSQL's transaction tutorial](https://www.postgresql.org/docs/current/tutorial-transactions.html) illustrates BEGIN/COMMIT/ROLLBACK boundaries.

Do not infer that every error automatically refunds money in the same way. Applications must handle failures and terminate transactions according to driver/database rules. An email already sent, an external provider call, or an update in another database is not automatically rolled back by this transaction.

A connection lost during commit may leave the client unsure whether commit succeeded. User responses and retries must account for that uncertainty rather than assuming a lost reply means no transfer occurred.

## Consistency: valid according to which rules?

Without fees, the sum of the two balances should remain 700. A non-negative-balance rule must also hold if required. Primary keys, foreign keys, unique constraints, and checks let the database enforce declared rules.

The database does not infer every business rule. Two type-correct updates can still credit the wrong recipient if the application passes the wrong id. ACID consistency needs appropriate constraints and correct transaction logic. It is also distinct from eventual consistency or linearizability in distributed systems; those address different questions.

## Isolation: protection depends on the level

Isolation controls observations and allowed execution schedules when transactions run concurrently. Not every level behaves as though it is the only transaction. Serializable aims for results equivalent to a valid serial order; the database need not literally execute transactions one at a time.

| Phenomenon | Interpretation |
| --- | --- |
| Dirty read | Reading another transaction's uncommitted data |
| Non-repeatable read | Rereading a row and seeing another transaction's committed change |
| Phantom read | Repeating a predicate query and observing a changed set of matching rows |

Common level names are Read Uncommitted, Read Committed, Repeatable Read, and Serializable. Check guarantees for the specific database: PostgreSQL maps Read Uncommitted to Read Committed, and its Repeatable Read also prevents phantom reads. Its [isolation documentation](https://www.postgresql.org/docs/current/transaction-iso.html) explains the distinctions.

Preventing concurrent spending may require conditional updates, transactional row locks, or suitable isolation. Serializable can reject a transaction with a serialization failure; where appropriate, retry the whole transaction rather than only its final statement.

## Durability: commit survives which failures?

After commit is acknowledged under the configured durability guarantees, the database must recover data within the supported failure model. WAL/redo logging enables recovery even before all data pages reach storage. This does not mean committed data survives destruction of every disk and copy.

Configuration changes guarantees. PostgreSQL asynchronous commit, for example, may acknowledge success before WAL is flushed, allowing recent transactions to be lost in a crash. Its [asynchronous commit documentation](https://www.postgresql.org/docs/current/wal-async-commit.html) explains the trade-off. Asynchronous replication likewise does not imply that a replica has received a commit when the primary replies.

Backups, disaster recovery, and application success responses remain important beyond SQL statements. In the transfer example, report only what the application actually knows about transaction outcome.

## Check the transaction boundary

**Does rolling back after sending an email unsend it?** No. It is an effect outside the database boundary and needs separate coordination to stay consistent with stored data.

**Are SELECT and UPDATE inside a transaction enough to prevent overselling?** Not enough information. Examine isolation, locks, update conditions, and error handling.

**Does NoSQL mean no ACID?** No. Guarantees may cover a document, multiple documents, or transactions within a product-specific scope. Eventual consistency is not shorthand for abandoning all four properties. Read guarantees by operation, scope, and configuration.

[Race conditions](/en/notes/fundamentals/concurrency_race/) helps identify the business operation that needs protection before choosing a database mechanism.
