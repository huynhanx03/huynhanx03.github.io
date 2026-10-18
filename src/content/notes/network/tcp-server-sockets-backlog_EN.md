---
title: "TCP Servers: Sockets, bind, listen, and Backlog"
category: "Network"
tags: ["network", "tcp", "socket", "server"]
description: "Follow a server socket from bind/listen to accept, and distinguish backlog from the number of connections being processed."
updated: 2026-10-16
translationKey: "network/tcp-server-sockets-backlog"
---

A TCP server creates a socket, binds an address and port, calls `listen`, then accepts connections. Each step can fail for a different reason: the port is in use, the address is not present on the host, the backlog is full, or the application does not call `accept` quickly enough.

## Bind address and port

A server bound to loopback accepts only local connections; binding to a wildcard address may listen on multiple interfaces; binding to a specific local IP limits the destination address, but does not itself guarantee that packets arrive through the interface holding that IP. Device binding is a separate mechanism, such as Linux `SO_BINDTODEVICE` ([socket(7)](https://man7.org/linux/man-pages/man7/socket.7.html)). IPv4/IPv6 dual-stack behavior depends on socket options and the operating system. The firewall still determines whether packets may reach the service.

A port identifies an endpoint process or service on a host; it is not a firewall rule or application identity. Container and host networking may add port mappings.

## Listen queue and accept

The kernel keeps state for handshakes in progress and for completed connections waiting for the application to accept them. Backlog is a parameter related to the queue, but its semantics and limits depend on kernel settings; it is not the worker count or the server's maximum number of connections.

If the application accepts too slowly, the queue may fill and clients may time out or be refused. Increasing backlog absorbs only temporary bursts; if the server cannot process work quickly enough, the queue fills again. Measure accept rate, worker saturation, and downstream latency.

## Socket lifecycle and resources

Sockets and file descriptors must be closed; setup errors should clean up resources already allocated. A server needs limits for connections, timeouts, buffers, and concurrency so a slow client cannot hold resources indefinitely.

## Summary

- A server uses sockets through the lifecycle of create, bind, listen, and accept.
- The bind address defines interface and scope; wildcard and loopback differ.
- Backlog is a queue for pending connections, not a worker count.
- Increasing backlog does not fix sustained overload.
- Resource limits, timeouts, and cleanup are part of server design.

## Check your understanding

**Does binding to `127.0.0.1` let another machine on the LAN connect?** No; that is loopback.

**Does a backlog of 100 mean the server processes exactly 100 connections concurrently?** No.

**Does an open port mean the application is healthy?** It only shows that an endpoint can listen or accept connections at that moment; health requires checks at a higher level.

## Further reading

The **Network Services & Security** topic covers DNS, firewalls, and endpoint identity.
