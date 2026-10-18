---
title: "rsync: File Transfer and Safe Directory Sync"
category: "Network"
tags: ["network", "rsync", "file transfer", "synchronization"]
description: "Distinguish copying from synchronization, understand trailing slashes, dry runs, --delete, and safeguards when using rsync."
updated: 2026-10-16
translationKey: "network/rsync-file-transfer-and-safe-sync"
---

`rsync` is useful when you need to transfer a directory tree repeatedly and want later runs to send only what needs updating. It can run between two directories on one machine or over SSH between machines. Unlike a simple copy command, `rsync` can preview changes, exclude files, and control how existing destination files are handled.

## Basic command

```sh
rsync -a source/ user@host:/srv/backup/
```

Both ends need `rsync`. With `user@host:path`, the source machine typically invokes `rsync` on the destination through SSH. If the remote side reports that `rsync` cannot be found, install it there or specify its path with `--rsync-path`.

`-a` is archive mode. It is useful for copying directory trees while preserving commonly needed properties such as subdirectories, symbolic links, timestamps, and permissions. Do not assume `-a` preserves every kind of metadata on every system; ownership, ACLs, extended attributes, and special devices may require additional options or privileges.

## A trailing slash changes the destination layout

```sh
rsync -a project  host:/backup/
rsync -a project/ host:/backup/
```

Assume `/backup/` already exists as a directory. The first command creates `/backup/project/...`; the second copies the contents of `project` directly into `/backup/`. Combined with `--delete`, a mistaken slash can change the deletion scope substantially. Check both paths before running the command.

## Preview before writing

```sh
rsync -anv project/ host:/backup/project/
```

`-n` performs a trial without changing files; `-v` lists the planned activity. Use this before `--delete`, before the first synchronization, or whenever you are unsure how rsync interprets the paths.

By default, rsync does not remove extra files at the destination. Adding `--delete` makes the destination match the source file set by removing files that exist only at the destination:

```sh
rsync -anv --delete project/ host:/backup/project/
```

Remove `-n` only after the preview shows exactly the intended changes. The destination must be the correct directory; `--delete` is not a harmless cleanup option.

## Filters and destination safeguards

```sh
rsync -a --exclude='.git/' project/ host:/backup/project/
rsync -a --backup --suffix='.old' project/ host:/backup/project/
```

`--exclude` takes a pattern matched relative to the transferred tree; multiple rules can be stored in a file and supplied with `--exclude-from=file`. The first matching rule decides inclusion or exclusion, so put required includes before broad excludes; a later include cannot undo an already matched exclude. Parent directories must also remain traversable so rsync can discover children ([rsync manual](https://download.samba.org/pub/rsync/rsync.1#FILTER_RULES)). Use `-n` to confirm that required files are not accidentally filtered out.

By default, rsync commonly compares size and modification time to decide whether a file needs transferring. `--checksum` reads file contents to compare checksums, at additional I/O and CPU cost. `--ignore-existing` skips files already at the destination; `--backup` saves an existing version before overwriting it; `--update` avoids overwriting a destination file with a newer timestamp. These options express different policies; none replaces checking your backups.

## Speed and limits

`-z` compresses data in transit. It can help on a slow link with compressible data; on a fast link or with already-compressed data, the benefit may be small. `--stats` summarizes transfer activity. A successful synchronization does not by itself prove that data has been backed up independently: accidental deletion or source corruption can propagate to the destination, especially with `--delete`.

If an upload saturates the link, `--bwlimit` caps rsync's rate and leaves capacity for other connections. Measure before enabling compression: on a fast LAN, CPU time spent compressing and decompressing may slow both ends. Large sequential transfers often suit network storage better than random access across many small files, which is sensitive to latency.

When data crosses an untrusted network, protect both endpoint authentication and confidentiality; correct file permissions alone do not prevent eavesdropping. With rsync over SSH, SSH provides an encrypted channel and host authentication, while access to the destination files still needs its own restrictions.

## A safer workflow

1. Confirm the source, host, and destination directory.
2. Decide whether the destination should contain the source directory itself or only its contents; check the trailing slash.
3. Run `rsync -anv ...` and review files that would be added, updated, or deleted.
4. Remove `-n` only after the preview is correct.
5. For important data, keep independent versions or backups; synchronization is not a substitute for backup.

## Check your understanding

**Do `rsync -a dir host:dest` and `rsync -a dir/ host:dest` create the same destination layout?** They differ when `dest` already exists as a directory: the first puts `dir` inside it; the second puts the contents there. If `dest` does not exist, destination naming can make the layouts look alike; inspect the destination conditions with a dry run.

**Does `--delete` remove files from the source?** No. It removes destination paths absent from the source, within the transfer scope.

**Does `-n` really transfer or delete files?** No. It previews the plan; use it to inspect the operation before applying it.

## Read next

Compare `rsync` with [NFS and remote-file semantics](/en/notes/network/nfs-remote-file-semantics/) and [SMB/CIFS between Linux and Windows](/en/notes/network/smb-cifs-linux-file-sharing/): rsync transfers copies in individual runs, while NFS/SMB provide network access to file trees with semantics and failures shaped by the connection.
