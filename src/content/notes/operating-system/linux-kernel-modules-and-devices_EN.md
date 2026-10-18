---
title: "Linux kernel modules, drivers, and devices"
category: "Operating System"
tags: ["linux", "kernel", "driver", "module"]
description: "Distinguish built-in drivers from modules, trace devices from the kernel to /dev, and handle modules in a verifiable way."
updated: 2026-10-16
translationKey: "operating-system/linux-kernel-modules-and-devices"
---

A driver is software that controls or communicates with a device. In Linux, a driver may be compiled into the kernel or loaded as a kernel module. `/dev` contains special files that userspace uses to access devices; a node is an interface, not the driver itself or the device's data.

## From hardware to `/dev`

The kernel discovers a device through a bus or firmware, matches a suitable driver, and publishes an event. For character or block devices, the kernel assigns a major and minor number. On systems using devtmpfs, the kernel commonly creates the basic node; udev receives the event, applies permissions and symlinks according to rules, and can manage nodes where needed. Other devices may be controlled through sysfs, sockets, or dedicated APIs rather than a simple node.

Names such as `/dev/nvme0n1` and `/dev/sda` reflect how the kernel identifies a device, but may change with configuration. UUIDs, labels, or stable symlinks are more suitable for long-term mount configuration.

## Why USB and SATA disks can pass through the SCSI layer

The name `/dev/sdX` does not prove that the underlying hardware is classic SCSI. Linux uses a common SCSI layer for many storage devices. A USB storage device commonly sends SCSI commands encapsulated over USB; the USB storage driver bridges the USB and storage subsystems. A SATA disk can enter the same layer through `libata`, which translates upper-layer SCSI requests into ATA commands for the SATA device. Thus, the `/sys` tree may trace a block device through SCSI to USB or SATA. See [libATA SCSI translation](https://docs.kernel.org/driver-api/libata.html#libata-scsi-translation-emulation).

Conceptually, the SCSI subsystem has three layers: a device-class driver (such as `sd` for disks or `sr` for optical media), a middle layer that manages and routes commands, and a host-adapter or hardware driver. Separating these layers lets the same storage operations work across multiple buses and controllers. `lsscsi` may show host, bus, target, and logical unit; `lsusb` helps inspect the USB side.

Most applications use ordinary block paths such as `/dev/sda`. Some devices also expose a generic SCSI interface such as `/dev/sg*`, allowing userspace programs to send SCSI commands directly for specialized operations. This is a dedicated interface, not the normal way to read and write files.

## Modules and dependencies

`lsmod` lists loaded modules; `modinfo driver` shows metadata; `modprobe driver` loads a module and its dependencies; `modprobe -r driver` attempts to remove it when unused. A module may fail because firmware is missing, the kernel version is wrong, Secure Boot blocks it, or the device does not match.

`dmesg` and the kernel journal often explain the reason. Adding a module to boot configuration changes future startup; first try loading it temporarily and verify that the device works.

## Access permissions and safety

Permissions on `/dev` control which processes can send commands to a device. Udev rules can set a group or mode; granting broad access carelessly may let an application access a device directly and bypass usual protections. Containers often need a specific device allowlist instead of sharing all of `/dev`.

Do not manually delete a `/dev` node to “fix a driver”: udev may recreate it, while the real cause is often a module, firmware, permission, or device problem. Compare the hardware state, kernel logs, sysfs, and corresponding node.

## Check your understanding

**Is `/dev/sda` a driver?** No. It is a node representing a block device.

**Does `lsmod` list every driver, including built-in ones?** No. It mainly lists loaded modules.

**Does seeing a node in `/dev` prove that the disk is mounted?** No. Check the filesystem and mount table.

**Must `/dev/sda` be a physical SCSI disk?** No. SATA and USB storage can also be presented through Linux's SCSI layer.

## Read next

Block devices often pass through device mapper, LVM, or the filesystem layer before an application reads a file.
