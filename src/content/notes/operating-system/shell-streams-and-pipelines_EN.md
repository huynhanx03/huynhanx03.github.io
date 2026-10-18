---
title: "The shell, streams, and pipelines on Linux"
category: "Operating System"
tags: ["linux", "shell", "pipeline", "stdin"]
description: "Understand how a shell coordinates processes, the three standard streams, redirection, and pipes."
updated: 2026-10-16
translationKey: "operating-system/shell-streams-and-pipelines"
---

A shell is a program that accepts commands, parses their syntax, and starts processes; it is not the kernel. Bash, zsh, and `/bin/sh` have different syntax and capabilities. `cd` is usually a built-in because the shell must change its own working directory. If `cd` ran only in a separate child process, changing that child's directory would not change the parent shell's directory.

## The three standard streams

A process commonly receives file descriptor 0 for stdin, 1 for stdout, and 2 for stderr. They may point to a terminal by default, but can be redirected.

```sh
command < input.txt > output.txt 2> errors.log
```

`>` overwrites a file, while `>>` appends; using the wrong one can lose data. `2>&1` sends stderr to wherever stdout points at that moment, so redirection order matters.

## Pipelines

```sh
grep "ERROR" app.log | sort | uniq -c
```

A pipe connects the left process's stdout to the right process's stdin. The kernel maintains a bounded buffer; if the consumer is slow, the producer may block. Commands in a pipeline are usually separate processes, and the shell waits for them and collects their statuses according to its rules.

Pipelines make it easy to combine small tools, but quoting, exit status, and empty input need attention. Bash's `pipefail` makes a pipeline report failure if an intermediate command fails; by default, many shells return only the status of the last command.

## Quoting and expansion

Before running a command, a shell may expand variables, globs, command substitutions, and split words. `"$file"` usually preserves spaces in a path value; unquoted `$file` may undergo word splitting and glob expansion. Single quotes preserve their contents literally according to shell rules.

Do not concatenate untrusted input into a shell command string. In application code, use a process API that accepts a separate argument vector; in scripts, quote variables and validate input.

## Exit status

Exit status 0 usually means success; a nonzero value indicates another result or an error according to the program's contract. `&&` runs the next command only if the previous one succeeded; `||` selects an error branch. Check stderr and the exit code instead of relying only on printed output.

## Summary

- A shell parses commands and starts processes; the kernel manages those processes.
- stdin, stdout, and stderr are file descriptors that can be redirected.
- A pipe connects streams through a kernel buffer; intermediate failures can be hidden without configuration.
- Quoting prevents unwanted shell splitting and expansion.
- Exit status is part of a command's contract.

## Check your understanding

**Is `cd` a child process changing the shell's directory?** It is usually a built-in that changes the current shell's state.

**Does `2>&1` mean the same thing in every position?** No. Redirection order affects which destination is copied.

**Does a pipe pass a file directly between programs?** No. It connects streams through a kernel buffer.

## Read next

A shell script is a program with variables, conditions, and failure paths; it needs more care than an interactive one-liner.
