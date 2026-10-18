---
title: "fsync, rename, and Safe File Updates"
category: "Operating System"
tags: ["operating-system", "filesystem", "durability"]
description: "Distinguish atomic rename from durability, then build a crash-aware update procedure using a temporary file and directory synchronization."
updated: 2026-10-17
translationKey: "operating-system/filesystem-fsync-rename-atomicity"
---

An application may need to replace a configuration file without letting readers see partially written content. Writing directly to the old file can leave partial state if the process crashes. Creating a temporary file on the same filesystem and renaming it commonly makes the name change atomic, but atomicity does not mean the data is durable after power loss.

## An update procedure

1. Create the temporary file in the same directory as the destination. Being on the same filesystem is required for an atomic rename; using the same directory makes directory synchronization easier to reason about.
2. Write the complete contents, set metadata that must be preserved such as permissions, and check operation errors.
3. Call `fsync` on the temporary file and check its result to request that the file data and metadata become stable.
4. Rename the temporary file over the destination and check for errors.
5. Call `fsync` on the directory containing the destination and check its result to request that the directory-entry change become stable. Syncing the file does not by itself ensure its name is durable; see [`fsync(2)`](https://man7.org/linux/man-pages/man2/fsync.2.html).

If the temporary file is in another directory, rename may still be atomic on the same filesystem, but both source and destination directories change; consider synchronizing both. Durability details depend on the filesystem, mount options, kernel, device cache, and hardware. `fdatasync` may be enough when metadata does not affect how the data is read; choose according to the application's contract.

## Atomicity differs from durability

Atomic rename ensures observers see either the old name or the new name rather than a half-completed rename. If power fails before metadata is flushed, the result after reboot still depends on the filesystem and device. Writing multiple files separately does not create an atomic transaction across those files.

## Check your understanding

**Does atomic rename mean the contents are certainly durable?** No.

**Should the temporary file be on a different filesystem?** No; cross-filesystem rename is commonly non-atomic and may fail.

**Is `fsync(file)` always enough to persist the new name?** A directory sync may be needed after the rename.

## Further reading

Journaling protects metadata in different modes but does not replace the application's durability contract.
