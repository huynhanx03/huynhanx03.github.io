---
title: "Disk scheduling: ordering requests and throughput limits"
category: "Operating System"
tags: ["storage", "disk scheduling", "io"]
description: "Compare FCFS, SSTF, and SCAN for HDDs, and see how queue depth changes latency."
updated: 2026-10-16
translationKey: "operating-system/disk-scheduling-and-queues"
---

Several processes can issue block I/O at the same time. The block layer and device queue must choose which request reaches the device first. On an HDD, head position makes request order affect seek time; SSDs remove mechanical locality, but queueing and controller parallelism still matter.

## FCFS and SSTF

FCFS serves requests in arrival order. It is straightforward and fair, but can cause substantial seeking. Shortest Seek Time First chooses the request nearest the current head position; it reduces average seek time in a model, but distant requests may starve and the head's future position depends on disk behavior.

The OS often cannot see exact disk geometry or head position, so SSTF is commonly approximated by choosing the nearest block address. Block distance does not include rotational delay: a request with a shorter seek may still wait almost a full rotation for its sector. Shortest Positioning Time First (SPTF, also called SATF) accounts for seek and rotational delay. A drive knows its head position and layout better than the host and can often schedule more accurately itself.

## SCAN/elevator

SCAN moves the head in one direction, servicing requests along the way, then reverses like an elevator. C-SCAN scans in one direction and returns to the beginning, making wait times more uniform between inner and outer regions. F-SCAN fixes the request set for one sweep so newly arriving nearby requests do not repeatedly jump ahead of old distant ones. These variants limit SSTF starvation but still do not model rotational delay precisely.

A scheduler can merge adjacent requests into a larger one to reduce overhead. A work-conserving scheduler dispatches whenever work exists. A scheduler can intentionally wait briefly if it expects a better request soon, but waiting too long increases latency and predicting the right time is difficult. Modern systems may send multiple queued requests to the controller; device firmware has more information about head position/layout and can optimize internally.

SATF looks ahead within a limited **request window**. A wider window offers more positioning choices but increases waiting and scheduling cost; the best next step does not necessarily produce the best overall schedule. Bounded SATF processes finite groups in turn, limiting how long new requests can keep jumping ahead of old ones. This is a tradeoff between positioning efficiency, fairness, and wait time. HDD-optimal algorithms need positioning information that modern OSes often do not fully have.

## Exercise: measure service order

Keep one request trace and calculate seek, rotational delay, and transfer time separately. Change seek rate and rotation speed to see which cost dominates. Compare FCFS, SSTF, and SATF on the same trace, especially when a nearby request's sector has not rotated into place. Test consecutive requests across track boundaries and add track skew to avoid nearly a full rotation after a seek. In a multi-zone model, calculate sectors per unit time for each zone because outer tracks may hold more sectors than inner tracks.

Then vary how many requests the scheduler can see, create a trace that repeatedly postpones a distant request, and compare SATF with bounded SATF for throughput and waiting time. Finally, find a trace where the locally best greedy choice makes the overall schedule slower than another choice. These experiments show how position information, window size, rotation delay, and fairness affect decisions. Results hold only under the model's assumptions; real drives add firmware, cache, geometry, and queues.

## Queue depth and latency

A deep queue gives the controller more choices and opportunities for parallelism, which can raise throughput. But requests wait longer in the queue and tail latency can rise. NVMe has multiple queues and CPU affinity; SATA/SCSI stacks and controllers behave differently.

## Summary

- Disk schedulers balance locality, fairness, and throughput.
- SSTF reduces seek in a model but can starve distant requests.
- SCAN/elevator serves in a direction and reduces head movement.
- A deeper queue can raise throughput while worsening latency.
- Policy depends on HDD/SSD, controller, and kernel.

## Check your understanding

**Is SSTF always the fairest?** No. Distant requests can wait a long time.

**Is maximum queue depth always fastest?** No. Latency and contention can increase.

**Do SSDs need no queue scheduling?** Queues and parallelism still need management, even without mechanical seeking.

## Read next

RAID combines devices and adds tradeoffs around parity, redundancy, and rebuilds.
