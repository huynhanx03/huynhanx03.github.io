---
title: "Processes and Job Control in the Shell"
category: "Operating System"
tags: ["linux", "process", "job control", "signals"]
description: "Distinguish shell jobs from processes, manage foreground/background work, and send signals deliberately."
updated: 2026-10-16
translationKey: "operating-system/linux-jobs-and-process-control"
---

A command run from a shell creates a process, but the shell also manages the concept of a **job** to control a pipeline or process group in a terminal session. Job control can pause foreground work, move it to the background, and resume it.

## Foreground and background

Adding `&` usually asks the shell to start a job in the background; the prompt may return before the job finishes. `jobs` lists jobs in the current shell; `fg` brings one to the foreground; `bg` resumes a stopped job in the background.

A background process can still stop if it tries to read from the terminal without appropriate control. Closing a terminal may send a signal to the process or session, depending on shell and configuration. `nohup`, a terminal multiplexer, and a service manager address different needs.

## Signals

`SIGTERM` asks a process to exit and gives it a chance to clean up; `SIGKILL` forces the kernel to terminate it and cannot be caught or deferred. `kill PID` usually sends TERM by default; verify the PID and command line first. A signal can also hit the wrong process if a PID has been reused.

A process may have children; the shell commonly waits for them and collects their status. A zombie is a child that exited but has not been waited for by its parent; `kill -9` does not help because it is no longer running.

## Exit status and pipelines

`$?` holds the most recent command's status in the shell. In a pipeline, the default status may reflect the final command; in Bash, `set -o pipefail` makes the pipeline fail if any component fails. A script must save a status before running another command if it needs it later.

## Summary

- A job is the shell's unit for managing processes and pipelines in a terminal session.
- `&`, `jobs`, `fg`, and `bg` control foreground and background work.
- TERM allows cleanup; KILL forces termination.
- Check a process before signaling it; the parent must reap a zombie.
- Pipeline exit status depends on shell configuration.

## Check your understanding

**Does a background job always survive the terminal closing?** Not guaranteed.

**Is `kill -9` the first method to use?** No; prefer graceful shutdown through TERM or a service manager.

**Does a zombie consume CPU?** It is not running; it retains status until the parent collects it.

## Further reading

Pipelines connect commands; for complex flows, make status and error streams explicit.
