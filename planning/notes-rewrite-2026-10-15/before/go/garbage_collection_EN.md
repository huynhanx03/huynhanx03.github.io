---
title: "Garbage collection: reachability, pacing, and performance"
category: "Go"
tags: ["golang", "garbage-collection", "runtime"]
description: "GC reclaims memory that is no longer reachable by the program. Reachability, allocation rate, and live heap explain memory growth, collector CPU use, and why short pauses alone do not guarantee fast requests."
updated: 2026-10-14
translationKey: "go/garbage_collection"
---

GC reclaims memory that is no longer reachable by the program. Reachability, allocation rate, and live heap explain memory growth, collector CPU use, and why short pauses alone do not guarantee fast requests.

## 1. “No longer useful” differs from “unreachable”

A cache entry that is no longer useful remains live while a map retains it. A permanently waiting goroutine can retain stack references too. GC does not understand cache policy, cancel goroutines, or replace the owner’s file/socket cleanup. It reduces manual heap-management errors such as double frees and dangling pointers in ordinary Go, not every retention or resource leak.

The broad lifecycle is allocation → identify reachable objects → reclaim unreachable objects → reuse free storage. Live heap is memory retained after tracing. Allocation rate measures newly created memory over time. Services with equal live heaps can have very different collector CPU costs because their allocation rates differ.

## 2. Mark–sweep, roots, and three colors

```text
roots → A → B
         ↘ C
unreachable: D → E

white: not yet found/scanned
 grey: found, references still need scanning
black: references scanned
```

Roots include references from goroutine stacks, globals, and relevant runtime storage. Mark follows pointers to reachable objects. Sweep reclaims unmarked objects, making space reusable by later allocations. The three colors are a tracing model, not necessarily literal color values stored in every object.

Mutators (application code) continue during marking, so pointers can change while scanning proceeds. Write barriers coordinate reference updates to prevent the collector from missing objects becoming reachable. Not every numeric assignment requires the same barrier; cost depends on reference updates and collector state.

## 3. Concurrent does not mean pause-free

Go uses concurrent tracing/mark–sweep with stop-the-world intervals around transitions such as mark setup/termination. Sweeping can overlap application work and allocation. The entire heap is not simply scanned while the application is stopped; most work is concurrent, with global coordination where necessary.

The current runtime is non-generational rather than partitioning the heap by age for young-generation-only collection. Its heap collector is non-moving/non-compacting, unlike some other collectors; goroutine stacks can still move during resizing. This does not imply universally stable pointer addresses or unrestricted retention of Go pointers by C.

## 4. GOGC, pacing, and memory limits

GOGC controls additional heap growth relative to live memory, normally defaulting to 100. An approximate model since Go 1.18 is heap target = live heap + (live heap + GC roots) × GOGC/100. For 20 MiB live heap, 5 MiB roots, and GOGC=100, the target is about 45 MiB before other constraints. The pacer begins marking before the target so work can finish in time, rather than waiting until that target is reached.

Higher GOGC generally trades memory for fewer collections; lower values trade CPU for a smaller heap. GOMEMLIMIT/debug.SetMemoryLimit (Go 1.19+) sets a soft limit on runtime-managed memory, not a hard limit on total RSS or every C/OS allocation. Excess live data can still exceed it or cause frequent GC; one setting cannot solve that alone.

## 5. GC assist and the background scavenger

Background workers mark, while allocating goroutines can accumulate assist debt. They help mark to balance heap growth and collector progress; this is not merely an emergency response to imminent exhaustion. Assists can increase request latency even when STW metrics are small. Phase coordination proceeds through required sweep completion, mark preparation, concurrent mark, mark termination, and subsequent sweeping.

Sweep makes memory reusable within Go. The scavenger releases suitable unused pages to the OS using platform-specific mechanisms such as madvise. A smaller live heap therefore does not guarantee an immediate RSS drop. Distinguish allocated heap, runtime/reserved memory, and resident memory before blaming the collector.

## 6. Green Tea by version

Green Tea was experimental in Go 1.25 and became the default in Go 1.26. It improves locality and CPU scalability when marking/scanning small objects. Span-oriented work groups nearby objects instead of scattering accesses; vector instructions depend on the platform. It remains a tracing collector, not a new generational design.

A runtime page is commonly 8 KiB in the relevant implementation, but a span can contain multiple pages: “every span is 8 KB” is incorrect. Release notes describe a potential **GC-overhead** reduction of 10–40% for GC-intensive workloads, not a promise that every service becomes 10–40% faster. Measure before applying that result to an application.

## 7. Comparing Go with the JVM requires naming the collector

| Aspect | Go runtime discussed here | JVM |
|---|---|---|
| Heap organization | Non-generational | Depends on collector/version |
| Moving heap objects | No heap-GC compaction/relocation | Many collectors relocate/compact |
| Controls | GOGC, memory limits, workload | Collector, heap, and latency/throughput goals |
| Latency evaluation | STW plus assists and CPU/contention | Also evaluate complete request latency |

Do not treat every Java collector as one architecture. The JVM maintains managed references during relocation; application references do not simply become invalid. The comparison frames workload questions, not a universal latency ranking between languages.

## 8. Pinner and sync.Pool serve different purposes

Runtime.Pinner, added in Go 1.21, supports cgo scenarios that retain pinned Go memory under pointer/cgo rules. Pinning is not recursively applied to referenced objects; manage its duration and Unpin after C stops retaining the pointer. Non-moving GC does not remove cgo pointer-retention rules. Pinner is not a fix for retention or an ordinary allocation optimization.

Sync.Pool can reuse temporary objects and reduce allocation, but entries may disappear at any time. It is not a persistent cache or a holder for connections needing Close. Do not access an object after Put; reset it before reuse and define policies for sensitive or oversized buffers. Measure allocation/CPU before and after using a pool.

## 9. An evidence-based optimization process

Start with heap/alloc profiles, allocation rate, live heap, GC CPU, and p95/p99 request latency. Look for allocation hot paths, retained arrays, unbounded caches, and unfinished goroutines. Remove unnecessary allocations, preallocate sensibly, and consider less pointer-heavy data when semantics permit. Escape analysis explains behavior; forcing everything onto stacks is not the goal, and stack references still require scanning.

```sh
GODEBUG=gctrace=1 ./app
go tool pprof ./app heap.pprof
```

Gctrace exposes collection cycles; pprof reads a profile you have collected. Do not force runtime.GC on every request or introduce pools before finding the bottleneck. Change one factor at a time and compare representative workloads under the same Go version and CPU/memory limits.

## Worked example

### Scenario: retaining an entire buffer through a small slice

GC tracks object reachability. A short slice can keep a large array alive while it still refers into that array.

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

| Returned result | Visible data | Backing memory still referenced |
| --- | --- | --- |
| packet[:6] | 6 bytes | An 8 MiB array |
| Copy into header | 6 bytes | A separate 6-byte array |

In the second version, the result no longer keeps packet alive after return. This does not promise immediate RSS reduction or an actual allocation cost of exactly 6 bytes: the allocator, compiler, and GC timing affect measurements. A full slice expression packet[:6:6] also does not release the large array. Copying may be worthwhile when retaining thousands of headers long-term; for immediate use, weigh copying costs and measure the actual lifecycle.

## Check your understanding

Why can an unused cache entry remain live? Is a lower heap without an immediate RSS drop contradictory? Distinguish GC assists, STW pauses, and scavenging.

## References

- [Go GC guide](https://go.dev/doc/gc-guide)
- [Green Tea GC](https://go.dev/blog/greenteagc)
- [Go 1.26 GC changes](https://go.dev/doc/go1.26#runtime)
- [runtime.Pinner](https://pkg.go.dev/runtime#Pinner)
- [sync.Pool](https://pkg.go.dev/sync#Pool)
