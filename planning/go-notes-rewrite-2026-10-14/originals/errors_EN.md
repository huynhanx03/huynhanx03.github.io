---
title: "The Error Guardian"
category: "Go"
tags: ["golang", "errors", "fundamentals"]
---

# Error Handling: The Silent Guardian

In most modern programming languages, when an operation fails, the system "throws" an exception, interrupting the execution flow. Go takes a different path: **An error is just a value.**

## 1. The Philosophy: "Error as Value"

Go intentionally lacks a `try-catch` mechanism. Why? Because Go encourages developers to treat errors as part of the normal execution flow, handling them exactly where they arise rather than letting them propagate silently to higher layers.

> **Gopher Mindset:** If a function can fail, it **must** return an error as its final result.

```go
func Divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("cannot divide by zero")
    }
    return a / b, nil
}
```

## 2. Error Handling Strategies

Professional Go developers typically follow these four strategies:

1.  **Propagation**: Return the error to the caller for decision-making.
2.  **Retry**: For transient failures (like network glitches), re-attempt the operation with a backoff strategy.
3.  **Termination**: For critical, unrecoverable failures (e.g., missing essential config), log and exit (`os.Exit(1)`).
4.  **Log and Proceed**: For non-critical errors, log the event for audit and continue execution.

```go
result, err := Divide(10, 0)
if err != nil {
    // Strategy: Wrap and Propagate
    return fmt.Errorf("calculation failed: %w", err)
}
```

## 3. Custom Errors and Type Safety

In Go, an `error` is a simple built-in **Interface**:

```go
type error interface {
    Error() string
}
```

This simple contract allows you to create custom **Structs** that satisfy the interface, enabling you to attach rich metadata such as error codes, timestamps, or **Traceability** IDs.

```go
type APIError struct {
    StatusCode int
    Message    string
}

func (e *APIError) Error() string {
    return fmt.Sprintf("API [%d]: %s", e.StatusCode, e.Message)
}
```

## 4. `errors.Is`, `errors.As`, and Wrapping

To maintain the **original identity** of an error while adding context, Go uses **Error Wrapping**:

-   **`%w` verb**: Used in `fmt.Errorf` to wrap an error.
-   **`errors.Is`**: Checks if an error (or any error in its chain) matches a specific target (replaces equality checks).
-   **`errors.As`**: Attempts to cast an error into a specific type to access its custom fields.

```go
// Wrapping with %w
if err != nil {
    return fmt.Errorf("database query failed: %w", err)
}

// Checking original identity
if errors.Is(err, sql.ErrNoRows) {
    // Handle specifically...
}
```

## 5. Panic and Recover: Last Resort

`panic` represents a terminal state where the program cannot safely continue (e.g., out-of-bounds access). 

> [!CAUTION]
> Never use `panic` for standard error conditions. Use the `error` type. `panic` is reserved for unrecoverable logic failures.

`recover` can intercept a `panic` within a `deferred` function to "revive" the application, though this should be used sparingly (e.g., in a web server's top-level middleware) to prevent masking serious bugs.

---

> **Professional Gopher Advice:** Never ignore errors using the blank identifier `_, _ = DoSomething()`. This practice leads to **indeterministic** systems and is the primary cause of hard-to-trace bugs.
