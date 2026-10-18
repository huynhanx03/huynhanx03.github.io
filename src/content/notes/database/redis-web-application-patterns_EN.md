---
title: "Redis in Web Applications: Sessions, Carts, and Caches"
category: "Database"
description: "Design keys and read/write paths for login sessions, cookies, shopping carts, page caches, row caches, and analytics."
updated: 2026-10-18
translationKey: "database/redis-web-application-patterns"
---

A commerce application can use Redis to reduce repeated reads, hold sessions, and support shopping carts. Each pattern must answer three questions: where can the data be rebuilt from, which operations must be atomic, and when is an old copy no longer acceptable? Redis makes operations fast; the application still designs the consistency boundary.

## Login sessions and cookies

The browser cookie should contain a hard-to-guess random identifier; the server stores the corresponding session in Redis. A key such as `session:<token>` can be a hash with user ID, creation time, and metadata. Do not put passwords or secrets directly in the key. The token needs sufficient entropy; the cookie needs `Secure`, `HttpOnly`, `SameSite`, and TLS.

A signed cookie can carry signed data that the server verifies for integrity, but a signature does not make the contents secret; revocation/permission changes are also difficult without a version or revocation list. A random token is only a reference; a server-side session can be revoked by deleting its key and can store extra metadata, at the cost of a lookup and storage. Neither approach should trust client data merely because it is encoded; verify signature, expiry, scope, and authorization on the server.

A request may extend the TTL while a session is valid, but sliding expiration can keep an active user's key alive indefinitely without an absolute expiry. Store a hard expiration time alongside the sliding TTL or cap the login duration. Logout deletes the session; permission changes/credential revocation need invalidation or a version check. If Redis loses data, define a safe re-login path instead of restoring unauthenticated sessions.

### Recent sessions, viewed items, and cleanup

Chapter 2 adds a `recent:sessions` ZSET: the member is a token and its score is the latest activity time. On each request, the application updates the token-to-user Hash and the ZSET timestamp; if an item was viewed, it adds the item to `viewed:<token>` with a timestamp score and trims the set to the 25 most recent items. This is a display aid, not an audit log.

There are two cleanup strategies. TTL deletes a key after inactivity, which fits a plain session. If the application needs at most N sessions and recent behavioral data, a ZSET can remove the oldest members in batches until cardinality is below the limit. A worker must remove every key associated with the token (`session`, `viewed`, `cart`) and the index member; operations need to be idempotent, batch-bounded, and protected against competing workers. The book's ten-million-session limit is an example, not a recommended setting.

## Shopping carts and concurrent updates

A cart can be represented as a hash `cart:<user>` with product IDs as fields and quantities as values. `HINCRBY` atomically changes one field. Pricing, inventory, coupons, and checkout cannot rely on this cached cart: at order time, re-read the source of truth, revalidate price/stock, and write the order in the primary database transaction.

Use `HSET` when a request supplies the final quantity; use `HINCRBY` when it means “add N.” Distinguish the two semantics so retries do not accidentally add quantity more than once.

An anonymous cart has its own token and must later merge into the authenticated cart. Define whether merging adds, replaces, or caps quantities; concurrent merge requests need a transaction/script or idempotent handling. TTL on abandoned carts cleans data but must fit product lifetime and recovery expectations.

## Page and row caches

A page cache key should include normalized URL, locale, permissions, and query parameters. If a key omits tenant, locale, or authorization scope, one user may see another's data. A row cache stores an object by ID; an aggregate across rows still needs a database query or a separate cache entry with explicit invalidation.

Cache-aside reads Redis, fetches from the database on a miss, then `SET`s with a TTL. After a database write commits, invalidate the key; invalidating before commit allows a reader to cache the old value while the transaction is uncommitted. Even invalidation after commit has a race: an old reader can write stale data back. Versioned keys or cache generations reduce the race; if a stale window is acceptable, set and measure it.

Caching a result list makes invalidation harder than caching one row. Identify which events change the list and which keys they affect. Do not use `KEYS pattern` to find and delete keys in a large production keyspace; maintain an index or generation namespace.

Whole-page caching fits public routes or mostly static content; skip personal pages, carts, checkout, and pages containing private authorization data. The book's five-minute TTL is an example freshness window. The key should hash a normalized request and include every input that changes the response; omitting locale, query filters, experiments, or role can return incorrect or leaked content.

## Refresh row caches on a schedule

For a frequently changing row such as remaining promotional inventory, a whole-page cache can be stale too long, while reading the database on every request creates load. Chapter 2 illustrates scheduled row refresh: a `cache:schedule` ZSET uses row ID as member and the next refresh time as score; a `cache:interval` ZSET stores each row's refresh interval. A worker reads due rows from the source of truth, serializes them to `cache:row:<id>`, and schedules the next refresh at `now + interval`. Hot rows get shorter intervals, slower-changing rows longer ones; interval ≤ 0 removes the row from both indexes and cache.

In the book's listing, the worker **schedules the next refresh before it reads the database and writes the cache**. If either operation fails, the next run may not retry immediately; it may wait for the full interval. If an exception escapes the loop, the worker may stop altogether. That ordering is what the book's sample code does, not a requirement of refresh-ahead. A more resilient worker marks a refresh complete only after the read and cache write succeed; on failure, it keeps the job due or schedules a backoff retry, records a log/metric, and continues with other rows.

This is **refresh-ahead**, not a guarantee of freshness. A slow worker, database lag, or failure between read and write leaves stale cache data. Multiple workers need a lease/claim or sharded schedule; if a row is deleted at the source, remove its cache and schedule. Source versions prevent an old worker from overwriting a newer value. Inventory, final pricing, and authorization still require validation in the important transaction; stale cache must not decide who can purchase an item.

JSON in the example is debuggable and works across languages, but needs schema versioning, payload limits, and protection from arbitrary client field updates. If one field needs frequent atomic changes, a hash or another structure may fit better than a blob.

## Analytics and simple leaderboards

Page views can use `INCR` by route/time bucket; a ZSET can store items as members and view counts as scores to identify popular pages. In the book, each request adds the item to `viewed:<token>` to retain the user's 25 most recent items, then increments a global `viewed:` ZSET with a negative score; because lower scores come first, the most viewed items appear near the front. Every five minutes, a worker removes entries from rank 20,000 onward, then applies `ZINTERSTORE` to the ZSET itself with weight `0.5`, halving the remaining scores. `can_cache()` caches a product page only when its ID is in the top 10,000, avoiding the cost of keeping all 100,000 pages in memory. This is decayed popularity that gives new pages a chance to rise, not an exact total-view count. The thresholds are examples from the book's site.

If HTML still consumes too much RAM, the book suggests compressing payloads after measuring CPU/network cost, using edge-side includes to separate dynamic page sections, or removing unnecessary template whitespace. Each choice changes CPU, latency, render complexity, and invalidation; follow measured profiles rather than compressing every response by default.

Decide whether you count requests or unique users, how bots/retries are handled, required accuracy, and retention. A counter/ranking aggregate is not an event log; for audit or recomputation, write events to a durable log/queue and aggregate them. Periodic rescaling loses exact frequency information; do not use a decayed score for legal or financial reporting.

## When Redis is unavailable

Not every cache miss should fall through to the database at once. Use short timeouts, bulkheads, request coalescing, conditional stale responses, or concurrency limits. Track hit rate alongside database QPS, cache errors, stale rate, and p95/p99; a high hit rate is still bad if invalidation is incorrect.

These patterns reinterpret *Redis in Action*, chapter 2, with current security and failure-handling principles. See [key expiration](https://redis.io/docs/latest/commands/expire/), [sorted sets](https://redis.io/docs/latest/data-types/sorted-sets/), [client-side caching](https://redis.io/docs/latest/develop/reference/client-side-caching/), and the session/cookie documentation for your framework.

## Check your understanding

**Should all authentication state be stored in a cookie?** No; the cookie carries an identifying token, the server holds the state, and cookie protections matter.

**Is a cart the source of price and stock at checkout?** No; revalidate primary data when placing the order.

**Does post-commit invalidation eliminate every stale-write race?** No; a reader that fetched an old value earlier can still write it back. Use a version/generation or accept a measured stale window.
