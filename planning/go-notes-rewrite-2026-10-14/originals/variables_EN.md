---
title: "Variables"
category: "Go"
tags: ["golang", "basics", "variables", "types"]
---

# Variables: The First Bricks

After grasping the philosophy, let's start laying the first bricks of your source code. In this chapter, we will explore how Go defines data through Variables, Constants, and basic Data Types.

## 1. Declaring Variables

There are two primary ways to declare variables in Go, differing in **explicitness** and **convenience**.

### Using the `var` Keyword
This method is used for declaring variables at the **Package level** or inside a **Function**.

```go
var name string = "Gopher"
var age int = 15
```

### Short Variable Declaration `:=`
This is an extremely common shorthand, but it is **only valid inside a Function**. Go will automatically **infer** the data type based on the initialization value.

```go
location := "Vietnam" // Go infers this as a string
count := 10           // Go infers this as an int
```

> When using `:=`, at least one variable on the left side must be new. If all variables have been declared previously, you must use the standard assignment operator `=`.

### Tuple Assignment
Go allows for multiple assignments on a single line. This is particularly elegant for **swapping values** without a temporary variable:

```go
i, j = j, i // Atomic swap between i and j
```

## 2. Zero Values

One of Go's strengths is that **variables are always initialized**. You will never face "uninitialized memory" or "garbage value" issues.

| Data Type | Zero Value |
| :--- | :--- |
| `int`, `float` | `0` |
| `string` | `""` (Empty string) |
| `bool` | `false` |
| `pointer`, `interface`, `slice`, `map` | `nil` |

## 3. Basic Data Types

Go categorizes data types strictly to optimize memory footprint:

- **Integers:** Includes `int8` through `int64`, and `uint` (unsigned). Usually, `int` is the default choice.
- **Floating Point:** `float32`, `float64`.
- **Boolean:** `bool` (strictly `true` or `false`).
- **Strings:** `string` (immutable sequence of bytes).

## 4. Constants

Constants are fixed values that remain unchanged throughout the application's lifecycle.

```go
const Pi = 3.14
const StatusOK = 200
```

> **Untyped Constants:** Constants in Go possess high precision and are not bound to a specific type until actually used. This allows for flexible expressions like `Math.Pi * distance` without worrying if `distance` is `float32` or `float64`.

### The `iota` Enumerator
Go provides the `iota` keyword to create sequences of related constants elegantly (often used as Enums):

```go
const (
    Pending = iota // 0
    Active         // 1
    Closed         // 2
)
```

## 5. Type Declarations

This is a powerful tool for **Domain-Driven Design**, making source code more explicit. You can create a new type based on an existing **underlying type**:

```go
type Celsius float64
type Fahrenheit float64

var c Celsius = 100
// var f Fahrenheit = c // COMPILATION ERROR! Different types despite same underlying type.
```

This prevents common logic errors, such as accidentally adding a temperature value to a currency value.

## 6. Scope

- **Package Scope:** Variables declared outside a function, accessible across the entire package.
- **Local Scope:** Variables declared inside a function, restricted to the surrounding block `{}`.
- **Universe Scope:** Pre-defined entities like `int`, `string`, `true`, `false`.

## 7. Naming Conventions

To keep code "Clean," follow these idiomatic rules:
- Use **camelCase** instead of snake_case.
- Keep names concise (e.g., `i` for index, `err` for error).
- **Exporting (Publicity):** If a name starts with an **UPPERCASE** letter (e.g., `User`), it is **Exported** (public). Otherwise (e.g., `user`), it is **Unexported** (private).

---

> Go is a **Strongly Typed** language. You cannot perform operations between different types (e.g., `int` + `float64`) without an explicit **Type Conversion** (casting).

**Example:**
```go
var x int = 10
var y float64 = 5.5
// z := x + y // ERROR!
z := float64(x) + y // CORRECT
```
