---
title: "Time, Network Links, and Message Delivery Semantics"
category: "Database"
description: "Distinguish latency from timeouts, understand clock skew and retries/ACKs, and compare at-most-once, at-least-once, and exactly-once."
updated: 2026-10-17
translationKey: "database/distributed-time-links-and-delivery"
---

Calling a database on another machine looks like calling a local function, but the call crosses a network, queues, CPU, and storage on both sides. When no response arrives, the client cannot tell whether the request never arrived, the server has not processed it, the transaction committed but its ACK was lost, or the server is merely slow. A protocol must define what is acknowledged and which retries are safe.

## Latency has several stages

An RPC's time is approximately client serialization, outbound network, server queue, processing, disk/replica waits, return network, and client decoding. Every part can vary. A slow response does not necessarily mean the server is dead; a full queue can make new requests slower, trigger retry storms, and add still more load.

A queue absorbs short bursts but has finite capacity. If a producer creates work faster than a consumer can process it for a long time, the queue only delays overload. Backpressure, bounded concurrency, deadline propagation, cancellation, and load shedding prevent accepting work that cannot meet its SLA. Retries need backoff+jitter and limits; retrying every error at once can amplify an incident.

The classic distributed-systems “fallacies” can become design questions: is the link truly reliable; what bounds latency and processing; is there enough bandwidth under load; is data protected on an untrusted network; can topology, addresses, and membership change; do nodes share hardware and software; what do serialization, network, and operational costs add; and who has authority or a global view of the cluster? A request fanned out to many nodes often waits for the slowest one. Without measuring queues, message sizes, and dependence on one authority, a design may work in a demo and fail when load or topology changes.

A local function usually has cost and failure within one process. A remote call adds serialization, authentication, version compatibility, network partitions, queueing, and uncertainty about the result. An API should expose appropriate timeout/deadline, retryability, idempotency key, and observability; wrapping a remote call as if it always succeeds invites misuse.

## Clocks help, but are not shared truth

Each node has its own clock; clock drift, NTP adjustments, and network delay mean timestamps do not guarantee causal order. If node A records an event at `10:00:00.100` and node B records one at `10:00:00.090`, we cannot conclude B happened first if clock error is larger than the gap. Wall-clock timestamps are useful for operators and TTL policy with tolerance; they do not create consensus order by themselves.

Use a monotonic clock for elapsed time/timeouts within one process because a wall clock may be adjusted backward/forward. A timeout is still a decision threshold: shorter thresholds cause more false suspicions/failovers, while longer ones detect failures more slowly. A protocol needs epochs/sequences/quorums or logical ordering when correctness depends on change order, rather than comparing timestamps from different machines as an absolute order.

## What layer does an ACK confirm?

An ACK might mean a packet reached the TCP stack, a message entered a broker, a handler began, a transaction committed, a WAL was flushed, or a replica applied/fsynced the write. These are different milestones. If the client loses the response after the server commits, it cannot know the outcome. Retrying `INCR` can increment twice; not retrying can omit the operation if the server never received it.

| Semantics | What does the sender do? | Risk |
| --- | --- | --- |
| At-most-once | Send once, do not blindly retry | An operation can be lost if its message/response fails |
| At-least-once | Retry until an ACK arrives | The operation may be processed more than once |
| Effectively/exactly-once processing | Use a unique ID, store result/dedup state, and commit the effect with processing state | Needs retention, atomicity, and a retry protocol; it is not free from the network |

One retry-safe pattern has a client send an idempotency key `request_id`; the server stores `(request_id,result)` in the same transaction as the effect. A repeated request returns the saved result instead of applying the effect again. The dedup record must live through the retry window and in the same durability domain as the data. If the effect calls an external system outside the transaction, use an outbox/inbox or a compensating protocol.

TCP provides a reliable byte stream within a connection under transport semantics, but does not guarantee that a business operation executes once across reconnects/process crashes. An application ACK also does not prove data is durable on disk; know the server flush policy and the scope of replica acknowledgments.

## Build link guarantees in layers

A message protocol can be viewed as layers, each adding a guarantee and a kind of state to manage:

1. **Fair-loss link:** messages may be lost, delayed, or duplicated a finite number of times; the link does not invent messages that were never sent. If both processes remain correct and the sender keeps retransmitting, a message eventually arrives.
2. **Acknowledgment and retransmission:** the receiver reports receipt using a unique ID; the sender retries when it has not seen an ACK. This recovers from temporary loss, but the sender may retry after the receiver already processed the message and its ACK was lost.
3. **Deduplication and ordering:** the receiver records processed sequence numbers, discards duplicates, and buffers an early message when a prior number is missing. For example, after receiving `3` and then `5`, it holds `5` until `4` arrives; it can then deliver `4`, `5` in order.
4. **Perfect link (an abstraction):** a protocol built above a fair-loss link can provide reliable delivery, no duplication, and no creation for correct processes. “Perfect” describes the abstraction's contract; it does not mean hardware cannot fail or an application operation runs once across every restart.

Sequence numbers must be scoped to the right sender/epoch, and the receiver must retain enough state through the retry window. If a process restarts and forgets what it has processed, an old message can be applied again. TCP also numbers bytes and handles retransmission within a connection, but reconnect and application transaction boundaries belong to another layer.

An ACK must therefore say what it confirms. “Received by the socket,” “entered a queue,” “handler ran,” and “durably committed” are different milestones. A system that needs durable ACKs may have to write a log before responding or wait for enough replicas under its policy.

## Why can acknowledgments not end an infinite chain?

Two parties exchange messages over a link that can lose them. A sends `COMMIT?`; B receives it and replies `ACK`; A receives that ACK. But if B needs certainty that A received the ACK, B needs an ACK for the ACK. That final message can be lost too. With an asynchronous link and no upper delivery bound, neither side can prove the last message arrived just by waiting.

The Two Generals thought experiment illustrates the limit of **common knowledge** over a lossy link. It does not stop practical systems from using acknowledgments; they choose conditions sufficient for the required semantics, such as a durable log, quorum, or retry/dedup. This is why “exactly-once network delivery” is a misleading promise: transport and process failures leave an uncertain boundary.

## Timing and failure models

In an **asynchronous model**, there is no trustworthy upper bound on message delay or processing; a timeout cannot distinguish a failed node from a slow one. A **synchronous model** assumes time bounds; a **partially synchronous model** allows bounds only after some point or within some error. Database consensus often relies on eventual synchrony to preserve safety while making progress possible.

The failure model matters too: a crash-stop node halts; an omission fault loses sent/received messages; a Byzantine node continues running but may send incorrect/conflicting values. A protocol that tolerates crashes does not automatically tolerate Byzantine behavior. A partition can be asymmetric: A may reach B while B cannot reach A. Crash-recovery is also a different abstraction from crash-stop; correctness must account for what state a restarted process remembers and how it rejoins. A partition can split groups that proceed independently, causing write conflicts or forcing one side to stop accepting writes to preserve consistency.

*Database Internals*, chapter 8, analyzes links, acknowledgments, retransmission, clocks/time, synchrony, Two Generals, FLP, and failure models. The [Raft paper](https://raft.github.io/raft.pdf) shows how timeouts and eventual synchrony appear in a practical consensus protocol.

## Size queues around service capacity

A queue is useful for absorbing a **short burst**, not for hiding sustained overload. Suppose a consumer handles 100 requests per second while producers send 150 per second for two seconds. The queue grows by roughly 100 requests. If arrivals then fall to 80 per second, the consumer can drain the backlog. If arrivals remain at 150 per second, the backlog grows until memory or deadlines run out.

Set queue limits using measured service rate, queue wait, and the latency objective. Five hundred jobs ahead of a consumer that handles 100 per second can add about five seconds of waiting even when each request’s service time is small. A larger queue can help when a pipeline has independent stages, but it does not make one consumer process faster. At the limit, the system needs backpressure, controlled rejection, or load shedding so callers know it cannot accept more work.

Fan-out creates another delay: when a result needs responses from several servers in parallel, completion is governed by the slowest server in that group. More shards or dependencies can increase parallelism while also increasing the chance that one branch stretches tail latency. Set an end-to-end deadline and decide whether a slow branch may be omitted; if the result is partial, the API must say so.

## A reordering buffer tracks what arrived and what was processed

A sequence number is one way to create unique IDs with an increasing counter; the protocol only needs unique IDs, though hashes require a plan for collisions. The receiver must distinguish two positions:

- `n_consecutive`: the highest number for which every message from the beginning through that number has arrived without a gap.
- `n_processed`: the highest number already delivered to the application for processing in order.

Suppose the receiver has `3` and then receives `5`: it knows `4` is missing, so it keeps `5` in a reordering buffer. When `4` arrives, it can deliver `4` and then `5` in FIFO order. If `5` is retransmitted, the processed state lets it discard the duplicate. In a real protocol, the cursor, buffer, and processing result must survive the relevant restart/epoch boundary; if they exist only in RAM and the process restarts, an old message may be applied again.

A **perfect link** names a contract at an abstraction layer: between correct processes, a sent message is eventually delivered, is not delivered twice, and no message is invented. It does not say that a node always stays alive, that data has been durably committed, or that a business effect runs only once. Those require state and protocol at the application layer.

## Check your understanding

**Does a timeout prove the server crashed?** No; it means the client did not receive a response within its chosen threshold.

**Does at-least-once mean the effect runs only once?** No; it allows duplicates to increase the chance of delivery.

**Does a TCP ACK prove a transaction is durably written to disk?** No; transport ACK and commit durability are different layers.
