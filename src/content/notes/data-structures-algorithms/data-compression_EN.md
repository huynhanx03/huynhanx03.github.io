---
title: "Lossless compression: RLE, Huffman, and LZ"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/data-compression"
series: "Advanced DSA"
seriesOrder: 21
tags: ["compression", "rle", "huffman", "lz", "prefix-code"]
description: "Understand three kinds of redundancy and the information a decoder needs to reconstruct the original bytes."
draft: false
updated: 2026-10-15
---

`AAAAABBC` has eight symbols, but its start can be described as “five As.” Another text may have few long runs yet strongly uneven symbol frequencies, or repeated phrases. These kinds of redundancy motivate RLE, Huffman, and Lempel–Ziv methods.

Lossless compression must reconstruct **exactly the original byte sequence**. Consider both encoder and decoder. A short representation without record boundaries, code tables, or an end condition is not a complete codec.

## Not every input can get shorter

Suppose every n-bit string receives a uniquely decodable code shorter than n bits. There are 2^n inputs but only 2^n−1 strings of lengths zero through n−1, insufficient for an injective assignment. A codec can compress suitable data well while leaving other inputs unchanged or larger through headers.

This counting argument clarifies compression-ratio claims: which data, size, and metadata are included? It does not prevent effective compression of real structured data.

## RLE describes runs rather than individual symbols

RLE stores runs as (value,count). `AAAAABBC` becomes (A,5),(B,2),(C,1). Scan left to right, extend a count while symbols match, emit the old run upon change, and remember the final run at end of input.

With one byte each for value/count, eight source bytes become six. But `ABABAB` has six runs and becomes twelve bytes. Long runs, rather than merely few symbol types, provide the benefit.

```note-visualization
{"id":"rle-codec","preset":"normal"}
```

Decoding emits count copies from each pair. The format specifies count width, which byte is value, and any escaping. A nonzero one-byte count requires splitting a 300-symbol run, for example (A,255),(A,45). Textual `A5` needs rules separating digit-valued data from count digits.

Encoding scans O(n) input; decoding must pay at least output size. A small encoded input with large counts can expand greatly, so receivers need decompressed-size limits.

## Huffman chooses code lengths by symbol frequency

RLE misses interleaved data with a highly frequent A. Huffman assigns shorter bit codes to frequent symbols and longer ones to rare symbols within prefix-free codes: no code is another's prefix. Reaching a leaf identifies one symbol without separators between codes.

Count frequencies, place leaves in a min-heap, repeatedly combine the two lightest nodes into their summed-weight parent, and reinsert. Label child edges zero/one; root-to-leaf paths become codes.

For A:5,B:2,C:1, merge C,B into weight three, then with A:5. One valid table is A=0,B=11,C=10. Payload costs `5·1+2·2+1·2=11` bits versus sixteen for fixed two-bit coding of three symbol types. Ties or left/right choices may produce different equal-cost codes.

```note-visualization
{"id":"huffman-codec","preset":"normal"}
```

The greedy proof starts from an optimal tree: exchange symbols so the two least frequent occupy deepest sibling leaves without increasing frequency×length. Merge them into one symbol, solve the smaller problem optimally, then split again. Thus Huffman is optimal for prefix codes based on **individual-symbol frequencies**, without capturing all dependencies among symbol sequences.

Counting n bytes costs O(n); constructing a σ-symbol tree with a heap costs O(σ log σ). A single-symbol source needs an explicit code/output-length convention; one leaf alone does not tell the decoder how many copies to emit.

### What does the decoder need besides payload?

Transmit the tree or code lengths under a convention such as canonical Huffman. Also communicate output-symbol count or valid bit length to distinguish end-of-byte padding. Eleven example bits exclude table and length fields; for an eight-byte file, headers may enlarge the compressed total. Codec cost does not end at codeword lengths.

## LZ reuses previously emitted sequences

Lempel–Ziv exploits repeated substrings. LZ77 tokens can specify a backward distance and length into decoded output, with literals for other symbols. LZ78/LZW use different dictionary/token rules; one window explanation does not define every variant's format.

With output `AB`, a token “back two, copy six” can produce `ABABABAB`. Newly copied bytes become source for subsequent bytes. Overlap is valid, so decoding must copy sequentially under token rules rather than assuming one memcpy from a fully independent source region.

```note-visualization
{"id":"lz77-codec","preset":"normal"}
```

The decoder retains the allowed past window. Naively finding longest matches at the encoder may try many old positions and compare many characters. Hash chains or other indices reduce search work in real implementations at memory/window costs. No single encoder complexity applies to the entire LZ family before choosing match search.

Many formats use LZ to produce tokens and Huffman to encode them. These stages exploit different redundancies rather than competing for one role. Final ratios include window/dictionary, code tables, and headers, especially for small input.

## Try the decoder's perspective

1. What is RLE for AAABCCCC, and do two-byte pairs save space?
2. Why should A occupy depth one for Huffman A:5,B:2,C:1?
3. Why is copying the original two source bytes once insufficient for back-two,length-six after AB?

**Answers:** (1) (A,3),(B,1),(C,4), six rather than eight bytes before headers. (2) A is most frequent; merging the two rarer symbols deeper gives weighted length eleven bits. (3) Six bytes are required, some sourced from bytes produced during copying. Every answer still needs an explicit format for actual decoding.

## Reference

[RFC 1951 — DEFLATE](https://www.rfc-editor.org/rfc/rfc1951) specifies a real format combining Huffman codes with distance/length references, showing the roles of bit order, tables, and limits.
