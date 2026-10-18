---
title: "Relocation and segmentation: dividing memory into regions"
category: "Operating System"
tags: ["memory", "segmentation", "relocation"]
description: "Compare logical addresses, dynamic relocation, and segmentation with paging to understand memory protection."
updated: 2026-10-16
translationKey: "operating-system/segmentation-and-relocation"
---

Before paging became widespread, many systems needed to load a process into one contiguous RAM region. If a program was compiled assuming a fixed starting address, the kernel could not easily place it elsewhere without modifying every address. **Relocation** solves this by translating addresses referenced by the program to the actual load location.

## Base and bounds: simple dynamic relocation

A basic model uses a base register containing the process's physical starting address and a bounds/limit register containing the size of its valid region. Logical address `x` becomes `base + x` if `x` is within the limit; otherwise hardware raises an error.

```text
if 0 <= logical_address < limit:
    physical_address = base + logical_address
else:
    protection_fault
```

This is illustrative. Actual base/limit registers, address units, and checks depend on architecture. The main idea is that hardware can move a process without changing its code and prevent accesses beyond its allocation.

In a simple base-and-bounds system, the bound can represent the valid virtual-space size (check the offset before adding base) or the final physical address (add base and then check); consistent implementations can express the same limit. Base/bounds are CPU state: on a context switch the kernel saves them in process metadata and loads the next process's values before returning to user mode. The kernel also manages free regions to allocate RAM on process creation and reclaim it on exit.

**Static relocation** can modify addresses in an executable when the loader places it in RAM. It does not itself protect one process from another's memory and makes moving a running program harder. **Dynamic relocation** translates each access in hardware. The kernel can place or move an address space while the process is not running, update its saved base, and let the program keep using the same virtual addresses.

## Segmentation follows program meaning

Instead of treating a process as one region, segmentation divides it into logical areas such as code, data, and stack. An address can be a pair `(segment, offset)`. Each segment has its own base and limit, plus suitable permissions. Code may be read/execute-only; data may be read/write.

This organization resembles how programmers think and can support sharing selected segments. But segments vary in size, so allocating contiguous regions can create **external fragmentation**: total free space is sufficient but split into holes too small for a new request. Compaction can be expensive and requires moving data.

When hardware receives a virtual address, it must identify the segment and offset. One design reserves high bits to select a segment and uses the rest as offset; another derives the segment from access type or address-generation rules. Heap offsets commonly grow from the beginning of a segment. A stack may grow in the opposite direction, so its virtual address is converted to a corresponding negative offset before adding the base. Hardware then checks that the offset lies within the segment size.

Segments can have separate read, write, and execute permissions. For example, code can be shared read-only/executable among processes while each process keeps private data. More, smaller segments allow flexibility but require larger segment tables and metadata. Variable-sized physical regions remain prone to external fragmentation; compaction can gather holes by stopping/moving processes and updating bases, at the cost of copying bandwidth and CPU time.

## Paging uses fixed-size units

Paging splits addresses into equal-size pages and maps them to noncontiguous physical frames. This removes the need for one contiguous physical region per process, at the cost of page tables and possible waste in a final page. Segmentation defines boundaries by logical regions; paging uses fixed-size units.

The approaches are not always mutually exclusive: some historical architectures combined segments with pages. Modern operating systems often present logical regions while relying mostly on paging for physical translation. Do not infer hardware mechanisms from an error name or an application diagram.

## Fragmentation reflects allocation strategy

- **External fragmentation:** free space is split among allocated regions.
- **Internal fragmentation:** an allocated region exceeds the requested data size, wasting the difference.

Variable-sized regions are prone to external fragmentation; fixed units such as pages avoid that kind of hole at the frame-allocation level but can waste space internally. Allocator design and unit size trade management simplicity, flexibility, and utilization.

## Exercise: check address bounds

Choose a small address space. For each segment, write its base, limit, growth direction, and permissions. Classify a sequence of virtual addresses as valid or protection faults; for valid ones, calculate the physical address under the model. Then change limits, calculate the valid-address fraction, and see whether a pair of segments covers the full address space or leaves invalid gaps.

When comparing with a simulator, fix its seed and record the boundary convention: a limit often means a length, so the address exactly at the upper boundary may be outside the segment. Do not apply a textbook formula to real hardware without checking its ISA.

## Summary

- Relocation lets a program reside at a different physical location without rewriting every address.
- Base/bounds provide a simple translation and range check.
- Segmentation divides logical regions, each with a base, limit, and permissions.
- Variable-sized regions can suffer external fragmentation.
- Paging uses fixed-size pages and noncontiguous frames, avoiding the need for contiguous physical allocation with different costs.

## Check your understanding

**Are segmentation and paging two names for the same mechanism?** No. One uses variable-sized logical regions; the other uses fixed-size blocks.

**Does paging have no fragmentation?** It avoids external fragmentation in fixed-size frame allocation but can still have internal fragmentation and page-table costs.

**Can one base/bounds pair protect code from writes?** Not by itself; permissions or separate regions are also needed. One pair only illustrates relocation and range checking.

## Read next

See [Paging and page tables](/en/notes/operating-system/paging-page-tables/) to learn how virtual pages map to scattered physical frames.
