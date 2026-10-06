---
title: "Structs"
category: "Go"
tags: ["golang", "structs", "fundamentals"]
---

# Structs: Data Structure Anatomy

In the Go ecosystem, there is no concept of a "Class." Instead, we utilize **Structs** to aggregate related data fields into a single cohesive unit. A Struct serves as a foundational blueprint for representing complex real-world entities and system configurations.

---

## 1. Definition and Initialization

Structs are defined using the `type` and `struct` keywords. Initialization can be performed using various semantic styles:

```go
type User struct {
    ID       int
    Name     string
    Email    string
    IsActive bool `json:"is_active"` // Field tags: Metadata for JSON or DB mapping
}

func main() {
    // Style 1: Field-indexed initialization (Recommended for clarity and robustness)
    u1 := User{
        ID:       1,
        Name:     "An",
        Email:    "an@example.com",
        IsActive: true,
    }

    // Style 2: Positional initialization (Concise but fragile if the struct definition changes)
    u2 := User{2, "Binh", "binh@example.com", false}
}
```

---

## 2. Interaction and Mutability

Use the dot operator `.` to access or modify internal fields.

```go
fmt.Println(u1.Name)
u1.IsActive = false
```

### Struct Comparability
Two Struct instances can be compared using the `==` operator only if all their constituent fields are of **comparable types**.
-   **Comparable**: `int`, `string`, `bool`, `float`, pointers, and Arrays.
-   **NOT Comparable**: `slice`, `map`, and `func`. If a Struct encapsulates any of these, an equality check will trigger a compilation error.

---

## 3. Memory Anatomy (Alignment & Padding)

In performance-critical systems, the lexical order of struct fields significantly impacts the memory footprint and CPU cache efficiency.

### Data Alignment Mechanisms
CPUs typically fetch data in multi-byte blocks (words) — e.g., 8 bytes on 64-bit architectures. To optimize throughput, the Go compiler aligns fields to word boundaries.

```go
type SuboptimalAlignment struct {
    A bool  // 1 byte
    B int64 // 8 bytes
    C bool  // 1 byte
} // Consumes 24 bytes due to 7+7 bytes of internal/trailing padding.

type OptimizedAlignment struct {
    B int64 // 8 bytes
    A bool  // 1 byte
    C bool  // 1 byte
} // Consumes 16 bytes with only 6 bytes of padding.
```

**Architectural Best Practice:** Always order fields from largest to smallest. This heuristic minimizes **Padding**, reduces the object's memory footprint, and enhances CPU pipeline performance.

---

## 4. Structural Conversion Rules

Go supports explicit conversion between two distinct Struct types if they possess identical underlying structures (matching field names, types, and sequence).

```go
type Person struct {
    Name string
    Age  int
}

type Employee struct {
    Name string
    Age  int
}

p := Person{"An", 25}
e := Employee(p) // Valid conversion due to structural identity
```

*Note: If Field Tags differ, the types are considered distinct, requiring manual mapping or reflection-based conversion.*

---

## 5. The Empty Struct (`struct{}`) - 0-Byte Footprint

The `struct{}` is a specialized type that consumes **zero memory**. It is a powerful tool for memory-safe signaling and state management:

1.  **Pure Signaling (Channels)**: Facilitates event broadcasting without allocating a data payload.
    ```go
    done := make(chan struct{})
    ```
2.  **Zero-overhead Sets**: Utilized as a map value to implement high-performance unique collections (as seen in the Maps chapter).
3.  **Encapsulated logic**: Methods can be attached to an empty struct to group logic without maintaining internal state.

---

## 6. Synergy with Pointers

Pointers are frequently used with Structs to bypass the overhead of copying large data blocks and to enable in-place mutations within functions.

```go
func UpdateName(u *User, newName string) {
    u.Name = newName // Go provides automatic dereferencing (syntactic sugar for (*u).Name)
}
```

---

## 7. Anonymous Structs

Anonymous structs are utilized for transient, one-off data requirements, such as handling complex JSON responses or structuring Table-Driven Tests.

```go
dto := struct {
    Title string
    Code  int
}{"Report", 200}
```
