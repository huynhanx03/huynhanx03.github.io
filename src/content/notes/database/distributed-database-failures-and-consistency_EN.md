---
title: "Distributed Databases: Network Failures, Failure Detectors, and Leaders"
category: "Database"
description: "Learn why a slow node is not necessarily dead, why timeouts prove nothing, and which assumptions leader election needs."
updated: 2026-10-17
translationKey: "database/distributed-database-failures-and-consistency"
---

A primary does not respond for two seconds. It may have stopped, paused for garbage collection, run out of CPU, become isolated by the network, or simply have a slow connection. A replica sees the same timeout but cannot know the cause with certainty. In a distributed database, decisions must be made even though remote state is observed through an imperfect network.

## Retrying does not mean processing exactly once

Suppose a client sends a write and waits for an ACK. If the response is lost, the client cannot know whether the server never received the request or committed it but failed to deliver the ACK. Retrying may perform the operation twice; not retrying may lose it.

Networks can drop, duplicate, delay, or reorder messages. Retries make eventual delivery more likely but create duplicates. Idempotency keys, deduplication, sequence numbers, and idempotent operations help applications handle retries safely. “Exactly once” is usually an end-to-end property built with durable state and deduplication, not a magical guarantee of one message send.

The Two Generals problem shows that two parties exchanging messages cannot reach absolute common knowledge that both know the plan: an acknowledgment can also be lost. Real systems choose suitable liveness assumptions and confidence instead of demanding confirmation forever.

## Distinguish crash, omission, and arbitrary faults

A fault model states what nodes may do:

- **Crash fault**: a node stops and no longer responds.
- **Omission fault**: a sent or received message is lost.
- **Arbitrary/Byzantine fault**: a node may send incorrect data or behave inconsistently.

Many databases assume crash or omission faults in a trusted network; Byzantine-tolerant algorithms are more expensive and require a separate threat model. State the fault model so a conclusion from one protocol is not applied to failures it was not designed to handle.

## A timeout creates suspicion, not truth

A failure detector monitors heartbeats or pings and marks a node as suspect after a deadline. A short timeout detects failures quickly but creates false positives during high load or network jitter; a long timeout reduces false suspicion but slows recovery.

A phi-accrual detector estimates suspicion from the heartbeat arrival-time distribution rather than giving an absolute alive/dead answer. It helps applications tune thresholds to an environment, but it remains suspicion: a suspected node may still be healthy.

Gossip spreads state through rounds of exchanges with selected peers. It avoids a central point and eventually converges, but state is delayed, messages can repeat, and peer views may be incomplete. Merkle trees or digests help compare data efficiently after divergence is detected; they do not decide which copy is correct.

## A small failure can spread across the cluster

Suppose one node slows down. Clients time out, open more connections, and retry; the node must process new requests while its old queue grows, so it slows further. Healthy peers receive extra traffic and begin timing out too. When the node returns, catch-up traffic for missed data can consume all bandwidth or memory. Each step—retry, failover, catch-up—is intended to help, but without limits it can amplify an incident into a **cascading failure**.

Practical guardrails include bounded concurrency and queues, exponential backoff with jitter, deadline propagation, load shedding, a circuit breaker with a recovery period, and a cap on catch-up traffic. A circuit breaker temporarily stops calls to a failing dependency to reduce pressure, then probes it in a controlled way; it does not repair data or prove that the dependency is healthy. Telemetry is needed to see whether requests are blocked, dropped, or waiting.

Replication can also spread incorrect data very efficiently. If a record is corrupted by a software or storage error and a node does not validate it, synchronization may copy the corruption to every replica, possibly overwriting a good copy. Checksums, schema/version checks, invariants, and data provenance can catch problems before applying an update; a checksum detects bit corruption but cannot prove business content is correct.

Failure testing should therefore break different parts of the path: add latency, lose or reorder messages, limit bandwidth, fill queues, restart nodes, and inject filesystem errors. Crashing one node alone does not simulate a one-way partition, a response lost after commit, or a cluster overloaded by replica catch-up. The goal is to confirm that the system preserves its invariants and has a recovery path when part of it misbehaves.

## Leader election must prevent two active leaders

In the Bully algorithm, a higher-ID node responds to an election and becomes leader; a ring election passes candidates around a ring. These are useful for understanding message flows but assume relatively simple membership and communication.

In a real system, merely “choosing a leader” is not enough. Nodes must ensure that an old leader cannot keep writing after another group elects a new leader. **Fencing tokens**, monotonically increasing epochs/terms, or quorums let a resource reject operations from the old leader. A lease is safe only under sufficiently controlled clock and timing assumptions.

Failure detection and election answer different questions: “which node seems unresponsive?” and “which node is allowed to coordinate?” A timeout does not grant write authority by itself.

## FLP and the role of synchrony assumptions

The FLP result says that in a fully asynchronous system, a deterministic consensus algorithm cannot guarantee termination if even one node may crash. It does not say consensus never works. Real systems use assumptions such as eventual timing stability, quorums, randomization, or failure detectors to provide liveness under practical conditions.

This explains why consensus protocols may wait during a network partition or make progress when a majority is available. Availability is conditional: which group has a quorum, which node was elected, which data was committed, and which side the client can reach all matter.

## Control recovery so failures do not spread

Recovery creates load too. When a node returns, it may need a large amount of missed data just as the remaining nodes are serving new requests. Rate-limiting catch-up and coordinating transfers preserve capacity for live traffic; simply retrying more often or streaming as fast as possible can make the recovering node fail again.

Different safeguards address different causes:

| Risk | Safeguard | What it does not guarantee by itself |
| --- | --- | --- |
| Clients retry together after a timeout | Jittered backoff and a retry limit | It does not prove the earlier request failed to commit |
| A failing dependency is called continuously | Circuit breaker, deadlines, and concurrency limits | It does not repair the dependency or incorrect data |
| A replica receives corrupted content | Checksum and validation before applying it | A checksum does not prove business correctness |
| Catch-up consumes query capacity | Rate limits and coordinated synchronization | It cannot fix a node that lacks capacity over the long term |
| A hotspot overloads one node | Schedule or distribute work using observed capacity and load | A forecast based on history can be wrong when workload changes |

The book recommends deliberately testing latency, lost connectivity, bandwidth limits, clock skew, different processing speeds, node restarts, and filesystem or bit-rot failures. Toxiproxy, Chaos Monkey, CharybdeFS, and CrashMonkey are examples named in the book; they illustrate different test layers and may have changed maintenance status since publication. A test should state the invariant to preserve and observe both failure behavior and recovery, instead of checking only that the service still responds.

## The failure model determines what a protocol must tolerate

The labels crash, omission, and arbitrary are still incomplete unless we say whether a process may recover:

| Model | Behavior | Design consequence |
| --- | --- | --- |
| **Crash-stop** | The process stops and does not participate further in the current algorithm instance | The algorithm usually does not rely on that process recovering mid-round |
| **Crash-recovery** | The process stops and later runs again, possibly from old durable state | The design must specify persisted state and identity, recovery, and catch-up |
| **Omission** | A step or send/receive is skipped; a slow process, full queue, or network partition may look like an omission | The node may respond late or lose traffic in only one direction; a delayed response alone does not prove a crash |
| **Arbitrary/Byzantine** | The process keeps running but may send false or contradictory values because of a bug, version mismatch, or malicious actor | The system needs a threat model, cross-checks, and Byzantine protocols if it must tolerate this class |

Crash-recovery is not simply crash-stop plus another startup. If a returning node does not know which operations committed, it may repeat an old decision or message. Giving it a new identity also does not automatically model crash-recovery when the algorithm uses fixed membership and counts failures within a round.

Redundancy or a process group can hide one crash from users, but it often has a cost: after a fault, the system takes a slower path to detect, recover, or rebuild state. Availability and latency during normal operation therefore do not describe performance under failure.

## Check your understanding

**Can a node be removed from membership as soon as its heartbeat times out?** A system may choose that policy, but the timeout is only suspicion. Consider false positives and the consequences if the node is still operating.

**Is retrying a command that increments a balance safe?** Not if the command may be applied twice. Use an idempotency key, a transaction with deduplication, or a retry-safe operation design.

**Does electing a new leader guarantee the old leader stops writing?** No. Epochs/terms, a quorum, or fencing are needed so storage or another resource rejects writes from a leader that has lost authority.

Reading: *Database Internals*, chapters 8–10; the following notes cover replication, consensus, and distributed transactions.
