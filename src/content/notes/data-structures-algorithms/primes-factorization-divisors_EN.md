---
title: "Primes, factorization, and divisors"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/primes-factorization-divisors"
series: "Math for Algorithms"
seriesOrder: 2
tags: ["number-theory", "sieve", "primality", "factorization", "divisors"]
description: "Choose between sieving and factoring, then derive divisor counts and sums from prime exponents."
draft: false
updated: 2026-10-15
---

To count the divisors of 360, we could test 360 numbers. Writing `360=2³·3²·5` instead turns the problem into choosing three exponents: 0..3 for 2, 0..2 for 3, and 0..1 for 5. Factorization lets us count before generating any divisors.

The first step depends on the data: one large-number query and millions of bounded queries call for different preparation. This lesson connects sieving, factorization, and divisor formulas, assuming integer remainders and gcd are familiar.

## Detect a composite through a small factor

A prime is an integer p>1 with only positive divisors 1 and p. If n>1 is composite, n=ab with 1<a≤b, so a≤√n. If no divisor exists from 2 through √n, n is prime; there is no need to test through n−1. One is not prime; zero and negative numbers are outside this definition.

To factor n, try d=2,3,... and divide repeatedly whenever possible to count its exponent. Test d²≤n using the **remaining** n. Once the loop ends, any remainder greater than 1 is prime: a composite remainder would have an unremoved factor at most its square root, contradicting termination.

For 756, divide by 2 twice to get 189, then by 3 three times to get 7. The prime remainder gives `756=2²·3³·7`. There is no need to continue through the original square root.

```note-visualization
{"id":"trial-factorization","preset":"normal"}
```

Trial division takes O(√n) tests in the worst case. Write `d<=n/d` instead of d*d<=n to avoid product overflow. This works for moderate values, but the square root of a large 64-bit number can still be billions; testing only to the square root is not fast enough for every bound.

## Many queries: eliminate multiples together

The sieve of Eratosthenes prepares all primes through N. Mark 0 and 1 nonprime; each still-unmarked p is prime, and its multiples are crossed out starting at p². Earlier multiples kp with 2≤k<p already have a smaller prime factor and were handled before p.

```note-visualization
{"id":"eratosthenes","preset":"normal"}
```

Through 30, the survivors are `2,3,5,7,11,13,17,19,23,29`. Start marking only for p²≤N, since every composite has a factor at most its square root. An array sieve uses O(N) memory and O(N log log N) time; the total marking work is analyzed through reciprocals of primes, not N complete passes for every p. Handle N<2 before accessing prime[1].

For factorization queries x≤N, store the smallest prime factor spf[x]. Read p=spf[x], divide out all copies, and repeat on the remainder. For 756, the table supplies 2,3,7 instead of searching for each divisor.

```note-visualization
{"id":"spf-factorization","preset":"normal"}
```

After suitable preprocessing, query work is proportional to the prime factors with multiplicity, at most O(log x) divisions. The tradeoff is a table covering all N. One huge number does not make allocating an array through that number sensible.

## Large numbers: testing primality differs from finding a factor

Miller–Rabin uses modular exponentiation and squaring instead of trying every divisor. For odd n>2, write `n−1=d·2^s` with odd d, then test bases according to the algorithm. A base can prove compositeness, but passing a few arbitrary bases does not prove primality. Deterministic coverage of the whole 64-bit range needs a proven base set with its stated numeric bound and overflow-safe modular multiplication.

```note-visualization
{"id":"miller-rabin","preset":"normal"}
```

Pollard–Rho finds a nontrivial factor, commonly by generating a sequence modulo n and taking gcds of differences with n. Parameters may need changing and retries; factor the resulting parts recursively and use primality testing to recognize completion. This lesson introduces its role in tool selection, not a complete implementation or universal timing guarantee for 64-bit inputs.

```note-visualization
{"id":"pollard-rho","preset":"normal"}
```

Do not choose bases or multiplication methods from an algorithm name alone. For moderate data, sieving or trial division is easier to control; large ranges need implementations checked against their arithmetic limits.

## From factors to divisor counts and sums

Every n>1 has a unique factorization `n=∏p_i^a_i`. A divisor chooses each exponent b_i from 0..a_i independently. Unique factorization ensures different choices produce different divisors, so `d(n)=∏(a_i+1)`.

The divisor sum is `σ(n)=∏(1+p_i+...+p_i^a_i)`: expanding the product chooses exactly one term per prime, hence exactly one divisor. For 360, the count is 4·3·2=24 and the sum is `(1+2+4+8)(1+3+9)(1+5)=15·13·6=1170`.

```note-visualization
{"id":"divisor-count-sum","preset":"normal"}
```

For n=1, the empty product is 1: its sole divisor and divisor sum are both 1. Intermediate sums/products can overflow even when n fits the type. Use big integers or the required modulus. The geometric-series expression `(p^(a+1)−1)/(p−1)` requires a valid inverse when used modulo another number; summing powers avoids assuming modular division works.

## When the divisor list is actually required

Generate all exponent tuples b_i and their products. This takes at least Ω(d(n)) time because that many values must be output. Alternatively, test d through √n and add both d and n/d when divisible. Add the square-root pair only once for a perfect square. Sorted output needs additional organization or sorting; generating every divisor does not imply generating them in order.

## Try these

1. Factor 756 and compute its divisor count and sum.
2. Why may marking for prime 5 start at 25?
3. Can an algorithm explicitly output 10,000 divisors in less work than its output size?

**Answers:** (1) `756=2²·3³·7`, with 3·4·2=24 divisors and sum `(1+2+4)(1+3+9+27)(1+7)=7·40·8=2240`. (2) The multiples 10,15,20 already have smaller prime factors 2 or 3. (3) No; one can avoid enumeration only when computing a property such as the count.

## Further reading

[MIT 18.781 — Euclidean Algorithm, Primes](https://ocw.mit.edu/courses/18-781-theory-of-numbers-spring-2012/resources/mit18_781s12_lec2/) and its [Primality, Factoring materials](https://ocw.mit.edu/courses/18-781-theory-of-numbers-spring-2012/pages/lecture-notes/) cover the integer background. Divisor counts and sums return in [arithmetic functions](/en/notes/data-structures-algorithms/arithmetic-functions/).
