---
title: "Device Trees: Firmware, Kernel, and Userspace"
category: "Operating System"
tags: ["linux", "devices", "kernel"]
description: "Follow how firmware describes hardware, the kernel builds its device model, and userspace receives events through sysfs and udev."
updated: 2026-10-16
translationKey: "operating-system/linux-userspace-proc-sysfs-device-tree"
---

The kernel cannot assume every machine has the same devices or hardware addresses. The kernel receives hardware descriptions through ACPI or Device Tree and can also discover devices through bus enumeration, such as PCI or USB. It combines these sources to initialize drivers and build its device model. Userspace tools such as udev receive events and create useful device nodes and names.

## Device tree and ACPI

Device trees are common on many embedded and ARM systems to describe CPUs, buses, memory, and devices. ACPI is common on PCs and servers and describes configuration and power management. Drivers use firmware data alongside bus and device IDs to bind to hardware.

## From kernel to userspace

The kernel emits a uevent when a device appears or changes. Udev applies rules based on sysfs attributes, sets permissions, creates stable symlinks, and calls appropriate helpers. A `/dev` node may be created dynamically; do not treat a temporary node name as a persistent identifier.

## Investigation

`udevadm info`, `udevadm monitor`, `lspci -nnk`, `lsusb`, sysfs, and `dmesg` expose different layers. If a device appears on a bus but no driver binds, check IDs, firmware, or modules. If a driver binds but an application cannot access the device, check the node, permissions, and service.

## Check your understanding

**Is udev part of the kernel?** No; it is a userspace daemon that handles events.

**Are a device tree and a driver the same thing?** No; the tree describes hardware, and the driver controls it.

**Does the existence of a `/dev` node prove the driver works fully?** No.

## Further reading

Kernel modules and drivers determine how a device is controlled after discovery.
