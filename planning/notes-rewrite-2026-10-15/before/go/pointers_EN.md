---
title: "Pointers: addresses, shared data, and memory lifetime"
category: "Go"
tags: ["golang", "basics", "pointers", "memory"]
description: "A pointer is a value that accesses a variable through its address. Its first purpose is to express shared access or mutation; performance benefits should be measured rather than assumed."
updated: 2026-10-14
translationKey: "go/pointers"
---

A pointer is a value that accesses a variable through its address. Its first purpose is to express shared access or mutation; performance benefits should be measured rather than assumed.

## 1. Read &, *T, and *p

```go
age := 15
p := &age
fmt.Println(*p) // 15
*p = 20
fmt.Println(age) // 20
```

`&age` takes age’s address, `*int` is a pointer-to-int type, and `*p` accesses the pointed-to variable. Printing p yields an address, but the actual address can differ between runs. q := p copies the address; both still access the same age.

## 2. Pointers are still passed by value

```go
func set(p *int, value int) {
    *p = value
}

func replaceLocal(p *int) {
    other := 99
    p = &other
}

n := 1
set(&n, 2)
replaceLocal(&n)
fmt.Println(n) // 2
```

set changes the variable reached through the copied pointer. replaceLocal only replaces its local pointer; it does not replace n or the caller’s pointer. To replace a caller’s pointer, usually return a new pointer; `**T` is possible but makes the contract more complex. Slices and maps can mutate underlying data without *slice/*map because their copies already retain references.

## 3. nil and ownership

```go
var p *int
fmt.Println(p == nil) // true
// fmt.Println(*p) would panic.
```

Nil means no variable is pointed to. An API should state whether nil is valid: it may represent an optional value, or a non-nil pointer may be a precondition. Do not silently ignore mistakes by adding nil checks everywhere. Sharing a pointer between goroutines does not permit unsynchronized mutation; use locks, atomics, or channel-based ownership.

## 4. new(T), literals, and make

```go
p := new(int)
fmt.Println(*p) // 0

user := &struct{ Name string }{Name: "An"}
fmt.Println(user.Name) // An
```

`new(T)` creates a zero-initialized T and returns *T. `&User{...}` is convenient for initializing fields. `new(map[string]int)` only creates a pointer to a nil map; use make(map[string]int) for a writable map. Make applies to slices/maps/channels and returns that type’s value, not a pointer.

Since Go 1.26, new also accepts an expression: new(10) creates an *int containing 10. The new(T) form above remains valid and compatible with older releases.

## 5. A local variable can outlive its function

```go
func createPointer() *int {
    n := 10
    return &n
}
```

This is valid: Go keeps n alive while its pointer is usable. Escape analysis helps the compiler choose stack or heap placement. Returning a local address often causes escape, but inlining and other optimizations can change the result. Neither new nor & by itself guarantees a heap allocation; syntax alone is insufficient to determine allocation.

```sh
go build -gcflags="-m" ./...
```

This command helps inspect compiler decisions; it is not an invitation to manipulate them with unsafe. Goroutine stacks can move when they grow, and the runtime maintains pointers for ordinary Go code.

## 6. Compared with C/C++, and choosing a pointer

Ordinary Go has no p+1 pointer arithmetic and requires no free/delete. GC handles unreachable memory; files, connections, and locks still need explicit lifecycle management. The unsafe package is a specialized exception. Pointers can increase sharing, allocations, and GC work, while value copies may be simpler for small data. Structs containing mutexes must not be copied after use.

## Worked example

### Scenario: replacing an object instead of mutating it

An API can mutate through a pointer or return a new object for the caller to install. These actions have different effects when multiple variables point to the same object.

```go
type Config struct { Port int }

func withPort(old *Config, port int) *Config {
    next := *old
    next.Port = port
    return &next
}

current := &Config{Port: 8080}
alias := current
current = withPort(current, 9090)
fmt.Println(current.Port, alias.Port) // 9090 8080
```

The caller replaces the address in current; alias retains the old address. The function requires a non-nil old. This Config contains only an int, so the copy is independent; slice/map/pointer fields would still share underlying data after a shallow *old copy. Do not generalize this into a universal struct-cloning method.

## Check your understanding

Why does replaceLocal not change n to 99? Would you return a value or pointer for a small immutable configuration, and why?

## References

- [Go language specification](https://go.dev/ref/spec)
- [Go FAQ: stack and heap](https://go.dev/doc/faq#stack_or_heap)
- [Go 1.26 language changes](https://go.dev/doc/go1.26#language)
