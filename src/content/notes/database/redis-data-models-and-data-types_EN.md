---
title: "Redis Data Models and Data Types"
category: "Database"
description: "Choose Redis structures by the operation required, from strings and hashes to streams, JSON, and specialized types."
updated: 2026-10-17
translationKey: "database/redis-data-models-and-data-types"
---

Redis stores data as key–value pairs, but a value is more than a byte string. Each key is associated with a data type that has its own commands and complexity. Good design starts with the operation the application needs: read an object, increment a counter atomically, retrieve a top-N ranking, test membership, or consume events through a consumer group?

## Choose a structure by operation

| Type | Useful for | Example commands/meaning |
| --- | --- | --- |
| String | Cached values, tokens, counters, bitmaps | `GET`, `SET`, `INCR`, `GETEX` |
| Hash | Fields of one object | `HGET`, `HSET`, `HINCRBY` |
| List | Ordering at both ends, simple queues | `LPUSH`, `RPOP`, blocking pop |
| Set | Unique membership, intersections/unions/subsets | `SADD`, `SISMEMBER`, `SINTER` |
| Sorted set | Score rankings, priority schedules | `ZADD`, `ZRANGE`, `ZRANK` |
| Stream | ID-addressed event log, consumer groups | `XADD`, `XREADGROUP`, `XACK` |
| Geospatial / probabilistic | Coordinates/distances or approximate membership/counts | `GEO*`, HyperLogLog, Bloom/Cuckoo depending on module/edition |

Current Redis offerings also include JSON, time series, and vector sets where supported; verify the module, edition, and server version before relying on them. Do not assume every type in the documentation is available on any Redis OSS server.

## Redis fits when the operation shape is part of the problem

Consider Redis when an application performs frequent operations on a working set small enough to justify RAM cost, and a Redis data structure makes an operation direct: increment a counter, manage membership, take items from either end of a list, maintain a score-ranked top-N, or deliver messages through consumer groups. Redis commonly keeps data in memory for fast access; persistence can write data to disk, but does not make every configuration as durable as MySQL/PostgreSQL.

A common choice is to use Redis as **derived data** from a primary database: a cache, leaderboard, session, or search index that can be rebuilt from an authoritative source. This reduces load and serves a suitable query shape, but requires freshness, invalidation, rebuild, and behavior when Redis loses data. If Redis is the **source of truth**, define RPO/RTO, persistence/fsync, backups, replication failover, memory budget, eviction, and recovery before storing important data there. A replica can serve reads and take over a role; it is not an independent backup.

Redis is not a general replacement for SQL. If the application needs arbitrary joins, relational constraints, ad hoc queries across broad data, or a dataset larger than economical RAM, a relational database or warehouse may fit better. Two systems can coexist, but specify the source of truth, synchronization path, update order, delete handling, idempotency, and divergence detection.

## Five structures answer five kinds of questions

Imagine an application storing posts, votes, and topic groups:

- A post needs field reads/updates such as title, author, and timestamp: use a **Hash** for a small object, or a serialized value if it is usually read as a whole and fields are not updated independently.
- A vote counter needs atomic increments: use an integer **String** with `INCRBY`; if it must change with hash metadata, consider `HINCRBY` and group the updates in a transaction/script.
- A list of users who voted needs unique membership: use a **Set**; `SADD` reports whether the member was new.
- An ordered work sequence consumed at either end can use a **List**; if you need IDs, consumer groups, pending entries, and reclaim, choose a **Stream** instead of forcing a list to act as a log.
- Posts ranked by score or time use a **Sorted set**, with post ID as member and score as ordering key. Each member appears once; changing its score changes its position.

Each type represents a set of operations. If the application asks “who voted?”, a Set models membership; if it asks “which posts are in the top 20?”, a Sorted set fits. One key need not contain the entire object when several query shapes need different indexes, but every secondary structure adds write, RAM, expiration, and recovery cost.

## Example: count article views

```text
INCR article:42:views
GET  article:42:views
```

`INCR` is atomic for one key and returns the new value. A counter still needs decisions about reset, integer range/model, expiry, cardinality, and persistence. For daily aggregation, use date-specific keys or an event log; writing a counter does not replace an audit source.

## Keys are part of the schema

Use consistent prefixes (`user:42`, `session:abc`, `article:42:views`), ID encoding, and keyspace boundaries by tenant/environment. Redis keys are binary-safe, but readable conventions help operations. Avoid a single huge key when fields need independent updates; avoid millions of tiny keys without a memory/TTL budget.

An object can be represented by a hash or a JSON value. A hash fits independent field reads/updates; JSON is convenient for path queries/updates when the module supports it. A serialized blob is simple, but changing one field requires a whole-object read/write and can overwrite concurrent updates. Choose by access pattern and size, not syntax preference.

## Complexity, encoding, and memory

O(1) access does not describe the whole cost. A command returning 100,000 elements can have high latency/network cost even when the structure lookup is fast. Some types use compact encodings for small collections and switch representation past thresholds; these are implementation details that can change by version. Track `MEMORY USAGE`, `INFO memory`, latency, and benchmarks on representative data.

Every key has overhead, expiry metadata, allocator fragmentation, and replication/AOF costs. Apply TTLs deliberately, prevent cache stampedes, measure value size, and define eviction/memory budgets. Redis can hold durable data, but durability depends on persistence, replication, and failure assumptions; do not assume it is always cache-only or always database-durable.

## Program safely with keys

Commands that operate on keys are generally atomic individually; a client-side `GET` followed by `SET` is not atomic. Use `SET ... NX/EX`, `WATCH/MULTI/EXEC`, or a script when a check-and-update cannot be split. In Cluster, keys used by a transaction/script must share a hash slot; a hash tag such as `{user:42}` can group them but can create a hotspot if overused.

*Redis in Action* chapters 1, 3, and 9 introduce data types and patterns; historical examples are adjusted using current docs: [data types](https://redis.io/docs/latest/develop/data-types/), [commands](https://redis.io/docs/latest/commands/), and [keyspace](https://redis.io/docs/latest/develop/use/keyspace/).

## Check your understanding

**For top scores and ranks, choose a list or sorted set?** A sorted set models unique members with scores and supports ranking queries.

**Does one atomic Redis command make a client-side sequence atomic?** No; use a transaction/script or design around one atomic command.

**Is Redis JSON available in every deployment?** No; verify the server, module/edition, and version.
