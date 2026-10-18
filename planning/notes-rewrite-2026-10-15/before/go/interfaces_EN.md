---
title: "Interfaces: behavior contracts, dynamic types, and nil"
category: "Go"
tags: ["golang", "interfaces", "abstraction", "fundamentals"]
description: "An interface describes behavior required by a caller. A type satisfies it when its method set meets the contract, allowing several implementations without coupling the caller to their data layouts."
updated: 2026-10-14
translationKey: "go/interfaces"
---

An interface describes behavior required by a caller. A type satisfies it when its method set meets the contract, allowing several implementations without coupling the caller to their data layouts.

## 1. Satisfaction is checked through types

```go
type Speaker interface { Speak() string }

type Dog struct{}
func (Dog) Speak() string { return "Woof" }

type Human struct { Name string }
func (h Human) Speak() string { return "Hello, " + h.Name }

func greet(s Speaker) { fmt.Println(s.Speak()) }
var _ Speaker = (*Human)(nil)
```

There is no implements keyword. The compiler compares method names and signatures, not names alone. This is implicit structural satisfaction checked statically, not arbitrary runtime duck typing. Defined integer-based types can have methods too; interfaces are not restricted to structs. The var _ line is a compile-time check, not an allocation of a Human instance.

## 2. Dynamic type and dynamic value

A Speaker value has static type Speaker but can contain a dynamic Dog or Human value. Calling Speak uses that dynamic type’s implementation. Assigning a value copies it into the interface; a pointer copy still references its shared object. An interface does not necessarily point back to an original struct value.

```go
type User struct { Name string }
var p *User
var value any = p
fmt.Println(p == nil)     // true
fmt.Println(value == nil) // false
```

An interface is nil only when it has neither a dynamic type nor a dynamic value. Here value contains dynamic type *User even though its pointer is nil. This is a typed nil, not an interface that is simultaneously nil and non-nil. For successful error-returning functions, return a genuine nil rather than a nil *MyError. A nil-pointer method can be valid if its implementation handles nil; dereferencing fields still panics.

## 3. any, assertions, and type switches

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

Since Go 1.18, any is an alias of interface{}, not a dynamic-language escape from type checking. The contained concrete type is unknown to the caller, so inspect it before using type-specific behavior. A one-result value.(T) assertion panics on mismatch; the two-result form returns a zero value and false. A type switch branches by dynamic type; a single concrete-type case gives v that type.

## 4. Runtime detail: iface and eface

```text
non-empty interface: [itab reference | data]
empty interface:     [type reference | data]
itab: concrete type + interface type + method dispatch information
```

The runtime traditionally calls these representations iface and eface. The diagram explains dispatch and typed nil, but is not a spec-guaranteed layout for unsafe manipulation. A data word does not imply a separate heap allocation for every value; representation and boxing depend on the compiler and type. Favor clear contracts over optimizations guessed from the diagram.

## 5. Design interfaces around consumers

Small interfaces such as io.Reader/io.Writer let consumers depend only on required operations. Often define an interface in the consuming package and return concrete constructor types until abstraction is useful. This enables new implementations and dependency substitution in tests without changing callers. Do not create an interface for every struct merely to add a layer.

Pointer/value method-set rules still apply: if Speak is declared on *Human, only *Human satisfies Speaker. Interfaces with type terms such as ~int can only be used as generic constraints, not as runtime value types. Interface equality can panic when matching dynamic types are not comparable, such as []int.

## Worked example

### Scenario: the consumer defining a small contract

A greeting function only needs to retrieve a user's name. It need not know the database, connection, or full repository API. Define the interface around that requirement.

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

Names satisfies NameReader without an implements declaration. A database-backed type can satisfy it with the same signature. This contract does not specify timeouts or concurrent access; extend it when needed, for example with a context parameter. The map implementation simply makes dependency substitution concrete.

## Check your understanding

Construct an error containing a typed nil and explain err != nil. When would you use any, and when a method-bearing interface?

## References

- [Go language specification](https://go.dev/ref/spec)
- [Effective Go](https://go.dev/doc/effective_go)
