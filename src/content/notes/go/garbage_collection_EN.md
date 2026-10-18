---
title: "Garbage collection: reachability, pacing, and performance"
category: "Go"
tags: ["golang", "garbage-collection", "runtime"]
description: "GC reclaims memory that is no longer reachable by the program. Reachability, allocation rate, and live heap explain memory growth, collector CPU use, and why short pauses alone do not guarantee fast requests."
updated: 2026-10-15
translationKey: "go/garbage_collection"
---

A service finishes processing a large packet but retains only its six-byte header. Memory remains high. Is the garbage collector late, or is the program still retaining the packet? Before changing GC settings, trace which objects remain reachable.

Go's standard runtime manages heap memory automatically. It can reclaim objects the program can no longer reach; it cannot infer which cache entries are no longer useful to the business. This lesson builds that distinction into a model for collection cost and latency. It assumes pointers, slices, and basic goroutines. GC algorithms and tuning knobs here describe the standard Go runtime, not requirements imposed on every Go implementation by the language specification.

## Follow the reference that keeps an object alive

```go
func retainedHeader() []byte {
    packet := make([]byte, 8<<20)
    copy(packet, "HEADER")
    return packet[:6]
}

func copiedHeader() []byte {
    packet := make([]byte, 8<<20)
    copy(packet, "HEADER")
    header := make([]byte, 6)
    copy(header, packet[:6])
    return header
}
```

These independent function declarations need no imports. In `retainedHeader`, the returned slice refers into the same 8 MiB array. Its visible length is six, but the backing array remains reachable through it. The collector cannot free that array while the reference must remain usable.

In `copiedHeader`, the result refers to a separate array. Once the function returns, that result no longer keeps the large packet alive. Other references, if any, would still matter. This is an ownership/lifetime decision: copying can be worth the cost for thousands of long-lived headers, while immediate consumption may not justify it.

| Returned value | Visible data | Backing object retained by the result |
| --- | --- | --- |
| `packet[:6]` | Six bytes | The 8 MiB array |
| A copied header | Six bytes | A separate six-byte array |

`packet[:6:6]` restricts capacity but does not detach the array. Nor does copying guarantee an immediate RSS drop or an allocator cost of exactly six bytes. Compiler decisions, allocation granularity, collection, and page release all affect measured memory. [Slices](/en/notes/go/slices/) develops the sharing rules behind this example.

The same reasoning applies to a cache map retaining stale entries or a goroutine waiting forever with references on its stack. “No longer useful” is application knowledge; **unreachable** means no live program reference path can access the object. GC reduces manual heap errors such as double frees and dangling pointers in ordinary Go code, but does not cancel goroutines or replace the owner's file/socket cleanup.

## From roots to the live heap

A tracing collector starts from **roots**: references in goroutine stacks, globals, and relevant runtime storage. It follows pointers transitively to discover live heap objects.

```text
roots → A → B
         ↘ C

unreachable: D → E

white: not yet discovered
grey:  discovered, references need scanning
black: references scanned
```

A, B, and C must remain because roots can reach them. D and E do not become live merely by pointing at each other; no root reaches that cycle. Marking discovers reachable objects. Sweeping makes unmarked storage available for later allocations.

The three-color description is a reasoning model, not a requirement that every object literally stores a color field. A grey object's references still need processing; after they are processed, it is black. A white object at the start is not already proven garbage—it may be discovered later.

The amount retained after tracing is the **live heap**. The **allocation rate** is how much new heap memory the application creates per unit time. Two services retaining the same live heap can have different GC CPU costs if one repeatedly creates and discards far more temporary objects. Lifetime and turnover both matter.

## How marking can overlap application writes

Application code, often called the mutator in GC discussions, continues running during much of collection. It may change a pointer after the collector has scanned the containing object. Without coordination, the collector could miss a newly reachable object.

A write barrier coordinates reference updates with marking so those changes do not break the collector's tracing invariants. This is why “GC runs in the background” does not mean the application pays no ongoing cost. Conversely, not every integer assignment has the same barrier requirement: the work depends on reference updates and collector state.

The standard runtime uses concurrent tracing/mark–sweep. Most work overlaps application execution, but global transitions such as mark preparation and mark termination include stop-the-world intervals. Sweeping can overlap allocation and application work; the entire heap is not simply swept while the application is paused.

The runtime discussed here is non-generational: it does not divide the heap by age and collect only a young generation. Its heap collector is non-moving/non-compacting. Goroutine stacks can still move when resized, so this does not establish universally stable addresses or permission to keep Go pointers arbitrarily in C. Those are separate runtime and cgo rules.

## A collection target trades memory against repeated work

If the live heap stays near 20 MiB, allowing another 20 MiB of allocations between cycles may mean fewer collections than allowing only 5 MiB. `GOGC` controls this growth allowance. Its normal default is 100.

An approximate target model since Go 1.18 includes GC roots:

```text
heap target = live heap + (live heap + GC roots) × GOGC / 100

live heap = 20 MiB, roots = 5 MiB, GOGC = 100
heap target ≈ 20 + (20 + 5) × 1 = 45 MiB
```

The formula is a model before other constraints, not a promise that a measurement will hit exactly 45 MiB. The pacer starts marking before the target so the collector has time to finish. It does not wait until the target is reached and then begin considering GC.

Higher GOGC generally trades more memory for fewer cycles; lower values generally trade more GC CPU for a smaller heap. The useful choice depends on the live set and allocation rate. A large reachable cache will not disappear merely because GOGC is lowered.

### A soft memory limit adds another constraint

`GOMEMLIMIT` and `debug.SetMemoryLimit`, introduced in Go 1.19, set a soft limit on memory managed by the runtime. They are not hard limits on total process RSS and do not account for every allocation made by C or the OS.

If the live data itself approaches the limit, the collector cannot reclaim it. It may collect frequently with little benefit, and runtime memory can still exceed the limit. Leave room for the application's actual live set and memory outside runtime accounting. Treat the setting as a resource policy informed by measurements, not a cure for retention.

## Why short pauses can coexist with slow requests

Background workers perform marking, but allocating goroutines can accumulate **assist debt**. They then help mark so heap growth does not outrun collection progress. Assists are part of pacing, not only an emergency brake when memory is nearly exhausted.

A request that allocates heavily may spend time assisting even if reported stop-the-world pauses are short. GC workers also compete for CPU and memory bandwidth. Request latency therefore depends on assists, CPU availability, contention, and allocation behavior as well as pause duration.

A useful broad phase sequence is: complete required sweeping → prepare marking → concurrent marking → mark termination → subsequent sweeping. Phase coordination matters, but application tuning should begin with measured cost rather than memorizing phase names.

## Reusable heap memory and operating-system memory differ

Sweep makes unused storage reusable by Go. The **scavenger** releases suitable unused pages to the OS, using platform-specific mechanisms such as `madvise`. Memory that is free for reuse inside Go need not immediately cease to be resident.

Distinguish live/allocated heap, memory reserved or managed by the runtime, and RSS—the process's resident physical pages. A falling live heap with steady RSS is not itself a contradiction or evidence that GC failed. The runtime may retain reusable pages, and the OS has its own accounting and reclamation behavior.

## Green Tea changes marking work, not reachability

Green Tea appeared as an experiment in Go 1.25 and became the default in Go 1.26. It improves locality and distribution of marking/scanning work for small objects. Grouping work by spans lets the collector process nearby objects instead of repeatedly jumping between unrelated memory locations. Vector instructions can help on supported platforms.

A runtime page in the relevant implementation is commonly 8 KiB, but a span may contain multiple pages. A span is not universally an 8 KB object. These implementation changes remain within tracing collection; they do not introduce a new generational heap or change whether the header example retains its array.

The Go 1.26 release notes report a 10–40% reduction in **GC overhead** on GC-heavy programs. That is not a promise of a 10–40% improvement in total service time. If GC is a small portion of the total cost, even a substantial collector improvement may have a much smaller end-to-end effect. These are named version milestones, not a claim that 1.26 is the latest release.

## Compare collectors with the same question and workload

| Question | Standard Go runtime discussed here | JVM |
| --- | --- | --- |
| Is the heap generational? | No | Depends on collector and version |
| Are heap objects moved/compacted? | Not by this heap GC | Many collectors relocate or compact |
| What controls policy? | GOGC, memory limit, workload | Collector choice, heap, and latency/throughput goals |
| What latency should be measured? | Whole request, including assists and CPU | Whole request as well as collector pauses |

Do not combine every Java collector into one design. JVM relocation updates managed references; it does not simply invalidate application references. A useful comparison names the collector/version and tests the same workload and resource limits. The table provides questions to investigate, not a universal ranking between languages.

## Pinner and Pool solve different problems

`runtime.Pinner`, added in Go 1.21, supports cgo situations that require Go memory to remain pinned under the cgo pointer rules. Pinning an object does not recursively pin every object it references. The owner must manage the duration and call `Unpin` after C no longer retains those pointers. A non-moving heap collector does not remove cgo pointer-retention restrictions. Pinner is not a fix for retained caches or an ordinary allocation optimization.

`sync.Pool` instead lets code reuse temporary objects. Entries may disappear at any time, so callers must be able to create a replacement. It is not a durable cache or a holder for connections requiring Close. Once an object has been put back, do not keep using it: another caller may obtain it.

Reset relevant state before reuse, and define policies for sensitive or oversized buffers. Reusing one unusually large buffer can retain more memory than the allocation savings justify. Measure allocation rate and CPU before and after introducing a pool; fewer allocations alone does not prove a better service.

## Turn a memory symptom into a measured hypothesis

Start with heap and allocation profiles, allocation rate, live heap, GC CPU, and p95/p99 request latency. The two header functions suggest different hypotheses: the first may retain storage for too long; repeated independent copies may instead create too much turnover. Choose the evidence that distinguishes them.

Look for unnecessary allocations in hot paths, slices retaining large arrays, caches without eviction, and goroutines that do not finish. Preallocate when a useful size is known and consider less pointer-heavy representations when they preserve semantics. Escape analysis explains placement decisions; forcing all values onto stacks is not the goal, and pointers on stacks still need scanning.

```sh
GODEBUG=gctrace=1 ./app
go tool pprof ./app heap.pprof
```

These are diagnostic command examples, not commands run for this lesson. `gctrace` exposes collection cycles; pprof reads an already-collected profile. Do not force `runtime.GC` on every request or add a pool before identifying the cost. Change one factor at a time and compare a representative workload with the same Go version and CPU/memory limits.

## Predict before reading the answers

1. A cache entry is never read again but still exists in a global map. Can GC reclaim its object? Does a cycle of otherwise unreachable objects stay live?
2. A six-byte slice has capacity six after a full slice expression. Has it released its original large array?
3. Why can heap live fall without an immediate RSS drop? Why can p99 rise while STW remains low?

**Answers:**

1. The map keeps the entry reachable, so the object remains live. A cycle with no root path is unreachable and can be collected by tracing; mutual references alone do not keep it live.
2. No. Capacity limits extension, not the backing array's identity. Copying to independent storage removes that retention path.
3. Sweep makes memory reusable; scavenging and OS behavior govern page release and residency. Allocation assists and GC CPU/bandwidth use can affect requests outside STW pauses. Measure those costs separately.

## References

- [Go GC guide](https://go.dev/doc/gc-guide) — tracing, pacing, cost model, and memory accounting; its stated baseline is Go 1.19, so pair it with release notes for later changes.
- [Green Tea GC](https://go.dev/blog/greenteagc) and [Go 1.26 runtime changes](https://go.dev/doc/go1.26#runtime) — versioned locality changes and the scope of performance figures.
- [runtime.Pinner](https://pkg.go.dev/runtime#Pinner), [cgo pointer rules](https://pkg.go.dev/cmd/cgo#hdr-Passing_pointers), and [sync.Pool](https://pkg.go.dev/sync#Pool) — API and ownership contracts.
