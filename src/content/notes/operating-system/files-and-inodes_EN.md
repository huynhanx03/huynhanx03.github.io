---
title: "Files, directories, and inodes: how does a filesystem represent names?"
category: "Operating System"
tags: ["filesystem", "inode", "directory", "storage"]
description: "Distinguish a filename from the file object, and trace directory entries, inodes, descriptors, and hard links."
updated: 2026-10-16
translationKey: "operating-system/files-and-inodes"
---

The path `/home/linh/report.txt` looks like the unique name of a file. Underneath, a filesystem commonly separates the **name in a directory** from file metadata and contents. Distinguishing these layers helps explain hard links, rename, unlink, and why a deleted file can still use disk space.

## A directory maps names to objects

A directory is a data structure that maps entry names to an inode or corresponding filesystem object. An inode stores metadata such as type, permissions, owner, size, and references to data blocks, depending on the implementation. The name `report.txt` usually lives in the parent directory; it is not a unique identity stored inside the inode.

The kernel resolves a path component by component: find `home`, then `linh`, then `report.txt`, checking directory traversal permissions along the way. A symbolic link can continue resolution at another target. A mount point connects the directory namespace to another filesystem.

## A file descriptor is not an inode

`open()` returns a file descriptor, a small number in the process's table. The descriptor refers to an open-file state in the kernel, including the current offset and flags; that state is associated with an inode or open object. Multiple descriptors created by `dup` or inherited through `fork` may share the same open-file description and offset.

Therefore, descriptor `3` is not a pathname or inode number. Closing it decreases a reference; the file object may remain alive if another descriptor or hard link exists.

## Hard links, symbolic links, and unlink

A hard link is another directory name pointing to the same inode. Removing one name with `unlink` decreases the link count; the data can be reclaimed only when no names and no required open references remain. A program holding a descriptor may continue reading the file after its last name has been unlinked.

A symlink is a separate object containing the target path. Its target may not exist; a symlink can also cross filesystem boundaries, while hard links are commonly limited to one filesystem and certain object types.

## Metadata and contents

Metadata includes permissions, owner/group, timestamps, size, and block mapping, depending on the filesystem. A `stat` operation returns metadata; reading a file accesses contents. Two different names may refer to the same inode; the same name over time may refer to a different inode after deletion and recreation.

A filesystem may store metadata and data in different blocks and use caches for speed. On-disk state may not be synchronized immediately with cache; durability belongs to the crash-consistency topic.

## From inode to data blocks

A Unix-like filesystem commonly divides a volume into metadata and data regions. The teaching model VSFS has a superblock (describing region sizes and locations), inode bitmap, data bitmap, inode table, and data region. At mount time the kernel reads the superblock to learn the layout; bitmaps show which inodes and blocks are free. Real filesystems may use trees or other structures instead of bitmaps, so this is a model for understanding principles, not a mandatory layout.

An inode must map file offsets to device blocks. A pointer model uses direct pointers for small files and multiple levels of indirect blocks for larger files; it supports random access but uses metadata and may need extra reads of indirect blocks. Extents store a starting location and length for a contiguous range of blocks; this is compact for long ranges but requires management when files fragment. Linked allocation saves direct metadata but makes access to middle or later blocks slow if the chain must be followed; FAT moves the links into a table that is easier to cache.

## Resolving a pathname

When the cache lacks data, `open("/foo/bar")` walks from root: find the root inode, read its directory block to find `foo`, get `foo`'s inode, then find `bar` and read the final inode. After permission checks, the kernel creates a file descriptor for the process. `read` uses the inode to locate blocks corresponding to the file offset, retrieves data, and updates the offset. Caches such as dentry, inode, and page cache can make later accesses avoid rereading structures from the device.

## Summary

- A directory entry connects a name to a file object; the inode holds metadata and links to data.
- A filesystem describes its volume, tracks free inodes/blocks, stores inodes, and maps files to data blocks.
- Direct/indirect pointers, extents, and linked allocation trade off random access, metadata, and contiguous allocation.
- A file descriptor is a process handle, not a pathname or inode.
- A hard link is another name for the same inode; a symlink is a file containing a path.
- `unlink` removes a name; reclaiming data depends on remaining links and references.
- A process may continue using an unlinked file through an open descriptor.

## Check your understanding

**Is a filename stored in the inode?** Usually the directory stores the name and a reference to the inode.

**Does deleting a file immediately erase every data byte?** No. The name is removed; reclaiming space depends on remaining references and filesystem behavior.

**Do two descriptors for the same file always have separate offsets?** No. If they share an open-file description, the offset may be shared.

## Read next

The next note explores block allocation and internal filesystem structures.
