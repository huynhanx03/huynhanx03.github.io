---
title: "Go: language, program structure, and tools"
category: "Go"
tags: ["golang", "philosophy", "intro"]
description: "Go is a compiled, statically typed language with automatic memory management. This note explains a small Go program and why Go favors code that is easy to read and maintain."
updated: 2026-10-14
translationKey: "go/intro"
---

Go is a compiled, statically typed language with automatic memory management. This note explains a small Go program and why Go favors code that is easy to read and maintain.

## 1. What problem was Go designed to solve?

Robert Griesemer, Rob Pike, and Ken Thompson began designing Go at Google in 2007; it was announced in 2009. Influences include C, the Pascal/Modula/Oberon family, and CSP-style concurrency. These influences help explain its syntax, packages, and channels; they do not imply C memory semantics.

Practical goals include team development, fast compilation, readable code, clear dependencies, and support for concurrent work. Go has 25 keywords, but a small keyword count does not make every problem simple. Ownership, errors, types, and synchronization still matter.

## 2. Read a first program

```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, Go")
}
```

`package main` declares the file’s package. `import "fmt"` makes formatting and printing tools available. `func main()` is the entry point of an executable; statements in its body run in order. Library packages normally have another name and do not need a main function.

The Hello program above is a complete file. Short examples in later notes are usually function-body fragments: add package/import declarations and place them in the appropriate function before running. Names such as ctx, items, and db represent caller-provided data, not predeclared Go variables.

## 3. Modules, packages, and files

A module is a dependency-management unit described by `go.mod`. One module may contain several packages; a package normally consists of Go files in one directory. Files in a package share package-level declarations. Imports name package paths, not individual files.

```sh
go mod init example.com/hello
go run .
go build .
```

These commands create a module, compile and run the current package, and build it. For a main package, build produces an executable. cgo or particular build modes can introduce system dependencies, so a Go binary is not necessarily fully statically linked.

## 4. Make errors and behavior explicit

Go commonly returns an error as the final result. The compiler does not force you to handle every error: ignoring it can still compile. Code should therefore show the decision on failure: propagate, retry within a limit, or continue with a valid fallback.

```go
data, err := os.ReadFile("config.json")
if err != nil {
    return fmt.Errorf("read config: %w", err)
}
_ = data
```

This is a fragment inside a function returning `error`, using `os` and `fmt`. Checking the error before using data prevents accidental continuation with invalid input. The Errors note develops this pattern.

## 5. Composition, interfaces, and concurrency

Go organizes data with structs, behavior with methods, and contracts with interfaces. Composition assembles components; embedding shortens access without creating a class hierarchy. Goroutines and channels coordinate work, while mutexes remain useful for shared state. Channels do not eliminate races when multiple goroutines still mutate the same object.

## 6. Tools and learning order

`go fmt ./...` formats packages; `go build ./...` compiles them; `go run .` runs an application; `go mod tidy` updates dependencies to match the code. `go test ./...` runs tests, and `go vet ./...` reports suspicious patterns. Build checks compilation, test checks behavior, and vet finds suspicious patterns; each tool answers a different question.

A useful order is variables and types → control flow → functions and errors → pointers, slices, maps → structs, methods, interfaces, composition → goroutines, channels, context → GC. The runtime is the support code used while a program runs, including scheduling, allocation, and garbage collection.

## Worked example

### Scenario: starting a small program

Suppose you want a tool that totals expenses. Begin with a module and a runnable program, then extract packages when responsibilities become clear. An initial layout:

```text
expense/
├── go.mod
└── main.go
```

Inside expense, `go mod init example.com/expense` establishes the module identity; `go run .` compiles and runs the current package. The module path need not already be a public repository for local execution. The following main.go is a complete program.

```go
package main

import "fmt"

func total(expenses []int) int {
    sum := 0
    for _, amount := range expenses {
        sum += amount
    }
    return sum
}

func main() {
    fmt.Println(total([]int{120, 80, 50})) // 250
}
```

Read the flow as main → total → result. Represent money as integers in an agreed unit, such as dong or cents; this example does not handle overflow or multiple currencies. As the program grows, separate input handling from calculation so total remains understandable and reusable.

## Check your understanding

Explain how a module differs from a package. Then identify the entry point, dependency, and output-producing statement in Hello, Go.

## References

- [Go FAQ](https://go.dev/doc/faq)
- [Effective Go](https://go.dev/doc/effective_go)
