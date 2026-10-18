---
title: "Containers: namespaces, cgroups, and filesystem images"
category: "Operating System"
tags: ["containers", "namespaces", "cgroups", "linux"]
description: "Understand a container as a group of processes isolated by kernel features, not a miniature virtual machine."
updated: 2026-10-16
translationKey: "operating-system/container-namespaces-cgroups"
---

A container is commonly a group of Linux processes with a configured view and resource limits. It does not normally have its own kernel; it shares the host kernel. A runtime such as Docker, Podman, or containerd prepares the filesystem, namespaces, cgroup, and process configuration.

## Namespaces create a separate view

Linux namespaces can isolate PIDs, mounts, networking, IPC, hostnames, and user mappings. A process in a PID namespace can see its own PIDs; a network namespace has its own interfaces and routes; a mount namespace has its own mount tree.

A namespace does not make the kernel an absolute boundary. System calls still use the shared kernel, so a kernel vulnerability can affect multiple containers. A user namespace maps a container UID to a different host UID, reducing actual privileges when configured appropriately.

## Cgroups limit and measure resources

Cgroups group processes to monitor or limit CPU, memory, I/O, and process count. A container can experience an OOM event within its cgroup while the host still has free RAM. CPU quotas and throttling affect latency; inspect cgroup metrics alongside container metrics.

Namespaces answer “what can the process see?”; cgroups answer “how much can the process use?” They complement one another.

## Images, layers, and writable layers

An image commonly consists of immutable filesystem layers; a container adds a writable layer or mounts a volume. Shared layers save space but may add metadata or copy-up overhead. Application data that must outlive a container should be placed in a volume or external storage by design.

An image is not a security sandbox by itself. Use trusted sources, update base images, remove unnecessary capabilities, run as non-root where appropriate, restrict mounts and secrets, and configure networking.

## VMs and containers

| Property | VM | Common Linux container |
| --- | --- | --- |
| Kernel | Separate guest kernel | Shares host kernel |
| Startup | Boots a guest OS | Starts an isolated process |
| Isolation | Hypervisor and virtual devices | Namespaces, cgroups, and kernel policy |
| Compatibility | May run another OS within hypervisor limits | Depends on a compatible host kernel |

This is a general model; technologies such as microVMs or unikernels create variations. Choose based on threat model, compatibility, startup time, density, and operations.

## Summary

- A container is a process configured for isolation and limits, commonly sharing the host kernel.
- Namespaces isolate views; cgroups group and limit resources.
- Image and writable layers have a different lifecycle from data volumes.
- A container is not an absolute sandbox; the kernel remains shared attack surface.
- VMs and containers trade off kernel isolation, cost, and compatibility.

## Check your understanding

**Does a container have its own kernel like a VM?** A common Linux container uses the host kernel.

**Do namespaces limit CPU?** No. Cgroups manage CPU resources.

**Will data in the writable layer certainly survive container deletion?** No. Use an appropriate persistent volume or storage.

## Read next

Production containers require understanding image provenance, network policy, and resource limits; these topics connect to Network.
