---
title: "Methods and receivers: copies, pointers, and method sets"
category: "Go"
tags: ["golang", "methods", "receivers", "fundamentals"]
description: "A method is a function associated with a receiver. Understanding receivers explains mutation, what a method value retains, and whether a type satisfies an interface."
updated: 2026-10-14
translationKey: "go/methods"
---

A method is a function associated with a receiver. Understanding receivers explains mutation, what a method value retains, and whether a type satisfies an interface.

## 1. Value and pointer receivers

```go
type Rectangle struct { Width, Height float64 }

func (r Rectangle) Area() float64 {
    return r.Width * r.Height
}
func (r *Rectangle) Scale(factor float64) {
    r.Width *= factor
    r.Height *= factor
}
```

Area receives a Rectangle copy, so changing its local Width would not change the original. Scale receives a pointer copy and mutates the original through it. Value receivers do not guarantee immutability: slice/map/pointer fields can still expose shared storage. Pointer receivers do not make concurrent calls safe.

## 2. Call shorthand does not change a method set

```go
r := Rectangle{Width: 3, Height: 4}
r.Scale(2)
fmt.Println(r.Area()) // 48

type Scaler interface { Scale(float64) }
var _ Scaler = (*Rectangle)(nil)
// var _ Scaler = Rectangle{} would not compile.
```

Because r is addressable, r.Scale can mean (&r).Scale. The Rectangle method set still contains only Rectangle-receiver methods; *Rectangle includes both receiver forms. Only *Rectangle satisfies Scaler. A map element is not addressable, so m[key].Scale cannot use the same shorthand; retrieve, modify, and store a value, or use pointer values.

## 3. Choose a receiver from the data contract

Use a pointer to mutate an object, avoid copying a large object, or preserve identity, especially for structs containing locks. Value receivers fit small value-like data. Consistency is often clearer, but mixed receivers are neither forbidden nor automatically incorrect: Area/Scale illustrates method sets. Do not choose pointers solely because they seem faster.

## 4. Method expressions and method values

```go
r := Rectangle{Width: 3, Height: 4}
areaOf := Rectangle.Area
fmt.Println(areaOf(r)) // 12

savedArea := r.Area
savedScale := r.Scale
r.Width = 10
fmt.Println(savedArea()) // 12
savedScale(2)
fmt.Println(r.Width) // 20
```

Rectangle.Area is a method expression of type func(Rectangle) float64: the caller supplies the receiver. r.Area is a method value that saves a value-receiver copy when created. r.Scale saves a pointer to r and sees later field changes; it does not look up a variable named r again on every call. Method values can extend receiver data lifetime.

## 5. Promotion from embedded fields

```go
type Base struct { ID int }
func (b Base) Identify() int { return b.ID }

type User struct {
    Base
    Name string
}
u := User{Base: Base{ID: 1}, Name: "An"}
fmt.Println(u.Identify()) // 1
```

Identify is promoted, making u.Identify shorthand for u.Base.Identify. The actual receiver remains Base; it does not become User or dynamically dispatch to an outer override. Promotion also depends on embedding T versus *T and selector depth; Composition explains conflicts.

## 6. Methods on defined types

```go
type Seconds int
func (s Seconds) Duration() time.Duration {
    return time.Duration(s) * time.Second
}
```

The receiver base type must be defined in the same package and satisfy the spec’s restrictions on pointer/interface types. You cannot add a method directly to int or another package’s type. Go does not overload a method name by argument list; use distinct meaningful names or one common contract.

## Worked example

### Scenario: one read operation and one update operation

A method name is not enough: its receiver determines whether it operates on a copy or accesses the original object. Read the signature too.

```go
type Meter struct { Count int }

func (m Meter) Value() int { return m.Count }
func (m *Meter) Add(delta int) { m.Count += delta }

m := Meter{Count: 4}
m.Add(3)
fmt.Println(m.Value()) // 7

snapshot := m.Value
m.Add(2)
fmt.Println(snapshot(), m.Value()) // 7 9
```

m is addressable, so m.Add(3) can call a pointer-receiver method. The snapshot method value retains a copy of the receiver from creation time; it does not reread m on each call. If Value used *Meter, snapshot would retain a pointer and observe updates. Receiver choice affects semantics before performance.

## Check your understanding

Why does savedArea still return 12 while savedScale changes the current r? Distinguish an addressable method call from interface satisfaction.

## References

- [Go language specification](https://go.dev/ref/spec)
- [Effective Go](https://go.dev/doc/effective_go)
