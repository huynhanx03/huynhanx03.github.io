---
title: "Composition and embedding: assembly without inheritance"
category: "Go"
tags: ["golang", "composition", "struct-embedding", "fundamentals"]
description: "Composition means building a component from other components. Go supports ordinary fields, embedded fields, and interfaces; embedding is only one composition technique."
updated: 2026-10-14
translationKey: "go/composition"
---

Composition means building a component from other components. Go supports ordinary fields, embedded fields, and interfaces; embedding is only one composition technique.

## 1. Named and embedded fields

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

The declaration omits an explicit field name, so the type’s name becomes the field name. e.Name and e.Greet are promoted selectors, shorthand for e.Persona.Name and e.Persona.Greet. Use Persona: in an Employee literal; a promoted Name: cannot be initialized directly in that literal.

## 2. Embedding does not create subtyping or overrides

Employee contains Persona but cannot be passed directly to a function accepting Persona; pass e.Persona. Persona-receiver methods still operate on Persona, not an outer subclass. An Employee method with the same name shadows a promoted selector without adding virtual dispatch inside Persona. Interfaces provide substitution contracts for callers; generics offer another form of typed reuse.

## 3. Ambiguous selectors and depth

```go
type A struct { Name string }
type B struct { Name string }
type C struct { A; B }

c := C{A: A{Name: "A"}, B: B{Name: "B"}}
fmt.Println(c.A.Name) // A
// c.Name is ambiguous.
```

Two names at the same depth make an attempted selector ambiguous, while the C declaration remains valid. Shallower fields/methods can shadow deeper names. Resolution follows selector and method-set rules, rather than a class-inheritance diamond model. Explicit access also shows which component owns the data.

## 4. Promotion can satisfy an interface

```go
type Logger struct{}
func (Logger) Log(message string) { fmt.Println(message) }

type Service struct { Logger }
type Logging interface { Log(string) }
var _ Logging = Service{}
```

Service satisfies Logging through promotion. Pointer receivers require checking Service/*Service method sets and the embedded field type. Embedding *T shares a T, but the outer zero value may contain a nil pointer; a promoted method that dereferences it can panic. Constructors or zero-value contracts should make this clear.

## 5. Interface embedding and delegation

```go
type Reader interface { Read([]byte) (int, error) }
type Writer interface { Write([]byte) (int, error) }
type ReadWriter interface { Reader; Writer }

type Service struct { logger Logging }
func (s Service) Run() { s.logger.Log("start") }
```

The two Service examples are separate snippets. ReadWriter requires the combined Reader/Writer methods; duplicate methods must have compatible signatures. A named logger field requires explicit calls and does not expose Log as part of Service’s API. Use named fields for internal dependencies and embedding when exposing/composing behavior deliberately.

A decorator/proxy can hold an interface and declare methods that add logging, retries, or metrics before delegating. Do not embed a type merely to save a few lines if you do not want its promoted API.

## Worked example

### Scenario: a named field keeping the API explicit

A service needs a logger to perform its work, but may not want to expose every logger method through its own public API. A named field expresses that relationship.

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

NewCheckout requires a usable logger. Callers use Place; logging remains an internal detail. Embedding Logger would promote Println, allowing it to be called through the service and widening the API. Use embedding when that promotion is intended; use a named field for deliberate delegation. Place demonstrates logging, not a complete order transaction.

## Check your understanding

Explain why e.Persona can be passed to a Persona parameter but e cannot. When should logger be a named field instead of embedded?

## References

- [Go language specification](https://go.dev/ref/spec)
- [Effective Go](https://go.dev/doc/effective_go)
