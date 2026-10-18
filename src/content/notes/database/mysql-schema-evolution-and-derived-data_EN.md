---
title: "Derived Data and Safe MySQL Schema Changes"
category: "Database"
description: "Balance normalization with caches and summaries, then roll out schema changes across application versions without losing correctness."
updated: 2026-10-17
translationKey: "database/mysql-schema-evolution-and-derived-data"
---

A report needs the number of orders per department. We could copy the department head's name onto every employee to avoid a join, or store each fact once and join when reading. The first approach makes some reads cheaper, but when the department head changes every copy must change too. Schema design decides where to place the cost: reads, writes, synchronization, or recovery.

## Normalize to protect the source of truth

Suppose `employee(name, department, department_head)` repeats the department head for every employee. If Brown replaces Jones, missing one row during the update leaves two department heads for the same department. If a department has no employees yet, this schema cannot store it independently.

Splitting the data into `department(id, name, head_employee_id)` and `employee(id, name, department_id)` places each fact in one location. Changing the head updates one record; a department can exist before it has employees; constraints can express the relationship. In return, a query that needs the department name and head must join. That is the benefit of normalization: fewer update anomalies and a clear source of truth, not a promise that every query will be faster.

When normalizing, ask which key determines each fact. If `department_id` determines `department_name`, repeating the department name on each employee creates another copy to synchronize. If a value is a historically meaningful snapshot—such as the product name on an invoice at purchase time—the copy may be correct business data rather than a cache. Make the purpose of a copy explicit.

## Denormalize with an update contract

A read-optimized copy needs an owner and a consistency rule. For example, `daily_sales(day, store_id, total, order_count)` can avoid scanning millions of orders for a dashboard. Before adding this table, determine:

- Which query is expensive, and what does profiling show the summary table will improve?
- Does each new, edited, or canceled order update the aggregate in a transaction, through an event, or in a batch?
- How stale may the result be for a client?
- How can the data be rebuilt from the source if a job fails or the aggregate drifts?
- Which metric or reconciliation job detects drift?

Updating both source row and aggregate in one transaction makes them commit or roll back together, but may increase contention. Asynchronous updates separate write load but create a period when source and summary disagree; they need idempotent retries, a checkpoint/watermark, and handling for late or duplicated events. A periodic rebuild is easier to verify logically but must account for scan cost and which data interval users can see during the rebuild.

MySQL does not automatically refresh a stored-result table as a materialized view. Applications, triggers, events, or pipelines maintain summary/cache tables. Incremental updates avoid rereading the whole source but must handle inserts, updates, and deletes correctly; a full rebuild is simpler logically but costs resources and needs a safe swap/consistent-read strategy. Choose according to workload and freshness requirements.

## A counter can become a hot lock

`UPDATE page_counter SET count = count + 1 WHERE page_id = ?` is an atomic addition in the database, but all views of the same page still contend for one row lock. When one row becomes hot, adding connections only puts more transactions in the queue.

One option is to split the counter into slots:

```sql
CREATE TABLE page_counter (
  page_id BIGINT NOT NULL,
  slot SMALLINT NOT NULL,
  count BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (page_id, slot)
);
```

Each update chooses one of a finite number of slots; reads use `SUM(count)` for a `page_id`. Writes spread contention across rows, while reads must aggregate and the total may not be an instantaneous snapshot if slots are still changing. Choose the slot count from measurements; more slots make reads and maintenance more expensive.

A daily counter can use `(day, page_id, slot)` as its key for range queries and retention cleanup. Rows must be pre-created or inserted with an appropriate upsert. If an event is retried, incrementing again double-counts it; use an event ID/deduplication when the metric must be exact. For analytics that can be approximate, state the error and delay instead of creating one global write point for immediate exactness.

## Migrate while old application code is still running

Suppose `customer_code` is `VARCHAR(32)` and needs to become a normalized `customer_id BIGINT`. Replacing the column and deploying once may leave old code unable to understand the new schema, or new code may read it before backfill is complete. Use compatible steps:

1. **Expand:** add the new nullable column and appropriate index/constraint while the old column remains. Verify that the DDL algorithm/lock is supported for the target MySQL version and table shape.
2. **Dual write:** deploy application code that writes both columns in one transaction. Continue reading the old column first and measure how many rows are written to both.
3. **Batch backfill:** migrate old values with row/time limits and a checkpoint so the job can resume after failure. Avoid one enormous transaction that causes undo pressure, long locks, or replica lag.
4. **Validate:** compare null counts, mismatches, duplicate keys, and important aggregates. Stop the transition on a discrepancy; keep a repair path or make the job safe to rerun.
5. **Switch reads:** deploy code that reads `customer_id`, keeping dual writes during observation. Confirm traffic and the rollback path before removing dependence on the old column.
6. **Contract:** in a later release, stop writing the old column and drop it only after a safe observation period. Drop is also a schema change that needs metadata-lock and rollback consideration.

“Online DDL” does not mean every change is lock-free and resource-free. Depending on the operation, engine, and version, MySQL may perform an instant metadata change, in-place work, or a rebuild/copy; phases may still need metadata locks, temporary space, I/O, and time. Read the supported algorithm and `LOCK` options for the target manual version, rehearse with realistic table size, monitor replica lag, and define stop conditions. Do not use internal file-editing tricks or unsupported procedures from historical book examples.

## Weigh the cost before adding copies

Secondary indexes, cached columns, summary tables, and denormalization can reduce read work while increasing stored bytes, index maintenance, write amplification, retry paths, and the number of invariants to preserve. If the current dataset is small, measurement may show that a join is still cheaper than maintaining a copy. When adding a copy, record its source of truth, update owner, freshness semantics, rebuild procedure, and reconciliation method.


## Balance normalization, copies, and read performance

Normalization reduces duplicate facts and insert/update/delete anomalies; it often makes writes simpler and tables smaller. In return, reads need joins, and columns used for filtering/sorting may live in different tables, so one index cannot serve the query. Denormalization places selected facts together to filter/sort in one access path or avoid a join, but increases write work, storage, and the duty to keep copies consistent. There is no “always normalize” or “always denormalize” rule: start with a model that is easy to keep correct, then use profiles of real queries to decide whether a read path needs partial denormalization.

One book example finds the ten newest messages from premium users. With only a time index on messages, the database may read many messages and join to users to discard non-premium authors; starting from premium users may require sorting many messages. Copying `account_type` onto messages with a suitable index may filter and sort through one index, but changing a user's account type then requires updating the related messages. Keep the copy only when read frequency/cost outweighs update and repair cost. Do not classify a historically meaningful snapshot—such as an invoice's product name at purchase time—as a cache if that snapshot is the business fact.

## Cache and summary tables need a refresh/rebuild contract

A cache table can keep a subset or ordering suited to a workload different from the source table; a summary/roll-up table stores a `GROUP BY` result, such as messages per hour. Both shorten reads, but require explicit freshness, atomicity, delete/update semantics, late-event handling, retries/deduplication, retention, and drift repair. Real-time maintenance can add contention; batch rebuilds consume I/O/CPU but are often easier to verify and can produce compact, less-fragmented indexes.

If some staleness is acceptable, an hourly summary can serve a dashboard with up to an hour of delay. If the exact “last 24 hours” count is required while still using summaries, add 23 complete hourly buckets and count the two incomplete boundary intervals directly from the source table. Use half-open intervals `[start, end)` to avoid double counting at boundaries. This turns a large scan into a small aggregation plus two range queries; freshness and exactness are explicit instead of silently returning an approximation.

MySQL does not natively maintain a stored-result materialized view that refreshes itself; the book introduces Flexviews, which consumes row-based binlog changes and applies insert/update deltas to aggregate views. This is the idea of CDC/incremental view maintenance, while Flexviews and the book's tool paths are historical—evaluate a currently maintained CDC tool, binlog retention, event ordering, and recovery before use. A source insert may increment a `COUNT` by one and change a `SUM` by a delta; updates/deletes need to subtract the old value and add the new one, while retries require idempotency.

When rebuilding a summary while readers still need it, create a shadow table, populate and validate it, then use an appropriate rename operation to switch names. Keeping the old table during observation enables a quick rollback; ensure CDC/catch-up has reached the source before the swap, account for writes during the build, and check metadata-lock/atomicity behavior on the target version. Never build from an old snapshot and swap while silently dropping later writes.

## Counter slots trade a write hotspot for read aggregation

A single counter row behaves like a mutex: even though `count = count + 1` is atomic, updates to that row are serialized by its lock. Creating slots and choosing one per event spreads writes; reads use `SUM(count)` to combine slots. A daily key such as `(day, slot)` bounds retention; a compaction job can combine slots into one and clean up the rest. Slot count is a tradeoff: more slots reduce contention but increase read aggregation and cleanup.

A random slot does not prevent duplicate events: if the client times out after commit and retries, the same hit can be counted twice. For exact counts, record an event ID/deduplicate or use transactional-outbox/consumer idempotency; for approximate metrics, state the error/freshness budget. Also consider counter type limits and rollover.

## ALTER TABLE: understand rebuilds, online limits, and safe strategies

The book describes older MySQL as often creating a new empty table, copying rows/indexes, and replacing the old table; for a large table with limited memory and many indexes, this may run for a long time and increase I/O, temporary space, and replica lag. Modern MySQL has instant/in-place/copy algorithms for different operations; “online” generally means some DML can proceed during part of the operation, not that it needs no metadata lock, consumes no resources, or cannot time out. Check the exact operation, engine, row format, MySQL version, `ALGORITHM`/`LOCK`, replication topology, and free space against the current manual before rollout.
+
+When an operation cannot safely run in place, operational approaches include rehearsal on a same-sized clone, running on a replica and moving traffic under a designed procedure, or building a shadow copy and catching up writes before switching. Split the migration into expand/backfill/validate/switch/contract so application versions can coexist. Batch/checkpoint backfill to bound locks, undo/redo, binlog, and lag; validate row counts, nulls/mismatches, uniqueness, and rollback/forward plans.
+
+For older MyISAM tables, the book also describes `DISABLE KEYS`, loading data, then `ENABLE KEYS` to defer non-unique index construction and build them by sorting; this does not disable unique-index checks. This is MyISAM-specific, not an InnoDB optimization or a default for new systems. The chapter also demonstrates editing `.frm` files and swapping `.MYD`/`.MYI` files to avoid rebuilds. These are unsupported techniques tied to old MySQL/MyISAM formats; do not use them on modern systems. Use supported DDL, tested backup/restore, and maintained online schema-change tools when needed. Claims in old examples that `ALTER ... MODIFY` always rebuilds, `.frm` exists, MyISAM is involved, or a particular offline algorithm applies must not be copied verbatim to MySQL 8.4.

## Check your understanding

**Does splitting out a department table make every query faster?** No. It reduces repeated data and update anomalies, but some queries need an extra join.

**Can a single-statement counter update still bottleneck?** Yes. One row still serializes updates; counter slots spread writes but make reads more complex.

**Can the old column be dropped immediately after backfill?** Only after every application version, job, and consumer has stopped reading/writing it, validation succeeds, and a recovery plan exists.

Reading: *High Performance MySQL*, chapter 4; [MySQL 8.4 online DDL operations](https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl-operations.html) and [ALTER TABLE](https://dev.mysql.com/doc/refman/8.4/en/alter-table.html).
