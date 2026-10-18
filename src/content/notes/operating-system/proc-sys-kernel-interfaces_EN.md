---
title: "/proc, /sys, and Kernel Interfaces"
category: "Operating System"
tags: ["linux", "procfs", "sysfs", "kernel"]
description: "Distinguish process information in procfs from the device model in sysfs, and read kernel interfaces safely."
updated: 2026-10-16
translationKey: "operating-system/proc-sys-kernel-interfaces"
---

Linux exposes much kernel information through virtual filesystems. Entries look like files, but their contents may be generated on read to reflect current state; writing to some nodes can change kernel settings. Know which interface you are looking at before changing it.

## `/proc`: processes and kernel state

`/proc` commonly contains a directory for each PID, such as `/proc/1234/`. `status` describes state and memory in a readable form; `cmdline` contains process arguments; `fd/` links to open file descriptors; and `maps` shows mapped virtual-address regions. Files such as `/proc/meminfo`, `/proc/cpuinfo`, and `/proc/interrupts` provide system-wide statistics.

Values in `/proc/PID/stat` use a compact format and some fields depend on the kernel; tools such as `ps` are often easier to read. PID namespaces also mean a process may see different PIDs in different namespaces.

## `/sys`: devices, drivers, and attributes

`sysfs` represents devices, buses, drivers, and relationships among them. `/sys/devices` reflects the device tree; `/sys/class` groups devices by function; `/sys/bus` and `/sys/module` show buses and modules. Udev observes events and creates device names in `/dev`, while sysfs exposes the kernel's model.

Some sysfs attributes allow configuration, but each is governed by its kernel/driver interface. Do not write a value just because the file is writable: check its documentation, type, range, and effects.

## `/proc/sys` and sysctl

Kernel tunables are commonly exposed under `/proc/sys/`. `sysctl -a` lists them; `sysctl net.ipv4.ip_forward` reads one; a runtime write may change current state. For persistence across reboot, distributions commonly use files in `/etc/sysctl.d/` and load them with `sysctl --system`.

A runtime change may disappear on reboot. Conversely, a persistent configuration may be reloaded when you thought you were only testing temporarily. Record where you made the change, the old value, and how to restore it.

## Check your understanding

**Is `/proc/1234` a static data directory on disk?** Usually not; procfs provides dynamic kernel data.

**Are udev and sysfs the same thing?** No. Sysfs represents the kernel device model; udev handles userspace events and names/permissions in `/dev`.

**Does a runtime `sysctl` change automatically survive reboot?** No, unless saved in persistent configuration.

## Further reading

Storage partitions and volumes also have multiple layers; LVM helps manage logical capacity across physical devices.
