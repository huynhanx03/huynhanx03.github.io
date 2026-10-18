---
title: "Page replacement, swap, and thrashing"
category: "Operating System"
tags: ["memory", "page replacement", "swap", "thrashing"]
description: "Understand how the kernel chooses pages to evict, when it writes pages to swap, and why a missing working set causes thrashing."
updated: 2026-10-17
translationKey: "operating-system/page-replacement-and-thrashing"
---

RAM is finite, and the total working sets of processes can exceed it. When the kernel needs a frame, it must decide which page should leave memory. **Page replacement** chooses a victim; if the page contains changes that cannot be recovered elsewhere, its contents may need to be written to swap or backing store before the frame is reused.

## Clean and dirty pages

A clean page has not changed relative to its recovery source, such as the original file. The kernel can discard the resident copy and read it again later. A dirty page contains changes not yet written to its backing store, which may be a file/page cache or swap. Before reusing the frame, the kernel must preserve the contents by writing them to backing store or using another mechanism; this does not mean the data is durable across power loss.

A dirty bit helps track writes, but file-cache and writeback details depend on the kernel/filesystem. Swap is part of virtual-memory strategy, not a simple way to make the machine behave as if it had more RAM at RAM speed.

## Replacement policy and locality

The ideal OPT algorithm removes the page that will not be used for the longest time in the future, but the kernel cannot know the future. Real policies approximate using access history, page age, working sets, and system-wide pressure.

LRU is a useful model: a page not used recently may be less likely to be needed soon. Exact LRU for every access is expensive, so systems use approximations. Clock/second chance is a teaching example that uses a referenced bit to avoid evicting a recently used page.

Replacement effectiveness depends on **locality**. If a process alternates between two data regions larger than its RAM allowance, any policy may repeatedly load and evict pages. No replacement algorithm makes a working set larger than available resources fast.

## Working sets and thrashing

A working set is the pages a process actively needs during a period. If total resident demand exceeds available RAM, processes may continually fault to load a page and then evict another. The machine spends much of its time paging instead of application work: **thrashing**.

One response is admission control: reduce the number of concurrently running processes or temporarily defer some load so the remaining working sets fit. Some systems respond differently, such as using an OOM killer to relieve pressure quickly, but choosing and killing a process can disrupt users or active work. No page-replacement policy solves a persistent total working-set demand that exceeds RAM.

Possible signs include increased page faults and paging I/O, high latency, and lower or fluctuating CPU utilization. Not every machine using swap is thrashing: swap may hold cold pages while applications remain responsive.

## Swap is not a second RAM with the same properties

Swap gives the kernel a place to store less-active anonymous pages as memory pressure rises. Storage latency is many orders slower than RAM; frequent reads back from swap can make interactive work very slow. Actual performance depends on the device, workload, memory compression, and kernel policy.

Disabling swap does not always solve the problem. Under memory pressure, the kernel still needs to reclaim pages and may terminate processes or become less stable. Suitable swap size depends on workload and goals (hibernation has separate requirements); there is no universal ratio.

## Diagnose in order

1. Determine whether the whole machine or only one process is slow.
2. Observe available memory, RSS, page faults, and swap-in/swap-out over time.
3. Check for a workload spike or memory leak.
4. Identify processes holding many pages or creating high pressure.
5. Adjust workload, resource limits, or capacity after identifying the cause.

Linux tools display different metrics; one snapshot does not reveal a trend. Observe the interval in which the problem occurs.

## Summary

- Page replacement selects a page to free a frame.
- Dirty pages must be preserved in backing store before their frame is reused; this does not necessarily make them durable across power loss.
- Swap holds less-active pages but is not as fast as RAM.
- Thrashing occurs when the system continually pages because working sets do not fit available resources.
- Swap use alone does not prove a problem; inspect page-in/page-out and latency.

## Check your understanding

**Does a machine with swap necessarily have severe memory pressure?** No. It may hold cold pages there.

**Is exact LRU always the kernel's policy?** No. It is a model; real systems use implementation-specific policies and heuristics.

**Does adding swap make random-access workloads as fast as adding RAM?** No. Swap adds capacity and helps handle pressure, but storage latency differs from RAM.

## Read next

Connect this to [Demand paging and page faults](/en/notes/operating-system/demand-paging-page-faults/) to see how the kernel handles an individual page access.
