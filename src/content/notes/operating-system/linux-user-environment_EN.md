---
title: "The Linux User Environment: PATH, Profiles, and Permissions"
category: "Operating System"
tags: ["linux", "environment", "shell", "permissions"]
description: "Understand environment variables, PATH, shell startup files, and differences between interactive sessions and services."
updated: 2026-10-16
translationKey: "operating-system/linux-user-environment"
---

A command that works in a terminal but reports “command not found” in a service often does so because the service has a different PATH and environment. Each process receives its environment variables from its parent when it is created; shell profiles and service managers may modify them according to different rules.

## Environment variables are inherited

`PATH` is the list of directories a shell searches for executables. `HOME`, `LANG`, proxy settings, and other application variables affect program behavior. Environment variables are passed to child processes when exported; shell variables are not exported automatically.

A safe `PATH` contains trusted directories. Putting `.` or a directory writable by an untrusted user first may cause an unintended executable to run. In administrative scripts, use absolute paths for sensitive commands or set PATH explicitly.

## Startup files depend on shell mode

Login, interactive, non-interactive, and script shells may read different configuration files. Bash and zsh also have their own rules. Therefore, `.bashrc` is not read by every process.

A systemd service does not by default run as the user's login shell. Declare required environment in the unit/drop-in or the service's supported configuration, and avoid storing secrets in world-readable files.

## User, group, umask, and file mode

A process runs with a UID/GID and supplementary groups. `umask` removes some permissions when a file is created; it does not add permissions beyond the mode requested by the program. Group changes commonly require a new login session or process for credentials to update.

`sudo -u user command` can test a command under another identity, but the environment may still differ from a service. Check working directory, HOME, PATH, umask, and permissions on every path component.

## Secrets and the environment

Environment variables are convenient for configuration but may be exposed through process inspection, crash dumps, logs, or administrative tools, depending on the system. For production secrets, prefer a platform-appropriate secret manager, protected file descriptor, or mount; restrict read access and rotate values.

## Summary

- A process inherits environment from its parent; not every shell variable is exported.
- PATH determines executable lookup and is risky if it contains untrusted directories.
- Interactive shells, scripts, and services load different configuration.
- UID/GID, umask, working directory, and HOME affect behavior.
- The environment is not automatically a safe long-term secret store.

## Check your understanding

**If a variable exists in a terminal, will a systemd service also see it?** No; configure the service environment explicitly.

**Does `umask 077` give new files mode 077?** No; umask removes permissions from the requested mode.

**Is having `.` in PATH always harmless?** No; an unintended executable in the current directory may run.

## Further reading

Build and package tools turn source code into deployable executables.
