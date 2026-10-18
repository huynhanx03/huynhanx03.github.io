---
title: "Disks, SSDs, and storage latency"
category: "Operating System"
tags: ["storage", "disk", "ssd", "io"]
description: "Compare HDD and SSD behavior, estimate access time, and understand why random I/O differs from sequential I/O."
updated: 2026-10-16
translationKey: "operating-system/disks-and-storage-latency"
---

A CPU can execute billions of cycles in the time a storage device takes to find one block. Device characteristics shape how the OS schedules I/O, caches data, and reports latency to applications.

## HDDs: mechanical position dominates latency

A rotating hard drive must move its read head to the right track and wait for the sector to rotate into place. Time includes seek, rotational latency, and data transfer. Scattered random requests often require many movements; sequential requests take advantage of the current position and transfer many blocks continuously.

## A disk exposes a sequence of blocks

The OS commonly accesses a drive through addressed logical blocks and requests one or more blocks at a time. A filesystem need not directly control physical tracks or heads; firmware/controller handles physical placement. Logical/physical sector sizes and write guarantees depend on the device. Do not infer that a multi-block write is atomic: power loss mid-operation may leave a partial update. See [Crash consistency and journaling](/en/notes/operating-system/crash-consistency-and-journaling/) for how filesystems handle multi-block updates.

Physical-layout details explain optimizations in the classic HDD model. **Track skew** offsets the first sector of the next track so the head has time to move without missing it; **zone recording** places more sectors on outer tracks because their circumference is larger. These can improve sequential reads and regional throughput, but modern firmware/controllers hide most geometry from the OS; do not infer performance from LBA alone.

Request time can be estimated as the sum of three parts: `T_io ≈ T_seek + T_rotation + T_transfer`. At rotational speed `RPM`, one revolution takes `60 / RPM` seconds; if a sector arrives randomly, average rotational delay is about half a revolution. For example, a 10,000 RPM drive takes about 6 ms per revolution, so average rotational latency is about 3 ms. Actual values depend on position, cache, and firmware mechanisms.

Because seek and rotational delays have a large fixed cost, a small random request may be much slower than a sequential transfer of the same amount of data. When possible, combine adjacent blocks into a larger request and access them sequentially so seek/rotation cost is shared across more bytes. A disk cache may also read ahead or delay acknowledging writes; write-back is faster only when flush behavior and durability contracts are handled correctly.

An I/O scheduler can reorder requests to reduce head movement, but fairness and latency also matter. A very long queue may keep the device busy while making each individual request wait longer.

## SSDs: no mechanical head, but still limited

Flash SSDs read pages and erase erase-blocks; a controller manages mapping, wear leveling, garbage collection, and error correction. Random reads are usually better than on HDDs, but latency still depends on workload and device state. Sustained writes can be affected by garbage collection, cache, and free capacity.

Do not assume SSD latency is zero or all I/O behaves the same. Queue depth, request size, durability flushes, thermal throttling, and the controller all matter.

## IOPS, bandwidth, and latency

- **Bandwidth:** bytes transferred per unit time.
- **IOPS:** I/O operations per second.
- **Latency:** time for one request to complete.

Large sequential requests may increase bandwidth while producing fewer IOPS; small random requests may care more about IOPS and latency. Increasing queue depth can improve throughput while worsening tail latency. Benchmarks need the right block size, read/write mix, queue depth, and cache conditions.

## Cache and write durability

The page cache can return data quickly without touching the device. Writes are often buffered and flushed later; if an application needs durability, it must use suitable synchronization APIs and the filesystem/device must honor the contract. A successful write call does not by itself mean data survives a power failure.

## Summary

- HDDs pay seek and rotational latency; sequential I/O reduces movement.
- HDD I/O time can be estimated as seek + rotational delay + transfer; random I/O is often dominated by the first two.
- Combining adjacent blocks improves efficiency; write-back caching can affect durability.
- SSDs remove mechanical motion, but controllers, erase blocks, garbage collection, and flushes still add latency.
- IOPS, bandwidth, and latency measure different properties.
- Queue depth can improve throughput while increasing tail latency.
- Caching and writeback affect both performance and durability.

## Check your understanding

**Does an SSD make random I/O infinitely fast?** No. Controller and flash still have latency and limits.

**Does high IOPS prove each request has low latency?** No. Throughput and latency are different metrics.

**Does a successful `write()` always guarantee survival through power loss?** Not necessarily; suitable durability semantics are required.

## Read next

When multiple disks are combined for performance and fault tolerance, the topic is RAID.
