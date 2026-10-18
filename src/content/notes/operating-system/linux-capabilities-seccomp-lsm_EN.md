---
title: "Capabilities, seccomp, and Linux Security Modules"
category: "Operating System"
tags: ["linux", "security", "capabilities", "seccomp"]
description: "Distinguish traditional root privileges from capabilities, filter system calls with seccomp, and apply mandatory access controls through an LSM."
updated: 2026-10-16
translationKey: "operating-system/linux-capabilities-seccomp-lsm"
---

A process running with UID 0 is commonly considered root, but Linux splits some administrative privileges into capabilities such as `CAP_NET_ADMIN` and `CAP_SYS_ADMIN`. A container can drop many capabilities to reduce the impact of an application compromise.

## Capabilities

In the kernel, capabilities are per-thread attributes with permitted, effective, inheritable, bounding, and ambient sets. Executable files have separate capability metadata used during `exec`; they do not carry all the same sets as a thread. See [capabilities(7)](https://man7.org/linux/man-pages/man7/capabilities.7.html). Granting a narrowly scoped capability is safer than granting root, but a broad capability such as `CAP_SYS_ADMIN` covers many sensitive operations. `getcap` inspects file capabilities; `capsh` or `/proc/PID/status` can help inspect a process.

## Seccomp

Seccomp-BPF filters system calls by number and arguments. It can allow a call, return an error, or kill a process when a call is not permitted. It reduces attack surface, but an overly restrictive profile can break an application; a filter does not replace permissions or namespaces. A BPF filter sees argument values but cannot dereference a pathname pointer, so it cannot act as a per-filename access policy. See [Seccomp BPF](https://docs.kernel.org/userspace-api/seccomp_filter.html).

## LSM

Linux Security Modules provide a framework for mandatory access-control policies. SELinux and AppArmor apply additional rules based on labels or profiles; a process allowed by Unix mode bits may still be denied by an LSM. Check AVC/audit or AppArmor denial logs before relaxing policy.

## Check your understanding

**Does root inside a container always have all the host's root privileges?** No; namespaces, capabilities, and LSMs can restrict it.

**Does seccomp check pathnames and general file permissions?** No; it filters system calls and their arguments at the appropriate level.

**Does access allowed by Unix mode bits guarantee access?** No, if an LSM or mount policy denies it.

## Further reading

Container security combines user namespaces, capabilities, seccomp, LSMs, and cgroups rather than relying on one layer.
