---
title: "Scaling MySQL: Capacity, Sharding, and Routing"
category: "Database"
description: "Distinguish performance from scalability, choose a scaling path for the workload, and design shard routing that keeps queries close to data."
updated: 2026-10-17
translationKey: "database/mysql-scalability-sharding-and-routing"
---

When a website slows down, “buy another server” sounds simple. But if every request still writes to one MySQL primary, adding replicas only adds read capacity; it does not let the primary accept more writes. To choose the right direction, separate three questions: how long one request takes, how many requests the system can handle per second, and how much throughput grows when resources are added.

## Performance, capacity, and scalability are different

**Performance** is often measured as one request's response time. **Capacity** is the amount of work a system can handle over time while latency and errors remain within an acceptable range. If throughput reaches its maximum while p99 already violates the SLA, that is not production-serving capacity.

**Scalability** describes how capacity changes as resources are added. If doubling servers increases throughput by only 1.5 times, the system scales but not linearly. Two kinds of cost commonly reduce the result: work that must be serialized, and communication/contention that grows among workers. For example, many workers updating one hot counter may contend on a lock; sharding by tenant can reduce that contention if tenants are distributed evenly.

The Universal Scalability Law is a model for reasoning about serialized work and worker “crosstalk.” It does not predict every application precisely: the working set may exceed RAM, a query may change complexity, or fitting the cache may cause a sudden improvement. Use throughput-versus-concurrency/node-count curves to find diminishing returns; treat the model as an explanatory framework, then validate it with real workloads.

Load is also more than request count. The dataset may grow, a few tenants may be much more active, related data may need to be queried together, or the query mix may change as the product adds features. An evenly distributed average on paper does not mean requests are evenly distributed in practice.

## Scale up one node before splitting data

Before sharding, reduce the work: fix queries that read too many rows, add suitable indexes, avoid N+1, batch round trips, reduce payloads, cache data that may be stale, and archive rarely used data. If the workload still fits one node, adding RAM, CPU, or storage can be cheaper and easier to operate than adding many nodes.

Scale-up has limits in price, latency between resources, and utilization. More cores help only when the workload can run in parallel; they do not automatically speed up a serial query section. Read replicas suit read-heavy workloads, but writes still go to the source and reads may be stale. Sharding distributes both data and write work, while moving routing, migration, and consistency concerns into the application.

A practical rule is to delay sharding until there is evidence that one node or the write workload has reached a technical/economic limit. Sharding turns work that used to be one transaction, JOIN, or unique constraint into a multi-node problem. A “future-proof” architecture built too early can make every feature and deployment harder before the system needs its capacity.

## A shard key determines where queries go

A shard is a unit of data placed on a node; multiple shards can live on one server. Functional partitioning separates loosely related product areas; data sharding divides rows by a key. Large systems often use both: for example, separate billing from analytics, then shard billing's user data.

A good shard key answers two questions: where does a new row belong, and where should a query go to find it? The goal is to send important queries to as few shards as possible while keeping data balanced. Choose from the relationship model and common queries, not just the column with many distinct values. If `user_id` drives most queries, placing a user's profile and posts together lets the application read that user with one request.

Comments may be read by `post_id`, however. If comments are sharded only by `user_id`, a post page may need to ask many shards. Options include accepting fan-out for an infrequent query, storing a compact/index copy by post on another shard, or using two data stores with explicit ownership. Duplication adds write, consistency, and repair work; do it only when the query matters enough.

Shards need not be equal in size, but avoid one shard becoming too hot or too large. A large tenant can break the assumption that hashes distribute work evenly. Measure rows, storage, write rate, p95/p99, and query fan-out per shard; system-wide averages can hide hotspots.

## Allocate shards with fixed hashing or a dynamic directory

With **fixed allocation**, a function such as `hash(tenant_id) % N` chooses the shard. This is fast and simple, with no directory lookup. The drawback is that changing `N` can remap many keys; once data is large, resharding may require moving much of it. If using modulo directly, consider creating more logical buckets than servers and mapping buckets to nodes.

With **dynamic allocation**, a directory stores `tenant_id → shard_id`. This can move a tenant or small shard to another node without changing its key. The directory becomes a dependency that needs caching, high availability, and consistency; a stale mapping cache can send writes to a node that no longer owns the data.

A hybrid strategy hashes to a bucket and then uses a directory to map the bucket to a node. It keeps the mapping smaller than a per-row map but still allows bucket movement. Whichever strategy you choose, separate the concept of a **logical shard** from a **physical node** so rebalancing does not force the application to know the topology.

Many applications also need global data such as currencies, feature flags, or city lists. Keep a global node only if its traffic and availability allow it; if the data is small, caching or controlled replication may be better. Do not let every shard request call a directory/global database that becomes the new bottleneck.

## What sharding makes harder

Foreign keys cannot enforce relationships across nodes as one local transaction. A cross-shard JOIN must be split into queries and combined in the application or another analytics system. Global `COUNT`, sorting, pagination, and aggregation may fan out to many shards, collect intermediate results, and merge them. Use read models, summary tables, or a search index if those queries are important and repeated.

Transactions within one shard can still use InnoDB transactions. A transaction across shards needs a coordinator/2PC or an eventual-consistency process such as a saga/outbox; both are more complex. If business operations often update several entities together, keep those entities close through the shard key or revisit the data model.

IDs also need to avoid collisions across nodes. Options include IDs containing shard/time components, range allocators, UUID/ULID, or an ID service. Each has tradeoffs: UUIDs are wide and can scatter B-tree inserts; a central allocator can bottleneck; time-based IDs need clock-skew and rollback handling. Decide uniqueness scope, ordering requirements, index cost, and restart behavior before choosing.

Cross-shard retries need idempotency. After a timeout, the application may not know whether the transaction committed on a shard. Use request IDs/deduplication records and queryable state; do not assume retrying the same request is always harmless.

## Moving a shard needs a cutover procedure

Small shards are easier to move and rebalance than one enormous shard. A safe move identifies the current owner, creates the destination copy, copies a snapshot, catches up changes made during the copy, switches routing at a consistent point, then validates reads/writes before deleting the old copy. The concrete method might use a read-only window, change log, replication, or a migration tool; the invariant is no lost writes and no independent writes accepted by both nodes.

Keep a version or generation in the mapping so stale requests are rejected or redirected after cutover. Prepare rollback routing and abort conditions before starting. Track copy/replication lag, checksums, row counts, latency, and errors; clean up the source only after a validation period. Smaller shards often simplify moves, but too many shards increase metadata, maintenance jobs, and fan-out.

## Load balancing must understand database state

A load balancer may distribute connections, but a long-lived connection can serve many queries; connection count is not workload. Random/round-robin is easy to deploy, least-connections may flood a newly started server with a cold cache, and “fastest response” can be misled by query mix or replica lag. A health check that only tests an open port does not prove the server can accept writes or that its applier is keeping up.

The application often understands queries and sessions better than a generic proxy: route writes to the primary, read-only queries to a suitable replica, keep a session on one replica when cache locality matters, and route read-after-write to the source. GTID waits or version tokens can enforce the needed freshness, with a timeout and fallback. Do not blindly send every `SELECT` to a replica.

When adding a server to the pool, warm its cache and verify replication before increasing traffic. When removing a node, drain connections and active transactions instead of cutting them off. Test the healthy state, a lagging replica, a network partition, and partial pool failure; load balancing can improve availability when it routes well, but can also overload survivors during failover.

## Deeper reading: scalability models, shard allocation, and fan-out

The Universal Scalability Law (USL) models relative throughput as workers/nodes `N` increase: `C(N) = N / (1 + σ(N−1) + κN(N−1))`. `σ` represents work that must be serialized; `κ` represents interaction/crosstalk among workers. When `κ` is near zero, seriality makes the curve approach saturation. With meaningful crosstalk, adding nodes can reduce throughput beyond a point. This is a model fitted to benchmark curves, not a production guarantee; a changed working set, query mix, skew, or storage layer can change the curve. Measure throughput and p95/p99 at several concurrency/node counts, and do not extrapolate far beyond measured conditions.

### Choose partition keys from queries and relationships

Draw the entity relationships alongside important queries to see what data is read or updated together. A schema relationship does not require colocating entities if the application rarely joins them; conversely, a frequent query across relationships suggests those entities should share a shard. A partition key should be available at insert time, stable over the data's lifetime, and present in queries so they can be routed. If the key can change, changing it may be equivalent to moving data between shards.

When two access dimensions both matter, a second organized copy may be needed: for example, primary data by `user_id` and a read projection by `post_id`. Define which copy is authoritative, how updates flow, how stale copies are detected, and how they are rebuilt. Do not duplicate every entity just because one report needs another access path; a summary/read model or bounded fan-out may be better.

Query fan-out costs more as the number of shards queried grows, but latency is not always the sum of every shard's latency: with parallel requests, it is often dominated by the slowest shard plus merge time. Fan-out still consumes total CPU, connections, and I/O, increases tail latency, and lets one slow node delay the whole request. Bound the number of shards, set per-branch timeouts, merge in a defined order, handle partial failure explicitly, and measure shards per request.

### Logical shards, physical nodes, and allocation strategies

Fixed allocation maps a key directly with a hash/range/modulo function. It avoids a lookup, but adding a node often requires moving many keys. Consistent hashing reduces the number of keys that change owners but still needs virtual-node management, skew/hot-shard handling, and rebalancing; it does not make schema changes or cutover safe by itself.

Dynamic allocation uses a directory mapping tenants/buckets to nodes. It can move a small group while keeping keys unchanged, but the directory becomes control-plane data that needs backup, HA, cache invalidation, and mapping-version handling. A hybrid commonly hashes into many logical buckets and maps buckets to physical nodes; this indirection supports gradual rebalancing. Explicit allocation helps pin a large tenant manually, but adds operational steps and risks forgotten special cases.

Placing multiple logical shards on each physical node lets you move pieces instead of an entire machine. A shard can be a database/table, a MySQL instance, or a schema with a shard identifier; each choice affects connection limits, buffer pools, backups, DDL, and blast radius. Too few shards create large migration units; too many add metadata, migration jobs, connections, and fan-out. Choose shard size based on data growth and an acceptable rebalance duration.

Rebalancing is a migration that can fail midway, not just a new hash calculation. A typical procedure reserves a destination, copies a snapshot, streams deltas/change logs, validates, changes the owner generation, fences writes to the old owner, and cleans up after a safety period. Retries and requests in flight during cutover must be handled: generation/fencing tokens let an old node reject writes after ownership changes. Track copy lag and write amplification; pilot with a small shard and prepare abort/rollback paths.

### Global identifiers and cross-shard transactions

Global IDs can come from a central allocator, batched ranges, node/shard bits, or UUID/ULID. A central allocator is simple but depends on network/HA; batches reduce round trips but waste unused values after process failure; IDs with node bits require node identity and bit allocation; time-based IDs need clock-skew and rollback handling. UUIDs reduce coordination but are wide, and random UUIDs weaken B-tree locality. Decide whether uniqueness is global or only within a tenant/shard before choosing.

Cross-shard transactions can use 2PC when all participants and the coordinator support the required semantics, but coordinator failure, lock duration, and recovery complicate operations. A saga splits work into local transactions with compensating actions; compensation is not a physical rollback and may fail independently. An outbox records an event in the same local transaction and then publishes it safely. Choose based on business invariants, tolerance for intermediate states, idempotency, and repair procedures; do not claim “exactly once” merely because a message broker is involved.

## Scaling through consolidation, clustering, and cold-data separation

Consolidation places several services/database instances on fewer machines to use resources better, reduce cost, or make more effective use of flash/RAM. It also increases I/O/CPU contention, noisy-neighbor effects, and blast radius; virtualization overhead depends on the technology and is often more visible with very fast storage. Limit each instance, measure contention, and understand how many workloads one host failure affects.

Clustered SQL systems in the book (NDB Cluster, Clustrix, ScaleBase, GenieDB, Akiban) are examples from its publication era, not a uniform set of current recommendations. They differ in shared-nothing design, SQL compatibility, transaction/isolation behavior, query pushdown, synchronous replication, and JOIN/aggregation limits. When evaluating a current distributed SQL/database product, inspect consistency and transaction semantics, failure domains, repartitioning, query planner, operations tooling, export path, and representative benchmarks; do not infer capabilities from “MySQL compatible.”

Scaling back belongs in the plan too. Archiving or separating rarely accessed data can keep hot caches and indexes smaller, but purge/archive must preserve needed relationships, access, legal retention, and restore paths. Active/inactive tables, partitions, or read models help only when queries do not still scan both areas. Plan the data move before storage or indexes become too large.

## Routing methods and health-check limits

Direct routing from the application understands transactions/sessions and can decide read freshness, but the application must manage topology, pools, retries, and failover. DNS changes are easy but resolver/client caches may keep old IPs; moving a VIP can be faster in some networks but depends on ARP, routing, fencing, and platform behavior. A movable endpoint alone does not guarantee a single writer.

A middleman/proxy provides a stable endpoint and may drain pools, check nodes, pool connections, or split reads and writes. But a proxy does not understand every SQL/session state: open transactions, temporary tables, prepared statements, user variables, and connection affinity can make a midstream switch semantically wrong. Verify what it does when a node fails and a transaction has no response: retrying may execute a write twice.

Round-robin distributes turns, not work; least-connections counts sessions rather than query cost; weighted routing can reflect capacity differences; latency-based routing may favor a warm cache but can be misled by workload. Connection pooling and query-aware routing often need to work together. Health checks should consider role, read-only/write readiness, replication freshness, disk pressure, and ability to perform a small query; avoid probes that are expensive or become a material workload.

When adding a node, use a warm-up state: synchronize schema, verify replication/GTID, let caches warm gradually, and increase traffic in steps. When removing one, stop new connections, drain active transactions, watch pool capacity, and only then detach it. Keep enough reserve capacity that losing one node does not push the survivors past the p99/error cliff. A load balancer cannot add capacity when the entire pool is saturated.

## Choose the next scaling step from evidence

1. Identify which load is reaching the limit: reads, writes, data size, tenant skew, or global queries.
2. Use traces, query digests, host metrics, and latency percentiles to find work that can be removed or reduced.
3. Optimize schema/queries, limit concurrency, cache, or archive when suitable.
4. Add read replicas when the consistency policy allows it; measure lag and the source's binlog-sending cost.
5. Shard only when writes/data exceed one node; choose a key from queries and ownership, and define IDs, cross-shard operations, rebalancing, and recovery before migration.
6. Measure throughput and p95/p99 again after each change, including failure and cold-cache cases.

Sources: *High Performance MySQL*, chapter 11; [MySQL replication](https://dev.mysql.com/doc/refman/8.4/en/replication.html), [partitioning](https://dev.mysql.com/doc/refman/8.4/en/partitioning.html), and [Group Replication](https://dev.mysql.com/doc/refman/8.4/en/group-replication.html). Sharding, cluster, and load-balancer products mentioned in the book may have changed status; evaluate current tools by their features, failure model, and operating cost.

## Check your understanding

**Does adding a read replica increase write capacity?** No; it distributes reads, while writes still originate at the source unless data is partitioned/sharded.

**Does a shard key only need to distribute rows evenly?** No; common queries should route to few shards, and the key must not create hotspots.

**Can you change hash modulo 16 to modulo 32 without moving data?** Usually not; most keys may move unless a logical-bucket/mapping layer helps.

**Does a low connection count mean a node is idle?** Not necessarily; one connection may run an expensive query, and health/lag matter too.
