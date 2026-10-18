---
title: "Redis Commands, Transactions, and Scripting"
category: "Database"
description: "Distinguish atomic commands, pipelines, MULTI/EXEC, WATCH, and scripts/functions in Redis."
updated: 2026-10-18
translationKey: "database/redis-commands-transactions-and-scripting"
---

A Redis command usually finishes before the next command runs on the same server, but that does not make a client-side sequence of round trips a transaction. If an application reads a value, computes, and writes it back, another client can intervene. Choose among pipelines, transactions, and scripts based on whether you need fewer round trips or atomic logic.

## A pipeline reduces round trips, not adds atomicity

A pipeline sends multiple commands without waiting for each reply, then reads the results. It reduces network latency and I/O overhead, but does not isolate the sequence from other clients. Use it for independent commands or when the application accepts intermediate states; cap batch size because Redis must retain replies in memory until the client reads them. Splitting a large ingest into moderate batches usually preserves throughput without letting the response buffer grow too large.

For example, a client can pipeline several `HMGET` calls and join the replies with their IDs. If an operation must “read a value, check a condition, then update” without another client intervening, a pipeline is insufficient; use one atomic command, `WATCH`/`MULTI`, or a script.

## MULTI/EXEC and WATCH

After `MULTI`, commands are queued and run consecutively when `EXEC` arrives. Redis does not roll back already executed commands if a runtime error occurs; a transaction prevents another client's commands from interleaving, but does not provide SQL-style rollback semantics. Syntax/queue errors can cause rejection before execution.

`WATCH key` provides an optimistic check: if a watched key changes before `EXEC`, the transaction aborts and `EXEC` returns null. The client must reread, recompute, and retry with limits/backoff; heavy contention can cause retry livelock. Expiration or eviction of a watched key counts as a change.

A conditional balance transfer might work like this: `WATCH account:7`, read the balance, check that funds are sufficient, then `MULTI`, queue `DECRBY account:7 20` and `INCRBY account:9 20`, and call `EXEC`. If `EXEC` aborts, start again at `WATCH` and read the new balance; do not merely resend the queued commands. Checking both accounts and writing both is safe only if all related keys are watched and the transaction does not abort. In Cluster, keys in a multi-key transaction generally need to share a hash slot.

Distinguish errors while queueing from errors during execution. A syntax error or some queue errors can cause Redis to reject the transaction before `EXEC`; a wrong-type error raised when a command runs does not roll back earlier commands. Validate types and inputs, keep transactions short, and make state detectable or recoverable if a runtime command fails.

## Scripts and functions

A Lua script runs on the server as an atomic unit relative to other commands: commands do not interleave while it runs. A script fits read-check-update logic over several keys with one network round trip. A long or blocking script can slow the whole server because command execution is primarily serialized; bound input/loops and add timeout/monitoring.

Scripts should declare keys through `KEYS` and data through `ARGV`; in Cluster, involved keys must share a slot. Keep logic focused, deterministic, and easy to retry. Redis Functions provide a way to store/deploy server-side functions in supported versions; lifecycle/deployment differs, so check the version documentation.

Atomicity does not mean a script can run indefinitely: while it runs, the server does not process commands from other clients. Do not call network services, loop over an unbounded collection, or pass huge payloads into a script. Bound the time and amount of data in the check/update path. After a client-side timeout, the script may already have completed, so retries still need idempotency.

## Idempotency and retries

A timeout does not tell a client whether the server never ran a command or ran it and lost the reply. Retrying `INCR`, for example, can count twice. Design an idempotency key, set-if-absent command, deduplication record, or suitable transaction. Expire dedup state deliberately and analyze restart/failover cases; the key and associated data share durability guarantees.

## Expiration is not an exact scheduler

`EXPIRE`/`PEXPIRE` sets a key deadline; Redis removes keys using expiration sampling and lazy access. An expired key does not imply a callback executes at the exact millisecond. Use a queue/scheduler for deadline-sensitive work. `TTL` has special results when a key is missing or has no expiry. Overwriting a value can clear its TTL unless an appropriate keep-expiry option is used.

Expiry applies to a whole key, not individual List/Set/Hash/ZSET members. To expire a member, store its timestamp in a Sorted set and remove due members, or store each member under a separate key with a TTL. A successful `SET` normally replaces the value and removes the old TTL; `KEEPTTL` preserves it on supported versions. `TTL` returns `-2` when the key is missing and `-1` when it exists without expiry. A deadline is a lifecycle rule, not a guarantee that the data has been durably written to disk.

## Pub/Sub is temporary broadcast

A publisher sends `PUBLISH channel message`; clients subscribed to the channel receive it while connected and able to read. The channel keeps no history, offers no acknowledgment or replay, and an offline subscriber misses the message. Pub/Sub therefore fits realtime notices that may be lost, such as “this cache was invalidated,” when clients can resynchronize state; it is not a payment queue or source of truth.

`PSUBSCRIBE news.*` receives messages from every matching channel, such as `news.db`; `PUNSUBSCRIBE` cancels one or more patterns. The listener stream also contains control events: after `SUBSCRIBE` or `PSUBSCRIBE`, Redis sends an acknowledgment confirming the subscription; after `UNSUBSCRIBE` or `PUNSUBSCRIBE`, it sends an acknowledgment with the number of subscriptions still active. These are not business messages published by an application. A consumer should distinguish `subscribe`/`psubscribe`/`unsubscribe` events from `message`/`pmessage` events; exact field names and data types depend on the client library.

For retained messages, consumer groups, pending work, acknowledgments, or replay after reconnect, use Redis Streams or a durable broker. Monitor slow subscribers and configure output-buffer limits so a slow reader cannot keep an unbounded backlog in memory. The current [Redis Pub/Sub documentation](https://redis.io/docs/latest/develop/use-cases/pub-sub/) describes delivery as at-most-once.

## SORT and cross-structure query cost

`SORT` orders members from a List, Set, or Sorted set; it compares numerically by default and compares strings with `ALPHA`. `BY` can look up an external score/field using a pattern, `GET` returns related fields, `LIMIT` bounds the returned slice, and `STORE` writes results to another key. The book's older examples use patterns such as `object_*->field` to read Hash fields; this syntax and Cluster support depend on the Redis version.

`SORT` may read and sort a large collection on the command execution path, so `LIMIT 0 10` does not mean only ten members need processing. Prefer a ZSET when the application repeatedly asks for the same ranking; use `SORT` on bounded sets after measuring latency. `SORT_RO` is the read-only variant in modern Redis. Check [SORT](https://redis.io/docs/latest/commands/sort/) and its complexity before putting it on a hot request path.

## From the marketplace example to transaction invariants

*Redis in Action* combines `WATCH`/`MULTI`/`EXEC` in a small marketplace. Each user has a Hash `users:<id>` with a balance, a Set `inventory:<id>` with owned items, and a Sorted set `market:` whose score is the listing price. To list an item, the application verifies that it remains in inventory, then adds the market listing and removes the item from inventory in a transaction. To buy, it watches the market and buyer Hash, reads the current price and balance, verifies that the listing has not changed and funds are sufficient, then transfers money, adds the item to the buyer's inventory, and removes the listing in `MULTI`.

The invariants are “an item belongs to only one owner at a time” and “the amount removed from the buyer equals the amount credited to the seller.” If two people try to buy the same item, only the first transaction still sees the listing at the expected price and commits; the other aborts and rereads. If the seller's inventory can change while a buyer is purchasing, the transaction must watch the keys that determine that condition. Watching every related key raises contention, so identify the exact state on which each invariant depends.

`WATCH` is optimistic locking: Redis does not lock a key and make other clients wait; clients proceed, and Redis cancels a commit if watched data changed. Set a retry deadline, cap attempts, and use backoff; when the budget ends, return a conflict for the application to handle instead of looping forever. Do not hold a transaction open while calling an external API or waiting for a user. The book's example teaches transaction primitives; it does not provide durability, a ledger/audit trail, fraud prevention, or exactly-once behavior across failover. High-value systems should keep an authoritative transaction ledger in a system that meets those requirements.

## Measure performance without confusing a benchmark with an application

`redis-benchmark` helps compare simple commands in a controlled setup; it does not run application logic, may not use realistic key sizes/cardinality/serialization, and does not fully include client costs. Numbers in the book came from the hardware, Redis version, Python client, and network of that time; do not use them as a current capacity plan.

Benchmark a workload close to the application: the same command mix, payload, cardinality, concurrent clients, TLS/network path, persistence settings, warmed dataset, and a duration long enough to expose tail latency. Record throughput with p50/p95/p99 and error rate; change one variable at a time, such as pipeline batch size or connection count. Pipelining usually helps most when RTT dominates; oversized batches grow the reply queue and can increase latency for other requests. A connection pool avoids opening a TCP connection for every request but needs a sensible connection limit.

In the book's Python example, one `redis.Redis()` object is reused for each Redis server and logical database; the client obtains connections from a pool, reuses sockets, and discards timed-out connections. The book reports that the `redis-py` pool version it used was thread-safe and fork-safe. Those are client- and version-specific properties, not guarantees of the Redis protocol; check how a current library manages pools in multithreaded or multiprocess applications.

When latency rises, measure both client and server: `redis-cli --latency`, `SLOWLOG`, `INFO commandstats`/`latencystats`, `LATENCY DOCTOR`, CPU, memory, fork/persistence events, and network. `MONITOR` can change the measured workload and add overhead, so use it briefly within a controlled investigation. Read [Redis benchmark](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/), [latency troubleshooting](https://redis.io/docs/latest/management/optimization/latency/), and [latency monitor](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency-monitor/).

Put a conditional update in a script or optimistic transaction instead of splitting it across requests. In Cluster, multi-key constraints affect key naming. Choose by requirement: pipelines for throughput, transactions for a command sequence that cannot be interleaved, scripts for server-side read/check/write logic, Pub/Sub for temporary broadcast, and Streams for stateful messaging. Read [transactions](https://redis.io/docs/latest/develop/using-commands/transactions/), [pipelining](https://redis.io/docs/latest/develop/using-commands/pipelining/), [Lua scripting](https://redis.io/docs/latest/develop/programmability/eval-intro/), [Functions](https://redis.io/docs/latest/develop/programmability/functions-intro/), and the [command reference](https://redis.io/docs/latest/commands/).

## Check your understanding

**Does a pipeline guarantee no other client's command interleaves with a batch?** No; it primarily reduces round trips.

**Does Redis MULTI roll back every command when one command has a runtime error?** No; do not rely on SQL-like rollback.

**Does a client timeout prove that a command did not run?** No; make retries idempotent or deduplicate them.

**Can Pub/Sub replay a message for a subscriber that just reconnected?** No; use Streams or a broker with retained messages if replay is required.

**Does `SORT key LIMIT 0 10` only process the first ten members?** Not necessarily; Redis may need to scan/sort a large collection before returning the limited slice.

**Can two clients both buy the same listing and debit their accounts?** `WATCH` on the listing and buyer makes the second transaction abort after the data changes; the application must reread and handle the conflict.
