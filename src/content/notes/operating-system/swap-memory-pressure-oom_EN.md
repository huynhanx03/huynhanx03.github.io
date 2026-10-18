---
title: "Swap, memory pressure, and the OOM killer"
category: "Operating System"
tags: ["operating-system", "memory", "linux"]
description: "Distinguish virtual memory from swap, monitor memory pressure, and understand how the kernel handles exhausted memory."
sources:
  - title: "Linux kernel documentation: Control Group v2"
    url: "https://docs.kernel.org/admin-guide/cgroup-v2.html"
updated: 2026-10-17
translationKey: "operating-system/swap-memory-pressure-oom"
---

Virtual memory does not mean that every process page must always remain in RAM. The kernel can keep recently used pages in memory, discard file-backed pages that can be read again, or move less-used anonymous pages to swap. Swap helps the system tolerate memory pressure, but it is much slower than RAM and does not replace enough RAM for a workload whose working set is too large.

## File-backed and anonymous pages

A page from an executable or file mapping can be read from the file again if it has not been modified. Anonymous memory, such as the heap, has no original file; the kernel may write it to swap to free RAM. Shared pages, dirty pages, and other mapping types follow their own rules.

## Pressure and thrashing

When the working set exceeds available RAM, the kernel may reclaim page cache, write dirty pages, swap, or delay allocations. If it repeatedly evicts pages only to read them back immediately, the system is **thrashing**: the CPU does little application work while paging I/O increases. The total amount of RAM marked “used” is not enough to diagnose the problem; Linux uses idle RAM as cache.

The kernel does not necessarily wait until RAM is completely exhausted before reclaiming pages. An OS may maintain low and high watermarks for free frames: when the count drops below the low watermark, a background worker reclaims or writes pages until it reaches the high watermark. Grouping dirty pages into batches can reduce I/O overhead; a process needing a frame may have to wait for reclaim to finish. Implementations and the names of the watermarks or background workers vary across operating systems.

`free -h` provides a snapshot. `/proc/meminfo`, `vmstat`, PSI files under `/proc/pressure/`, and cgroup memory events provide different signals. `si/so` in `vmstat` report swap-in and swap-out; sustained activity alongside rising latency suggests pressure, but should be compared with workload behavior.

## OOM handling and cgroups

When the kernel cannot reclaim enough memory, it may terminate a process to keep the system running. The OOM killer chooses a victim using heuristics; it does not necessarily pick the process an application owner would consider “worst.” In cgroup v2, `memory.high` causes heavy reclaim and throttling but does not invoke the OOM killer; `memory.max` is a hard limit and can trigger an OOM event in the group when reclaim is insufficient. A killed container therefore does not prove that the whole host ran out of memory; distinguish the limits and inspect `memory.events` ([Linux documentation](https://docs.kernel.org/admin-guide/cgroup-v2.html)).

Investigate kernel logs (`journalctl -k`), cgroup memory events, configured limits, and the timing of increased load. Distinguish an OOM kill from a process crash or a stop issued by a supervisor.

## Check your understanding

**Is swap as fast as RAM?** No.

**Is high “used RAM” always a problem?** No. The page cache uses idle RAM and can be reclaimed.

**Does an OOM kill in a container prove that the whole machine ran out of memory?** No. The cgroup limit may have been reached first.

## Read next

When VM or container memory is layered, guest virtual memory and host memory pressure interact.
