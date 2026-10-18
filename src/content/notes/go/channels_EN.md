---
title: "Channels: communication, closure, select, and ownership"
category: "Go"
tags: ["golang", "concurrency", "channels", "fundamentals"]
description: "A channel transfers values and establishes synchronization between goroutines. To read channel code, identify senders, receivers, blocking conditions, and who guarantees no further sends before closure."
updated: 2026-10-15
translationKey: "go/channels"
---

A producer can calculate a value before its consumer is ready. Should the producer wait, queue the value, or give up when the request ends? A channel makes these choices visible in the program's communication protocol.

To reason about a channel, identify who sends, who receives, what makes an operation wait, and who knows there will be no more sends. This lesson assumes [Goroutines](/en/notes/go/goroutines/). Snippets are independent; place statements in `main`, declarations outside it, and import `fmt`, `context`, or `sync` where used.

## Begin with a rendezvous

```go
ch := make(chan int)
go func() { ch <- 100 }()
fmt.Println(<-ch) // 100
```

`make(chan int)` creates an unbuffered channel. The send and receive meet to transfer 100. If the worker reaches its send first, it waits for a receiver. If `main` reaches its receive first, it waits for a sender. Neither operation can complete the exchange alone.

The channel coordinates this exchange; it does not by itself join every later action in the sending goroutine. Put cleanup before a separate completion signal if the caller needs proof that cleanup has finished.

Assignments of channel values refer to the same channel, including the same buffer if one exists. Restricting direction in a function signature narrows the operations available without creating a different channel:

```go
func produce(out chan<- int) { out <- 1 }
func consume(in <-chan int) int { return <-in }
```

`chan int` permits both directions, `chan<- int` permits sends, and `<-chan int` permits receives. Direction documents a function's role and lets the compiler reject an operation in the wrong direction. It does not alone encode the complete ownership protocol, including who may close a send-capable channel.

## Buffering changes when the sender must wait

```go
ch := make(chan int, 2)
ch <- 10
ch <- 20
fmt.Println(len(ch), cap(ch)) // 2 2
fmt.Println(<-ch) // 10
```

Both sends complete without a receiver because there are two buffer slots. A third send would wait until a receive frees a slot. Receiving from an empty open channel waits for a sender. In this single-sender example values are received in send order.

A buffer separates producer and consumer timing up to its capacity. Once full, it applies **backpressure**: the producer must slow down with the consumer. Increasing capacity retains more queued values and can increase waiting time; it cannot fix a consumer that stops permanently. Buffered channels are not universally faster than unbuffered ones.

`len(ch)` observes how many values are queued at one instant, and `cap(ch)` gives the fixed buffer capacity. The observation reserves nothing. Another goroutine may fill a slot before a later send, so `if len(ch) < cap(ch)` does not guarantee a nonblocking send. Use an actual attempted operation:

```go
select {
case ch <- 30:
    fmt.Println("queued")
default:
    fmt.Println("not queued")
}
```

The default branch runs if the send cannot proceed. This is a policy decision to skip or handle work, not an implicit retry. If `ch` is closed, a send case can panic; default does not protect against an invalid close/send protocol.

## Closing announces the end of sends

```go
ch := make(chan int, 1)
ch <- 7
close(ch)
v, ok := <-ch
fmt.Println(v, ok) // 7 true
v, ok = <-ch
fmt.Println(v, ok) // 0 false
```

Closing does not discard 7. The first receive retrieves a previously sent value, so `ok` is true. Once the closed channel is empty, receives return immediately with the element's zero value and `ok=false`. Repeated one-result receives then keep producing zero; use `ok` or `range` when completion matters.

| State | Send | Receive | Close |
| --- | --- | --- | --- |
| nil | Blocks indefinitely | Blocks indefinitely | Panics |
| open | Transfers/queues, or waits | Retrieves a value, or waits | Closes |
| closed | Panics | Drains queued values, then zero and false | Panics |

A nil channel is the zero value of a channel variable. It has no exchange point; in select its send/receive case is disabled. Closing is neither freeing channel memory nor a universal requirement. Channels can become unreachable without being closed. Close when receivers need to learn that no future values will arrive.

### One producer can prove when sending ends

```go
func sequence(count int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := 0; n < count; n++ {
            out <- n + 1
        }
    }()
    return out
}

sum := 0
for value := range sequence(3) {
    sum += value
}
fmt.Println(sum) // 6
```

The producer closes its output because it knows it has finished every send. Range receives until closure and buffer exhaustion. Here the consumer drains the sequence, so producer progress is guaranteed by that consumer behavior; the unbuffered channel makes the producer wait at each handoff.

If the consumer breaks early, the next send can remain blocked. Adding a finite buffer merely delays this possibility. An API that allows early abandonment needs cancellation, including at its send points.

### Several senders need a coordinator

Each sender knows only when its own work ends. None can safely close output while others might send. This fragment demonstrates a finite protocol whose caller must drain all results:

```go
func merge(inputs ...<-chan int) <-chan int {
    out := make(chan int)
    var wg sync.WaitGroup
    wg.Add(len(inputs))
    for _, input := range inputs {
        go func(in <-chan int) {
            defer wg.Done()
            for value := range in {
                out <- value
            }
        }(input)
    }
    go func() {
        wg.Wait()
        close(out)
    }()
    return out
}
```

Assume every input eventually closes and the consumer drains `out`. Workers stop after their inputs end; the coordinator waits for all senders, then closes output exactly once. Values from different inputs can interleave in different orders. An input that never ends or a consumer that abandons output needs a cancellation-aware version at both receive and send waits. Closing from the receiver would leave a race with active senders.

## Communication publishes values, not exclusive ownership

Under the Go memory model, a send synchronizes before completion of its corresponding receive. A receiver can therefore observe data prepared before the send. Closing also synchronizes before a receive that observes closure by returning a zero value. These rules explain why communication can carry completion signals.

However, the transferred value is copied according to its type. A pointer, slice, or map still refers to shared data. Sending `[]byte` does not copy its backing array. If the sender rewrites the bytes while the receiver reads them, that can race despite the channel exchange. Either transfer ownership by convention and stop using the data, send an independent copy, or use separate synchronization for shared mutations.

## Select waits for alternatives; it gives cancellation no priority

A cancellable send belongs inside an error-returning function with `ctx`, `out`, and `value` parameters:

```go
select {
case out <- value:
    return nil
case <-ctx.Done():
    return ctx.Err()
}
```

If only cancellation is ready, the function can stop waiting for a receiver. If both cases are ready, select chooses uniformly pseudo-randomly among ready cases. Source order does not prioritize cancellation, so a canceled context does not guarantee no further send. Cancellation is cooperative; see [Context](/en/notes/go/context/) for the separate requirement to await worker exit.

Without default, select waits until an operation can proceed. With default, it proceeds immediately when none can. A select with no cases blocks forever. Repeating a default-only fallback inside a tight loop can busy-spin rather than park.

Channel expressions and send right-hand sides are evaluated once in source order when entering select, even for cases that are not selected. Avoid putting expensive side effects there under the assumption only the winning case executes them.

A closed receive case is always ready, which needs care in a loop handling several sources:

```go
for left != nil || right != nil {
    select {
    case value, ok := <-left:
        if !ok {
            left = nil
            continue
        }
        fmt.Println(value)
    case value, ok := <-right:
        if !ok {
            right = nil
            continue
        }
        fmt.Println(value)
    }
}
```

This fragment assumes two `<-chan int` variables that eventually close. Setting the local exhausted source to nil disables its case; it does not change the original channel or other aliases. Once both sources are nil the loop ends. Without disabling or exiting, an exhausted channel could produce zeros repeatedly and consume CPU.

## Inside the runtime: queues, parking, and copying

The following model is useful for reading runtime source, not a public layout to depend on:

```text
hchan:
  qcount | dataqsiz | buf
  sendx | recvx
  sendq | recvq
  lock | closed | element type information

ring buffer: [0][1][2] ... [cap-1]
              sendx and recvx wrap around
```

`qcount` counts queued values; `dataqsiz` is capacity. `sendx` and `recvx` are indexes, not pointers. A ring buffer reuses slots instead of shifting all elements after a receive. Queue bookkeeping may be constant-time, but copying an element still costs time according to payload size.

When appropriate, a waiting partner allows direct handoff. Otherwise a send or receive uses the buffer. If the operation cannot progress, the G registers a `sudog` wait record on a queue and parks. A partner can make it runnable again; runnable does not mean it immediately executes.

Runtime locks protect channel metadata, though not every fast check acquires a lock. When a full buffer has a waiting sender, a receive may take the oldest value and put that sender's value into the newly available slot, preserving queue order. Direct handoff is an implementation optimization, not an application switch.

A general select manages `scase` records, randomized polling, and a consistent channel-lock order to avoid internal deadlocks. Waiting registers on the relevant queues; selecting a winner removes the other registrations. The compiler can optimize simple select forms, so there is no fixed universal overhead ratio versus a plain channel operation.

## Choose performance changes by the pressure they relieve

Many goroutines contending on one channel can make its lock hot. Batching reduces send count while increasing payload size or waiting time. Sharding spreads contention but complicates total ordering. Local buffers need a flush rule during shutdown. These techniques change the protocol's latency, memory, or ordering properties; inspect contention and measure the workload before choosing one.

## Predict before reading the answers

1. Why does receiving 7 after `close` still return true? What happens on every later receive once the buffer is empty?
2. Does sending a pointer make continued sender writes safe?
3. Who closes a worker pool's result channel when several workers send? What if the consumer leaves early?

**Answers:**

1. Seven is an actual queued value. Closure ends future sends without discarding it. Later empty receives return zero and false immediately, so loops must inspect completion.
2. No. The pointer is copied, while its object remains shared. Transfer ownership, copy data, or coordinate access.
3. A coordinator that can prove all senders have finished closes it. Early abandonment also needs cancellation and a join; receiver-side closure is unsafe while senders remain active.

## References

- [Go specification: channels](https://go.dev/ref/spec#Channel_types), [select](https://go.dev/ref/spec#Select_statements), and [close](https://go.dev/ref/spec#Close) — language contracts.
- [The Go memory model](https://go.dev/ref/mem#chan) — communication ordering.
- [Channel source](https://go.dev/src/runtime/chan.go) and [select source](https://go.dev/src/runtime/select.go) — implementation models, checked on 2026-10-15.
