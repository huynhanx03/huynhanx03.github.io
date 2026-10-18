---
title: "The Linux Block-Storage Stack: Devices, Partitions, Mappers, and Filesystems"
category: "Operating System"
tags: ["linux", "block device", "device mapper", "storage"]
description: "Trace a request from the filesystem through the block layer to NVMe/SCSI, including mapper and RAID layers."
updated: 2026-10-16
translationKey: "operating-system/linux-block-storage-stack"
---

A file read or write on a block-backed filesystem may pass through the VFS, filesystem, page cache, block layer, device mapper, and driver before reaching a controller. A page-cache hit needs no device request; network and memory-backed filesystems follow different paths. These layers allow encryption, LVM, RAID, and different devices to be combined while the filesystem still uses a block interface.

## Block devices and partitions

A block device represents a storage region that can be read or written in blocks or sectors. A partition table describes logical regions on a device; a filesystem is created on a partition or logical volume. NVMe and SCSI names reflect bus and namespace topology, not an inherent ordering.

## Device mapper

Device mapper maps logical blocks to other devices. LVM uses it for logical volumes; dm-crypt encrypts blocks; multipath selects among several paths to storage; and RAID layers may stripe or mirror data. Stacking many layers makes latency and error paths harder to debug.

## Requests and completions

The filesystem emits block requests; the block layer may merge, split, or schedule them in a queue; the driver sends commands to the controller; and completions travel back up. Errors may be retried or returned to the caller according to policy. A device timeout should be distinguished from filesystem corruption.

## Summary

- Block I/O passes through several layers from VFS and page cache to driver and controller.
- Device mapper creates logical volumes for LVM, encryption, and multipath.
- Requests may be merged or split and complete asynchronously.
- Device errors, timeouts, and filesystem errors belong to different layers.
- Inspect the actual topology with `lsblk`, `dmsetup`, and appropriate NVMe/SCSI tools.

## Check your understanding

**Does a filesystem always sit directly on a physical disk?** No; it may be on a mapper, RAID, or encryption layer.

**Does a `/dev/dm-0` name identify the volume clearly?** No; use mapper metadata or symlinks.

**Does a block error necessarily mean data is lost?** Check retries, redundancy, and filesystem recovery.

## Further reading

RAID and device mapper provide logical layers; SSD endurance and write behavior still apply underneath.
