---
title: "Redis Memory, Scaling, and Operations"
category: "Database"
description: "Budget RAM, choose eviction, shard/Cluster, secure the service, and observe real Redis failures."
updated: 2026-10-17
translationKey: "database/redis-memory-scaling-and-operations"
---

Redis keeps its working set in RAM, so performance depends not only on value bytes but also on key overhead, object encoding, allocator fragmentation, replication buffers, AOF rewrite, and fork copy-on-write. Hitting a memory limit can reject writes or evict keys depending on policy. Scaling should start with measurements and data semantics.

## Memory budget and eviction

Estimate the dataset using production-like samples and `MEMORY USAGE`/`INFO memory`, then add headroom for fragmentation, client buffers, replica backlog, persistence fork, and growth. `maxmemory` should not necessarily equal all host RAM; the OS and process need breathing room. Track `mem_fragmentation_ratio` alongside RSS and allocator statistics rather than drawing conclusions from one metric.

Eviction policies such as `allkeys-lru`, `allkeys-lfu`, `volatile-*`, `random`, and `noeviction` determine which keys may be removed when over budget. LRU/LFU are approximations. For mixed workloads, separate instances or namespaces with suitable policies/budgets may be safer. `noeviction` preserves keys but can reject writes; eviction can silently remove application state if the keyspace was not designed as a cache.

## Compact encodings for small collections

Redis can store small Hashes/Lists/Sorted sets in contiguous encodings with fewer pointers and less metadata than ordinary hash-table/linked structures. A Set containing only small integers can use `intset`; since Redis 7.2, small Sets may also use listpack. Thresholds limit entry count and value length; when a threshold is exceeded, Redis converts to a normal encoding without changing the API. The book calls compact List/Hash/ZSET encoding ziplist; Redis 7 replaced it with listpack for many structures, so check version/configuration instead of copying old `*-max-ziplist-*` settings.

Compact encodings reduce overhead but may scan/move more bytes to read or update an element. Raising thresholds can reduce RAM while worsening p95/p99 and causing conversion latency when a collection crosses the limit. Measure near-production cardinality/value sizes; `OBJECT ENCODING` shows the representation and `MEMORY USAGE` estimates a key's cost, while `INFO memory`/RSS show the process-wide picture. Do not treat the book's ziplist/intset benchmark as a current default threshold.

Key, field, and member lengths also add up: long prefixes across hundreds of millions of keys can cost a lot. Design readable namespaces first; shorten only when savings are measured and collisions/debugging remain manageable. Many short values stored as `namespace:id` keys can sometimes move into sharded Hashes to reduce per-top-level-key overhead, but `HGETALL`/scanning and per-value TTLs become less convenient.

## Shard Hashes/Sets to keep pieces small

Sharding here splits one large structure into multiple keys on the same Redis node so each Hash/Set can stay in a compact encoding. For mostly sequential numeric IDs, a shard can be `floor(id / shard_size)`; for string keys, a stable hash such as CRC32 selects one of a fixed number of shards. The same field must always map to the same shard. Changing `shard_size`, hash function, or shard count changes data placement, so version the scheme and migrate/reshard with dual-read/verification/cutover; do not casually change configuration.

A sharded Hash still supports `HGET`/`HSET` by field because its shard is known, but full collection operations must scan many Hashes and merge. A sharded Set supports membership/add per member; global union/intersection/count must coordinate shards and may create large temporary data. Sharded ZSETs are harder: a global rank/range must query multiple shards and merge top-K, while exact rank/count often requires broad fanout. Shard only with a clearly bounded access pattern, explicit unsupported query tradeoffs, and measured RAM/latency benefits.

The book's unique-visitor example keeps the first 15 hexadecimal digits of a UUID and converts them to an integer. That is a 60-bit stored number; for UUIDv4, the fixed version nibble lies within this prefix, leaving about 56 random bits. It fits the signed integer range used by `intset`, but the counter is approximate: two different UUIDs can share a prefix and count as one visitor. For `n` independent visitors uniformly distributed over `2^56` possibilities, the chance of at least one collision is approximately `1 - exp(-n(n-1)/(2 × 2^56))`: about **0.43% at 25 million** and **35% at 250 million** in one measurement period. *Redis in Action* says below 1% at 250 million and roughly one collision every 2,739 years at 25 million per day; those figures do not match the birthday bound for 56 random bits, so do not use them to budget error. For exact counts, keep full IDs; for approximate cardinality, consider HyperLogLog. `SADD` only knows whether the shortened member has appeared before; it cannot detect a collision between original IDs. Apply TTLs to each shard/bucket to reclaim daily data.

## Pack bits/bytes into Strings

For sequential numeric IDs where each entity needs only a few fixed bytes, `SETBIT`/`GETBIT` or `SETRANGE`/`GETRANGE` turn a String into an addressable array. One bit can represent a Boolean; two bytes can encode a region code; several bytes can hold a small counter. An offset is often `id × bytes_per_record`, so sparse/huge IDs create zero-filled gaps and can make the key grow; shard before offsets approach Redis's maximum String size.

Before packing, define a byte schema: version, byte order, field widths, an “unknown” sentinel, code table, and out-of-range behavior. Adding a field or changing a code table may require rewriting all data; unlike a Hash, the bytes do not describe their schema. A bitmap is compact for dense IDs, but writing a distant bit consumes memory according to the highest offset, not the number of set bits.

The book stores country/state in two bytes using positions in code tables and reads blocks to aggregate populations. This illustrates the space/query tradeoff: a global aggregate must read every shard and decode each record; a subset aggregate needs an ID list and reads the corresponding offsets. Choose an appropriate dataset/precision, version the code table, test round trips/unknown values, and consider location sensitivity. For current IP/geo data, check licensing, IPv6, and accuracy; do not treat a fixed country/state table from the book as authoritative.

## Sharding and Redis Cluster

Sharding divides the keyspace to grow capacity/write throughput. Redis Cluster maps keys to 16,384 hash slots distributed across primaries; clients handle `MOVED`/`ASK`, redirects, and topology refresh. Failover uses replicas and can lose acknowledged writes within the asynchronous replication window. Multi-key commands/scripts/transactions require a shared slot; hash tags group related keys but can create a hotspot.

Sharding changes query design: joins and full-cluster scans are not cheap like they can be in a single database. Choose keys from access patterns, avoid imbalance, track hot slots, resharding, and client support. Read scaling through replicas has lag and consistency tradeoffs.

## Observability and incidents

Track latency distributions, slow log, command rate, rejected connections, blocked clients, memory/RSS/evictions, replication offset/lag, persistence fork/duration, AOF errors, keyspace size, CPU/network/disk, and cluster slot health. Use `SLOWLOG`, `LATENCY`, and `INFO` appropriately; `KEYS *` or an unbounded scan can slow production, so use bounded `SCAN` and understand iteration consistency.

When latency rises, inspect expensive O(N) commands, payloads, pipeline batches, forks, swap, CPU saturation, network, hot keys, and failover. Redis command execution can be blocked by a long command/script; split work or move it to background processing. Use ACLs, TLS, network isolation, secret rotation, and do not expose the default port publicly.

*Redis in Action* chapters 9–10 cover structures, scaling, and administration. See [memory optimization](https://redis.io/docs/latest/management/optimization/memory-optimization/), [`OBJECT ENCODING`](https://redis.io/docs/latest/commands/object-encoding/), [eviction](https://redis.io/docs/latest/develop/reference/eviction/), [Cluster](https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/), [security](https://redis.io/docs/latest/operate/oss_and_stack/management/security/), and [latency monitoring](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/).

## Check your understanding

**Can `maxmemory` equal the host's total RAM?** It should not; the process, OS, buffers, and fork need headroom.

**Can Cluster run a multi-key transaction on arbitrary slots?** Related keys must share a hash slot.

**Is `SCAN` a consistent snapshot of the keyspace?** No; keys can change during iteration, so handle duplicates/missing entries as appropriate.
