---
title: "Logs, time, and scheduled jobs on Linux"
category: "Operating System"
tags: ["linux", "logging", "cron", "systemd timer"]
description: "Find logs in the journal or syslog, distinguish clocks from time zones, and choose cron, timers, or one-shot jobs."
updated: 2026-10-16
translationKey: "operating-system/linux-logs-time-jobs"
---

When a service fails, logs help reconstruct what happened. Incorrect timestamps or rotated and deleted logs can make diagnosis difficult. Linux has several log sources, clocks, and job schedulers; understand their purposes instead of looking for everything in one file.

## The journal and log files

systemd-journald can receive logs from the kernel, services, and sessions; `journalctl` filters by unit, boot, and time. Some systems forward logs to rsyslog or write files under `/var/log`. Whether logs persist or remain volatile depends on the distribution's configuration.

Log rotation splits large files into smaller versions, compresses them, or deletes them according to a retention policy. If a service is still writing to a file that has been renamed, it needs a suitable reopen or logrotate mechanism; otherwise, it may keep writing to the old unlinked file.

Logs should include timestamps, severity, request or correlation IDs, and information needed for investigation, but should not casually include secrets, tokens, or sensitive data.

## Wall clock, monotonic clock, and time zones

The wall clock represents civil date and time and can be adjusted by NTP or an administrator. A monotonic clock is suitable for measuring durations because it does not move backward when the time zone or wall clock changes. A time zone changes how time is interpreted or displayed; storing timestamps in UTC usually helps systems exchange them.

NTP synchronization reduces clock skew but does not make every machine's clock perfectly accurate. Distributed systems must tolerate clock error and should not use timestamps alone to prove causal order.

## Cron, systemd timers, and `at`

Cron is suitable for simple recurring schedules. A systemd timer can be associated with a service unit and supports dependencies, state, and journal logging. `at` runs something once at a future time. A scheduled task must account for overlapping runs, late starts, a PATH different from an interactive shell, and failures without a terminal.

If a job takes longer than its interval, prevent two instances from overlapping or make the job idempotent. “Every hour” can mean a calendar schedule or one hour after the previous run; time zones and daylight saving time can affect cron.

## Summary

- Logs may be in the journal or in files, depending on distribution configuration.
- Rotation and retention determine how long logs remain available.
- A wall clock provides timestamps; a monotonic clock measures durations.
- NTP reduces skew but does not create a perfect clock.
- Cron, timers, and `at` have different semantics; tasks need a clear environment and retry behavior.

## Check your understanding

**Does `journalctl` always have logs from the previous boot?** Only when the journal is configured for persistent storage.

**Does NTP make timestamps on all machines perfectly identical?** No. Clock error and update delays remain.

**Does a cron job run in your interactive login-shell environment?** No. Its environment is usually minimal.

## Read next

The **Processes & Scheduling** topic covered the CPU scheduler; Linux also provides tools for observing processes and limiting resources.
