---
title: "Troubleshooting Linux Services: State, Logs, and Dependencies"
category: "Operating System"
tags: ["linux", "systemd", "troubleshooting", "services"]
description: "Use systemctl and journalctl in order to diagnose a failed service instead of repeatedly restarting it."
updated: 2026-10-16
translationKey: "operating-system/linux-service-troubleshooting"
---

When a service does not work, repeatedly restarting it may hide the cause or disrupt the system further. Investigate in order: confirm its state, read its configuration, inspect logs around the failure, check dependencies, and reproduce one change at a time.

## Step 1: state and configuration

```sh
systemctl status example.service
systemctl cat example.service
systemctl list-dependencies example.service
```

The unit name is an example. `status` provides recent state and PID; `cat` shows the original file and drop-ins; the dependency list can reveal required mounts, networks, or credentials.

`failed` is a state, not a cause. Exit code, signal, timeout, or dependency failure narrows the diagnosis.

## Step 2: logs for the right time window

```sh
journalctl -u example.service --since "10 minutes ago"
```

Read the lines before and after the error, not only the last line. If a service writes its own log file, check permissions, rotation, and filesystem capacity. Logs may contain secrets or user data; filter sensitive information before sharing them.

## Step 3: verify the runtime environment

A service commonly has a different user, working directory, environment, and PATH from an interactive shell. Check the executable, configuration files, permissions, occupied ports, resource limits, and secret mounts. Do not fix a permissions problem by running the service as root if the real issue is incorrect access.

## Restart and rollback

After changing a unit file, reload the manager; then restart or reload the application as appropriate. A restart may interrupt connections or in-flight requests. For a remotely accessed service, keep a console or rollback path before changing network or authentication settings.

Record the starting state and the change. If a new problem appears, restore the previous configuration and analyze separately rather than stacking unclear changes.

## Summary

- Confirm state, unit, and dependencies before restarting.
- Read logs for the correct time window and protect sensitive data.
- Services have different environments and permissions from shell users.
- Exit codes, timeouts, and dependency failures help identify causes.
- Change one thing at a time and keep a rollback path for critical services.

## Check your understanding

**Does a successful `systemctl restart` prove the service works correctly?** No; check health and user-facing behavior.

**If a command works in a terminal, will it necessarily work under systemd?** No; the environment and permissions may differ.

**Is increasing privileges to root a safe fix for a failed service?** No; first identify which file or resource was denied.

## Further reading

This topic connects boot and systemd units with accounts, logs, storage, and resource limits.
