---
title: "TCP Listen Backlog, SYN Queue, and Accept Queue"
category: "Network"
tags: ["network", "tcp", "linux", "server"]
description: "Distinguish the handshake SYN queue from the queue of established connections waiting for accept, and recognize server overload."
updated: 2026-10-16
translationKey: "network/tcp-listen-backlog-accept-queue"
---

A server calls `listen()` to accept TCP connections. Before the application calls `accept()`, the kernel has already handled the handshake and retained connection state. Two commonly discussed queues are the SYN queue (connections in the handshake) and the accept queue (established connections waiting for the application).

## Backlog

Backlog is a hint or limit related to the number of completed connections waiting for `accept`; the effective limit also depends on kernel settings such as `somaxconn`. The SYN backlog and SYN-cookie mechanism have separate parameters. Names and implementation details vary by kernel.

In the common Berkeley sockets model, the kernel handles the SYN and completes the three-way handshake before the application receives a socket through `accept()`. A listener may therefore have already replied successfully to a client while an established connection is still waiting for the application. Operating systems commonly manage incomplete SYN requests (a SYN/request queue) separately from completed connections waiting for `accept()` (the accept queue), but backlog accounting and limits vary by kernel.

When the accept queue is full, the stack may delay a response, drop SYN/ACK, or behave in another way; the client may retransmit and time out. This does not necessarily mean no process is listening. SYN cookies reduce state allocated for unauthenticated SYNs by encoding enough information in the SYN-ACK to reconstruct state when a valid ACK returns. They do not make `accept()` faster or fix a full accept queue. Some TCP options may not be negotiated when cookies are used, so this is a protective mechanism with trade-offs, not a substitute for capacity planning.

If an application does not call `accept()` quickly enough, the accept queue may fill; clients may retry or time out depending on configuration. If the SYN queue is flooded or receives many incomplete SYNs, the kernel uses protection mechanisms and state timeouts.

## Troubleshooting

`ss -lnt` shows listeners; for a listening socket, its queue columns may show the number of waiting connections and the backlog limit. `ss -s`, TCP counters in `/proc/net/netstat`, application logs, and accept-rate metrics help locate the bottleneck.

Increasing backlog only absorbs a burst for longer; it does not make the application process requests faster. Check worker count, event-loop stalls, CPU, file-descriptor limits, and accept latency.

## Check your understanding

**Does a large backlog solve long-term server overload?** No.

**Must the application call `accept()` before the TCP handshake completes?** Usually not; the kernel handles the handshake first.

**Are the SYN queue and accept queue the same?** No.

## Further reading

A server socket needs a backlog coordinated with its worker pool, timeouts, and process resource limits.
