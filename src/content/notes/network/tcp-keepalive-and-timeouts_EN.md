---
title: "TCP keepalive, application heartbeats, and timeouts"
category: "Network"
tags: ["network", "tcp", "keepalive", "timeout"]
description: "Distinguish TCP keepalive from application deadlines, NAT idle timeouts, and ways to detect a failed peer."
updated: 2026-10-16
translationKey: "network/tcp-keepalive-and-timeouts"
---

A TCP connection can be quiet and still valid; a peer may also have failed while the local host has not noticed. Keepalive sends probes after an idle period to detect some connection failures. It is usually too slow for a request deadline and does not replace an application heartbeat.

## TCP keepalive

Keepalive is disabled by default in some APIs or operating systems, or uses long timers; applications enable it per socket and may also configure system settings. If a probe is not acknowledged, TCP may declare the connection dead after several attempts. Exact timing depends on the kernel and configuration.

Keepalive checks the peer and path at the TCP layer; an application process may be hung while the kernel still ACKs. Therefore, a live connection does not prove a healthy service.

### How does keepalive work?

After a connection has been idle for the configured `keepalive time`, a TCP endpoint with keepalive enabled sends a probe. If no response arrives, it resends at `keepalive interval` until reaching `keepalive probes`; TCP then reports an error and usually closes the connection. A normal reply proves only that TCP on the other side responded over the path at that time. If the peer rebooted and forgot the old connection, it may reply with RST. If the network is temporarily interrupted, TCP usually cannot distinguish that from a dead peer.

A probe commonly uses a sequence number just before the next byte expected by the peer, so it carries no new application byte and does not change the stream. The peer ACKs it to demonstrate that TCP is still receiving packets. A single lost probe is not enough to declare the peer dead. Packet format and compatibility with older stacks can vary.

Keepalive is an optional TCP feature, not mandatory polling in the protocol. Only the endpoint initiating probes needs to enable keepalive; the peer can ACK them through normal TCP processing without enabling its own keepalive timer ([RFC 1122](https://www.rfc-editor.org/rfc/rfc1122.html#section-4.2.3.6)). The setting is independent at each endpoint; settings may be per-socket or system-wide depending on the OS. Long defaults cited in books (often around two hours) and sysctl or registry values are historical examples from the versions discussed, not current universal defaults. Check documentation for the OS and runtime in use.

### Choosing the right check

- TCP keepalive can clean up idle half-open connections or preserve some NAT state, but may close a healthy connection during a transient network problem.
- An application heartbeat can require a service-layer response with more specific information. However, an application heartbeat is different from a TCP-level heartbeat such as SSH `TCPKeepAlive`; application encryption can protect it from spoofing better than a plain TCP probe.
- A request deadline limits how long an operation may take; it does not test an idle connection. NAT, load balancers, and firewalls have independent timeouts and may expire state before the first long-interval keepalive probe.

Choose the interval by considering middlebox idle lifetimes, desired detection time, probe load, and temporary network failures. For RPC, a heartbeat does not replace a deadline; a retry after timeout still needs idempotency because the server may have processed the request while its response was lost.

### Limits and risks

TCP probe/ACK traffic is not protected by TCP encryption. An observer may infer timer patterns, and a spoofed probe can extend resource retention in some situations. A keepalive timer also differs from a retransmission timer: it checks an idle connection, not unacknowledged data. Do not use keepalive as the sole measure of application health, proof that a request completed, or an availability mechanism.

## Application heartbeats

A heartbeat can ask a service to confirm state at the application layer and detect a worker that is not processing. But frequent heartbeats add load; overly short timeouts create false positives during garbage-collection pauses, scheduler stalls, or network jitter.

## Deadlines and middlebox idle timeouts

A deadline limits how long a caller waits for an operation. A NAT, load balancer, or firewall may remove an idle connection before TCP keepalive sends its first probe. Coordinate keepalive interval, middlebox idle timeout, and application deadline.

Retries after timeouts need idempotency or an operation ID because the remote state may be unclear. Closing a connection does not roll back work on the server.

## Summary

- TCP keepalive checks an idle connection and is often unsuitable for fast failure detection.
- A TCP ACK does not prove that the application process is healthy.
- Application heartbeats check higher-level semantics but need sensible timeouts.
- Middleboxes have independent idle timeouts and may remove state while endpoints remain alive.
- Timeouts and retries need idempotency because remote state may be uncertain.

## Check your understanding

**Does a successful keepalive prove that the server processed a request?** No. The kernel can send the ACK without the application.

**Does a timeout mean the server definitely did not perform the operation?** No. The response may have been lost after completion.

**Does a 1 ms heartbeat detect failures faster and better?** No. It can increase false positives and overhead.

## Read next

When a server listens on a port, the backlog and bind address also affect how incoming connections are accepted.
