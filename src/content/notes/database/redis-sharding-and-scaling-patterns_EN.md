---
title: "Scale Redis: Replicas, Shards, and Multi-Key Queries"
category: "Database"
description: "Choose read scaling or write sharding, route keys, operate resharding, and split complex queries."
updated: 2026-10-18
translationKey: "database/redis-sharding-and-scaling-patterns"
---

Redis scales in three ways: serve more reads with replicas, partition data for capacity and writes, and redesign queries that combine results from multiple shards. Each path changes different costs and guarantees.

## Chapter 10: scale each kind of load

Before adding machines, identify which limit you have reached. One server may have enough RAM but insufficient read QPS; reads may be healthy while writes are saturated; or data and writes may already be partitioned while a query still needs results merged across the whole dataset. These cases need different solutions.

Before scaling out, the book recommends removing avoidable work: bound response bytes, choose the right data structure and range, compress large payloads only if CPU allows, use pipelines/connection pools, move unrelated components to separate instances, aggregate analytics writes locally where possible, and include AOF/disk write capacity in the budget. If `WATCH`/`MULTI` becomes a bottleneck, reconsider the transaction boundary, a lock, or Lua rather than just adding shards. This checklist helps confirm that the bottleneck is one node's capacity, not a poor query/data model.

### Add read capacity with replicas

A replica is an asynchronous copy that receives changes from a primary. Sending independent reads to replicas can increase total read capacity, but a replica may be behind the primary. A dashboard that tolerates lag may read a replica; a balance check immediately after a transaction or a read-after-write should go to the primary or use a replication-wait protocol that matches the requirement.

The book emphasizes the cost of initial synchronization. When a replica joins or needs a full resynchronization, the primary may create and transmit a full snapshot. Several replicas resynchronizing at once consume CPU, copy-on-write memory, disk I/O, and bandwidth. A saturated network can raise client latency and disconnect existing replicas. A replica tree can let one node receive from the primary and serve remote copies; compression or a private network may help on slow links. The tradeoff is more failure paths and harder failover. Measure sync duration, bytes transferred, lag, and latency before choosing a topology.

The book also introduces Redis Sentinel as a separate monitoring process: Sentinels watch primaries and replicas, exchange observations, coordinate the choice of a replica to promote after a primary fails, and redirect the remaining replicas to the new primary. Sentinel can send notifications or run operator-provided scripts. Detection, quorum, and failover behavior must be understood for the deployed release; the historical example does not replace a modern design and test for quorum, split brain, and failover. One application detail also matters: search-result caches are local to the replica that created them, so a request that wants to reuse a cached result must return to that same replica. Sticky routing enables this but can skew load and needs a policy for node changes.

Before scaling reads, reduce response size, choose the right data structure, bound ranges, use bounded pipelines, and compress large payloads if CPU allows. Replicas do not fix an O(N) command, a hot key, or excessive response bytes. Current replicas are normally read-only; reads from Cluster replicas explicitly accept possibly stale data.

### Partition writes and capacity

When a primary reaches its RAM or write-throughput limit, place portions of the data on separate shards. The chapter builds a connection decorator that accepts a `component` and key, looks up shard configuration, and passes the correct connection to a function. The reusable idea is to centralize shard selection in a shared router instead of scattering mappings through the code. A production router also needs versioned mappings, consistent distribution, per-shard observability, node-state handling, and retry rules.

If rapid growth is expected while the dataset is still small, pre-create many logical shards and place several on one machine or in separate logical databases; later move them to more hosts without changing the routing rule. The book's `256` shards are a growth-planning example, not a default. Balance the cost of empty shards and metadata against avoiding a large remap when the shard count grows. If several processes share a host, each needs its own port and persistence files.

Modulo hashing is simple: `shard = hash(key) % N`, but changing N usually moves many keys. Consistent hashing or a slot map reduces or controls movement. Redis Cluster uses fixed slots and redirects clients to the right node; applications still handle resharding and retries. Do not place all keys from a business workflow together unless multi-key queries, transactions, or scripts require them to be colocated.

A logical shard does not have to be a separate physical machine: several Redis processes can run on one host to use additional cores when a workload is limited by one process, provided CPU/network/I/O remain available and each process has a distinct port and snapshot/AOF paths. This can increase throughput within the host; it adds neither physical RAM nor protection from host failure, and the processes still compete for disk/network.

Sharding increases total capacity and spreads writes, but turns local operations into distributed ones. Moving data may require dual routing, copying, count checks, a watermark, cutover, and rollback. If a client times out after the server received a write, it cannot know whether the write ran; retry only when the operation is idempotent or carries a request ID for deduplication.

### Distributed search and global top-K merge

Chapter 7 builds search indexes in Redis. When one node cannot handle query throughput, the index can be copied to replicas. But queries such as `SUNIONSTORE`, `SINTERSTORE`, and `ZINTERSTORE` create result keys, so they are not read-only. The book, written for Redis 2.6, suggests enabling writes on replicas for temporary results; current Redis documentation calls writable replicas a historical feature and does not recommend them, because local writes can diverge from the primary and be lost on restart/resynchronization. Prefer commands that return results directly, such as `SUNION`/`ZINTER`, `SORT_RO`, or `EVAL_RO` where suitable and available in the deployed version; if a temporary cache key is required, create it on an authoritative writable node with a clear TTL. When the index no longer fits one shard, assign documents by document ID so each document's data stays together.

A distributed query has three phases: evaluate the predicate on every shard, retrieve enough candidates with their sort field or score, then merge and paginate globally. In the book's `SORT` algorithm, page 91–100 requires each shard to find its first 100 local query results and fetch the sort field for each document; the coordinator combines `(document_id, sort_value)` pairs, sorts them again, and only then slices page 91–100. After the local search, the coordinator otherwise no longer knows which shard produced each global candidate. For numeric sorting, the example normalizes values to decimal numbers and treats a missing value as `0`; for string sorting, a missing value becomes the empty string. Those are example rules, not correct NULL semantics for every product. Choose consistent rules for NULLs, mixed types, and tie-breaking across all shards. With a pre-scored ZSET, each shard returns members and scores through `start + num`; the coordinator merges by score direction and then selects the requested page.

Returning only `num` results from each shard is insufficient when the page starts after offset zero or the best results cluster on another shard. Summing local counts is valid only when shard result sets do not overlap and all shards use the same predicate. The book's simple implementation queries shards sequentially; parallel fan-out can reduce waiting time but raises concurrent load, and total latency still depends on the slowest shard. Bound the number of candidates and the coordinator's memory as shard count grows.

Fan-out cost grows with shard count; merging retains candidates in memory, and latency is often determined by the slowest shard. Shards may also observe data from different moments. Use parallel fan-out, bounded top-K, and per-shard cursors where appropriate, but prove the candidate bound. If the query begins to resemble a search engine, building a distributed index and merge layer may cost more than using a purpose-built search system.

### Partition timelines and graphs differently

A user's timeline can place all of that user's keys on a shard selected by user ID. Home/list timelines are often bounded, so distributing the keys is enough; a profile timeline can grow without limit, so it needs retention or time-based/segmented storage. The book's 1,000/20,000 entry limits are illustrative choices, not universal thresholds.

Followers/following are harder than timelines: a popular user can have a huge follower set. Partitioning a list by `hash(follower_id)` spreads entries, but add/remove/count/page operations must know which shard is involved. If both sides of a relationship must be written on the same shard, normalize the ID pair before hashing so either side chooses the same location. A score-based page requires fetching up to K candidates per shard and merging; its cost grows with shard count.

In the book's example, the relationship score is the follow time. A cursor such as `score > last_seen` lets each shard return the next page and then merges K candidates; this avoids reading from rank 0 through a deep offset on every shard as position-based pagination would. The book uses `ZRANGEBYSCORE`; since Redis 6.2, `ZRANGE ... BYSCORE` is its replacement. But a score-only cursor fails when several relationships share a timestamp. Suppose a page ends at score `1700000000` and member `user-42`, while `user-57` has the same score: querying for scores greater than `1700000000` skips `user-57`; querying from that score inclusively may return `user-42` again.

The page order therefore needs the pair `(score, member)`. Redis orders members with the same score lexicographically. Each shard can read the boundary-score group, keep members after the cursor under the chosen tie-break rule, then continue with later scores; the coordinator merges candidates and emits the final cursor. If a score has too many members, reading the whole group may be expensive. In that case, split the group with a secondary index/key by bucket or encode a stable ordering into the data model. Do not merely add an ID to the cursor if the actual query still cannot find the remainder of a same-score group. Records added or removed between requests also mean a stable ordering is not a snapshot; the product must choose semantics such as accepting changes, keeping a time watermark, or storing a short-lived snapshot.

When an account posts, fan out the post to followers' home timelines in batches. Read follower pages by cursor/score, group target timelines by destination shard, and pipeline the post's `ZADD` and timeline-trim commands for each group. If a batch completes while followers remain, enqueue the next job with its cursor; after followers are done, process list timelines if needed. This is the chapter's concrete flow: page through follower shards, group writes by timeline shard to reduce connections/round trips, then continue asynchronously in bounded batches. It avoids one huge job occupying a worker, but creates eventual consistency: a post may not yet appear in every feed. Retries should be idempotent by post ID; rebuilding and catch-up need a watermark and deduplication. Accounts with enormous follower counts may use pull-on-read or a hybrid strategy to avoid a write hotspot.

The scaling patterns in *Redis in Action*, chapter 10, are checked against [Redis scaling](https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/), [replication and writable-replica limits](https://redis.io/docs/latest/manual/replication/), the [Cluster specification](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/), [`ZRANGE` by score](https://redis.io/docs/latest/commands/zrange/), and [client-side caching](https://redis.io/docs/latest/develop/reference/client-side-caching/).

## More checks

**Can a new replica raise latency even if it only serves reads?** Yes. Full synchronization consumes primary CPU, I/O, and network; concurrent syncs can affect the whole system.

**Why is taking the top 20 from each shard not always enough for global page 20–39?** A global offset requires enough candidates from each shard; only after merging and sorting can we know the global positions.

**What changes when a follower list is sharded?** One ZSET operation becomes a fan-out or merge across shards; pagination, counts, retries, and ordering need explicit semantics.

## Check your understanding

**Does a replica read guarantee read-after-write?** Not by default; lag can return old state.

**Does modulo N remain stable when a shard is added?** No; many keys move.

**Is the top 10 from each shard always enough for the global top 10?** Not for arbitrary ranking/filtering; analyze candidate bounds and merge semantics.
