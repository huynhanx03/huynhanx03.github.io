---
title: "systemd: units, dependencies, and boot order"
category: "Operating System"
tags: ["linux", "systemd", "init", "services"]
description: "Understand units and the dependency graph, distinguish wants/requires from ordering, and use systemctl safely."
updated: 2026-10-16
translationKey: "operating-system/systemd-units-and-boot"
---

systemd is a common system manager on Linux and often runs as PID 1. It starts services, monitors processes, and manages many resources represented by **units**. Not every Linux system uses systemd, so identify the active init system before running commands.

## A unit is not just a service

A unit can represent a service, mount, socket, device, timer, target, or another kind of resource. A unit file declares the desired configuration; runtime state indicates whether the unit is active, failed, or waiting.

`systemctl status ssh.service` shows a service's state; `systemctl list-units` lists loaded units. Service names vary by distribution: for example, the SSH service may be called `ssh` or `sshd`.

## Dependencies differ from ordering

In a unit file, `Wants=` and `Requires=` express dependency relationships with different levels of coupling; `After=` and `Before=` set start and stop ordering. Having a dependency does not automatically mean that one unit starts first: the appropriate ordering must also be declared.

systemd builds a dependency graph and can start independent branches in parallel. This can make boot faster than a sequence of scripts, but a failure in one unit does not necessarily stop the whole machine if the dependency relationship does not require it.

## Targets instead of runlevel concepts

A target groups units to reach a system state such as multi-user or graphical. A target may pull in services and mounts. Target names vary by distribution; check `systemctl get-default` before changing the default.

Enable or disable changes automatic startup through symlinks and dependencies; start or stop changes the current state. `enable` does not necessarily start a unit immediately, and `start` does not necessarily enable it for the next reboot.

## Safe administration

Before changing a unit, read `systemctl cat`, check `status`, inspect the journal, and understand its dependencies. After editing a drop-in or unit file, run `daemon-reload`; restarting a service can interrupt connections. Keep console access or a rollback plan when changing a remote network service.

Service sandboxing and resource controls can limit privileges, but a unit file declaring these controls does not guarantee every command inside it is safe. Production environments need review of the user, capabilities, writable paths, secret handling, and restart policy.

## Summary

- systemd manages units and is PID 1 on many distributions.
- Units represent services, mounts, timers, sockets, and other resources.
- Dependencies (`Wants`/`Requires`) differ from ordering (`After`/`Before`).
- Enable differs from start: one configures boot behavior, the other current state.
- Read unit files, logs, and dependencies before restarting or changing configuration.

## Check your understanding

**Does `After=network.target` automatically pull in the network?** No. Ordering alone does not create a dependency.

**Does `systemctl enable app` always launch the app immediately?** Not necessarily; use `start` to change its current state.

**Can restarting a remote service be risky?** Yes, especially for network services; prepare a way to recover.

## Read next

A service runs under a particular user and set of permissions. The next note covers accounts, groups, permissions, and authentication.
