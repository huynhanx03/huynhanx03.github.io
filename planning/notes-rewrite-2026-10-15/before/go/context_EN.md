---
title: "Context: cancellation, deadlines, and request-scoped data"
category: "Go"
tags: ["golang", "context", "advanced", "fundamentals"]
description: "Context carries cancellation, deadlines, and request-scoped data across function calls. It does not kill goroutines, join workers, or replace ordinary business parameters."
updated: 2026-10-14
translationKey: "go/context"
---

Context carries cancellation, deadlines, and request-scoped data across function calls. It does not kill goroutines, join workers, or replace ordinary business parameters.

## 1. Why propagate one lifetime?

An HTTP request may call services, a database, and external APIs. If the client leaves, downstream work should have a chance to stop. Creating Background halfway through loses the caller’s cancellation/deadline. Context propagates a consistent lifetime contract, but operations still have to observe and support it.

## 2. The four Context methods

```go
type Context interface {
    Deadline() (time.Time, bool)
    Done() <-chan struct{}
    Err() error
    Value(key any) any
}
```

Deadline returns a time and whether one exists. Done closes on cancellation/deadline and may be nil for a non-cancelable context. Err is nil before cancellation and then normally Canceled or DeadlineExceeded. Value finds data by key and returns nil if absent. Context methods support concurrent use, but mutable objects stored as values need their own synchronization.

## 3. Background, TODO, and request contexts

Background is a root without a deadline, values, or cancellation, suitable for startup/main. TODO behaves similarly but indicates an unresolved context decision. In an HTTP handler, derive request work from r.Context() rather than Background to preserve upstream cancellation. Do not pass a nil context.

## 4. WithCancel, WithTimeout, and WithDeadline

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

This fragment needs context, database/sql, and time; adapt the ? placeholder to the database driver. WithTimeout sets a relative limit; WithDeadline an absolute one; WithCancel adds cancellation without a time. A child cannot extend an earlier parent deadline. Canceling a child does not cancel its parent or siblings, while parent cancellation propagates downward. Cancel may be called repeatedly; defer it promptly to release links/timers early.

A deadline does not guarantee the entire function returns at that instant when a driver or code does not cooperate. WithTimeout does not wrap a query in a new goroutine. Cancel does not wait for work to stop; use separate completion coordination when joining is required.

## 5. Observe cancellation in custom work

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

A CPU loop needs appropriate ctx checks, while I/O should use supporting context/deadline APIs. An already-canceled context does not automatically prevent every side effect: either select case can win when both are ready. Context is not a transaction rollback mechanism.

## 6. WithValue and private typed keys

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

Request IDs, tracing, or request principals are appropriate examples. Do not hide dependencies such as a DB client or required function inputs behind any lookups. Keys must be comparable; a private type prevents cross-package collisions. Two requestIDKey{} values in the same package intentionally compare equal. Use distinct types/values for separate keys; an unexported struct does not make every instance unique.

WithValue creates a new context without changing its parent; a child value shadows the same parent key during lookup. Context safety does not make stored mutable objects immutable. Values being in context does not make them suitable for logging, especially secrets.

## 7. Cancellation causes and versioned APIs

```go
ctx, cancel := context.WithCancelCause(parent)
cancel(errors.New("upstream unavailable"))
fmt.Println(ctx.Err())          // context canceled
fmt.Println(context.Cause(ctx)) // upstream unavailable
```

WithCancelCause/Cause were added in Go 1.20: Err keeps standard cancellation classification while Cause carries detail. Go 1.21 adds WithTimeoutCause/WithDeadlineCause, whose CancelFunc does not accept a new error. WithoutCancel (Go 1.21) retains values but removes deadline/cancellation; use it only for intentionally detached work with a new owner and limits, not as a default cancellation workaround.

## 8. Internals: a cancellation tree and a value chain

```text
backgroundCtx / todoCtx → emptyCtx
cancelCtx: parent, done, children, error/cause
  └─ timerCtx: deadline, timer
valueCtx: key, value, parent reference

cancel(parent) → children → their children
Value(key)     → current node → parent → root
```

This is a model, not an API declaration. Current source uses struct{} for emptyCtx; the older integer description is outdated. Cancelable parents track children for cancellation broadcast; cancellation removes links and stops applicable timers. Each WithValue adds a wrapper node searched toward the parent, so lookup cost can grow with depth rather than behaving like a central map lookup.

## 9. Keep the API contract clear

Put ctx first, propagate the request lifetime, and avoid retaining request contexts in long-lived service structs. Avoiding contexts in structs is a design guideline to prevent lifetime ambiguity, not a compiler prohibition; historical APIs such as http.Request have reasons for exceptions. Required inputs remain typed parameters. Accept a fresh context per operation rather than reusing one that is already canceled.

## Worked example

### Scenario: requesting cancellation, then awaiting worker exit

Cancellation is a request to stop; a separate signal reports worker completion. Distinguishing these lets the caller know when it can safely continue cleanup.

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

Cancellation may happen before the worker begins waiting; Done is already closed, so receiving proceeds when the worker runs. No sleep is needed to guess when the worker is ready. <-done is the completion wait, not cancel(). A real worker must check cancellation at suitable points or call context-aware APIs; this example does not imply every blocking function is cancellable.

## Check your understanding

Does canceling a child affect siblings? Why might a query ignoring context run past its deadline? Are two struct{} keys of the same package-defined type different?

## References

- [context package](https://pkg.go.dev/context)
- [Context and structs](https://go.dev/blog/context-and-structs)
- [Context implementation](https://go.dev/src/context/context.go)
