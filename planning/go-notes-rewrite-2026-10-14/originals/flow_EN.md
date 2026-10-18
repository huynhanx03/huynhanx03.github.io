---
title: "The Logic Flow"
category: "Go"
tags: ["golang", "basics", "flow-control", "loops"]
---

# Control Flow: The Stream of Source Code

In any programming language, controlling the execution flow (Control Flow) is fundamental knowledge. Go keeps this part extremely lean by removing redundant syntax and focusing maximally on clarity.

## 1. `if` Condition Structure

`if` in Go is very familiar, but there are two notable differences:
1. No parentheses `()` needed around the condition.
2. An **Initialization Statement** can be executed right before checking the condition.

```go
// Basic way
if x > 10 {
    fmt.Println("X is greater than 10")
}

// Advanced way: Declare variable right in the if statement
// Variable v only exists within the Scope of this if/else block
if v := calculateValue(); v < 100 {
    fmt.Println("Small value:", v)
} else {
    fmt.Println("Large value:", v)
}
```

## 2. The Power of `switch`

`switch` in Go is much more flexible and powerful than in C or Java:
- You don't need to write `break` at the end of each branch (case) because Go does it automatically.
- You can compare all data types, not just limited to integers.
- You can use `switch` without a comparison value (**Switch true**). In this case, it acts like a long `if-else if` chain, making the source code cleaner.

```go
// Basic switch with initialization
switch os := runtime.GOOS; os {
case "darwin":
    fmt.Println("macOS Operating System")
case "linux":
    fmt.Println("Linux Operating System")
default:
    fmt.Println("Other Operating Systems")
}

// Switch replacing if-else (Switch true)
hour := time.Now().Hour()
switch {
case hour < 12:
    fmt.Println("Good morning")
case hour < 17:
    fmt.Println("Good afternoon")
default:
    fmt.Println("Good evening")
}
```

### The `fallthrough` Keyword
Although Go automatically breaks at the end of each case, sometimes you actually want the program to continue running to the case below. You can use `fallthrough`. However, be cautious as it makes logic more difficult to control.

## 3. `for` - The Only Loop

Go does not use `while` or `do-while`. Every loop scenario is encapsulated in the `for` keyword. This creates consistency and is extremely easy to read.

### Traditional `for` loop
```go
for i := 0; i < 10; i++ {
    fmt.Println(i)
}
```

### Using `for` as `while`
By omitting the initialization and step parts, you have a condition-checking loop similar to `while`.
```go
sum := 1
for sum < 1000 {
    sum += sum
}
```

### Infinite Loop
```go
for {
    // Executes forever until a break or return is encountered
}
```

### Iterating over Collections (Using `range`)
This is the most common and safest method to iterate over an Array, Slice, Map, or String.
```go
nums := []int{2, 3, 4}
for index, value := range nums {
    fmt.Printf("Index: %d, Value: %d\n", index, value)
}
```

> **Unicode Decoding:** When iterating with `range` over a string, Go will automatically decode UTF-8 characters (Runes). If the string contains multi-byte characters (like Vietnamese or Emojis), `index` will be the byte starting position of that character, not simply the character count.

### Labeled Loops
In complex nested loop situations, Go allows you to set a Label so you can `break` or `continue` out of the outer loop.

```go
outer:
    for i := 0; i < 5; i++ {
        for j := 0; j < 5; j++ {
            if i*j > 10 {
                break outer // Exit both loops
            }
        }
    }
```

---

> Always prioritize using `range` when working with Collections as it makes code safe, avoiding out-of-bounds access errors.

---
