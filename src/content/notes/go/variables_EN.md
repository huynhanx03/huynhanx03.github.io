---
title: "Variables, constants, and types: following each assignment"
category: "Go"
tags: ["golang", "basics", "variables", "types"]
description: "Distinguish declaration, assignment, and shadowing, then use zero values, conversions, and constants to express the meaning of data."
updated: 2026-10-15
translationKey: "go/variables"
---

A variable named `count` holds 10. You add a line containing `count := 20`, yet after leaving that block, `count` is still 10. Explaining this requires tracking where a name is declared as well as the assigned value.

This article follows three things: where a name can access a variable, which values its type allows, and which variable an assignment changes. Examples are independent fragments: put statements inside a function, place type/function declarations at package scope when shown that way, and import `fmt` for printing. Comments describe expected results.

## A declaration creates a variable; assignment updates one

```go
var count int
var name = "An"

func example() {
    count := 10
    count = 12
    count, ready := 15, true
    fmt.Println(count, ready) // 15 true
}
```

The two `var` declarations outside the function create package variables. `var count int` specifies a type without an initializer, so `count` starts at zero. `var name = "An"` supplies an initializer from which the compiler infers `string`; inference still determines a type at compile time, rather than allowing the variable's type to change at runtime.

Inside `example`, `count := 10` creates a new local variable. The package variable still exists, but the local name hides it here. `count = 12` updates that same local variable.

`:=` is a **short variable declaration**, allowed only inside functions. It requires at least one new non-blank name in the same block. Because `ready` is new, `count, ready := 15, true` is valid: the existing same-block `count` is reassigned and `ready` is declared. A following `count := 16` in that block would have no new name and fail compilation. Reused variables must also satisfy the declaration's type requirements.

## Blocks determine which variable a name denotes

A block is commonly the region inside `{ ... }`. A declaration in an inner block can hide a name in an outer block; this is **shadowing**:

```go
count := 10
{
    count := 20
    fmt.Println(count) // 20
}
fmt.Println(count) // 10

{
    count = 30
}
fmt.Println(count) // 30
```

In the first block, `:=` creates a different variable. Once that block ends, its name is out of scope and the next print reads the outer variable again. In the second block, `=` declares nothing; Go finds the visible name and updates the outer variable. In nested code, find the nearest declaration currently in scope before deciding what changes.

Predeclared names such as `int` and `len` belong to the universe scope. Declarations outside functions generally have package scope; imports have file scope; parameters and local variables have their corresponding function or block scope. This explains why files in one package share package variables but need separate imports.

An uppercase initial exports a name when it is declared at package scope or is a field or method name. Capitalizing a local variable does not expose it to another package. Choose names by meaning and scope: `i` suits a short loop, while `requestTimeout` explains configuration used farther away. Keep familiar initialisms such as `ID` and `URL` consistent.

## Multiple assignment needs no temporary variable

```go
i, j := 1, 2
i, j = j, i
fmt.Println(i, j) // 2 1
```

Go evaluates the right-hand values before performing the left-hand assignments. Both old values are therefore available for the swap. With two statements, `i = j` followed by `j = i`, the first would already have overwritten the 1, leaving both variables equal to 2.

This evaluation rule does not make assignment atomic relative to other goroutines. Concurrent access still needs synchronization appropriate to the operation being protected.

## Zero values give a defined initial state

A variable declared without an initializer receives its type's **zero value**, rather than arbitrary existing memory contents.

| Type group | Zero value |
| --- | --- |
| Integers, floating-point and complex numbers | `0` |
| `bool` | `false` |
| `string` | `""` |
| Pointers, slices, maps, channels, functions, interfaces | `nil` |
| Arrays, structs | Each element or field gets its own type's zero value |

A defined zero value does not make every operation valid. Appending to a nil slice works, but writing to a nil map or accessing a value through a nil pointer panics. Designing a type with a useful zero value reduces caller setup; when zero does not carry enough business meaning, add state.

Suppose zero retries means “do not retry,” while missing configuration means “use the default of three.” An `int` alone cannot distinguish those cases:

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

`RetrySetting{}` has `Set=false` and yields 3. `RetrySetting{Count: 0, Set: true}` represents an explicitly supplied value and yields zero. Negative-value validation happens only after establishing that a setting was supplied. A `*int` could use nil for absence, but its nil meaning and pointer sharing would need explanation. These two fields separate the value from its presence; [structs](/en/notes/go/structs/) explains the field-grouping syntax.

## Numeric types and conversions have limits

Go provides architecture-dependent `int` and `uint`, fixed-width `int8` through `int64` and `uint8` through `uint64`, and `uintptr`. Other basic groups include `float32`/`float64`, `complex64`/`complex128`, `bool`, and `string`. `byte` aliases `uint8`; `rune` aliases `int32`. Use `int` for ordinary counters and indexes, and fixed-width types when a protocol or data format requires them.

```go
x := 10
y := 5.5
z := float64(x) + y
fmt.Println(z) // 15.5
```

`x` is an `int` and `y` a `float64`. Go does not automatically convert an integer variable to floating point to add these variables, so we write `float64(x)`. The conversion supplies a value for this expression; it does not change `x`'s declared type.

Conversion does not guarantee preservation of the number: floating-point to integer conversion discards the fraction toward zero; narrowing an integer can discard bits. An out-of-range constant can be rejected at compile time, while converting a variable follows different rules. For a floating-point value outside the target integer's representable range, do not rely on an arbitrary conversion result. Avoid `float64` for money when the contract requires exact decimal arithmetic; choose integer minor units or a suitable decimal representation according to the required range.

A string is an immutable byte sequence. `len(s)` counts bytes; a Unicode character may occupy several bytes, and a user-visible character may contain several runes. [Control flow](/en/notes/go/flow/) uses `range` to explain reading strings.

## A constant need not start with a specific type

```go
const rate = 1.25
var a float32 = rate
var b float64 = rate

const MaxRetries int = 3
```

`rate` is an **untyped constant**. When assigned to `a` or `b`, the context supplies the respective numeric type if the constant is representable under that type's rules. This differs from a `float64` variable, which cannot be assigned directly to a `float32` variable without conversion. Constants are not compatible with every type: `1.25`, for example, does not represent an integer.

Constant expressions are evaluated at compile time with high precision; they are not mutable runtime objects. `MaxRetries` has an explicit `int` type, so it lacks the type flexibility of an untyped constant. In a short declaration such as `value := rate`, Go chooses this constant's default type, `float64`.

## Give types meaning and name states

```go
type Celsius float64
type Fahrenheit float64
type Temperature = Celsius

var c Celsius = 100
f := Fahrenheit(c) // conversion, not a temperature formula
_ = f
```

`Celsius` and `Fahrenheit` are different defined types even though both have underlying type `float64`. This difference requires explicit conversions where appropriate. However, `Fahrenheit(c)` changes the numeric type only: 100 remains 100 rather than becoming 212. The temperature formula must be written explicitly in a function. `Temperature` is an alias, another name for the same `Celsius` type, and introduces no new type boundary.

To name integer states, combine a defined type with `iota`:

```go
type Status int

const (
    Pending Status = iota
    Active
    Closed
)
```

Within each `const` block, `iota` starts at zero and advances per constant specification (`ConstSpec`). Lines omitting the expression repeat the preceding expression and type, producing values 0, 1, and 2, all of type `Status`. Another block starts again at zero.

This does not create a closed enum: `Status(99)` remains type-correct. Validate numbers received from an API or file against supported states. A type helps distinguish groups of values; validation checks the meaning within a group.

## Check your reasoning with small changes

**1.** Replace `count := 20` with `count = 20` in the shadowing example. What does the print immediately after the first block read?

**2.** Is `a, err := ...` always valid when `a` already exists? Consider both `a` and `err` already declared in the same block.

**3.** Why should `RetrySetting{Count: 0, Set: true}` not be replaced with `RetrySetting{}` when saving configuration?

**Explanations:**

1. It reads 20: assignment updates the outer variable rather than creating a new one.
2. Not always. At least one non-blank name must be new in that block, and type rules must hold. If both exist in that block, use `=` to reassign. If names exist only in an outer block, `:=` can create new variables that shadow them.
3. They mean “explicitly chose zero” and “not supplied,” respectively. Losing `Set` makes the next read apply the default of three, changing the configuration's meaning.

## References

- [Go specification: declarations and scope](https://go.dev/ref/spec#Declarations_and_scope), [short declarations](https://go.dev/ref/spec#Short_variable_declarations) — scope and redeclaration.
- [Constants](https://go.dev/ref/spec#Constants), [conversions](https://go.dev/ref/spec#Conversions), [zero value](https://go.dev/ref/spec#The_zero_value) — value and type rules.
- [Effective Go](https://go.dev/doc/effective_go) — naming and declarations in Go code.
