---
title: "Functions: parameters, results, closures, and defer"
category: "Go"
tags: ["golang", "basics", "functions", "closures"]
description: "A function should have a clear responsibility and contract: inputs, outputs, possible failures, and whether it mutates shared data. This note explains Go’s tools for expressing that contract."
updated: 2026-10-14
translationKey: "go/functions"
---

A function should have a clear responsibility and contract: inputs, outputs, possible failures, and whether it mutates shared data. This note explains Go’s tools for expressing that contract.

## 1. Declaration and arguments

```go
func add(x, y int) int {
    return x + y
}

func apply(a, b int, operation func(int, int) int) int {
    return operation(a, b)
}
```

x, y int is shorthand for two parameters of one type. Go passes all arguments by value, including pointers, slices, and maps. Copies containing references can still share underlying data, so pass-by-value does not imply isolation. `apply(10, 5, add)` returns 15; operation demonstrates that functions are values too.

## 2. Multiple results and errors

```go
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}
```

This fragment requires the errors import. The caller should inspect the error before using the result according to the contract. Returning zero on failure is not a successful division result. Putting error last is a common convention, not a compiler requirement for every function.

## 3. Named results

```go
func split(total int) (first, second int) {
    first = total * 4 / 9
    second = total - first
    return first, second
}
```

Named results are local variables initialized to zero on function entry. A return without arguments is permitted, but in long functions it hides the values being returned. A defer can modify a named result after return expressions are evaluated; use this deliberately and explain it.

## 4. Anonymous functions and closures

```go
func sequence() func() int {
    next := 0
    return func() int {
        next++
        return next
    }
}

first := sequence()
fmt.Println(first(), first()) // 1 2
second := sequence()
fmt.Println(second()) // 1
```

Each call to sequence creates a separate next variable. The closure keeps that variable alive after sequence returns; it captures the variable, not an immutable snapshot of its value. Two goroutines calling the same first can race on next. An uninitialized function value is nil and calling it panics; functions can only be compared with nil.

## 5. Variadic parameters and slices

```go
func sumAll(nums ...int) int {
    total := 0
    for _, n := range nums {
        total += n
    }
    return total
}

values := []int{1, 2, 3}
fmt.Println(sumAll(), sumAll(1, 2), sumAll(values...)) // 0 3 6
```

A variadic parameter must be last and is a slice inside the function. Passing values... passes that slice, so mutating nums elements can affect values. A variadic API does not accept literally unlimited data; memory and execution time still impose limits.

## 6. Recursion needs a stopping condition

```go
func factorial(n uint) uint64 {
    if n <= 1 {
        return 1
    }
    return uint64(n) * factorial(n-1)
}
```

This example is intended for n≤20 because larger factorials overflow uint64. Each call decreases n and keeps pending work on the stack. Recursion needs a base case, progress toward it, and input bounds; Go does not guarantee tail-call optimization. A simple loop may use less stack.

## 7. defer: cleanup tied to the function lifetime

```go
func readFile(name string) ([]byte, error) {
    f, err := os.Open(name)
    if err != nil {
        return nil, err
    }
    defer f.Close()
    return io.ReadAll(f)
}
```

This fragment needs os and io. Defer Close only after a successful Open. Defers execute in LIFO order on return or panic unwinding, but not when os.Exit terminates the process. This read example intentionally ignores Close errors; for writes, Flush/Close failures may affect correctness and need handling.

```go
value := 1
defer fmt.Println(value)
defer func() { fmt.Println(value) }()
value = 2
// At function exit: 2, then 1.
```

Deferred-call arguments are evaluated when the defer is registered, whereas the closure reads the variable when it executes. Defers inside a long loop accumulate until the surrounding function exits; extract one iteration into a function when resources must be closed each time.

## Worked example

### Scenario: a closure retaining private state

A function can create and return another function. Each call to the factory below creates a separate n; the returned function can still access that variable after the factory returns.

```go
func counter(start int) func() int {
    n := start
    return func() int {
        n++
        return n
    }
}

a := counter(10)
b := counter(10)
fmt.Println(a(), a(), b()) // 11 12 11
```

The two calls to a share a's variable; b has a different variable. A closure retains the variable, not an immutable snapshot of its value. Concurrent calls to the same a require synchronization around n. Define the factory at package scope and place the calls in main; fmt is needed for printing.

## Check your understanding

Explain the output of the two defers, then identify what is shared when a slice is passed to a function.

## References

- [Go language specification](https://go.dev/ref/spec)
- [Effective Go](https://go.dev/doc/effective_go)
