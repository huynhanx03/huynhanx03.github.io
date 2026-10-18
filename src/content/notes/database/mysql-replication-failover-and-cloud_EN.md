---
title: "MySQL Replication, Failover, and the Cloud"
category: "Database"
description: "Follow binlog events to replicas, compare topologies, plan failover, and understand managed database limits."
updated: 2026-10-17
translationKey: "database/mysql-replication-failover-and-cloud"
---

MySQL replication copies changes from a source to replicas, usually through a binary log and relay log. It supports read scale-out and recovery, but does not automatically make multiple nodes a strongly synchronous database. Know where each event is generated, transmitted, applied, and acknowledged to reason about lag and data loss.

## Binary log and replication flow

The source writes events to the binary log; a replica I/O receiver fetches them into its relay log; an applier executes the changes. With row-based logging, row images carry specific changes; statement-based logging records SQL and relies on deterministic semantics; mixed mode chooses by server rules. Choose based on workload, binlog volume, compatibility, and correctness.

GTIDs give transactions global identifiers, making provisioning/repositioning and failover easier than manual file/offset handling. They do not synchronize schema migrations or repair diverged data. Monitor source/applier state, executed GTID set, relay/binlog bytes, lagging transactions/time, and errors. “Seconds behind” may not represent queue/clock state accurately.

## Topologies and consistency

A single-source fanout is easy to reason about, but write capacity remains source-limited. Chains reduce connection fanout but an intermediate failure affects downstream replicas; multi-source needs conflict/order handling. Async replicas lag and may miss acknowledged transactions when promoted. Semisynchronous replication waits for receipt/log acknowledgment according to mode, not necessarily apply; a timeout can fall back to async.

Read routing must account for read-after-write: send a session that just wrote back to the primary, or wait for a GTID/consistency token on a replica if the architecture supports it. A replica may fall behind due to analytics queries, slower disks, or applier capacity. Using a replica for backup does not isolate it from a replicated delete/bug.

## Failover and high availability

Failover must detect failure, choose a sufficiently current candidate, fence the old primary, promote, move endpoints, update clients, and verify consistency. Without fencing, two primaries may accept writes. Failback/rejoin often needs clone/rewind or reseeding; it is not just restarting the old node.

Group Replication/InnoDB Cluster and Router provide topology/group management with their own quorum, certification, network, and recovery assumptions. Define RPO/RTO; rehearse node crashes, partitions, lagging replicas, stale DNS/client pools, backup restores, and rollback. Do not claim zero data loss without mechanisms and tests that establish it.

## Capacity, sharding, and cloud

Read replicas add capacity when traffic can be separated; write scaling needs partitioning/sharding with routing, cross-shard transaction, and rebalancing costs. A load balancer needs health checks and connection draining; an existing connection does not migrate automatically. Reserve failover capacity because a promoted replica must handle primary traffic.

Cloud DBaaS changes economics and operational boundaries: storage throughput, IOPS, network egress, burst limits, backup retention, maintenance windows, failover SLA, and access vary by provider. Estimate costs at realistic load and test restore/export to avoid operational lock-in.

*High Performance MySQL*, chapters 10–13, with [MySQL replication](https://dev.mysql.com/doc/refman/8.4/en/replication.html), [GTID](https://dev.mysql.com/doc/refman/8.4/en/replication-gtids.html), [semisynchronous replication](https://dev.mysql.com/doc/refman/8.4/en/replication-semisync.html), and [Group Replication](https://dev.mysql.com/doc/refman/8.4/en/group-replication.html).

## Check your understanding

**Does GTID eliminate replication lag?** No; it identifies transactions and aids positioning, not applier speed.

**Does semisynchronous receipt mean the replica applied the transaction?** No; receipt/flush/apply are separate stages.

**Is failover safe if DNS is merely changed?** No; fencing, candidate selection, promotion, client recovery, and consistency checks are needed.
