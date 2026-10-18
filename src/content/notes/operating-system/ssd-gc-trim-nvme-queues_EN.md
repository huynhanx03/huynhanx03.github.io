---
title: "SSDs, garbage collection, TRIM, and NVMe queues"
category: "Operating System"
tags: ["operating-system", "ssd", "nvme"]
description: "Understand the flash translation layer, garbage collection, discard/TRIM, and how NVMe queues affect performance."
updated: 2026-10-16
translationKey: "operating-system/ssd-gc-trim-nvme-queues"
---

An SSD maps logical block addresses to flash pages/blocks through a Flash Translation Layer (FTL). NAND is commonly programmed by page but erased by erase block. Updating data therefore writes a new region and later reclaims the old block. The controller runs garbage collection to consolidate live pages and free blocks.

## From raw NAND to a block interface

The filesystem sees readable/writable LBAs; the NAND below reads pages, programs pages after a block has been erased, and erases whole erase blocks. A programmed page cannot be overwritten arbitrarily: the controller must preserve live data, erase the block, and write it again. Conceptual states include invalid, erased, and valid. To reduce program disturbance, devices commonly program pages in order within a block. Multiple chips operate in parallel to raise bandwidth.

The FTL turns LBA requests into physical operations, keeps a mapping table in RAM, and must recover that table after power loss. One approach stores metadata in page OOB areas and scans NAND at startup; this is slow on large drives, so some designs use logs/checkpoints to recover faster.

Append-only writes place new data in free pages and update the mapping. An overwrite makes the previous version garbage. When garbage collection selects a block with dead pages, it identifies live pages by comparing page metadata with the mapping table, copies live pages to a new log region, then erases the old block. A block containing only dead pages is cheap to reclaim; the more live pages, the more copying and write amplification. Overprovisioning provides spare space so GC can be delayed or run in the background, but does not remove its cost.

## Mapping-table tradeoffs

- **Page mapping:** flexible lookup/update but a large table. In the book's example, 1 TiB with a 4-byte entry per 4 KiB needs about 1 GiB of RAM for mappings.
- **Block mapping:** a smaller table, but writing one small page can require copying other live pages in the block.
- **Hybrid mapping:** data blocks use block mapping while some log blocks use page mapping. Merging a log into a data block can be a complete *switch merge*; a *partial merge* copies the remaining pages from the data block; a *full merge* gathers data from multiple blocks. The latter merge types add I/O and can greatly increase write amplification.

The FTL numbers/diagrams in OSTEP are an explanatory model published in 2015, not a claim that every modern SSD uses one algorithm. The useful principle is that the block interface hides NAND's block-erase constraint, so performance depends on mapping, garbage collection, parallelism, and available free space.

## TRIM/discard

When a file is deleted, the filesystem can issue discard/TRIM to tell the SSD that logical blocks no longer need their contents preserved. If the information reaches the SSD, the FTL can skip copying those pages during garbage collection. Discard does not guarantee secure physical erasure; secure erase is a separate issue.

## Queues and latency

NVMe supports multiple submission/completion queues and parallel requests. A deep queue can increase throughput but raise tail latency. Internal garbage collection, thermal throttling, and write amplification affect performance over time. A short benchmark after clearing caches does not represent sustained load.

## Monitoring

`nvme list`, `smartctl`, `iostat`, and filesystem metrics help inspect the device, health, and load. SMART attributes depend on vendor; do not interpret a raw value without documentation. Firmware, temperature, overprovisioning, and random-write workload all matter.

## Check your understanding

**Does TRIM securely erase data physically?** Not guaranteed.

**Do SSDs need no garbage collection?** They need it to reclaim erase blocks.

**Do multiple NVMe queues make every workload faster?** No.

## Read next

Write amplification and endurance explain why write workloads can consume flash lifetime.
