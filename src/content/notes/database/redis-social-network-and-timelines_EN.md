---
title: "Social Networks, Followers, and Timelines with Redis"
category: "Database"
description: "Model users, statuses, follow graphs, home timelines, and streaming with explicit fan-out choices."
updated: 2026-10-18
translationKey: "database/redis-social-network-and-timelines"
---

A timeline combines follow relationships with time order and visibility rules. In Chapter 8's design, profiles and statuses are Hashes; `following:<uid>` and `followers:<uid>` are ZSETs whose members are user IDs and whose scores are follow timestamps; timelines are also ZSETs containing status IDs scored by posting time. The follow timestamp lets the system order and page through followers during fan-out. A Set is enough if membership is all that matters, but then ordering or pagination needs a separate index. The key feed-design question is whether to create a feed when an author posts (fan-out on write) or when a reader opens the app (fan-out on read).

## Users, statuses, and follow edges

A `user:<id>` Hash stores the login, display name, follower/following/post counts, and signup time. A `users:` Hash maps lowercase login names to IDs for lookup and case-insensitive uniqueness. The creation routine locks the normalized login before checking it and allocating an ID, preventing concurrent requests from creating the same name. The book's sample returns on an existing login before releasing the lock; its short TTL limits how long the lock remains, but real code should release it in `finally`.

Sensitive fields such as email and password hashes stay out of the Hash fetched for ordinary profile rendering. Each status has its own ID and stores author, timestamp, text, and optional metadata; the user ID and login are copied into it so a read does not need a separate profile lookup.

`following:<uid>` and `followers:<uid>` are reverse indexes, so follow/unfollow must keep both ZSETs and the profile counters consistent. Follow requests, blocks, private accounts, and unfollows change authorization; cached feeds need invalidation so private content does not remain visible.

When following someone, the book checks whether the edge already exists, adds both relationship directions, recomputes both counts, then copies up to the 1,000 newest statuses from that person's profile timeline into the new follower's home timeline and trims the feed. Unfollow reverses this: remove both edges, update the counts, and remove that person's recent statuses from the home timeline. This initial copy lets a new follower see recent posts immediately; future posts arrive through fan-out. The example batches commands to reduce round trips, but a multi-key update still needs a clear consistency boundary and retry policy.

The Chapter 8 example deletes the status hash and removes its ID from the author’s profile timeline and own home timeline; it does not visit every follower feed that received a fan-out copy. Those feeds retain orphaned IDs, which the read path skips when fetching a now-missing hash. The book leaves cleanup of these zombie IDs as an exercise. Synchronous removal from every copy is expensive at scale; a batch cleanup or tombstone/version can hide the status immediately and clean later, but storage, retry idempotency, counter updates, and privacy retention must be controlled.

## A home timeline with sorted sets

A feed key `feed:<user>` holds status IDs scored by timestamp; a reverse range returns the latest items with pagination by cursor. Timestamps can collide; include a sequence/stable tie-breaker. Cap the top N for a memory bound. Hydrate statuses from cache/database in batches while preserving order and filtering deleted/private items.

Offset pagination shifts when new items are inserted at the beginning. A cursor such as `(score,id)` continues before the last-seen item. The read path must handle stale entries, posts by blocked users, and an unfollow occurring during a request.

## Fan-out on write and celebrities

When an author posts, the system first creates the status Hash and adds its ID to the profile timeline, then fans it out to followers' feeds. The book updates up to 1,000 followers during the posting request; if more remain, it schedules a background task to continue in batches of 1,000. Each feed is trimmed to its 1,000 newest IDs. Ordinary users get a fast read path, with most cost on writes; for a celebrity, background work keeps the request short but still creates write amplification and a backlog. Fan-out on read keeps posts in the author's timeline and merges them at read time, reducing writes but increasing query cost.

A hybrid often pushes to ordinary followers and pulls celebrity posts when reading. Rules must prevent duplicates/misses: author classification, feed watermark, merge order, fan-out retries, and ID deduplication. Backfill/rebuild should be batched and rate-limited to avoid overloading Redis/database.

## Batched fan-out needs a cursor through a changing follower set

Chapter 8 stores followers in a ZSET scored by follow time, then pages through `ZRANGEBYSCORE` to fan out in batches. If a batch ends partway through many followers with the same score `t`, starting the next page at `t` reads the beginning of that group again because score bounds are inclusive by default; `ZADD` makes duplicate writes harmless, but the task may fail to progress. Changing the next bound to `> t` instead skips the remaining members that also have score `t`.

Fan-out needs a cursor that distinguishes both score and member. One clear option is a secondary index used only for fan-out: give every follower the same score `0`, use a normalized user ID as the member, then read `ZRANGE fanout:<author> (last-id + BYLEX LIMIT 0 1000` and store the final member as the cursor. `BYLEX` defines order only when all scores are equal, so this index is separate from the follow-time ZSET used by the UI. Any alternative must prove that the next batch starts after the exact `(score, member)` pair without skips or repeats.

The follower set can change while a job runs. If a newly added follower falls lexically before the cursor, the scan may never visit them; if they fall after it, they may receive a post created before they followed. Define this with a timestamp/generation boundary: the fan-out job handles the follower snapshot at post time, while later followers receive older posts only through an explicit backfill policy. Unfollow has the opposite race: a worker may read a user into a batch, then write the post to that user’s feed after the follow edge is removed. Ideally, check the edge and write the feed atomically (with Lua/Functions in Cluster, all keys must share a hash slot). Without that atomic boundary, invalidate stale work with a relationship generation and verify authorization on the read path; a separate check followed by a write still races. For private accounts, feed cleanup is never the authorization boundary. Cursoring, retries, follow changes, and unfollow need explicit snapshot semantics, idempotency, and reconciliation.

## Streaming API and filtering

A streaming API has a different request shape from a timeline page: an HTTP connection stays open and returns each matching event as it appears. Before writing filters, decide which events are exposed, who may see them, and which criteria clients can request. Chapter 8 emits only status-created and status-deleted events; it leaves access control as a product decision. Its example server has separate GET sample and POST filter handlers, reads an identifier and filter parameters, rejects invalid routes/input, then opens an HTTP chunked response to send statuses one at a time. This is Python 2-era sample code, not a complete modern server design.

When a status is created or deleted, the application publishes a payload to `streaming:status:`. Each connection has its own subscriber, applies a filter, then writes a chunk to the client. If the client socket closes, the generator stops and the subscriber must be closed/reset; a slow subscriber can also grow its output buffer, so the book calls out setting Pub/Sub output-buffer limits based on load and connection count. Pub/Sub does not retain events: a disconnected client misses posts, so this stream is not a replayable mailbox/cursor. For reliable reconnect, use an ID/cursor log such as Redis Streams or a suitable broker, with explicit retention. The pipeline's “write status, then publish” steps are not a durable outbox; a crash between the data update and publish can leave a saved status with no stream event.

The book's filters run on the server. A sample filter seeds a pseudo-random ordering from the client identifier and keeps a percentage of buckets based on `status_id % 100`; the same identifier selects the same statuses, so a delete event can reach the same audience without storing a client–status matrix. A track filter lowercases and splits text into tokens: every word in one group must appear, while different groups are ORed. A follow filter matches posts by selected accounts or posts that mention `@username`. A location filter reads optional coordinates and checks whether they fall inside one or more rectangles `[minimum longitude, minimum latitude, maximum longitude, maximum latitude]`. Whitespace tokenization does not fully handle punctuation or languages; location data also needs validation and coordinate bounds.

On deletion, the book publishes the status payload with `deleted`; subscribers run the original filter and send a tombstone containing only the ID and deletion state. This avoids storing a list of everyone who received a post. If a listener disconnects during publish, however, the delete event is not replayed; the read path must still check current status and authorization. The query identifier is only an identifier in the example, not proof of authentication. A production stream needs client authentication, server-side authorization, rate limits, and payload filtering/redaction before broadcast.

## Storage and privacy tradeoffs

Follower graphs are skewed; a celebrity key may be huge/hot. Shard graph/feed by user, though multi-key queries become harder. Define TTL/retention for feeds, deleted state, export, and data erasure. Redis is not a general graph database; sets fit simple adjacency, but multi-hop queries may need another service.

These topics draw from *Redis in Action*, chapter 8; current [sorted sets](https://redis.io/docs/latest/develop/data-types/sorted-sets/), [sets](https://redis.io/docs/latest/develop/data-types/sets/), and [Streams](https://redis.io/docs/latest/develop/data-types/streams/) and [`ZRANGE BYLEX`](https://redis.io/docs/latest/commands/zrange/) docs explain the primitives and lex-range requirements.

## Check your understanding

**Why are celebrities hard for fan-out on write?** One status must be inserted into a very large number of feeds.

**Is offset pagination stable when new posts arrive?** No; new items shift offsets. Use a cursor and tie-breaker.

**Does deleting a status mean it vanishes immediately from every feed?** Not easily after fan-out; define cleanup, tombstone/filter, and privacy behavior.
