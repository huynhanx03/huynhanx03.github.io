---
title: "Address Translation Example: Page Number, Offset, and TLB"
category: "Operating System"
tags: ["memory", "paging", "address translation", "tlb"]
description: "Calculate page numbers and offsets from binary addresses, then trace translations through a TLB and page table."
updated: 2026-10-16
translationKey: "operating-system/address-translation-worked-example"
---

Suppose a teaching system uses 16-bit addresses and 1 KiB pages (`2^10` bytes). The offset needs 10 bits, leaving 6 bits for the virtual page number. For virtual address `0x1234`, split the address at that boundary and look up the page number in the page table.

## Calculate it step by step

The page size is 1024 bytes, so:

```text
VPN = floor(address / 1024)
offset = address mod 1024
```

`0x1234 = 4660` in decimal. `VPN = 4` and `offset = 564`. If page 4 maps to physical frame 9, the physical address is `9 × 1024 + 564 = 9780` (`0x2634`). The frame number changes; the offset stays the same.

These numbers are teaching assumptions. Real machines have wider addresses, different page sizes, and different page-table levels.

## Add the TLB

The MMU looks up `(ASID, VPN)` in the TLB. A hit returns the frame immediately. A miss requires a hardware page walk or a kernel trap, depending on the architecture. If the PTE is present and permits the access, the translation may be added to the TLB. If the page is absent, a page fault asks the kernel to load or create it.

A TLB miss and a page fault are different: a miss means the translation is not in the translation cache; a page fault means the mapping or presence condition needs handling. A miss may be handled entirely by a page walk without blocking the application.

## Permissions and protection faults

A PTE may forbid writes, execution, or user access. A translation can exist and still fault because of permissions; the kernel distinguishes the cause to handle copy-on-write (COW) or report an error. If a page is shared read-only, a write fault may be the valid step that creates a private copy.

## Exercise: estimate page-table size

Suppose virtual addresses are 32 bits, pages are 4 KiB, and each PTE occupies 8 bytes. Ignoring invalid address regions, a linear page table needs `2^(32−12) = 2^20` entries, or `2^20 × 8 = 8 MiB`. If pages grow to 16 KiB in the same address space, the offset needs 14 bits, leaving `2^18` pages; the table needs `2^18 × 8 = 2 MiB`.

This is the size of a hypothetical linear table with an entry for every virtual page. A multi-level table can allocate only branches in use and may take less space for a sparse address space. Change the page size or PTE size in the calculation to see how each parameter matters; keep virtual-address-space size separate from physical RAM size.

## Summary

- The offset uses `log2(page size)` bits when the page size is a power of two.
- The VPN selects an entry; the offset remains unchanged within the physical frame.
- A TLB miss is different from a page fault.
- A present page can still cause a protection fault if permissions disallow the access.
- An ASID distinguishes the same VPN in different processes, depending on the architecture.
- A linear page table grows with the number of virtual pages; larger pages reduce entries but involve trade-offs.

## Check your understanding

**Does a 1 KiB page need a 10-bit offset?** Yes, because `2^10 = 1024`.

**Does a TLB miss always read from an SSD?** No. The page table may be valid and resident.

**Does a present PTE mean writes are allowed?** No. Its permissions may forbid them.

## Further reading

When RAM needs a frame, page replacement chooses a victim according to a policy.
