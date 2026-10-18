---
title: "Hash tables: from keys to storage and the cost of collisions"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/hash-tables"
series: "DSA Foundations"
seriesOrder: 8
tags: ["hash-table", "collision", "load-factor", "go"]
description: "Hashing, chaining, open addressing, rehashing, and the assumptions behind expected O(1)."
draft: false
updated: 2026-10-15
---

Counting word frequencies with a slice of word–count pairs requires finding the existing word before each increment. With many distinct words, that search repeats expensive work. A hash table maps a key to a storage region to narrow the search, then compares actual keys to confirm a match.

A collision maps different keys to the same region. When the key domain exceeds the slot count, collisions cannot be eliminated. Collision handling establishes correctness; distribution and table occupancy determine speed.

## Equal hashes do not imply equal keys

Keys equal under the table's equality must have the same hash. The converse is unnecessary: 10 and 17 both have remainder 3 modulo 7 but are distinct keys. Treating a matching hash as equality can return the wrong value or overwrite another record.

Do not mutate stored keys in a way that silently changes their hash/equality, or later lookup can search the wrong region. Go's `map[K]V` requires comparable K; slices cannot be direct keys. A struct of comparable fields can form a compound key; normalized strings can encode complex data, but normalization needs a consistent contract.

This Go declaration increments the zero value 0 for a previously unseen word:

```go
func Frequency(words []string) map[string]int {
    count := make(map[string]int)
    for _, word := range words { count[word]++ }
    return count
}
```

For `["go","tree","go"]`, states become go:1, then tree:1, then go:2. Each key owns one count, but Go does not guarantee map iteration order. For deterministic printing, collect and sort keys first.

With O(1) hashing/equality per key, n words take expected O(n) time and O(u) entries for u distinct words. Variable-length strings also require accounting for bytes hashed/compared and key storage: O(n) regardless of word length is not promised. Under suitable hashing assumptions, analyses often include total input length and operation count; collisions and comparisons can add work. Counting words alone hides this condition.

## Chaining keeps multiple keys in one bucket

Separate chaining gives each bucket a list or another structure holding colliding keys. With 7 buckets and `h(x)=x mod 7`, inserting 10,17,24 puts all in bucket 3. Finding 24 scans chain entries and compares actual keys. Removing 17 detaches its entry without changing other buckets' lookup paths.

```note-visualization
{"id":"hash-chaining","preset":"normal"}
```

For m buckets and n keys, load factor `α=n/m`. Under uniform distribution, expected inspected entries depend on α, giving expected `O(1+α)` lookup with constant-time hashing/equality. Bounded α supports constant expectation. All keys in one chain can require O(n); a larger table does not automatically repair a hash function still concentrating everything.

Chaining simplifies deletion and permits more entries than buckets, but links/subobjects add memory, allocations, and indirection. Chains need not be linked lists; detailed costs depend on the chosen structure.

## Open addressing turns collisions into a probe sequence

Open addressing stores entries directly in the array. Linear probing starts at h(key) and checks successive slots cyclically until finding the key or a valid stop. With 7 slots and hash 3, 10 occupies 3, 17 occupies 4, and 24 occupies 5. Consecutive storage helps locality but can create long clusters.

```note-visualization
{"id":"hash-linear-probing","preset":"normal"}
```

Deleting 17 by marking slot 4 “never used” breaks lookup for 24: search starts at 3, stops at empty 4, and misses 5. A tombstone means “deleted, keep probing,” unlike an unused stopping slot. Insertion may reuse tombstones under the correct rules while still checking that the key does not already occur further along.

Quadratic probing and double hashing change probe sequences to reduce some clustering. Table size and step functions must allow reaching needed slots; an arbitrary formula need not visit every slot. Control load before an open-addressed table fills. Numerous tombstones can degrade performance even with few live entries.

## Rehashing is an expensive operation within a longer sequence

When occupancy reaches the policy threshold, create a larger table and place keys according to its new size. Positions depend on bucket count, so copying old slots unchanged is insufficient. A rehash visits O(n) entries in the constant-cost-key model.

```note-visualization
{"id":"hash-rehash","preset":"normal"}
```

Geometric capacity growth makes total moved entries linear in entries added. Together with good hashing and controlled load, insertion has expected amortized O(1) cost. Expected accounts for collisions; amortized spreads rehash costs across a sequence. Poor hashing or collision-inducing input can defeat the expectation; rehashing does not guarantee constant worst-case time for every operation.

Load thresholds depend on collision schemes and design. This article does not make Go map layout an API contract. Hash tables do not keep keys ordered; minimum, successor, and range queries may favor search trees or sorted arrays. For membership-only sets, `map[T]struct{}` expresses that no separate payload is required.

## Check yourself

**1.** Where do 10,17,24 go with chaining versus linear probing in 7 slots? **2.** How must lookup cross deleted 17? **3.** For immutable data with many membership queries, map or sorted slice?

**Explanations:** Chaining places all in bucket 3; linear probing uses 3,4,5 in insertion order. Slot 4 must allow continued probing, via a tombstone or correct relocation procedure, not mean never used. Maps offer expected fast lookup under hashing assumptions but add overhead. A sorted slice needs O(n log n) preparation if unsorted, provides worst-case O(log n) binary search, compact storage, and ordering. Scale, long keys, ordering needs, and memory determine the choice; “many queries” alone has no unique answer.

Language reference: [Go specification: map types](https://go.dev/ref/spec#Map_types). These hash-table analyses are separate from Go runtime-specific commitments.
