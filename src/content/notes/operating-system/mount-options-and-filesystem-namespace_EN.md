---
title: "Mount Options and Filesystem Namespaces"
category: "Operating System"
tags: ["operating-system", "filesystem", "mount"]
description: "Understand mount namespaces, bind mounts, and read-only/noexec/nodev/nosuid options for filesystem control."
updated: 2026-10-16
translationKey: "operating-system/mount-options-and-filesystem-namespace"
---

A mount attaches a filesystem or directory tree at a location in a namespace. Two processes may see different mount structures if they are in separate mount namespaces. Containers commonly use this feature to create a selected filesystem view without a separate kernel.

## Bind mounts and propagation

A bind mount makes an existing file or directory visible at another location; it does not copy the contents. A recursive bind can include child mounts. Mount propagation determines whether mount or unmount events pass between namespaces; misconfiguration can cause host mounts to appear or disappear inside a container.

## Protective options

- `ro`: blocks writes through this mount, although a privileged process may remount it according to policy.
- `noexec`: prevents direct execution of executables from the mount; it does not prevent every way of reading and interpreting code.
- `nodev`: does not interpret device nodes on the mount.
- `nosuid`: ignores setuid/setgid effects on the mount.

These options reduce attack surface but do not replace Unix permissions, an LSM, capabilities, or control over data sources. `findmnt -o TARGET,SOURCE,FSTYPE,OPTIONS` shows the actual mount state.

## fstab and boot order

`/etc/fstab` describes persistent mounts. UUIDs and labels are more stable than changing device names. Network or removable-device mounts need appropriate options so boot is not blocked; when supported, check with `findmnt --verify` and test a controlled mount before rebooting.

## Check your understanding

**Does a bind mount create an independent copy?** No; it exposes the same contents at another location.

**Does `noexec` prevent reading a script file?** No.

**Is a mount namespace a new filesystem?** No; it is a separate view of mounts.

## Further reading

Containers combine a mount namespace with user, PID, and network namespaces to isolate processes.
