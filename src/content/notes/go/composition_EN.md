---
title: "Composition"
category: "Go"
tags: ["golang", "composition", "struct-embedding", "fundamentals"]
---

# Composition: Architectural Design Philosophy

Go categorically rejects the traditional class-based hierarchy in favor of a **Composition-centric** design. This philosophy is primary realized through **Struct Embedding**. It is not merely a syntactic alternative, but a fundamental shift in architectural strategy: prioritizing the flexible assembly of discrete, atomic components into robust systems.

---

## 1. The Anatomy of Struct Embedding

In Go, when a Struct is embedded within another without an explicit field name, it is treated as an **Anonymous Embedding**.

```go
type Persona struct {
    Name string
}

func (p Persona) Greet() {
    fmt.Println("Salutations, I am", p.Name)
}

type Employee struct {
    Persona // Embedding
    ID      int
}
```

### Automatic Promotion
Fields and methods of the embedded `Persona` are automatically "promoted" to the lexical scope of the `Employee`. This allows you to invoke `emp.Greet()` directly, effectively bypassing the need for explicit delegation while maintaining structural isolation.

---

## 2. Core Distinction: Embedding vs. Subtyping

This is the most critical academic distinction for senior engineers to master:

-   **Traditional OOP (Subtyping):** A child class **is a (is-a)** member of the parent type. Sub-types are substitutable anywhere the parent type is expected.
-   **Go (Embedding):** The outer struct **has a (has-a)** member of the inner type, veiled by direct structural access. An `Employee` is **not** a `Persona`.

> An `Employee` instance cannot be passed to a function expecting a `Persona` type. Polymorphism in Go is achieved exclusively through **Interfaces**, rather than structural hierarchies.

---

## 3. Resolving Conflicts (Ambiguous Selectors)

Go addresses the "Diamond Problem" of multiple inheritance through a rigid and transparent resolution rule:

If multiple embedded structs share identical field or method names, the definition remains valid. However, a compilation error is triggered only upon access if the selector is ambiguous.

```go
type A struct { Name string }
type B struct { Name string }

type C struct {
    A
    B
}

var c C
// fmt.Println(c.Name) // ERROR: Ambiguous selector 'Name'
fmt.Println(c.A.Name)   // Valid: Explicit qualification required
```

This mechanism enforces explicit documentation in the source code, eliminating the hidden shadowing issues common in complex inheritance trees.

---

## 4. Polymorphic Compliance via Embedding

The true power of Composition is realized when combined with Interfaces. By embedding a struct that already implements necessary behaviors, a new struct inherits **Polymorphic Compliance** automatically, eliminating the need for boilerplate delegation code.

```go
type Logger struct{}
func (l Logger) Log(msg string) { fmt.Println(msg) }

type Service struct {
    Logger // Automatically satisfies any interface requiring Log()
}
```

---

## 5. Interface Composition (Domain Atomicity)

Go allows for the recursive assembly of small, atomic interfaces into more complex abstractions. This is a direct implementation of the **Interface Segregation Principle** (ISP).

```go
type Reader interface { Read(p []byte) (n int, err error) }
type Writer interface { Write(p []byte) (n int, err error) }

// ReadWriter is composed from atomic domain interfaces
type ReadWriter interface {
    Reader
    Writer
}
```

This design pattern facilitates high **Composability**, enabling the seamless implementation of structural patterns such as Decorators, Proxies, and Middleware.

---

## 6. Closing Principles

> **Favor Composition over Inheritance:** Assembling independent components mitigates **Tight Coupling**, enhances **Testability**, and ensures long-term **Architectural Stability**.
