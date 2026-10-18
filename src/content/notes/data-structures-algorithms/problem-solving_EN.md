---
title: "Starting an algorithm problem"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/problem-solving"
series: "DSA Foundations"
seriesOrder: 1
tags: ["algorithm-design", "correctness", "invariant", "go"]
description: "From a precise contract to a one-pass algorithm: examples, representation, invariants, correctness, and edge cases."
draft: false
updated: 2026-10-15
---

In `[7,2,2,5]`, is the second-smallest element 2 or 5? Counting positions in sorted order gives 2; asking for the **second-smallest distinct value** gives 5. Code can be fast and syntactically correct while solving the wrong problem because these interpretations define different contracts.

We will solve the distinct-value version, from reading the problem to maintaining a one-pass state. The goal is to explain why each update is correct rather than memorize code for every extrema problem.

## The contract must cover a missing answer

The input is an integer sequence that may be empty, contain duplicates, or include negative numbers. If at least two distinct values exist, return the second smallest; otherwise, represent absence explicitly.

| Input | Answer | What it checks |
| --- | --- | --- |
| `[]` | absent | No elements yet |
| `[9]` | absent | Only one value |
| `[2,2]` | absent | Repetition does not add a rank |
| `[7,2,2,5]` | `5` | Duplicates are ignored |
| `[-8,-3,-8]` | `-3` | Negative values are valid data |

A Go function can return `(value,found)`. When found is false, do not interpret value as an answer. Using −1 as absence conflicts with the real answer for [−2,−1]. Likewise, math.MaxInt is not a valid “not initialized” sentinel when MaxInt can occur in the data.

Constraints include permission to modify input. `sort.Ints(a)` changes the caller's sequence; copying first avoids that mutation at a memory cost. Several dozen elements permit many choices, whereas millions make copying and sorting worth considering. An explicit absence state handles the boundary when nonempty input is not guaranteed.

## A direct solution provides a reference point

Copy the sequence, sort it, and find the first value different from the first. The example becomes [2,2,5,7]; skip both twos and reach 5. Everything later is no smaller, proving 5 is the answer. If no different value appears, the second rank does not exist.

With the corresponding sorting algorithm, this costs O(n log n) time and O(n) memory to preserve input. It remains useful as a simple reference for small cases even if not optimal. Improvements must preserve the contract, rather than merely agree on one example.

To eliminate sorting, identify the information actually needed after each input value. The two smallest distinct values of a prefix do not require remembering all other values in order. Two values plus flags indicating whether each exists are enough.

```note-visualization
{"id":"scan-maximum","preset":"normal"}
```

The extrema scan illustrates “read one element, update state.” Our problem keeps two distinct extrema, so it also needs duplicate handling and promotion of the old minimum to second place.

## Derive update branches from an invariant

After reading a prefix, maintain: if hasFirst, first is its minimum; if hasSecond, second is its second-smallest distinct value and first<second. Boolean flags describe presence, so initial numeric values cannot be mistaken for data.

For a new x, consider in order:

1. No first value yet, or x<first: if first exists, move it into second place, then set first=x.
2. x==first: it adds no distinct value, so keep the state.
3. x>first: update second only if absent or x<second.

Why may the first case replace the old second value with the old first? The old first was smaller than every other distinct prefix value. After adding an even smaller x, the best two are exactly x and the old first; the old second is no longer needed.

| New value read | first | second | Reason |
| --- | ---: | ---: | --- |
| 7 | 7 | absent | First value |
| 2 | 2 | 7 | Old minimum becomes second |
| 2 | 2 | 7 | No new distinct value |
| 5 | 2 | 5 | Improves the previous second value 7 |

## Make the code express that state

This independent Go declaration needs no imports. It reads the input slice without sorting or changing elements:

```go
func SecondDistinctMin(values []int) (int, bool) {
    var first, second int
    hasFirst, hasSecond := false, false

    for _, x := range values {
        if !hasFirst || x < first {
            if hasFirst {
                second, hasSecond = first, true
            }
            first, hasFirst = x, true
            continue
        }

        if x == first {
            continue
        }

        if !hasSecond || x < second {
            second, hasSecond = x, true
        }
    }

    return second, hasSecond
}
```

The two continue statements finish processing the first and duplicate cases. Consequently, the final second-value branch sees only values greater than first. Saving the old first before assigning first=x is essential; reversing those writes loses the second-place candidate.

Prove correctness by induction on the prefix length. Initially, both flags are false, matching an empty prefix. Assuming the invariant before x, the three cases cover all possibilities and preserve the two best distinct values of the new prefix. At termination, the prefix is the whole sequence, so second is correct whenever hasSecond is true.

Each element takes a constant number of checks: O(n) time and O(1) auxiliary memory. In the model of reading an unsorted sequence, every element must be examined in the worst case because an unseen element could be very small and change the answer. Linear time is therefore optimal in this model; that does not prove one implementation is universally fastest in elapsed time.

## Choose cases according to the reasoning branches

Beyond the opening table, consider a minimum at the end, interleaved duplicates, and MaxInt in the data. Each case targets a branch or an invalid sentinel. Recording state after each step exposes logical errors earlier than adding conditions by intuition. Comparing with the sorting solution on small inputs can also reveal counterexamples.

The same approach transfers: define the contract and boundaries, find a simple solution, choose sufficient state, state an invariant, assess costs against constraints, then implement and compare. Discovering a missing assumption can send you back to an earlier step; this is not a ritual performed only once.

## Extend the problem and assess your argument

**Exercise:** Find the **third-largest distinct value** instead. How do three positions shift when a new maximum arrives? Should a value equal to the current second be discarded?

**Guidance:** Keep three values and presence flags, with strict decreasing order among existing ranks. A new maximum moves the old first to second and old second to third; save values in an order that does not overwrite them prematurely. A value equal to any retained rank adds nothing distinct and is skipped. Explain why all retained ranks remain the best three of the prefix; merely naming three variables is not a correctness proof.

Continue with [complexity](/en/notes/data-structures-algorithms/complexity/) to distinguish upper from tight bounds and worst-case from amortized costs.
