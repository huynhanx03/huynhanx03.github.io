---
title: "Swap Files, zram, and Hibernation"
category: "Operating System"
tags: ["linux", "memory", "swap"]
description: "Distinguish disk swap from zram and hibernation swap; check capacity, priority, and the resume device."
updated: 2026-10-16
translationKey: "operating-system/linux-swap-zram-hibernation"
---

Linux can use a storage partition or file as swap, or compress pages in RAM with zram. Disk swap frees RAM but has slower I/O; zram trades CPU time to keep more compressed data in memory. These choices suit different workloads and neither creates new physical RAM.

## Swap devices and priority

`swapon --show` lists active swap; `free` gives an overview. The kernel can use multiple swap areas with different priorities. A swap file must be created on a filesystem with the right semantics; some filesystems require additional preparation.

## Hibernation

Hibernation writes a memory image to swap or a configured device, then powers off. Resume requires the kernel or initramfs to find the correct resume device, enough swap for the workload, and a compatible encryption setup. Having working swap does not prove hibernation is configured.

## zram

zram creates a compressed block device in RAM, commonly used as swap. It helps when data compresses well and CPU capacity is available; poorly compressible data or a busy CPU reduces the benefit. zswap is a compressed cache in front of another swap backing store and has different semantics from zram.

## Check your understanding

**Does zram create free RAM capacity?** No; it compresses data and uses CPU and RAM.

**Is disk swap as fast as RAM?** No.

**Does having swap mean hibernation works?** No.

## Further reading

Memory pressure and OOM behavior show whether swap helps a workload or merely hides thrashing.
