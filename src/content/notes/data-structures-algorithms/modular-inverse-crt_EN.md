---
title: "Modular inverses and the Chinese remainder theorem"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/modular-inverse-crt"
series: "Math for Algorithms"
seriesOrder: 3
tags: ["number-theory", "modular-inverse", "extended-euclid", "crt"]
description: "When modular division is valid, and how to combine congruences with coprime or overlapping moduli."
draft: false
updated: 2026-10-15
---

To solve `3x≡1 (mod 7)`, we could try residues and find x=5. For a large modulus, trying every number is no longer practical. Extended Euclid gives a direct method, and the same tool can combine information such as “remainder 2 when divided by 3, remainder 3 when divided by 5.”

This lesson follows [modulo and Euclid](/en/notes/data-structures-algorithms/modular-arithmetic-euclid/). We use moduli greater than 1, normalize solutions to nonnegative residues, and distinguish an invertible coefficient from a congruence that is solvable without one.

## Modular division needs an invertible element

An inverse of a modulo m is a number x satisfying `ax≡1 (mod m)`. For a=3,m=7, x=5 because 15 has remainder 1. For a=2,m=6, no inverse exists: every 2x is even and cannot differ from 1 by a multiple of 6.

The exact condition is `gcd(a,m)=1`. If ax−1 is a multiple of m, there is an equation `ax+my=1`, so every common divisor of a,m must divide 1. Conversely, when the gcd is 1, Extended Euclid supplies precisely such Bézout coefficients. This proves both the existence criterion and the method for finding the inverse.

```go
// Return g >= 0 and x,y such that a*x+b*y=g.
func ExtendedGCD(a, b int64) (g, x, y int64) {
    if b == 0 {
        if a < 0 { return -a, -1, 0 }
        return a, 1, 0
    }
    g, x1, y1 := ExtendedGCD(b, a%b)
    return g, y1, x1-(a/b)*y1
}

func InverseMod(a, m int64) (int64, bool) {
    if m <= 1 { return 0, false }
    g, x, _ := ExtendedGCD(a, m)
    if g != 1 { return 0, false }
    x %= m
    if x < 0 { x += m }
    return x, true
}
```

These are independent Go declarations. ExtendedGCD returns coefficients; InverseMod rejects m≤1 or a gcd other than 1, then normalizes x. The recursive update uses `a%b=a−(a/b)b`: coefficients x₁,y₁ from the smaller call become y₁ and x₁−(a/b)y₁. There is no search through all residues.

For 7 and 26, back-substitution gives `1=3·26−11·7`. The coefficient of 7 is −11; modulo 26 it becomes 15, and `7·15=105≡1`. With a normalized a, the algorithm takes O(log m) division steps. Coefficients and their intermediate products can overflow near int64 limits, and the absolute value of MinInt64 is not representable; support for the entire range requires math/big or tighter input bounds.

```note-visualization
{"id":"modular-inverse","preset":"normal"}
```

For a prime m and a not divisible by m, Fermat's little theorem gives `a^(m−1)≡1`, so `a^(m−2)` is the inverse. Compute it by binary exponentiation. The primality assumption matters: raising to m−2 is not a general formula for composite moduli. Extended Euclid needs no prime assumption and is often convenient for a single inverse.

## A coefficient without an inverse can still give a solvable congruence

If `g=gcd(a,m)>1`, `ax≡b (mod m)` has a solution exactly when g divides b. Necessity follows from `ax−b=km`: g divides both ax and km, so it divides b. When g divides b, divide **a, b, and m** by g; a/g is now invertible modulo m/g.

For example, `6x≡9 (mod 15)` reduces to `2x≡3 (mod 5)`. The inverse of 2 is 3, giving x≡4 modulo 5. In 0..14 there are three solutions: 4,9,14. There is no contradiction between a coefficient having no inverse and a particular linear congruence having solutions: the target b and the reduced modulus matter.

## Combine two conditions using one extra variable

Consider `x≡2 (mod 3)` and `x≡3 (mod 5)`. The first gives `x=2+3k`. Substitution into the second gives `3k≡1 (mod 5)`. Multiplying by the inverse 2 of 3 gives k≡2 and x≡8 modulo 15. Indeed, 8 has remainders 2 and 3 as required.

For coprime moduli, the same argument solves `m₁k≡r₂−r₁ (mod m₂)`, then returns `r₁+m₁k`. The difference between any two solutions is divisible by both moduli and therefore their product, so the solution is unique modulo m₁m₂.

```note-visualization
{"id":"crt-merge","preset":"normal"}
```

### Shared factors require a compatibility check

The substitution still works, but m₁ may have no inverse modulo m₂. Set g=gcd(m₁,m₂). The system is solvable exactly when g divides r₂−r₁. If so, solve

`(m₁/g)k ≡ (r₂−r₁)/g (mod m₂/g)`.

The combined modulus is `lcm(m₁,m₂)=m₁·(m₂/g)`, rather than always the product. For `x≡1 (mod 4), x≡3 (mod 6)`, solve `4k≡2 (mod 6)`, or `2k≡1 (mod 3)`. Thus k≡2 and x≡9 modulo 12. Changing the second remainder to 2 makes the difference 1, which is not divisible by g=2; the conditions are incompatible even by parity.

## Turn the formula into a reliable merge operation

For several conditions, maintain a current solution/modulus pair, merge each new condition, and stop on inconsistency. The invariant is that the pair describes exactly all solutions to the conditions processed so far. A general merge needs no assumption that all moduli are prime or pairwise coprime.

In Go, r₂−r₁, multiplication by the inverse, m₁*k, and the new modulus can all overflow. Dividing by g before multiplying reduces some risk but does not cover the entire range. Normalize negative remainders and check bounds or use math/big. If the reduced modulus is 1, k has no remaining restriction; do not call an inverse API that rejects modulus 1 and incorrectly declare the system impossible.

## Check your reasoning

1. Find the inverse of 7 modulo 26 using a Bézout equation.
2. Which numbers in 0..23 have remainder 1 modulo 4 and remainder 3 modulo 6?
3. Why is `6x≡9 (mod 15)` solvable while `6x≡8 (mod 15)` is not?

**Answers:** (1) `−11·7+3·26=1`, so the inverse is 15. (2) The solution is x≡9 modulo 12: 9 and 21. (3) The gcd is 3, which divides 9 but not 8. The first reduces to x≡4 modulo 5, not one unique residue modulo 15.

## References

[MIT 18.781 — Linear Congruences, Chinese Remainder Theorem](https://ocw.mit.edu/courses/18-781-theory-of-numbers-spring-2012/resources/mit18_781s12_lec5/) covers congruences and algorithms. [Euler phi and Möbius](/en/notes/data-structures-algorithms/arithmetic-functions/) continues with divisor structure; [modular combinations](/en/notes/data-structures-algorithms/binomial-lucas-wilson/) shows when factorial inverses stop working.
