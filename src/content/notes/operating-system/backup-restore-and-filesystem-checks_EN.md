---
title: "Backup, Restore, and Filesystem Checks"
category: "Operating System"
tags: ["operating-system", "filesystem", "backup"]
description: "Distinguish consistency checks from backups, make copies independent, and verify that restoration works."
updated: 2026-10-16
translationKey: "operating-system/backup-restore-and-filesystem-checks"
---

A filesystem check repairs some structural inconsistencies; it does not recover a deleted file or data that has been overwritten. A backup preserves a copy for recovery after device failure, operator error, or a security incident. These practices address different risks.

## `fsck` and journal recovery

After a crash, a journaling filesystem often replays its journal to restore metadata invariants. `fsck` or a filesystem-specific tool checks structures more deeply and usually requires the filesystem to be unmounted or in an appropriate mode. Running a repair tool on a filesystem mounted read-write may cause further corruption.

## Backups that can be restored

Backups should be independent of the failure domain, have retention and versioning, restrict write access, and include an offline or immutable copy where appropriate. A snapshot on the same device helps with quick rollback but does not protect against device failure or an attacker who can delete the snapshot.

A restore test checks the procedure, keys, metadata, permissions, and recovery time. A backup that has never been restored only proves that data was written somewhere; it does not prove that the data can be used again.

## Check your understanding

**Does a journal replace a backup?** No.

**Can a snapshot on the same storage survive that storage failing?** No.

**Does a successful backup job prove a restore will succeed?** No.

## Further reading

Crash consistency explains filesystem recovery; application consistency may also require coordination across files and databases.
