---
title: "LVM and device mapper: flexible storage layers"
category: "Operating System"
tags: ["linux", "storage", "lvm"]
description: "Trace how physical volumes, volume groups, and logical volumes map to block devices, and learn a safe inspection workflow."
updated: 2026-10-16
translationKey: "operating-system/linux-lvm-device-mapper"
---

Disk partitions divide a device into fixed regions. LVM adds a management layer: multiple physical regions can form a pool, and logical volumes are allocated from that pool. A filesystem still needs to be created on a logical volume and mounted as usual.

## Three main concepts

- **Physical Volume (PV):** a device or partition managed by LVM.
- **Volume Group (VG):** a capacity pool combined from one or more PVs.
- **Logical Volume (LV):** a logical block device allocated from a VG.

The kernel's device mapper implements block mappings; LVM manages metadata and configures those mappings. LVM does not create data copies, replace RAID, or replace backups.

A VG is divided into fixed-size physical extents (PEs); LVs are allocated from those extents and appear as block devices. The capacity allocated to an LV differs from the filesystem space in use inside it. `pvs`, `vgs`, and `lvs` show views by PV, VG, and LV respectively; `vgdisplay` or `lvdisplay` provide additional metadata for an investigation.

LVM2 is primarily a userspace toolset: it reads PV/VG/LV metadata, calculates mapping segments, and loads them into the kernel's device mapper. The kernel handles I/O by mapping LV offsets to blocks on one or more PVs. `dmsetup info` and `dmsetup table` can help inspect the low-level mapping; most administration should use LVM commands rather than editing device-mapper tables directly.

## Trace a filesystem

A possible path is `NVMe → partition → PV → VG → LV → filesystem → mount point`. `lsblk -f` shows the block/filesystem layout; `pvs`, `vgs`, and `lvs` inspect LVM layers; `findmnt` shows mount points. When troubleshooting, follow each layer to identify what is missing or full.

## Resizing with care

Extending an LV requires free extents in the VG or an additional PV. The filesystem usually needs to be extended separately afterward; ordering and online support depend on the filesystem. Shrinking is riskier: the filesystem must support it, it often needs to be unmounted, and the filesystem must be shrunk before the LV so data is not cut off.

Some versions of `lvresize` offer an option to coordinate filesystem resizing (for example, `-r`), but still verify the filesystem, mount state, and tool support on the actual system. Increasing LV size does not automatically mean the filesystem uses the new capacity; reducing an LV before shrinking its filesystem can truncate data.

Do not run `pvcreate`, `lvremove`, or formatting commands on a device without confirming its exact name, mount state, backups, and metadata. `/dev/sdX` names can change between boots; UUIDs or stable paths help avoid mistakes.

## A snapshot is not a backup

An LVM snapshot commonly uses copy-on-write or thin provisioning to record a point-in-time state. It may help with consistent backups or testing, but a snapshot in the same VG still depends on the same storage. A full snapshot pool or device failure can invalidate it; maintain an independent backup process.

## Check your understanding

**Is an LV a filesystem?** No. It is a block device; it still needs a filesystem or other suitable content.

**Does an LVM snapshot replace an external backup?** No.

**Is it safe to shrink an LV before shrinking the filesystem?** No. The wrong order can truncate filesystem data.

## Read next

After understanding block devices and logical volumes, study filesystems, mount options, and how the kernel resolves paths.
