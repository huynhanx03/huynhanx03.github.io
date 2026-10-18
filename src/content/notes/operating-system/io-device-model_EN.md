---
title: "I/O devices: from system call to hardware"
category: "Operating System"
tags: ["io", "device", "driver", "operating system"]
description: "Follow an I/O request through the system call, kernel, driver, controller, and device."
updated: 2026-10-16
translationKey: "operating-system/io-device-model"
---

An application asks to read a file or write to a socket; it does not control the electrical signals of a disk or network card. The operating system turns a high-level request into device-specific operations through several layers: API, kernel subsystem, driver, controller, and hardware.

## Where does a read request go?

```text
application → system call → filesystem/block layer → driver
            → controller/device → completion → data returned
```

The exact path depends on the device. A file read may be satisfied by the page cache without touching the disk. If the device is needed, the kernel queues a request, the driver configures the controller, and the kernel waits for completion. A system call may block, complete only part of the request, or return an error.

## Registers and memory-mapped I/O

Devices expose control and status registers. The CPU and driver can access them through an I/O address space or an architecture-specific mechanism. With **memory-mapped I/O**, some addresses are used to communicate with a device. That does not make those accesses equivalent to ordinary RAM: ordering, cacheability, and side effects must follow platform rules.

A driver translates generic operations into the device's protocol: prepare buffers, configure commands, issue requests, and handle completion or errors. Drivers let the rest of the kernel use a consistent interface, though a faulty driver can still affect the kernel.

## Polling, interrupts, and DMA

With **polling**, the CPU repeatedly asks whether the device has finished. This is simple, but can waste cycles during a long wait. An **interrupt** lets the device notify the CPU when it needs attention; too many tiny interrupts also add overhead.

**DMA** lets a controller transfer a block between a device and memory without the CPU copying every byte. The CPU still sets up the region and buffer, enforces access rules, and handles completion. On systems where device and CPU caches are not automatically coherent, the kernel and driver must follow cache synchronization rules.

## Buffering, caching, and queues

A buffer absorbs speed differences or groups data into blocks. A cache keeps a copy to serve repeated reads. A queue orders multiple requests and can improve device utilization. These mechanisms can change observed latency and raise the question, “Does a successful write mean the data is durable?” The completion contract of each layer matters.

## Summary

- I/O passes through an API or kernel subsystem, driver, controller, and device.
- The page cache can satisfy a file read without device access.
- A driver handles the device protocol; I/O registers have rules unlike ordinary RAM.
- Polling, interrupts, and DMA are ways to coordinate I/O completion.
- Buffers, caches, and queues affect both performance and observable behavior.

## Check your understanding

**Does every `read()` access the disk directly?** No. The data may already be cached.

**Does DMA mean the CPU plays no part in I/O?** No. The CPU and driver still set up and handle the request.

**Are interrupts always more efficient than polling?** No. The trade-off depends on request frequency and wait duration.

## Read next

Disks have their own latency and request scheduling behavior; next, look at HDD and SSD models.
