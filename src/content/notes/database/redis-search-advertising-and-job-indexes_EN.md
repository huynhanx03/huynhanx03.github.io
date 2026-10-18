---
title: "Redis Search, Advertising, and Job Indexes"
category: "Database"
description: "Build inverted indexes, ranking, ad targeting, and job search; understand update costs and modern module choices."
updated: 2026-10-17
translationKey: "database/redis-search-advertising-and-job-indexes"
---

Search begins with a simple question: “which documents match?” A search system must also normalize text, rank, filter, update, and handle deleted documents. Core Redis can teach inverted indexes with Sets and ranking with Sorted Sets; larger requirements call for Redis Search or a dedicated search engine, which provide semantics that hand-composed structures do not.

## An inverted index with Sets

Suppose document 17 contains `database`, `index`, and `storage`. Store `term:database → {17,...}`, `term:index → {17,...}`. An “database AND index” query intersects sets; OR takes their union. Before indexing, text needs tokenization, lowercasing, Unicode normalization, language-specific stop words, and possibly stemming. Indexing and querying must apply the same steps.

Set intersections can be expensive depending on posting-list sizes; operand order/starting with smaller sets affects intermediate work. Updating a document removes its ID from old terms and adds it to new terms. A crash between operations leaves a temporarily inconsistent index; use a script, versioned rebuild, or source of truth to reconstruct it. Deleting a document also requires removing every posting and empty key.

## Sorting results

After obtaining candidate IDs, filter by permissions, status, and attributes, then rank. A Sorted Set represents unique members with numeric scores and fits precomputed scores. Non-numeric sort such as names needs a mapping/normalized sort key; locale-aware collation does not come automatically from Redis scores. `ZINTERSTORE`/`ZUNIONSTORE` can combine scores but creates intermediate collections and write amplification.

A good query limits candidates early, returns top-K, and bounds payloads. Fetching all results to the application for sorting can use excessive network/RAM. Stable tie-breaking is also needed so pagination does not jump when scores match.

## Ad targeting

An ad server can index campaigns by targeting attributes such as country, topic, or device. A request intersects candidates, removes campaigns over budget/frequency cap, scores bids/relevance, and selects an ad. User interactions update impression/click counts and may adjust a model.

Budget decrement must handle races: two requests can both read that one impression remains and serve both. Use an atomic script/transaction for check-and-reserve, but keep scripts short. Impression/click logging should use uniquely identified events for deduplication and billing; an aggregate counter alone is not enough for audit. Privacy/consent and retention of user data belong in the design.

## Job search by scan or by index

A per-job approach scans jobs and checks attributes—easy to understand, but each query costs linearly with the dataset. An inverted index by skill/location/seniority narrows candidates and ranks them; writes/updates must keep the index synchronized. Salary/date ranges need a suitable sorted structure because Set intersection alone does not efficiently represent ranges.

## When to choose Redis Search

Hand-built indexes fit learning or a small, simple query domain. For phrase/proximity search, stemming, typo tolerance, facets, schema/index management, or complex relevance, evaluate Redis Search/Query if the edition supports it or use a search engine. When adapting the book, verify API, module availability, licensing, and cluster behavior for the current deployment.

These topics draw from *Redis in Action*, chapter 7; see [Sets](https://redis.io/docs/latest/develop/data-types/sets/), [Sorted Sets](https://redis.io/docs/latest/develop/data-types/sorted-sets/), and Redis Search documentation for the appropriate edition.

## Check your understanding

**What does an AND query on an inverted index do?** It intersects the posting lists for normalized tokens.

**Why can a multi-key index update fail partway?** An atomic Redis command does not make a sequence atomic; use a script/transaction or a rebuild strategy.

**Is an impression counter enough for billing?** Not when deduplication/audit is required; use event identity and a durable record.
