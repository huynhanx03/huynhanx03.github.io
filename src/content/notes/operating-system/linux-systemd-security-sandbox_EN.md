---
title: "Sandboxing a Service with systemd"
category: "Operating System"
tags: ["linux", "systemd", "security"]
description: "Use systemd hardening options to restrict filesystem, syscalls, capabilities, and service privileges according to least privilege."
updated: 2026-10-16
translationKey: "operating-system/linux-systemd-security-sandbox"
---

Systemd can apply security boundaries to a service without requiring a custom sandbox. Options that restrict the filesystem, capabilities, system calls, and namespaces can reduce the impact of a compromised process, but may break an application if it lacks required access.

## Types of restrictions

`NoNewPrivileges=true` prevents a process from gaining additional privileges through exec in many cases. `ProtectSystem=` and `ReadWritePaths=` adjust its mount view; `PrivateTmp=` isolates temporary directories; `ProtectHome=` restricts access to home directories. `CapabilityBoundingSet=` removes unneeded capabilities; `SystemCallFilter=` restricts system calls.

## Roll out restrictions safely

Start with a service that works, then identify the files, paths, network access, and system calls it actually needs. Apply one restriction at a time, check `systemd-analyze security`, inspect denial logs, and run service regression checks. The tool reports exposure: a lower number indicates more isolation measures are enabled, rather than certifying security. It does not analyze all service code or business behavior. See [systemd-analyze security](https://github.com/systemd/systemd/blob/main/man/systemd-analyze.xml).

Do not blindly enable one hardening profile for every service: databases, network daemons, and desktop applications have different needs. Record overrides, retain a rollback path, and measure the impact.

## Check your understanding

**Does low exposure in `systemd-analyze security` prove there are no vulnerabilities?** No; it evaluates a set of isolation options.

**Does sandboxing replace software updates?** No.

**Does `ReadOnlyPaths` make a file impossible to modify by every route?** The restriction applies to the service's mount view; the host, root, or another namespace may still have access.

## Further reading

Capabilities, seccomp, and LSM are separate layers that can work together with a service sandbox.
