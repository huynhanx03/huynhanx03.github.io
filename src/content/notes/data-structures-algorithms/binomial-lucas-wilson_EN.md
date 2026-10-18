---
title: "Algorithmic number theory V: modular combinations, Lucas, and Wilson"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/binomial-lucas-wilson"
series: "Math for Algorithms"
seriesOrder: 5
tags: ["number-theory", "binomial", "factorial-modulo", "lucas", "wilson"]
description: "Compute binomial coefficients modulo primes and recognize when ordinary factorial inverses stop working."
draft: false
updated: 2026-10-15
---

Choosing two of seven gives twenty-one, or one modulo five. But a factorial table through seven contains 5!=0 modulo five, which has no inverse. The answer exists; the failed step is replacing integer division with modular division.

This article assumes combinations, binary exponentiation, and inverse-existence conditions. First establish when factorial tables work, then use Lucas when n reaches the prime modulus.

## When factorials remain invertible

The integer formula is `C(n,k)=n!/(k!(n−k)!)`. For prime p and 0≤n<p, every factor from one through n is nonzero modulo p, so factorials are invertible. Prepare `fact[i]=i! mod p` and `invFact[i]=(i!)⁻¹ mod p`, replacing division with multiplication by inverses:

```go
// Assume p is prime, 0 <= k <= n < p, and the tables cover n.
func Choose(n, k int, p int64, fact, invFact []int64) int64 {
    return fact[n] * invFact[k] % p * invFact[n-k] % p
}
```

This Go fragment uses caller-prepared tables and assumes 0≤k≤n<p with sufficient lengths. An API accepting k<0 or k>n should return zero **before** indexing. int64 multiplication can overflow before `%p`; restrict p to safe products or use suitable modular multiplication.

To prepare through N<p, fill fact upward. Compute `invFact[N]=PowMod(fact[N],p−2,p)` by Fermat, then descend using `invFact[i−1]=invFact[i]·i mod p`. Since `i!=(i−1)!·i`, multiplying inverse i! by i gives inverse (i−1)!.

Table filling takes O(N) time/space plus one O(log p) exponentiation; each query O(1). No separate exponentiation per inverse factorial is needed. State preprocessing as O(N+log p), or explicitly separate that initial inverse when saying O(N).

```note-visualization
{"id":"binomial-pascal","preset":"normal"}
```

## Lucas splits large inputs into digits

For n≥p, n! contains p and is zero modulo p. Some C(n,k) remain nonzero because p factors cancel during **integer division** before reduction. Inverting zero cannot model that cancellation.

Write `n=n₀+n₁p+...`, `k=k₀+k₁p+...`, digits in 0..p−1. Lucas gives

`C(n,k)≡∏ C(n_i,k_i) (mod p)`.

Any digit k_i>n_i makes the product zero. With p=5, seven is (12)₅ and two (02)₅; the product C(1,0)C(2,2)=1 agrees with twenty-one. Six is (11)₅, whose low digit is below two, so C(6,2)=0 modulo five, agreeing with fifteen.

```note-visualization
{"id":"lucas","preset":"normal"}
```

The polynomial congruence `(1+x)^p≡1+x^p` explains the digits: all intermediate binomial coefficients are divisible by p. Expanding n in base p writes `(1+x)^n` as a product of `(1+x^(p^i))^n_i`; selecting coefficient x^k produces the digit combinations. Lucas follows from this identity rather than a representation trick.

With tables for all digits below p, a query multiplies O(log_p n) terms. A huge p makes its p-sized table impractical; calculate individual small C(a,b) using min(b,a−b) factors and valid inverses, or choose according to limits. Reducing to digits does not make every digit computationally small.

Do not substitute composite m for p. Composite moduli usually require prime-power treatment tracking prime exponents, then CRT. That extends beyond basic Lucas.

## Wilson explains a full residue-block product

Wilson states p>1 is prime iff `(p−1)!≡−1 (mod p)`. For prime p, pair nonzero residues with inverses. Each pair contributes one; for odd p only one and p−1 are self-inverse because `(x−1)(x+1)=0` over a prime field. The remaining product is −1. p=2 also works since 1≡−1 modulo two.

Conversely, composite n has a divisor a with 1<a<n. Then a divides (n−1)!, which therefore cannot be congruent to −1 modulo n: −1 is not divisible by a. This valid primality criterion still needs roughly p multiplications if evaluated directly, making it unsuitable as a default large-number primality test.

```note-visualization
{"id":"wilson-factorial","preset":"normal"}
```

## Separate p's exponent from the rest of a factorial

The exponent in n! is `v_p(n!)=⌊n/p⌋+⌊n/p²⌋+...`: multiples of p contribute one, multiples of p² one additional factor, and so on. For 100! and five, twenty plus four gives twenty-four.

For C(n,k), subtract the corresponding denominator exponents to find remaining p factors. Separately retain products after removing **all** p factors from each integer, rather than discarding every p-divisible integer entirely. Products of nonzero residue blocks relate to Wilson and underpin p-free factorial and prime-power combination algorithms.

This explains the separation without providing a general prime-power routine. A numerator n! containing p does not imply the combination is zero: C(7,2) modulo five is the opening counterexample.

## Try it yourself

1. Compute C(6,2) modulo five from base-five digits.
2. Why does invFact[p] not exist modulo p?
3. How many factors of five remain in C(10,5) after integer cancellation?

**Answers:** (1) Choosing (02)₅ from (11)₅ has an insufficient low digit, yielding zero. (2) p! is zero modulo p and not coprime to p. (3) v₅(10!)=2 minus two copies of v₅(5!)=1 leaves zero; C(10,5)=252 is not divisible by five. Separately, v₅(100!)=24.

## Further reading

[MIT 18.781 — Fermat, Euler, Wilson](https://ocw.mit.edu/courses/18-781-theory-of-numbers-spring-2012/resources/mit18_781s12_lec4/) develops congruences; [VNOI — Lucas](https://wiki.vnoi.info/translate/he/Lucas-theorem) offers implementation practice. Read [inverses and CRT](/en/notes/data-structures-algorithms/modular-inverse-crt/) before combining moduli.
