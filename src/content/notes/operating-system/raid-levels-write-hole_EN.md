---
title: "RAID levels and the parity write hole"
category: "Operating System"
tags: ["storage", "raid", "parity", "durability"]
description: "Calculate capacity for common RAID layouts and understand degraded mode, parity write holes, and cache protection."
updated: 2026-10-17
translationKey: "operating-system/raid-levels-write-hole"
---

A RAID level describes how stripes, mirrors, or parity are laid out, but its name does not specify the whole controller, cache, or failure semantics. Identify drive count and size, parity layout, hot spares, and the implementation's rebuild policy.

RAID commonly appears to a filesystem as one block device; a controller or software RAID maps logical blocks to one or more physical I/Os. This transparency allows an array to replace a single drive without the application knowing the layout. But RAID does not handle every failure: a simple model assumes a complete drive failure that is detected. Silent corruption or bad sectors on a drive that still operates need other checking and recovery mechanisms.

## Striping and chunk size

RAID 0 distributes blocks among drives for parallelism but has no redundancy: losing one member can lose the whole array. With a one-block chunk and `N` drives, logical block `A` is on disk `A % N`, at offset `A / N` (integer division). Small chunks allow a large request to span several drives; large chunks keep more consecutive data on one drive, involving fewer drives per request but reducing internal parallelism. The right size depends on workload and request size.

## Nominal capacity

For `N` drives of equal size `S`:

- RAID 0: about `N × S`, no redundancy.
- Two-drive RAID 1 mirror: about `S` usable.
- RAID 5: about `(N-1) × S`, usually tolerates one member failure.
- RAID 6: about `(N-2) × S`, usually tolerates two member failures.
- RAID 10: commonly about `(N/2) × S` for an even drive count; failure tolerance depends on the pattern.

Filesystem metadata, reserved space, spares, and unequal drive sizes make usable capacity differ from this quick estimate.

Separate latency for one request from throughput under concurrent requests, and state whether the workload is sequential or random. RAID 0 may distribute requests across drives to raise throughput, while one small request still has latency close to one drive. More drives do not make every individual operation proportionally faster.

In a two-copy RAID 1 model with both copies in sync, a write needs to update both; when it is acknowledged still depends on the implementation and cache policy. If power fails after one copy is written but before the other, the copies can diverge. A write-ahead log or protected write cache can help recover incomplete updates. Reads can choose either copy, so multiple random reads may be distributed; writes pay the cost of updating every copy.

RAID 4 stores one parity block for each data stripe. Bitwise XOR parity can reconstruct one lost block from the remaining blocks and parity. Usable capacity is `N - 1` drives, and a conventional configuration tolerates one failed drive; however, small writes update a shared parity block and can bottleneck on that drive. RAID 5 rotates parity among drives to distribute write load.

For a full-stripe write, a controller can calculate new parity from all new data and write data and parity blocks in parallel. A small write often lacks all the data needed: it must read old data and parity, calculate new parity (`P_new = P_old XOR D_old XOR D_new`), then write new data and parity. In the basic model, that is four physical I/Os for one logical write. RAID 4 funnels parity updates to one drive; RAID 5 rotates parity so independent writes may run more in parallel, though a small write still has the four-I/O cost.

Throughput comparisons in the book use assumed workloads and modeled drives. Use them to understand mechanisms, not as modern benchmarks. When choosing RAID, distinguish single-request latency from concurrent throughput and consider request size, sequential/random access, reads/writes, and failure state. RAID 5 saves capacity compared with mirroring but makes small writes more expensive; RAID 1 uses more capacity but can help random reads. RAID 0 is suitable only when lack of fault tolerance is acceptable.

## The parity write hole

Parity must remain consistent with its data stripe. Power loss between data and parity writes can leave a mismatch; during rebuild, incorrect parity may recreate bad data. Depending on the system, a battery/flash-backed controller cache, write-intent bitmap, journal, or copy-on-write can reduce this risk.

RAID may report degraded mode and keep running, but prolonged operation increases risk. Drive replacement, scrubbing, and rebuilds should follow a runbook; do not pull a drive based only on a blinking light without confirming its slot.

## Reliability is not end-to-end durability

RAID tolerates some drive failures, but applications still need correct flush/ordering, filesystem consistency, and backups. A controller configured incorrectly may acknowledge a write while data remains in volatile cache.

### Exercise: map logical requests to physical I/O

Use the same logical-address trace and map it through RAID 0, 1, 4, and 5; for RAID 5, compare left-symmetric and left-asymmetric parity layouts. Vary chunk size, request size, reads/writes, and random/sequential workloads. Record data/parity blocks touched, extra I/Os, and simulated time as drive count grows. Compare small writes with full-stripe writes to see how parity read-modify-write can bottleneck while large sequential requests exploit parallelism. A simulator explains its mapping/cost model; controller caches, queues, firmware, and real devices change benchmarks.

## Summary

- Usable capacity depends on RAID level, member count, and metadata.
- RAID 10 tolerance depends on which drives fail, not only their number.
- A parity write hole can occur when a crash interrupts data/parity updates.
- Cache protection, scrubbing, and rebuild policy matter.
- Redundancy does not replace application durability or backups.
- Evaluate RAID with the same trace and request size; one logical I/O can become several physical I/Os.

## Check your understanding

**Can RAID 5 survive failure of any two drives?** No. A standard layout usually tolerates one member failure.

**Can RAID 10 survive any two drive failures?** No. Losing both members of one mirror pair can lose the array.

**Does a controller acknowledging a write guarantee it is durable on media?** Check cache protection and flush semantics.

## Read next

The filesystem above RAID still needs crash consistency and data integrity.
