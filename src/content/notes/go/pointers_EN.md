---
title: "Pointers: changing a variable through its address"
category: "Go"
tags: ["golang", "basics", "pointers", "memory"]
description: "Distinguish copying a pointer, mutating its target, and replacing it; understand nil, new, variable lifetime, and when a pointer is appropriate."
updated: 2026-10-15
translationKey: "go/pointers"
---

You pass a number to a function, change it there, and find that the caller's variable remains unchanged. The function received a copy of its value. To let a function change the caller's actual variable, you must give it access to that variable. A pointer is a value providing such access through an address.

This article assumes [variables](/en/notes/go/variables/) and [value passing](/en/notes/go/functions/). Examples are independent: put statements inside functions, declare functions and types outside `main`, and import `fmt` for printing. Comments describe expected results. Concrete addresses are unnecessary for explaining the examples.

## Read &, *T, and *p in their positions

```go
age := 15
p := &age
fmt.Println(*p) // 15
*p = 20
fmt.Println(age) // 20

q := p
*q = 25
fmt.Println(*p, age) // 25 25
```

`age` holds an `int`. `&age` takes that variable's address; `p` has type `*int`, read as “pointer to int.” In expression `*p`, the star dereferences the pointer: it accesses the pointed-to variable. Consequently, `*p = 20` writes to `age` itself rather than creating another integer variable.

The star's role depends on position: in type `*int` it describes a pointer type, while in expression `*p` it accesses the target. `&` works in the other direction when taking the address of an addressable variable.

`q := p` copies the **pointer value**, rather than copying `age`. Both `q` and `p` then lead to the same variable. Writing twenty-five through `q` is visible through `p` and `age`. Printing `p` can show an address representation, but that address can change between runs and adds nothing essential to the sharing relationship.

This distinction is enough to track the example:

| Expression | What it holds or accesses | Assignment meaning |
| --- | --- | --- |
| `age` | Integer variable | `age = 30` changes its stored number |
| `p` | Pointer to `age` | `p = ...` changes where `p` points |
| `*p` | Variable at `p`'s target | `*p = 30` changes the target's value |

Distinguishing the last two rows prevents most confusion about passing pointers to functions.

## Passing a pointer still copies the parameter

```go
func set(p *int, value int) {
    *p = value
}

func replaceLocal(p *int) {
    other := 99
    p = &other
}

n := 1
set(&n, 2)
replaceLocal(&n)
fmt.Println(n) // 2
```

In `set(&n, 2)`, parameter `p` receives a copy of `n`'s address. `*p = value` follows that address and changes `n` to two. Copying the pointer does not prevent access to the same target.

In `replaceLocal(&n)`, parameter `p` initially leads to `n` too. However, `p = &other` replaces the **local pointer variable** so it now points to `other`. No statement writes to `n` through `*p`; nor does the function receive the address of a caller-owned pointer variable to replace. Thus `n` remains two.

If the caller needs to switch to another object, returning a new pointer and letting the caller assign it is usually clearer. `**T`, a pointer to a pointer variable, also allows replacing the caller's pointer, but adds an access level and needs a clear contract. It is unnecessary just to change an integer through `*int`.

Slices and maps show a related distinction: passing them by value still permits changes to shared underlying data, so `*[]T` or `*map[K]V` is normally unnecessary merely to mutate elements. A pointer to a slice serves another purpose, such as an API that truly needs to replace the caller's slice value. [Slices](/en/notes/go/slices/) explains why returning a slice after `append` is common.

## nil means there is no target

```go
var p *int
fmt.Println(p == nil) // true
// fmt.Println(*p) would panic.
```

A pointer's zero value is nil. It points to no variable, so dereferencing it panics. Comparing a pointer with nil checks presence; the API must define what absence means.

For example, a `*int` can represent an optional retry count: nil means “not supplied,” while a pointer to zero means “explicitly chose zero.” By contrast, `set` above requires non-nil `p` because it needs a target to change. Adding `if p == nil { return }` would silently discard a caller mistake rather than automatically improving the contract. Accept nil when there is valid behavior to describe for it.

Sharing a pointer also does not establish who may mutate its target. Two goroutines incrementing `*p` can race or lose updates. Use a mutex, suitable atomic operations, or an ownership rule enforced through channel coordination. Pointers express access; synchronization and mutation responsibility are separate decisions.

## new, literals, and make create different values

```go
p := new(int)
fmt.Println(*p) // 0

user := &struct{ Name string }{Name: "An"}
fmt.Println(user.Name) // An
```

`new(int)` creates a zero-valued integer variable and returns its pointer. Unlike `var p *int`, this `p` has a valid dereference target. For structs, `&User{...}` or the anonymous struct literal shown here initializes fields and obtains a pointer together. Go permits `user.Name` for pointer-based field access here without requiring `(*user).Name`.

`new` does not perform any additional initialization a type may need. `new(map[string]int)` returns `*map[string]int`, but its target map remains nil; writing an element would panic. `make(map[string]int)` creates a map ready for writes. `make` applies to slices, maps, and channels, returning the value of that type rather than its pointer. The distinction concerns the created value and initial state, rather than a rule that “new uses the heap and make uses the stack.”

[Since Go 1.26](https://go.dev/doc/go1.26#language), `new` also accepts an expression to specify the initial value:

```go
// Requires Go 1.26 language support.
p := new(10)
fmt.Println(*p) // 10
```

This form creates a new variable containing the expression's result, here an `int` equal to ten. It does not take an existing variable's address as `&age` does. `new(T)` still zero-initializes and remains compatible with earlier releases. An appropriate language version is required; installing a newer toolchain does not necessarily enable newer syntax for every package.

## A local variable can outlive its function

```go
func createPointer() *int {
    n := 10
    return &n
}
```

Go permits this example. Although created inside the function, `n` must live long enough for the returned pointer to remain usable. Leaving the name's scope does not immediately destroy its variable's storage; name scope and variable lifetime are different things.

The compiler uses **escape analysis** to determine whether data must survive beyond where stack placement is possible. Returning a local address often causes escape, but inlining and other optimizations can change allocation decisions at a call site. Seeing `new` or `&` alone does not establish a heap allocation.

To investigate compiler decisions for a particular project, this command can help:

```sh
go build -gcflags="-m" ./...
```

This is a reference command for compiler diagnostics, not a measurement performed for this article. Interpret diagnostics alongside the compiler version, flags, and actual code; optimization can change when those change. No `unsafe` manipulation is needed to make the example valid. In Go implementations, goroutine stacks can move as they grow, and pointers in ordinary Go code are maintained appropriately.

## Mutate the old object or replace it with a new one?

Suppose two variables point to the current configuration. We want one to use a replacement while the other retains the previous configuration:

```go
type Config struct { Port int }

func withPort(old *Config, port int) *Config {
    next := *old
    next.Port = port
    return &next
}

current := &Config{Port: 8080}
alias := current
current = withPort(current, 9090)
fmt.Println(current.Port, alias.Port) // 9090 8080
```

`withPort` requires non-nil `old`. `next := *old` copies the struct value to a new variable. Updating `next.Port` leaves the old struct alone. The function returns a pointer to the copy, and the caller replaces `current`'s pointer value. `alias` is not reassigned, so it still leads to the old configuration with port 8080.

If the function instead contained `old.Port = port; return old`, both `current` and `alias` would observe 9090 because the same object was mutated. Both designs are valid for different contracts: creating a new version or updating shared state.

This `Config` contains only an integer, so value copying provides independence. With slice, map, or pointer fields, `next := *old` is only a shallow copy; referenced inner data may remain shared. This is not a general deep-cloning pattern. Structs containing a mutex also have another restriction: a mutex must not be copied after use.

## Choose pointers for meaning before considering cost

Pointers fit shared mutation, object identity, or optional values represented by nil. A small configuration treated as immutable may be returned by value so copying and replacement are easier to understand. Large data can make copying significant, but pointers can also increase allocation, retained lifetimes, and GC work. Measure the actual workload when making a performance-based choice.

Ordinary Go does not support C/C++-style `p+1` pointer arithmetic and requires no `free`/`delete`. GC reclaims unreachable memory; it does not replace closing files, connections, or releasing locks according to their lifetimes. `unsafe` is a specialized exception with its own requirements, unnecessary for the ordinary pointer operations here.

## Check your understanding

**1.** Why does `q := p` followed by `*q = 25` change `age`, while `replaceLocal(&n)` does not set `n` to 99?

**2.** In the configuration example, replace `next.Port = port` with mutation of an element in a slice field copied from `old`. Is `alias` still guaranteed not to see the change?

**3.** Does `new(int)` prove the variable is allocated on the heap?

**Explanations:**

1. `*q` follows a copied address and writes to the shared target. `replaceLocal` changes only the address stored in its parameter. Distinguish assigning a pointer from assigning through one.
2. No. Struct copying does not copy a slice field's backing array. Independence requires identifying and copying the inner data that needs separation.
3. No. Syntax determines the type and initial state, while escape analysis and optimization determine placement. Correctness does not depend on guessing that placement.

## References

- [Go specification: pointer types](https://go.dev/ref/spec#Pointer_types), [address operators](https://go.dev/ref/spec#Address_operators), [allocation](https://go.dev/ref/spec#Allocation) — pointer types and operations.
- [Go FAQ: stack or heap](https://go.dev/doc/faq#stack_or_heap) — lifetime and storage decisions.
- [Go 1.26 language changes](https://go.dev/doc/go1.26#language) — expression operands for `new`.
- [sync.Mutex](https://pkg.go.dev/sync#Mutex) — restriction on copying a mutex after use.
