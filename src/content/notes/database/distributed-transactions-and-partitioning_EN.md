---
title: "2PC, Distributed Transactions, and Partitioning"
category: "Database"
description: "Trace prepare/commit, coordinator failures, Calvin/Spanner/Percolator, and consistent hashing through examples."
updated: 2026-10-17
translationKey: "database/distributed-transactions-and-partitioning"
---

A transaction updating two shards must avoid a state where only one side commits. But a coordinator, network, or participant can fail between steps. A distributed transaction is a protocol across failure domains; putting `BEGIN` in application code does not make two databases atomic.

## Two-phase commit

During **prepare**, the coordinator sends PREPARE; each participant durably records enough state to commit if asked and votes YES/NO. If any vote is NO, the coordinator requests abort. If all vote YES, the coordinator durably records COMMIT and sends COMMIT.

A participant that voted YES but loses its coordinator remains prepared and retains locks/resources because it does not know the decision. This is a blocking failure. The coordinator needs a durable log and recovery inquiry; participants must retain state until they receive a decision. A timeout that unilaterally aborts a prepared transaction can contradict a COMMIT already logged by the coordinator.

3PC adds pre-commit to reduce blocking under bounded timing/network assumptions, but asynchronous partitions/crashes can still violate those assumptions. Do not treat 3PC as a general way to erase distributed uncertainty.

## Calvin, Spanner, and Percolator

Calvin orders transactions in a log before execution to reduce runtime coordination; it requires sequencing/planning and can add latency before execution. Spanner uses distributed clocks/TrueTime uncertainty bounds with Paxos replication to provide external consistency; clock and quorum assumptions are central, not merely “using timestamps.” Percolator uses a timestamp oracle, primary/secondary records, and a lock/commit protocol over Bigtable for distributed transactions.

These designs optimize different contexts; do not copy one component without its failure model, replication, and surrounding metadata service.

## Partitioning and consistent hashing

Partitioning divides key ranges/hashes for capacity; shard-key choice determines locality, skew, and cross-shard transaction count. Split partitions according to both size and load: a range with too much data or too many requests may need to be subdivided. Range partitioning supports range scans but can concentrate load in a hot range. Hash partitioning distributes more evenly but fans out range queries. Consistent hashing places nodes/keys on a ring; virtual nodes improve balance, and membership changes remap only part of the keyspace but require migration/ownership protocols.

Shard migration must keep routing and data aligned: identify the new owner, copy a snapshot, catch up writes produced during the copy, verify state, and only then change the routing epoch so new requests go to the new owner; clean up the old copy after cutover. A system may dual-read/write during migration, but it needs conflict rules. Retries/idempotency and global uniqueness also need a plan. Consistent hashing only locates keys; it does not provide replica consistency or transaction atomicity.

## Avoiding coordination

Transaction design can reduce cross-shard coordination through denormalization, co-location, single-writer partitions, escrow/reservation, or asynchronous sagas. A saga has local transactions and compensating actions; compensation is not a physical rollback and can fail. Choose by invariant: if the invariant cannot be temporarily violated, an atomic/serializable protocol or single owner is needed.

*Database Internals*, chapter 13, compares 2PC/3PC, Calvin, Spanner, Percolator, consistent hashing, and coordination avoidance. Foundational sources: [Spanner paper](https://research.google/pubs/spanner-googles-globally-distributed-database/) and [Calvin paper](https://cs.yale.edu/homes/thomson/publications/calvin-sigmod12.pdf).

## Check your understanding

**Why can a prepared 2PC participant block?** It voted YES but does not know whether the coordinator decided commit or abort.

**Does consistent hashing make cross-shard transactions atomic?** No; it maps keys to nodes.

**Does a saga compensation always undo exactly?** No; it is a compensating business action that can fail or only approximate the original effect.
