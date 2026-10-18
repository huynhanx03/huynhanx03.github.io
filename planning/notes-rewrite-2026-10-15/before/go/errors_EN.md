---
title: "Errors: return values, wrapped causes, and recovery decisions"
category: "Go"
tags: ["golang", "errors", "fundamentals"]
description: "An error describes an operation that failed to meet its contract. Clear code identifies the failed operation, the caller’s options, and whether the original cause remains inspectable."
updated: 2026-10-14
translationKey: "go/errors"
---

An error describes an operation that failed to meet its contract. Clear code identifies the failed operation, the caller’s options, and whether the original cause remains inspectable.

## 1. error is an interface, not control flow

```go
type error interface { Error() string }

func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}
```

The type error line illustrates the predeclared interface; do not redeclare it in your program. Go has no ordinary-error try/catch. Returning an error does not stop the caller; the caller must decide. Conventionally, nil means success and error is last. Do not ignore err and use a result whose validity the contract does not guarantee.

## 2. Four practical failure decisions

**Propagate:** let the layer that understands the business decision handle failure. **Retry:** only for temporary failures and safe/idempotent operations, with bounded attempts/time and backoff. **Terminate:** main may exit when mandatory configuration is missing; libraries should not call os.Exit themselves. **Log and continue:** only with a valid fallback; logging at the final handling layer avoids duplicates.

Retrying a payment after a timeout can duplicate the transaction if the server acted but its response was lost. Retry decisions require operation semantics and external state, not just an error message. os.Exit does not run defers, so cleanup must happen before exiting.

## 3. Sentinels and structured errors

```go
var ErrInvalid = errors.New("invalid input")

type ValidationError struct {
    Field string
    Reason string
}
func (e *ValidationError) Error() string {
    return fmt.Sprintf("%s: %s", e.Field, e.Reason)
}
```

A sentinel is an identifiable error value callers can check. A structured error carries fields, codes, or timestamps: messages are for readers, fields for code. Avoid classifying errors by comparing Error() strings, whose wording can change. Do not return a nil *ValidationError as a successful error result: that interface is non-nil.

## 4. How do wrapping, Is, and As differ?

```go
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

`%w` retains a cause for Unwrap/Is/As. `%v` formats a message without preserving that unwrap link. Is finds a match for a target in an error tree, potentially through an Is method; it is not a general type check. As finds an assignable error and fills the target variable; it is not arbitrary conversion. Since validation is *ValidationError, pass &validation so As can assign it.

Wrapping can make a cause part of an API contract callers depend on. Expose only appropriate causes. Since Go 1.20, errors.Join combines errors and Is/As can search branches, so errors are not always a single linear chain.

## 5. Panic and recover

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

This illustrates the mechanism, not a default wrapper for every function. Panic stops normal execution and runs defers on that goroutine’s stack. Recover works when called directly in a deferred function on the panicking goroutine. A recover in main cannot catch another goroutine’s panic. Recovery does not resume at the next statement after panic; the function containing the defer returns.

Use errors for expected failures such as invalid input, missing files, or timeouts. Panic/recover belongs at controlled boundaries with logging, stack traces, and outcome handling; swallowing a panic and pretending success hides data errors. Some fatal runtime errors cannot be recovered like ordinary panics.

## Worked example

### Scenario: classifying an error after context has been added

A lower layer reports that stock is unavailable; a higher layer adds the order identifier. Callers still need to recognize the cause when deciding what to display or whether to retry.

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

%w preserves the cause relationship; errors.Is follows the wrapping chain and still identifies the sentinel. String matching or err == ErrOutOfStock at the outer layer does not replace this behavior. Being out of stock does not automatically justify retries: retry only when business rules permit it and the state may change. This example assumes non-negative quantities.

## Check your understanding

When would you use Is instead of As? Wrap a structured error through two layers and explain how the caller can still access Field without logging the same failure at all three layers.

## References

- [errors package](https://pkg.go.dev/errors)
- [Working with errors in Go 1.13](https://go.dev/blog/go1.13-errors)
- [Go language specification](https://go.dev/ref/spec)
