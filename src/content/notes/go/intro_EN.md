---
title: "Go: from one source file to modules and tools"
category: "Go"
tags: ["golang", "philosophy", "intro"]
description: "Read a small Go program, distinguish files, packages, and modules, and understand the roles of the compiler, runtime, and tools."
updated: 2026-10-15
translationKey: "go/intro"
---

Suppose you need a tool to total today's expenses. Before dividing code into directories or running several tasks concurrently, you need to know where a Go program starts, how its files relate, and which command turns source code into a running program.

This article starts with a complete file and works outward to project organization. Pointers, interfaces, and goroutines are not prerequisites; they have a place in the learning path at the end.

## Read a program from its entry point

Save this as `main.go` in a separate directory:

```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, Go")
}
```

`package main` identifies the package to which the file belongs. A package groups related declarations; the name `main` has a special role when producing an executable. After package initialization finishes, the runtime calls this package's `main` function. In this small program, follow execution into `func main()` and then to the printing statement.

`import "fmt"` makes a standard library package for formatting and printing available in this file. The dot in `fmt.Println` selects `Println` from that imported package. The expected result is `Hello, Go` followed by a newline. Statements in a function body execute in order unless a control structure changes that flow.

Go is **statically typed**: the compiler checks expression types before execution. It is also **compiled**: source code is translated into executable code. `go run` can make execution look like one step, but it still compiles before running. Successful compilation does not establish that an algorithm or business rule is correct.

## From a file to a package and module

Ordinary Go files in the same directory belong to the same package and share package-level declarations. You could move a total-calculating function into `total.go`, keep `package main`, and call it from `main.go`. No import of another file in the same package is needed. Imports themselves are scoped to a file: each file using `fmt` must import it.

A **module** contains one or more packages and manages their dependencies. Its root `go.mod` file records the module path, declared Go version, and required dependencies. The module path combined with a subdirectory forms a package's import path; an import does not name an individual `.go` file.

This layout is enough for a first project:

```text
expense/
├── go.mod
└── main.go
```

After installing Go, open a terminal in `expense` and use these commands in order:

```sh
go mod init example.com/expense
go run .
go build .
```

`go mod init` creates `go.mod`; run it once when starting a module, not before each execution. `example.com/expense` is an illustrative identity and need not already be a public repository for local execution. `go run .` selects the current directory's package, compiles its applicable files, and runs it. `go build .` builds the package; because this is a `main` package, it produces an executable you can run later.

An extra file alone is no reason to introduce another package. Extract a package when a group of declarations has a clear responsibility and benefits from a dependency boundary. Library packages normally use names other than `main`, provide functions or types to other packages, and do not need a `func main()` entry point.

## Put the calculation in a function

Replace `main.go` with this complete program. Its purpose is to distinguish coordination from calculation, rather than build an entire expense-management system.

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

`main` supplies three expenses to `total`. The function starts at zero, adds 120, then 80, then 50, and returns 250 to the printing statement. `[]int` describes a slice of integers; `range` obtains successive elements. Later articles explain those constructs. Here, follow the inputs into the function and the result back out.

All numbers need the same unit, such as dong or cents. The example does not handle multiple currencies and assumes the total fits in `int`. These limits belong to the calculation's contract even though the compiler accepts the program. Input from files or requests can later change while the calculation remains reusable.

Other examples in this series may be fragments. Put statements inside `main` or another appropriate function, declare functions outside `main`, and add the imports being used. Names such as `items`, `ctx`, and `db` usually represent data supplied by the example or caller, rather than predeclared Go names. Output comments describe expected results under the rules being explained.

## Errors belong to the data flow

Adding three numbers already in memory is less failure-prone than reading a configuration file. A file may be absent or inaccessible. Go commonly expresses this with multiple results, placing an `error` last:

```go
data, err := os.ReadFile("config.json")
if err != nil {
    return fmt.Errorf("read config: %w", err)
}
_ = data
```

This fragment belongs in a function returning `error` and needs `os` and `fmt`. If reading fails, the `if` branch returns the error with context for the caller. Only execution after that branch uses data according to the success contract. `_ = data` stands in for processing omitted from the example.

The compiler does not require meaningful handling of every error. Ignoring one can still compile. The author must decide whether to propagate failure, retry within a limit, or provide a valid fallback. [Functions](/en/notes/go/functions/) explains multiple results; the errors article develops handling and wrapping.

## Design choices behind the syntax

Robert Griesemer, Rob Pike, and Ken Thompson began designing Go at Google in 2007; it was announced in 2009. Its syntax draws from C, its program organization from the Pascal/Modula/Oberon family, and its concurrency ideas from CSP. Those influences do not imply C memory-management rules.

Go aims to support maintaining software in teams: readable code, clear dependencies, compilation suitable for development cycles, and concurrent work. Its 25 keywords keep the language surface relatively small; programmers still need to understand types, errors, and shared data.

Structs group data, methods attach behavior to types, and interfaces describe required behavior. Composition assembles components; embedding helps access components without creating a parent/child class model. Goroutines and channels coordinate work. Mutexes remain useful for protecting shared state; sending a pointer through a channel does not itself stop the sender from modifying the same object.

Go manages memory automatically. The **runtime** supports the executing program, including goroutine scheduling, allocation, and garbage collection. A Go executable includes the runtime support it needs. However, cgo and some build modes can introduce system dependencies, so do not assume every binary is fully statically linked.

## Choose a tool for the question being asked

| Tool | Purpose |
| --- | --- |
| `go fmt ./...` | Apply standard formatting to packages |
| `go build ./...` | Check and compile packages |
| `go run .` | Compile and run the current application |
| `go test ./...` | Run package tests |
| `go vet ./...` | Find some patterns that may indicate mistakes |
| `go mod tidy` | Update dependency requirements and checksums to match code |

`./...` selects applicable packages below the current directory. Formatting standardizes presentation; building checks whether code compiles; tests exercise behaviors expressed in tests; vet identifies additional suspicious patterns. No single tool proves an entire program correct.

Continue with [variables and types](/en/notes/go/variables/), then control flow and functions. Next come pointers, slices, and maps; structs, methods, interfaces, and composition; then goroutines, channels, context, and GC. This sequence gives each concept enough foundation to explain its behavior.

## Check your understanding

**1.** If you move `total` into `total.go` in the same directory with the same `package main`, must `main.go` import `total.go`?

**2.** `go build .` succeeds, but expenses use inconsistent units. What has the build established, and what belongs to the data contract?

**Explanation:** Files in one package share package declarations; they do not import each other. Each file directly using another package still needs its own import. Building establishes compilation requirements, including type rules; it cannot know whether 120 means dong or cents. Units, valid ranges, and calculation rules need to be chosen, expressed, and checked at the application level.

## References

- [Go FAQ](https://go.dev/doc/faq) — history, design goals, and runtime.
- [Create a Go module](https://go.dev/doc/tutorial/create-module) — modules and initialization.
- [Effective Go](https://go.dev/doc/effective_go) — organization and expression of Go code; use version-specific documentation for later features.
