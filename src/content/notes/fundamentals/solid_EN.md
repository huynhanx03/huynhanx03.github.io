---
title: "SOLID: designing boundaries for change"
category: "Fundamentals"
tags: ["solid", "clean-code", "design-patterns", "architecture"]
description: "Understand responsibility, contracts, and dependency direction without mechanically adding interfaces and classes."
updated: 2026-10-15
translationKey: "fundamentals/solid"
---

A registration service validates data, stores users, builds email HTML, and calls an email provider. Changing a template requires navigating registration logic. The design problem becomes visible when unrelated reasons for change are tied together.

SOLID offers five principles for examining responsibility and dependency boundaries. They guide reasoning about change rather than guarantee a good architecture. Independent Java snippets illustrate decisions; they are not a complete application.

## S: group things that change for the same reason

Single Responsibility does not mean one method per class. Ask who requests changes and which rules the unit manages. Registration policy and email presentation can change independently, providing a reason to separate them.

`UserService.register` may still coordinate registration and notification without building HTML or speaking SMTP itself. An `EmailService` can hold delivery details so changing providers does not change registration rules. [Robert C. Martin's SRP explanation](https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html) connects responsibility to sources of change requests.

Separation has costs: more names, call paths, and dependencies. Splitting parts that always change together without an independent need can make the program harder to follow.

## O: choose a boundary that supports extension

```java
interface PaymentMethod {
    void pay(long amount);
}

final class PaymentService {
    public void process(PaymentMethod method, long amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("amount must be positive");
        }
        method.pay(amount);
    }
}

final class CreditCard implements PaymentMethod {
    public void pay(long amount) {
        // Adapter to the card provider; omitted here.
    }
}
```

Open/Closed aims to add implementations while reducing changes to stable processing. An `if (type.equals(...))` inside `process` grows with every payment method; a `PaymentMethod` adapter can implement the same contract instead.

This does not mean new features never change existing code. Adapter selection, configuration, verification, and business rules may still change. For two small stable branches, an interface may not justify its cost. Extend actual variation points rather than building a plugin system around every `if`.

This example only illustrates dispatch. It does not define results, network failures, or duplicate-charge protection. Real adapter substitution needs those contractual details.

## L: substitution must preserve behavioral promises

Liskov Substitution concerns what callers may rely on. If `Bird.fly()` promises flight, an `Ostrich` throwing `UnsupportedOperationException` merely because it cannot fly breaks the contract. Remove flight from the general bird contract or assign a `Flyable` capability only to supporting types.

The issue is the contract, not a ban on all subtype exceptions. If an API permits connection failures, an adapter returning that failure is not automatically violating LSP. Stronger input requirements or weaker output guarantees are reasons to reconsider substitution.

Matching method names alone does not establish substitutability. When replacing implementations, examine state semantics and failure behavior too.

## I: callers depend on the behavior they need

```java
interface Workable { void work(); }
interface Eatable { void eat(); }

final class Robot implements Workable {
    public void work() { System.out.println("Working"); }
}

static void startShift(Workable worker) {
    worker.work();
}
```

Declare `startShift` inside a containing class. It needs only `work`, not a contract also containing `eat`. A robot need not implement a meaningless eating method imposed by an oversized `Worker` interface.

Interface Segregation follows client needs. One type may implement both `Workable` and `Eatable`, without requiring every implementation to offer both. Conversely, splitting every method into its own interface when they are always consumed together can fragment the design.

## D: policy should not be tied to implementation details

```java
interface Switchable {
    void turnOn();
}

final class Switch {
    private final Switchable device;

    Switch(Switchable device) {
        this.device = java.util.Objects.requireNonNull(device);
    }

    void press() {
        device.turnOn();
    }
}
```

If `Switch` creates a concrete `LightBulb`, the switching policy is tied to that device. With `Switchable`, callers supply a bulb or another device satisfying the contract. Device details follow the capability required by the consumer.

Dependency Inversion concerns the direction of dependencies toward abstractions. Dependency Injection supplies dependencies, as the constructor does here; DI alone does not prove the boundaries are sound. A framework is unnecessary for passing an object to a constructor.

Similarly, “swap MySQL for PostgreSQL without changing business code” holds only where the contract truly hides the differences. Types, transactions, errors, and specialized queries can require broader changes. An interface does not erase semantic differences.

## Use SOLID to ask questions during change

| Situation | Question to ask |
| --- | --- |
| One request causes unrelated changes | Have independent sources of change been grouped together? |
| Every variant changes the dispatcher | Is there a stable, genuinely useful extension point? |
| Replacing an implementation breaks callers | Did input, output, or failure contracts change? |
| Callers depend on unused methods | Can the contract follow narrower consumer needs? |
| Policy is entangled with a database/provider | Can details satisfy the capability the consumer requires? |

**Check your understanding.** A repository has one implementation. Must you add an interface to satisfy SOLID?

No. Consider change needs, usage, and added complexity. An interface can help even with one implementation, but implementation count alone does not justify it. Explaining the boundary it protects matters more than mechanically checking five letters.

[OOP](/en/notes/fundamentals/oop/) introduces the underlying tools; [Go interfaces](/en/notes/go/interfaces/) demonstrates consumer contracts without class inheritance.
