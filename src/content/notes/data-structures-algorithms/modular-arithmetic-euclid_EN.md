---
title: "Algorithmic arithmetic I: modulo, Euclid, and binary exponentiation"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/modular-arithmetic-euclid"
series: "Math for Algorithms"
seriesOrder: 1
tags: ["number-theory", "modulo", "gcd", "binary-exponentiation"]
description: "Integer computation foundations: congruence, gcd/extended gcd, and fast powers."
draft: false
updated: 2026-10-15
---

A counting problem asks for the answer modulo 7. Rather than retaining a huge integer, keep one of seven remainders. Addition and multiplication preserve the correct remainder when performed on small representatives. Division does not automatically obey the same rule and needs extra conditions.

This article builds three related tools: congruence for small representatives, Euclid for common divisors, and binary exponentiation for fewer multiplications. It assumes loops and integer division. Go functions are independent declarations without input handling or a `main` program.

## A remainder represents a congruence class

`a≡b (mod m)` means `m` divides `a-b`, for `m>0`. For example `17≡3 (mod 7)` because their difference 14 is divisible by 7. Replacing 17 by 3 preserves sums/products modulo 7: adding or multiplying a difference already divisible by 7 preserves divisibility.

Thus a long sum/product may be reduced after each operation, but intermediate arithmetic must first be representable. If `a+b` or `a*b` overflows `int64`, subsequent `%m` does not recover the lost mathematical value. The modulus and value domain belong to the algorithm contract, not merely its final type choice.

Go `%` is remainder and may be negative: `-3%7=-3`, whose representative in `[0,7)` is 4. For `m>0`, compute `r := a % m`, then `r+=m` if negative. Initially r lies between `-(m-1)` and `m-1`, so one addition suffices. This also avoids adding m to a potentially huge a before reduction.

```note-visualization
{"id":"normalize-modulo","preset":"normal"}
```

Normalize before using a remainder as an array index. Adding representatives near machine limits still needs safe modular addition or `math/big`; reduced operands alone do not guarantee their sum/product fits.

## Why does Euclid preserve gcd?

A common divisor of a,b also divides `a-qb`, their division remainder. Conversely, a divisor of b and that remainder divides a. The pairs share exactly their common divisors: `gcd(a,b)=gcd(b,a%b)`.

For `30,18`, successive pairs are `18,12`, `12,6`, `6,0`. With second value 0, every divisor of the first divides 0, so gcd is the first value's absolute value. No sequential trial of candidate divisors is needed.

```note-visualization
{"id":"euclid","preset":"normal"}
```

```go
func GCD(a, b int64) int64 {
    for b != 0 { a, b = b, a%b }
    if a < 0 { return -a }
    return a
}
```

The function chooses a nonnegative gcd and convention `gcd(0,0)=0`. Negative inputs use the same remainder identity, then normalize the result's sign. However, the absolute value of minimum `int64` is not representable in `int64`. Restrict the domain, use a suitable unsigned type, or handle that case separately; `return -a` does not cover the entire signed 64-bit range.

Decreasing remainders prove termination. More strongly, within a constant number of steps the smaller magnitude at least halves, giving `O(log min(|a|,|b|))` steps when both are nonzero. Iteration uses `O(1)` memory. These are arithmetic-operation counts; division on thousand-bit integers also depends on bit length.

## Retain coefficients with Extended Euclid

Can the gcd be written as `ax+by`? With 30 and 18, `6=18-12` and `12=30-18` give `6=-30+2·18`, Bézout coefficients `x=-1,y=2`.

Extended Euclid carries those coefficients back through divisions. If the smaller call gives `b·x₁+(a-qb)·y₁=g`, collect terms as `a·y₁+b·(x₁-qy₁)=g`. Thus new coefficients are `x=y₁,y=x₁-qy₁`. [Inverses and CRT](/en/notes/data-structures-algorithms/modular-inverse-crt/) use this identity for valid modular “division.”

```note-visualization
{"id":"extended-euclid","preset":"normal"}
```

## Read exponent bits to compute powers

For `3^13 mod 7`, multiplying thirteen times is unnecessary. Since `13=8+4+1`, use successive squares `3,3²,3⁴,3⁸`. Their remainders are `3,2,4,2`; select set bits to obtain `3·4·2≡3`.

```go
func PowMod(a, e, m int64) int64 {
    result := int64(1 % m)
    a %= m
    if a < 0 { a += m }
    for e > 0 {
        if e&1 == 1 { result = result * a % m }
        a = a * a % m
        e >>= 1
    }
    return result
}
```

Initially result is 1 modulo m. Each iteration inspects e's low bit. If set, transfer one factor a to result, then square a and halve e. The invariant is `result·a^e ≡ original_a^original_e (mod m)`. Even e replaces `a^e` by `(a²)^(e/2)`; odd e first removes one factor a. At e=0, result is the answer.

Require `m>0`, `e>=0`, and no overflow in intermediate `int64` multiplications. Large moduli need safe modular multiplication or `math/big`. Exponent 0 returns `1 mod m`, hence 0 for m=1. Negative exponents need a modular inverse and separate handling, not direct input to this loop.

```note-visualization
{"id":"binary-power","preset":"normal"}
```

One iteration per exponent bit gives `O(log e)` modular multiplications for positive e and `O(1)` memory; e=0 takes constant work. This makes fast powers useful in primality tests, inverses, and later arithmetic problems.

## Try before checking

1. Use Euclid for `gcd(252,105)`, then express it as a combination.
2. Why is `3^13 mod 7` equal to 3? Which bits of 13 are set?
3. From `2≡8 (mod 6)`, may division by 2 give `1≡4 (mod 6)`?

**Explanations:** (1) `252=2·105+42`, `105=2·42+21`, `42=2·21`; gcd is 21 and `21=5·105-2·252`. (2) Bits 0,2,3 select powers 1,4,8; their remainder product is 24, remainder 3. (3) No: 1 and 4 differ by 3, not a multiple of 6. Division requires an appropriate modulus change or an existing inverse; 2 has no inverse modulo 6.

## Further reading

[MIT 18.781 — lecture notes](https://ocw.mit.edu/courses/18-781-theory-of-numbers-spring-2012/pages/lecture-notes/) covers divisibility, Euclid, and congruences. [Inverses and CRT](/en/notes/data-structures-algorithms/modular-inverse-crt/) connects Bézout coefficients with division and combining congruences.
