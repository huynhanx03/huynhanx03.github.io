---
title: "Kernel, bootloader, and initramfs: how Linux starts"
category: "Operating System"
tags: ["linux", "kernel", "boot", "initramfs"]
description: "Follow the path from firmware to the kernel and root filesystem, and learn where to investigate when boot fails."
updated: 2026-10-16
translationKey: "operating-system/linux-kernel-boot-and-initramfs"
---

When a computer powers on, Linux cannot immediately run applications. Firmware must find a boot device, a bootloader loads the kernel, and many systems use a temporary environment to locate and mount the real root filesystem. Each stage has a distinct responsibility, so boot failures are often diagnosed in this order.

## From firmware to bootloader

Firmware (BIOS or UEFI) initializes basic hardware and selects a boot entry according to its configuration. With UEFI, an EFI System Partition contains `.efi` programs; GRUB commonly provides a menu for selecting a kernel and command-line parameters. A BIOS-based machine may execute boot code on the disk before reaching GRUB.

The bootloader is not the Linux kernel. It selects and loads the kernel and initramfs into memory, then transfers control. Kernel parameters such as `root=`, `ro`, or `quiet` affect the kernel's startup phase.

## Kernel and initramfs

The kernel initializes memory, the scheduler, essential drivers, and subsystems. But the real root filesystem may be on an NVMe device that needs a driver, inside an encrypted volume, on LVM, or on a network device. The kernel cannot read the place that contains the system if it lacks the required components.

The initramfs is a small root filesystem loaded alongside the kernel. A startup program inside it can load modules, unlock encrypted storage, assemble RAID or LVM, and locate and mount the real root. It then switches to the real system using `switch_root` or an equivalent mechanism. The initramfs is not the permanent root filesystem.

## PID 1 and userspace

When initramfs contains `/init`, the kernel has already started it as PID 1 before the real root is ready. It prepares root and hands control to the system init through `exec`, retaining PID 1. Without an initramfs `/init`, the kernel can mount root and start init directly. On many distributions the final init is systemd, which starts services and targets for user login. See the [kernel initramfs documentation](https://docs.kernel.org/filesystems/ramfs-rootfs-initramfs.html).

## Narrowing down a boot failure

If firmware cannot see the disk, check the hardware and boot order. If GRUB appears but no suitable kernel does, inspect the boot configuration and EFI partition. If the kernel panics while looking for root, focus on `root=`, storage drivers, initramfs, UUIDs, encryption, and LVM or RAID configuration. If the system reaches emergency mode, the kernel has already run; the failure is more likely in mounts, the filesystem, or a userspace service.

Useful tools after entering the system include `journalctl -b`, `dmesg`, `lsblk -f`, `blkid`, `findmnt`, and `systemctl --failed`. From a live USB, you can inspect the disk's filesystem and configuration without booting that installation.

## Check your understanding

**Is the bootloader the kernel?** No. The bootloader loads the kernel and transfers control to it.

**Why is an initramfs needed if the kernel is already loaded?** The kernel may need drivers or userspace logic to locate, unlock, and assemble the root filesystem.

**Does seeing the GRUB menu mean Linux is running?** No. That is still the bootloader stage.

## Read next

When userspace starts, systemd becomes PID 1 and manages units, dependencies, and services.
