---
title: "MySQL Diagnostic Tools, Status, and Locks"
category: "Database"
description: "Use Performance Schema, status, EXPLAIN, CLI tools, and lock waits to find causes instead of guessing."
updated: 2026-10-17
translationKey: "database/mysql-diagnostics-tools-and-locks"
---

When MySQL is slow, distinguish a bad query plan, lock wait, resource shortage, replication lag, or client pool issue. Tools do not explain the system on their own; connect output to a hypothesis, timestamp, and workload. Many names in *High Performance MySQL* are from MySQL 5.x; prefer current 8.4 Performance Schema/docs.

## Status and instrumentation

`SHOW GLOBAL STATUS` counters accumulate since startup/reset; take two time-separated snapshots and subtract to derive rates. `SHOW VARIABLES` reveals configuration, but session/global scope differs. `SHOW PROCESSLIST` is a current snapshot, not history.

Performance Schema contains instrumented waits, statements, stages, transactions, metadata/data locks, and replication state. Enable relevant consumers/instruments because instrumentation also uses overhead and memory. The `sys` schema offers convenient views over Performance Schema; verify names for the deployed version.

## Read EXPLAIN

`EXPLAIN` describes access path, join order, estimated rows, and key; tree/JSON formats add detail. Compare estimated rows with actual rows from a suitable `EXPLAIN ANALYZE` in MySQL 8.0+, remembering the statement really executes. Inspect rows examined, filtered rows, temporary/filesort, and loop count; cost is not milliseconds.

Appendix D explains historical EXPLAIN columns; columns/formats change by release. Check the manual for the actual server and do not apply old meanings of `Extra`/`type` without verification.

## Lock waits and InnoDB status

`performance_schema.data_lock_waits` connects waiters to blockers; join to `data_locks` and `threads/events_statements` for query, transaction, index/record lock. `SHOW ENGINE INNODB STATUS` includes the latest deadlock and transaction details; output can truncate and reflects only a snapshot. Application transaction traces connect it to a request.

MySQL metadata locks (MDL) differ from InnoDB row locks. DDL can wait for transactions using an object even if no query is executing now. Global read locks, user locks, and named locks also have different scope; identify the type before killing a session. Closing a connection may roll back a large transaction and create more I/O.

### Identify the lock type before looking for its blocker

Appendix E divides server-layer locks into table locks, a global read lock, name locks used while renaming/dropping objects, and user locks from `GET_LOCK()`. These are not one generic kind of “row lock.” Historical process states such as `Locked`, `Waiting for table`, or `User lock` can hint at the wait area, but state names change by version and do not identify the owner by themselves.

At the engine layer, InnoDB uses record, gap/next-key, and intention locks to protect the ranges required by isolation and writes. `SHOW ENGINE INNODB STATUS` helps inspect recent lock waits and deadlocks, but its output is a bounded snapshot. The `INFORMATION_SCHEMA.INNODB_LOCKS` and `INNODB_LOCK_WAITS` tables used in the book have been replaced by corresponding Performance Schema tables in current MySQL.

MDL protects object definitions and coordinates queries with DDL. A query can hold a metadata lock until its transaction ends; an `ALTER TABLE` then waits behind it, and new queries can queue behind the waiting DDL. An incident that looks like “DDL is stuck” may have started with an old idle transaction. Inspect `performance_schema.metadata_locks` alongside thread/processlist information and transaction age.

The book's `SHOW PROCESSLIST` examples use old MySQL states such as `Locked`, `Waiting for release of readlock`, `Waiting for table`, and `User lock`. They help narrow the area in that release, but a state is not a stable interface for reconstructing every owner–waiter relationship. The book also uses `mysqladmin debug` to print table-lock owners to the error log; this is a coarse debugging tool, not a convenient monitoring query. `SHOW OPEN TABLES` can expose `Name_locked`, but it does not fully identify the owning session.

In MySQL 8.4, `performance_schema.metadata_locks` records both granted metadata locks (`GRANTED`) and pending requests (`PENDING`), including user-level locks acquired with `GET_LOCK()`. Thus the book's statement that there is no way to find a user-lock owner is outdated. Visibility depends on the lock type: use `metadata_locks` for metadata/user-level locks and `data_locks` plus `data_lock_waits` for InnoDB data locks. Do not assume one diagnostic table covers every server and engine lock.

For InnoDB, `performance_schema.data_lock_waits` represents requester → blocker relationships; join both sides to `data_locks`, threads, and statement events to find the object/index, lock mode, query, and connection. The data is a glimpse of fast-changing state: by the time a query result is read, a wait may have disappeared or changed. Use `sys.innodb_lock_waits` when appropriate, then confirm with transaction age and application traces. Do not assume several views queried together form a perfectly consistent snapshot.

The book also describes enabling `innodb_lock_monitor` with a specially named table, then reading lock listings in `SHOW ENGINE INNODB STATUS` or the error log. This can explain record/index lock structure, but the output can be enormous: each lock may include a record dump, the status output is bounded, and the historical monitor prints only a limited number of locks per transaction. On current MySQL, start with Performance Schema to filter the relevant wait; use InnoDB status as supporting evidence for deadlocks or engine detail. Do not enable the old monitor on a busy system without considering log volume and the chance of crowding out other diagnostics.

### Trace a wait chain

1. Record the timestamp and identify the slow request; capture the process list and waiter count.
2. Determine whether the wait is MDL, an InnoDB data lock, a named lock, or a table/global lock. Use matching instrumentation instead of guessing from the word “locked.”
3. Find the owning transaction, its age, connection state, and recent statement. A blocker shown as Sleep can still hold an uncommitted transaction.
4. Trace the transaction back to application code: a network call inside the transaction, slow work between SQL statements, missing commit/rollback, or an oversized batch.
5. Kill only after considering rollback duration, retry behavior, and business impact. Then fix transaction boundaries/order and alert on idle-in-transaction.

For example, session A begins a transaction, updates a row, then waits for an external service before committing. Session B waits on the same row; 12 more sessions queue behind it. A's current query may be `NULL` because its connection is idle, but its transaction still holds the lock. Raising the timeout extends the queue; moving the service call out of the transaction addresses the cause.

## CLI and operational tools

`mysql`, `mysqladmin`, `mysqlbinlog`, dump/restore, `mysqldump`, and monitoring stacks serve different roles; test commands on the actual version with suitable privileges. For large files, checksums, compression, network throughput, and resume strategy matter; piping a dump directly into production needs protection against partial failure.

Third-party tools/variants such as Percona Server, MariaDB, and Drizzle differ in compatibility, features, and support lifecycle. Sphinx is a historical search service in the book; today compare MySQL full text, Redis Search, or a dedicated engine by requirement instead of assuming Sphinx integration.

Sources: *High Performance MySQL*, chapter 16 and Appendices A, B, and E; [Performance Schema](https://dev.mysql.com/doc/refman/8.4/en/performance-schema.html), [data locks](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-data-locks-table.html), [data lock waits](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-data-lock-waits-table.html), [metadata and user-level locks](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-metadata-locks-table.html), [consistency of lock information](https://dev.mysql.com/doc/refman/8.4/en/innodb-information-schema-internal-data.html), [EXPLAIN](https://dev.mysql.com/doc/refman/8.4/en/explain.html), and [mysqlbinlog](https://dev.mysql.com/doc/refman/8.4/en/mysqlbinlog.html).

## Check your understanding

**Does a global status counter of ten million prove ten million per second?** No; use a delta divided by elapsed time.

**If MySQL is slow and processlist shows a running query, is it the blocker?** Not necessarily; inspect lock-wait graph/metadata-lock evidence.

**Does killing a session only stop one statement?** It usually closes the connection and rolls back its transaction; assess impact first.
