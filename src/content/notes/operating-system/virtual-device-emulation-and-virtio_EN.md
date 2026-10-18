---
title: "Virtual Devices: Emulation, Paravirtualization, and virtio"
category: "Operating System"
tags: ["virtualization", "device", "virtio"]
description: "Compare fully emulated devices with paravirtualized devices and trace the I/O path through the host."
updated: 2026-10-16
translationKey: "operating-system/virtual-device-emulation-and-virtio"
---

A guest needs a disk, network card, console, and other devices. A hypervisor can emulate familiar hardware so the guest uses standard drivers, or provide a paravirtualized interface that reduces emulation overhead.

## Emulation and the device model

Device emulation presents registers, interrupts, and protocols like those of a real device. The guest driver communicates as usual; the hypervisor turns operations into host I/O. Compatibility is high, but each operation may cause a VM exit or software handling.

Paravirtualization exposes an interface that knows it is running in a VM. virtio uses a frontend driver in the guest and a backend on the host, exchanging requests through a shared virtqueue. This reduces emulation of older hardware but requires a suitable driver.

## I/O path and isolation

A packet may travel from a guest socket through the guest network stack, a virtio queue, a vhost/backend, a bridge or virtual switch, and then the NIC. Disk I/O travels through the guest filesystem and block layer, a virtual controller, the host file or block backend, and the device. Each layer has its own queues, caches, batching, and limits.

Device passthrough lets a guest control a device almost directly, usually using an IOMMU to restrict DMA. Passthrough reduces some overhead but makes migration and sharing harder and raises isolation-configuration requirements.

## Check your understanding

**Is virtio an exact emulation of a physical card?** No; it is a paravirtualized interface.

**Is it safe to use passthrough without an IOMMU?** No; DMA isolation is important.

**Does guest acceleration guarantee low latency?** No; host scheduling, queueing, and the physical device still matter.

## Further reading

Containers share the host kernel, so network and device isolation uses namespaces, cgroups, and different policies than a VM.
