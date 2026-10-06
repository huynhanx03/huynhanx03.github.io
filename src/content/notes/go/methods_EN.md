---
title: "Methods"
category: "Go"
tags: ["golang", "methods", "receivers", "fundamentals"]
---

# Methods: Behavioral Abstractions

In the Go ecosystem, a **Method** is essentially a function with a specialized argument known as a **Receiver**. While a Struct defines the state (data) of an object, Methods define its behaviors. Under the hood, Methods serve as "Syntactic Sugar" that enables object-oriented patterns while maintaining the efficiency and simplicity of procedural programming.

---

## 1. Receiver Semantics

The defining characteristic of a Method is the presence of a Receiver before the function name. Go distinguishes between two primary types of receiver semantics:

-   **Value Receiver** `(r T)`: The method operates on a **copy** of the original value. Any internal mutations remain local to the method and do not affect the caller's state. This is ideal for small, immutable types or primitive abstractions.
-   **Pointer Receiver** `(r *T)`: The method operates directly on the object's memory address. This allows for in-place state mutation and eliminates the overhead of copying large data blocks, making it the standard for most engineering scenarios.

```go
type Rectangle struct {
    Width, Height float64
}

// Pointer Receiver: Directly modifies the object's internal state
func (r *Rectangle) Scale(factor float64) {
    r.Width *= factor
    r.Height *= factor
}

// Value Receiver: Read-only access to state without side effects
func (r Rectangle) Area() float64 {
    return r.Width * r.Height
}
```

> **The Consistency Rule:** If any method of a Struct requires a Pointer Receiver, then **all** methods of that Struct should utilize Pointer Receivers. Mixing receiver types for the same data structure is considered a "bad practice" as it obscures intent and leads to unpredictable behavior.

---

## 2. Runtime Anatomy: Method Expression vs. Method Value

Mastering Go requires understanding how the compiler handles methods beneath the syntactic abstraction:

### Method Expression
You can treat a method as a standard function by invoking it directly through the type. In this context, the receiver must be passed as the first argument.
```go
f := Rectangle.Area // f is a function of type: func(Rectangle) float64
area := f(rect)     // Equivalent to rect.Area()
```

### Method Value
You can bind a method to a **specific instance** and assign it to a variable. This variable becomes a closure that implicitly captures the instance.
```go
scaleFunc := rect.Scale // scaleFunc is permanently bound to the rect instance
scaleFunc(2.0)          // Equivalent to calling rect.Scale(2.0)
```

---

## 3. Method Sets: The Compliance Matrix

Method Sets are a critical technical concept that determines how a type interacts with Interfaces:

-   **Value Type `T`**: Its method set consists only of methods declared with a **Value Receiver**.
-   **Pointer Type `*T`**: Its method set consists of **all** methods (both Value and Pointer Receivers).

| Receiver Type | Method Set Compliance |
| :--- | :--- |
| `(r T)` | Only methods declared with `(r T)` |
| `(r *T)` | Includes both `(r T)` and `(r *T)` |

**The "Syntactic Sugar" Exception:** 
In high-level code, you can call `rect.Scale()` even if `rect` is a value, because Go automatically translates it to `(&rect).Scale()` if the variable is addressable. However, the rigid rules of Method Sets apply strictly when satisfying interfaces.

---

## 4. Method Promotion (Embedding)

Through the use of **Struct Embedding**, Go allows methods of an embedded struct to be "promoted" to the parent struct.

```go
type Base struct { ID int }
func (b Base) Identify() { fmt.Println("ID:", b.ID) }

type User struct {
    Base  // Embedding (Composition)
    Name string
}

u := User{Base{1}, "Alice"}
u.Identify() // The Identify method is "promoted" to User
```

This mechanism facilitates polymorphism and logic reuse without the systemic complexity of traditional class-based inheritance.

---

## 5. Primitive Behavioral Extensions

Go uniquely allows you to define methods on any user-defined type, including extensions of primitive types, provided they reside within the same package.

```go
type MyDuration int

func (d MyDuration) ToSeconds() int {
    return int(d)
}
```

> **The Non-Overloading Constraint:** Go prioritizes absolute clarity and therefore **does not support** Method Overloading. Within a given type, every method name must be unique and unambiguous.
