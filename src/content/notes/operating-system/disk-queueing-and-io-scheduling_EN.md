---
title: "I/O Queues and Storage-Device Scheduling"
category: "Operating System"
tags: ["operating-system", "io", "storage"]
description: "Trace requests from applications through the block layer to devices and understand how queue depth affects latency and throughput."
updated: 2026-10-16
translationKey: "operating-system/disk-queueing-and-io-scheduling"
---

When multiple processes generate I/O, requests pass through the filesystem, block layer, driver, and controller before the device handles them. Each layer may queue, merge, split, or reorder requests. Time spent waiting in a queue can exceed the time the device takes to perform the operation.

## Queue depth and trade-offs

A high queue depth keeps a device busy and can increase throughput, especially for SSDs and NVMe devices that support many parallel requests. However, requests waiting longer in the queue may increase tail latency. A low queue depth reduces waiting but may leave the device idle.

A scheduler on an HDD may reorder requests to reduce seek time; position-based optimization is less useful for SSDs. Linux offers schedulers and policies suited to device types and workloads; the kernel default varies by device.

## Buffered I/O, direct I/O, and durability

A buffered write may be acknowledged to a process once data reaches the page cache, before it is stable on storage. Writeback happens later. Direct I/O bypasses some page-cache behavior but has alignment requirements and does not create durability by itself. `fsync`/`fdatasync`, flush/FUA, and controller guarantees determine durable semantics.

## Measure and isolate the bottleneck

`iostat -xz` reports utilization, await, and queue data; `pidstat -d` relates I/O to processes; `iotop` shows per-process activity when permitted. Utilization near 100% does not by itself prove the device is the bottleneck; compare latency, throughput, queue depth, and the application. An SSD can handle multiple queues simultaneously, so interpret `%util` in the context of the device.

## Check your understanding

**Is a high queue depth always good?** No; it can increase latency.

**Does a completed `write()` necessarily mean data is on disk?** Not necessarily.

**Does 100% `%util` on NVMe prove saturation?** Not without queue and latency information.

## Further reading

RAID adds devices to the I/O path but also introduces parity, write amplification, or a write hole depending on the level.
