---
title: "Interfaces"
category: "Go"
tags: ["golang", "interfaces", "abstraction", "fundamentals"]
---

# Interfaces: Flexible Contracts

Interfaces are one of Go's most powerful features, enabling incredible flexibility and scalability. They allow your code to be decoupled, maintainable, and easily testable (Unit Testing).

## 1. A Different Philosophy

In languages like Java or C#, you must use the `implements` keyword to declare that a Class satisfies an Interface. In Go, **it happens implicitly.**

> **Duck Typing:** "If it walks like a duck and quacks like a duck, then it is a duck." 
> In Go: If a **Struct** possesses all the methods required by an Interface, it **automatically** satisfies that Interface without any explicit declaration.

## 2. Defining an Interface

```go
type Speaker interface {
    Speak() string
}

type Dog struct{}
func (d Dog) Speak() string { return "Woof!" }

type Human struct{}
func (h Human) Speak() string { return "Hello!" }
```

Both `Dog` and `Human` satisfy the `Speaker` interface implicitly.

**Compile-Time Implementation Check**
In large projects, use this line to ensure a Struct satisfies an Interface immediately while writing code:
```go
var _ Speaker = (*Human)(nil) // Triggers a compile error if Human is missing methods
```
This line doesn't allocate memory; it's just an assertion for the compiler.

### The Internal Structure of an Interface
In Go, an Interface is not "nothing." It consists of two components:
1.  **Concrete Type**: Stores information about the type of the assigned object.
2.  **Value**: Points to the memory location containing the actual data of the object.

```go
// iface is used for interfaces with methods (e.g., Speaker)
type iface struct {
    tab  *itab          // Contains type info and the method table
    data unsafe.Pointer // Points to the actual value
}

// eface is used for the empty interface (any)
type eface struct {
    _type *_type          // Only contains type information
    data  unsafe.Pointer  // Points to the actual value
}
```

**This leads to an interesting pitfall:** An Interface can be "both nil and not nil."
-   It is only truly `nil` when both pointers are `nil`.
-   If the Type pointer (`tab` or `_type`) is set but `data` is `nil`, the comparison `if interface == nil` will return `false`. This commonly happens when assigning a `nil` struct pointer to an interface.

## 3. Why Do We Need Interfaces?

Imagine you are building a function to print a greeting for anything that "can speak":

```go
func Greet(s Speaker) {
    fmt.Println(s.Speak())
}
```

Thanks to Interfaces, you can pass in a dog, a human, or even a future robot **without modifying the Greet function**. This is a prime example of the **Open-Closed Principle**.

## 4. The Empty Interface (`interface{}` or `any`)

An Interface with no methods is satisfied by every type in Go. Since Go 1.18, we use the `any` keyword as an alias for `interface{}`.

```go
func PrintAnything(v any) {
    fmt.Println(v)
}
```

`any` can accept any value, from integers to complex structures. However, use it sparingly to avoid losing **Type Safety**.

---

> **Interface Segregation:** Go encourages small, focused Interfaces (often just 1 or 2 methods). Look at classic examples like `io.Reader` and `io.Writer`.

---
