---
title: "systemd Targets, Timers, and Scheduled Jobs"
category: "Operating System"
tags: ["linux", "systemd", "cron"]
description: "Compare targets with runlevels and systemd timers with cron, and investigate missed scheduled jobs."
updated: 2026-10-16
translationKey: "operating-system/systemd-targets-timers-and-scheduling"
---

systemd targets group units to describe a machine's desired state, much like runlevels in older init systems. `multi-user.target` commonly represents a multi-user system without a graphical interface; `graphical.target` also pulls in the desktop stack. A target is not a service daemon.

## When are timers an alternative to cron?

Cron runs commands on a simple schedule. A systemd timer activates a service unit and inherits logging, dependencies, sandboxing, resource limits, and service state. `OnCalendar=` describes an explicit schedule; `OnUnitActiveSec=` runs relative to the service's last activation.

`Persistent=true` can run a missed job after the machine was off, depending on the calendar timer. Scheduled jobs should be idempotent so rerunning them does not corrupt data. For jobs that depend on networking, understand the target and online conditions; the network-online target does not mean an Internet endpoint is ready.

## Troubleshooting

Use `systemctl list-timers --all` to see previous and next run times; `systemctl status job.timer job.service` to check state; and `journalctl -u job.service` to inspect output and errors. Check the timezone, calendar expression, permissions, working directory, and environment.

## Check your understanding

**Is a target a process?** No; it is a unit that groups dependencies.

**Do cron jobs and systemd timers have the same environment as an interactive shell?** No.

**Must a timer activate a service with the same name?** By default they commonly share a basename, but another unit can be configured.

## Further reading

Service environments and user permissions explain why a job can work manually but fail on a schedule.
