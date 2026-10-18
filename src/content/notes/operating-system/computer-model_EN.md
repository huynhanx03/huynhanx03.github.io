---
title: "How a Computer Works: From Programs to Hardware"
category: "Operating System"
tags: ["computer architecture", "operating system", "fundamentals"]
description: "Follow a program through software and hardware layers to understand where the operating system fits."
updated: 2026-10-16
translationKey: "operating-system/computer-model"
---

When you run a program, you see something simple: a window opens and data appears. Underneath, many components work together. The program is stored as a file, the operating system loads it into memory, the CPU executes instructions, and storage devices and the display handle input and output requests.

To study operating systems, start with a shared map. We will move from the software users see down to physical components, then look at how the operating system connects the two.

## A program passes through several layers

Imagine an application that reads a file and prints a result:

```text
User
   ↓ asks to open a file
Application
   ↓ library and system call
Operating system / kernel
   ↓ driver and device controller
SSD, RAM, CPU, display
```

The application does not need to know what kind of memory chips an SSD contains. It asks the operating system to open a path and read some bytes. The kernel checks access permissions, locates the data through the filesystem, asks the storage driver to communicate with the controller, and puts the data in memory for the program to use.

Layers give each component a relatively stable contract. A program calls `read`; it does not directly control the voltage on an SSD chip. The driver knows how to communicate with the device, the filesystem organizes file names and contents, and the kernel arbitrates access and resource sharing. Abstraction reduces the details each component must understand, but it does not make lower-level costs disappear.

## Hardware provides resources; it does not decide how to use them

The CPU executes machine instructions. RAM holds data and instructions in use. Storage devices retain data after shutdown. Network devices move data between machines. Each type has its own speed, access method, limits, and failure modes.

A modern machine may have multiple CPU cores, several cache levels, multiple storage devices, and many processes running at once. Hardware provides the ability to run in parallel, but programs and the operating system must coordinate how to use it. If two processes write to the same data without synchronization rules, faster hardware does not make the result correct.

## The operating system manages resources and provides an interface

The operating system has two related roles:

1. **Resource management:** divide CPU time, memory, devices, and data among programs.
2. **Abstraction:** give programs consistent interfaces for creating processes, allocating memory, reading files, and communicating.

The kernel is the core that runs with elevated privileges and can access and control many hardware resources. Ordinary programs run in user mode with narrower permissions. When a protected operation is needed, a program requests it through a system call. Entering the kernel does not turn the whole application into kernel code; the kernel handles the request and returns control to the program.

The operating system is not necessarily everything we call the “computer environment.” A shell, graphical interface, administration tools, and libraries may be separate programs running above the kernel. The exact boundary varies by system, but distinguishing the kernel from applications helps identify which component is responsible.

## Two examples show how the layers work together

### Opening a file

The application asks to open a path. The kernel checks identity and permissions, looks up the filesystem structures, and asks the storage device to read the data if it is not already cached. When the operation completes, the application receives a file descriptor it can use to keep reading.

If the path does not exist, the error comes from the filesystem or kernel layer. If the device fails, the source may be lower down. One `open` operation therefore hides a lot of work, but can still fail because of conditions in those layers.

### Sending data over a network

The application writes bytes to a socket. The kernel places them in network data structures, chooses a route, and communicates with the network-card driver. The card transmits signals over the physical medium. The destination machine processes the corresponding layers in reverse.

An application does not send “an IP packet” simply by calling a write function. Sockets and protocols provide a consistent interface, while the kernel and device perform most of the transport work.

## Abstraction has limits

A consistent interface does not guarantee that all devices behave identically. Reading a file may be very fast if its data is in the RAM cache, or slow if the system must wait for storage. A write may only put data in a buffer; it may not yet be durable on the device. Sending data does not prove that the receiver processed it.

When diagnosing a problem, ask which layers the operation passes through and which guarantee has actually been confirmed. “The command succeeded” may only mean the request was accepted, not that every consequence has completed. Later topics on I/O, filesystems, and networking will clarify these cases.

## Summary

- Programs interact with hardware through several software layers.
- The kernel manages resources and provides protected interfaces to applications.
- Drivers translate general requests into operations suited to a device.
- Abstraction reduces dependence on hardware details but does not erase cost, latency, or failures.

## Check your understanding

**Does an application directly control the SSD when it calls a file-read function?** Usually not. It calls an OS interface; the kernel, filesystem, and driver coordinate with the device.

**Are the kernel and desktop interface the same thing?** Not necessarily. The desktop interface is usually made of programs that run above the kernel.

**If a system call succeeds, is the data certainly durable on the SSD?** Not enough information to conclude that; the exact meaning depends on the operation and its synchronization contract.

## Further reading

Next: [Machine Instructions and the ISA](/en/notes/operating-system/instruction-set-architecture/), followed by [How the CPU Executes a Program](/en/notes/operating-system/cpu-execution/).
