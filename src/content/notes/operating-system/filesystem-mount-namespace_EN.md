---
title: "Mount Namespaces and Paths on Linux"
category: "Operating System"
tags: ["linux", "filesystem", "mount namespace", "path"]
description: "Understand mount trees, bind mounts, and namespaces, and why the same pathname can expose a different filesystem."
updated: 2026-10-16
translationKey: "operating-system/filesystem-mount-namespace"
---

Linux has one pathname tree per mount namespace. A mount attaches a filesystem to a directory; afterward, the contents previously visible at the mount point are hidden from that namespace, but are not removed from the device.

## Bind mounts

A bind mount exposes a subtree at another path without copying files. Container runtimes use mount namespaces and bind mounts to expose host directories inside a container. Read-only flags and propagation policy determine whether writes are allowed or mount changes pass between namespaces.

## Mount namespaces

A namespace gives a process group its own view of mounts. Two processes can both use `/etc` but see different mount trees. User namespaces and capabilities affect the ability to mount; a container is not automatically allowed to mount arbitrary host resources.

## Lifecycle and safety

Unmounting may fail as busy while a resource is still in use, for example as a current directory, open file, or nested mount. A lazy unmount detaches the mount from the namespace immediately, but the resource remains until its references disappear; it does not mean cleanup has happened right away.

Before a bind mount, check its source, target, write permissions, and symlinks. A writable host path mounted into a container lets it modify host data within the effective permissions.

## Summary

- Mounts build a pathname tree; they do not necessarily move or copy data.
- A bind mount exposes the same subtree at another path.
- A mount namespace gives a process group its own filesystem view.
- A busy unmount reflects a live reference; lazy detach does not remove it immediately.
- A writable host mount grants the ability to modify host data.

## Check your understanding

**Does mounting over a directory delete the files that were there?** No; it hides them in that mount view.

**Is a bind mount an independent copy?** No; it refers to the same underlying contents.

**Does “busy” during unmount mean the kernel is broken?** Usually a process or reference is still using the mount.

## Further reading

Mount namespaces are one of the primitives underlying containers.
