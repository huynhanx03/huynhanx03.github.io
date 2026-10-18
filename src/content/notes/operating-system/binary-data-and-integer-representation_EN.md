---
title: "Bits, Bytes, and How CPUs Represent Integers"
category: "Operating System"
tags: ["computer architecture", "binary", "integer representation"]
description: "Move from bits and hexadecimal to unsigned integers, two's complement, overflow, and endianness."
updated: 2026-10-16
translationKey: "operating-system/binary-data-and-integer-representation"
---

CPUs store data as bits. A bit has two states, interpreted as 0 or 1; a group of 8 bits is commonly called a byte. The architecture defines how bits represent numbers, characters, addresses, and instructions. The same bit pattern can mean different things depending on the instruction and data type.

## Binary and hexadecimal

In binary, each position has a weight that is a power of 2. `1011₂ = 8 + 0 + 2 + 1 = 11₁₀`. Hexadecimal uses base 16; one hex digit corresponds to exactly 4 bits, making memory dumps easier to read: `0x2F` = `0010 1111₂` = 47.

Addresses are often printed in hexadecimal because it is compact. The `0x` prefix is a common notation, not a special value inside the CPU.

## Unsigned integers and two's complement

An n-bit unsigned value ranges from 0 to `2^n - 1`. N bits cannot represent every integer; addition beyond the range may wrap according to hardware or language semantics, or be checked or undefined depending on the language.

Signed integers commonly use **two's complement**. With n bits, the usual range is `-2^(n-1)` to `2^(n-1)-1`. The highest bit contributes to the negative value; a negative number is formed by inverting the bits and adding 1. For example, in 8 bits, `-1` is `11111111` and `-2` is `11111110`.

The hardware addition may be the same for signed and unsigned values; overflow flags and language semantics differ. In C, signed overflow cannot safely be assumed to wrap if the standard treats that behavior as undefined.

## Overflow

For an 8-bit unsigned value, `255 + 1` wraps to 0 modulo 256. For a signed 8-bit value, `127 + 1` cannot be represented in range. The CPU may set an overflow flag; the compiler and language determine how a program may observe it.

When calculating allocation sizes, offsets, or packet lengths, overflow can turn a large number into a small one and lead to an undersized buffer. Check bounds before multiplication or addition when handling input.

## Endianness

Endianness describes the byte order of a multi-byte number in memory. Big-endian stores the high-order byte first; little-endian stores the low-order byte first. Some network protocols define a separate network byte order; code should convert explicitly rather than blindly reading a structure using the host's byte order.

Endianness does not change the bit order of every CPU calculation. It is a rule for arranging the bytes of a multi-byte value.

## Summary

- Hexadecimal compactly represents groups of 4 bits.
- N bits represent a finite range; signed and unsigned types use different ranges.
- Two's complement is the common representation for signed integers.
- Overflow semantics differ between hardware and languages and can cause security bugs.
- Endianness determines byte order in memory and protocols.

## Check your understanding

**Is `0xFF` always -1?** No; it depends on width and signed or unsigned interpretation.

**Does signed overflow wrap in every language?** No.

**Does little-endian mean the CPU processes bits from right to left?** No; it describes byte order in memory.

## Further reading

Machine instructions operate on these representations through addressing modes and registers.
