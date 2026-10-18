---
title: "Linux devices: /dev, sysfs, and udev"
category: "Operating System"
tags: ["linux", "devices", "udev", "kernel"]
description: "Distinguish device nodes from physical devices, explore sysfs, and learn how udev responds to device events."
updated: 2026-10-16
translationKey: "operating-system/linux-devices-udev"
---

In Linux, many devices appear as paths under `/dev`, but a file there is not the hardware itself. A device node is an interface through which the kernel routes operations to the corresponding driver.

## Device files and major/minor numbers

A device node stores the type and major/minor numbers so the kernel can select a driver/device. Names such as `/dev/sda` or `/dev/nvme0n1` are common conventions, but do not guarantee every machine uses the same name or order.

Some devices have more stable names through UUIDs, serial numbers, or udev-created symlinks. An administration script should not assume a USB drive is always `/dev/sdb`; discovery order may change.

Not every device has a node under `/dev`: a network card is commonly used through the socket interface and an interface name such as `eth0` or `enp3s0`, rather than opened as `/dev/...`. Thus, `/dev` is one part of the Linux device interface, not a complete list of all hardware.

### Character and block devices

A character device commonly provides a byte stream or specialized operations; terminals and serial ports are examples. A block device allows access to data by location in blocks, such as a disk. A device node stores the device type and major/minor number; the kernel uses them to route operations to a driver. A named pipe can also be created with `mknod`, but it does not have major/minor numbers like a device node.

### Physical terminals, virtual terminals, and pseudoterminals

The kernel provides a unified terminal interface. A virtual terminal such as `/dev/tty1` is associated with a virtual console; a pseudoterminal such as `/dev/pts/0` emulates a terminal in software, commonly for a graphical terminal window or SSH. `/dev/tty` refers to the current process's controlling terminal, if it has one. A background process may have no controlling terminal.

Serial ports commonly appear as `/dev/ttyS*`, `/dev/ttyUSB*`, or `/dev/ttyACM*`. They are still terminal devices, but need appropriate baud rate, flow control, and access permissions; exact names depend on the device and system.

## sysfs represents devices and relationships

`/sys` is a virtual filesystem provided by the kernel that exposes device, driver, bus, and parent-child attributes. It lets tools discover state without directly reading hardware registers. Its contents may vary by kernel and driver.

The device tree in sysfs shows how one device can be viewed through multiple subsystems: USB bus, SCSI layer, and block device. Linux can present USB storage through a SCSI abstraction even when the hardware is not a classic SCSI disk.

## udev handles hotplug

The kernel emits a uevent when a device is added, removed, or changes attributes. On modern systems, `devtmpfs` helps the kernel create basic nodes promptly during boot. The userspace `udev` daemon receives uevents, reads device attributes, applies rules, sets permissions, and creates additional symlinks such as `/dev/disk/by-id/...`. Separating these roles provides a node early while allowing userspace policy and readable names.

Rules can match kernel names, subsystems, and attributes. In udev syntax, `==` and `!=` are conditions; `=` assigns a value, while `+=` appends a value, such as an additional symlink. Inspect known attributes with `udevadm info --query=all --name=/dev/...` and monitor new events with `udevadm monitor --property`. Default rules commonly live in system directories; custom rules go in system configuration directories. Check `udev(7)` for exact paths and syntax, which can vary by version.

Rules should avoid slow or repeated dangerous actions while devices are changing. `udevadm monitor` helps observe events; `udevadm info` reads attributes to build rules. Confirm commands and syntax for the distribution in use.

## Access permissions

A device node has an owner, group, and mode like other files. Permissions determine whether a user can open the device, while device-specific rules and desktop policy may change access per session. Do not run raw-device write commands before confirming the exact target; writing to the wrong device can destroy partitions or data.

## Summary

- `/dev` contains nodes for communicating with drivers, not ordinary data files.
- Major/minor numbers route operations; device names can change with discovery order.
- `/sys` exposes kernel device attributes and topology.
- `devtmpfs` provides basic nodes; udev handles userspace events, applies rules, and creates additional links.
- `/dev/pts` contains pseudoterminals; not every device, such as a network interface, has a device node.
- Device-node permissions and raw writes require careful checking.

## Check your understanding

**Is `/dev/sda` always the first internal drive?** No. Device order can change.

**Does a device node contain all device data?** No. It is an interface to the driver/kernel.

**Is `/sys` an ordinary directory whose files are written to disk?** No. Most of it is a virtual-filesystem interface to the kernel.

## Read next

Devices and drivers are initialized during boot; next, follow the path from firmware to kernel.
