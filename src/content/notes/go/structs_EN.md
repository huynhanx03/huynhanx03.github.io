---
title: "Structs: data models, copying, and memory layout"
category: "Go"
tags: ["golang", "structs", "fundamentals"]
description: "A struct groups related values into a named type. A clear struct models data and valid states; the following note adds behavior through methods."
updated: 2026-10-15
translationKey: "go/structs"
---

A user record has an ID, a name, and an activation flag. Passing those values separately makes it easy to mix records or forget which values belong together. A struct gives the group a shape and, when declared with `type`, a name that functions can use.

Grouping data also raises a less visible question: when a record is copied, which changes are independent? This article follows that question from ordinary fields to slices, equality, and memory layout. It assumes variables and functions; [Slices](/en/notes/go/slices/) explains the shared arrays used later. Snippets are independent: put statements in `main`, type declarations at package scope when needed, and import `fmt` for printing. Output comments are expected results, not a record of execution.

## Give related values a shape

```go
type User struct {
    ID int
    Name string
    Active bool `json:"active"`
}

u := User{ID: 1, Name: "An", Active: true}
v := User{2, "Binh", false}
var empty User
fmt.Println(u.Name, v.Name) // An Binh
fmt.Println(empty)          // {0  false}
```

`User` declares three fields and their types. A composite literal supplies values for those fields. The keyed literal for `u` says what each value means; the positional literal for `v` relies on declaration order. If a field is added or reordered, positional construction needs particular care. Keyed literals make construction easier to review and can omit fields, which then receive their zero values.

`var empty User` initializes every field to its zero value: `ID` is 0, `Name` is the empty string, and `Active` is false. The two spaces in the printed record surround the empty string. A zero value is a language initialization rule; whether that record is a valid user is an application decision. A required positive ID, for example, still needs validation.

The text in backticks is a **struct tag**. It is metadata that a library may read. `json:"active"` tells `encoding/json` how to name that field; the tag does not itself execute code or validate a value. Fields starting with an uppercase letter are exported. Libraries in another package normally need exported fields to access this data; a tag on a private field does not make that field public. ORMs and other libraries have their own tag conventions.

## Copy the record or point at the same record

Start with `u := User{ID: 1, Name: "An", Active: true}` from above:

```go
copyUser := u
copyUser.Name = "Lan"
fmt.Println(u.Name) // An

p := &u
p.Name = "Mai"
fmt.Println(u.Name) // Mai
```

The first assignment copies the struct's fields. `copyUser.Name` is a separate field, so replacing its string leaves `u.Name` unchanged. The second assignment copies an address into `p`. Now `p.Name` selects the field of the original record. Go permits `p.Name` as shorthand for `(*p).Name`, so this write changes `u`.

This distinction applies when passing arguments and returning values too: Go copies values. A copied pointer still identifies the same object. A copied struct has separate fields, but those fields can themselves describe shared data.

## A slice field makes copying only partly independent

Suppose an order contains a list of item names:

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

After `copyOfOrder := original`, the two `ID` fields hold independent integers. The two `Items` fields hold independent slice descriptors, but those descriptors refer to the same backing array. Writing element zero goes through a descriptor into that shared array. That is why the original ID stays 1 while its first item changes.

The later `append` copies the string elements into separate slice storage for this nonempty input. Replacing `independent.Items[0]` then leaves the original array untouched. This is enough for independent replacement of `[]string` elements. With `[]*Item` or `[][]byte`, the copied elements are pointers or inner slice descriptors; the objects or arrays they refer to may remain shared. A clone operation must decide which parts of the actual data structure need independent storage.

Some structs also have a copying restriction beyond ordinary data sharing. The [sync.Mutex documentation](https://pkg.go.dev/sync#Mutex) forbids copying a mutex after first use. A struct containing one inherits that practical restriction: use a pointer when passing around the existing object, including when choosing [method receivers](/en/notes/go/methods/).

## Equality follows the fields

If every field type is comparable, two structs of that type can be compared with `==`. For `User`, equality compares the ID, name, and activation flag. Arrays are comparable when their element type is comparable, so an array field can also participate. A slice, map, or function field makes the struct type non-comparable; `Order` above cannot be compared with `==`.

An interface field needs extra care. The struct type can be comparable, yet a particular comparison can panic because of the interface's contents:

```go
type Label struct { Value any }
a := Label{Value: []int{1}}
b := Label{Value: []int{1}}
// fmt.Println(a == b) // Would panic: the dynamic []int values are not comparable.
_, _ = a, b
```

Here the comparison reaches interface values with the same dynamic type, `[]int`, and that type has no equality operation. See [Interfaces](/en/notes/go/interfaces/) for the dynamic-type model. `any` requires Go 1.18 or later. Comparing pointers instead compares identity: two separately allocated records can have equal fields while their pointers are unequal. Choose whether you need identity, field equality, or a domain-specific comparison before writing the operation.

## Different names and tags do not imply field mapping

Two defined struct types are distinct, but an explicit conversion can be allowed when their underlying structures match:

```go
type Public struct { Name string `json:"name"` }
type Internal struct { Name string `json:"display_name"` }

p := Public{Name: "An"}
i := Internal(p)
fmt.Println(i.Name) // An
```

For this conversion rule, Go ignores struct tags when comparing the underlying types. Field names, order, and types must still meet the rule; unexported field names also have package identity. Tags still matter to struct type identity in other contexts. Thus this conversion preserves the string as it is. It does not match differently named fields, convert units, apply JSON rules, or validate the result. Those operations need explicit code. The [conversion rules](https://go.dev/ref/spec#Conversions) define the precise conditions.

## Choose a named type when the model is shared

Some data only needs a shape at one location:

```go
done := make(chan struct{})
set := map[string]struct{}{"Go": {}}

report := struct {
    Title string
    Count int
}{Title: "Daily", Count: 3}

_, _, _ = done, set, report
```

The anonymous `report` struct is useful for a one-off DTO or a table of cases. When several functions share the same concept, a named type makes their relationship easier to express.

`struct{}` has no fields and size zero. A `chan struct{}` can express a signal with no payload; a `map[string]struct{}` can represent membership without a meaningful stored value. A defined type based on an empty struct can also provide methods without storing state. These uses do not make the channel or map memory-free: channel metadata, map storage, and keys still occupy memory.

## Layout matters when there are many records

The language model describes fields, while the compiler also has to place them in memory. Alignment constrains the offsets at which values can start. Padding fills gaps needed to satisfy those constraints and the alignment of successive struct values.

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

fmt.Println(unsafe.Sizeof(Scattered{}), unsafe.Sizeof(Grouped{}))
// Common 64-bit targets: 24 16; architecture-dependent.
```

This snippet additionally imports `unsafe`. On common targets with 8-byte alignment for `int64`, `Scattered` leaves a gap after the first boolean and more padding after the last. `Grouped` puts the aligned integer first and keeps the booleans together, reducing wasted space. `unsafe.Alignof` and `unsafe.Offsetof` let you inspect alignment and field offsets as well.

These sizes are not promises for every architecture. Grouping by alignment can matter for a large collection, but preserve the meaning of the model and consider callers using positional literals before reordering. Measure the relevant workload before treating layout as an optimization. Runtime memory layout is also unsuitable as a portable serialization format; encode fields deliberately.

## Reason about a new record

**1.** After `copyOfOrder := original`, would assigning `copyOfOrder.Items = nil` make `original.Items` nil? How does that differ from assigning an element?

**2.** Can a struct containing `[2]int` be a map key? What changes if that field becomes `[]int`?

**3.** In the conversion above, can you rename `Internal.Name` to `DisplayName` and expect `Internal(p)` to map the name automatically?

**Answers:**

1. No. The slice fields are separate values. Replacing one descriptor leaves the other descriptor unchanged; writing `Items[0]` instead reaches their shared backing array.
2. Yes, if its other fields are comparable. `[2]int` is comparable. A `[]int` field makes the struct non-comparable, so it cannot be a map key.
3. No. The field names would no longer match the illustrated conversion rule. Construct `Internal{DisplayName: p.Name}` explicitly and add any required validation.

The useful habit is to inspect field types before assuming what copying, equality, or conversion means. [Methods](/en/notes/go/methods/) applies the same reasoning to the value a receiver receives.

## References

- [Go specification: struct types](https://go.dev/ref/spec#Struct_types), [comparison operators](https://go.dev/ref/spec#Comparison_operators), [conversions](https://go.dev/ref/spec#Conversions), and [size and alignment guarantees](https://go.dev/ref/spec#Size_and_alignment_guarantees).
- [Effective Go](https://go.dev/doc/effective_go) — composite literals and data types.
- [sync.Mutex](https://pkg.go.dev/sync#Mutex) — restriction on copying after first use.
