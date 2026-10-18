---
title: "Methods and receivers: copies, pointers, and method sets"
category: "Go"
tags: ["golang", "methods", "receivers", "fundamentals"]
description: "A method is a function associated with a receiver. Understanding receivers explains mutation, what a method value retains, and whether a type satisfies an interface."
updated: 2026-10-15
translationKey: "go/methods"
---

A rectangle can report its area and change its dimensions. Both operations belong naturally to the rectangle, but they have different data needs: calculating an area can use a copy, while scaling the existing rectangle must reach its original fields.

A **method** is a function declared with a receiver, the value written before the method name. Receiver choice determines what gets copied into the call. It also affects interfaces and callbacks, so understanding it requires more than memorizing `T` versus `*T`. This article assumes [struct copying](/en/notes/go/structs/) and pointers. Snippets are independent unless they explicitly reuse a type. Put method declarations at package scope, statements in `main`, and import `fmt` or `time` where used. Output comments describe expected behavior.

## Follow the receiver into the call

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

`Area` receives a `Rectangle` value. Calling it copies the receiver, just as passing a struct parameter would. If `Area` assigned a new `r.Width`, that would change its local copy. The caller's rectangle would retain its width.

`Scale` receives a `*Rectangle` value: the pointer is copied, but the pointed-to rectangle is shared. Accessing `r.Width` through that pointer changes the original field. Here a nil pointer would panic when the method accesses a field; using a pointer receiver does not automatically make nil a supported input.

A value receiver does not promise complete immutability. If the struct contains a slice, map, or pointer, copying it can leave underlying data shared, and the method can still modify that data. Likewise, a pointer receiver supplies access to an object without supplying synchronization. Concurrent reads and writes still need a suitable ownership or locking plan.

## Why a value can call Scale but fail an interface assignment

Using the `Rectangle` methods above:

```go
r := Rectangle{Width: 3, Height: 4}
r.Scale(2)
fmt.Println(r.Area()) // 48

type Scaler interface { Scale(float64) }
var _ Scaler = (*Rectangle)(nil)
// var _ Scaler = Rectangle{} // Would not compile.
```

`r` is addressable: Go can take the address of this variable. The call `r.Scale(2)` can therefore use the shorthand `(&r).Scale(2)`. Width becomes 6, height becomes 8, and their product is 48.

Interface satisfaction uses the **method set of the type**, rather than applying that shorthand to an individual variable. The method set of `Rectangle` includes `Area`; that of `*Rectangle` includes both `Area` and `Scale`. Only `*Rectangle` satisfies `Scaler`. The blank-identifier declaration checks this at compile time; it does not call `Scale` on a nil pointer.

Map elements show why addressability matters:

```go
rectangles := map[string]Rectangle{"card": {Width: 3, Height: 4}}
// rectangles["card"].Scale(2) // Would not compile.
r := rectangles["card"]
r.Scale(2)
rectangles["card"] = r
fmt.Println(rectangles["card"].Area()) // 48
```

A map element is not addressable, so Go cannot supply `&rectangles["card"]`. Retrieving the value creates a variable whose address can be taken; after scaling that copy, storing it back updates the map. A map of `*Rectangle` is another design, but then entries can share objects and may be nil. Choose it when those semantics fit the application.

## Saving a method also saves a receiver

A callback may outlive the line that creates it. The difference between a method expression and a method value tells us which data the callback will use.

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

`Rectangle.Area` is a **method expression**, with type `func(Rectangle) float64`. It leaves the receiver as an explicit first argument. `areaOf(r)` therefore computes the area of the receiver supplied at that call.

`r.Area` is a **method value**. Its receiver is evaluated and saved when `savedArea` is created. Because `Area` has a value receiver, the saved rectangle has width 3 and height 4. Changing the original width afterwards cannot change that saved copy, so the callback returns 12.

Creating `savedScale` saves a pointer to `r`, using the addressable-call shorthand. It points at the same rectangle whose width is later changed to 10, so scaling doubles that current width to 20. A method value retains its evaluated receiver; it does not search for a variable with the same name on each invocation. Keeping a method value can consequently keep its receiver data reachable for longer.

For a smaller example, consider a counter snapshot:

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

The snapshot retains the value 7, while a fresh call copies the current value 9. If `Value` instead had receiver `*Meter`, the saved callback would read the updated counter too. Receiver choice thus changes observable behavior before performance enters the discussion.

## Attach behavior to a type you own

Methods are not limited to structs. Import `time` for this package-level declaration:

```go
type Seconds int
func (s Seconds) Duration() time.Duration {
    return time.Duration(s) * time.Second
}
```

`Seconds` is a defined type with an integer underlying type. The method makes the conversion to a duration explicit at the place of use. This example assumes the integer and multiplication fit in `time.Duration`; it does not check overflow.

The receiver base type must be defined in the same package and must satisfy the specification's receiver restrictions; in particular the base type cannot itself be a pointer or interface type. You can declare a method with `*Seconds` as receiver, but cannot add a method directly to `int` or another package's type. Go also does not overload method names by argument list: choose distinct meaningful names or a common contract instead.

## Embedded methods keep their original receiver

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

`Identify` is promoted, allowing `u.Identify()` as shorthand for `u.Base.Identify()`. The receiver is still `Base`. The method does not acquire access to `User.Name`, nor does a same-named outer method change calls inside `Base` into virtual dispatch. Promotion depends on selector depth and on whether the field embeds `T` or `*T`; [Composition](/en/notes/go/composition/) follows those rules and their API consequences.

## Make the receiver part of the data contract

A pointer receiver is appropriate when a method must mutate the existing object, preserve its identity, avoid copying a substantial object, or work with a struct containing a lock that must not be copied after use. A value receiver suits small data intended to behave like an independent value. Consider shared fields before calling that value independent.

Using receiver forms consistently often makes an API easier to follow. Mixing them is legal and can be meaningful, as the rectangle example demonstrates; it also changes which interfaces the value type satisfies. Do not choose a pointer merely from an assumption that it is always faster. Copy cost, escape behavior, sharing, and the actual workload affect performance.

## Check the receiver before predicting the result

**1.** Why can `r.Scale(2)` compile while `var s Scaler = r` does not?

**2.** If `savedArea := r.Area` is created and then `r = Rectangle{Width: 10, Height: 10}` runs, does the saved callback use the replacement value?

**3.** A value-receiver method assigns `r.Items[0] = "new"` where `Items` is a slice field. Is the caller protected by the receiver copy?

**Answers:**

1. The call can take the address of the variable. The interface assignment checks the method set of `Rectangle`, which lacks the pointer-receiver `Scale` method.
2. No. It saved a value-receiver copy when created. A pointer-receiver method value saved from that variable would instead keep the variable's address and observe the replacement fields.
3. No. Copying the receiver copies the slice descriptor, so its backing array may still be shared. Independent mutation requires independent underlying data or an API that forbids that mutation.

## References

- [Go specification: method declarations](https://go.dev/ref/spec#Method_declarations), [method sets](https://go.dev/ref/spec#Method_sets), [calls](https://go.dev/ref/spec#Calls), [method expressions](https://go.dev/ref/spec#Method_expressions), and [method values](https://go.dev/ref/spec#Method_values).
- [Effective Go](https://go.dev/doc/effective_go) — pointers, values, and methods.
