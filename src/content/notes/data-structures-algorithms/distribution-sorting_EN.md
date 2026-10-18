---
title: "Counting, radix, and bucket sorting: using key structure"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/distribution-sorting"
series: "DSA Foundations"
seriesOrder: 12
tags: ["counting-sort", "radix-sort", "bucket-sort", "key-range"]
description: "Understand the key-range, digit, stability, and distribution assumptions behind sorting beyond comparison bounds."
draft: false
updated: 2026-10-15
---

If every record has a score from zero to a hundred, count 101 groups and emit them by score instead of comparing record pairs. Knowing the key domain permits operations outside the comparison-only model. That is why counting, radix, and bucket sort can be linear **under specific conditions**.

Comparison with O(n log n) must include domain size k, digit count d, and distribution assumptions. An enormous key range or overcrowded bucket can make an apparently fast approach unsuitable.

## Counting sort turns keys into indices

For n integers in [min,max], let k=max−min+1 and count occurrences in `count[x-min]`. Scan inputs to count, then scan keys increasingly and emit each frequency. For `[-2,0,-2,1]`, offset +2 gives indices 0,2,0,3 and counts `[2,0,1,1]`, producing `[-2,-2,0,1]`.

Reading n elements, initializing/scanning k slots, and writing n elements costs O(n+k). Rewriting numbers into input uses O(k) auxiliary count space; a separate result adds O(n). Negative keys work with a correct offset, but k/offset arithmetic must not overflow.

```note-visualization
{"id":"counting-sort","preset":"normal"}
```

Re-emitting keys would lose record payloads. Stable record sorting uses a separate output. For `[2A,1B,2C,0D]`, counts `[1,1,2]` become cumulative ends `[1,2,4]`.

Traverse right to left: decrement count[0] to zero and place D at output[0]; decrement count[2] from four to three and place C there; put B at one, then A at two. `[0D,1B,2A,2C]` preserves A before C. Reverse traversal coupled with decrementing group ends establishes stability. This version needs O(n+k) space including output.

A domain −10^12..10^12 with few items makes k-sized storage impractical. A counting map avoids empty slots, but sorted output still requires ordering its distinct keys; silently substituting a map does not inherit the array's O(n+k) conclusion.

## LSD radix preserves earlier digit ordering

Choose base b and process digits low to high. After one pass the sequence is ordered by its last digit, after two by its last two. This induction needs each higher-digit pass to be **stable**, preserving lower-digit order within equal current digits.

For `[21,12,11]`, stable units sorting gives `[21,11,12]`; stable tens sorting gives `[11,12,21]`. Within tens group one, eleven precedes twelve because of the previous pass. Arbitrarily reversing that group could produce `[12,11,21]`, numerically wrong.

```note-visualization
{"id":"radix-sort","preset":"normal"}
```

Stable counting per digit costs O(n+b); d digits give O(d(n+b)) time and reusable O(n+b) space. Larger b usually reduces passes but enlarges counts. Account for actual key length rather than assuming d constant for unbounded values.

Ordinary selection sort is unstable and therefore unsuitable for an LSD pass under this proof. A different stable variant would need its own proof and cost, rather than inheriting properties from a name.

Negative integers need an order-preserving encoding: absolute values merge −2 with two and reverse relationships among negatives. A fixed-width representation may permit a suitable transform, but state that representation before implementing. Variable-length strings need missing-symbol and lexicographic rules. MSD radix begins high, groups, and recursively processes groups; its organization/space do not automatically match this LSD version.

## Bucket sorting needs ordered buckets and cheap internal sorting

Partition the domain into ordered intervals, distribute values, sort each bucket, and concatenate increasingly. The mapping establishes relationships across buckets; within a bucket another sorting algorithm is still needed.

For values in [0,1), m buckets can use floor(m*x). Accepting x=1 would produce out-of-range index m, requiring a changed contract or boundary policy. Silently clamping arbitrary invalid inputs into the last bucket does not establish correctness.

```note-visualization
{"id":"bucket-sort","preset":"normal"}
```

Under independent roughly uniform input and m proportional to n, expected bucket sizes can make total work O(n), including insertion sort within buckets. This requires a distribution assumption. If all values enter one bucket, insertion sorting it can cost O(n²). Typical storage is O(n+m). Stable results require distribution, internal sorting, and concatenation to preserve equal-key order together.

## Choose by the domain and check the assumptions

**1.** With n=1000 and a billion-value domain, why not immediately choose counting sort? **2.** If an LSD pass on a higher digit destroys lower-digit order within equal-digit groups, is a later stable pass guaranteed to repair it? **3.** What must stable counting preserve for `[2A,1B,2C,0D]`?

**Explanation:** Scanning/initializing/storing a billion slots dominates a thousand records. O(n log n) comparison sorting or appropriately represented/base-chosen radix sorting are more practical candidates. A later pass does not guarantee repairing lower-digit order destroyed inside equal higher digits; the LSD invariant has failed. Counting must preserve A before C and retain payloads; cumulative ends `[1,2,4]` plus reverse placement put them at indices two and three.

No comparison bound is violated: these methods exploit key-domain indices, digits, or distributions beyond pairwise comparisons. A “linear” claim must state the k,d,b conditions under which it is linear in n.
