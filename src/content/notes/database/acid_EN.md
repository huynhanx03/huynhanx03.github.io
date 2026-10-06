---
title: "ACID: The 4 Pillars of Database Transactions"
category: "Database"
---

# The ACID Principles in Databases

In any Database Management System (DBMS), a **Transaction** is the heartbeat of the application. To guarantee **Data Integrity** in high-traffic and failure-prone environments, transactions must strictly adhere to four core properties known as **ACID**.

---

## A - Atomicity
**"All or Nothing."**

-   **Essence:** A transaction consists of multiple steps that must succeed as a single unit of work. If any step fails, the entire transaction is aborted and reverted (**Rollback**), ensuring the database is never left in a "half-finished" state.
-   **Mechanism:** Modern databases guarantee this through **Transaction Logs** and undo mechanisms.

## C - Consistency
**"Data remains valid after every transaction."**

-   **Essence:** A transaction must transform the database from one valid state to another.
-   **Constraints:** It must respect all predefined rules, including **Constraints** (Primary Key, Foreign Key), **Unique** indexes, and **Business Logic**. If any rule is violated, the transaction is rejected.

## I - Isolation
**"Concurrent transactions do not interfere with each other."**

-   **Essence:** Each transaction operates as if it were the only one in the system. It should not be affected by other concurrent operations.
-   **Anomalies Prevented:** Isolation mitigates issues like:
    -   **Dirty Reads:** Reading uncommitted data from another transaction.
    -   **Non-Repeatable Reads:** Data changing between two reads within the same transaction.
    -   **Phantom Reads:** "Ghost" records appearing when a query is re-executed.
-   **Control:** Managed via **Isolation Levels** (Read Uncommitted, Read Committed, Repeatable Read, Serializable).

## D - Durability
**"Committed data is permanent."**

-   **Essence:** Once a transaction is committed, the changes are permanent, even in the event of a system crash, power failure, or hardware error.
-   **Mechanism:** Databases guarantee this using techniques like **Write-Ahead Logging (WAL)**, **Redo Logs**, and **Persistence** mechanisms to non-volatile storage or replication.

---

### Real-World Example: Bank Transfer

When you transfer money:
1.  **Atomicity:** If the system debits your account but fails to credit the recipient due to a network error, it automatically reverses the debit (Rollback).
2.  **Consistency:** The total balance across both accounts remains conserved before and after the transfer.
3.  **Isolation:** If multiple transfers hit your account simultaneously, the balance is updated sequentially to prevent race conditions.
4.  **Durability:** As soon as the app shows "Success," the transaction is written to the bank's disk; power loss will not wipe it.

---

> ACID is the gold standard for financial, banking, and e-commerce systems (typically using RDBMS like PostgreSQL or MySQL). In contrast, some NoSQL systems adopt **Eventual Consistency**—sacrificing immediate ACID properties for higher throughput and global scalability.
