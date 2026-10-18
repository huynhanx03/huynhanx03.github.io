---
title: "Control flow: if, switch, for, and range"
category: "Go"
tags: ["golang", "basics", "flow-control", "loops"]
description: "Control flow determines which statements execute, how often, and where execution stops. This note connects syntax to behavior, especially variable scope and the values returned by range."
updated: 2026-10-14
translationKey: "go/flow"
---

Control flow determines which statements execute, how often, and where execution stops. This note connects syntax to behavior, especially variable scope and the values returned by range.

## 1. if and initialization

```go
if value := len(items); value == 0 {
    fmt.Println("empty")
} else {
    fmt.Println(value)
}
```

The condition must be boolean and needs no parentheses. value is scoped to the if and its corresponding else-if/else branches. Use this form when the variable belongs only to that decision; avoid squeezing complex work into one line. Put `else` on the same line as the preceding `}`.

## 2. Which branch does switch select?

```go
switch os := runtime.GOOS; os {
case "darwin", "linux":
    fmt.Println("Unix-like")
default:
    fmt.Println(os)
}

switch {
case hour < 12:
    fmt.Println("morning")
case hour < 17:
    fmt.Println("afternoon")
default:
    fmt.Println("evening")
}
```

An expression switch chooses the first matching case and does not automatically continue into the next case. Omitting the expression means switch true, so condition order matters. Comparisons still obey type and equality rules: not every type is a valid switch expression. A type switch separately examines an interface’s dynamic type.

`fallthrough` executes the next case’s body without testing that case’s condition. It applies to expression switches, not type switches. Often, grouping values in one case is clearer.

## 3. Three forms of for

```go
for i := 0; i < 3; i++ {
    fmt.Println(i)
}

sum := 1
for sum < 16 {
    sum *= 2
}

for {
    if finished {
        break
    }
}
```

The three-part loop has init, condition, and post: init runs once, and post runs after an iteration that continues. A condition-only loop replaces while. A loop without a condition runs until break/return or panic. `continue` advances to the next iteration; `break` exits the nearest loop/switch/select; `return` exits the function.

## 4. Does range return copies or original data?

```go
nums := []int{2, 3, 4}
for i, value := range nums {
    nums[i] = value * 2
}
fmt.Println(nums) // [4 6 8]

for byteIndex, r := range "éa" {
    fmt.Println(byteIndex, r)
}
// 0 233
// 2 97
```

For slices/arrays, value is an element copy: assigning it does not update nums[i]. For strings, the index is a byte offset and r is a UTF-8-decoded rune. One rune is not necessarily one user-visible character; combining marks and emoji may contain several runes. Map order is unspecified. Channel range receives until closure and buffer exhaustion; ranging over a nil channel blocks forever.

Range avoids writing index bounds for the iterated source, but the loop body can still contain invalid indexing. Do not change a slice’s length and assume range will visit appended elements. Go 1.22 also supports integer range; Go 1.23 range-over-function is an extension, not required for these examples.

## 5. Loop variables and closures by version

With Go 1.22 or newer language semantics, variables declared with `:=` in a loop are separate per iteration. Variables declared earlier and assigned with `=` remain shared between iterations. Passing a value as a goroutine argument is still explicit. These semantics depend on the package’s language version, not just the installed go binary.

## 6. Labeled loops

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

break outer exits the labeled outer loop. continue outer advances that outer loop. When many labels make control flow difficult to follow, extracting a function with a return is often clearer.

## Worked example

### Scenario: reading a value and returning early on invalid input

When validating input, let each error branch finish immediately. The successful path then reads straight down instead of being buried in nested if statements.

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

Input "8080" returns (8080, nil); "abc" stops at conversion; "70000" converts successfully but fails domain validation. These are distinct steps: decoding the data type and checking its meaning. Import fmt and strconv; this example deliberately rejects port 0.

## Check your understanding

Why does string range return indexes zero and two? Write a loop that updates a slice by index and another that exits two nested loops with a label.

## References

- [Go language specification](https://go.dev/ref/spec)
- [Go 1.22 loop changes](https://go.dev/doc/go1.22)
