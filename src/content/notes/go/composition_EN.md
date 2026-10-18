---
title: "Composition and embedding: assembly without inheritance"
category: "Go"
tags: ["golang", "composition", "struct-embedding", "fundamentals"]
description: "Composition means building a component from other components. Go supports ordinary fields, embedded fields, and interfaces; embedding is only one composition technique."
updated: 2026-10-15
translationKey: "go/composition"
---

A checkout service needs logging, but that does not necessarily mean callers should be able to call every logger method through the checkout. This is the design question behind composition: which components make up an object, and which operations belong to its public API?

Go supports composition through ordinary fields, embedded fields, and interfaces. Embedding adds selector and method promotion, so it is worth learning precisely what that convenience exposes. This article builds on [Structs](/en/notes/go/structs/), [Methods](/en/notes/go/methods/), and [Interfaces](/en/notes/go/interfaces/). Each code block is a separate snippet unless it explicitly reuses earlier types; put methods at package scope and statements in `main`, adding `fmt` where used. Comments describe expected results.

## Start with an explicit dependency

A named field lets the checkout decide how it uses a logger:

```go
type Logger interface { Println(...any) }

type Checkout struct {
    logger Logger
}

func NewCheckout(logger Logger) *Checkout {
    return &Checkout{logger: logger}
}

func (c *Checkout) Place(orderID string) {
    c.logger.Println("placing order", orderID)
}
```

`Place` calls the component through `c.logger`. A caller can use `Place`, but this field does not automatically give `Checkout` a `Println` method. Logging remains an implementation dependency. With the standard `log` package, `NewCheckout(log.Default()).Place("A17")` logs the operation; the exact log prefix depends on logger configuration.

The constructor requires a usable logger. A nil interface cannot receive a method call, and an interface containing a typed nil has whatever behavior its concrete method provides. This sample does not validate that dependency. `Place` also only demonstrates logging, not a completed order transaction. The `any` spelling requires Go 1.18 or later.

If the field were embedded as `Logger`, `Println` would be promoted and callers could invoke it through the checkout. Both designs assemble behavior from another component. The named field is appropriate when the component should stay internal; embedding is appropriate when the promoted behavior is deliberately part of the outer API.

## What embedding changes in a selector

```go
type Persona struct { Name string }
func (p Persona) Greet() string { return "Hello, " + p.Name }

type Employee struct {
    Persona
    ID int
}

e := Employee{Persona: Persona{Name: "An"}, ID: 7}
fmt.Println(e.Name, e.Greet()) // An Hello, An
```

The declaration `Persona` omits an explicit field name. The type name becomes the field name, so `Employee` still has an actual `Persona` field. Go lets the selectors `e.Name` and `e.Greet` stand for `e.Persona.Name` and `e.Persona.Greet`; these are **promoted** selectors.

Construction still follows the real fields. The literal uses `Persona: Persona{...}`. `Employee{Name: "An"}` would not compile because `Name` is promoted, rather than declared directly in `Employee`. Thinking of the nested object first and the shorthand second explains both access and construction.

## The embedded object remains its own receiver

An `Employee` contains a `Persona`, but it is not a subtype that can automatically be passed to a function accepting `Persona`. Pass `e.Persona` to that function. A function accepting a suitable interface can accept either type when both method sets satisfy the interface. Generics offer another form of typed reuse, with their own constraints; embedding is not a replacement for either mechanism.

The same boundary applies to methods. Extend the earlier example with these package-level methods:

```go
func (p Persona) Introduction() string { return p.Greet() }
func (e Employee) Greet() string { return "Employee " + e.Name }
```

For the same `e`, `e.Greet()` returns `Employee An`, while `e.Introduction()` returns `Hello, An`. The direct `Employee.Greet` shadows the promoted selector. But `Introduction` still runs with a `Persona` receiver, and `p.Greet()` resolves to `Persona.Greet`. Embedding does not introduce virtual dispatch to an outer object's similarly named method.

This matters when reusing a component whose internal methods call one another. Adding an outer method changes what callers select from the outer type; it does not rewrite the component's internal behavior.

## Resolve conflicts by following the field path

```go
type A struct { Name string }
type B struct { Name string }
type C struct { A; B }

c := C{A: A{Name: "A"}, B: B{Name: "B"}}
fmt.Println(c.A.Name) // A
// c.Name is ambiguous.
```

`C` is a valid declaration. The problem arises when trying to use `c.Name`: two candidate fields occur at the same selector depth. Go cannot choose between them. The explicit path `c.A.Name` identifies the intended component and works.

A shallower field or method can shadow a name at a deeper level. Thus resolution follows selector depth and method-set rules, rather than a general inheritance hierarchy. Explicit paths also document who owns the state, which can be useful even when the shorter selector is legal.

## Promotion can become an interface promise

```go
type Logger struct{}
func (Logger) Log(message string) { fmt.Println(message) }

type Service struct { Logger }
type Logging interface { Log(string) }
var _ Logging = Service{}
```

This is separate from the earlier `Logger` interface example. `Service` satisfies `Logging` through the promoted `Log` method. A caller accepting `Logging` can therefore receive a `Service` and call that method without knowing about the embedded field.

Pointer receivers require considering both the outer type and the embedded field:

| Embedded field | Method declared on `T` | Method declared on `*T` |
| --- | --- | --- |
| `T` | Promoted into `Outer` and `*Outer` | Promoted into `*Outer` |
| `*T` | Promoted into `Outer` and `*Outer` | Promoted into `Outer` and `*Outer` |

This table assumes the method name is unambiguous and unshadowed. It describes method sets, not a guarantee that every call has usable receiver data. Embedding `*T` can share the same object across outer structs, but the outer zero value contains a nil pointer. A promoted method that needs that object's fields can panic. Establish whether the zero value is usable or whether construction must supply the embedded component.

Promotion also has an API cost: newly exported methods of the embedded type may become visible through the outer type. Deliberate embedding should account for that relationship, rather than treating it only as a way to save forwarding lines.

## Combine contracts or delegate behavior

An interface can combine other interfaces without containing runtime component fields:

```go
type Reader interface { Read([]byte) (int, error) }
type Writer interface { Write([]byte) (int, error) }
type ReadWriter interface { Reader; Writer }
```

A value satisfies `ReadWriter` when its method set provides both operations. Overlapping methods must have compatible, identical signatures; two different `Read` signatures cannot become overloads.

By contrast, a named field holds an actual dependency and requires explicit forwarding:

```go
type Service struct { logger Logging }
func (s Service) Run() { s.logger.Log("start") }
```

This `Service` is a separate snippet from the embedded version and assumes `Logging` above. It provides `Run`, but does not automatically satisfy `Logging`. A decorator or proxy can follow this same pattern: hold an interface, declare the methods it intends to expose, add logging or metrics, and delegate to the wrapped value. Retries require additional operation-specific safety rules; merely wrapping a dependency does not make retrying safe.

## Choose the relationship before the syntax

**1.** Why does `Employee{Name: "An"}` fail while `e.Name` works?

**2.** A service needs a logger but should not offer logging as a public operation. Which field form expresses that design, and does the service automatically satisfy the logger interface?

**3.** If `Log` changes to a `*Logger` receiver while `Service` embeds a `Logger` value, will `Service{}` still satisfy `Logging`? What about `*Service`?

**Answers:**

1. Literals name declared fields. `Name` belongs to `Persona`; promotion only supplies a shorter selector. Construct the nested `Persona` explicitly.
2. Use a named field such as `logger Logging` and call it explicitly. The service needs its own `Log` method to satisfy `Logging`; the field alone does not promote one.
3. The value `Service` no longer has that promoted method in its method set. `*Service` does, assuming no ambiguity or shadowing. An addressable `Service` variable may still call the pointer method using shorthand; interface satisfaction still follows the type's method set.

## References

- [Go specification: struct types](https://go.dev/ref/spec#Struct_types), [selectors](https://go.dev/ref/spec#Selectors), [method sets](https://go.dev/ref/spec#Method_sets), and [embedded interfaces](https://go.dev/ref/spec#Embedded_interfaces).
- [Effective Go: embedding](https://go.dev/doc/effective_go#embedding) — composition and forwarding behavior.
