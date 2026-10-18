---
title: "Stack vs Heap: Memory Anatomy"
category: "Operating System"
tags: ["memory", "stack", "heap", "gc", "fundamentals"]
---

# Memory Management: Stack vs Heap

In modern operating systems and programming, a program's memory is typically divided into two core regions: **Stack** and **Heap**. Understanding their differences is crucial for writing high-performance code and resource optimization.

---

## 1. Stack

The Stack is a region managed according to the LIFO (Last In, First Out) principle.

### Technical Characteristics:
- **Organization:** Always contiguous memory. Managed via the **Stack Pointer**.
- **Scope:** Private to each Thread or Goroutine (Isolation).
- **Storage:** Local variables, parameters, and return addresses.
- **Speed:** Extremely fast (O(1)). Requires only a pointer shift.
- **Size:** Small initial size with automatic growth.

### 1.1. Risk: Stack Overflow
Despite its speed, the Stack has depth limits. **Stack Overflow** occurs when:
- **Deep/Infinite Recursion**: Each function call creates a new Stack Frame. Without an exit condition, the Stack runs out of space.
- **Over-allocation**: Declaring massive local arrays (e.g., `var buf [1000000]int`) inside a function can blow the stack instantly.

---

## 2. Heap

The Heap is shared memory used across the entire program, not restricted by LIFO rules.

### Technical Characteristics:
- **Organization:** Non-contiguous, scattered blocks.
- **Scope:** Shared across the entire program.
- **Storage:** Long-lived objects, shared data, or dynamically sized data.
- **Speed:** Slower due to searching for available blocks (Free list).
- **Management:** Reclaimed via the **Garbage Collector (GC)**.

### 2.1. The Issue: Fragmentation
This is the "nightmare" of the Heap that the Stack never encounters:
- **Reason:** The Heap allocates blocks of varying sizes and frees them at unpredictable times. Over time, "holes" (gaps) appear in memory.
- **Consequence:** Even if total free memory is sufficient, the system might fail to find a **contiguous** block large enough for a new target object.
- **Why is Stack Immune?** Because the Stack always operates contiguously by "stacking blocks" and reclaiming them in strict reverse order (LIFO), never leaving holes in the middle.

---

## 3. Quick Comparison

| Criteria | Stack | Heap |
| :--- | :--- | :--- |
| **Nature** | Contiguous (LIFO). | Free-form (Shared). |
| **Speed** | Very fast. | Significantly slower. |
| **Reclamation** | Immediate upon exit. | Handled by GC. |
| **Lifecycle** | Short-term. | Long-term/Shared. |

---

## 4. Insight: Escape Analysis (In Go)

Go uses **Escape Analysis** to decide:
- If a variable "escapes" function scope (e.g., returning a pointer): Move to **Heap**.
- If it stays within the function: Prioritize the **Stack**.

> Keeping data on the Stack reduces GC pressure, leading to better overall system performance.
