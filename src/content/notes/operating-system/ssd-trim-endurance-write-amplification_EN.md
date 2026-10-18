---
title: "SSDs: TRIM, Wear Leveling, and Write Amplification"
category: "Operating System"
tags: ["storage", "ssd", "trim", "flash"]
description: "Understand flash erase blocks, discard/TRIM, garbage collection, and why host writes differ from NAND writes."
updated: 2026-10-16
translationKey: "operating-system/ssd-trim-endurance-write-amplification"
---

Flash SSDs write pages but erase larger erase blocks. The controller needs to know which logical blocks no longer contain useful data so it can reclaim flash. A filesystem or device may send discard/TRIM to mark LBAs as no longer needed; this is not a secure-erasure command.

## Garbage collection and wear leveling

The controller moves live pages out of an erase block, erases the block, and reuses it. Wear leveling distributes erase cycles so a few regions do not wear out early. When an SSD is nearly full or has much live data, garbage collection may need to copy more.

## Write amplification

The host may write a certain number of bytes while the controller writes more because of copying, garbage collection, or metadata. The ratio of NAND writes to host writes is called write amplification. Overprovisioning, free space, sequential versus random workloads, and TRIM all affect this ratio.

## Endurance and SMART

SSDs have endurance ratings and health counters such as percentage used or media errors, depending on standards and vendors. Counters differ by device; a normal reading does not rule out an upcoming failure. Monitoring, backups, and replacement policies are still necessary.

## Summary

- Flash is erased in erase blocks; the controller manages mapping and garbage collection.
- TRIM/discard marks LBAs as no longer needed to improve reclamation.
- Write amplification makes NAND writes exceed host writes.
- Free space and overprovisioning affect long-term performance.
- Interpret SMART and health counters according to the vendor and backup policy.

## Check your understanding

**Does TRIM securely erase data against forensic recovery?** No; it is not a secure-erase guarantee.

**Does 1 TB written by the host mean exactly 1 TB written to NAND?** No; write amplification may increase it.

**Does a healthy SSD today mean no backup is needed?** No.

## Further reading

Include device characteristics when benchmarking latency and IOPS alongside filesystem caching.
