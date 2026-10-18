---
title: "Errors: return values, wrapped causes, and recovery decisions"
category: "Go"
tags: ["golang", "errors", "fundamentals"]
description: "An error describes an operation that failed to meet its contract. Clear code identifies the failed operation, the caller’s options, and whether the original cause remains inspectable."
updated: 2026-10-15
translationKey: "go/errors"
---

An order cannot reserve the requested stock. The storage layer knows that stock is insufficient; the order layer knows which order was being processed; the caller knows whether to ask the customer to change the quantity. Good error handling carries enough information between those layers without forcing every layer to make the same decision.

In Go, ordinary failures are returned as values. This article follows a failure from its origin through wrapping and classification, then distinguishes that path from panic and recovery. It assumes functions, interfaces, and `defer`; [Interfaces](/en/notes/go/interfaces/) explains typed nil. Snippets are independent unless stated otherwise. Put function and method declarations at package scope and statements in `main`, importing `errors`, `fmt`, or `log` where used. Comments give expected output, not executed results.

## A returned error asks the caller to decide

The predeclared `error` interface has this shape; do not redeclare it in application code:

```go
type error interface { Error() string }
```

Any suitable type with `Error() string` can describe a failure. A small operation can return an error alongside its result:

```go
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}

value, err := divide(10, 0)
if err != nil {
    fmt.Println("cannot calculate:", err)
    return
}
fmt.Println(value)
```

The expected output is `cannot calculate: division by zero`. `divide` returns normally with two values. It does not throw an ordinary-error exception or stop its caller. The caller checks `err` and returns from its own `main` in this snippet, so it never prints the placeholder result 0 as a valid quotient.

By convention, `error` is the last result and nil means success. The other results are usable on failure only to the extent the function's contract promises; some APIs return useful partial data, while this function does not. Go has no ordinary-error `try/catch` that removes the need to make that decision.

## Give failure an identity when callers need to recognize it

A **sentinel** is a particular error value that represents a recognizable condition:

```go
var ErrOutOfStock = errors.New("out of stock")

func reserve(available, requested int) error {
    if requested > available {
        return ErrOutOfStock
    }
    return nil
}

err := reserve(2, 3)
if err != nil {
    err = fmt.Errorf("order A17: %w", err)
}
fmt.Println(err) // order A17: out of stock
fmt.Println(errors.Is(err, ErrOutOfStock)) // true
```

This example assumes non-negative quantities and only checks availability; it does not mutate an inventory or implement an atomic reservation. Requesting 3 when 2 are available returns the sentinel. The next layer adds the order ID using `%w`, creating an error that preserves its underlying cause.

The outer error is a new value, so `err == ErrOutOfStock` is false after wrapping. Its message also contains more text. `errors.Is` follows the preserved error relationship and recognizes the sentinel. Comparing `Error()` strings would instead make business logic depend on wording, punctuation, and added context.

Another condition can have its own sentinel, such as `var ErrInvalid = errors.New("invalid input")`. The choice should reflect distinctions callers actually need. A human-readable message alone may suffice for a failure that no caller needs to classify.

## Add structured data when a category is not enough

A validation failure needs to identify which input should be corrected:

```go
type ValidationError struct {
    Field string
    Reason string
}
func (e *ValidationError) Error() string {
    return fmt.Sprintf("%s: %s", e.Field, e.Reason)
}

err := fmt.Errorf("load account: %w", ErrInvalid)
fmt.Println(errors.Is(err, ErrInvalid)) // true

err = fmt.Errorf("create user: %w", &ValidationError{
    Field: "email", Reason: "missing",
})
var validation *ValidationError
if errors.As(err, &validation) {
    fmt.Println(validation.Field) // email
}
```

This snippet reuses `ErrInvalid` above. `ValidationError` provides a readable message through `Error`, while its fields give code information it can use without parsing that message. Other structured errors may carry codes or timestamps when the application needs them.

`errors.Is` asks whether an error matches a target condition. It can follow wrappers and consult a custom `Is(error) bool` method; it is not a general type check. `errors.As` finds an error assignable to the requested target type and stores it in the target variable. Here `validation` has type `*ValidationError`, so `&validation` gives `As` a place to write that pointer. It does not convert arbitrary errors into `ValidationError`.

For successful operations, return `nil` explicitly. A nil `*ValidationError` converted to `error` still contributes its dynamic type, making the interface non-nil. It is not a valid way to communicate success; calling the illustrated `Error` method on that nil pointer would also dereference nil.

## Preserve a cause deliberately

`fmt.Errorf("create user: %w", err)` preserves a link for unwrapping and inspection. Using `%v` produces text without that unwrap link. This difference is part of the API: if callers can discover a storage-specific sentinel through wrapping, they may begin to depend on it. Expose causes that are appropriate for callers to know, or translate them into an error contract owned by the current layer.

Several layers can each add useful context while leaving handling to the boundary:

```go
err := error(&ValidationError{Field: "email", Reason: "missing"})
err = fmt.Errorf("create user: %w", err)
err = fmt.Errorf("submit signup: %w", err)

var validation *ValidationError
if errors.As(err, &validation) {
    fmt.Println("please correct", validation.Field) // please correct email
}
```

`As` walks through the two wrappers to the validation error. Each layer contributes the operation it understands; none has to log merely because it returns an error. The final handler can log the full context once and present an appropriate response.

`errors.Is`, `errors.As`, and `%w` wrapping were introduced in Go 1.13. Since Go 1.20, `errors.Join` can combine failures into an error with multiple children. Inspection therefore works on error trees as well as linear wrapping chains. `Is` and `As` inspect branches; do not assume that repeatedly calling the single-error `errors.Unwrap` traverses every joined error. The [errors package documentation](https://pkg.go.dev/errors) describes these traversal rules.

## Choose a response from the operation's meaning

The same error value can lead to different decisions at different boundaries:

| Decision | When it fits | What the caller must establish |
| --- | --- | --- |
| Propagate | Another layer knows what failure means to the user or business operation | Add useful context and preserve the appropriate cause |
| Retry | The condition may be temporary and repeating the operation is safe | Bound attempts or total time, use backoff, and respect cancellation |
| Terminate | The program cannot proceed, for example without mandatory configuration | Let the program boundary decide and finish necessary cleanup |
| Log and continue | A valid fallback or partial outcome is acceptable | Make that outcome explicit and avoid duplicate logs |

A timeout during payment does not establish that payment failed to occur. The server may have acted before its response was lost. Retrying blindly could charge twice. Safe retries depend on operation semantics, idempotency mechanisms, and known external state, rather than matching a word such as “timeout” in the error message.

Likewise, “out of stock” does not automatically justify a retry. State may not change within a useful period, and business rules may require a different quantity. A library should normally return the failure instead of calling `os.Exit`, because the program owns the termination decision. `os.Exit` does not run deferred functions; perform required cleanup before exiting. Logging is most useful at the layer that finally handles the failure, where the outcome is known.

## Panic unwinds execution; recover belongs at a boundary

A panic follows a different control path from returning an error:

```go
func boundary() {
    defer func() {
        if value := recover(); value != nil {
            log.Printf("panic: %v", value)
        }
    }()
    panic("unexpected state")
}
```

Import `log` for this function. Calling `boundary` causes a panic, begins unwinding that goroutine's call stack, and runs deferred functions along the way. The directly deferred function calls `recover`, obtains the panic value, and logs it. The logging prefix can vary. Once recovery finishes, `boundary` returns; execution does not resume at the statement following `panic`.

Recovery only works when `recover` is called directly by a deferred function on the panicking goroutine. A recover in `main` cannot catch another goroutine's panic, and moving the actual `recover()` call into an ordinary helper called by the defer does not meet that direct-call requirement.

This snippet demonstrates the mechanism, not a default wrapper for every function. Expected failures such as invalid input, missing files, and timeouts normally belong in returned errors. A controlled recovery boundary needs a plan for logging, stack traces, and the failed operation's outcome; swallowing the panic and reporting success hides the failure. Recovery also does not roll back state changes made before the panic. Some fatal runtime errors cannot be recovered like ordinary panics.

## Trace the failure to a decision

**1.** The reservation error has been wrapped with `order A17`. Which check should identify stock shortage, and why does direct equality fail?

**2.** A handler needs the invalid field name from an error wrapped twice. Should it use `Is` or `As`, and where should it log the failure?

**3.** A goroutine sends a payment request and gets a timeout. Is retrying justified by that fact alone?

**Answers:**

1. Use `errors.Is(err, ErrOutOfStock)`. The outer wrapper is a different error value, but retains the sentinel as a cause.
2. Use `As` with `var validation *ValidationError` and `&validation`, then read `validation.Field` if the match succeeds. Log at the layer that handles the outcome, typically once with the accumulated context; intermediate layers can return contextual errors.
3. No. Establish whether the first request could already have taken effect and whether repeating it is safe. Use a suitable idempotency or reconciliation design as required, plus bounded time and attempts if retrying is allowed.

## References

- [errors package](https://pkg.go.dev/errors) — matching, extraction, joining, and traversal.
- [Working with errors in Go 1.13](https://go.dev/blog/go1.13-errors) — wrapping and API decisions.
- [Go specification: handling panics](https://go.dev/ref/spec#Handling_panics) — panic and recover semantics.
- [os.Exit](https://pkg.go.dev/os#Exit) — termination without running defers.
