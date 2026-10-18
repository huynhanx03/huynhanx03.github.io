---
title: "Process Limits, File Descriptors, and `ulimit`"
category: "Operating System"
tags: ["linux", "process", "resource-limits"]
description: "Understand soft and hard limits, file-descriptor and process limits, and diagnose failures to open files or create threads."
updated: 2026-10-16
translationKey: "operating-system/linux-process-limits-ulimit"
---

Processes need finite resources such as file descriptors, processes or threads, stack space, and address space. Linux provides per-process rlimits as well as system-wide and cgroup limits. The `ulimit` command shows or sets some limits in a shell, which child processes inherit.

## Soft and hard limits

The soft limit is the current limit; the hard limit is a ceiling that an unprivileged user usually cannot exceed. `ulimit -n` shows the shell's maximum number of file descriptors; `/proc/PID/limits` shows limits for a particular process. A systemd unit can configure `LimitNOFILE=`.

## File-descriptor exhaustion and symptoms

An application may get `EMFILE` when its process runs out of file descriptors, or `ENFILE` when the system-wide file table is exhausted. Sockets, pipes, logs, and temporary files can all hold descriptors, and library code can open them too. A shared library mapped into memory does not necessarily retain an open FD for its lifetime. `lsof -p PID` or `/proc/PID/fd` can help locate them; merely counting descriptors may miss a leak that grows over time.

Failure of `fork()` or thread creation may result from `pids.max`, `RLIMIT_NPROC`, memory or stack limits, or a host-level limit. On Linux, `RLIMIT_NPROC` compares the total threads belonging to the caller’s real UID with the calling process’s limit, rather than counting only its own children; UID 0 and certain capabilities are exempt. See [getrlimit(2)](https://man7.org/linux/man-pages/man2/getrlimit.2.html). Raising limits before finding a leak only delays the failure and increases the risk of exhausting shared resources.

## Check your understanding

**Does running `ulimit` in a terminal always change an already-running service?** No.

**Does opening a socket use a file descriptor?** Yes.

**Do `EMFILE` and `ENFILE` have the same scope?** No; one is usually per-process, the other system-wide.

## Further reading

Cgroups apply limits to groups, while rlimits usually follow an individual process and are inherited by its children.
