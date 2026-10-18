---
title: "Distributed Transactions, Consensus, and Data Partitioning"
category: "Database"
description: "Follow a transaction across nodes to understand 2PC, consensus, sharding, and ways systems reduce coordination between nodes."
updated: 2026-10-17
translationKey: "database/distributed-transactions-and-consensus"
---

An order updates inventory in two regions and writes a payment record on another node. If one place commits while the other times out, the system is partially complete. A transaction inside one process can use local logs and locks; when participants span machines, a coordinator must help all sides reach a decision even if a message or node disappears.

## Two-phase commit asks everyone to prepare before deciding

In **two-phase commit (2PC)**, a coordinator manages a transaction across two phases:

1. **Prepare**: the coordinator asks each participant to durably record a prepared state and reply that it can commit.
2. **Commit/abort**: if every participant votes yes, the coordinator durably records the commit decision and sends commit; if any participant refuses, it records and sends abort.

A prepared participant often has to hold locks or resources until it learns the decision. If the coordinator dies after every participant has prepared but before the decision reaches them, a participant cannot guess commit or abort and still preserve atomicity. This is why 2PC can **block** while the coordinator or network remains unavailable.

The coordinator must also recover its decision from a log after restart and resend messages. Participants need to handle duplicate messages safely. A timeout does not prove the coordinator aborted; it only means the client has not received a response.

## Three-phase commit adds a state but needs stronger assumptions

**Three-phase commit (3PC)** adds an intermediate state to reduce some blocking cases when message delays are bounded and the failure detector assumptions hold. In a fully asynchronous network, a node may be arbitrarily slow, so a timeout still cannot distinguish delay from a crash. 3PC is not a universal replacement for 2PC; its conditions must fit the deployment environment.

Another approach is to avoid distributed transactions by changing business boundaries, using sagas/compensations, or designing an idempotent event flow. These approaches do not provide atomic commit across services: they allow intermediate states and require retry and compensation handling.

## Consensus helps a group agree on a history

Consensus asks nodes to decide on the same value or order despite some failures. In a database, a replicated log needs an order so replicas apply the same changes. **Atomic broadcast** delivers messages in the same global order to nodes; under suitable conditions it is closely related to consensus.

Paxos separates proposers, acceptors, and learners. Increasing ballots/rounds and majority quorums help a new proposer preserve decisions that may already have been accepted. If a proposer fails, another round can continue; safety depends on following quorum rules and preserving state. Multi-Paxos reuses a stable leader to reduce the cost of each decision.

Raft organizes the process around terms, elections, log replication, and a commit index. A leader commits entries only under majority and log rules; in a new election, nodes compare terms and indexes to select a sufficiently up-to-date candidate. A client ACK should be interpreted according to the implementation's commit guarantee, not as “every replica has written to disk.”

ZAB (Zookeeper Atomic Broadcast) uses epochs and a leader to order updates. Byzantine consensus such as PBFT handles nodes that may behave arbitrarily, requiring larger quorums and more messages than crash-fault consensus. Every protocol must state its fault model, membership, and liveness assumptions.

Fast Paxos, Flexible Paxos, Egalitarian Paxos, and Generalized Paxos variants trade round trips, quorum shapes, contention, or which operations may run concurrently. They are not quick configuration switches; each design has its own safety conditions and workload.

## Consensus does not solve every transaction problem

Consensus can decide a log order or leader, but applications still need transaction constraints, isolation, indexes, conflict handling, and retries. A distributed SQL database may use consensus per shard, a cross-shard transaction coordinator, a timestamp service, or deterministic ordering.

The examples in *Database Internals* show several approaches:

- **Calvin** orders transactions before execution to reduce coordination during execution.
- **Spanner** combines replication/consensus with timestamps and bounded clock assumptions to provide external consistency.
- **Percolator** uses a transaction protocol over distributed storage for large data updates.
- **Coordination avoidance** designs transactions so independent operations do not need to wait for one another.

These are case studies in design ideas, not instructions that current internal systems still implement every detail exactly as described in a paper or book.

## Sharding decides where data lives

Partitioning divides a keyspace into shards. Hash partitioning distributes keys fairly evenly but makes range queries harder to gather; range partitioning keeps nearby keys together but can become hot at one end. Consistent hashing maps nodes and keys to a ring to reduce how many keys move when membership changes; virtual nodes improve distribution but do not eliminate hot keys or skew.

If a transaction touches several shards, coordination costs and failure surface increase. Schema and partition-key design should consider query locality, capacity, growth, hotspots, and transaction requirements. Cross-shard transactions can be correct but cost more than local transactions.

## Choose required properties before choosing a protocol

Local performance and cluster-wide scalability are shaped by different parts of the system. The storage engine and a node's read/write path usually determine how quickly one node handles requests; communication, repair, and coordination between nodes often limit cluster size and total capacity. A fast storage engine cannot help much if it stops scaling as the dataset grows; conversely, a slow atomic-commit protocol can erase the gains of fast storage.

Read the system from both sides: local work—storage, buffers, transactions, indexes—and cross-node work—failure detection, leader election, dissemination, anti-entropy, distributed transactions, and consensus. They interact: for example, a multi-shard transaction depends both on each shard's engine speed and on the commit protocol's latency/quorum. Design and tune the end-to-end path, not just one subsystem.

State what the client needs: a single leader, linearizable reads, an acknowledged write that survives one node failure, or an atomic transaction across shards? Then identify quorum, fault model, latency, failure mode, and recovery behavior. “We need strong consistency” is not enough to select a protocol.

## Check your understanding

**Is 2PC the same as consensus?** No. 2PC coordinates a commit decision for one distributed transaction and can block; consensus selects a history/value under a separate fault model.

**Can a participant commit on its own after a 2PC coordinator times out?** Not safely if it has prepared but does not know the coordinator's durable decision.

**Does consistent hashing automatically balance every shard?** No. It reduces how many keys move when nodes change, but hot keys and skew still need separate strategies.

Reading: *Database Internals*, chapters 13–14; original studies listed in the book's bibliography: Calvin, Spanner, Percolator, Paxos, and Raft.
