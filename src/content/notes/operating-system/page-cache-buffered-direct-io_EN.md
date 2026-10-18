---
title: "Page Cache, Buffered I/O, and Direct I/O"
category: "Operating System"
tags: ["filesystem", "page cache", "io", "linux"]
description: "Understand reads and writes through the page cache and writeback, and why O_DIRECT is not always a shortcut to faster I/O."
updated: 2026-10-16
translationKey: "operating-system/page-cache-buffered-direct-io"
---

Buffered file I/O usually passes through the kernel's page cache. Reads may be served from RAM; writes update the cache and are written back to the device later. This reduces device access and batches I/O, but applications need to understand dirty data and durability.

## Read cache and readahead

The kernel keeps recently used pages and may prefetch following pages when it detects sequential access. Large random access may have few cache hits or evict other useful data. `posix_fadvise` and similar mechanisms suggest an access pattern but do not require the kernel to follow it exactly.

## Writeback

A write system call may complete once bytes reach the page cache. The kernel writes them back according to policy, based on timing or pressure. `fsync` requests appropriate synchronization, but metadata, directory entries, and device caches still need to be considered under the relevant contract.

## Direct I/O

`O_DIRECT` tries to bypass the page cache for the data path on some systems, requiring alignment and having special semantics for concurrent buffered I/O. It may help a database that manages its own cache, but is not automatically faster. Misalignment can return an error, while small I/O and metadata still have costs.

## Summary

- The page cache holds file data in RAM and can speed up reads and writes.
- Writeback lets a system call complete before data reaches durable media.
- Readahead helps sequential access but may waste work on random workloads.
- Direct I/O has its own alignment and semantics and should be benchmarked.
- Avoid mixing direct and buffered access carelessly because cache coherence must be maintained.

## Check your understanding

**Does the second read of a file always access the SSD?** No; the page cache may serve it.

**Does `O_DIRECT` bypass the kernel?** No; I/O still passes through the kernel, block layer, and driver.

**Does a buffered write returning mean the device committed the data?** No.

## Further reading

The page cache connects to memory pressure and reclaim, as well as filesystem durability.
