---
title: "Filesystem Quotas and Reserved Space"
category: "Operating System"
tags: ["operating-system", "filesystem", "quota"]
description: "Distinguish user, group, and project quotas from total filesystem block and inode capacity, and understand reserved space."
updated: 2026-10-16
translationKey: "operating-system/filesystem-quota-and-reserved-space"
---

A filesystem may have free space overall while a user or project has already reached its quota. Conversely, a user may still be able to write when overall free space is low if their quota has not been reached. A quota is an allocation policy; `df` mainly reports the filesystem's overall state.

## Blocks, inodes, and grace periods

A quota may limit data blocks, inode count, or both. A soft limit may allow temporary overage during a grace period; a hard limit blocks writes immediately when reached. Tools and operations differ by filesystem, such as traditional quotas, project quotas, or a filesystem-specific tool like `xfs_quota`.

## Reserved blocks

Some filesystems reserve part of their capacity for root or internal operations to reduce fragmentation risk and aid recovery when the filesystem is nearly full. The space “available” to a user is often lower than the total “free” space. Reserved space is not a backup and does not guarantee that every system application will continue working when the filesystem is full.

## Investigation

Check `df -h`, `df -i`, user/group/project quotas, the correct filesystem and mount, and whether deleted files are still open. Do not reduce the reserved percentage or increase a quota without understanding the workload; a service may still need room for its journal, logs, and recovery.

## Check your understanding

**Does free space in `df` mean a user can certainly write?** No; a quota may block them.

**Are byte and inode quotas the same limit?** No.

**Are reserved blocks outside the filesystem?** No; they belong to the filesystem but have restricted use.

## Further reading

`df` and `du` can differ when metadata, deleted-but-open files, quotas, or reserved blocks affect the results.
