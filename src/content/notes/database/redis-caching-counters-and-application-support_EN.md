---
title: "Redis for Caches, Counters, and Application Data"
category: "Database"
description: "Design caching, expiration, invalidation, counters, statistics, and shared data without stale-data traps."
updated: 2026-10-18
translationKey: "database/redis-caching-counters-and-application-support"
---

A cache avoids repeating expensive work, but adds a copy of data that must remain consistent with business expectations. Redis enables fast reads; the application still decides what to cache, when it expires, who invalidates it, and what happens when Redis is unavailable.

## Basic cache-aside

The application reads Redis; on a miss, it reads the primary source, stores the result with a TTL, and returns it. When writing the source, the application can invalidate or update the cache key. Invalidation is often safer than updating many copies, but has a race: an old reader fetches from the database, a writer invalidates, then the old reader stores stale data. A version key, write-through, lock/single-flight, or an accepted stale window may fit the requirement.

```text
GET cache → hit: return
         → miss: read primary DB → SET cache with TTL → return
DB write → invalidate/update cache
```

A TTL caps stale time but does not replace invalidation. Simultaneous TTLs cause stampedes; add jitter, request coalescing, stale-while-revalidate, or rate limiting. When Redis is unavailable, bound database fallback so a cache failure does not overload the database.

## Counters, rate limits, and statistics

`INCR` is a simple atomic counter. A fixed-window rate limiter can count requests by bucket key and TTL; requests around two bucket boundaries may exceed the intended allowance. Sliding windows/logs or token buckets are more precise but use more state/compute. Define semantics (per user/IP, timezone/window, retries, distributed replicas) before choosing a pattern.

Examples in *Redis in Action* include analytics, IP lookup, and shared configuration. For approximate statistics, HyperLogLog estimates distinct counts with error; bitmaps store status by ID compactly when the ID domain fits. Query/result caches must account for privacy, tenant keying, and invalidation when schemas/dependencies change.

### Recent logs and frequent logs

A recent-log list can use a List per component and severity: `LPUSH recent:api:error <entry>`, then `LTRIM ... 0 99` to retain the newest 100 lines. This is a quick ring buffer for inspection, not a complete log store: old entries are intentionally deleted, Redis may restart or evict data, and delivery is not guaranteed like a dedicated logging system. Include timestamps and request/trace IDs, bound payload length, and avoid recording tokens, passwords, personal information, or huge messages.

To find repeated failures, count message frequency in a ZSET for a time window, then roll “current hour” into “previous hour” when the bucket changes. Rollover and event recording need a transaction or idempotent design so concurrent workers do not both rotate a bucket and lose updates. Normalize messages before counting (for example, remove request IDs), or every line becomes a distinct member. Use a dedicated log pipeline/collector when durable retention, access control, full-text search, or multi-host queries are required; Redis can keep only a recent sample/window.

In the book’s example, `common:<component>:<severity>:start` stores the current-hour boundary. At the next hour, a writer watches that marker, moves the previous-hour ZSET to `:last`, advances the marker, and increments the new hour’s message score. If two writers race to rotate, one transaction receives `WatchError` and retries against the new state. The same transaction adds a copy to the recent-log list, so an event is visible from two angles: “just happened” and “happens often.” Reading `:last` gives only the immediately preceding hour, not durable history.

### Counters at several resolutions

A time-series counter can group events into 1-second, 5-second, 1-minute, 5-minute, 1-hour, 5-hour, and 1-day buckets so a dashboard can see both short and long trends; this is the book’s illustrative precision set, not a requirement for every dashboard. A key can include the precision and counter name; a Hash stores `bucket_timestamp → count`, while an index lists known counters. On write, compute `floor(timestamp / precision) × precision`, then `HINCRBY` the bucket. Choose resolutions based on dashboard questions and the cardinality budget; there is no need to duplicate every metric at every resolution.

A Hash that keeps bucket history cannot attach a TTL to individual fields. A cleanup job must remove old buckets, remove empty counters from the index, and tolerate overlapping/repeated runs; alternatively, change the layout so each bucket has its own TTL key. Cleanup intervals, sample counts, and time zones must agree so writers and readers do not disagree about hour/day boundaries. On reads, fetch only the range needed for the chart instead of `HGETALL` over all history.

Chapter 5 illustrates retaining about 120 samples per precision. A `known:` ZSET stores each `precision:name` pair at score zero, so cleanup can scan a stable list without duplicates. A worker computes a cutoff as `now − sample_count × precision`, finds older timestamps, and removes those fields. One- and five-second counters can be cleaned on roughly a one-minute cycle; a five-minute counter every five minutes, an hourly counter every hour, a five-hour counter every five hours, and a daily counter once a day. Before removing a `known:` entry, the worker uses `WATCH` to confirm the Hash is still empty; if a writer added a sample, cleanup must preserve the registry entry. The book’s `HKEYS` plus sort cost grows with the number of buckets, so larger histories need time-partitioned keys or a structure that can range-read and delete efficiently. `EXPIRE` applies to a whole key; it does not expire individual Hash fields.

### Aggregates and execution time

From `count`, `sum`, `sumsq`, `min`, and `max`, an application can calculate the average and sample standard deviation without storing every measurement. `sum`/`sumsq` use counters; min/max can use conditional logic or aggregate merging. The book uses a ZSET as a field/score bag and `ZUNIONSTORE` to merge min/max. This exploits a command but is less clear than a Hash and requires checking semantics and precision. Variance computed as `sumsq - sum²/count` can lose precision through cancellation; use an online algorithm or metrics backend when statistical accuracy matters.

In the example, statistics are grouped by `context` and `type`, such as `ProfilePage` plus `AccessTime`. The current key holds this hour; after rollover, `:last` holds the preceding hour. For a new sample, the code creates two temporary ZSETs (one for min, one for max), then uses `ZUNIONSTORE` with the corresponding aggregate to update each extreme without reading and rewriting the whole aggregate. It deletes the temporary keys, then increments `count`, `sum`, and `sumsq`. Temporary names must not collide and need cleanup on failure; retries across multiple commands must not count a sample twice. ZSET scores have finite precision, so this teaches a data-structure pattern rather than an infinitely precise numeric ledger.

A timing helper can record each route/query/template and update a ZSET of the slowest contexts. For example, three `/search` samples of 40, 70, and 100 ms yield a current average of 70 ms; the ZSET ranks routes by average while the aggregate retains count/sum/min/max to show more of the distribution. The book keeps the 100 slowest contexts and suggests logging samples more than two standard deviations above average as an exercise; this needs enough samples and does not replace percentile/tail-latency analysis. Record units; measure duration with a monotonic clock (`time.monotonic()` in Python) so wall-clock adjustments cannot create negative or implausible durations; bound context-name cardinality and avoid arbitrary user IDs/paths as labels. The sample code records after `yield`, so an exception in the wrapped block can skip measurement; a production helper should finalize duration in `try/finally`, preserve the original exception, and record outcome/error. The slowest-items ranking is a derived index; updating averages and trimming old members must stay sufficiently consistent with the source metrics.

## Map IP addresses to cities: a range lookup

The book's example converts dotted-quad IPv4 `a.b.c.d` into a 32-bit integer: `a×256³ + b×256² + c×256 + d`. A ZSET stores each IP range's starting address as its score and a unique member: the book appends a row ordinal to the city ID because multiple ranges can point to the same city. Lookup strips that suffix to recover the base city ID; a Hash maps it to city, region, and country names. For a requested IP, find the member with the greatest score that does not exceed the IP using a reverse score range limited to one result, then read the Hash.

This uses a Sorted set for “nearest start on the left,” not merely ranking. Imports must validate headers, overlapping/gapped ranges, missing city IDs, encoding, and dataset version; the GeoLite data named in the book is historical and must be replaced by a current source under appropriate terms. The example handles IPv4 only; IPv6 needs a wider representation, and the application must decide which proxy/CDN supplies the trusted client IP. An IP address gives an approximate location, not proof of where a person lives.

## Runtime configuration and service discovery

A maintenance flag can live in Redis so many processes receive changes without redeploying separate files. Reading Redis on every request creates load and makes requests depend on the control store; a short local cache reduces load but makes the propagation delay equal to that TTL. Define the staleness budget, behavior when Redis is unavailable, configuration schema/version, and rollback path. Sensitive configuration needs suitable ACLs, encryption, audit, and secret management.

An application can keep endpoint/configuration under separate component namespaces and create a corresponding connection pool. The book recommends one Redis server per workload to make later scaling easier; in practice, weigh operational cost, isolation, `maxmemory`/eviction, persistence, and blast radius. Separate logical databases do not isolate resources or form a security boundary. Redis also cannot be the sole source of information needed to connect to Redis itself; the bootstrap endpoint must come from another configuration/deployment system.

An application can cache configuration in-process, refresh periodically or receive invalidations, and update the client/pool when the version changes. When replacing an endpoint, drain old connections, use bounded timeouts/retries, and do not open a new connection for every command. The book’s flow reads `config:<type>:<component>`, keeps the value and last-check time in process, then rereads Redis after a short cache window (one second in the example); it creates a component connection only when the configuration changes. A decorator associates a component name with a function so the right pool is supplied at call time rather than passed manually everywhere. In production, validate/version the change, create the new pool, route new requests to it, then drain the old pool; a half-applied change can mix endpoints or create a reconnect storm. Redis cannot be the only way to discover the initial endpoint of the Redis directory itself. Current applications should use a supported client with tested pooling, lifecycle, and reconnect behavior.

Both sample functions initialize the check time to `None` and compare it directly with `time.time()`. That is Python 2 code: Python 3 raises `TypeError` when comparing `None` with a number. Modern code should handle the not-yet-checked case before subtracting, such as `last_checked is None or now - last_checked >= wait`; use a monotonic clock for the refresh interval so wall-clock adjustments do not keep a value stale too long or trigger constant refreshes.

## Do not accidentally make a cache the source of truth

If data cannot be rebuilt, design persistence, backup, replication, eviction, and restore as for a database. `maxmemory` policy may evict cache keys automatically; persistent/no-expiry keys are affected according to configuration. Avoid sharing one policy/memory pool between critical state and best-effort cache if eviction of one can break the other.

## Measure effectiveness

Track hit/miss, p50/p95/p99 latency, bytes/key, eviction, stale/error rate, database load, and invalidation cost. A high hit rate is not useful if data is wrong or tail latency rises during stampedes. Use key versioning when formats change and bound payload sizes so eviction does not trigger a large reload loop.

Read *Redis in Action* chapters 2, 4, and 5 with [client-side caching](https://redis.io/docs/latest/develop/reference/client-side-caching/), [key expiration](https://redis.io/docs/latest/commands/expire/), [eviction](https://redis.io/docs/latest/develop/reference/eviction/), [benchmarking](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/), and [latency troubleshooting](https://redis.io/docs/latest/management/optimization/latency/).

## Check your understanding

**Does a TTL replace invalidation after a database write?** No; it only caps how long stale data can remain.

**What can simultaneous cache misses cause?** Many requests can hit the primary source at once and overload it.

**Does a Redis counter automatically create an audit log?** No; a counter stores an aggregate state, not every individual event.
