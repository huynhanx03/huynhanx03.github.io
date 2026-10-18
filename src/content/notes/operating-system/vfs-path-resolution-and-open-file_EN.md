---
title: "VFS, path lookup, and open-file state"
category: "Operating System"
tags: ["linux", "filesystem", "vfs", "file descriptor"]
description: "Follow a pathname through dentries/inodes to an open-file description and distinguish namespace caches from disk data."
sources:
  - title: "Linux man-pages: lseek(2)"
    url: "https://man7.org/linux/man-pages/man2/lseek.2.html"
updated: 2026-10-17
translationKey: "operating-system/vfs-path-resolution-and-open-file"
---

Linux supports many filesystems through the Virtual Filesystem (VFS), an interface layer that lets system calls such as `open`, `read`, and `stat` work with ext4, XFS, NFS, procfs, and others. VFS provides common objects and operations; each filesystem implements its own semantics.

Conceptually, a file is a sequence of bytes with a low-level identity, commonly associated with an inode. A directory maps readable names to underlying objects. A name such as `report.txt` is just a convention; the filesystem usually does not check whether the extension matches the contents. Unix uses one name tree to access many resource types, but a name in the namespace does not mean every object behind it is disk data.

Not every filesystem reads from disk. `procfs`, `sysfs`, and `devpts` are special filesystems that expose kernel or device interfaces in the pathname tree. FUSE lets a filesystem be implemented in user space through a kernel interface, useful when all logic need not live in the kernel. VFS provides a common access API, but does not make every filesystem's latency, durability, or ownership behavior identical.

## Path lookup

The kernel starts at the root or current working directory and looks up each component. The dentry cache stores name-to-directory relationships to speed lookup; the inode cache stores object metadata. A cache miss may require filesystem, device, or network work. Permissions are checked along the path using credentials.

A symbolic link continues lookup through its target; a mount point enters another filesystem. A mount namespace can make the same path appear differently in different processes.

## File descriptors and open-file descriptions

Each process has a descriptor table; an FD is a small integer handle. The descriptor references a kernel **open-file description** containing flags and file offset, then an inode/file operation. `dup` or `fork` can share the open-file description, so two FDs can share one offset.

`pread`/`pwrite` use an explicit offset and avoid changing a shared sequential offset like `read`/`write`. Descriptor inheritance and close-on-exec affect child processes.

Sequential `read`/`write` usually update the current offset. On seekable descriptors such as regular files, `lseek` changes the offset in the open-file state; it does not move a disk head or issue I/O by itself. Pipes, FIFOs, and sockets have no random-access offset, so `lseek` fails with `ESPIPE` on Linux ([lseek(2)](https://man7.org/linux/man-pages/man2/lseek.2.html)). A later read/write may cause an HDD seek depending on the actual block location. On Linux, `strace` can show syscall names, arguments, and return codes, linking application API behavior to the kernel path.

## Exercise with file APIs

Build three small tools to see what the APIs actually provide: a `stat` command that prints size, allocated blocks, and link count; a directory lister using `opendir`/`readdir` with a detailed mode using `stat`; and a `tail -n` version that seeks near the end with `lseek` instead of loading the whole file into RAM. Then write a recursive directory traversal like a minimal `find`.

Handle permission errors, a file disappearing between listing and `stat`, symbolic links, nested directories, empty files, and a file without a final newline. These cases show that APIs return observations from a moment in time; the directory tree can change while a program traverses it.

## VFS does not erase semantic differences

Network filesystems, procfs, and local disks can all be opened with `open`, but their latency, locking, durability, and error behavior differ. A common API improves portability in some ways; it does not make every file behave identically.

## Summary

- VFS provides a common interface to many filesystems.
- Dentry/inode caches speed path lookup and metadata access.
- An FD indexes a process table; the open-file description holds offset and flags.
- Directories map user-visible names to objects; file extensions are conventions.
- `dup`/`fork` can share an offset; `pread`/`pwrite` avoid a shared sequential offset.
- `lseek` changes a kernel-side logical offset, not necessarily a disk seek or immediate I/O.
- The same syscall can have different latency and durability across filesystems.

## Check your understanding

**Does FD 5 refer to the same file in every process?** No. The number is meaningful only in one process's descriptor table.

**Do two descriptors after `dup` always have independent offsets?** No. They commonly share an open-file description.

**Does VFS make NFS behave like a local drive?** No. Remote semantics remain.

## Read next

The kernel caches file data in the page cache; buffered and direct I/O take different paths.
