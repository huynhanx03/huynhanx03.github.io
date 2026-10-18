---
title: "Structs: data models, copying, and memory layout"
category: "Go"
tags: ["golang", "structs", "fundamentals"]
description: "A struct groups related values into a named type. A clear struct models data and valid states; the following note adds behavior through methods."
updated: 2026-10-14
translationKey: "go/structs"
---

A struct groups related values into a named type. A clear struct models data and valid states; the following note adds behavior through methods.

## 1. Definitions, literals, and tags

```go
type User struct {
    ID int
    Name string
    Active bool `json:"active"`
}

u := User{ID: 1, Name: "An", Active: true}
v := User{2, "Binh", false}
var empty User
```

Named-field literals are easier to read and more robust to changes than positional literals. Omitted fields get zero values; empty has ID=0, Name="", Active=false. A tag is metadata for libraries such as encoding/json or an ORM; it does not execute behavior itself. Fields normally must be exported for another package’s library to access them.

## 2. Access, pointers, and copies

```go
copyUser := u
copyUser.Name = "Lan"
fmt.Println(u.Name) // An

p := &u
p.Name = "Mai"
fmt.Println(u.Name) // Mai
```

Go permits p.Name as shorthand for (*p).Name. Struct assignment copies fields, not recursively referenced data. If User had a []string field, copies could still share its array. Do not copy a struct containing sync.Mutex after its first use.

## 3. When is a struct comparable?

A struct supports == when every field is comparable. An array is comparable only when its element type is. Slices, maps, and functions prevent struct equality. An interface field can cause a comparison panic if its dynamic value is not comparable. Pointer equality compares identity, not an object’s full contents.

## 4. Alignment and padding

```go
type Scattered struct {
    A bool
    B int64
    C bool
}
type Grouped struct {
    B int64
    A bool
    C bool
}
```

Alignment requires fields to start at offsets appropriate for their types; the compiler may insert padding between fields and at the end. On common 64-bit targets these examples typically use 24 and 16 bytes. unsafe.Sizeof/Alignof/Offsetof can inspect layout; do not assume those sizes on every architecture.

Grouping fields by alignment can save memory across many objects. Ordering purely by size is not an unconditional rule: preserve meaning, positional-literal compatibility, and measure the effect. Unsafe is useful here for observation, not for defining serialization around runtime layout.

## 5. Converting between struct types

```go
type Public struct { Name string `json:"name"` }
type Internal struct { Name string `json:"display_name"` }

p := Public{Name: "An"}
i := Internal(p)
fmt.Println(i.Name) // An
```

Explicit conversion can be valid when underlying struct types match after tags are ignored under the conversion rules. Field names, order, and types still matter; unexported fields also have package identity. Different tags do not by themselves prevent conversion, though tags can matter to type identity for other purposes. Conversion does not perform field mapping or unit conversion.

## 6. Empty and anonymous structs

```go
done := make(chan struct{})
set := map[string]struct{}{"Go": {}}

report := struct {
    Title string
    Count int
}{Title: "Daily", Count: 3}

_, _, _ = done, set, report
```

struct{} has size zero and is useful for payload-free signals, set values, or behavior without state. Channels/maps still require metadata and keys; they are not memory-free. Anonymous structs suit one-off DTOs or case tables; a named type is clearer when multiple functions share a model.

## Worked example

### Scenario: copying a struct containing a slice

Struct assignment copies each field. For a slice field, the copy is the slice descriptor, not the whole array of elements.

```go
type Order struct {
    ID    int
    Items []string
}

original := Order{ID: 1, Items: []string{"tea", "cake"}}
copyOfOrder := original
copyOfOrder.ID = 2
copyOfOrder.Items[0] = "coffee"
fmt.Println(original.ID, original.Items) // 1 [coffee cake]

independent := original
independent.Items = append([]string(nil), original.Items...)
independent.Items[0] = "water"
fmt.Println(original.Items) // [coffee cake]
```

ID is independent because it is an int; Items still shares an array after the first assignment. The second copy duplicates the elements into another slice. For []string this permits independent element replacement; []*Item or [][]byte additionally require examining pointed-to data or inner slices. Design cloning around the actual data structure.

## Check your understanding

After copying a struct containing []string, what is independent? Why is Public → Internal valid despite different JSON tags?

## References

- [Go language specification](https://go.dev/ref/spec)
- [Effective Go](https://go.dev/doc/effective_go)
