---
title: "Rescue Mode, Emergency Mode, and Boot Targets"
category: "Operating System"
tags: ["linux", "systemd", "boot"]
description: "Distinguish rescue from emergency mode, select a recovery target, and investigate a machine that cannot reach multi-user mode."
updated: 2026-10-16
translationKey: "operating-system/linux-boot-targets-rescue-emergency"
---

When boot fails, systemd can place a machine in a recovery target instead of its normal state. `rescue.target` provides a minimal maintenance environment with some filesystems and services; `emergency.target` is more minimal and is often used when essential mounts fail. Details depend on the distribution.

## Boot targets and kernel parameters

GRUB can pass `systemd.unit=rescue.target` or `emergency.target` to try booting into a repair mode. Check the default target with `systemctl get-default`; the dependency tree and failed units help identify where boot stopped. “Single-user” does not always mean the same configuration across distributions.

## Repair safely

Check whether the root filesystem is mounted read-only or read-write, verify UUIDs and `/etc/fstab`, inspect the journal and failed units, and check disk space. If system files need changes, remount read-write deliberately and make a backup first. For root-password problems, use an authorized console or live recovery environment; data protections and encryption still apply.

## Check your understanding

**Is emergency mode a kernel panic?** No. The kernel is running and has started a recovery userspace.

**Does the rescue target start every service?** No.

**Does changing the default target repair a filesystem problem?** No.

## Further reading

Boot logs and systemd dependencies help find the service or mount that prevents the machine from reaching its intended target.
