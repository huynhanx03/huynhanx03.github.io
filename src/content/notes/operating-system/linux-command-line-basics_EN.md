---
title: "Linux command line: paths, files, and basic tools"
category: "Operating System"
tags: ["linux", "command line", "filesystem"]
description: "Use absolute and relative paths, navigate files, and understand what common commands do."
updated: 2026-10-16
translationKey: "operating-system/linux-command-line-basics"
---

A terminal is an input and output interface; a shell reads command lines and starts programs. Commands such as `pwd`, `ls`, `cd`, `mkdir`, `cp`, `mv`, `rm`, `cat`, and `less` may be programs or shell built-ins, depending on the command. Understanding paths and the working directory helps prevent mistakes.

## Absolute and relative paths

An absolute path starts at `/`. A relative path is interpreted from the current working directory. `.` means the current directory, `..` its parent, and `~` is commonly expanded by the shell to the home directory. `cd` changes the shell's working directory.

`ls -la` shows hidden files and metadata; `file` guesses the content type; `stat` reports detailed metadata. A `.txt` suffix is a naming convention, not proof that the bytes inside are text.

## Create, copy, rename, and remove

`cp` copies files. `mv` renames or moves a file within the same filesystem; across filesystems it may have to copy the data and then remove the original. `rm` removes a name directly and does not normally move it to a trash folder. Before a recursive or force operation, print and verify the path to avoid deleting the wrong target.

`mkdir -p` creates missing parent directories; `rmdir` removes only empty directories; `rm -r` can remove an entire tree. Use `--` before a name that begins with `-` when the command supports it.

## Globs and searching

The shell expands `*.log` into a list of names before the command runs. If there are too many matches, the argument list can exceed system limits; `find` is better for traversing large trees or filtering by metadata. `grep` searches file contents. Quote patterns and paths so the shell does not interpret them unexpectedly.

Tools such as `head`, `tail`, `sort`, `uniq`, `diff`, and `less` are often combined in pipelines to inspect data incrementally. `locate` searches a database that may be out of date; it does not scan the filesystem in the same way as `find`.

## Basic permissions

`ls -l` displays file type and permissions for owner, group, and others. `chmod` changes a mode; `chown` changes owner or group and usually requires appropriate privilege. Symbolic links have their own semantics: access checks generally follow the target, while a link's own permissions do not behave like those of an ordinary file on many Unix systems.

## Summary

- The working directory determines how a relative path is interpreted.
- The shell expands globs before a command receives its arguments.
- A move across filesystems may require copying data.
- `rm` removes names directly; verify targets before recursive or force operations.
- Permissions, ownership, groups, and symbolic links all affect actual access.

## Check your understanding

**Does `grep` expand `*.log` itself?** Usually the shell expands it before starting `grep`.

**Does moving a file always avoid copying its data?** No. Moving across filesystems may copy and then remove it.

**Can a file removed with `rm` normally be restored from a trash folder?** No; `rm` usually removes the name directly.

## Read next

Connect commands through streams and pipelines in [Shell streams and pipelines](/en/notes/operating-system/shell-streams-and-pipelines/).
