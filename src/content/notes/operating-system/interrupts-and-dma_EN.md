---
title: "Interrupts and DMA: keeping the CPU from waiting on every byte"
category: "Operating System"
tags: ["interrupt", "dma", "io", "device"]
description: "Trace interrupt handlers, deferred work, and DMA during a device transfer."
updated: 2026-10-17
translationKey: "operating-system/interrupts-and-dma"
---

The CPU can send a device request and wait, but busy waiting wastes compute cycles. Interrupts and DMA let a device report events and transfer data in blocks so the CPU can do other work while I/O proceeds.

## Devices have their own interfaces and protocols

The CPU, RAM, and devices often connect through different interconnect layers. Memory needs high bandwidth and sits close to the CPU; fast buses are costly and limited in reach/connectivity, while slower peripheral buses can connect many devices. This is a conceptual model; modern machines use several fabrics and controllers.

A device has two sides: the **interface** visible to a driver and the **implementation** inside. An illustrative interface has status, command, and data registers. The driver checks readiness, transfers data, issues a command, and receives completion or error through status/interrupt. Real devices may use queues, descriptors, doorbells, or more complex protocols; the driver still has to follow their rules.

## Polling or interrupts?

Polling repeatedly reads a status register until the device is ready. It is simple and can be fast if the operation completes almost immediately; for a slow device, the CPU spends time checking in a loop.

Interrupts reverse the wait: the kernel issues a request, lets the process sleep or runs other work, and the device signals when there is a result. CPU and device work can overlap. Interrupt handling has costs too—entering the handler, scheduling, and returning. With a very fast device, these costs can exceed a few polls. A hybrid can poll briefly and then wait for an interrupt.

At high network load, one interrupt per packet can leave the CPU processing interrupts without enough time for applications to consume packets. Controlled polling or batching completions into one interrupt reduces overhead but increases latency if the batch waits too long. No mode is always best; choice depends on device speed, load, and latency goals.

## How an interrupt enters the kernel

A device signals an interrupt. The CPU saves sufficient state, transfers to a registered handler, and enters privileged mode. The handler identifies the source, reads device status, acknowledges the interrupt, and does the work that must be quick.

Long or blocking work should not run in a hard interrupt handler. The kernel commonly moves heavier processing to deferred mechanisms such as a softirq or workqueue, depending on the system. Interrupts may be masked, coalesced, or distributed to another CPU.

## DMA transfers regions of data

The driver prepares a buffer and describes its memory region to the controller. The device uses DMA to read/write that region and signals completion. This avoids copying each byte through the CPU, but the driver still manages buffer lifetime, permissions, synchronization, and errors.

With an IOMMU, a device can be limited to mapped DMA address ranges. This adds protection, but do not assume every device or machine has the same configuration. Treat device data as untrusted input unless the protocol authenticates it.

## Ordering and coherency

The CPU, caches, and device may observe memory in an order that requires synchronization. A driver must ensure descriptors are written before it tells the device to start; after DMA completes, the CPU must see the new data. Kernel APIs provide the appropriate memory barriers/cache synchronization for the platform.

User-space code should not replace driver primitives by writing to arbitrary device addresses. Ordering bugs can be rare, hard to reproduce, and architecture-dependent.

## Drivers hide device-specific protocols

Devices have different registers and protocols. A driver contains that knowledge; a higher subsystem can call a common interface such as block read/write without knowing how to control each drive. This layering lets filesystems use many devices through one interface.

The common interface may hide details a particular device provides, such as a rich error code reduced to a generic I/O error. Drivers also run with privilege, so a bug can affect the whole system. When diagnosing, distinguish application/filesystem, block-layer, and driver/controller failures instead of calling everything “a bad disk.”

A simple disk driver may wait for readiness, write a block address and sector count to registers, issue a read/write command, and handle completion. On a read, the handler retrieves data and wakes a waiting process; the driver may then start the next queued request. Exact order depends on the protocol and driver, but request-to-completion is a useful model for asynchronous I/O.

## Interrupt storms and optimization

High-speed devices can generate many interrupts. Interrupt moderation/coalescing batches events, reducing CPU overhead but increasing per-packet latency. MSI-X supports multiple vectors for distributing load. These are driver/device decisions; tuning should measure throughput, latency, and CPU distribution.

## Summary

- An interrupt reports an event; handlers should be short and defer heavier work appropriately.
- Polling suits very fast operations; interrupts let the CPU work while slower devices respond. A short poll can be combined with interrupts.
- DMA transfers blocks between device and RAM, reducing CPU copying.
- Drivers manage buffer lifetime, addresses, permissions, and synchronization.
- Drivers hide device protocols behind subsystem interfaces, which can also hide device-specific detail.
- CPU/device ordering needs platform-appropriate barriers and cache synchronization.
- Coalescing reduces overhead but may raise latency; too many interrupts can starve applications.

## Check your understanding

**After DMA completes, does the CPU automatically see new data?** The driver must follow the right coherency and synchronization rules.

**Should an interrupt handler wait for a disk to finish?** No. A handler should not block in the ordinary way.

**Is interrupt coalescing only beneficial?** It reduces overhead but adds latency.

## Read next

Apply these ideas to storage devices in the note on HDDs, SSDs, and latency.
