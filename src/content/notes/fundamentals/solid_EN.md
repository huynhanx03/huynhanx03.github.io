---
title: "SOLID Principles"
category: "Fundamentals"
tags: ["oop", "programming", "fundamentals", "design-patterns"]
---

# The 5 SOLID Principles

SOLID is a set of five design principles that make software designs more understandable, flexible, and maintainable. These serve as the bedrock for professional software architecture.

---

## S - Single Responsibility Principle

**One class, one responsibility**

-   **Mindset:** A class should have one, and only one, reason to change.
-   **The Problem:** If a class handles both Business Logic and Logging, a change in the logging mechanism forces the entire class (including core logic) to be re-compiled and re-tested.

```java
// VIOLATION: Class doing too many things
class UserService {
    void register() { /* Registration logic */ }
    void sendEmail() { /* Email logic */ }
}

// ADHERENCE: Segregated responsibilities
class UserService {
    void register() { /* Only handles registration */ }
}
class EmailService {
    void send() { /* Only handles emails */ }
}
```

---

## O - Open/Closed Principle

**Open for extension, closed for modification**

-   **Mindset:** You should be able to add new functionality (open) without modifying stable, existing source code (closed).
-   **Solution:** Introduce new Classes that implement an Interface instead of using `if/else` blocks to hijack existing logic.

```java
// VIOLATION: Adding a new payment type requires modifying the process() method
class PaymentService {
    void process(String type) {
        if (type.equals("CreditCard")) { /* ... */ }
    }
}

// ADHERENCE: Add Momo/PayPal simply by creating a new Class
interface PaymentMethod {
    void pay();
}
class CreditCard implements PaymentMethod {
    public void pay() { /* ... */ }
}
```

---

## L - Liskov Substitution Principle

**Inheritance integrity**

-   **Mindset:** Objects of a superclass should be replaceable with objects of its subclasses without breaking the application.
-   **The Pitfall:** If a subclass breaks the behavioral contract established by the parent (e.g., throwing an exception where the parent would execute successfully), you've violated LSP.

```java
// THE CLASSIC ERROR: An Ostrich is a Bird but cannot fly
class Bird {
    void fly() { /* Flying... */ }
}
class Ostrich extends Bird {
    @Override
    void fly() {
        throw new UnsupportedOperationException("I cannot fly!");
    }
}
```

---

## I - Interface Segregation Principle

**Segregate interfaces**

-   **Mindset:** No client should be forced to depend on methods it does not use.
-   **Solution:** Split a "Fat Interface" into several specialized, smaller interfaces.

```java
// VIOLATION: A Robot doesn't eat but is forced to implement the eat() method
interface Worker {
    void work();
    void eat();
}

// ADHERENCE: Segregated interfaces
interface Workable { void work(); }
interface Eatable { void eat(); }

class Robot implements Workable { /* Only works, does not eat */ }
```

---

## D - Dependency Inversion Principle

**Invert dependencies**

-   **Mindset:** High-level modules should not depend on low-level modules; both should depend on Abstractions (Interfaces).
-   **Benefit:** Easily swap underlying components (e.g., switching from MySQL to Postgres) without modifying the core business logic.

```java
// VIOLATION: Switch is hard-coded to depend on a LightBulb
class Switch {
    private LightBulb bulb; 
}

// ADHERENCE: Depend on an Interface
class Switch {
    private Switchable device; // Can toggle any Switchable device
}
interface Switchable {
    void turnOn();
}
```
