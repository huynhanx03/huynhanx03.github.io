---
title: "Redis Strings, Lists, Sets, Hashes, and Sorted Sets"
category: "Database"
description: "Trace common operations and complexity of five core structures through voting and article examples."
updated: 2026-10-18
translationKey: "database/redis-core-structures-and-command-semantics"
---

Redis structures are more than serialization types. Each type provides atomic operations and shapes application queries. Choose a type by writing down the question first, then select the matching operation; do not choose only because a code object looks like a list/hash.

## String: value, counter, and bits

A string stores a byte sequence; `SET` can add expiry/`NX`/`XX` conditions, `MGET` reads several keys, and `INCRBY` atomically updates an integer. When `INCR` sees a missing key, Redis treats it as 0; if the key contains an empty string or another nonnumeric value, the command returns an error. `INCRBYFLOAT` uses floating-point arithmetic, so it is unsuitable for money that needs exact decimal arithmetic. Client-side `GET` + add + `SET` races; `INCR` makes it one server command.

A bitmap is a bit-addressed string; `SETBIT`/`GETBIT` map a user ID to state, and `BITCOUNT` counts ones. It fits a dense/bounded ID domain, not every sparse ID space.

## List: ordering at both ends

Lists support head/tail push/pop, range, and blocking operations. `LPUSH` with several values reverses their order as observed at the head; verify semantics before building FIFO. `LTRIM` retains a recent window but may delete data a consumer has not read. Middle-list access has positional cost; do not treat a list as a random-access array.

## Set: unique membership

`SADD` is idempotent by member and `SISMEMBER` tests membership; `SINTER`, `SUNION`, and `SDIFF` model groups/permissions/cohorts. A set is unordered. Intersecting huge sets can consume CPU/memory; choose query order/selectivity and bound materialization. `SMEMBERS` transfers the entire set to the client, while `SSCAN` iterates but is not a snapshot.

## Hash: fields in an object

A hash fits multiple fields for one object: `HGET`, `HSET`, `HINCRBY`, `HDEL`. Fields update independently and `HINCRBY` is atomic for an integer field. A hash does not enforce schema/foreign keys; field names/types are application conventions. `HGETALL` can return a huge object; use `HMGET` or `HSCAN` when payload needs limits.

## Sorted set: unique members with ordered scores

A sorted set stores unique members with scores. `ZADD` updates a score; `ZRANGE`/`ZREVRANGE` fetch zero-based ranks with inclusive endpoints, while `ZRANK`/`ZREVRANK` return a position. Score ranges filter by value: both bounds are inclusive by default, and prefixing a bound with `(` makes that endpoint exclusive. Equal-score members are ordered lexicographically by byte value. Scores are double-precision floats, so very large integers may not remain exact. `ZINCRBY` atomically changes a score.

## String commands in more detail

`GETRANGE key start end` uses zero-based offsets and includes both endpoints; negative offsets count from the end. `SETRANGE` writes from an offset and can extend the string, padding the gap with zero bytes. Use these commands when byte-oriented access really fits the data, because a packed string is harder to inspect and evolve than a Hash.

`GETBIT`/`SETBIT` treat a String as a bit sequence. Bit offsets run from the most significant bit to the least significant bit within each byte; reading beyond the current String returns `0`, while writing at a distant offset extends the key and may make it much larger. `BITCOUNT` counts one bits over an optional byte range, while `BITOP` writes a result to a destination key. A bitmap is compact for a dense, bounded ID set; for sparse or very large random IDs, or when reverse lookup matters, a Set is usually easier to manage. `INCRBYFLOAT` is convenient for decimal-like values but does not replace an exact decimal type for financial data.

## Lists and queue decisions

`LPUSH`/`RPUSH` accept several items in one command; with several arguments to `LPUSH`, the final argument ends up at the head. `LRANGE` includes its endpoints, and `-1` denotes the last item. `LTRIM key 0 99` retains at most the newest 100 entries when the application always pushes at the head; trimming deletes the rest, so do not use it on a list that still contains work to process.

For a user's 25 most recently viewed products, if timestamps are not needed for analytics, `LPUSH viewed:<token> <item>` followed by `LTRIM ... 0 24` stores a compact window: each member does not need a score as it would in a ZSET. The tradeoff is that a List cannot tell when an item was viewed; keep timestamped ZSET members when exact recency or time-range queries matter.

`BLPOP`/`BRPOP` wait while a list is empty; when several keys are supplied, Redis checks them in the given order and pops from the first non-empty list. `RPOPLPUSH` (modern `LMOVE`, with `BLMOVE` for the blocking form) moves an item between lists in one operation. A processing-list pattern can reduce the risk of losing work when a worker dies after popping, but still needs timeouts, recovery for stuck work, and duplicate handling. If consumers need groups, pending entries, acknowledgments, and replay, Redis Streams fit better than a plain List. Blocking commands also hold a client connection while waiting, so reserve enough connections in the pool.

## Sets, hashes, and multi-item operations

`SADD` returns the number of newly added members, so its return value can gate duplicate-safe updates. Redis `SREM` returns the number of removed members; some older clients in the book examples converted this result to a boolean. `SPOP` removes a randomly selected member; `SRANDMEMBER` samples without removal. With `count`, the sign affects whether returned members may repeat; do not use random samples for exact, auditable results. `SMOVE` transfers a member from a source Set to a destination if it exists. `SINTER`, `SUNION`, and `SDIFF` return result sets; their `*STORE` variants write to a destination key and can consume time and memory proportional to their inputs.

`HMGET` fetches known fields, `HGETALL` fetches the whole Hash, and `HSCAN` iterates through a large Hash incrementally. A batch command reduces round trips but does not turn several commands into a transaction. `HMSET` in the book is historical: current `HSET key field value [field value ...]` accepts multiple field/value pairs; check the server and client versions before copying older examples.

## Choose commands by cost and data size

Read command complexity as part of the design. `GET` or one-field `HGET` usually has constant-time work; `LRANGE`, `SMEMBERS`, `HGETALL`, Set intersections, and sorting grow with the data read or processed. A command can be quick for dozens of elements and create long latency when a collection reaches millions. Bound collection sizes, use bounded ranges, use `HMGET`/`SSCAN`/`HSCAN`/`ZSCAN` where suitable, and measure p95/p99 at realistic cardinalities.

The `SCAN` family returns a cursor, not a snapshot. A full iteration may return the same element more than once; while a collection changes, the client does not receive a consistent image of one instant. `COUNT` is only a work hint, and one call may return nothing while the cursor is still nonzero. Use idempotent operations or deduplication; do not use `KEYS *` to scan a production keyspace because it can block the server for a long time.

## Example: vote on an article

Use a Set `voted:<article>` to prevent one user voting twice with `SADD`; only when it returns 1 should the `score:<article>` counter increment with `INCRBY`. Two separate commands have a crash window: the user may enter the set before the counter increments. A Lua script groups them inside Redis, or an event log can be the source of truth and the score derived. Set/counter expiry, lifecycle, and persistence policy should match.

*Redis in Action*, chapters 1 and 3, moves from voting/articles to string/list/set/hash/zset commands, sorting, expiry, transactions, and Pub/Sub. Check the [Redis command reference](https://redis.io/docs/latest/commands/) and [data types](https://redis.io/docs/latest/develop/data-types/) because command names/options vary by version.

## Hello Redis: rank posts by score and time

Chapter 1 of *Redis in Action* builds a small voting application to show how structures work together. Store post fields in a Hash, voters in a Set, and two Sorted sets for score order and time order:

```text
HSET article:42 title "Redis data models" poster user:7 time 1760000000 votes 1
SADD voted:42 user:7
EXPIRE voted:42 604800
ZADD score: 1760000432 article:42
ZADD time:  1760000000 article:42
```

The illustrative `score:` formula can be `posting time + 432 × vote count`, giving new posts an advantage while votes keep them prominent for a while. The book's 432 assumes that “200 votes keep a post around for one day”; it is a product example, not a universal ranking formula. `time:` independently keeps newest-first ordering available.

When a user votes, the application checks that the post is still within the voting window, then adds the user to the Set. Only a new `SADD` should increment `score:` (`ZINCRBY`) and the Hash vote count (`HINCRBY`). If these commands are separate, a crash or retry can leave membership updated while score is stale, or duplicate an update. On one Redis node, a Lua script can check the window and membership and update all keys atomically. `WATCH`/`MULTI` can also work when conflicts/retries are handled correctly. On Redis Cluster, keys used by a script/transaction must share a hash slot; a global leaderboard may need sharded leaderboards and top-N merging, or a different update pipeline.

**To allow down-votes or vote changes:** use separate `voted:up:<article>` and `voted:down:<article>` Sets to represent each user's state. A new vote adds or subtracts `VOTE_SCORE`; switching from up to down removes the user from the up Set, adds them to the down Set, and reduces the total score by `2 × VOTE_SCORE`, because the vote changes from `+1` to `-1`. `SMOVE` can move a member between the Sets, but score and other counters are still separate operations; combine the voting-window check, Set transition, and score update in a script/transaction to avoid partial state. Define whether `votes` means total ballots or net votes in the schema.

To fetch a top-post page, `ZREVRANGE score: 0 24` returns IDs from highest score down; then fetch metadata with batched `HMGET` or `HGETALL` per key. One query per ID creates N+1 round trips; batch-hydrate the IDs and restore their ZSET order. Cost depends partly on the number of returned elements, so do not fetch the whole leaderboard into the application just to show a few entries.

## Topic groups create a second index

A post may belong to multiple groups. A `group:redis` Set stores membership; when a user opens a group, the application needs the intersection of membership with ranking order. Two designs are:

1. Maintain a `group-score:<name>` Sorted set and update it when a post is voted on or changes groups. Top-N reads are fast, but each vote must update every relevant group.
2. Build the group result on demand and cache it briefly. This reduces continuous update work, but large intersections can consume CPU/RAM and results may be stale for the TTL.

The book uses a membership Set as input to Sorted set union/intersection; each Set member is treated as having score 1. Current Redis source code also accepts both `OBJ_SET` and `OBJ_ZSET`, although the command-reference page describes Sorted set inputs. Because the documentation contract and implementation do not fully match, check the exact server/version being deployed; for stable cross-version behavior, maintain group membership as a Sorted set with score 1. `ZINTERSTORE` can process many members and writes a destination, so do not put it on a hot request without measuring cardinality/latency. Use versioned/TTL cache keys and prevent concurrent requests from building the same large result.

For example, `z1 = {a:1, b:2, c:3}` and `z2 = {b:4, c:1, d:0}`. `ZINTERSTORE out 2 z1 z2` keeps only `b,c`; the default `SUM` aggregate gives `b=6, c=4`. `ZUNIONSTORE out 2 z1 z2 AGGREGATE MIN` keeps `a,b,c,d` with scores `1,2,1,0`, respectively. `WEIGHTS` multiplies each input score before aggregation, so choosing `SUM`, `MIN`, or `MAX` defines what the score means, not just the syntax.

This is a tradeoff between **updating extra indexes when data changes** and **computing an intersection when a user reads**. Small/infrequently changed groups may use cached results; high vote volume, hot groups, or tight latency often call for precomputed rankings. When deleting a post or changing its groups, synchronize membership, score, time index, and cache invalidation; omitting one operation leaves orphans or incorrect rankings.

## Expiration is a lifecycle tool, not a backup

The Set of voters only needs to exist while a post accepts votes. `EXPIRE` attaches a TTL to the whole key, after which Redis deletes it automatically. Updating a key can change its TTL depending on command semantics; check TTL after important operations. TTL does not remove a member from `score:` or `time:`; related key lifecycles need coordinated cleanup, index pruning, or maintenance jobs.

If a session only needs to live for a fixed period and old-session cleanup is not needed for analytics, attach TTLs directly to session/cart/viewed keys and renew them on activity. A recent-activity ZSET is more suitable when the application must prune to a cardinality bound or retain a history for analysis. These are different lifecycle models: TTL deletes a whole key automatically, while a ZSET lets the application choose old members and doubles as a query index.

In the example, the article ID and ZSET member are strings. After reading the list, the application fetches the corresponding Hash. If the Hash is deleted while the ZSET still has its member, the app sees an orphan; if the ZSET removes the member first, the article may remain but lose its discovery path. Decide which key is authoritative and which indexes can be rebuilt from it.

## What does this example teach beyond commands?

“Vote for a post” is several questions: is voting still open? has the user voted? what is the new score? which counter is displayed? which groups contain the post? Those questions map to ZSET, Set, Hash, and counter structures. Redis makes individual operations fast and atomic at command level, but a multi-key business operation still needs a transaction/script, retry policy, Cluster slot design, and repair/reconciliation. The book builds the example incrementally and introduces transactions later; a real application must account for correctness as soon as it combines steps.

Sources: *Redis in Action*, chapters 1 and 3; [sorted sets](https://redis.io/docs/latest/data-types/sorted-sets/), [`ZINTERSTORE`](https://redis.io/docs/latest/commands/zinterstore/), [Redis source input-type check](https://github.com/redis/redis/blob/unstable/src/t_zset.c#L2712) and [Set score assignment](https://github.com/redis/redis/blob/unstable/src/t_zset.c#L2302), [`EXPIRE`](https://redis.io/docs/latest/commands/expire/), the [command reference](https://redis.io/docs/latest/commands/), and [data types](https://redis.io/docs/latest/develop/data-types/).

## Check your understanding

**Does a Set keep insertion order?** No.

**Can a sorted-set score represent every integer exactly?** No; it is a finite-precision double.

**Are two consecutive commands for vote + score always atomic together?** No; use a script/transaction or event-driven reconciliation.
