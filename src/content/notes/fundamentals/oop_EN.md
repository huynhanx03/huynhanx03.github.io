---
title: "Object-Oriented Programming"
category: "Fundamentals"
tags: ["oop", "programming", "fundamentals", "design-patterns"]
---

# Object-Oriented Programming (OOP)

Object-Oriented Programming (OOP) is a software design philosophy that centers on **Objects**. Rather than focusing on a sequence of commands (Imperative), OOP focuses on modeling entities, data, and their interrelationships.

---

## 1. Encapsulation - Protecting Integrity

**Essence:** Bundling data (Fields) and behaviors (Methods) into a single unit (Class) while **hiding** internal implementation details via Access Modifiers (`private`, `protected`).

### Why avoid indiscriminate `public` access?

In large-scale systems, making attributes `public` (accessible freely from anywhere) is akin to handing your house keys to any passerby.

-   **Accidental Corruption:** Code anywhere can assign invalid values without validation. For example, setting `age = -5` or `balance = 999999999` on a newly created account.
-   **Leaky Logic:** If external modules interact directly with data, any change to the internal data structure (e.g., switching from `int` to `long` for optimization) will break every external reference.
-   **Broken Invariants (Consistency):** An object often has internal rules (e.g., `total = price * quantity`). If `price` is public, someone could change it without updating `total`, leading to immediate data inconsistency.

**Solution:** Always prioritize `private`. Expose only what is strictly necessary through controlled "gateways" (Getters/Setters or Business Methods).

```java
public class BankAccount {
    private double balance; // Strictly protected data

    public void deposit(double amount) {
        if (amount > 0) {
            balance += amount;
        }
    }

    public double getBalance() {
        return balance;
    }
}
```

---

## 2. Inheritance - Sharing the "Bloodline" (Is-a)

**Essence:** Establishing a parent-child relationship. A subclass inherits characteristics and methods from a superclass to achieve **Code Reuse** without rewriting.

- **Key Distinction:** Inheritance focuses on inheriting **Source Code** and **Data Structures**. It creates a rigid hierarchy.
- **Risks:** Leads to **Tight Coupling**. If the parent class changes its logic, multiple subclasses might "break" as a result (**Fragile Base Class**).

```java
public class Vehicle {
    protected String brand = "Ford";
    public void honk() { System.out.println("Tuut, tuut!"); }
}

public class Car extends Vehicle {
    private String modelName = "Mustang";
}
// Car doesn't need to rewrite honk() but can still use it.
```

---

## 3. Abstraction - The "Blueprint/Contract"

**Essence:** Focusing on **Defining** what an object must do, rather than how it does it.

> - **Abstract Class:** What it **IS** (Identity/Is-a). Used when objects share the same ancestry (e.g., Dogs and Cats are Animals). We use abstract classes to group common traits of ancestors.
> - **Interface:** What it **CAN DO** (Capability/Can-do). Used for cross-species skills (e.g., both Birds and Airplanes are `Flyable`). We use interfaces for entities that are unrelated but share common behaviors.

```java
// Interface: "What it can do" (Behavioral Contract)
interface Flyable {
    void fly(); 
}

// Abstract Class: "What it is" (Genetic Identity)
abstract class Bird {
    abstract void sing();
}
```

---

## 4. Polymorphism - "Runtime Morphing"

**Essence:** Allowing a common identifier (Interface/Parent) to represent various actual entities, with each entity choosing how to act at the time of execution.

### Distinguishing Abstraction vs. Polymorphism

It is easy to confuse the two. Think of it simply:
- **Abstraction** is for **Planning** (Design-time). We say: "I need something that can make a sound (`makeSound`)".
- **Polymorphism** is for **Execution** (Run-time). When we call `makeSound()`, the system automatically chooses between a Dog's bark or a Cat's meow based on the actual object held.

```java
public void performSound(Animal a) {
    // Abstraction allows us to write this method without knowing the specific type of 'a'.
    // Polymorphism selects the correct sound for 'a' during runtime.
    a.makeSound(); 
}
```

---

### Summary Table

| Pillar | Essence | Representative Question |
| :--- | :--- | :--- |
| **Encapsulation** | Information Security | Who is authorized to modify this data? |
| **Inheritance** | Source Code Reuse | Does it share the same bloodline as the parent? |
| **Abstraction** | Contractual Design | What IS it (Abstraction) and what CAN it do (Interface)? |
| **Polymorphism** | Runtime Morphing | How will it behave during execution? |
