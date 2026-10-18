---
title: "Functions: inputs, results, and work left to finish"
category: "Go"
tags: ["golang", "basics", "functions", "closures"]
description: "Understand value passing, multiple results, closures, variadic parameters, recursion, and defer by following data and the lifetime of a function call."
updated: 2026-10-15
translationKey: "go/functions"
---

A function producing the correct number is not enough for callers to use it correctly. They also need to know whether inputs change, which results are valid on failure, and when resources are closed. These belong to the function contract expressed through its signature and body.

This article connects those rules to individual calls. It assumes variables and loops. Examples are independent: declare functions at package scope, put calls in `main` or another appropriate function, and add the imports being used. Comments describe expected results rather than execution reports.

## A call creates separate parameter variables

```go
func add(x, y int) int {
    return x + y
}

func apply(a, b int, operation func(int, int) int) int {
    return operation(a, b)
}
```

`x, y int` groups two parameters of type `int`; the result type follows the parameter list. Calling `add(10, 5)` supplies values to parameter variables `x` and `y`, computes fifteen, and returns that value to the caller. Reassigning `x` inside the function does not reassign the variable used as the caller's argument.

`operation` has a function type taking two integers and returning one. Because `add` has the appropriate signature, `apply(10, 5, add)` calls it and returns fifteen. We pass the function value `add`, without invoking it at the argument position. Keeping and passing functions as data lets the caller select processing without changing coordination inside `apply`.

Go passes **every argument by value**. A pointer copy still points somewhere; a slice copy can describe the same array; a map copy accesses the same map data. A separate parameter variable therefore does not establish independent underlying data:

```go
func doubleFirst(values []int) {
    if len(values) == 0 {
        return
    }
    values[0] *= 2
}

scores := []int{10, 20}
doubleFirst(scores)
fmt.Println(scores) // [20 20]
```

`values` is a separate slice value but still accesses the first element of the array used by `scores`. The empty-input branch avoids indexing a nonexistent element. In contrast, assigning a different slice to `values` only changes the parameter. [Slices](/en/notes/go/slices/) follows element mutation versus returning a new slice after `append`; [pointers](/en/notes/go/pointers/) explains copying addresses.

## Multiple results separate a value from failure

```go
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}
```

Import `errors`. For ordinary finite floating-point inputs, the caller can divide while checking for a zero divisor. This example does not add a policy rejecting `NaN` or infinities; a finite-only domain needs that validation expressed separately.

The results travel together: when the error is non-nil, the first result's zero is not a successful division. Callers must understand the contract before using it:

```go
quotient, err := divide(10, 0)
if err != nil {
    fmt.Println("cannot divide:", err)
    return
}
fmt.Println(quotient)
```

Put this call in `main` and import `fmt`. The error branch prints a message and ends the function, so it does not print `quotient` as a valid result. Placing `error` last is a common convention, rather than a compiler requirement for every function. Go allows multiple results; each API still defines what its results mean on failure.

## Named results are variables too

```go
func split(total int) (first, second int) {
    first = total * 4 / 9
    second = total - first
    return first, second
}
```

`first` and `second` are created on entry, initialized to zero, and then assigned. For `total=17`, integer arithmetic produces `first=7` and `second=10`, preserving a total of seventeen. The example assumes intermediate multiplication `total * 4` does not overflow `int`; integer division discards the fractional part.

Go permits an argument-free `return` with named results. In longer functions, however, `return first, second` shows the result sources and order immediately. A deferred closure can also modify a named result before the caller receives it; we will examine that ordering after introducing `defer`.

## A closure retains a variable across calls

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

`func() int { ... }` creates an anonymous function. When it uses the enclosing function's `next` variable, it forms a **closure**: the function value retains access to that variable. Although `sequence` returns, `next` remains alive long enough for calls to `first` to increase it from zero to one and then two.

The second `sequence()` call creates a different `next`, so `second()` begins at one. Writing `another := first` instead copies the existing function value; `another` and `first` work with the same state variable rather than creating separate counters.

Extend the factory to choose an initial value:

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

This is the same mechanism as `sequence`, with a `start` parameter. A closure retains a variable rather than an immutable snapshot. Two goroutines calling the same `a` can race on `n`; independent state relative to `b` does not make `a` safe for concurrent use. Incrementing also remains subject to the `int` range after enough calls.

The zero value of a function type is nil; calling a nil function value panics. Functions can be compared with nil to check presence, but two function values cannot be compared with `==`. An API accepting a function, such as `apply`, should require a non-nil function or define valid behavior for its absence.

## Variadic parameters expose arguments as a slice

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

A variadic parameter must come last. Inside the function, `nums` is a `[]int`, so ordinary slice iteration applies. With no arguments, the loop runs zero times and the total remains zero. This example assumes addition does not overflow `int`.

Calling `sumAll(1, 2)` supplies the arguments as elements of a slice for the call. With an existing `values` slice, `sumAll(values...)` passes that slice as the variadic argument without requiring its elements to be copied. If the function assigns `nums[0]`, the caller may observe a changed `values[0]`. A `...int` signature does not promise read-only access.

Variadic calls accommodate a changing argument count; they do not provide literally unlimited data. Memory, execution time, and arithmetic limits still apply.

## Recursion reduces a problem and then returns

```go
func factorial(n uint) uint64 {
    if n <= 1 {
        return 1
    }
    return uint64(n) * factorial(n-1)
}
```

This illustration is for `0 ≤ n ≤ 20`; `21!` already exceeds `uint64`. `uint` prevents negative inputs but does not reject overly large values. With `factorial(3)`, the function leaves `3 * ...` pending, calls `factorial(2)`, and then `factorial(1)`. The base case returns one; earlier calls finish `2 * 1` and then `3 * 2`, producing six.

Termination follows from having a base case and making `n` smaller on every remaining call until reaching it. Each call with pending work retains state on the stack. Go does not guarantee tail-call optimization; a loop often expresses bounds more simply and uses less stack for a straightforward linear calculation. A general-purpose API would need input validation or a suitable larger-number representation.

## defer ties cleanup to a function call

After opening a file successfully, every exit from a reading function needs to close it. `defer` lets the closing call sit near resource acquisition:

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

Import `os` and `io`. If `Open` fails, the function returns before registering `Close`. On success, `defer f.Close()` registers a call rather than closing the file at that line. `io.ReadAll` reads data, return expressions are evaluated, and `Close` then runs before the caller receives the results.

This reading example deliberately ignores the `Close` error; it is not a template for every resource. For a writer or buffered layer, `Flush`/`Close` errors may determine whether data was fully written and need handling. Defers run on return and when panic unwinding passes through the function. `os.Exit` terminates the process without running defers, and defers do not guarantee cleanup after forced process termination.

Two further rules concern argument evaluation and execution order:

```go
value := 1
defer fmt.Println(value)
defer func() { fmt.Println(value) }()
value = 2
// At function exit: 2, then 1.
```

The first deferred call evaluates its `value` argument when registered, preserving one. The second passes no argument; its closure body reads the variable when it executes, after it has become two. Deferred calls execute in reverse registration order, LIFO, so the closure prints two before the first call prints one.

A defer inside a loop does not create per-block cleanup. Registrations accumulate until the **function containing the loop** ends. If each file must be closed before opening the next, move one file's processing into a small function with its own defer.

## Returning still has a step before delivery

```go
func adjusted() (result int) {
    defer func() { result++ }()
    return 10
}
```

The expected result is eleven. First, `return 10` assigns ten to result variable `result`. Then the deferred closure increases it to eleven. Only then does the caller receive the result. This explains why named results can help handle cleanup errors, while requiring readers to know which result the deferred code modifies. There is no need to use the pattern where ordinary return expressions already make a function clear.

## Predict before reading

**1.** After `first := sequence(); other := first`, what do successive calls to `first()` and `other()` return?

**2.** If `sumAll` were changed to assign `nums[0] = 99` for nonempty input, could a call using `values...` change `values`?

**3.** In the two-defer example, replace `value = 2` with `value = 7`. What prints, and why are both values not seven?

**Explanations:**

1. One and then two: both function values retain the same state variable. Calling the factory again creates separate state.
2. Yes. A slice passed with `...` can still share its backing array. Preserving input requires avoiding mutation or making a suitable copy.
3. Seven and then one. The closure reads the variable at execution time, while `fmt.Println(value)` already evaluated its argument when registered. LIFO determines which call runs first.

## References

- [Go specification: function types](https://go.dev/ref/spec#Function_types), [calls](https://go.dev/ref/spec#Calls), [function literals](https://go.dev/ref/spec#Function_literals) — signatures, value passing, variadic calls, and closures.
- [Defer statements](https://go.dev/ref/spec#Defer_statements), [Defer, Panic, and Recover](https://go.dev/blog/defer-panic-and-recover) — argument timing, ordering, and named results.
- [Effective Go](https://go.dev/doc/effective_go) — multiple results and function usage.
- [os.Exit](https://pkg.go.dev/os#Exit) — process termination without deferred calls.
