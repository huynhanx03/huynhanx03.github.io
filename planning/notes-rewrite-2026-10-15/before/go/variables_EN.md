---
title: "Variables, constants, and types: understanding Go data"
category: "Go"
tags: ["golang", "basics", "variables", "types"]
description: "A variable has a name, a type, and a value. Understanding these explains whether an assignment declares a new variable, what its default value is, and when a conversion is needed."
updated: 2026-10-14
translationKey: "go/variables"
---

A variable has a name, a type, and a value. Understanding these explains whether an assignment declares a new variable, what its default value is, and when a conversion is needed.

## 1. Declaration and assignment are different

```go
var count int
var name = "An"

func example() {
    count := 10
    count = 12
    count, ready := 15, true
    fmt.Println(count, ready)
}
```

`var count int` creates a zero-valued variable. `var name = "An"` infers string. `:=` is limited to functions and requires at least one new non-blank name in the same block. In `count, ready := ...`, count is reassigned and ready is declared. A nested block can declare a different count: that is shadowing, not an update of the outer variable.

```go
i, j := 1, 2
i, j = j, i
fmt.Println(i, j) // 2 1
```

The right-hand side is evaluated before assignment, so swapping needs no temporary variable. This is not an atomic operation across goroutines; concurrent access still requires synchronization.

## 2. What is a zero value?

| Type group | Zero value |
|---|---|
| Integers, floats, complex numbers | `0` |
| bool | `false` |
| string | `""` |
| Pointers, slices, maps, channels, functions, interfaces | `nil` |
| Arrays, structs | Each element/field has its own zero value |

A zero value does not make every operation valid: appending to a nil slice works, but writing to a nil map or dereferencing a nil pointer panics. Designing useful zero values makes APIs easier to use.

## 3. Basic types and conversions

Go provides architecture-sized int/uint, fixed-width int8…int64 and uint8…uint64, float32/float64, complex64/complex128, bool, and string. `byte` aliases uint8; `rune` aliases int32. A string is an immutable byte sequence, not a directly mutable character array. Use int for ordinary indexes and fixed-width types when a data format requires them.

```go
x := 10
y := 5.5
z := float64(x) + y
fmt.Println(z) // 15.5
```

A conversion makes intent explicit but may lose information: float-to-int conversion discards the fraction, and narrowing an integer can discard bits. Avoid float64 for money when exact decimal arithmetic is required.

## 4. Typed and untyped constants

```go
const rate = 1.25
var a float32 = rate
var b float64 = rate

const MaxRetries int = 3
```

An untyped constant such as rate can be used in compatible numeric contexts when its value is representable by the destination type. Constants are not compatible with every type. Numeric constants are evaluated with high precision during compilation, rather than stored as mutable runtime objects.

## 5. iota and state types

```go
type Status int

const (
    Pending Status = iota
    Active
    Closed
)
```

iota starts at zero and advances for each constant declaration in its block; a new block resets it. Omitting an expression repeats the previous one. This names states without creating a closed enum: a Status can still hold `Status(99)`, so external input needs validation.

## 6. Defined types, aliases, and scope

```go
type Celsius float64
type Fahrenheit float64
type Temperature = Celsius

var c Celsius = 100
f := Fahrenheit(c) // conversion, not a temperature formula
_ = f
```

`type Celsius float64` defines a new type; `type Temperature = Celsius` gives the same type another name. Converting Celsius to Fahrenheit changes the numeric type, not the temperature formula. Names have universe, package, file (including imports), and block scopes. Capitalized names are exported where the language permits, such as package declarations, fields, and methods; a capitalized local variable does not become an API.

Choose names by meaning and scope: i suits a short loop, while requestTimeout suits configuration. Preserve common initialisms such as ID and URL. Avoid short names that force readers to search elsewhere for meaning.

## Worked example

### Scenario: distinguishing “not configured” from zero

Zero values are useful, but they do not always carry enough meaning. A retry count of 0 may mean “do not retry”, which differs from “use the default”. Include presence information to distinguish the cases.

```go
type RetrySetting struct {
    Count int
    Set   bool
}

func retryCount(setting RetrySetting) (int, error) {
    if !setting.Set {
        return 3, nil
    }
    if setting.Count < 0 {
        return 0, fmt.Errorf("retry count must be non-negative")
    }
    return setting.Count, nil
}
```

RetrySetting{} yields 3; RetrySetting{Count: 0, Set: true} yields 0. Negative-value validation applies to explicitly supplied values. A *int can replace the two fields, but its nil meaning and pointer sharing need explanation. Choose the representation that makes the data contract clearest.

## Check your understanding

Explain why `a, err := ...` can be valid when a already exists. Distinguish a defined type from an alias, then find a shadowing example in your own code.

## References

- [Go language specification](https://go.dev/ref/spec)
- [Effective Go](https://go.dev/doc/effective_go)
