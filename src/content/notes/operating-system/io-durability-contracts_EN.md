---
title: "I/O Contracts: Buffers, Completion, and Durability"
category: "Operating System"
tags: ["io", "durability", "filesystem", "storage"]
description: "Distinguish an accepted request from a completed operation and data that survives power loss."
updated: 2026-10-16
translationKey: "operating-system/io-durability-contracts"
---

There are many buffers between an application and a device: the stdio library, page cache, block queue, controller cache, and device cache. An operation may complete at one layer while its data is not yet durable at a lower layer.

## Completion milestones

1. The API accepts bytes into a userspace buffer.
2. A system call copies or places the data into the kernel page cache.
3. A block request is sent to the controller.
4. The device reports write completion.
5. The data is committed to durable media according to the contract.

Layers may combine or reorder work; the exact milestone depends on the API, filesystem, driver, device, and flush policy.

## Flush and ordering

An application uses `fsync`, `fdatasync`, or a corresponding API to request synchronization of file data and metadata according to system semantics. A new directory entry may require syncing the directory. The controller and device must honor flush or FUA requests and protect their caches. No single portable syscall guarantees that every hardware layer complies if a device lies or is misconfigured.

## Asynchronous I/O and completion

An asynchronous API may report a request accepted before the operation completes; the caller must keep its buffer valid until completion and handle cancellation or errors. A completion queue may report partial completion. Reusing a buffer too early can cause corruption or a race.

## Summary

- “Accepted,” “completed,” and “durable” are different milestones.
- Buffers at several layers can let a write return early.
- Flush and sync must follow the file, directory, and device contract.
- An asynchronous request requires keeping its buffer and resources alive through completion.
- End-to-end durability depends on the entire stack, not just the application call.

## Check your understanding

**Does a successful async submission mean a read will already see the data?** Not if completion or ordering requirements have not been met.

**Is `close()` generally the same as `fsync()`?** No.

**Does every device always honor flushes correctly?** The design needs supported hardware and driver semantics and correct configuration.

## Further reading

Apply these ideas to filesystem transactions in the crash-consistency topic.
