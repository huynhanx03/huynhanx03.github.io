---
title: "CPU Virtualization: Trap-and-Emulate, VT-x, and Guest State"
category: "Operating System"
tags: ["virtualization", "cpu", "hypervisor"]
description: "Trace how a hypervisor shares the CPU, handles privileged operations, and switches between host and guest."
updated: 2026-10-16
translationKey: "operating-system/hypervisor-trap-and-emulate-vt-x"
---

A virtual machine runs a guest operating system as if it owned the CPU, but the hypervisor must retain real control. Most guest instructions should execute directly for good performance; sensitive operations must be controlled or emulated.

## Trap-and-emulate

In classic virtualization, the hypervisor runs the guest at a lower privilege level. A privileged instruction traps; the hypervisor emulates its safe effect on virtual state and resumes the guest. Some older x86 architectures had sensitive instructions that did not trap correctly at a lower level, requiring binary translation or paravirtualization.

## Hardware assistance

Intel VT-x and AMD-V provide guest and host modes, structures for saving guest state, and VM exits for events that require hypervisor handling. The CPU can run the guest directly in many situations, then exit for I/O, interrupts, or configuration operations that need intervention. VM exits have a cost, so hypervisors try to reduce unnecessary ones.

## CPU scheduling for VMs

A vCPU is a virtual execution thread that the host scheduler places on a real logical CPU. The guest has its own scheduler, so the two scheduling layers interact. A runnable vCPU still leaves guest tasks delayed if the host does not allocate CPU time. Oversubscription can improve utilization but increase latency and steal time.

## Check your understanding

**Must the hypervisor emulate every instruction?** No; most run directly on the CPU.

**Does one vCPU always correspond to one dedicated physical core?** No.

**Can the guest schedule a thread while the host is not running its vCPU?** No; guest time stops until the host schedules it.

## Further reading

Memory virtualization adds page-table layers to translate a guest virtual address to host physical memory.
