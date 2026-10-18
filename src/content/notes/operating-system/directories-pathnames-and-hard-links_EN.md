---
title: "Directories, pathnames, hard links, and symbolic links"
category: "Operating System"
tags: ["operating-system", "filesystem", "inode"]
description: "Understand directories as mappings from names to inodes, distinguish hard links from symlinks, and follow paths across mount points."
updated: 2026-10-16
translationKey: "operating-system/directories-pathnames-and-hard-links"
---

On Unix-like systems, a filename is not the file itself. A directory is a data structure that maps names to inodes; an inode holds metadata and references to content or storage structures. Multiple names can refer to the same inode.

Applications read directories through dedicated interfaces such as `opendir` and `readdir`, rather than writing arbitrary bytes to a directory as if it were an ordinary file. An entry usually provides a name and inode number; to learn full permissions, ownership, or size, a program makes another call such as `stat`. A new directory has the special entries `.` (itself) and `..` (its parent). That is why `rmdir` removes only empty directories, while `mkdir` creates a new one.

## Hard links

A hard link is another directory entry that refers to the same inode. The names share the inode's content and metadata; removing one name removes only one link. The data can be reclaimed when the link count reaches zero and no process still has the file open.

Hard links generally cannot cross filesystems because an inode has meaning only within its filesystem. Many filesystems also prohibit hard links to directories to avoid cycles in the directory tree.

## Symbolic links

A symbolic link is a special file containing the target pathname. It can cross filesystem boundaries and point to a directory, but the target can be removed or renamed, leaving a dangling link. `ln -s target link` creates a symlink; `readlink` shows the pathname it stores. A relative path in a symlink is interpreted relative to the directory containing that symlink.

## Pathnames and mounts

An absolute path starts at `/`; a relative path is interpreted from the process's current working directory. As the kernel resolves each component, search (`x`) permission on parent directories determines whether traversal is allowed. A mount point makes another filesystem appear at a directory, hiding the old contents at that location until it is unmounted.

`stat` reports inode metadata; `lstat` reports the symlink itself rather than following it; `findmnt` identifies the mount containing a path. Different paths can refer to the same inode; comparing device and inode numbers helps identify hard links.

`unlink` removes a name from a directory and decrements the link count. The file is reclaimed only when it has no hard links and no remaining open references. `rm` uses unlink for files; it does not remove a directory tree with one system call. Mounting places another filesystem's root at a mount point in the shared tree; the old contents there are hidden while the mount is active.

## Check your understanding

**Does removing one hard link immediately delete the data?** Only if no directory links remain and no process has the file open.

**Does a symlink contain the target inode?** No. It contains a pathname.

**Is `x` on a directory the same as execute permission on a file?** For a directory, it permits search and traversal.

**Why does `rmdir` reject a directory that still contains files?** Its entries must be removed before the directory can be deleted as empty.

## Read next

The kernel resolves a pathname to an inode through the VFS, mount namespace, permissions, and path caches.
