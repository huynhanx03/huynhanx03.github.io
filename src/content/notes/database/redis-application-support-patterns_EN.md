---
title: "Logs, Statistics, IP Lookup, and Configuration with Redis"
category: "Database"
description: "Build application utilities from capped logs and counters to IP lookup, service discovery, and configuration."
updated: 2026-10-17
translationKey: "database/redis-application-support-patterns"
---

Redis can support an application by retaining recent logs, aggregating statistics, mapping IPs to locations, or distributing configuration. These examples teach structure selection by query. They do not automatically provide a durable audit/log system or trustworthy control plane; retention, source data, and failure behavior still need explicit design.

## Recent logs and common log events

A list or Stream can retain a recent log window, trimmed by entry count or time to bound RAM. Separate fields for timestamp, severity, service, and correlation ID make investigation easier. If logs are audit evidence, send the complete record to durable log storage; a Redis ring buffer keeps only recent data and may lose it.

“Common logs” can aggregate identical message types with hash counters or a sorted set. Normalize messages so changing IDs do not create millions of separate keys, but retain important dimensions such as error code. Separate aggregate metrics from raw events to know what requires detail.

## Counters and statistics discovery

An event/key/time-bucket counter can use `INCRBY`; a sorted set can track ranking or recency. When reading many buckets for statistics, use a bounded pipeline or script; do not fetch a huge collection to the client. Choose TTL by analysis window. If exact aggregates must survive restarts or be recomputed across dimensions, an event stream/warehouse is a better fit than one counter.

## IP-to-city lookup

An IP database commonly maps address ranges to integer ranges and binary-searches sorted data. Redis can hold range-to-location mappings or shard by prefix for lookup. IPv4 and IPv6 need a consistent representation; textual lexical order is not automatically numeric order. Data providers differ in license, update cadence, and quality; caching does not fix stale source data.

## Configuration and service discovery

Redis can store versioned runtime configuration with timestamp, owner, and TTL; consumers subscribe to invalidations or poll by revision. Validate important config before publishing and retain a last-known-good fallback. If Redis is unavailable, services need a defined behavior instead of starting with a dangerous default.

One Redis per component can isolate workloads but increases clusters, connections, and operations. A shared server reduces footprint but creates noisy neighbors, a shared eviction/failure domain, and broader access. Choose based on blast radius, security, memory policy, and SLA. A client connection manager needs pool limits, timeouts, reconnect/backoff, and health checks; reconnect storms are load too.

## Define source of truth and retention

Record which data is derived, its TTL, its writer, key/version migration rules, backup needs, and what happens on a miss. Use clear prefixes, bounded cardinality, ACL/TLS protection, and do not make Redis the sole config authority when the control plane needs stronger availability.

This covers *Redis in Action*, chapter 5; current docs: [Streams](https://redis.io/docs/latest/develop/data-types/streams/), [sorted sets](https://redis.io/docs/latest/develop/data-types/sorted-sets/), [key expiration](https://redis.io/docs/latest/commands/expire/), and [security](https://redis.io/docs/latest/operate/oss_and_stack/management/security/).

## Check your understanding

**Does a capped Redis log satisfy audit compliance?** Only if retention, durability, and retrieval meet the requirement; a durable sink is usually needed.

**Should configuration be cached without checking its version?** No; consumers need to distinguish newer, stale, and fallback state.

**Is one shared Redis always cheaper than separate instances?** It reduces instance count but increases contention, blast radius, and shared eviction/failure policies.
