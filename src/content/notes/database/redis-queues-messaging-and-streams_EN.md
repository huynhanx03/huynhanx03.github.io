---
title: "Redis Queues, Messaging, and Streams"
category: "Database"
description: "Choose lists, Pub/Sub, or Streams by delivery, replay, consumer groups, and failure handling needs."
updated: 2026-10-18
translationKey: "database/redis-queues-messaging-and-streams"
---

A queue needs more than “push” and “pop.” Ask whether messages may be lost, what happens if a consumer dies mid-processing, whether retries/deduplication are needed, and whether replay or independent subscribers matter. Redis offers several primitives with different semantics; they are not interchangeable message brokers.

## A simple list queue

`LPUSH` and `RPOP` make a basic FIFO, but a consumer can pop and then crash before processing, losing the message. `BRPOP` waits instead of polling. Moving a message from a queue to a processing list (`LMOVE`/`BLMOVE`) allows a reaper to recover unfinished work, but requires an atomic move, retry count, idempotent handler, and dead-letter policy.

The book's email queue pushes a JSON task to the tail with `RPUSH`; a worker waits and pops from the head with `BLPOP`, then dispatches to a registered callback. A multi-task payload has the form `[callback_name, arguments]`; the worker must call only callbacks on an allowlist, not execute an arbitrary function named by the message. Popping prevents two workers from taking the same item, but there is no acknowledgment: a process that dies after the pop can lose the task, and the example logs then skips an unknown callback. Multiple keys passed to `BLPOP` are checked from left to right, so they can model strict priority; a continuously non-empty first queue can starve later queues. In Redis Cluster, all keys in one `BLPOP` call must share a hash slot; hash tags can co-locate them but also place that workload on one shard. Separate queues by workload to isolate retries, concurrency, and poison-message failures.

## Pub/Sub is an ephemeral signal

Redis Pub/Sub sends messages to currently connected subscribers. A disconnected subscriber misses them; there is no backlog, acknowledgment, or replay. Use it for best-effort invalidation/hints or real-time fanout when the source of truth lives elsewhere. Do not use it for work that must eventually be processed if losing one message is a business failure.

## Streams and consumer groups

`XADD` appends an ID-addressed entry to a Stream. `XREAD` reads from an ID; a consumer group distributes entries and tracks pending entries. A consumer calls `XACK` after processing; unacknowledged entries in the pending list can be claimed by another consumer after a timeout. This enables at-least-once processing: handlers must be idempotent because work can repeat.

`XTRIM`/`MAXLEN` constrain log growth but may delete entries consumers still need; choose retention by outage/replay window. Monitor abandoned pending entries and define claim/retry/poison-message procedures. `XACK` does not prove that a database side effect committed if the consumer acknowledges in the wrong order; use an application transaction/outbox/inbox or idempotency.

## Delayed and priority tasks

A ZSET holds tasks that are not due yet; a poller promotes a due task to a ready List, then a worker claims it into processing. A short script/Function can make promotion atomic; that does not make the worker’s side effects exactly once. Handle clocks, leases, retries, cancellation, duplicate scheduling, and queue growth. For complex scheduling, visibility timeouts, ordering, and strict durability, compare a Redis pattern with a dedicated broker.

One design in the book keeps future tasks in a `delayed:` ZSET scored by due time, then moves due tasks to an ordinary List queue. One or a few pollers inspect the earliest member; once due, they claim/remove it and enqueue it on the right queue. Do not keep tasks only in a poller's process memory, or a restart loses the schedule. Removing from the ZSET and enqueueing must be atomic (with a suitable script/transaction); a crash between separate commands can lose or duplicate work. Put a unique ID in each payload for retries/deduplication, and use a lease/reclaimer for tasks received but not completed. `BLPOP` queue order can express priority, but monitor starvation.

## Pull messaging for one or many recipients

For offline recipients, store messages in a per-user List; the client pulls a batch after reconnecting, then removes or marks them delivered. Retain a `message_id`, timestamp, sender, payload limit, and retention rule; “popped from the List” does not prove the message was durably saved on the device. If each message needs acknowledgment, retain delivered/acked state or use a Streams consumer group.

A group chat can store ordered messages in a `chat:<id>` ZSET with sequence IDs, membership/last-seen IDs, and an index from each user to their chats. On send, allocate the sequence and write the message in one atomic operation so concurrent senders do not reorder or overwrite messages. On pull, fetch IDs above the user's cursor and advance it. Copying every message to each recipient inbox gives fanout writes and cleanup work; a shared log saves copies but needs a cursor per member and group-level retention. Without durable delivery/ack markers, reconnects may duplicate or miss messages; clients should process message IDs idempotently.

## Redis as a temporary file handoff

Chapter 6 also combines group messaging with String keys to pass log files from a producer to several processors. The producer splits a file into blocks and `APPEND`s them to a key, publishes the filename, caps total bytes held in Redis, and waits for every consumer to finish before deleting it. A consumer reads blocks, retains an incomplete final line for the next block, decompresses a stream when needed, processes lines, and increments a completion counter. The producer uses that count to free the file and send more, creating backpressure.

The lesson is block streaming, fanout, acknowledgment, and memory bounds; a Redis key alone does not make a file immutable or processing exactly once. A design needs file ID/version, checksum, consumer identity, timeout/retry, dead-consumer handling, and cleanup of abandoned transfers. For large or long-lived files, object storage/shared filesystem plus a queue carrying metadata is often a better fit than keeping every byte in Redis memory. Block sizes, RAM use, compression ratios, and speeds in the book are historical examples and need fresh benchmarks.

*Redis in Action* chapters 6 and 11 illustrate queues, Pub/Sub, and Streams/monitoring as understood when the book was written. Check semantics in [Lists](https://redis.io/docs/latest/develop/data-types/lists/), [`BLPOP`](https://redis.io/docs/latest/commands/blpop/), [Redis Cluster hash tags](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/#hash-tags), [Pub/Sub](https://redis.io/docs/latest/develop/pubsub/), [Streams](https://redis.io/docs/latest/develop/data-types/streams/), and [consumer groups](https://redis.io/docs/latest/commands/xreadgroup/).

## Check your understanding

**Does Pub/Sub redeliver a message when a subscriber reconnects?** No.

**Do Streams consumer groups guarantee a handler runs only once?** No; pending-entry reclaim can cause repeated processing.

**Is acknowledging before a database commit safe?** No; a crash after acknowledgment can lose an uncommitted side effect's retry opportunity.
