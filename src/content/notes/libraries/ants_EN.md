---
title: "ants: bounding work and understanding goroutine pools"
category: "Libraries"
tags: ["golang", "concurrency", "ants", "pool", "performance"]
description: "Follow submission, idle workers, capacity waiting, and cleanup while separating API behavior from ants v2.11.0 internals."
updated: 2026-10-15
translationKey: "libraries/ants"
---

A program has many independent jobs. A goroutine per job is convenient, but input arriving faster than processing can create too many live jobs, consuming stacks, retaining data, and overloading dependencies.

`ants` provides a goroutine pool to bound and reuse workers. Its first benefit is concurrency control; performance depends on the workload. This article distinguishes pool usage from implementation details in **ants v2.11.0**, without claiming it is the latest version.

## Follow a job through the pool

On `Submit`, the pool looks for an idle worker. With none available and capacity remaining, it can create a worker. At capacity, submission may wait or return an overload error depending on configuration. After executing a task, a worker can return to the idle queue.

A pool does not accelerate the computation itself. If a dependency supports only 20 concurrent queries, a pool can express that bound, but thousands of callers blocked in Submit may still retain substantial memory. Bound admission and waiting callers as well as workers. Read `Nonblocking` and `MaxBlockingTasks` according to the selected version's contract.

```go
func runBatch() error {
    pool, err := ants.NewPool(2)
    if err != nil {
        return err
    }
    defer pool.Release()

    results := make([]int, 4)
    var wg sync.WaitGroup
    var submitErr error
    for index := range results {
        index := index // Capture this iteration's index for older Go language versions too.
        wg.Add(1)
        err := pool.Submit(func() {
            defer wg.Done()
            results[index] = index * index
        })
        if err != nil {
            wg.Done()
            submitErr = err
            break
        }
    }
    wg.Wait()
    if submitErr != nil {
        return submitErr
    }
    fmt.Println(results) // [0 1 4 9]
    return nil
}
```

This illustrative function imports `fmt`, `sync`, and `github.com/panjf2000/ants/v2`. `index := index` gives the closure a distinct variable even when the module still uses older loop semantics; without that line, Go 1.22 and later provide distinct per-iteration variables only when the module or file language version selects the new semantics. Tasks write different indices, and `Wait` precedes reading results. Completion order is unspecified, but fixed result positions give stable output on success.

If Submit fails, the unaccepted task needs the caller to balance `wg.Add(1)` with `Done`. Submission stops, but already accepted tasks are still awaited. `Release` is not a business-result join; WaitGroup provides that here. Tasks that may panic or hang require application-specific error, deadline, and cleanup policies.

## How are idle workers selected?

The checked version normally stores idle workers in a stack: the most recently returned worker is taken first. With PreAlloc, it uses a ring-buffer loop queue. These structures select idle workers, not task-completion order.

LIFO offers an opportunity to reuse a recently active worker; it does not guarantee L1/L2 residency or execution on the same CPU. FIFO queue storage likewise does not guarantee fairness among all Submit callers because lock contention and scheduling still intervene.

References: [worker_stack.go v2.11.0](https://github.com/panjf2000/ants/blob/v2.11.0/worker_stack.go), [worker_loop_queue.go v2.11.0](https://github.com/panjf2000/ants/blob/v2.11.0/worker_loop_queue.go).

## Waiting for capacity differs from acquiring a lock

Taking and returning workers requires protecting pool state. This version uses an atomic-CAS spin lock, calling `runtime.Gosched()` while acquisition fails and increasing yields through bounded exponential backoff. It is a short-critical-section implementation choice, not proof that spinning always beats `sync.Mutex`. Go mutexes also have fast paths and goroutine parking; every Lock is not an OS-thread sleep.

When the pool has no worker capacity, `sync.Cond` lets a goroutine suspend rather than poll continuously. `Wait` releases the lock and waits, then reacquires it before returning. The condition must be rechecked because another goroutine may take a worker first. `Signal` does not guarantee first lock acquisition for the awakened goroutine.

These are different waits: brief competition for a data-structure lock and potentially longer waiting for processing capacity. One spin loop is not a general solution for both.

References: [spinlock v2.11.0](https://github.com/panjf2000/ants/blob/v2.11.0/pkg/sync/spinlock.go), [sync.Cond](https://pkg.go.dev/sync#Cond).

## Small channels and cached time address different costs

`workerChanCap` is computed during package initialization: `GOMAXPROCS(0)==1` selects an unbuffered channel; larger values select capacity 1. It does not continuously adapt to core counts or later GOMAXPROCS changes. An unbuffered channel creates a sender/receiver rendezvous, not a guarantee of immediate receiver scheduling; capacity 1 does not make every send nonblocking.

In this version a ticktock goroutine refreshes cached time every 500 ms. Importantly, it stores `time.Time` in `atomic.Value`, rather than an integer timestamp through `atomic.StoreInt64` as some older descriptions suggest. Reducing hot-path time reads trades against the cache's update granularity.

`time.Now()` is not universally a straightforward system call; platforms can provide fast time paths. Struct size or instruction counts alone do not establish overall performance. See [ants.go v2.11.0](https://github.com/panjf2000/ants/blob/v2.11.0/ants.go) for these concrete implementation choices.

## Expiring workers and reusing objects

A scavenger periodically examines expired idle workers. This version's structures use binary search over the relevant idle-time order. Finding the boundary can be logarithmic, but separating lists, shifting/clearing entries, and terminating workers still cost work proportional to affected elements; an entire cleanup is not necessarily O(log n).

Worker structs are also reused through `sync.Pool`, reducing some allocation churn. That cache may discard objects, so it is not durable storage for long-lived resources. Struct reuse does not make every goroutine or application task allocation-free.

`PoolWithFuncGeneric[T]` defines a worker function receiving T and an `Invoke` accepting T, avoiding user-side assertions from `any`. This improves the type contract. Generics do not guarantee elimination of every boxing/heap allocation or a speedup for every workload; closures, T, and task implementation still matter.

Reference: [PoolWithFuncGeneric v2.11.0](https://github.com/panjf2000/ants/blob/v2.11.0/pool_func_generic.go).

## Choose limits from resources, not an attractive number

Network-waiting tasks and CPU-saturating tasks can need different worker counts. Consider database limits, retained data, waiting callers, and latency requirements. Moving millions of tasks from running goroutines to blocked callers does not solve admission overload.

A task holding a worker while submitting dependent work to the same bounded pool can deadlock: all workers may wait for work that no worker can accept. Design task decomposition and waiting relationships instead of merely increasing size for one run.

**Check your understanding.** Does size 10 guarantee only 10 live requests in the application? No: callers waiting for workers or other stages still exist. Admission control and end-to-end backpressure matter.

**Should every goroutine use a pool?** No. Go already manages lightweight goroutines; a pool adds limits, waiting policies, and coordination overhead. Choose it for explicit concurrency or reuse needs, then measure the workload.

Read [Goroutines](/en/notes/go/goroutines/) and [Channels](/en/notes/go/channels/) before optimizing a pool.
