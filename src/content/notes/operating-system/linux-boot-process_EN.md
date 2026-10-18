---
title: "Linux Boot: From Firmware to the Kernel"
category: "Operating System"
tags: ["linux", "boot", "uefi", "kernel"]
description: "Trace firmware, the bootloader, kernel, initramfs, and PID 1 as Linux starts."
updated: 2026-10-16
translationKey: "operating-system/linux-boot-process"
---

Linux does not run immediately when a machine powers on. Firmware initializes hardware and finds a boot program; a bootloader loads the kernel; the kernel initializes subsystems and finds the root filesystem; finally, the init program starts userspace services.

## Firmware and bootloader

Firmware such as BIOS or UEFI checks and initializes hardware, then selects a device or boot entry. A bootloader such as GRUB can show a menu, select a kernel, and pass a command line and initramfs. Loading differs between legacy BIOS and UEFI; Secure Boot adds signature checks according to its configuration.

The bootloader is not the kernel. It prepares the environment for the kernel to start but does not manage user processes after the system is running.

GRUB has its own way of naming and addressing devices. `root` in GRUB configuration may indicate where GRUB finds the kernel file, while the Linux `root=` parameter specifies the filesystem the kernel must mount as `/`. These are different concepts despite sharing the word `root`. On UEFI, a bootloader is commonly an `.efi` file in the EFI System Partition; BIOS/MBR may need multiple loading stages because the initial code area is very small. GRUB is a common choice, not the only possible bootloader.

Many distributions generate `grub.cfg` from other configuration files and scripts; direct edits to a generated file may be overwritten. Use the distribution's configuration workflow and regenerate it according to documentation for the running version.

## Kernel and initial RAM filesystem

The kernel initializes memory, CPUs, interrupts, drivers, and required subsystems. To find the root filesystem, it may need modules or tools not present on the initial root disk. **initramfs** provides a temporary filesystem in RAM with drivers and scripts to discover devices, unlock encryption or assemble RAID/LVM if configured, and then switch to the real filesystem.

If the kernel cannot find the root device, the cause may be a boot parameter, driver, UUID, initramfs, or storage configuration. Console messages often identify the last successful step.

The current kernel command line is in `/proc/cmdline`. `journalctl -k` shows kernel logs from the current boot; `journalctl -k -b -1` often shows the previous boot if persistent journaling is enabled. Without systemd-journald, `dmesg` or a distribution's kernel log may provide similar information.

## PID 1 and userspace

If initramfs contains `/init`, the kernel runs it as PID 1 in the temporary environment. After finding and mounting the real root, it can switch root and `exec` the system init while retaining PID 1. Without an initramfs `/init`, the kernel can mount root and start init directly. On many modern distributions the final init is systemd; others may use a different init. PID 1 then starts services and manages their lifecycle. See the [kernel initramfs documentation](https://docs.kernel.org/filesystems/ramfs-rootfs-initramfs.html).

If init cannot start or exits unexpectedly, the system may stop at an emergency shell or kernel panic, depending on the failure. PID 1 has special responsibilities, so its signal and cleanup behavior has specific rules.

## Investigating a boot failure

1. Determine whether the failure happened before or after the bootloader started the kernel.
2. Record the kernel message and command line.
3. Check the root device, UUID, driver, and initramfs.
4. If userspace starts, inspect init or unit state and the journal.
5. Change one reversible factor at a time; avoid changing partitions or the bootloader without a copy of the configuration.

Boot has several layers; a “black screen” does not identify which one failed. Distributions and firmware differ, so specific repair steps should be based on logs and the machine's layout.

## Summary

- Firmware selects and starts the bootloader.
- The bootloader loads the kernel with parameters and may provide an initramfs.
- The kernel initializes drivers and subsystems; initramfs helps find and mount root.
- The kernel starts PID 1 to bring up userspace.
- Diagnose boot failures layer by layer, from firmware through init.

## Check your understanding

**Does GRUB manage services after Linux finishes booting?** No; it is a bootloader.

**Is initramfs the permanent root filesystem?** Usually not; it is a temporary environment that helps boot to the real root.

**Is PID 1 always systemd?** No; it depends on the system.

## Further reading

On a system using systemd, see how PID 1 manages units and service ordering in the next note.
