---
title: "Cgroups: CPU, Memory, and Process Limits"
category: "Operating System"
tags: ["linux", "cgroups", "resources"]
description: "Read cgroup v2 controllers to understand CPU quotas, memory limits, pressure, and PID limits for a service or container."
updated: 2026-10-16
translationKey: "operating-system/linux-cgroups-cpu-memory-pids"
---

Cgroups group processes so the kernel can measure resource use and apply policies. This note uses the cgroup v2 interface for services, scopes, or containers; machines using cgroup v1 have different paths and controllers. systemd and container runtimes commonly create cgroups for workloads. A cgroup is not a namespace: it accounts for or limits resources, while a namespace changes what a process can see.

## CPU

`cpu.max` sets a quota over a period; tasks may use a burst within the limit and then be throttled until the next period. `cpu.weight` divides CPU time proportionally when groups compete; it is not an absolute reservation. CPU affinity restricts which cores a task can use and is a different mechanism.

## Memory

`memory.max` sets a hard limit. When reached, reclaim occurs and the cgroup may then encounter an OOM event. `memory.high` creates a lighter pressure or throttling threshold on supported systems. `memory.current`, `memory.stat`, `memory.events`, and PSI help show usage, cache, OOM events, and stalls.

## PIDs and troubleshooting

`pids.max` counts tasks (threads), not just processes; one multithreaded process consumes several entries. It helps prevent fork bombs or excessive worker configuration. See the [PID controller](https://docs.kernel.org/admin-guide/cgroup-v2.html#pid). Creating a new task fails after the limit is reached even if RAM remains.

Use `systemctl show service -p ControlGroup` to find a service's cgroup; inspect the controller files under `/sys/fs/cgroup/...` to see actual values. When a container reports “100% CPU,” determine whether that means one core, its quota, or the host total.

## Check your understanding

**Does CPU weight guarantee a fixed share while the host is idle?** No.

**Is a container memory limit separate physical RAM?** No; it is a kernel accounting and reclaim policy.

**Does a namespace replace a cgroup?** No.

## Further reading

Linux process monitoring helps connect cgroup pressure with processes and application symptoms.
