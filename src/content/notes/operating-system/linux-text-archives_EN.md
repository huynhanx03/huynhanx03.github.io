---
title: "Reading Logs and Packaging Files: grep, tail, tar, and Compression"
category: "Operating System"
tags: ["linux", "text tools", "archives", "compression"]
description: "Combine command-line tools to filter logs and follow files, and understand how archives differ from compression."
updated: 2026-10-16
translationKey: "operating-system/linux-text-archives"
---

Unix provides many small programs that process text streams. Connecting them with pipes is often faster than writing a large tool for a simple task, but pay attention to encoding, quoting, and error status.

## Filter and follow logs

`grep -n` finds matching lines and shows their numbers; `tail -f` follows an expanding file; `less` lets you scroll; `sort | uniq -c` groups identical lines after sorting. If a log is rotated by renaming, `tail -f` may continue following the old file descriptor; `tail -F` usually follows the filename and reopens it after changes.

Basic `grep` regular expressions differ from PCRE; quote special characters to avoid shell expansion and preserve the intended pattern.

## An archive is not the same as compression

`tar` combines multiple paths, metadata, and contents into an archive; gzip, xz, and zstd compress a stream. `.tar.gz` usually means tar followed by gzip, not one tar format that is “compressed internally” at the same layer.

```sh
tar -czf backup.tar.gz directory/
tar -tzf backup.tar.gz
```

Before extracting an untrusted archive, list its contents and inspect its paths. An archive may contain unusual paths or large files that exhaust storage; extract it in a restricted directory.

## Size and integrity

Compression reduces size when data has redundant structure; already compressed or encrypted data often shrinks little. A hash or checksum can detect file changes but does not prove origin if the hash came from the same unauthenticated source.

## Summary

- `grep`, `tail`, `less`, `sort`, and `uniq` can be combined to analyze logs.
- `tail -F` is useful when a log file is rotated or renamed.
- `tar` archives multiple files; gzip, xz, and zstd compress data.
- Inspect an archive before extracting untrusted data.
- Checksums detect changes; authenticity requires a trusted source.

## Check your understanding

**Can `.gz` independently store a directory tree and permissions?** Gzip compresses a stream; tar commonly stores the file tree and metadata.

**Does a correct hash prove a file came from a trusted author?** Only if the hash itself came through an authenticated channel.

**Does `tail -f` always follow the new file after rotation?** Not necessarily; behavior depends on the option and rotation method.

## Further reading

The Linux tools topic continues with building, linking, and package installation.
