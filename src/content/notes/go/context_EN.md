---
title: "Context: cancellation, deadlines, and request-scoped data"
category: "Go"
tags: ["golang", "context", "advanced", "fundamentals"]
description: "Context carries cancellation, deadlines, and request-scoped data across function calls. It does not kill goroutines, join workers, or replace ordinary business parameters."
updated: 2026-10-15
translationKey: "go/context"
---

An HTTP handler starts a database query and calls another service. Halfway through, the client disconnects. Those downstream operations need a way to learn that the request no longer needs their results, even though they are several function calls away from the handler.

`context.Context` carries that lifetime information through the call chain: cancellation, deadlines, and data scoped to the request. Each operation must still cooperate. A context does not kill a goroutine or wait for it to stop.

This lesson assumes functions, [Goroutines](/en/notes/go/goroutines/), and channel receives. Snippets are independent; add imports for the packages used and place declarations outside `main`. Expected results are deductions from API contracts, not timing measurements.

## Pass the caller's lifetime into downstream work

Consider a handler calling `lookup(ctx, id)`, which in turn calls a database. Passing the handler's `r.Context()` through both layers lets a client disconnect or an earlier deadline reach the database operation. Creating `context.Background()` in the middle severs that cancellation path.

`Background` is an empty root context without values, cancellation, or a deadline. It is useful at startup or when establishing a new top-level lifetime. `TODO` behaves similarly but documents that the correct context has not yet been chosen. Neither should silently replace a request context. Never pass nil in place of a context; use an appropriate root when there truly is no caller context.

The shared interface exposes four questions an operation can ask:

```go
type Context interface {
    Deadline() (time.Time, bool)
    Done() <-chan struct{}
    Err() error
    Value(key any) any
}
```

`Deadline` reports a time and whether there is a limit. `Done` returns a channel that closes on cancellation or deadline expiry; it can be nil for a context that cannot be canceled. `Err` is nil until cancellation is observed, then reports `context.Canceled` or `context.DeadlineExceeded`. `Value` retrieves data associated with a key, returning nil when none exists.

The same context can be used concurrently by many goroutines. That protects the context's methods, not arbitrary mutable objects stored inside it. A pointer obtained through `Value` still needs an ordinary ownership or locking rule.

## Derive a shorter lifetime without replacing the caller's

Suppose the request has a ten-second budget, but a database lookup should get at most two seconds:

```go
func query(ctx context.Context, db *sql.DB) (string, error) {
    ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
    defer cancel()
    var name string
    err := db.QueryRowContext(ctx,
        "SELECT name FROM users WHERE id = ?", 1).Scan(&name)
    return name, err
}
```

Import `context`, `database/sql`, and `time`. The database handle comes from the caller; adapt the `?` placeholder to the driver. `WithTimeout` returns a child context and a function for canceling that child. The query uses the child, so either its own timeout or the parent's earlier cancellation can end its budget.

A child cannot extend an earlier parent deadline. If only half a second remains upstream, this function does not gain two fresh seconds. Canceling the child leaves the parent and sibling operations alone; canceling the parent propagates to all its descendants.

`WithDeadline` takes an absolute time instead of a duration. `WithCancel` adds a manual cancellation point without adding a deadline. Their returned cancel functions can be called more than once safely. Defer cancellation promptly after successful creation so early returns release applicable timers and parent-child links rather than leaving them until the deadline or parent cancellation.

A deadline is a signal, not a guarantee that the function returns at the exact deadline. The database driver and underlying operation must support cancellation. `WithTimeout` does not launch a goroutine around the query, force a blocked driver to unwind, or roll back arbitrary side effects.

## Custom work needs explicit cancellation points

A context-aware wait can listen for time and cancellation together:

```go
func wait(ctx context.Context, delay time.Duration) error {
    timer := time.NewTimer(delay)
    defer timer.Stop()
    select {
    case <-timer.C:
        return nil
    case <-ctx.Done():
        return ctx.Err()
    }
}
```

This function needs `context` and `time`. If cancellation arrives while the timer is pending, the second case lets the function stop waiting. If both are ready, either may win. Case order does not prioritize cancellation, and a previously canceled context does not automatically forbid every later side effect.

A CPU loop must check cancellation at suitable intervals; choosing the interval trades checking overhead against response time. A blocking I/O call needs a context-aware or deadline-capable API. Checking `ctx.Err()` immediately before a non-cancellable call does not make that call interruptible once it starts. Context is also not a transaction rollback mechanism: use the operation's own transactional guarantees when they are required.

## Requesting a stop and confirming a stop are separate steps

Suppose the owner needs to release resources only after a worker's cleanup. It needs a completion signal in addition to cancellation:

```go
ctx, cancel := context.WithCancel(context.Background())
done := make(chan struct{})

go func() {
    defer close(done)
    <-ctx.Done()
    // Finish any owned cleanup before returning.
}()

cancel()
<-done
fmt.Println(ctx.Err()) // context canceled
```

The worker owns `done` and closes it after its cleanup and return path. `cancel()` requests a stop; `<-done` joins the worker. Cancellation may happen before the goroutine starts waiting, which is fine: receiving from the already-closed `Done` proceeds when the worker runs. No sleep is needed to guess whether it is ready.

A real worker must arrange the same cooperation around all work it performs. This example does not imply every blocking function can be interrupted. Waiting for completion may itself take time if cleanup is slow or a dependency ignores cancellation.

## Add request metadata without hiding required arguments

A request ID is useful across logging and service layers, while it is not the central business input to each function. A private key type keeps that metadata separate from keys defined by other packages:

```go
type requestIDKey struct{}

func withRequestID(ctx context.Context, id string) context.Context {
    return context.WithValue(ctx, requestIDKey{}, id)
}
func requestID(ctx context.Context) (string, bool) {
    id, ok := ctx.Value(requestIDKey{}).(string)
    return id, ok
}
```

`WithValue` creates a child wrapper; it does not mutate the parent. Looking up the same key in the child finds its nearest value, which shadows a parent value with that key. The accessor keeps the type assertion in one place and lets callers handle absence explicitly.

Keys must be comparable. Two `requestIDKey{}` values in this package intentionally compare equal, so writing with one and reading with another works. An unexported struct does not make every instance a unique key. For different metadata items, use different private types or distinguish their values deliberately; avoid built-in string keys that unrelated packages might also choose.

Request IDs, tracing metadata, and request principals are reasonable uses. Required business inputs and dependencies such as a database client belong in typed parameters or explicit service fields. Hiding them behind `Value` turns missing arguments into runtime surprises. Concurrent context access also does not make a stored mutable object immutable. Do not log secrets just because they are available through a context.

## Preserve the reason for cancellation when useful

Sometimes callers need both a standard cancellation category and the specific reason work stopped:

```go
ctx, cancel := context.WithCancelCause(parent)
cancel(errors.New("upstream unavailable"))
fmt.Println(ctx.Err())          // context canceled
fmt.Println(context.Cause(ctx)) // upstream unavailable
```

The fragment assumes a `parent` context and imports `context`, `errors`, and `fmt`. `WithCancelCause` and `Cause` arrived in Go 1.20. `Err` remains the standard category used by ordinary cancellation handling, while `Cause` provides richer failure information. The example explicitly cancels this child; in a larger tree, the cancellation that establishes the cause matters, so later calls should not be treated as rewriting history.

Go 1.21 added `WithTimeoutCause` and `WithDeadlineCause` for a cause when their time limit expires. Their returned `CancelFunc` does not accept an error argument. `WithoutCancel`, also added in 1.21, retains values while removing the parent's deadline and cancellation. Use it only when work deliberately needs to outlive the parent and has a new owner and bounds. Detaching every inconvenient operation can turn abandoned requests into unbounded background work.

## The implementation explains why cleanup and shallow chains help

```text
backgroundCtx / todoCtx → emptyCtx
cancelCtx: parent | done | children | error/cause
  └─ timerCtx: deadline | timer
valueCtx: parent | key | value

cancel(parent) → children → descendants
Value(key) → this wrapper → parent → root
```

This is a source-reading model, not the public struct layout. The source checked on 2026-10-15 uses an `emptyCtx` based on `struct{}`; historical integer descriptions no longer describe that source.

Cancelable contexts track child relationships so cancellation can propagate downward. Calling cancel releases applicable links and stops timers; this is why ignoring a cancel function can retain resources even after the operation has returned. Value wrappers are searched toward the root rather than kept in one central map. Deep chains can increase lookup work, which is another reason to keep context values purposeful.

## Make lifetime visible in API design

Put `ctx context.Context` first in the parameter list and propagate it to operations belonging to the same request. Accept a context for each operation rather than reusing an already-canceled one. Long-lived service structs should normally hold dependencies, while each method receives its caller's context.

Avoiding contexts in structs is design guidance that prevents lifetime ambiguity, not a compiler restriction. Historical APIs such as `http.Request` have specific reasons for carrying one. When considering an exception, the useful question is whether callers can tell which operation and lifetime the stored context belongs to.

## Predict before reading the answers

1. A parent has 300 ms remaining; a child uses a two-second timeout. Which budget constrains the operation? Does canceling the child stop a sibling?
2. Why can a query ignoring context continue after the deadline? Does `cancel()` prove the worker has finished?
3. Do two `requestIDKey{}` values in the example refer to different keys? What changes if another package defines its own type with that spelling?

**Answers:**

1. The earlier parent deadline constrains it. Child cancellation affects that child and descendants, not its parent or siblings.
2. Cancellation must be observed by the operation; context cannot forcibly unwind arbitrary code. A separate completion signal or WaitGroup is needed to prove exit and cleanup.
3. They compare equal within this package-defined type. Another package's separately defined type is distinct, which prevents that accidental collision.

## References

- [context package](https://pkg.go.dev/context) — methods, derivation, causes, and concurrent-use contracts.
- [Context and structs](https://go.dev/blog/context-and-structs) — API lifetime design and historical exceptions.
- [Context implementation](https://go.dev/src/context/context.go) — implementation model, checked on 2026-10-15.
