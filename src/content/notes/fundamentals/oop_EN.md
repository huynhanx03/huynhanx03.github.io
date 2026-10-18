---
title: "OOP: organizing state, behavior, and contracts"
category: "Fundamentals"
tags: ["oop", "programming", "fundamentals", "design-patterns"]
description: "Understand encapsulation, inheritance, abstraction, and polymorphism through design decisions and Java examples."
updated: 2026-10-15
translationKey: "fundamentals/oop"
---

A bank account has a balance. If every part of a program can assign it directly, each caller must remember the rules for valid deposits. One missing check can leave the object in an invalid state.

Object-oriented programming (OOP) organizes data together with behavior responsible for keeping that data valid. This article uses Java to distinguish encapsulation, inheritance, abstraction, and polymorphism. These are related design perspectives; memorizing four names does not determine which classes a program should have.

The Java snippets are separate examples. Put class/interface declarations at the top level, methods inside a containing class, and statements such as `vehicle.honk()` inside `main`. Each fragment shows only what is needed for the design decision being discussed.

## An object takes responsibility for its state

An object has state, such as its current balance, and behavior, such as accepting a deposit. A **class** describes a type of object; an **instance** is a particular object created from that class. Two instances can share behavior while holding different state.

OOP still uses statements and sequences of operations. The distinction concerns responsibility: instead of having callers manipulate all data directly, an object exposes operations meaningful to the problem domain.

```java
final class BankAccount {
    private long balance;

    public void deposit(long amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("amount must be positive");
        }
        balance = Math.addExact(balance, amount);
    }

    public long getBalance() {
        return balance;
    }
}
```

The example uses integers in an agreed currency unit rather than `double`. `deposit(100)` changes an initial balance of 0 to 100; `deposit(-5)` throws before changing it. `Math.addExact` also rejects overflow of `long`. This illustrative class does not implement multithreaded synchronization or banking persistence.

A `private` field prevents arbitrary assignments by callers. More importantly, the method preserves an **invariant**: a property that must hold at valid object states. In an order where `total = price * quantity`, changing either input must preserve that relationship.

This is **encapsulation**: keeping data and responsibility for its updates behind a boundary. Getters and setters alone do not make a good design; an unrestricted balance setter still defeats that boundary. Business methods such as `deposit` express intent more clearly. Reducing dependencies on internal fields also makes representation changes easier when the public contract remains intact.

## Inheritance needs a meaningful substitution contract

```java
class Vehicle {
    public void honk() {
        System.out.println("Beep");
    }
}

class Car extends Vehicle {}

Vehicle vehicle = new Car();
vehicle.honk(); // Beep
```

`Car` inherits `honk`, avoiding a duplicate implementation. Java also permits a `Car` to be held through a `Vehicle` variable. **Inheritance** establishes a type relationship and can share implementation; reuse comes with dependency on the superclass.

An everyday “is-a” relationship does not prove a software contract is appropriate. If `Bird` promises every instance can fly, `Ostrich` cannot honor that promise. A separate capability contract may be a better fit. If the goal is simply to reuse a component, consider composition: hold it in a field and delegate instead of becoming its subtype.

## Abstraction defines what the caller needs to know

```java
interface Flyable {
    void fly();
}

abstract class Bird {
    abstract void sing();
}
```

**Abstraction** selects the characteristics relevant to a purpose and hides implementation details the caller does not need. A caller using `Flyable` needs flight behavior without knowing whether the object is a bird or aircraft.

Interfaces and abstract classes are tools for expressing abstraction, not its entire definition. An abstract class can share state and implementation with subclasses; an interface commonly expresses a shared contract. Do not decide solely by the slogan “abstract classes are ancestry, interfaces are skills”: consider the contract, type relationship, and dependency. Abstraction also exists in functions, modules, and APIs outside OOP.

## Polymorphism lets one call use different implementations

```java
interface Animal {
    void makeSound();
}
class Dog implements Animal {
    public void makeSound() { System.out.println("Woof"); }
}
class Cat implements Animal {
    public void makeSound() { System.out.println("Meow"); }
}

static void performSound(Animal animal) {
    animal.makeSound();
}
```

Declare `performSound` inside a class. Calling it with `new Dog()` prints `Woof`; with `new Cat()`, it prints `Meow`. The caller uses the same `Animal` contract, while method implementation is selected from the actual object.

This is subtype polymorphism through Java instance methods. Abstraction explains why callers need only the contract; polymorphism explains how different implementations answer the same call. This does not mean every form of polymorphism happens at runtime; the term has a broader scope. [Oracle describes this method-dispatch behavior](https://docs.oracle.com/javase/tutorial/java/IandI/polymorphism.html).

## Check your understanding with a design change

An `Order` exposes `price`, `quantity`, and `total`. You replace public fields with individual setters but never update related fields. Has encapsulation protected consistency?

No. Access has changed, but the relationship has not been protected. You could compute `total` from its inputs when requested, or update related state through a method preserving the invariant. Choose based on storage and business requirements.

Must a service inherit from a logger to reuse logging? Usually not: a logger field expresses collaboration more directly. Use subtyping when callers can genuinely substitute the object according to its contract, rather than merely to reuse a few methods.

Continue with [SOLID](/en/notes/fundamentals/solid/) for how these boundaries affect change. [Oracle: Interfaces and Inheritance](https://docs.oracle.com/javase/tutorial/java/IandI/index.html) provides Java syntax reference.
