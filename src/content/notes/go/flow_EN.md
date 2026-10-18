---
title: "Control flow: following branches and loop iterations"
category: "Go"
tags: ["golang", "basics", "flow-control", "loops"]
description: "Follow if, switch, for, and range to determine which branch runs, where a loop stops, and which variables are reused or newly created."
updated: 2026-10-15
translationKey: "go/flow"
---

The string `"8080"` can become a valid port number; `"abc"` cannot be read as a number; `"70000"` can be read but falls outside the accepted range. These paths need different conditions. Control flow expresses when to continue, choose another branch, or stop altogether.

This article assumes [variables, types, and blocks](/en/notes/go/variables/). Examples are independent: declare functions at package scope, put statements inside functions, and add the imports identified near each example. Output comments describe expected results.

## if: test a condition and limit a variable's scope

An `if` condition must be boolean. Zero or an empty string cannot stand for `false`, and parentheses around the condition are unnecessary.

```go
items := []string{"book", "pen"}
if value := len(items); value == 0 {
    fmt.Println("empty")
} else {
    fmt.Println(value) // 2
}
// value is not in scope here.
```

The initialization before `;` runs once before the condition is checked. With two elements, `value == 0` is false and execution enters `else`. `value` exists throughout this `if` statement, including its associated `else if` and `else` branches, and then goes out of scope. Declaring it here expresses that it belongs to this decision.

If initialization requires several steps, write them before the `if` to keep the flow readable. Place `else` on the same line as the preceding `}`: Go's semicolon-insertion rules mean another line layout may no longer form a valid `if` statement.

## Return early to expose the successful path

Implement the three port cases in a function. [Functions](/en/notes/go/functions/) explains multiple-result syntax; here, follow the point at which execution ends.

```go
func parsePort(raw string) (int, error) {
    port, err := strconv.Atoi(raw)
    if err != nil {
        return 0, fmt.Errorf("parse port: %w", err)
    }
    if port < 1 || port > 65535 {
        return 0, fmt.Errorf("port outside range: %d", port)
    }
    return port, nil
}
```

Import `strconv` and `fmt`. For `"abc"`, `Atoi` returns an error and the first `return` ends the function; range validation never executes. For `"70000"`, conversion succeeds but the second condition holds, so the function ends with a domain error. For `"8080"`, both error branches are skipped and the function returns `(8080, nil)`.

`port < 1 || port > 65535` combines two invalid cases with OR. This example deliberately rejects port zero; some APIs give zero another meaning, so accepting it requires a different contract. Conversion to `int` establishes numeric form without establishing business meaning.

Ending each error branch immediately leaves the successful path reading straight down. There is no need for an extra `else` around everything following a `return`.

## switch selects one matching case

When several branches examine the same value, `switch` puts the alternatives together:

```go
switch os := runtime.GOOS; os {
case "darwin", "linux":
    fmt.Println("Unix-like")
default:
    fmt.Println(os)
}
```

Import `runtime` and `fmt`. Initialization gives the operating-system string the local name `os`; this variable is unrelated to the `os` package. Either `"darwin"` or `"linux"` selects the shared case body. Other systems reach `default`. Output therefore depends on the system running the program.

An expression switch selects the first matching case and finishes after that case; no `break` is needed at each case's end. Comparisons must obey type and equality rules. For example, an ordinary expression switch cannot use a slice to compare two slices directly.

Omitting the expression means `switch true`, allowing different conditions:

```go
hour := 10
switch {
case hour < 12:
    fmt.Println("morning")
case hour < 17:
    fmt.Println("afternoon")
default:
    fmt.Println("evening")
}
```

Ten satisfies both initial conditions, but only `morning` is printed because the first case wins. Reversing them would put ten in `afternoon`; order belongs to the logic. This example assumes `hour` is already within 0–23 and does not validate other inputs.

`fallthrough` is an explicit exception: after the current case, it executes the next case's body without testing that case's condition. If several values merely share handling, grouping them in one `case` is usually clearer. A **type switch** examines an interface's dynamic type under separate rules; it does not allow `fallthrough`.

## for: follow initialization, condition, and the next step

Go uses `for` for counted loops, conditional loops, and loops with no condition:

```go
for i := 0; i < 3; i++ {
    fmt.Println(i)
}
// 0
// 1
// 2

sum := 1
for sum < 16 {
    sum *= 2
}
fmt.Println(sum) // 16

finished := false
for {
    if finished {
        break
    }
    finished = true
}
```

The first loop initializes `i` once. It checks `i < 3` before each iteration, then performs `i++` after the body to prepare the next one. At three, the condition fails and the body no longer runs. The second loop needs no separate counter: its state is 1 → 2 → 4 → 8 → 16, when the condition becomes false.

The third loop has no condition and cannot stop by itself. On its first iteration, `finished` is false and becomes true; on the next, `break` exits. This small model explains looping until a stop signal. It is not a concurrent waiting technique: real waiting needs suitable signaling to avoid spinning or a data race.

`continue` skips the remaining body and advances to the next iteration; in a three-part `for`, the post statement still runs. `break` exits the nearest relevant `for`, `switch`, or `select`. `return` exits the whole function. Consequently, a `break` inside a switch nested in a loop normally exits the switch while leaving the loop running. A panic can also leave a loop through panic unwinding; it is not an ordinary loop-termination mechanism.

## range: understand what each value represents

For a slice, `range` can return an index and a copy of the element value. Write through the index to update the original list:

```go
nums := []int{2, 3, 4}
for i, value := range nums {
    nums[i] = value * 2
}
fmt.Println(nums) // [4 6 8]
```

Assigning only `value = value * 2` changes the temporary variable without writing `nums[i]`. Element-copy rules also apply when ranging over arrays. If an element is a pointer or contains references, its copy may still lead to shared data; copying an element is not deep cloning.

Ranging over a slice does not adjust the iteration count to appends inside the body. It uses the slice value obtained at the start for traversal. Changes to elements in a still-shared backing array can be visible, but do not rely on range to visit newly appended elements. For a growing queue, choose a loop whose condition reflects that queue. Range removes the need to write traversal bounds; other indexing in the body can still panic.

Strings give the two iteration values different meanings:

```go
for byteIndex, r := range "éa" {
    fmt.Println(byteIndex, r)
}
// 0 233
// 2 97
```

`é` uses two UTF-8 bytes, so `a` starts at offset two. `r` is a decoded rune with code point 233 or 97, rather than the byte at that offset. A user-visible character may contain several runes, including combining marks or some emoji sequences. At invalid UTF-8, range produces replacement rune `U+FFFD` and advances one byte at the error position.

Other sources have their own traversal contracts:

| Source | Behavior to remember |
| --- | --- |
| Map | Produces key/value pairs; order is unspecified |
| Channel | Receives until closure and consumption of buffered values |
| Nil slice or nil map | Executes zero iterations |
| Nil channel | Blocks forever unless something else terminates the function |

Go 1.22 added `for i := range 3`, producing 0, 1, and 2. Go 1.23 added range over iterator functions with appropriate signatures. These extensions are unnecessary for understanding the slice and string examples here.

## Per-iteration variables and closures depend on language version

A closure can retain a loop variable to read after the loop. Closures let us observe the variable without goroutines or nondeterministic scheduling:

```go
var readers []func() int
for _, value := range []int{10, 20, 30} {
    readers = append(readers, func() int { return value })
}
fmt.Println(readers[0](), readers[1](), readers[2]()) // 10 20 30
```

This output requires Go 1.22 or newer language semantics: loop variables declared with `:=` are separate for each iteration. The first closure retains the variable holding ten; the second retains the one holding twenty. The rule also affects three-part loops with variables declared in their initialization.

If you declare `var value int` before the loop and use `for _, value = range ...`, every iteration assigns the same variable, and all three closures read thirty after the loop. Before Go 1.22 semantics, even the `:=` form reused variables across iterations. The [Go 1.22 changes](https://go.dev/doc/go1.22#language) document this transition. The package's applicable language version, normally declared by the `go` line in `go.mod`, matters alongside the installed toolchain. For goroutines, passing a value as a function argument remains an explicit way to show data for that invocation; shared-data synchronization is a separate concern.

## Exiting several nested levels

```go
outer:
for i := 0; i < 5; i++ {
    for j := 0; j < 5; j++ {
        if i*j > 10 {
            break outer
        }
    }
}
```

The condition first holds at `i=3`, `j=4`. `break outer` exits the labeled outer loop, so later values are never reached. An unlabeled `break` there would only exit the `j` loop. `continue outer` skips the rest of the outer iteration and advances the `i` loop.

A label is useful when “leave both loops” is exactly the intended action. If understanding a fragment requires several labels, extracting the search or check into a function with `return` can clarify its responsibility.

## Trace the flow yourself

**1.** Replace `nums[i] = value * 2` with `value = value * 2`. Does `nums` change?

**2.** With `hour=10`, put `case hour < 17` before `case hour < 12`. Which branch runs?

**3.** In the closure example, replace each iteration's declaration with a preexisting `value` assigned using `=`. Why does the post-loop output change even with Go 1.22 or newer?

**Explanations:**

1. No. Only the copied element in `value` is reassigned; updating an integer slice requires writing through its index.
2. The `<17` branch runs because it matches first. Switch does not choose the “most specific” condition automatically.
3. All functions read the same variable, whose final value is thirty. Fresh-per-iteration semantics apply to variables the loop declares, not an existing variable it assigns.

## References

- [Go specification: if](https://go.dev/ref/spec#If_statements), [switch](https://go.dev/ref/spec#Switch_statements), [for and range](https://go.dev/ref/spec#For_statements) — branch selection and iteration values.
- [Go 1.22 language changes](https://go.dev/doc/go1.22#language) — loop variables and integer range.
- [Fixing For Loops in Go 1.22](https://go.dev/blog/loopvar-preview) — language-version condition for the loop-variable change.
