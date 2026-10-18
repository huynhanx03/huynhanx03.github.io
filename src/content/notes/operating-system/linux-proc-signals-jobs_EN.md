---
title: "Process Management: ps, Signals, Jobs, and wait"
category: "Operating System"
tags: ["linux", "process", "shell"]
description: "Use ps, kill, jobs, fg/bg, and wait to control processes; distinguish sending a signal from confirming a process has stopped."
updated: 2026-10-16
translationKey: "operating-system/linux-proc-signals-jobs"
---

A shell creates a job when it runs a command or pipeline, while the kernel manages processes and threads. Job control lets an interactive shell place a job in the foreground or background, but non-interactive services and scripts often need different lifecycle management.

## Inspecting processes

`ps -ef` or `ps aux` lists processes in common formats; `pgrep -a name` searches by name; `/proc/PID` provides kernel information. `pstree` shows parent-child relationships. A process can exit just after a query, and an old PID can be reused.

## Signals and `kill`

`kill PID` sends SIGTERM by default, asking a process to exit cleanly. SIGKILL forces the kernel to terminate the task without letting the process handle the signal or perform application cleanup. A successful signal call means only that the kernel accepted the request; it does not confirm that the process exited. Check again with `ps` or `wait`.

Prefer targeting a verified PID or process group. A broad pattern such as `pkill` can affect unintended processes.

## Job control and `wait`

Ctrl-Z sends SIGTSTP to the foreground job; `bg` resumes it in the background, and `fg` brings it back to the foreground. `&` runs a command in the background, but the shell may still send SIGHUP when the session closes, depending on configuration. In a shell script, `wait PID` collects a child's exit status; check the exit code.

## Check your understanding

**Does `kill` always kill a process?** No; it sends a signal.

**Does a background job automatically become a persistent daemon?** No.

**Does SIGKILL give an application a chance to flush data?** No.

## Further reading

A service manager such as systemd tracks process groups and cgroups and can restart services according to policy.
