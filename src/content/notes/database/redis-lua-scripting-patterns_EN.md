---
title: "Redis Lua Scripting: Atomic Workflows and Sharded Lists"
category: "Database"
description: "Move check-and-update logic server-side, deploy scripts safely, and understand Cluster, retry, and blocking limits."
updated: 2026-10-18
translationKey: "database/redis-lua-scripting-patterns"
---

Lua moves a read-check-update operation close to the data. A script can reduce round trips and remove races between clients, but it must stay short, validate before writing, and follow Cluster key/slot rules.

## Chapter 11: move a multi-step operation into Lua

Lua helps when a decision depends on current Redis state and several related keys must be updated together. Instead of having the client read, compute, and send several network commands, a script receives keys in `KEYS` and parameters in `ARGV`, reads state, checks conditions, and writes the result. For example, creating a status can read the login, allocate an ID, write the status Hash, and increment the post counter in one call.

### What atomicity gives you, and what it does not

Redis does not run another command between the start and end of a script. Two clients therefore cannot both read an old value and decide to buy the last item. But Lua is not a transaction with rollback: if a script writes one key and a later command errors, the earlier write is not automatically undone. Validate input, key existence and types, permissions, and business conditions before risky writes; keep scripts short, bound collection sizes, and order work so failures are recoverable.

Scripts also run serially on the server. An unbounded loop or a very large `ZRANGE` blocks other clients for the entire execution. Atomicity means no interleaving; it does not mean parallel execution or low latency. Measure script duration and p95/p99 load, and cap batches.

If a script runs too long, Redis does not immediately interrupt it at the threshold because it may already have written part of the state. Redis enters a state where ordinary commands receive `BUSY`. `SCRIPT KILL` can stop a script only if it has not written data; after a write, forcibly stopping it requires shutting down the server with `SHUTDOWN NOSAVE`, which can lose data not yet persisted. The current threshold is configured with `busy-reply-threshold`; the book's `lua-time-limit` name belongs to an older version. Bound the work and exercise scripts before deployment instead of relying on a timeout to rescue them.

### Example: create a status in one call

The book's client implementation needs two exchanges: first it reads the login and allocates an ID, then it writes the status Hash and increments the user's post counter. The script moves the Redis-dependent work to the server: read the login from the user key, stop if the user does not exist, increment the ID key, create the status key, write the status fields, then increment the user's counter. The client passes the user key and ID counter through `KEYS`, while the post content goes through `ARGV`.

This reduces round trips and prevents another client from interleaving between the user check, ID allocation, and related writes. However, the script constructs `status:<id>` inside the script; in Cluster, design the accessed keys up front so they can all be declared and colocated in one slot. If IDs must be allocated inside Redis, consider storing statuses as fields under a predeclared per-user key, or use a client-generated unique ID whose key can be passed in `KEYS`. If a write fails after earlier commands ran, Redis does not roll them back, so validate key types, arguments, and failure conditions before the first write.

### KEYS, ARGV, and the script cache

Declare every key a script accesses in `KEYS`; non-key input belongs in `ARGV`. This lets Redis Cluster validate slots and clients understand which keys the script touches. Multi-key operations in Cluster generally need keys in the same hash slot; a `{...}` hash tag can colocate related keys but can also create a hot slot. The book's sharded LIST computes shard key names inside Lua, so it does not follow modern Cluster key-declaration and slot rules; treat it as a structural lesson, not code to copy into Cluster.

`EVAL` sends source each time; `SCRIPT LOAD` and `EVALSHA` call a cached script by hash. The cache is not durable data: restart, failover, or `SCRIPT FLUSH` can remove a script, so handle `NOSCRIPT` by loading it and retrying safely. Redis Functions, available since Redis 7, suit named server-side logic; they still need versioning, rollout, and permission controls. Avoid generating different source for every request because it grows the cache and complicates operations.

### Locks and semaphores

Acquiring a lock needs one atomic operation that sets a token only if the key is absent and attaches a lease; release deletes only if the stored token still belongs to the caller. `SET key token NX PX ttl` prevents a crashed client from leaving a permanent lock. A compare-token-then-delete script combines release validation and deletion. The token prevents an old client from deleting a newer lock, but lease expiry does not stop the old process from writing to another system; when protecting an external resource, a monotonically increasing fencing token checked by that resource is needed to reject stale owners.

A semaphore represents holders in a ZSET: a script removes expired leases, counts holders, and adds a unique ID if a slot remains. Since the steps execute consecutively in the script, two clients cannot both take the final slot. The book's Lua version removes the counter and auxiliary lock: whichever client's acquire script runs first is considered first, so the server's serialized order resolves the race and provides the fairness that the multi-step version had to build explicitly. A refresh only extends an ID still present in the ZSET; release removes that holder's ID. Clock skew between clients can expire a lease too early or too late; define renewal, timeout, and dead-holder handling. The book's benchmarks reflect its historical hardware and clients; the durable benefit is fewer round trips and less contention retrying.

### Replace WATCH in autocomplete and a marketplace

The book's autocomplete temporarily inserts two sentinels into a ZSET, finds their ranks, returns up to 10 names in the range, then removes the sentinels in one script. Atomic execution prevents other clients changing ranks between lookup and removal. Sentinels must not collide and must be cleaned up on errors; in Cluster, related keys must share a slot. For durable prefix lookup or large data, a purpose-built index may be more suitable than ZSET sentinels.

In the marketplace, a script reads a listing price and buyer balance, checks that the listing still exists and funds are sufficient, then transfers money, adds the item to inventory, and removes the listing. Grouping check-and-update prevents duplicate sales or overspending on one Redis instance. Define the money representation (integer minor units), key types, and buyer/seller identity, and validate everything before the first write. The script does not cover SQL, external payments, email, or multiple shards; a timeout requires a request ID and a queryable outcome so the client does not duplicate a transaction.

The chapter's benchmark tables show the direction of change on the author's setup: with 10 autocomplete clients, it records about 6,141 completed requests in 10 seconds with `WATCH` versus 128,217 with Lua; with five sellers and five buyers, the marketplace records 116,000 listings/111,000 purchases with fine-grained locks versus 505,000/480,000 with Lua over 60 seconds. These numbers depend heavily on the Redis version, clients, hardware, and benchmark method of that period. Treat them as evidence that fewer round trips and retries helped in that test, not as throughput forecasts.

### A sharded LIST is not automatically a complete queue

The book stores two String keys, `<list>:first` and `<list>:last`, pointing to the first and last shard; payloads live in `<list>:<shard-id>` keys with consecutive IDs. When the List is empty, both pointers match. With multiple shards, only the two endpoint shards may be partially filled; every interior shard must be full. If both pointers match, length is that shard's `LLEN`; otherwise, with capacity `M`, length is the two endpoint `LLEN` values plus `(last - first - 1) × M`, provided this invariant holds.

Push divides input into batches of at most 64 items in the example, then the script fills the current shard up to near its compact-encoding limit. It leaves one slot because Redis 2.6 served blocked pop clients after the script finished; filling the shard inside the script could otherwise let a waiting client receive an item immediately and push the shard past its threshold. When there is no room, the script moves the relevant endpoint pointer to the next shard. The value 64 and the ziplist threshold are historical settings; the general rule is to bound batches and check the deployed release's semantics.

A pop reads from the shard at the requested end. If that shard becomes empty, the script checks the endpoint pointers: if they match, the whole List is empty; if another shard remains, it moves the pointer and retries the pop there. Metadata stays correct only if every push and pop follows the same atomic protocol.

Blocking pop is the fragile part. A script cannot wait like `BLPOP`, so the example loops over nonblocking pops, reads the endpoint, then pipelines a script that rechecks the endpoint immediately before a `BLPOP`/`BRPOP` of at most one second. If the endpoint moved, that script pushes a dummy value to the old shard so the blocking pop wakes and the client retries. A race remains between the check and the following blocking command: another consumer may take the dummy value, or the client may wait on the wrong shard. `MULTI/EXEC` cannot solve this because a blocking pop inside a transaction runs as a nonblocking pop. This is the book's best-effort workaround, not a reliable blocking-queue contract.

A Redis script cannot block like `BLPOP` while the server needs to process other commands. Dummy-value, polling, or short-timeout emulation has races and does not preserve global order. Each shard only preserves its local order. If consumers need groups, acknowledgments, pending recovery, replay, or global order, use Redis Streams or a suitable broker. This is a useful historical example of sharding limits; do not copy the book's Python 2 code, old ziplist configuration, or blocking strategy into modern production.

Chapter 11 of *Redis in Action* is checked against the official [Lua scripting guide](https://redis.io/docs/latest/develop/programmability/eval-intro/), [script cache and EVALSHA](https://redis.io/docs/latest/develop/programmability/eval-intro/#evalsha), [SCRIPT KILL](https://redis.io/docs/latest/commands/script-kill/), [Redis Functions](https://redis.io/docs/latest/develop/programmability/functions-intro/), and [Cluster multi-key rules](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/).

## More checks

**Does atomic scripting mean every write is rolled back if the last command errors?** No. Atomicity prevents interleaving; completed writes are not automatically undone.

**Why declare keys in `KEYS`?** So Redis and Cluster know which keys are accessed, can validate slots, and route correctly.

**How does a Lua semaphore resolve two clients racing for the last slot?** Expiration cleanup, counting, and insertion run serially in one script, so the second client sees the first client's result.

**Why should the book's sharded LIST script not be used unchanged with Cluster?** It computes shard keys dynamically, while Cluster requires declared keys and multi-key scripts to satisfy slot rules.

## Check your understanding

**Does Lua atomicity roll back writes when a script errors?** No; other commands do not interleave, but earlier writes are not automatically undone.

**Does a client timeout mean the server stopped the script?** No; the outcome may be uncertain, so use deduplication/idempotency.

**Does one sharded list keep global FIFO order?** No; default ordering is local to each shard.
