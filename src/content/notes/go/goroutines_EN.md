---
title: "Goroutines: concurrency, scheduling, and lifecycle ownership"
category: "Go"
tags: ["golang", "concurrency", "goroutines", "fundamentals"]
description: "A goroutine is an execution stream managed by the Go runtime. The go keyword starts concurrent work, but the more important questions are who waits for it, who requests termination, and when cleanup occurs."
updated: 2026-10-15
translationKey: "go/goroutines"
---

A function can take a long time without needing the caller's attention the whole time. Prefixing a call with `go` starts it concurrently, allowing the caller to continue. That immediately creates a second problem: when the caller returns, who knows whether the work has finished?

This lesson follows that question from a small program to runtime scheduling and production diagnostics. It assumes functions and basic shared-data concepts. Examples are separate snippets; put statements in `main` and import the packages used. Scheduling observations below are possibilities or implementation details, not promised output orders.

## Starting work and waiting for its completion

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

With imports `fmt` and `sync`, this is a complete program body after adding `package main` and imports. `go` starts another **goroutine**, an execution stream managed by the Go runtime. The caller continues without waiting for `hello` to return. Either printed line may appear first; the code establishes completion before `main` returns, not an order between those two prints.

The `WaitGroup` counts unfinished tasks. `Add(1)` records the task before it starts, `Done` removes it when the worker exits, and `Wait` blocks until the count reaches zero. Adding inside the worker would allow `Wait` to observe zero before the worker even registers. Pair each task with exactly one `Done`, and do not copy a `WaitGroup` after first use.

Returning from `main` ends the program without automatically joining other goroutines. `time.Sleep` merely waits for time to pass: a slow machine or blocked dependency can outlast it. A completion mechanism expresses the actual condition you need.

Go 1.25 added `WaitGroup.Go` for starting tracked tasks; the supplied function must not panic. The explicit Add/Done form remains useful for older toolchains. Neither form carries errors, requests cancellation, or protects shared objects from concurrent mutation.

## Overlapping work is not necessarily simultaneous work

Concurrency organizes tasks whose progress overlaps. Parallelism means tasks actually execute simultaneously on multiple execution resources. One logical CPU can support concurrency by switching between tasks, especially while some wait for I/O. CPU work needs available processing capacity to run in parallel.

Distinguish logical CPUs from physical cores: SMT, such as Intel Hyper-Threading, lets multiple hardware threads share a core's execution resources. A logical CPU count therefore does not imply that many independent cores or a proportional speedup. [Intel explains the relationship between cores and logical processors](https://www.intel.com/content/www/us/en/developer/articles/guide/hyper-thread-tuning-guide-for-video-ai-workload.html).

Launching more goroutines does not increase a database's capacity or remove a hot mutex. Once a dependency saturates, extra work may simply accumulate in queues, retaining stacks, buffers, and connections. Bounded worker pools or semaphores put a deliberate limit on active work. The useful limit depends on CPU, dependency capacity, and acceptable queuing delay.

Here is a small case where it is easy to reason about shared writes:

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

Each task receives its own index and number, then writes a distinct element. No task appends to or replaces `output`. `Wait` ensures all writes complete before the caller reads the result. Tasks may finish in any order while the result order stays tied to input indices. The caller must not mutate the input concurrently while `squares` reads it.

This example explains lifecycle and data ownership, not an efficient way to square integers. Tiny multiplications may be cheaper than goroutine overhead, and an enormous input would launch too much work. Assume numbers whose squares fit in `int`; arithmetic overflow is a separate concern.

## A goroutine is not an operating-system thread

| Unit | Memory relationship | Who schedules it? | Resource implications |
| --- | --- | --- | --- |
| Process | Normally isolated from other processes | OS | Own resources; communication often needs IPC |
| OS thread | Shares its process address space | OS | Own stack; switch costs depend on the OS |
| Goroutine | Shares process memory with other goroutines | Go runtime over OS threads | Small adaptable stack; no one-to-one thread mapping |

A private stack does not make heap objects private. Two goroutines can still hold references to the same map or user object and race on it.

The often-quoted 2 KiB stack size is a runtime minimum, not a guarantee that every goroutine always occupies exactly that amount. Initial sizing can adapt, and stacks can grow or shrink. Stack growth may allocate new storage and copy the stack. Ordinary switching saves and restores execution state such as SP and PC; it does not require copying the entire stack on every switch.

There is no fixed nanosecond switching cost or universally safe goroutine count. Hundreds of thousands can be reasonable for some workloads, but stacks, retained objects, socket limits, GC, and CPU constrain the useful count. The OS continues to schedule the threads underneath Go's scheduler.

## How G, M, and P divide the runtime's job

```text
G: goroutine state + stack
             executes on
M: OS thread + P: resources/right to execute ordinary Go code
                 ├─ local runnable queue
                 ├─ runnext
                 └─ allocation/runtime caches

shared global queue ↔ scheduler ↔ network poller
```

A G holds work and execution state. An M is an OS thread executing instructions. A P is a logical scheduling resource needed by an M to execute ordinary Go code. A P is not a core; neither G nor M is pinned to a particular core by this model.

`GOMAXPROCS` controls the number of Ps. It does not cap total goroutines or OS threads: blocked syscalls or cgo can require more Ms than Ps. This is why setting it to 2 does not mean the process owns only two threads.

For source readers, familiar implementations give each P a local queue of 256 entries plus a separate preferred `runnext` slot. The bootstrap thread is called M0, but that does not promise `main` always runs there. Each M has a `g0` used on a system stack for certain runtime work; it is not an ordinary application goroutine created by `go`. These names and sizes belong to runtime implementations.

### Why container CPU configuration matters

Before Go 1.25, the default `GOMAXPROCS` usually followed the logical CPUs available at startup. Go 1.25 introduced Linux cgroup CPU-limit awareness and periodic adjustment as limits change. A Kubernetes CPU request is different from a CPU limit. Manual `GOMAXPROCS` configuration and compatibility settings can disable or change the automatic behavior.

Inspect the application's Go version and configuration before explaining container performance from the host CPU count. `runtime.GOMAXPROCS(0)` reads the current setting without changing it.

## Follow what happens when work stops being runnable

A runnable G can be selected by an M holding a P and begin running. If it must wait for a channel or lock, it can **park**: the G waits while the M/P executes another G. The parked G generally uses no continuous CPU, but its stack and reachable objects still consume memory.

A blocking syscall is different: the OS may block the M itself. Runtime mechanisms release or retake its P so another M can execute Go work. After the syscall returns, the G may reacquire a P or become runnable and wait again. There is no single return path that applies in every situation.

For supported network I/O, the network poller waits for readiness using OS mechanisms such as epoll, kqueue, or IOCP. That lets a waiting G release execution resources. Not every file operation or cgo call uses this path, so “I/O blocks only a goroutine” needs that qualification.

Idle Ps can steal runnable work from other Ps, commonly taking part of a queue to reduce contention. A global runnable queue holds shared work, and fairness checks help avoid starving it. Some scheduler paths check it every 61 scheduling ticks; a scheduling tick is not a millisecond or a bound on waiting time.

Historical global batching used roughly `len(global queue)/P + 1`, further bounded by available Gs, the caller's requested limit, and about half a local queue. A formula such as `min(..., 128)` is only a simplified view. The scheduler also considers timers, network readiness, GC, and thread state; there is no universal local → global → steal → poller search order.

Go 1.14 introduced asynchronous preemption on supported platforms in addition to cooperative safe points. Consequently, modern Go should not be described as a purely cooperative scheduler. Preemption makes execution possible for other work; it does not supply the synchronization your program needs. `runtime.Gosched` likewise yields without establishing a shared-memory protocol.

## Give every goroutine an owner and an exit path

Suppose a worker has produced a value but the caller abandons the result. An unconditional send can wait forever. A cancellable send provides another way out:

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

This function needs `context`. If the send cannot proceed and cancellation occurs, it returns an error. If both cases are ready, either may win; cancellation has no priority merely because of case placement. CPU loops before this send still need cancellation checks, and earlier I/O needs APIs that support context or deadlines.

Cancellation requests termination cooperatively. It does not join the worker. The owner needs a `WaitGroup` or completion channel when it must know cleanup has finished; see [Context](/en/notes/go/context/) for a worked cancel-then-join example. The [Channels](/en/notes/go/channels/) lesson explains how a coordinator closes output only after all senders finish.

### Several different problems are often called a leak

| Retained thing | A possible cause | Ownership decision needed |
| --- | --- | --- |
| Goroutine | Send without receiver, receive without future sender, missing completion | Exit condition and join |
| Context resources | Ignored cancel function | Cancel on appropriate return paths |
| Timer work/storage | Repeated creation or retained timers | Timer lifetime and version semantics |
| External resource | Unclosed body, file, or database rows | The owner calls `Close` |
| Heap object | A small slice retains a large array | Copy retained data or drop aliases |

A mutex is not reentrant: taking the same lock twice can deadlock, as can cyclic lock dependencies or forgetting `Unlock`. I/O without an effective timeout can retain work indefinitely. An unclosed HTTP response body may impair connection reuse and retain resources, but does not imply exactly one leaked goroutine per body. GC does not perform the application's shutdown protocol.

Timer advice must specify the version. Before Go 1.23, unstopped timers and tickers had collection limitations. Under the newer semantics introduced in 1.23, unreferenced timers/tickers can be reclaimed without `Stop`. The module's Go version and compatibility `GODEBUG` settings affect which semantics apply. Repeated `time.After` can still create allocation churn or accidentally restart a timeout on every loop; “every loop leaks until the timer fires” is not universally correct.

### Panic recovery belongs at a deliberate boundary

An unrecovered panic in any goroutine can terminate the process. A deferred recovery must execute on the same goroutine as the panic; a recover in the caller cannot catch a panic in a new worker.

```go
go func() {
    defer func() {
        if value := recover(); value != nil {
            log.Printf("worker panic: %v\n%s", value, debug.Stack())
            // Report failure through the application's result mechanism.
        }
    }()
    doWork()
}()
```

This fragment assumes `doWork` exists and imports `log` and `runtime/debug`. It illustrates where recovery works, not a complete result protocol. If a service deliberately recovers at a boundary, record a stack and surface failure; logging alone must not make a failed task look successful. There is no need to wrap every `go` statement in recovery by default.

## Investigate lifetime before changing scheduler settings

Track `runtime.NumGoroutine` over time alongside active requests. An increase during load may be expected; an increase after load has ended needs more evidence. A goroutine profile shows where workers remain parked, while pprof and execution traces reveal contention, scheduling delays, and CPU use.

`GODEBUG=schedtrace=1000` prints scheduler state roughly every 1,000 milliseconds; `scheddetail=1` adds detail. These are diagnostic settings, not performance fixes. Keep debugging HTTP endpoints off the public Internet.

The race detector finds unsynchronized memory accesses in exercised paths, not every lost update, deadlock, or lifetime bug. Tools such as `go.uber.org/goleak` can help identify leftover goroutines in tests, with allowances for legitimate background work. Interpret tool output against ownership and expected shutdown behavior.

## Predict before reading the answers

1. Can `WaitGroup.Wait` replace a mutex around increments to one shared integer?
2. The caller cancels while a worker is blocked sending. What lets the worker exit, and what tells the caller it has exited?
3. Does a thousand parked goroutines imply a thousand blocked OS threads? Does a rising goroutine count prove a leak?

**Answers:**

1. No. Waiting coordinates completion; it does not stop workers from racing while they run. Protect shared updates or assign independent data as in `squares`.
2. A select on the send and `ctx.Done()` provides an exit path. A completion channel or `WaitGroup` provides the separate join. Earlier blocking operations also need a stop policy.
3. No to both. Parked Gs can share far fewer Ms. The count must be compared with workload, retained resources, stacks, and whether the goroutines disappear after their owner finishes.

## References

- [sync.WaitGroup](https://pkg.go.dev/sync#WaitGroup) — completion and `Go` contracts.
- [Runtime scheduler source](https://go.dev/src/runtime/proc.go) — implementation details, checked on 2026-10-15.
- [Go 1.25 runtime changes](https://go.dev/doc/go1.25#runtime) and [Go 1.14 runtime changes](https://go.dev/doc/go1.14#runtime) — versioned scheduling behavior.
- [Go 1.23 timer changes](https://go.dev/wiki/Go123Timer) — timer collection and compatibility.
- [Diagnostics](https://go.dev/doc/diagnostics) — profiles, traces, and other observation tools.
