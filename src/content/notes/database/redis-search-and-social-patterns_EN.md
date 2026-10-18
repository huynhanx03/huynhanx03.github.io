---
title: "Redis Search, Advertising, and Social Patterns"
category: "Database"
description: "Learn inverted indexes, autocomplete, ranking, ad targeting, feeds, and voting, including fan-out costs."
updated: 2026-10-18
translationKey: "database/redis-search-and-social-patterns"
---

Chapters 7–8 of *Redis in Action* build search, ad targeting, and social features from basic structures. Their value lies in turning product requirements into sets, rankings, and relationships; the book's module APIs may be dated. Before choosing Redis, identify the source of truth, freshness needs, update/delete behavior, and index size.

## Inverted indexes and autocomplete

An inverted index maps a token to a set of documents. Redis Sets support intersections/unions for simple queries; sorted sets can rank by score; the application must handle tokenization, Unicode normalization, stop words, updates, and stale token removal. Intersections can be costly at high cardinality; measure intermediate set sizes and bound queries.

Autocomplete can store prefix-to-ranked-candidate mappings or use sorted sets/lexicographic ranges. Short prefixes often have high cardinality; cap prefix length, top-K, locale, and score updates. This is a hand-built pattern, not equivalent to a search engine with stemming, typo tolerance, facets, and richer ranking.

### The two autocomplete designs in Redis in Action

For an address book, each user needs only the 100 most recent contacts: store that order in a List, fetch the small list into the application, and filter with `startsWith(prefix)`. Updates are simple and compact; each query transfers all candidate names to the application, and search only covers the recent window. That limit is part of the product design, not complete autocomplete over every contact.

For a guild with many members, the book puts every username in a ZSET with the same score so Redis orders members lexicographically, then fetches the range whose names start with the prefix. With `ZRANGE ... BYLEX`, members must have the same score; construct lower and upper bounds according to the encoding's byte ordering and use a half-open range `[min,max)`. Do not increment the final character using ASCII assumptions when names may contain Unicode, accents, mixed case, or locale-specific ordering: collation, normalization, and byte order can make the range incorrect. Normalize names identically on write and query, define accent/case rules, cap results, and use `ZRANK`/bounded ranges rather than loading an entire guild.

A recent-contact List fits a small personal list; a lexicographic ZSET fits a larger name set that must be traversed in order. Both provide basic prefix matching. Typo tolerance, language-aware tokenization, relevance ranking, and faceting call for a search engine or specialized index.

## From text to an inverted index

Instead of reading every document on each query, an inverted index stores `token → set of document IDs`. During indexing, tokenize text, normalize it exactly as queries are normalized, remove stop words when they do not distinguish documents, then `SADD doc:<token> <id>`. A query for `redis cache` intersects `SINTER doc:redis doc:cache`; `redis OR cache` takes a union; `redis -cache` subtracts a set from the results. Each operation returns only its chosen matching semantics: AND across words does not understand phrases, order, stemming, semantic negation, or relevance by itself.

The book's query parser uses `+` to group synonyms into a union before intersecting with other word groups, and `-` to remove unwanted sets from the final result. This is example-specific syntax; parse and escape it explicitly so user text cannot become unintended operators. If there are no positive tokens, reject the query or cap its results instead of accidentally returning the whole corpus.

Set intersections/unions can create large intermediate results. The book writes results to a randomly identified temporary key with a TTL so the application can sort/page them and then let them expire. The application still needs tenant/permission namespaces, size and lifetime limits, and unpredictable key IDs; TTL is cleanup, not access control. When a document changes or is deleted, remove its ID from old token indexes and add the new index consistently, or search returns stale/orphaned documents. The book's ASCII English tokenizer does not handle Unicode, accented languages, stemming, phrases, or typos in a general way.

## Rank results with several indexes

`SORT` is useful when the result set is small and order comes from a Hash field; it can sort by update time, vote count, or title, then keep a temporary result ID for pagination. But sorting may fetch external metadata and a large collection can consume CPU/latency. For repeated queries, create ZSETs for ranking attributes and intersect them with result IDs so only matching candidates remain. A weighted score might be `score = 0.7 × normalized_votes + 0.3 × recency`; weights and normalization are product decisions that must be measured on real data, including ties.

A result ZSET can be read in ascending/descending order and paged by rank; cache the temporary result with a TTL to avoid recalculating for the next page. Source data may change between pages, so decide whether a short snapshot is acceptable or whether the cursor follows a changing index. ZSET scores are doubles; do not pack several large numeric fields into a score while assuming every value stays exact.

The book also converts strings to numbers for ZSET sorting. Its example encodes up to the first six ASCII characters: optionally lowercase, convert each character to a number, pad missing characters with `-1`, then update `score = score × 257 + (character_code + 1)`. The base 257 leaves room for each byte value and distinguishes a NUL character from padding. Finally, multiply the score by 2 and add 1 when the string is longer than six characters. This bit distinguishes strings such as `robber` and `robbers`, but not `robbers` and `robbery`, whose difference comes after the first six characters. The encoding uses about 49 bits, within the exact integer range of a double under the example's assumptions.

This preserves ordering only for a prefix in the chosen character domain; longer strings with the same first six characters tie, while Unicode, other locale/collation rules, and values beyond the exact double range need a different design. A string-derived score is also no longer meaningful for adding votes or recency. For lexical ordering of names, same-score ZSET lexicographic ranges are often more direct; for several sort fields, use an explicit tie-break or a suitable database/search engine.

## Ad targeting: from eligibility to expected value

Each ad has a `CPM`, `CPC`, or `CPA` type, bid/base value, eligible locations, and content terms. Location is a required condition: Sets such as `idx:req:country:US` or `idx:req:city:...` are unioned to find eligible ads. Ad terms are optional conditions; per-term ZSETs hold bonus scores. Store ad data, term indexes, base value, and view/click/action statistics separately so indexes can be rebuilt and scores explained.

Keep the book's scope explicit: its example focuses on ad selection and learning scores from interactions, and explicitly leaves budgeting and account requirements out. So an eCPM ranking is not a charge or a budget reservation. A real system needs a separate transaction to check remaining budget, apply frequency caps, and reserve an impression without letting concurrent requests exceed the limit.

Convert every bid type to estimated CPM so they share a unit:

```text
eCPM(CPM) = bid expressed per 1,000 views
eCPM(CPC) = bid_per_click × (clicks / views) × 1,000
eCPM(CPA) = bid_per_action × (actions / views) × 1,000
```

If a CPC bid is $0.25 and CTR is 0.2%, expected CPM is `$0.25 × 0.002 × 1,000 = $0.50`. For a $3 CPA bid and a 10% conversion probability after a click, expected CPM is `$3 × 0.002 × 0.1 × 1,000 = $0.60`. A new ad needs a prior/global baseline; if its observed CTR starts at zero and it is never selected, it never gets a chance to learn (cold start).

When targeting, filter by location first, then add bonuses for matching content terms to base eCPM. The book approximates a multi-term bonus using the midpoint of minimum and maximum bonuses and intersects with location-eligible ads before unioning bonuses to reduce the amount of data examined. This is an easy-to-teach heuristic, not a statistically rigorous estimate; with no matching terms, return the base score rather than introducing an ad from an empty index.

Each impression gets a `target_id` linked to the ad and the terms it matched. When the user clicks or completes an action, the system uses that ID to find the original impression; without that link, a click can be credited to the wrong ad or context. In the book's example, the matched-term Set has a 15-minute TTL; a click/action within that window refreshes the TTL so a later action can still be attributed to the impression. This is a simple attribution window, not a transactional guarantee: retries, duplicate clicks, and late actions need event IDs, deduplication, and an explicit expiry policy. The book stores views and clicks/actions at three levels: system-wide by ad type, per ad, and per ad–term pair. A new ad can therefore use a global rate as a baseline before it has enough of its own data.

The book's learning loop runs periodically: record impressions and clicks/actions; recalculate each ad's eCPM from its bid and observed rate; then calculate the eCPM when the ad appears with each term. The difference between a term-specific eCPM and the ad's baseline eCPM becomes that term's bonus. A later request adds the bonus when it matches the term. The book's code runs the aggregate update after every 100 ad returns, while a click/action can trigger an earlier update; that is an example batching choice, not a universal workload setting. This is a simple correlation-based attribution method: it does not prove the term caused the click, and estimates from small samples are noisy. A production system therefore needs smoothing/priors, confidence thresholds, an attribution window, deduplication, bot filtering, and time-based decay; logs can be processed asynchronously so an ad request does not wait for every metric update. Budgets and frequency caps remain separate transaction invariants that eCPM does not enforce.

## Job matching: invert the question for an index

The naive approach scans every job and compares `required_skills − candidate_skills`; each search does work across the whole job set. Invert the index to `skill:<name> → set of jobs requiring that skill`. Union the candidate's skill sets to count how many required skills each job matches; a second ZSET stores each job's total required skill count. Subtract matched count from required count; a job with zero remaining required skills is a job whose mandatory skills the candidate meets.

This is exact skill-set matching, not a ranking for seniority, proficiency, synonyms, or “must-have” versus “nice-to-have.” Normalize skill names and vocabulary versions, separate mandatory/optional requirements, add location/authorization if needed, and keep those as separate filters/scores. For many jobs/skills, filter by location/group first, bound intermediate results, or use a specialized search index.

## Ad targeting and voting

Targeting selects ads from intersections of user attributes, campaigns, and budgets; campaign eligibility, frequency caps, and budget decrement need consistent updates. Bitmaps/Sets can represent cohorts when ID domain and size are reasonable. Prevent races between concurrent requests from overspending a budget; use a script/transaction and validate side effects.

Voting/ratings can use a Set to ensure one vote per user, a sorted set for ranking, or a hash for state. Define vote changes, abuse protection, time windows, tie-breaking, and score rebuilds. Do not treat a Redis score as an audit ledger when auditability is required.

## News feeds: fan-out on write or read

Fan-out on write pushes a post into follower feeds when created: reads are fast, but write amplification is high and accounts with millions of followers create the celebrity problem. Fan-out on read merges posts at read time: writes are cheaper but latency/compute rise. A hybrid often pushes for ordinary followers and pulls for very large accounts, with cursor pagination, deduplication, ranking, and refresh semantics explicitly designed.

### Users, statuses, and two timeline types

Chapter 8 separates a `user:<id>` Hash from each `status:<id>` Hash. A user record may hold login/name/counters; the `users:` index maps a normalized login to an ID. User creation must protect login uniqueness before allocating an ID. `followers`, `following`, and `posts` counters are derived from the graph/timeline; if stored separately for fast reads, they need reconciliation when a retry or process crash interrupts an update.

A status has a unique ID, author, login snapshot, text, timestamp, and metadata. A profile timeline is a ZSET of status IDs scored by timestamp; a home timeline is another ZSET containing IDs from accounts the user follows. Separating objects from timelines avoids duplicating post data, while timelines remain rebuildable indexes. On read, fetch IDs newest-first and batch-fetch their Hashes; skip IDs whose status was deleted. Bound timeline size to cap memory. Offset pagination such as page 1/page 2 can repeat or skip statuses when a new post is inserted between requests; production systems usually use a `(timestamp, id)` cursor.

### Follow, unfollow, and timeline synchronization

Store `following:<uid>` and `followers:<uid>` so the graph can be traversed in both directions. On follow, add both edges, update counters, and copy a recent window from the followed user's profile into the follower's home timeline; on unfollow, remove both edges and remove that author's statuses from the current timeline. Related updates should be atomic/idempotent or reconcilable; otherwise counters drift from the graph. Bound the number of seeded posts and keep at most N entries in each home timeline.

When a user posts, create the status and add it to the profile ZSET, then syndicate its ID to follower home timelines. For an ordinary account, synchronous fanout or a small batch gives immediate freshness; for an account with many followers, enqueue the remainder in batches. This trades write amplification for freshness: async fanout means some timelines receive the post late or a worker retries it. Use the status ID as a deduplicating member, make retries idempotent, bound batches/backpressure, monitor lag, and provide rebuild/reconciliation. The book's 1,000-follower threshold is an example from its publication era.

Deleting a status requires checking its owner and updating the object, timelines, and counter. In Chapter 8, the code deletes the status Hash and removes its ID from the author’s profile and own home timeline; it does not visit every follower to remove copies already fanned out. Follower home timelines retain orphan IDs, but reads fetch an empty Hash and skip the ID. The book leaves cleanup of these IDs as an exercise. A larger system can clean them in batches or retain a tombstone so readers hide them immediately; account for privacy, idempotent retries, and counters that must not decrement twice. For streaming, publish the deletion event with its required payload before deleting the Hash so filters can identify the status; never expose sensitive fields to subscribers who are not authorized to see them.

### Streaming API and event filtering

A streaming API keeps an HTTP response open and sends each event as a chunk instead of collecting one response. The book publishes post/delete events to Redis Pub/Sub; listeners subscribe, filter by sample/follow/keyword/location, and write chunks to clients. The book’s sampler derives a bucket set from the client ID seed, then checks `status_id % 100`, so the same status is selected for the same client when post or delete events are filtered again. On deletion, the publisher sends the status payload marked deleted; the consumer reruns the same filter to notify the clients who would have qualified, instead of storing every client that received every status. This reproduces the filter decision; it does not guarantee delivery to a client that is offline. Track filters must define AND/OR between terms; follow filters may check authors and mentions; location filters must test a point inside a bounding box and define longitude/latitude ordering.

Pub/Sub only sends to connected subscribers: a disconnect or output-buffer limit can lose events, and it is not a replayable log. Streaming clients need authentication/access control, rate limits, filter-count limits, timeout/heartbeat, unsubscribe on socket close, slow-consumer handling, and output-buffer limits. Pub/Sub connections are normally separate from ordinary command pools. If clients must resume from an event ID, require delivery guarantees, or audit events, write events to Streams/Kafka or an outbox and serve the stream from durable storage. A broadcast failure must not corrupt the status-creation transaction.

## Modern features and boundaries

Redis Search/Query, JSON, vector search, and time series are available in some distributions/offerings; capabilities, licensing, and deployment vary by product. Verify the current docs for the target edition. Hand-built patterns in the book teach data modeling, but as text-search requirements grow, a dedicated search service can be simpler and more accurate.

Sources: *Redis in Action*, chapters 6–8; [Redis data types](https://redis.io/docs/latest/develop/data-types/), [`ZRANGE BYLEX`](https://redis.io/docs/latest/commands/zrange/), [Redis Stack](https://redis.io/docs/latest/operate/oss_and_stack/), and module documentation for the deployed offering.

## Check your understanding

**Does an inverted index store all document text under each token?** It usually stores document IDs/sets and metadata needed for matching/ranking.

**Where does fan-out-on-write cost appear?** Each post updates many feeds; write amplification and celebrity accounts raise the cost.

**Can a hand-built pattern replace a search engine in every case?** No; tokenization, ranking, typo tolerance, and complex updates may call for a dedicated system.
