---
title: "Memory Fragmentation, Compaction, and Huge Pages"
category: "Operating System"
tags: ["operating-system", "memory", "linux"]
description: "Distinguish userspace and kernel memory fragmentation, understand physical-page compaction, and weigh huge-page trade-offs."
sources:
  - title: "Transparent Hugepage Support"
    url: "https://docs.kernel.org/admin-guide/mm/transhuge.html"
  - title: "Memory Management APIs — Page mobility and placement hints"
    url: "https://docs.kernel.org/core-api/mm-api.html"
updated: 2026-10-16
translationKey: "operating-system/memory-fragmentation-compaction"
---

Fragmentation occurs when free memory is split into many pieces, making a large contiguous allocation difficult even when total free capacity is sufficient. In a userspace allocator, fragmentation can make the heap retain many pages that the application does not fully use. In physical memory, the kernel may lack a contiguous range of pages for some DMA or huge-page requests.

## Compaction

Kernel compaction moves movable pages to create a contiguous region. Moving pages costs CPU time, requires coordination with their mappings, and is not possible for every page. Reclaim frees pages; compaction rearranges them. These are different mechanisms, though they can work together.

## Huge pages

Huge pages use mappings larger than the base page, reducing the number of TLB entries needed for large memory regions. But large allocations are harder to satisfy and memory waste may increase; during copy-on-write, the kernel may need to copy a larger page or split the mapping into smaller pages first, depending on the page type and situation. Promoting or moving pages to form a huge page can also add latency. Transparent Huge Pages (THP) let the kernel promote or demote pages according to policy; hugetlb pages usually need more explicit configuration and management.

## Troubleshooting

`/proc/buddyinfo`, `vmstat`, THP counters, and PSI can help with analysis; available metrics depend on the kernel. Do not infer fragmentation only from low free RAM. Measure latency and workload before enabling, disabling, or reserving huge pages.

## Check your understanding

**Are reclaim and compaction the same?** No.

**Do huge pages always reduce memory usage?** No.

**Does enough total free RAM guarantee a large contiguous allocation will succeed?** No.

## Further reading

NUMA placement determines which node supplies a page and how close it is to the CPU using it.
