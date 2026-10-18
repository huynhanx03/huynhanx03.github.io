---
title: "Linux storage: partitions, filesystems, mounts, and LVM"
category: "Operating System"
tags: ["linux", "storage", "mount", "lvm"]
description: "Follow a block device to its mount point, read fstab/UUID entries, and understand swap and LVM."
updated: 2026-10-16
translationKey: "operating-system/linux-storage-mounts"
---

Linux combines many filesystems into one pathname tree beginning at `/`. A filesystem on a partition or volume is attached to the tree at a **mount point**. A file's path therefore does not necessarily reveal which physical device holds it.

## From device to mount point

```text
block device → partition/volume → filesystem → mount point → pathname
```

A physical drive may contain a partition table; a partition can hold a filesystem or contribute to an LVM logical volume. UUIDs identify filesystems more reliably than `/dev/sdX` names, which can change with device discovery order.

`lsblk -f` displays devices, filesystems, and UUIDs; `blkid` reads metadata; `findmnt` shows the mount tree. Verify the target before creating a filesystem because formatting destroys data on the selected object.

## Mounting and `/etc/fstab`

Mounting attaches a filesystem to a directory. Mount options change permissions, interpretation, and I/O behavior. `/etc/fstab` describes mounts needed at boot and some options; a bad entry can stall boot or lead to emergency mode.

To mount, the system needs a source (device/UUID or logical source), filesystem type, and mount point. `mount` shows currently attached filesystems. Sources such as `proc`, `sysfs`, `devtmpfs`, and `tmpfs` are virtual or memory-backed filesystems, not partitions containing disk data. `umount` detaches a filesystem from the tree and can fail while a process is using it.

Other special filesystems have distinct purposes. `overlay` combines directories into one visible tree and is commonly used by containers. `squashfs` is a read-only compressed filesystem that can be mounted through a loop device. `tmpfs` uses RAM and may use swap depending on configuration, so it still has resource limits; it is not durable storage across reboot.

`mkfs` is an interface to a filesystem-specific creation tool; for example, `mkfs -t ext4` invokes an ext filesystem creator. Creating a filesystem writes new structures to the device, so do this only after confirming the correct partition/volume and that old data is no longer needed.

After editing configuration, use system tools to validate it and test mounting with a rollback plan. On systemd, a mount can be represented as a unit. Do not mount over a directory containing needed data without understanding that the old contents will be hidden while the mount is active.

## LVM and abstraction layers

Logical Volume Manager combines physical volumes into a volume group, then allocates logical volumes. It enables more flexible resizing/combining than static partitions, but the filesystem above must support the corresponding resize and operations must occur in the right order.

LVM does not protect against device failure and does not replace RAID or backup. An LVM snapshot tracks changed blocks with capacity and performance limits; do not assume it is an independent backup.

## Swap

Swap can be a partition or file that the kernel uses to hold less-active pages. Appropriate size depends on memory pressure, workload, hibernation, and machine policy. Observe actual paging rather than looking only at the percentage of swap used.

`/etc/fstab` has six fields: source, mount point, filesystem type, options, a field retained for `dump` compatibility, and filesystem-check order at boot. The final fields still need correctly formatted values even if modern systems use them less. `UUID=` avoids dependence on `/dev/sdX` discovery order; `noauto` skips an entry during `mount -a`; options such as `ro`, `nosuid`, `nodev`, and `noexec` affect writes or interpretation. Check `mount(8)` and distribution configuration before applying options.

## Summary

- Mounting attaches a filesystem to the unified pathname tree.
- UUIDs are more stable than device enumeration order, but still verify the target.
- `fstab` declares mounts; errors can affect boot.
- LVM adds flexible volume management but does not create redundancy or backups by itself.
- Swap backs less-used pages; it is not as fast as RAM.

## Check your understanding

**Must `/home` be on the same partition as `/`?** No. It can be a separate mounted filesystem.

**Is an LVM snapshot a backup on another device?** Not necessarily; it usually shares the same storage pool.

**Will `/dev/sdb` keep the same name after reboot?** Not guaranteed. Use stable identifiers and verify the device.

## Read next

If a mount or boot service fails, logs and dependencies help identify the failing layer.
