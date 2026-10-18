---
title: "Goroutines: concurrency, scheduling, and lifecycle ownership"
category: "Go"
tags: ["golang", "concurrency", "goroutines", "fundamentals"]
description: "A goroutine is an execution stream managed by the Go runtime. The go keyword starts concurrent work, but the more important questions are who waits for it, who requests termination, and when cleanup occurs."
updated: 2026-10-14
translationKey: "go/goroutines"
---

A goroutine is an execution stream managed by the Go runtime. The go keyword starts concurrent work, but the more important questions are who waits for it, who requests termination, and when cleanup occurs.

## 1. Starting does not mean completing

```go
func hello(name string) { fmt.Println("Hello,", name) }

func main() {
    var wg sync.WaitGroup
    wg.Add(1)
    go func() {
        defer wg.Done()
        hello("An")
    }()
    fmt.Println("main continues")
    wg.Wait()
}
```

This example needs fmt and sync. go returns control to the caller without waiting for hello; the output order is unspecified. Returning from main ends the process without automatically waiting for other goroutines. Time.Sleep waits for a duration, not task completion; WaitGroup expresses completion waiting.

Call Add before starting, call Done once per task, and do not copy a WaitGroup after use. It does not carry errors, cancel tasks, or protect shared data. Go 1.25 adds WaitGroup.Go for task creation/waiting, whose function must not panic; the Add/Done form remains useful for older releases.

## 2. Concurrency and parallelism

Concurrency structures work whose progress overlaps; parallelism executes work simultaneously on multiple execution resources. A single core can still run concurrent tasks by switching between them. More goroutines do not automatically help CPU, lock, or database bottlenecks. Unbounded concurrency can increase queues, memory usage, and contention.

## 3. Processes, threads, and goroutines

| Unit | Address space | Scheduler | Stack and cost |
|---|---|---|---|
| Process | Normally isolated from other processes | OS | Own resources; communication often uses IPC |
| OS thread | Shared within its process | OS | Own stack; size/switch cost depends on the OS |
| Goroutine | Shared within its process | Go runtime over OS threads | Small growable/shrinkable stack; not one thread per goroutine |

The 2 KiB figure commonly appears as a runtime minimum stack; actual initial stack sizing can adapt. Growing a stack can allocate and copy storage. Switching goroutines saves/restores state such as SP and PC without requiring a whole-stack copy. There is no fixed nanosecond switch cost, and the OS still schedules underlying threads.

Separate stacks do not prevent races on shared heap objects. Hundreds of thousands of goroutines can be feasible for suitable workloads, but there is no promised universal count: stacks, buffers, sockets, GC, and CPU impose limits.

## 4. The G–M–P model

```text
G (work + stack + state)
        runs on
M (OS thread) + P (right/resources to execute ordinary Go code)
                     ├─ local runnable queue
                     ├─ runnext slot
                     └─ allocation / runtime caches

shared global runnable queue ↔ scheduler ↔ network poller
```

G holds execution state; M executes instructions on an OS thread; P is a logical scheduling resource, not a CPU core. M needs P for ordinary Go code. There may be more Ms than Ps because of syscalls/cgo. GOMAXPROCS controls Ps, not total goroutines or threads, and does not pin them to particular cores.

A familiar runtime implementation uses 256 local queue slots and a separate runnext slot. M0 is the startup thread used for bootstrap; this does not guarantee main always runs on M0. Each M has g0 for certain runtime work on its system stack, not an application goroutine launched with go. These details can change across releases.

Before Go 1.25 the default GOMAXPROCS usually followed startup logical CPU availability. Go 1.25 adds Linux cgroup CPU-limit awareness and periodic updates; CPU requests are not CPU limits. Explicit GOMAXPROCS or compatibility settings can change that behavior. Check the application version/configuration before reasoning about container CPU usage.

## 5. Scheduler execution paths

**Runnable → running:** a task enters a run queue and is selected by an M with a P. **Channel/lock waits:** G parks while M/P can run other work. **Blocking syscalls:** the OS may block M; the runtime can release/retake P for another M. On return, G can reacquire a P or become runnable; it does not always follow one fixed path.

**Work stealing:** an idle P looks for runnable work from other Ps, often taking a portion of a queue. **Global queue:** holds shared runnable work, with fairness checks to avoid starving it. Some code paths check every 61 scheduling ticks; a tick is not a millisecond or a latency guarantee.

Older runtime batching used roughly len(GRQ)/P + 1, further bounded by available work, the caller’s limit, and around half a local queue. The old notes’ min(...,128) formula was a simplified model. Findrunnable also considers timers, GC, networking, and thread state; there is no universal local → global → steal → poller order.

**Network poller:** supported network I/O parks G awaiting readiness through mechanisms such as epoll/kqueue/IOCP, while M can do other work. Not every file I/O or cgo call takes this route. **Preemption:** Go 1.14 introduced asynchronous preemption on supported platforms alongside cooperative safe points; modern Go is not purely cooperative.

## 6. Five kinds of resources that can outlive their work

| Category | Scenario | Response |
|---|---|---|
| Goroutines | Sender without receiver; receiver without future sender; missing Done | Define completion and cancellation |
| Contexts | CancelFunc is ignored | Cancel on appropriate completion paths |
| Timers | Repeated allocation, retained references, or ongoing unwanted work | Understand timer version and lifetime |
| Resources | Unclosed body/file/rows | Close at the ownership boundary |
| Memory retention | A small slice retains a large array | Copy needed data and drop old aliases |

Mutexes are not reentrant: acquiring the same lock twice, cyclic waits, or missing Unlock can deadlock. I/O without a timeout can retain G indefinitely, but network waiting need not occupy M. An unclosed HTTP body can impair connection reuse and retain resources; one body does not necessarily equal one leaked goroutine. A parked G usually does not continuously consume CPU, but still retains its stack and reachable data.

Before Go 1.23, unstopped timers/tickers had collection limitations. With newer Go 1.23 semantics, GC can reclaim unreferenced timers/tickers even before Stop. Repeated time.After still creates allocation churn and can unintentionally reset an overall timeout. Do not claim every time.After loop leaks until firing on every release. go.mod and compatibility GODEBUG settings affect timer semantics.

## 7. Every goroutine needs an owner and an exit path

```go
func forward(ctx context.Context, out chan<- int, value int) error {
    select {
    case out <- value:
        return nil
    case <-ctx.Done():
        return ctx.Err()
    }
}
```

Cancellation is cooperative: code must observe ctx or call APIs that support it. Cancel does not wait for G to stop; join using a WaitGroup/completion channel. Bounded worker pools or semaphores limit active work. A cancellable send does not fix a CPU loop or I/O before it; each waiting point needs an appropriate exit policy.

An unrecovered goroutine panic can terminate the process. Recovery must happen in a deferred function on that same goroutine; do not wrap every go statement by default. A recovery boundary should record a stack trace and report a clear failure, not pretend the task succeeded because the process survived.

```go
go func() {
    defer func() {
        if value := recover(); value != nil {
            log.Printf("worker panic: %v\n%s", value, debug.Stack())
        }
    }()
    doWork()
}()
```

## 8. Observe before optimizing

Track runtime.NumGoroutine over time relative to active requests. Goroutine profiles reveal waiting stacks; pprof/trace help locate contention and scheduling delay. GODEBUG=schedtrace=1000 reports scheduler state roughly every 1,000 ms; scheddetail=1 adds detail. runtime.Gosched yields but does not synchronize; GOMAXPROCS(0) reads the current setting.

The race detector finds unsynchronized memory accesses, not every logical race or deadlock. Tools such as go.uber.org/goleak can identify leftover goroutines in tests, with appropriate treatment of legitimate background workers. Keep debug HTTP endpoints off the public Internet.

## Worked example

### Scenario: splitting work and waiting for completion

With a known job list, each element can be assigned to a goroutine and completion awaited with a WaitGroup. This small example demonstrates lifecycle management, not a worker pool for millions of elements.

```go
func squares(input []int) []int {
    output := make([]int, len(input))
    var wg sync.WaitGroup
    for i, value := range input {
        wg.Add(1)
        go func(index, n int) {
            defer wg.Done()
            output[index] = n * n
        }(i, value)
    }
    wg.Wait()
    return output
}

fmt.Println(squares([]int{3, 1, 2})) // [9 1 4]
```

Each goroutine writes a distinct index; the slice is not appended to or structurally changed while workers run. Wait ensures the caller reads results only after writes finish. Completion order is unspecified, but output order follows input indices and is therefore stable. Add happens before launching each goroutine. For large inputs, bound worker count and account for overhead: tiny multiplications can cost less than concurrency itself. The caller must also avoid mutating input while the function reads it.

## Check your understanding

How does a sending worker exit when its caller no longer needs a result? Distinguish a parked goroutine from a blocked OS thread, and explain why increasing NumGoroutine alone does not prove a leak.

## References

- [sync.WaitGroup](https://pkg.go.dev/sync#WaitGroup)
- [Runtime scheduler source](https://go.dev/src/runtime/proc.go)
- [Go 1.25 runtime changes](https://go.dev/doc/go1.25)
- [Go 1.23 timer changes](https://go.dev/wiki/Go123Timer)
- [Diagnostics](https://go.dev/doc/diagnostics)
