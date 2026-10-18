---
title: "Algorithmic number theory IV: Euler phi, Möbius, and multiplicative functions"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/arithmetic-functions"
series: "Math for Algorithms"
seriesOrder: 4
tags: ["number-theory", "euler-phi", "mobius", "multiplicative-function"]
description: "Use prime-factor structure to count coprime integers and invert sums over divisors."
draft: false
updated: 2026-10-15
---

Among integers one through twelve, which share no divisor with twelve except one? They are `1,5,7,11`: four integers. For large n or many queries, prime structure can replace a separate gcd computation for every candidate. Euler's phi counts them; Möbius goes further by undoing sums counted through common divisors.

This article assumes factorization and basic inclusion–exclusion. Those ideas explain the formulas rather than leaving φ and μ as tables to memorize.

## Multiplicativity uses independent prime factors

An arithmetic function assigns a value to each positive integer. f is multiplicative if `f(ab)=f(a)f(b)` when gcd(a,b)=1, conventionally with f(1)=1. Coprime factors share no primes, so values on prime powers determine f(n).

The gcd condition matters. The divisor-count function d has d(2)=2, but d(4)=3 rather than d(2)d(2)=4. Shared prime two means exponents must be combined first. Divisor count d and divisor sum σ are multiplicative, without being completely multiplicative for every pair.

## Euler phi removes integers sharing a prime with n

φ(n) counts x in [1,n] with gcd(x,n)=1. For n=12, exclude multiples of two or three. There are six and four respectively, but two multiples of six were counted twice, leaving `12−6−4+2=4`.

For `n=∏p_i^a_i`, each prime p_i divides n, so exactly n/p_i integers in 1..n are its multiples. Intersections are also counted exactly because products of distinct prime factors divide n. Inclusion–exclusion gives

`φ(n)=n·∏_{p|n}(1−1/p)`.

This is exact counting over a divisible interval, without a vague probabilistic-independence assumption. Use each **distinct** prime once. Integer calculation starts result=n and applies `result=result/p*(p−1)` per prime, avoiding floating point and reducing overflow risk versus multiplication first, while still needing an adequate type.

```note-visualization
{"id":"totient","preset":"normal"}
```

For thirty, factors 2,3,5 give `30·1/2·2/3·4/5=8`. For one, gcd(1,1)=1, so φ(1)=1. Prime powers give `φ(p^a)=p^a−p^(a−1)`; combining distinct primes establishes multiplicativity.

### Phi connects to powers under a necessary condition

For modulus n≥2, Euler's theorem states that gcd(a,n)=1 implies `a^φ(n)≡1 (mod n)`. Thus `a^(φ(n)−1)` is an inverse modulo n. Sharing a prime invalidates this argument: two modulo four has no inverse.

Computing phi of one number usually starts with factorization. For one inverse, extended Euclid commonly avoids that step. Use Euler when phi is already known or suits the problem, rather than assuming it is always the fastest inverse method.

## Möbius supplies inclusion–exclusion signs

Define μ(1)=1; μ(n)=0 if n has a squared prime factor; otherwise, for a product of k distinct primes, `μ(n)=(-1)^k`. Thus μ(6)=1, μ(12)=0, μ(30)=−1.

Sum μ over n's divisors. Squared-factor divisors contribute zero; each remaining divisor corresponds to a subset of n's distinct primes, signed by subset size. With k primes the sum is `(1−1)^k`: zero for n>1 and one for n=1. It acts as a switch recognizing a common divisor equal to one.

```note-visualization
{"id":"mobius","preset":"normal"}
```

For twelve, divisors 1,2,3,4,6,12 have μ values 1,−1,−1,0,1,0 and sum to zero. Squared-factor terms vanish while the four subsets of {2,3} cancel.

## Invert a divisor sum

Suppose `F(n)=Σ_{d|n}f(d)`. Substitute F into `Σ_{d|n}μ(d)F(n/d)` and collect coefficients of f(t). Each coefficient is `Σ_{d|(n/t)}μ(d)`, canceling every t<n and retaining only t=n. Therefore

`f(n)=Σ_{d|n}μ(d)F(n/d)`.

This Möbius inversion undoes summation over divisors. For example, `Σ_{d|n}φ(d)=n`, explained by grouping integers 1..n by their gcd with n; each group's size is phi of the corresponding divisor. At n=6, phi values 1,1,2,2 for 1,2,3,6 sum to six. Inversion gives `φ(6)=6−3−2+1=2`.

The purpose is not faster isolated calculation of φ(6), but transforming divisor-based counts into forms suitable for preprocessing or grouping.

### Count coprime pairs

For `1≤a≤A,1≤b≤B`, a pair contributes `Σ_{d|gcd(a,b)}μ(d)`, one when gcd=1 and zero otherwise. Exchanging sums yields

`Σ_{d=1}^{min(A,B)} μ(d)⌊A/d⌋⌊B/d⌋`.

There are floor(A/d) choices divisible by d and similarly for b. For A=B=3, this gives `9−1−1=7`: only (2,2),(3,3) among nine pairs are not coprime. Once μ is available, no separate gcd per pair is needed.

## One number or an entire range?

For one φ(n), factor n and apply the formula. Many queries through N can use a linear sieve computing φ,μ in O(N) time/space. For new prime p: φ(p)=p−1, μ(p)=−1. If p divides x, `φ(xp)=pφ(x)`, μ(xp)=0; otherwise `φ(xp)=(p−1)φ(x)`, μ(xp)=−μ(x). The sieve must ensure each composite is generated in the appropriate unique way; merely nesting two loops does not establish linearity.

## Try it yourself

1. Compute φ(30),μ(30), and explain d(4)≠d(2)².
2. Sum μ over twelve's divisors.
3. Why does a pair with gcd six contribute zero?

**Answers:** (1) Eight and −1; two factors of two are not coprime, so multiplicativity cannot separate them. (2) `1−1−1+0+1+0=0`. (3) Its contribution is μ(1)+μ(2)+μ(3)+μ(6)=1−1−1+1=0, correctly excluding it from coprime pairs.

## References

[MIT 18.781 — Arithmetic Functions](https://ocw.mit.edu/courses/18-781-theory-of-numbers-spring-2012/resources/mit18_781s12_lec13/) and [Möbius Inversion Formula](https://ocw.mit.edu/courses/18-781-theory-of-numbers-spring-2012/resources/mit18_781s12_lec14/) develop divisor sums and inversion.
