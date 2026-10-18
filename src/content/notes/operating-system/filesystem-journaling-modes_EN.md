---
title: "Journaling Modes: Data, Ordered, and Writeback"
category: "Operating System"
tags: ["filesystem", "journaling", "ext4", "crash consistency"]
description: "Compare common journaling levels and understand how write ordering affects file data after a crash."
updated: 2026-10-16
translationKey: "operating-system/filesystem-journaling-modes"
---

Journaling records transactions to recover filesystem metadata after a crash, but not every mode writes file contents to the journal. In ext3/ext4, exact names and semantics depend on version and configuration; the concepts writeback, ordered, and journal help explain the trade-offs.

## Writeback

Metadata transactions are journaled, while data blocks may be written without the same ordering constraints. After a crash, metadata can be consistent while a new file exposes old contents in a reused block if ordering did not protect it.

## Ordered

Data is written before the metadata commit that refers to its new block, according to the mode's rules. This reduces the risk of metadata pointing to old data in some failures. Data is not fully journaled, so this does not mean every most recent file byte is recovered.

## Journal mode

Data and metadata may be written to the journal before the official location is updated, increasing write traffic but providing stronger recovery coverage for transactions under that mode. Flush and device semantics still matter; this does not replace the application's `fsync` contract.

## Choosing a mode and durability

Distribution defaults, mount options, and kernel versions affect behavior. Filesystem tuning should be measured against the workload. A “safer” mode may cost more I/O and cannot compensate for an unsafe controller cache or an application that fails to sync correctly.

## Summary

- A journaling mode determines which data is journaled and which ordering is guaranteed.
- Writeback focuses on metadata and has weaker data ordering.
- Ordered mode writes data before the metadata commit under its specific semantics.
- Full data journaling may increase write traffic.
- No mode replaces the durability contract of the application and device.

## Check your understanding

**Does ordered mode mean every application write is durable?** No.

**Does journaling always include file contents?** No; it depends on the mode.

**Is the fastest journaling mode also the safest?** No; consider workload, failure model, and device stack.

## Further reading

Combine this with [Crash Consistency and Journaling](/en/notes/operating-system/crash-consistency-and-journaling/) and [I/O Durability Contracts](/en/notes/operating-system/io-durability-contracts/).
