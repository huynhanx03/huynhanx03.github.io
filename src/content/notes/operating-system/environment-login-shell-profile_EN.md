---
title: "Environment Variables, Login Shells, and Startup Files"
category: "Operating System"
tags: ["linux", "shell", "environment"]
description: "Understand where processes get their environment, how PATH works, and why an interactive terminal differs from a service."
updated: 2026-10-16
translationKey: "operating-system/environment-login-shell-profile"
---

An environment is a set of name/value pairs inherited when a process creates a child. It passes configuration such as `PATH`, `HOME`, locale, and proxy settings, but each process has its own environment; changing the current shell does not modify the environment of processes that are already running.

## `PATH` and locating programs

When a command has no `/`, the shell searches executable directories in `PATH` order. `command -v tool` shows what the shell will select; `which` may be a separate program and does not always reflect aliases or functions. Putting an untrusted directory at the start of `PATH` may cause a fake binary to run first.

`export NAME=value` puts a variable in the environment of child commands. `NAME=value command` applies only to that process. `env` inspects or constructs an environment; `env -i` starts with a clean environment to reproduce hidden-variable dependencies.

## Login, interactive, and non-interactive shells

A login shell may read a profile file; an interactive shell reads an interactive configuration file. Names and order depend on the shell. Bash commonly distinguishes `.bash_profile` or `.profile` from `.bashrc`. A terminal emulator, SSH login, cron job, and systemd service may start a shell differently.

Thus, a command that works in a terminal but fails as a service commonly has issues with `PATH`, `HOME`, permissions, working directory, locale, or a missing TTY. A unit should explicitly define `Environment=`, `EnvironmentFile=`, `WorkingDirectory=`, and an executable path when needed.

## Secrets and troubleshooting

Environment variables are convenient for configuration but are not a perfect secret store: they may appear in dumps, logs, or process inspection depending on the system. Do not print the entire environment when sharing logs. Use an appropriate secret mechanism and restrict access for sensitive values.

To compare environments, use `env | sort` carefully, `printf '%s\n' "$PATH"`, `pwd`, and `id`, and check how the process was started. Do not add a global `export` to every profile just to fix one service.

## Check your understanding

**If a child process changes `PATH`, does it change the parent's `PATH`?** No.

**Does cron certainly read `.bashrc`?** No.

**Does `PATH` only affect the shell?** It is usually passed to child programs and can be used by libraries to locate executables.

## Further reading

When building software, the environment, compiler, linker, and library paths all affect which program is created and run.
