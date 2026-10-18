---
title: "systemd services: units, dependencies, and timers"
category: "Operating System"
tags: ["linux", "systemd", "service"]
description: "Understand how service units are described, how dependencies differ from ordering, and how to inspect service state."
updated: 2026-10-16
translationKey: "operating-system/systemd-service-dependencies-and-timers"
---

systemd manages a system through named units and explicit relationships. A service is one kind of unit; a target groups units; a timer activates work at a specified time. Understanding this model helps fix the cause instead of toggling services by guesswork.

## What is in a service unit?

A unit file commonly has `[Unit]`, `[Service]`, and `[Install]` sections. `[Unit]` describes purpose, conditions, and relationships; `[Service]` specifies the command, how to track the process, and error handling; `[Install]` says which target includes the unit when it is enabled.

`Type=simple` suits a foreground process that systemd can track directly. `Type=oneshot` runs a task and exits. `Type=forking` is for older programs that fork into a daemon and commonly needs `PIDFile=`. Prefer foreground execution when the application supports it; it lets systemd track the main process more reliably.

Some daemons report readiness with `Type=notify`; `Type=dbus` waits for the service to register a D-Bus name. This lets dependencies that need a “ready” service avoid confusing process creation with the point where it can serve requests. Use only a type the application supports; otherwise, systemd may wait for the wrong signal or mark the unit active too early.

## Dependency is not ordering

`Wants=` and `Requires=` pull in another unit with different dependency strength. `After=` and `Before=` describe start or stop order; they do not pull the other unit into the transaction. For example, a service may need `network-online.target` first, but `After=network-online.target` alone does not ensure the target starts.

`systemctl enable` creates links so a unit is pulled in at boot; `systemctl start` launches it in the current session. A unit may be enabled but failed, or active but not enabled. Check these as separate questions.

## Restart and timers

`Restart=on-failure` can restart a process after an error, but does not replace error handling. Add a delay, limit repeated starts, and keep useful logs to avoid a restart loop hiding the cause.

A timer unit can run a service on a calendar schedule (`OnCalendar=`) or relative to boot or activity (`OnBootSec=`, `OnUnitActiveSec=`). Timers let systemd manage and log recurring work; the triggered service still needs to be safe when run repeatedly.

Socket activation lets systemd open a socket first and start a service only when a connection arrives. It can reduce idle services and hold incoming connections while the service starts, but the application must support receiving a socket passed by systemd. `systemctl list-jobs` shows pending or running activations; `systemctl status` shows unit state, processes in its cgroup, and recent logs. After editing a unit file, `daemon-reload` rereads its definition; this differs from reloading configuration inside a running service.

## How to investigate

- `systemctl status name.service`: recent state and a few log lines.
- `systemctl cat name.service`: original configuration and overrides.
- `systemctl list-dependencies name.target`: dependency tree.
- `journalctl -u name.service -b`: unit logs from the current boot.
- `systemctl daemon-reload`: reread edited unit files.

After editing, check for configuration errors before restarting. Use an override under `/etc/systemd/system/...d/` when changing a package-provided unit so package updates do not erase the change.

## Check your understanding

**Does `After=` automatically start the referenced unit?** No. It sets order only if both units enter the transaction.

**Does `enabled` mean that a service is currently running?** No.

**Which service does a timer invoke?** Usually one with the same name, unless `Unit=` specifies another.

## Read next

When a service runs but still fails, the journal and system logs provide timestamps and original messages.
