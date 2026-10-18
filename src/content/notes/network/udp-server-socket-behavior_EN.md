---
title: "UDP servers: socket binding, peers, and queue limits"
category: "Network"
tags: ["network", "udp", "socket", "server"]
description: "Understand how UDP sockets receive datagrams by local and remote address, wildcard binds, multiple servers, and queue overflow."
updated: 2026-10-16
translationKey: "network/udp-server-socket-behavior"
---

A UDP server does not “listen” through a handshake like TCP. It binds a local port (and may bind a specific local IP), then receives datagrams that IP/UDP deliver to the matching socket. When the application needs to reply, the kernel provides the source IP and port of the incoming datagram as the peer address.

## Local bind and wildcard addresses

A socket can bind to one specific local IP and port, or to a wildcard address (all suitable local addresses) and port. A specific bind limits the destination IP, not automatically the receiving interface; device binding is separate, such as Linux `SO_BINDTODEVICE` ([socket(7)](https://man7.org/linux/man-pages/man7/socket.7.html)); for example, binding to loopback receives only datagrams from the same host. A wildcard is convenient on a host with multiple addresses, but may let the server receive requests on more interfaces or scopes than intended.

When a specific-address socket and a wildcard socket use the same port, the OS commonly prefers the specific socket matching the destination address, then considers the wildcard. Exact selection rules depend on OS and socket options.

## Allowed peers and UDP connect

By default, a UDP socket can receive from many source IPs and ports. A socket can also be “connected” to a peer so the kernel sends to and receives from only that remote address, selects a route and source address, and on some systems reports ICMP errors such as Port Unreachable through the API. This is only local endpoint configuration: there is no SYN/ACK, it does not prove that the peer exists, and it does not make UDP reliable.

## Multiple sockets on one port

Normally, a local IP/port in one address family belongs to one endpoint. `SO_REUSEADDR` and `SO_REUSEPORT` can permit sharing, but semantics and datagram distribution vary among operating systems. For broadcast or multicast, multiple sockets in a group may each need to receive a copy. For unicast, the kernel commonly chooses one socket rather than broadcasting a copy to every process; selection depends on implementation. Do not assume an option behaves identically on Linux, BSD, and Windows.

## IPv4, IPv6, and port space

A dual-stack server may use one IPv6 wildcard socket that accepts IPv4-mapped addresses, or separate IPv4 and IPv6 sockets. Whether port space is shared and whether an IPv6 socket accepts IPv4 depend on the OS and `IPV6_V6ONLY`. If running two listeners, choose behavior deliberately to avoid bind conflicts or accidentally exposing the service on both address families.

## Queues, concurrency, and congestion

The kernel usually keeps a finite receive queue for a socket. If the application processes datagrams too slowly, a burst can fill the queue and the kernel drops packets. UDP has no flow control to ask clients to slow down, and the application may not receive an exact notification for every dropped packet. Queues in routers along the way can also fill and cause loss affecting multiple flows.

A server can use multiple workers to increase processing rate, but must control total queues, per-request or per-peer limits, processing time, and memory. UDP clients and servers must design rate limiting, retries, and congestion responses appropriately; aggressive retries under overload make the situation worse. Use backoff, retry limits, request IDs, and duplicate suppression when semantics require them.

## Security and operations

UDP has no handshake to verify a source address. Source IPs may be spoofed if the network does not filter ingress; a large reply to a small request can turn a server into a DDoS amplifier. Authenticate requests before sending large responses, limit size and rate, and do not treat a UDP checksum as authentication.

When debugging, check the bind address, interface and route, port, firewall, socket receive-queue and drop counters, and packet captures at both ends. ICMP Port Unreachable may appear when no matching socket exists, but a firewall or a connected UDP API may prevent the message from reaching the application.

## Summary

- A UDP server binds a local IP and port; a wildcard receives on multiple local addresses.
- UDP `connect` filters a local peer but creates no reliable handshake.
- Reuse options and IPv4/IPv6 dual stack have OS-dependent semantics.
- Receive queues are finite; UDP itself has no flow or congestion control.
- Request authentication, rate limits, backoff, and amplification protection belong to the application and infrastructure.

## Check your understanding

**Does `connect()` on UDP prove the server accepted a connection?** No. There is no handshake; it usually sets a default peer for the local socket.

**If two processes bind the same UDP port, will both always receive a copy of each unicast datagram?** No. The OS commonly selects one endpoint; behavior depends on socket options and implementation.

**Will a UDP receive-queue drop automatically tell clients to slow down?** No. UDP has no flow control; the application must design load feedback.

## Read next

To understand packets and checksums before the kernel selects a socket, see [UDP: small datagrams and simple semantics](/en/notes/network/udp-datagrams-and-design/).
