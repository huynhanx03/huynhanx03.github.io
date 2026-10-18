---
title: "Schema Design and Data Types in MySQL"
category: "Database"
description: "Choose column types, keys, and normalization according to data meaning while accounting for storage, indexes, and schema changes."
updated: 2026-10-17
translationKey: "database/mysql-schema-and-data-types"
---

A money column using `FLOAT`, an auto-incrementing identifier chosen as the clustering key, and a customer address copied into every order may all work. But they can lead to rounding errors, larger secondary indexes, or many copies that are hard to synchronize. A good schema represents the domain, rejects invalid data, and supports the workload without storing more than needed.

## Choose types for the value range

Smaller integer types use less space than larger ones but have narrower ranges. Determine minimum and maximum values, growth over time, and operations before choosing `TINYINT`, `INT`, or `BIGINT`; `UNSIGNED` changes the range and comparison behavior. Do not use a type so small that growth forces an emergency migration.

How precisely must money be represented? `DECIMAL(p,s)` stores decimal values with declared precision and scale; `FLOAT`/`DOUBLE` are approximate and better suited to scientific quantities with explicit tolerance. Do not use floating point for account balances when the application requires exact decimal addition and subtraction.

For strings, `CHAR(n)` has fixed-length semantics and `VARCHAR(n)` has variable length up to a limit. `TEXT` suits larger content but affects indexing, sorting, row layout, and operations. Declared length and actual bytes differ by character set; Unicode characters can use several bytes. Choose a consistent character set/collation, especially for unique constraints and case-insensitive comparisons.

A birth date is a date; an event time is a timestamp/datetime with an explicit time-zone convention. MySQL `TIMESTAMP` converts according to the session time zone, while `DATETIME` stores a date/time value without automatically attaching a time zone; check the [date and time type semantics](https://dev.mysql.com/doc/refman/8.4/en/datetime.html) for the version in use. Whether to store UTC or local time is an application decision that must stay consistent from input to display.

`ENUM`/`SET`, `BIT`, `JSON`, `BLOB`, and `TEXT` can be convenient for some cases but do not replace domain analysis. An enum turns a value list into a schema change; JSON flexibility comes with query and index behavior tied to expressions and engine features. Read [MySQL data types](https://dev.mysql.com/doc/refman/8.4/en/data-types.html) before settling a long-lived design.

## Choose identifiers with index costs in mind

A primary key identifies a row and may determine InnoDB's physical layout. A narrow sequential key can preserve clustered-page locality for some workloads; random UUIDs may insert across many pages, split pages, and enlarge indexes. UUIDs may fit when IDs must be generated across distributed systems or their order should be hard to guess; binary/time-ordered formats and schema-specific tradeoffs need measurement.

InnoDB secondary indexes carry the primary key to locate a clustered row. Every secondary index is therefore affected by primary-key size. Choosing a natural key such as email requires considering whether it can change, its collation and length, and the cost of updating several indexes. A narrow surrogate key may help the layout but does not remove the need for a unique constraint on a business key.

## Normalization, copies, and summary tables

Normalization keeps each fact in an appropriate place, reduces update anomalies, and lets constraints express relationships. Denormalization may reduce joins or speed a read path when the workload demonstrates a need. It raises questions: which copy is the source of truth, when is it updated, which transaction protects both copies, and how is drift repaired?

MySQL does not provide a native materialized view in the sense of a table-like object whose query result is automatically refreshed. Systems commonly build summary/cache tables or maintain aggregates in application code, triggers, or jobs. A counter table can become a hotspot when many transactions increment one row; sharding the counter and combining it later trades immediate exactness for read complexity.

Do not add a cache table before profiling a query. If you use one, define its refresh cadence, rebuild path, idempotency, consistency lag, cleanup, and metrics for detecting drift. Update source and copy in the same transaction when atomicity requires it; if updates are asynchronous, describe the intermediate state to clients.

## Constraints and NULL

`NOT NULL`, `CHECK`, `UNIQUE`, `PRIMARY KEY`, and `FOREIGN KEY` protect different rules. InnoDB enforces foreign keys and constraints according to its support and version; do not assume another storage engine behaves the same way. Constraint names, cascade behavior, and migration order should be verified on the target version.

`NULL` means an absent or unknown value according to the schema, not zero or an empty string. SQL uses three-valued logic; `column = NULL` does not test for null, so use `IS NULL`. Products differ in how unique constraints treat multiple nulls. A nullable column also adds an unknown case to expressions and predicates.

## Change a schema while the system is running

`ALTER TABLE` may change metadata only, modify data in place, or rebuild/copy the table depending on the operation, engine, row format, and version. “Online DDL” may permit some concurrent DML while still needing metadata locks during phases, extra I/O, space, and time. Read [in-place/online DDL](https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl.html), measure on a similarly sized copy, and prepare a rollback/forward plan.

A safe migration often uses compatible steps: add a structure while old code still runs, deploy dual-read/write code when needed, backfill in batches, verify, switch reads, and remove the old column in a later release. An incompatible one-step change can break the running application.

## Check your understanding

**Does `VARCHAR(255)` always use 255 bytes?** No. It stores the actual length plus overhead; byte count depends on the character set and content.

**Should UUID be the primary key because it is globally unique?** Maybe, but consider width, insert order, clustered indexes, secondary indexes, and distributed ID generation. Measure the workload.

**Is a summary table correct just because application code updates it?** Not necessarily. Atomicity, retries, backfill, idempotency, and reconciliation need explicit rules.

Reading: *High Performance MySQL*, chapter 4; [MySQL 8.4 data types](https://dev.mysql.com/doc/refman/8.4/en/data-types.html) and [online DDL](https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl.html).
