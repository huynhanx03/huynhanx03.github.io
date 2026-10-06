---
title: "Functional Mastery"
category: "Go"
tags: ["golang", "basics", "functions", "closures"]
---

# Functions: The Heart of Program Logic

In Go, Functions are treated as **First-class Citizens**. This means you can treat a function like any other variable: pass it as an argument, return it from another function, or assign it to a variable.

## 1. Basic Function Declaration

Go's syntax prioritizes readability: `func` keyword + `identifier` + `parameters` + `return types`.

```go
func add(x int, y int) int {
    return x + y
}

// Factor out common types in parameters:
func addShorter(x, y int) int {
    return x + y
}
```

## 2. Recursion

Go fully supports recursive functions, allowing a function to call itself to solve complex, self-similar problems.

```go
func factorial(n int) int {
    if n == 0 {
        return 1
    }
    return n * factorial(n-1)
}
```

## 3. Multiple Return Values

This is a signature Go feature, widely used to return a result alongside an **error** object.

```go
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}

// Idiomatic usage:
result, err := divide(10, 2)
```

## 4. Named Return Values

Go allows you to name the return variables in the function signature. They are treated as local variables initialized to their zero values.

```go
func split(sum int) (x, y int) {
    x = sum * 4 / 9
    y = sum - x
    return // This is a "Naked return"
}
```
> **Best Practice:** Use naked returns only in short, simple functions to maintain clarity.

## 5. Function Values and Closures

Functions are data. You can pass them as arguments to achieve **Higher-Order Function** behavior. A function that "captures" variables from its enclosing scope is a **Closure**.

```go
func intSeq() func() int {
    i := 0
    return func() int {
        i++
        return i
    }
}

func main() {
    nextId := intSeq()
    fmt.Println(nextId()) // 1
    fmt.Println(nextId()) // 2
    
    newNextId := intSeq()
    fmt.Println(newNextId()) // 1 (Distinct state/scope)
}
```

## 6. Variadic Functions

A function can accept a variable number of arguments using the `...` prefix.

```go
func sumAll(nums ...int) int {
    total := 0
    for _, num := range nums {
        total += num
    }
    return total
}

// Example: sumAll(1, 2, 3, 4, 5)
```

## 7. Deferred Execution (`defer`)

`defer` is a crucial mechanism for resource management (closing files, releasing locks). Statements scheduled with `defer` execute immediately before the function returns, in **LIFO** (Last-In, First-Out) order.

```go
func readFile(filename string) {
    f, _ := os.Open(filename)
    defer f.Close() // Guaranteed execution even on early exits or errors
    
    // Process file...
}
```

> [!WARNING]
> **The `defer` Trap:** Arguments passed to a deferred function are **evaluated immediately** at the time the `defer` statement is called, not when the function actually executes. 

---

> Always return `error` as the final value in the return list if your function can fail. This is the **de facto** standard for Go codebases.
