---
title: "Redis Memory: Encodings, Shards, and Packed Data"
category: "Database"
description: "Understand compact encodings, large-collection costs, sharded hashes and sets, and updateable bit packing."
updated: 2026-10-18
translationKey: "database/redis-memory-models-and-compact-structures"
---

Redis can store small values in compact representations, then switch to a more general representation as a collection grows. Two keys with the same number of logical items can therefore use different amounts of memory and have different performance. Encoding details depend on the Redis release. The design goal is to reduce measured overhead without making reads and writes too expensive; a compact encoding is a size-dependent choice, not automatically a better one.

## Compact encodings and conversion thresholds

### How compact encodings save memory

A conventional linked list needs a node, pointers to neighboring nodes, a pointer to the string, and metadata for each value. The older ziplist format replaced separately allocated nodes with one contiguous byte sequence. Each entry records the previous entry's length, its own encoding and length, and its payload. Sequential data needs fewer pointers and allocations. In the book's example, a three-byte string has about 21 bytes of linked-list overhead on a 32-bit system, compared with about two bytes of ziplist overhead per entry. These figures describe an older layout and architecture; they are not a prediction of memory use on a current server.

The tradeoff appears during updates. An entry in the middle may need decoding and re-encoding, and bytes after it may need to move. An intset stores integers in a specialized sorted array. Lookup can use binary search, but insertion and deletion still shift elements. When an entry-count or value-length limit is crossed, Redis converts the collection to a more general representation. That lets the collection keep growing, but uses more memory and can make the command that crosses the threshold unusually slow.

The book describes these historical Redis 2.6 defaults:

| Structure in the book | Entry-count limit | Entry-length limit | Note |
| --- | ---: | ---: | --- |
| LIST (ziplist) | 512 | 64 bytes | Crossing either limit converts it away from ziplist. |
| HASH (ziplist) | 512 | 64 bytes | Fields and values must fit the encoding limit. |
| ZSET (ziplist) | 128 | 64 bytes | The count limit is lower because each member also has a score. |
| SET (intset) | 512 | Not applicable | Every member must be a decimal integer that fits the build's signed integer type. |

Do not copy this table into a current configuration. Current Redis documentation describes `*-max-listpack-*` settings for Hash and ZSET, intset for small integer-only Sets, and listpack support for small Sets beginning in Redis 7.2. The documented defaults include 512 entries/64 bytes for Hash, 128/64 for ZSET, and 512 integers for intset; Redis 7.2 adds a Set listpack default of 128 entries/64 bytes. Lists have their own quicklist and listpack-node settings. Check the configuration and encoding behavior of the exact release before tuning.

The book raised ziplist limits deliberately and measured moving items between the two ends of a List: roughly 50,000 operations per second at 1,000 entries, 17,000 at 50,000 entries, and only about 550 at 100,000 entries. This is a Redis 2.6 result on the hardware of that period, not a forecast for a current server. It demonstrates the tradeoff: compact layouts reduce allocation and memory overhead, but a mutation may need to move many bytes, so latency can rise sharply as a collection grows.

Inspect the actual representation with `OBJECT ENCODING`, estimate per-key memory with `MEMORY USAGE`, and benchmark latency at production-like cardinality and value lengths. Include p95/p99 and the conversion boundary; do not raise thresholds just because RSS fell in a microbenchmark.

## Shard hashes and sets to keep each piece small

The chapter's sharding method divides one logical Hash or Set into multiple keys on the same Redis node so each piece can remain compact. For dense sequential numeric IDs, a shard can be `floor(id / shard_size)`, placing nearby IDs in the same Hash. For arbitrary string keys, choose a shard count based on expected cardinality and target shard size, then use a stable function such as `CRC32(key) mod shard_count`. A client can still find a field or member directly, but whole-collection operations must visit and combine multiple shards.

The book's city-ID lookup example has about 320,000 records in one Hash and uses roughly 44 MB on a 64-bit machine. Splitting it into shards of 1,024 records, setting the old ziplist threshold to fit the longest value, and retaining compact encodings reduces that example to about 12 MB. The dataset and Redis version are historical; the roughly 70% saving is not a guarantee for another schema. Short values often benefit more because metadata is a larger share of each record.

`shard_size`, expected cardinality, and the hash function are part of the data layout. Changing one can move many members, so version the scheme and plan a copy, verification, and cutover before resharding. Numeric sharding fits dense, increasing IDs. Sparse random identifiers need a hash path so they do not create enormous, mostly empty numeric buckets. In the book's unique-visitor example, a nonnumeric prefix is added before the ID so the sharding helper treats it as a hash key rather than a sequential number.

Hashes and Sets preserve operations on a known field or member. A global merge, cardinality, or set operation fans out across shards. ZSETs are harder: global `ZRANK`, `ZRANGE`, score range/count, and rank/score deletions need information from all shards. For a small bounded top or bottom list, auxiliary top/bottom ZSETs may be practical. Arbitrary global ranking usually loses the latency benefit. A sharded List also needs coordination across both ends and blocking semantics; the book defers a complete sharded List API to a later Lua example.

## Pack bits and bytes into Strings

Redis Strings support random byte access. `SETBIT`/`GETBIT` store flags by ID, while `SETRANGE`/`GETRANGE` write and read fixed-width records. A bitmap fits a dense, bounded ID domain; a huge sparse ID can make the key extend to a high offset even when few bits are set. Define byte order, bit numbering, and a maximum String size for the deployed release.

The book stores each sequential user's location in two bytes: the first is a country index, and the second is a state or province index in the corresponding table. Code `0` means “unknown”; real indexes are shifted up by one so the zero-filled bytes of a new String do not accidentally mean the first country. With `2^20` users per shard, the shard is `floor(user_id / 2^20)` and the record offset is `(user_id mod 2^20) × 2`; `SETRANGE` writes the two bytes. A full shard contains about 2 MiB of payload and avoids creating a separate key for every user.

Work through `user_id = 1,048,579`: since `2^20 = 1,048,576`, this user belongs to shard `1` at position `3` in that shard. Each record is two bytes, so its offset is `3 × 2 = 6`; read or write bytes at offsets `6` and `7`. The first ID in a shard starts at offset `0`, so division both selects a shard and preserves a contiguous layout. A large gap in IDs still requires the String to extend through that offset. This layout fits dense, nearly sequential IDs better than sparse random IDs.

For a known group of IDs, batch `GETRANGE` calls at their offsets through a pipeline; the book groups requests in batches of 1,000 to limit round trips. A global aggregate reads consecutive blocks from each shard and decodes each byte pair, skipping uninitialized records or codes outside the valid tables. An auxiliary ZSET records the largest ID written so the scan knows the final shard or block. The book updates this watermark through a UUID-named temporary ZSET, merges it into the watermark with a `max` aggregate, then deletes the temporary key; the unique name prevents concurrent updates from sharing a temporary key. Reading only the offsets for a subset can beat a full scan, but cost grows with the subset and with round trips unless requests are batched. Packing reduces key/object overhead but makes the schema opaque: adding fields, changing code tables, distinguishing unknown values, and handling overflow need a versioned migration, round-trip checks, and a way to decode old records.

## Aggregate across shards

If counters live in multiple shards, reading and summing them can combine values from different moments. Writing one request to one shard also needs protection against duplicate retries. Periodic aggregation or an event stream may be a better fit. In Redis Cluster, a command is routed to the relevant slot and node; do not assume it provides global atomicity.

*Redis in Action*, chapter 9, pages 210–227, covers ziplist and intset, the cost of long compact collections, sharded Hashes and Sets, the limits of sharding ZSETs, and bit/byte packing in Strings. Historical thresholds and benchmark or memory-saving figures are Redis 2.6 examples, not current sizing guidance. Compare them with [Redis memory optimization](https://redis.io/docs/latest/management/optimization/memory-optimization/), [`CONFIG GET`](https://redis.io/docs/latest/commands/config-get/), [`OBJECT ENCODING`](https://redis.io/docs/latest/commands/object-encoding/), and [String commands](https://redis.io/docs/latest/develop/data-types/strings/).

## Check your understanding

**Is a compact encoding always faster?** No. It uses less overhead, but updates to a large collection can cost more.

**What happens when an entry-count or value-length limit is crossed?** Redis converts the collection to a more general representation. Check the version's configuration and measure the conversion latency instead of only checking memory afterward.

**Is a bitmap a good fit for a very large, sparse ID set?** Usually not. Unused gaps still occupy space up to the highest offset.

**Does sharding make updates to a logical object atomic?** No. Multiple buckets require multi-key work and add slot and coordination constraints.

**Can a sharded ZSET keep serving `ZRANK` as before?** Do not assume so. A global rank requires combining information from shards or maintaining a bounded auxiliary index for a specific query.
