---
title: "Channels: communication, closure, select, and ownership"
category: "Go"
tags: ["golang", "concurrency", "channels", "fundamentals"]
description: "A channel transfers values and establishes synchronization between goroutines. To read channel code, identify senders, receivers, blocking conditions, and who guarantees no further sends before closure."
updated: 2026-10-14
translationKey: "go/channels"
---

A channel transfers values and establishes synchronization between goroutines. To read channel code, identify senders, receivers, blocking conditions, and who guarantees no further sends before closure.

## 1. Create a channel and restrict its direction

```go
ch := make(chan int)
go func() { ch <- 100 }()
fmt.Println(<-ch) // 100

func produce(out chan<- int) { out <- 1 }
func consume(in <-chan int) int { return <-in }
```

chan int permits sending and receiving; chan<- int permits only sending, and <-chan int only receiving. Direction expresses permissions in a signature without creating another channel. A nil channel has no exchange point, so send/receive blocks. Assignment copies a reference to the same channel, not its buffer.

## 2. Unbuffered and buffered channels have different waiting contracts

An unbuffered channel (capacity zero) needs a send and receive to rendezvous. A buffered sender can proceed while capacity remains, and a receiver can proceed when values are queued. Buffering separates producer/consumer timing but cannot fix an indefinitely slow consumer. Larger capacities retain more data; choose by backpressure and acceptable latency, not an assumption of universally higher speed.

```go
ch := make(chan int, 2)
ch <- 10
ch <- 20
fmt.Println(len(ch), cap(ch)) // 2 2
fmt.Println(<-ch) // 10
```

Len is a momentary observation, not a reservation: another goroutine can change the state before the next operation. if len(ch)<cap(ch) does not guarantee a nonblocking send; use select with default for an attempted nonblocking operation.

## 3. Channel states and closing

| State | Send | Receive | Close |
|---|---|---|---|
| nil | Blocks forever | Blocks forever | Panics |
| open | Handoff/buffer write, or blocks | Handoff/buffer read, or blocks | Closes successfully |
| closed | Panics | Drains buffer; then zero value, ok=false | Panics |

```go
ch := make(chan int, 1)
ch <- 7
close(ch)
v, ok := <-ch
fmt.Println(v, ok) // 7 true
v, ok = <-ch
fmt.Println(v, ok) // 0 false
```

Close means “no more sends,” not deleting buffered data or freeing a resource. Range receives until closure and exhaustion. Not every channel needs closure if no receiver needs a completion signal. The owner of the sending lifecycle normally closes; with multiple senders, a coordinator joins them before closing. Do not close from a receiver while senders may still run.

## 4. What does a channel synchronize?

Under the Go memory model, a send synchronizes before completion of its corresponding receive. This can publish data prepared before sending. But a channel copies values: pointers/slices/maps still share underlying objects. A sender mutating that object while a receiver reads can still race. Transfer ownership by convention or protect shared data separately; channels do not enforce ownership themselves.

## 5. select chooses one ready operation

```go
select {
case out <- value:
    return nil
case <-ctx.Done():
    return ctx.Err()
}
```

This fragment belongs to an error-returning function. If several cases are ready, select chooses uniformly pseudo-randomly among them rather than preferring declaration order. Thus a canceled ctx does not guarantee that a simultaneously ready send is rejected. Default runs when no case is ready; without it, G waits. A select with no cases blocks forever.

Channel expressions and send right-hand sides are evaluated once on entry in source order; expensive side effects are not limited to the chosen case. A closed receive is always ready; in a multi-source loop, set an exhausted source to nil to disable its case when appropriate. A default inside for can also cause busy spinning.

## 6. hchan and the ring-buffer runtime model

```text
hchan (schematic, not a public Go type):
  qcount / dataqsiz / buf
  sendx / recvx
  sendq / recvq
  lock / closed / element type information

buffer slots: [0][1][2]...[cap-1]
               ↑ sendx      ↑ recvx (both wrap around)
```

qcount counts queued values, dataqsiz is capacity, and sendx/recvx are indexes rather than pointers. A ring buffer reuses slots without shifting all values. Payload copying still costs time proportional to element size, so constant-time queue bookkeeping does not guarantee constant total operation time for every payload.

Communication paths can find a waiting partner and directly hand off, or use the buffer. When an operation cannot proceed, G registers a sudog on sendq/recvq and parks; a partner makes it runnable again. Locks protect metadata, though not every fast check acquires one. For a full buffer with a waiting sender, receive can take an old queued value and fill the freed slot with the sender’s value, preserving queue order.

## 7. Runtime select and contention

A general select organizes cases (scase), a randomized polling order, and a consistent channel-lock order to avoid internal deadlocks. If waiting is required, it registers relevant queues; a winning case removes the other registrations. The compiler can optimize simple selects, so there is no universal fixed overhead ratio compared with one channel operation.

Many goroutines competing on one channel can create lock contention. Batching reduces sends but increases payload size or waiting time; sharding distributes contention but complicates global ordering; local buffering needs a shutdown flush policy. Direct handoff is a runtime optimization, not an application setting. Measure contention and latency before choosing a technique.

## Worked example

### Scenario: one producer, one consumer, finite completion

The producer generates data; the consumer receives until the channel closes. The producer owns closure because it knows when no further sends will occur.

```go
func sequence(count int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := 1; n <= count; n++ {
            out <- n
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

The channel is unbuffered: the producer waits for each receive, so consumption limits production speed. This is backpressure: slower processing makes the source wait. This consumer drains the channel, allowing normal producer exit. If it breaks early, the producer may remain blocked on the next send; such an API needs cancellation and a select around sending. Adding a buffer alone does not generally solve abandoned consumption.

## Check your understanding

Why does the first receive after close have ok=true? Is a sent pointer safe if the sender keeps mutating it? Decide who closes the channel in a multi-sender worker pool.

## References

- [Go language specification](https://go.dev/ref/spec)
- [The Go memory model](https://go.dev/ref/mem)
- [Channel runtime source](https://go.dev/src/runtime/chan.go)
- [Select runtime source](https://go.dev/src/runtime/select.go)
