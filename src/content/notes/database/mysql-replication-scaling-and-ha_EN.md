---
title: "MySQL Replication, Scaling, and High Availability"
category: "Database"
description: "Understand binary logs, GTIDs, replica lag, read scale-out, sharding, and MySQL HA choices along with each model's failover limits."
updated: 2026-10-18
translationKey: "database/mysql-replication-scaling-and-ha"
---

Adding a MySQL replica can increase read capacity and create another data copy for recovery. But a replica is not automatically a backup, a synchronous copy, or a safe failover target. Before deployment, decide when a write is acknowledged, how far a replica may lag, who promotes a primary, and how the application routes traffic to a new node.

## The binary log carries transactions to replicas

The source writes events to its binary log. A replica receiver reads events into a relay log; the applier executes the changes. With **statement-based replication**, the log stores statements; results may diverge if a statement depends on nondeterminism, order, or environment. With **row-based replication**, the log stores row changes; events are clearer but may be larger. **Mixed** selects a format by case. Choose based on semantics, volume, compatibility, and debugging needs.

Replication is asynchronous by default: the source commits and responds before knowing that a replica received or applied the event. Replica lag has two parts: events not yet received and events received but not yet applied. Reads from a replica may be stale; read-after-write may need to read from the source, wait for an applied GTID, or use another consistency policy.

`SHOW REPLICA STATUS`, Performance Schema replication tables, and the error log help monitor receiver/applier threads, source connections, worker errors, and delay. Lag measured in seconds may be misleading when the workload is idle; track GTIDs/positions and the last applied transaction time when needed.

### Receiving and applying events are separate queues

On the source, a binlog dump thread sends events to each replica connection. On the replica, a receiver/I/O thread writes events to the relay log; an applier/SQL thread reads the relay log and executes transactions. A fast receiver does not mean the applier is keeping up. If relay logs keep growing while applied transactions do not, the bottleneck is apply capacity or replica resources. MySQL supports parallel applier workers for transactions that can run concurrently; commit order, conflicts on shared data, and large transactions still limit parallelism.

A successful `START REPLICA` response means the command started the threads; a thread may not have connected to the source yet or may stop on an event error immediately afterward. Check channel status, error logs, and worker errors after startup. Current releases use `replica` terminology in commands and variables, although older names may still appear in metadata and compatibility interfaces.

### The initial replica must pair a snapshot with a log position

A new replica needs a consistent source snapshot and the exact binary-log position or GTID set that corresponds to it. If the data copy comes from one time but the position from another, the replica can miss or replay changes. Use a snapshot/backup method that provides a consistent data-position pair; retain binary logs long enough for catch-up; then verify that the replica applied the intended transactions.

The replication account needs only the required replication privilege, uses a password/TLS appropriate to the environment, and should not be a shared administrator account. `server_id` must be unique in the topology. Record source settings, position, snapshot identifier, GTID set, filters, and validation steps in a repeatable runbook; `SHOW REPLICA STATUS` showing running threads does not prove the data is fully correct.

### Choose a log format and understand filter limits

Statement-based logging records SQL statements and can save binlog space, but results must match on source and replica. Random values, time, unstable ordering, triggers, SQL mode, collation, or engine differences can make the sides diverge. Row-based logging records row changes and usually reproduces deterministic results more directly, but logs can be larger, especially when many columns/rows change; it also affects log inspection and recovery. Mixed format chooses by statement type. Choose based on semantics, bandwidth, retention, and recovery tools, not size alone.

A replica can write received transactions to its own binary log with `log_replica_updates`, allowing downstream replicas to read them. Every server needs a unique ID to prevent event loops. Database/table filters produce an incomplete replica: if promoted as a source, filtered data will not appear automatically. Design filters with the topology, document what each node does and does not contain, and check cross-database/DDL behavior for the selected log format.

## Replication setup, logs, and durability

### From source commit to the replica relay log

At the source, committed transactions are written as binary-log events in the commit order replication must preserve. The replica receiver requests events from a known position or GTID and writes them to the relay log; the applier reads the relay log and applies changes to the storage engine. These processes are independent, so relay logs can grow even while the receiver keeps up: the backlog is then in apply, not in the network.

The binary log is both the source for replicas and an input to point-in-time recovery. The `.index` file lists the binary logs managed by MySQL; it is not a disposable table index. Relay logs hold events waiting to be applied, and receiver/applier metadata tracks separate positions. Set retention and purge policies deliberately, keep enough disk for the expected outage, and do not remove files directly while the server manages them. With `log_replica_updates`, a relay replica writes applied events to its own binlog for downstream replicas.

The book's `sync_binlog=1` recommendation synchronizes the binary log at commit to reduce the window of lost events after a crash, at the cost of more I/O. This is one part of end-to-end durability alongside InnoDB redo flushes, filesystem, controller, and device behavior. Replica metadata and relay-log recovery are also release-dependent. Choose settings by RPO, verify flush semantics on the actual path, and test crash/restart; do not copy the whole MySQL 5.x “recommended” configuration into MySQL 8.4.

A replica can be read-only to limit writes outside replication; `super_read_only` adds a guardrail for ordinary administrative writes. Promotion remains deliberate: fence the old writer, change role/routing through a runbook, and verify there is one writer. Automatically starting replication after an incident is useful only when metadata is recovered correctly; startup control does not replace crash-safe replication.

### A snapshot and its replication position are a pair

A data copy matches a log position or GTID only at the time its consistent snapshot was taken. `mysqldump --single-transaction` gives a consistent view for transactional tables, but does not make nontransactional tables consistent or preserve the position by itself. Physical backups, storage snapshots, and clones also need matching metadata. To initialize a replica, restore the snapshot, configure source/GTID position, start receiver/applier, then verify executed GTIDs and errors; two running threads do not prove the data is correct.

The book's `CHANGE MASTER TO`, `master.info`, file positions, and startup options are from older MySQL versions. Use `CHANGE REPLICATION SOURCE TO`, GTID auto-position where appropriate, current metadata repositories, and backup/clone tools supported by the deployed release. The invariant is unchanged: the data and starting point must come from the same consistent snapshot.

## GTIDs simplify transaction positioning

A Global Transaction Identifier gives a transaction a unique identity so the source and replica can track which transactions have executed. GTID auto-positioning lets a replica request missing transactions without manual file/offset configuration; this simplifies failover and scale-out.

GTIDs do not repair divergent data and do not make replication synchronous. Provisioning still requires a consistent snapshot and preserving the relationship between data and the GTID set. Do not inject or skip transactions without understanding consistency; skipping an event may corrupt data while replication appears healthy.

## Read scale-out does not distribute writes automatically

### Topology and filters require clear data ownership

Source-to-many replicas is easy to understand, but each replica adds a receiver connection, binlog traffic, and management cost on the source. A relay/distribution replica consolidates downstream connections, but if it fails, several replicas lose their event path. A tree reduces direct connections while adding hops; monitor lag at each tier and know which node is current enough to become a source after failover.

Active-active does not mean two nodes can write arbitrary overlapping data. Concurrent updates may apply in different orders on each side without a replication error. Active-passive is safe only when a single writer is enforced through fencing/routing and schema changes have an order. A ring must prevent events from looping through server identity, but it remains difficult to establish authoritative data after a network break or incorrect promotion. Partitioning ownership by keyspace/tenant reduces conflicts only if the invariant is enforced in the application and operations.

### Concurrent writes can silently leave two primaries with different values

Suppose two primaries both start with `x = 1`. Primary A runs `x = x + 1`, while B runs `x = x * 2`. A sees `2`; B also sees `2`. When B's event is applied on A, A computes `4`. When A's event is applied on B, B computes `3`. Both statements are valid, so replication may keep running while the copies end at `4` and `3`.

This is why auto-increment offsets prevent only some key collisions; they do not resolve business conflicts. If multiple writers are required, use non-overlapping ownership or an explicit conflict detection/resolution rule. Otherwise, enforce one writer with fencing.

Replication filters create incomplete copies. A database filter with statement logging may use the current default database, not only the fully qualified table name; row logging has different event rules. A table filter can also omit a table needed by another statement. Before using filters, build a truth table for log format, filter type, default database, fully qualified table, and expected DDL/DML; test on the exact release. Document which replicas must not be promoted as general-purpose sources.

Current MySQL supports multi-source channels, although the book says the feature is unavailable. Each channel has its own receiver/relay/applier flow, but channels do not create a global order across sources, resolve key collisions, or make a cross-source transaction atomic. Use them when each source owns separate schemas/keyspaces and a collision policy is designed in advance.

A source-write, replica-read model fits read-heavy and write-light workloads. Reads from replicas accept staleness; writes remain concentrated on the source. More replicas make the source send more binary-log bytes and increase connection/network load. Relay or chained replicas can reduce source pressure but add hops and latency.

MySQL replication filters can send different databases/tables to different replicas, but filtering creates incomplete copies and may complicate failover. An analytics replica can slow its applier with heavy queries if it shares resources. Assign roles, limit read workloads, and monitor lag.

A source-to-many-replicas topology is simple and suits read scale-out, but the source generates binlogs and sends them to every replica. A relay/distribution replica with `log_replica_updates` can aggregate downstream replicas, at the cost of another hop and failure point. A replica running heavy reports may compete with apply for I/O/CPU; consider a separate node or analytics pipeline instead of allowing long queries to create lag.

Active-active/master-master does not resolve conflicts automatically. If both sides write the same key, apply order can cause lost updates or stop replication. Use it only when write ownership does not overlap or conflicts are explicitly resolved; auto-increment offset/increment solves one kind of ID collision, not data conflicts. A ring makes events able to circle back and complicates recovery. Every topology needs unique server IDs, `log_replica_updates`, GTID/log positions, routing rules, and a person responsible for choosing one writer during failures.

The book says MySQL does not support multi-source replication. MySQL 8.4 now supports multiple replication channels on one replica, each with its own receiver, relay log, and applier. Channels can collect independent sources, but do not resolve key collisions between sources, cross-source transactions, a global order, or schema differences. Define namespaces/filters, monitor each channel, and use this only when data ownership is intentionally separated.

Increasing write throughput usually requires **sharding/partitioning at the application or middleware layer**: routing a tenant/key to a shard, managing shard changes, cross-shard transactions, global uniqueness, migration, and hotspots. One source with many replicas does not become write scale-out.

Capacity planning must include source binlog bytes, network bandwidth, receiver speed, and apply speed during peak hours. Lag grows when one layer receives work faster than it can process it. Parallel workers help when transactions are independent; a large transaction, long DDL, lock conflict, or heavy replica query can still create significant lag. Keep headroom instead of running a replica near 100% apply capacity, or a short burst may take hours to catch up.

## Semisynchronous replication and failover

Semisynchronous replication can wait for at least one replica to acknowledge that it received and logged a transaction before the source returns commit, according to the plugin/configuration. It improves durability over asynchronous replication but does not wait for the replica to apply the transaction or choose/promote a replica. If the source fails, determine which replica has the complete GTID set, prevent split-brain, redirect clients, and handle the old source before rejoining it. [Semisynchronous documentation](https://dev.mysql.com/doc/refman/8.4/en/replication-semisync.html) explains the conditions and limits.

The wait order also depends on `rpl_semi_sync_source_wait_point`. In MySQL 8.4, the default is `AFTER_SYNC`: the source writes and syncs the binary log, waits for a replica to acknowledge receipt, then commits to the storage engine and returns success to the client. With `AFTER_COMMIT`, the source commits first, then waits for the ACK before reporting success. In either mode, an ACK does not mean the replica has applied the transaction; a timeout can make the source fall back to asynchronous replication. Monitor whether semisynchronous mode is actually active, not merely whether its plugin is enabled.

A **delayed replica** intentionally waits for a period to help undo logical mistakes or accidental deletes, provided detection occurs before the delay elapses. It does not replace backups: an error may be detected later, the replica may fail with shared infrastructure, and restores still need testing.

Track `Retrieved_Gtid_Set` and `Executed_Gtid_Set`, or received/executed positions, to see whether events are waiting in the relay log or have not arrived from the source. `Seconds_Behind_Source` may be zero when there are no new transactions even though the copy has not been verified, and may fluctuate around long transactions; combine it with last-event age, applier queue, throughput, errors, and GTIDs. Read-after-write can route reads to the source or use the write's GTID to wait with `WAIT_FOR_EXECUTED_GTID_SET()` until the replica applies it; set a timeout and fallback so requests do not wait forever.

A failover runbook checks replica state/GTIDs, chooses a sufficiently current candidate, fences or stops the old primary, promotes one node, updates router/DNS/proxy, verifies a single writer, and rebuilds topology afterward. “The replica I/O thread is running” does not prove that it applied every transaction.

Before promotion, compare candidate GTID sets, identify transactions acknowledged by the old source but missing on the new node, and make the accepted RPO explicit. Fence the old primary before enabling writes on the new one; two primaries accepting writes are usually harder to repair than a short outage. Repoint replicas using a method suited to the topology/release, verify application reconnect and idempotent transaction retries, then restore the old node. GTIDs locate differences; they do not automatically choose the right candidate or merge divergent write histories.

Do not fix replication errors by blindly skipping events. First inspect the event, statement/row, and transaction state to determine which side is wrong. If repair is needed, change data deliberately and then continue; if divergence is broad or unknown, rebuilding from a consistent snapshot is often safer. Checksums/row samples must account for concurrent writes; repair also needs an authoritative source of truth, not just two temporarily matching checksums.

## High availability: replication, membership, and routing

MySQL Group Replication uses group membership, message ordering, and conflict detection to keep data copies; single-primary and multi-primary modes differ in where writes are accepted. It needs a majority to progress on group decisions. Group Replication does not itself redirect client connections; a router, connector, or middleware must route after failure.

InnoDB Cluster combines Group Replication, MySQL Shell AdminAPI, and MySQL Router as a deployment/routing solution. It reduces the work of assembling components but still requires understanding quorum, network latency, certification conflicts, recovery, backups, upgrades, and client retries. See [Group Replication](https://dev.mysql.com/doc/refman/8.4/en/group-replication.html), [InnoDB Cluster](https://dev.mysql.com/doc/mysql-shell/8.4/en/mysql-innodb-cluster.html), and [Router](https://dev.mysql.com/doc/mysql-router/8.4/en/).

Older HA techniques in the book such as MHA, heartbeat/shared storage, DRBD, or virtual IPs may still exist in systems, but should not automatically be treated as current recommendations. Analyze single points of failure, fencing, split-brain, data-loss windows, promotion time, and how the application handles open transactions.

Replication can diverge or stop because of nondeterministic statements, schema differences, transactions touching nontransactional tables, rollback across engines, temporary-table/connection state, filters, or engine differences. Row-based logging reduces some statement-semantic risks but does not fix incorrect filters, missing schema, pre-existing divergent data, or source transactions that were not durably logged. Keep schema/engine compatibility deliberate, test DDL/upgrades on the real topology, and alert when the applier stops even if the receiver still runs.

## Investigating divergence, errors, and lag

Replication may stop on duplicate keys, missing rows, schema mismatches, or unappliable events. It may also keep running while data diverges if a valid statement produces different results on each side. Check nondeterministic functions, unspecified ordering, SQL mode/collation differences, temporary tables, triggers, filters, storage-engine differences, and direct writes on replicas. Row-based replication often exposes a mismatch when a before-image differs, but it is not a whole-database checksum.

Do not skip an error just to make status look healthy. Preserve the error/event/GTID, identify the source of truth, assess the missing transaction and subsequent transactions, then repair deliberately or rebuild from a snapshot. Older skip tools can bypass unintended transactions or damage GTID history; the right recovery depends on log format, version, and replication mode. Checksums/row comparisons must account for concurrent writes, locks, and tool limits.

Lag is queueing: if events arrive faster than they are applied, the backlog grows; after a burst, a replica catches up only when apply throughput exceeds the arrival rate. Long transactions, DDL, lock contention, hot rows, slow I/O, or analytics queries can become bottlenecks. Measure received/applied transactions and bytes per second, relay-log growth, worker utilization, transaction age, disk latency, and source binlog retention. More workers do not help when work depends on the same order or lock; reducing load, separating roles, or increasing resources may work better.

### Budgeting headroom: replicas must replay every write

A replica does more than serve SELECTs. It must apply the writes already processed by the source, so adding replicas does not divide that write work. The book's example assumes one server can handle 1,000 queries per second. The starting load is 800 reads and 200 writes; when read traffic doubles, the workload becomes 1,600 reads and 400 writes per second. The source handles 400 writes. Each replica must also apply those 400 writes, consuming about 40% of its capacity and leaving room for roughly 600 reads/second. Two replicas serve only 1,200 reads; three are needed to exceed 1,600 reads. That means one source plus three replicas for roughly twice the starting workload.

If traffic grows fourfold, suppose it reaches 3,200 reads and 800 writes/second. Each replica spends 80% of its capacity applying writes and has room for only about 200 reads. It takes roughly 16 read replicas, plus the source, to serve 3,200 reads. This is a deliberately simplified example: it ignores network/binlog overhead, serialized writes, engine differences, and replicas that are slower than the source. Do not use its numbers to size hardware; use it to see why adding replicas has sharply diminishing returns and does not scale writes. When writes approach the source's limit, reduce write work, optimize transactions, or partition/shard data so nodes truly own different write subsets.

### Estimate recovery after a burst

One experiment in the book deliberately creates a backlog on a controlled replica, then measures catch-up speed. If apply is paused for one hour while the source keeps producing transactions, the replica must process both the writes generated during that hour and the writes still arriving after it resumes. If it clears the backlog and catches up after one more hour, it applied the equivalent of two hours of writes in one hour of runtime: throughput was about twice the arrival rate, or roughly 50% of its apply capacity under that test.

A simple model makes the condition clear: the source generates backlog at `λ` transactions/second, the replica applies at a total rate of `μ` transactions/second, and it can catch up only when `μ > λ`. After stopping for `D` seconds, the backlog is about `λD`; while catching up, new writes continue to arrive, so catch-up time is approximately `T = λD / (μ − λ)`. If `μ` is only slightly above `λ`, even a small burst takes a long time to recover; if `μ ≤ λ`, the replica never catches up while that workload continues. This is only an approximation: transactions have different sizes/costs, and locks, DDL, network, and cache state change real throughput.

Do not stop a production replica for this test without assessing RPO, binlog retention, relay-log space, and the cost of rebuilding it. Use a test replica or a safe workload window. In addition to average lag, watch the height and width of lag spikes: increasingly slow recovery is a warning that headroom is shrinking. Retain capacity for bursts, maintenance, and post-failover workload; a node near 100% utilization in normal operation may not have enough capacity when another node disappears.

Some failures look similar in status but belong to different layers. If the receiver keeps retrying a large event, compare `max_allowed_packet` and event size across source and replica. If relay logs grow while the receiver is healthy, inspect the apply queue, disk space, and I/O rate; a full disk can stop the receiver or the server. If a distant replica falls behind while CPU is idle, measure actual network bandwidth and peak binlog generation. Adding replicas also means the source serves each dump stream separately; very large events can create sudden load and memory pressure. Diagnose from the error log, receiver/applier state, and disk trends before changing settings.

Read-after-write can route to the source or capture a write's GTID and wait for the replica to apply it. Define a timeout and fallback: read from the source, wait for a bounded period, or return an appropriate application state. Do not infer consistency from `Seconds_Behind_Source=0` when the source is idle, a replica has just reconnected, or timestamps do not reveal the queue; compare received/executed GTIDs, the newest transaction, and backlog.

## Cloud is a service model, not a consistency property

A managed MySQL service may provide backups, failover, replicas, monitoring, and storage replication. Scope depends on the service/edition: who manages the OS, which variables are configurable, how long backups are kept, how endpoints move, how many writes a failover may lose, and whether binlogs/replicas are accessible. A cloud service does not automatically make an application retry-safe or data strongly consistent.

## Check your understanding

**Can a replica return stale data after the source commits?** Yes, with asynchronous replication; a source commit does not confirm that a replica received or applied it.

**Does semisynchronous mean every replica has committed?** No. The source waits for configured replicas to acknowledge receipt/logging; they may not have applied the transaction.

**Does Group Replication automatically move a client to a new primary?** No. The client needs a suitable Router, connector, load balancer, or middleware.

Reading: *High Performance MySQL*, chapter 10; [MySQL 8.4 replication](https://dev.mysql.com/doc/refman/8.4/en/replication.html), [threads](https://dev.mysql.com/doc/refman/8.4/en/replication-threads.html), [relay logs](https://dev.mysql.com/doc/refman/8.4/en/replica-logs.html), [GTID functions](https://dev.mysql.com/doc/refman/8.4/en/gtid-functions.html), [multi-source channels](https://dev.mysql.com/doc/refman/8.4/en/replication-channels.html), Group Replication, and InnoDB Cluster documentation.
