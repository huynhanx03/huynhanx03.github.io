---
title: "The Linux Kernel, Userspace, and User Identities"
category: "Operating System"
tags: ["linux", "kernel", "user-space", "permissions"]
description: "Connect Linux layers from hardware to processes, distinguish kernel mode from the root user, and understand UID/GID."
updated: 2026-10-16
translationKey: "operating-system/linux-kernel-user-space-and-users"
---

A Linux system can be viewed in three broad layers: hardware, kernel, and userspace. The kernel manages CPUs, memory, drivers, and system calls; userspace contains shells, services, and applications. Many components work together through APIs without needing to understand each other's implementation.

## Kernel mode and user mode

The kernel runs at a privilege level that can access hardware resources and kernel memory. User processes have limited permissions; a faulty application usually exits without directly overwriting kernel memory. System calls provide a controlled entry point to ask the kernel to open a file, create a process, or communicate with a device.

The kernel also has kernel threads for background work. They are not ordinary user processes even though the scheduler can manage them similarly.

## Userspace is not a rigid tier

Userspace services and applications may call one another, or rely on daemons and libraries. There is no required hierarchy for every service. Logging, DNS caching, network managers, desktop services, and servers are userspace processes except for functions implemented in the kernel.

## UID, GID, and root

The kernel applies permissions based on numeric UIDs/GIDs attached to processes and files. A username is only a name that userspace resolves to an ID. Root (UID 0) has broad privileges in user mode, but does not run in kernel mode; root access is not direct permission to execute kernel code.

Services often run under separate users to limit which files and processes they can control. Groups let a set of users share permissions. Root access is useful for administration, but each use should have a clear scope.

## Check your understanding

**Does the root user run in kernel mode?** No; root is still a user-mode process with UID 0.

**Do all userspace processes have the same privileges?** No; UID, GID, capabilities, LSMs, and namespaces create differences.

**Does the kernel only manage processes?** No; it also manages memory, devices, system calls, and many other resources.

## Further reading

A process is an abstraction of a running program; the kernel stores its state and chooses when to give it CPU time.
