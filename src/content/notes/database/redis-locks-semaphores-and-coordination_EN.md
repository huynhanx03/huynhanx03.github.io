---
title: "Locks, Semaphores, and Coordination with Redis"
category: "Database"
description: "Build coordination with leases, ownership tokens, and fencing, and understand distributed-lock limits."
updated: 2026-10-18
translationKey: "database/redis-locks-semaphores-and-coordination"
---

A lock prevents two workers from processing a resource at the same time, but a distributed lock must account for process pauses, packet delays, failover, and lease expiry. A `SET NX` command handles acquisition on one primary; it does not prove by itself that a worker still has exclusive ownership across the system.

## A minimal lease lock

A basic pattern creates a random owner token:

```text
SET lock:invoice:42 <random-token> NX PX 10000
```

On success, the client holds a lease for at most 10 seconds. On release, a script must compare the token before deleting the key; a blind `DEL` might remove a newer lock created after the old lease expired. The token also identifies the owner during renewal.

Calling `SETNX` and then `EXPIRE` separately is unsafe: the process may die after creating the key but before setting its TTL, leaving a lock that never expires. Use one `SET ... NX PX` command to acquire and attach the lease atomically. If acquisition fails, wait with jitter and retry until a deadline; do not spin or retry forever. On release or renewal, use a Lua compare-token operation to delete/extend in one step so an old worker cannot modify a new owner's lease.

A coarse lock such as `lock:market` is simple, but every listing/purchase contends for one key. A finer lock such as `lock:item:42` lets operations on different items proceed concurrently, but a multi-item operation may need several locks. If acquiring multiple locks, use a stable key order, set a deadline, and release already acquired locks if a later acquisition fails; otherwise workers can deadlock or retain partial resources too long. Lock granularity cannot be finer than the business invariant: a shared balance or global index still needs correct coordination.

### Why `WATCH` can slow down under contention

`WATCH` is optimistic concurrency control: a client reads state and prepares a write; if a watched key changes before `EXEC`, the transaction is canceled and the client must reread, recompute, and retry. This works well when conflicts are rare. In the *Redis in Action* marketplace example, many workers watch the same `market:` ZSET; each listing changes the key a buyer watches, so purchases of unrelated items can be canceled too. As load rises, retries add more requests to the existing bottleneck and latency rises further.

An explicit lock turns contention into a queue around the critical section: one worker checks and updates an item while others wait or time out. A market-wide lock reduces retries but serializes every item. Per-item locks let independent items proceed concurrently. The book's 60-second simulation found fewer retries and lower latency with fine-grained locks than with `WATCH` on the whole market; its throughput numbers depend on that era's workload and hardware and do not predict a modern deployment. Measure with the application's workload, including queueing and p95/p99 latency, before concluding that locks are faster.

Redis does not enforce a lock on data. Every write path must follow the same protocol, or another client can still change `market:` while a lock is held. A lock protects a cooperative protocol among clients; a Redis transaction only serializes the commands sent inside it.

## A lease is not fencing

Worker A has a lease, pauses for 15 seconds, and loses it; worker B acquires the lock and writes data. A wakes and writes too because the process does not know its lease expired. This is a stale owner. A **fencing token** increases monotonically with each grant; the target storage rejects tokens lower than the latest one it has seen. If the external resource does not check fencing tokens, a Redis lock reduces duplicate execution probability but does not guarantee exclusive side effects.

Clocks, network delays, and failover make lease reasoning difficult. Multi-node quorum lock schemes need strict timing, availability, and durability assumptions; do not treat a formula from a blog as a universal guarantee. For critical data, consider locking/constraints in the database that owns the resource, a single-consumer queue, or a consensus-backed coordinator.

## Semaphores and concurrency limits

A semaphore permits up to N holders. A sorted set can track expirations, scores, and tokens to clean expired leases, but acquire/release must be atomic and protect against client crashes, clock assumptions, duplicate tokens, and stale holders. A Redis script can group operations on one node/slot; failover still introduces durability and race assumptions.

A basic design stores each holder in a ZSET with its acquisition time as the score, removes expired leases, then grants a slot if its rank is below N. Clock skew can make this unfair: a worker with a fast clock can push another holder out of the first N even though that holder still believes it owns a slot. Adding a monotonically increasing sequence improves ordering, but if “prune, add owner, check rank” spans separate round trips, two clients can still race for the slot. Group those steps in an atomic script/transaction on the same node/slot and design reclamation for dead holders.

If work can outlast the lease, renew before expiry with a margin; renewal succeeds only if the token/owner still matches. On renewal failure, the worker stops, or downstream rejects its stale fencing token. Release both membership and holder metadata; forgetting one index can leak a slot or let the semaphore exceed its limit. Fairness, expiration, and correctness are separate requirements: a lease timestamp alone does not guarantee all three.

## Renewal, timeout, and cleanup

Renew before expiry with a compare-token script and safety margin; if renewal fails, the worker must stop side effects or validate fencing. A short timeout increases contention; a long timeout retains resources after a worker dies. Track lock age, holder, renewal failures, and abandoned work. Use idempotency/outbox patterns to handle retried tasks.

*Redis in Action* chapter 6 introduces `WATCH` retries, coarse/fine-grained locks, lease timeouts, and semaphores through a marketplace example. The book's `SETNX`/`EXPIRE` sequence builds the concept using an older Redis API; current applications should use an atomic primitive such as [SET](https://redis.io/docs/latest/commands/set/) with compare-token release/renew. See current [distributed lock](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/) and [Lua](https://redis.io/docs/latest/develop/programmability/eval-intro/) documentation; correctness still requires an explicit failure model and checks at downstream storage.

## Check your understanding

**Why can releasing with `DEL` be wrong?** An old owner can delete a newer lease granted to another worker.

**Does a random token stop a stale worker from writing data?** It verifies ownership during release; protecting downstream writes requires a fencing token checked by the resource.

**Does a Redis lock make a database transaction and an email atomic?** No; use an outbox/idempotency pattern or a suitable transaction coordinator.
