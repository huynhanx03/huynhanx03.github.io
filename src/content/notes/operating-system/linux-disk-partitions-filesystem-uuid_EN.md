---
title: "Disks, partitions, filesystems, and UUIDs"
category: "Operating System"
tags: ["linux", "storage", "filesystem", "partition"]
description: "Trace a block device from disk to partition, filesystem, and mount, and choose stable identifiers for boot configuration."
updated: 2026-10-16
translationKey: "operating-system/linux-disk-partitions-filesystem-uuid"
---

A disk is a block device; a partition divides its space into regions; a filesystem organizes files on a partition or another volume; and a mount attaches that filesystem to the directory tree. Some systems skip or replace layers with LVM, RAID, encryption, or a network block device.

## Identifiers

`/dev/sda` is a kernel name that can change with device discovery order. A UUID identifies a filesystem, a PARTUUID identifies a partition, and a label is an administrator-assigned name. `lsblk -f`, `blkid`, and `findmnt` help relate these layers.

## Partitioning and formatting

GPT stores a partition table using GUIDs and supports larger disks and more partitions than MBR. A partition table is not a filesystem. `mkfs` creates filesystem metadata and may destroy existing data; `mount` does not format a device. Before any write operation, verify the device, capacity, model, serial number, mount status, and backup.

A partition table records only the boundaries of regions on a disk. MBR has a historical limit of four primary entries; one entry can be an extended partition containing logical partitions. GPT also stores information such as a partition name and GUID. A “filesystem” column shown by a utility may be detected from the partition contents; it is not necessarily a field in the partition table.

After userspace changes the table, the kernel must reread it to update the block devices representing partitions. Tools request this reread in different ways; if a partition is in use, the kernel may refuse to update it. `fdisk` commonly lets you review changes before writing them when you confirm on exit, while some other tool modes apply changes immediately. Read the documentation for the version in use and verify the target disk before writing the table.

CHS (cylinder-head-sector) addressing is an old disk geometry model. Modern drives use LBA to number logical blocks, so a reported cylinder count usually does not describe the real physical geometry. On SSDs, aligning partitions to suitable boundaries avoids making a small operation touch multiple internal pages. Modern partitioning tools usually align by default; the partition offset can be inspected in `/sys/block/<disk>/<partition>/start` (interpret the units reported by the kernel correctly).

## Persistent mounts

`/etc/fstab` commonly uses UUIDs to mount filesystems reliably across boots. An incorrect UUID or filesystem type can send a machine into emergency mode; options such as `nofail` change how boot handles a missing device. Test each mount entry and inspect `findmnt` before rebooting.

## Check your understanding

**Are the partition table and filesystem the same thing?** No.

**Does `mkfs` merely register a filesystem without touching data?** No. It writes metadata and may destroy existing data.

**Is a `/dev/sdX` name always stable?** No.

## Read next

LVM adds a logical-volume layer between a partition or device and the filesystem.
