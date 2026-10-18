---
title: "Linux logs: the journal, syslog, and log rotation"
category: "Operating System"
tags: ["linux", "logging", "journalctl"]
description: "Find where logs are collected, filter them by time and service, and understand why logs need rotation."
updated: 2026-10-16
translationKey: "operating-system/linux-journal-logging-rotation"
---

When a service fails, logs provide a time-ordered record of what the system observed. Linux may write logs to the systemd journal, forward them through syslog, or store them as files under `/var/log`. Not every machine stores logs the same way.

## The journal and log files

`journald` receives messages from the kernel, services, and applications. Depending on configuration, the journal may exist only in memory until the next boot or persist on disk. `journalctl` reads these records and can filter by boot, unit, priority, or time range.

Files such as `/var/log/auth.log`, `/var/log/syslog`, or application-specific logs depend on the distribution and service. A syslog daemon may receive messages, write them to files, or forward them to a central log host. Confirm where the machine under investigation writes logs instead of assuming a path.

In the traditional syslog model, an application often sends messages through the Unix socket `/dev/log`; the daemon may write them locally or receive and forward logs over the network to centralize multiple machines. A facility classifies the source (for example, kernel or mail), while severity/priority indicates urgency. The journal stores additional structured fields and systemd metadata. Its `PRIORITY` field uses the same severity scale as syslog: 0 is emergency and 7 is debug, though tools may display different labels. See [journal fields](https://github.com/systemd/systemd/blob/main/man/systemd.journal-fields.xml).

Networked logs need source authentication and transport protection when they contain sensitive data. Encryption does not prove that application-provided content is truthful; logs should be treated as evidence with a source and trust boundary, not absolute truth.

## Read logs with a purpose

- `journalctl -b`: logs from the current boot.
- `journalctl -b -1`: the previous boot, if the journal is persistent.
- `journalctl -u ssh.service --since today`: a unit's logs since the start of the day.
- `journalctl -p warning..alert`: filter by priority.
- `journalctl -f`: follow new log entries.
- `dmesg -T`: kernel messages, useful for investigating device errors.

Record the time and time zone, then compare application, service, kernel, and network logs. A line saying “failed” is often a symptom; the lines before it may contain the root error.

## Rotation and disk usage

An unbounded log file eventually fills a filesystem. Log rotation renames or compresses old files, creates a new one, and deletes data according to policy. `logrotate` is common; the journal has its own size limits. If a process still has a deleted file open, `du` and `df` may report different usage until that process closes the file.

Do not casually delete a log that a process is writing. Use the service's rotation or reopen mechanism, retain logs long enough to investigate, and avoid writing secrets such as tokens or passwords into logs.

## Check your understanding

**Which boot does `journalctl -b` show?** The current boot.

**Why might disk usage not fall after a log file is deleted?** A process may still hold an open file descriptor for it.

**Is rotation only for saving disk space?** No. It also manages retention, compression, and handoff to the process writing the log.

## Read next

When logs indicate resource exhaustion, correlate their timestamps with CPU, memory, I/O, and cgroup limits.
