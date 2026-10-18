---
title: "Replication, Consistency, and Anti-Entropy"
category: "Database"
description: "Compare what reads and writes replicas can guarantee, then see how read repair, hinted handoff, Merkle trees, and gossip detect and repair divergence."
updated: 2026-10-17
translationKey: "database/replication-consistency-and-anti-entropy"
---

An application writes `status='paid'` to a primary and then reads from the nearest replica. The replica may not have received the change yet, so the application sees `pending`. Keeping data on several nodes does not tell us when a write is acknowledged, which reads must observe it, or how two copies reconcile.

## Replication copies operations or state

A replica may receive operation logs from a leader, row-level changes, or a snapshot followed by a change stream. Replication can be synchronous or asynchronous; the topology may be leader-follower or multi-leader. Each choice affects latency, write availability, failover, and the risk of losing an acknowledged write.

With asynchronous replication, the primary may answer the client before a replica records the change. If the primary fails before the replica receives it, an acknowledged write can be lost. Tighter synchronization may wait for more nodes or a quorum, increasing latency and stopping writes when enough replicas are unavailable. No topology can ignore all delay and guarantee identical replicas during network failures.

## Consistency describes what clients may observe

**Linearizability** requires each operation to appear as if it occurred at a point between invocation and response, while preserving real-time order for non-overlapping operations. It is a strong guarantee for an object or operation history, but requires coordination among nodes.

**Sequential consistency** requires every client to observe the same global order, consistent with each individual client's operation order, but that order need not match real time across clients.

**Causal consistency** preserves causal order: if operation B depends on A, a reader should not see B without seeing A. Independent operations may be observed in different orders.

**Eventual consistency** says that if no new updates occur and the system continues exchanging data, replicas eventually converge. It does not specify how long readers can see stale values, how concurrent updates are resolved, or whether updates can be lost.

Session guarantees such as read-your-writes, monotonic reads, and monotonic writes give one client more consistent behavior even before global convergence. Tunable consistency lets a client choose how many replicas must respond to a read or write; that provides only the guarantees defined by the protocol and does not replace understanding quorum overlap, topology, and failover.

## Use CAP with a precise scope

CAP says that during a network partition, a system must trade off a form of strong consistency and availability as defined by the system. A partition is not a configuration switch that appears at startup; it is a failure that prevents nodes from communicating. CAP does not conclude that a normally operating database can choose any two of three properties, and it does not replace analysis of latency, durability, or recovery.

Ask specific questions: when two regions cannot communicate, which side accepts writes? Can reads be stale? Will writes on a minority side survive failover? Can the system return an error instead of waiting? Each answer must be checked against the protocol and configuration.

## Versions and merging writes from several replicas

A vector clock or version vector records causal relationships among versions. If two versions are ordered, the system can choose the later one according to its rules. If they are concurrent, it needs conflict resolution such as last-write-wins, a business-specific merge, or retaining both for the application. Wall-clock time is not always a trustworthy order when clocks drift or timestamps tie.

A CRDT (conflict-free replicated data type) defines operations or state so valid changes can be merged with an operator that has the required properties. This is not a way to merge arbitrary data: the model must fit the business rule, may require metadata, and cannot represent every update policy.

A witness replica may participate in quorum or membership decisions while storing no full data copy. It can help with some membership/consensus decisions but cannot serve data it does not hold.

## Anti-entropy finds replica divergence

**Read repair** detects differences when one read asks several replicas and repairs stale copies according to system policy. It works when a key is read; rarely accessed keys may remain divergent longer.

A **digest read** compares hashes or version summaries before transferring full values. If digests differ, the system exchanges more data to locate the difference. A **Merkle tree** divides hashes by key range; two nodes descend into differing branches to identify divergent regions instead of comparing the entire dataset.

**Hinted handoff** temporarily stores an update for an unavailable replica and forwards it when that replica returns. Hints reduce the time an update is missing, but require expiry, capacity, and handling when the returning replica starts from an older snapshot.

**Gossip** exchanges state with selected peers to spread membership, versions, or health information. A bitmap version vector can summarize many versions compactly when nodes and ranges are indexed appropriately; it saves communication but must handle rollover, membership changes, and metadata.

Anti-entropy only identifies that “this copy differs from that copy.” Safe repair needs a version order or merge rule that determines the correct value. With last-write-wins, a faulty clock may overwrite a valid update. If conflicts are retained, the application must resolve them.

## Redis illustrates product-specific guarantees

Redis Open Source replication is asynchronous; `WAIT` can request confirmation that a number of replicas received data, but it does not turn replication into consensus or guarantee that every write cannot be lost. [Redis replication documentation](https://redis.io/docs/latest/operate/oss_and_stack/management/replication/) describes these details. Redis Cluster uses asynchronous replication and has a window in which acknowledged writes can be lost; the [cluster specification](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/) explains the tradeoff. Managed Redis products add their own options, so distinguish Redis Open Source documentation from Redis Software or Cloud documentation.

## Check your understanding

**Does eventual consistency mean every write is always preserved?** No. Convergence after updates stop does not guarantee that a write survives a crash or failover.

**Does read repair immediately fix every divergent key?** No. It only has a chance to repair keys that are read, depending on which replicas are queried and the repair policy.

**Is choosing the latest timestamp always correct for concurrent updates?** No. Clocks can drift, and timestamp order may not represent the business rule. Choose conflict handling for the data.

Reading: *Database Internals*, chapters 11–12; official replication documentation for each database product.
