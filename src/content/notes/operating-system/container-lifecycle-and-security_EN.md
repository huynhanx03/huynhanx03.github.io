---
title: "Container lifecycle, images, and security limits"
category: "Operating System"
tags: ["containers", "security", "runtime", "deployment"]
description: "Follow a container from image build to runtime, and manage secrets, privileges, and persistent data."
updated: 2026-10-17
translationKey: "operating-system/container-lifecycle-and-security"
---

A container is commonly created from an image, configured with a command, environment, and mounts, then started by a runtime inside namespaces and a cgroup. When its main process exits, the container may enter a stopped state; the runtime or orchestrator decides restart policy.

An image is a set of filesystem layers and configuration used to create a container. A container is an instance with a running or exited process and its own writable state. Commands that list running containers may omit exited containers; old containers and images keep using disk until cleaned up. The writable layer should not be the only place for data that must survive recreation.

## Reproducible images and provenance

A Dockerfile or Containerfile describes image-building steps. Pin versions or digests, use an updated base image, and remove unnecessary tools to reduce drift and attack surface. A tag such as `latest` can point to different content over time; deployments that matter should identify immutable artifacts.

Keep secrets and unnecessary local files out of the build context. A secret placed in an image layer during a build may remain in image history even if deleted in a later layer. Use an appropriate build-secret mount or feature and scan the artifact.

## Runtime privileges

Reduce Linux capabilities, run as non-root in the container, enable suitable seccomp/AppArmor/SELinux policy, and restrict system calls and mounts. Do not mount `/var/run/docker.sock` or the host root filesystem into untrusted workloads without understanding the equivalent host privileges.

Security flags vary by runtime and distribution. Confirm the safe defaults instead of copying production configuration from an unknown snippet.

Daemon control is also a security boundary: the Docker daemon commonly has root privileges, so a member of the `docker` group may gain extensive host access. Rootless Docker or Podman reduces some privileges, but networking, storage drivers, and compatibility may differ; verify the exact runtime and mode in use.

## Secrets and data

Environment variables are convenient but may leak through process inspection, logs, or dumps; a secret volume with explicit permissions may be more appropriate. Secrets need rotation and should not be written into an image.

A container filesystem layer may disappear when a container is recreated. Databases, uploads, and state belong on a volume or external storage with backup and recovery. A local volume on one host is still subject to that host or storage failing.

## Health checks and shutdown

A process should handle termination signals, finish in-flight requests during the grace period, flush necessary state, and exit. A health check must distinguish liveness (the process is still making progress) from readiness (it can accept traffic); an overly aggressive probe can create a restart loop.

The main process in a container is commonly PID 1 in its PID namespace. PID 1 has special signal semantics: signals whose default action is termination are ignored unless the process installs a handler, so an application must handle `SIGTERM` to shut down gracefully. PID 1 must also reap orphaned child processes. If the application does not do both well, use a small init such as Docker `--init` or a suitable supervisor. See [Docker container run](https://docs.docker.com/reference/cli/docker/container/run/). When the main process exits, the runtime handles remaining processes and restart policy.

## Summary

- Identify images immutably and build them from sources with provenance.
- Do not put secrets in build layers or logs.
- Reduce runtime privileges, capabilities, mounts, and syscall surface.
- Persistent data belongs on storage with independent backups.
- Readiness, liveness, and graceful shutdown serve different purposes.

## Check your understanding

**Does removing a secret in a later layer guarantee it disappears from image history?** No. An earlier layer may still contain it.

**Does a failed health check mean the container must be killed immediately?** Policy depends on the runtime; distinguish readiness from liveness.

**Is a host volume a backup?** No. Keep an independent copy and test restores.

## Read next

The network material explains container network namespaces, bridges, NAT, and service discovery.
