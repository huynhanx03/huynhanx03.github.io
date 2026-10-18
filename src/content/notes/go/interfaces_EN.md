---
title: "Interfaces: behavior contracts, dynamic types, and nil"
category: "Go"
tags: ["golang", "interfaces", "abstraction", "fundamentals"]
description: "An interface describes behavior required by a caller. A type satisfies it when its method set meets the contract, allowing several implementations without coupling the caller to their data layouts."
updated: 2026-10-15
translationKey: "go/interfaces"
---

A greeting function needs a person's name. It should not need to know whether that name came from a map, a database, or another service. An interface lets the caller state the behavior it needs, so implementations can supply that behavior with different data structures.

The key questions are what makes a type satisfy that contract and what an interface value holds after assignment. The second question explains dispatch, copying, assertions, and the surprising case of a nil pointer inside a non-nil interface. Read [Methods](/en/notes/go/methods/) first if method sets are unfamiliar. Snippets are independent, with declarations at package scope and statements in `main`; import `fmt` when used. The examples using `any` require Go 1.18 or later. Comments give expected output.

## Describe what the caller needs

Begin with a small behavior that several types can provide:

```go
type Speaker interface { Speak() string }

type Dog struct{}
func (Dog) Speak() string { return "Woof" }

type Human struct { Name string }
func (h Human) Speak() string { return "Hello, " + h.Name }

func greet(s Speaker) { fmt.Println(s.Speak()) }
var _ Speaker = (*Human)(nil)
```

`Speaker` requires a method named `Speak` with no parameters and a `string` result. Both types supply that exact signature. `greet(Dog{})` prints `Woof`; `greet(Human{Name: "An"})` prints `Hello, An`. Inside `greet`, the static type of `s` is `Speaker`, so code can call the promised method without inspecting a dog's or human's fields.

Go has no `implements` declaration. The compiler checks method names and signatures through type rules. A `Speak() error` method would not satisfy `Speak() string`, even though the name matches. This is implicit structural satisfaction checked statically, rather than arbitrary runtime duck typing. A defined integer or map type can have methods too; this mechanism is not limited to structs.

The `var _` declaration checks satisfaction at compile time without allocating a `Human`. Because `Speak` has a value receiver, both `Human` and `*Human` have the required method. If it had receiver `*Human`, only the pointer type would satisfy `Speaker`; the call shorthand for addressable variables would not add a method to `Human`'s method set.

## The interface value has a dynamic type and a dynamic value

A variable declared as `Speaker` keeps that static type. At runtime, a non-nil interface value also has a dynamic type and a value of that type. Calling `s.Speak()` selects the implementation for that dynamic type.

Assignment still copies values:

```go
h := Human{Name: "An"}
var s Speaker = h
h.Name = "Mai"
fmt.Println(s.Speak()) // Hello, An

s = &h
h.Name = "Lan"
fmt.Println(s.Speak()) // Hello, Lan
```

The first assignment stores a `Human` value copied from `h`. Updating `h.Name` does not update that copy. The second stores a copied `*Human` pointer, so both paths reach the same `h`. Calling `Speak` through that pointer copies the current `Human` value for the method's value receiver. An interface does not inherently point back to the original struct variable; the assigned value determines sharing.

## A nil pointer still contributes a type

```go
type User struct { Name string }
var p *User
var value any = p
fmt.Println(p == nil)     // true
fmt.Println(value == nil) // false
```

A nil interface has neither a dynamic type nor a dynamic value. Here `value` has dynamic type `*User` and a nil pointer value. It therefore differs from a nil interface. Calling this a **typed nil** describes that pair; there is no contradiction in the two comparisons because they compare different values of different static types.

This matters whenever a function returns an interface such as `error`. Returning a nil `*MyError` through an `error` result stores its type as well as the nil pointer. The caller then sees `err != nil`. A successful function should return `nil` explicitly. [Errors](/en/notes/go/errors/) shows how this affects failure handling.

A method with a nil pointer receiver can be valid if its implementation handles nil before dereferencing. The interface itself does not add that handling. Accessing a field through a nil pointer still panics, and invoking a value-receiver method through a nil pointer cannot supply the required concrete receiver value.

## Use assertions when the concrete type matters

`any` is an alias of `interface{}` introduced in Go 1.18. It imposes no method requirement, so many unrelated values can be assigned to it. Static type checking still applies: to use a concrete string operation, first establish that the contained value has the right type.

```go
var value any = "Go"
text, ok := value.(string)
fmt.Println(text, ok) // Go true

switch v := value.(type) {
case string:
    fmt.Println(len(v))
case int:
    fmt.Println(v + 1)
default:
    fmt.Println("unsupported")
}
```

The two-result assertion returns the contained string and true here. On a mismatch it returns the asserted type's zero value and false. A one-result assertion, `text := value.(string)`, instead panics on a mismatch. A type switch chooses a branch using the dynamic type; in the single concrete-type `string` case, `v` has type `string`, so `len(v)` is valid and prints 2.

Interface equality has a related boundary. Comparing `any([]int{1})` with `any([]int{1})` panics: both contain the same dynamic slice type, which is not comparable. Being assignable to an interface does not give the concrete value an equality operation.

Interfaces containing type terms, such as `interface{ ~int }`, serve a different purpose. They constrain type parameters in generics and cannot be used as ordinary runtime value types. `any` and the method-only interfaces used here are valid runtime types.

## Put the contract near its consumer

The greeting use case becomes more useful when retrieving data can fail. This is a separate example from `Speaker` and its `greet` function:

```go
type NameReader interface {
    Name(id int) (string, error)
}

func greet(reader NameReader, id int) (string, error) {
    name, err := reader.Name(id)
    if err != nil {
        return "", fmt.Errorf("greet user %d: %w", id, err)
    }
    return "Hello, " + name, nil
}

type Names map[int]string

func (n Names) Name(id int) (string, error) {
    name, ok := n[id]
    if !ok {
        return "", fmt.Errorf("user %d not found", id)
    }
    return name, nil
}

message, err := greet(Names{7: "An"}, 7)
fmt.Println(message, err) // Hello, An <nil>
```

`greet` depends on one operation. `Names` supplies it through a method on a defined map type, demonstrating that the implementation need not be a struct. For key 7, lookup succeeds, `Name` returns `"An", nil`, and `greet` constructs the message. For a missing key, it returns an error and the caller receives added context instead of a greeting.

A database-backed implementation can satisfy the same signature. The consumer can often define this small interface in its own package because it knows exactly what it requires. Standard interfaces such as `io.Reader` and `io.Writer` follow the same useful principle of narrow behavior contracts. Constructors can return concrete types until an abstraction is actually needed; an interface for every struct adds names without necessarily adding useful flexibility.

This contract says nothing about concurrent map writes or timeout support. Those requirements must be designed explicitly, for example by including a context parameter when operations need cancellation. Substituting a dependency for testing or another implementation is useful only when it also obeys the expected behavioral contract.

## Runtime representation is an explanatory detail

A traditional Go runtime model distinguishes interfaces with methods (`iface`) from the empty interface (`eface`):

```text
non-empty interface: [itab reference | data]
empty interface:     [type reference | data]
itab: concrete type + interface type + method dispatch information
```

The type-related word explains how the runtime can dispatch a call even when the caller only sees an interface. It also makes typed nil easier to visualize: type information can remain present when the pointer value is nil.

This sketch is not a specification guarantee for `unsafe` manipulation. Nor does a data word mean that every assignment causes a separate heap allocation. Representation and boxing depend on the type and compiler. Use the language model to reason about behavior, and measured evidence when investigating performance.

## Decide which information the caller needs

**1.** Given `var e *MyError = nil` where `*MyError` implements `error`, what does `var err error = e` store, and is `err == nil`?

**2.** A function only calls `Read([]byte) (int, error)`. Would an `any` parameter or a small reader interface express its requirement better?

**3.** What changes in the `Human` copying example if `Speak` is changed to a pointer receiver?

**Answers:**

1. It stores dynamic type `*MyError` and a nil pointer value. The interface is non-nil. Return the literal `nil` to signal successful completion.
2. The reader interface expresses the required operation and lets the compiler check implementations. `any` is appropriate when handling heterogeneous values and explicitly inspecting their types, not when the function already knows a required method.
3. `var s Speaker = h` no longer compiles because `Human` lacks that method in its method set. `s = &h` still works and shares the original object.

## References

- [Go specification: interface types](https://go.dev/ref/spec#Interface_types), [method sets](https://go.dev/ref/spec#Method_sets), [type assertions](https://go.dev/ref/spec#Type_assertions), and [comparison operators](https://go.dev/ref/spec#Comparison_operators).
- [Effective Go](https://go.dev/doc/effective_go) — interfaces and methods.
- [Go runtime: runtime2.go](https://go.dev/src/runtime/runtime2.go) — `iface` and `eface` implementation sketch, consulted on 2026-10-15.
