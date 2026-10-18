---
title: "Linux network services: sockets, daemons, and systemd"
category: "Network"
tags: ["linux", "network", "socket", "systemd", "service"]
description: "Connect the socket API to daemons, ports, inetd-style activation, service accounts, and firewalls."
updated: 2026-10-16
translationKey: "network/linux-network-services-and-sockets"
---

A network service is a process that receives requests through a socket. A socket is a file descriptor with an address family, protocol, and state. A server binds, listens for, and accepts TCP connections, or binds a socket to receive UDP datagrams. The kernel delivers packets to sockets based on addresses, ports, and state.

For TCP, a server keeps a **listening socket** to wait for connections. `accept()` creates a separate socket for each accepted connection; the listening socket remains available for new ones. A simple server can `fork()` a worker for every client, but repeatedly creating processes has a cost. High-load servers often keep workers ready or use an event loop or thread pool. UDP has no TCP connection to `accept()`; the process reads datagrams from its socket and handles each message.

Not every socket uses IP. A **Unix domain socket** connects processes on the same machine using a local address (often a pathname such as `/run/...sock`, and sometimes an unnamed socket), without an interface, route, or network configuration. It can use stream or datagram types, much like the general socket API, and pathname permissions can help control who may connect. D-Bus and some databases use this IPC mechanism; `lsof -U` helps find open Unix sockets. Loopback IP (`127.0.0.1` or `::1`) is still IP networking through the kernel, while a Unix socket is a separate IPC family.

## Daemon lifecycle

A service can run continuously in the background or be socket-activated by systemd: systemd opens and listens on the socket, then starts the process when a connection arrives. Activation can reduce idle processes, but it does not suit every service; understand the socket unit and service dependency.

`systemctl status`, the journal, and the socket list help show whether a service is running, which port it binds, and what it logs. A service may bind to loopback, a wildcard address, or a specific interface; firewall and NAT rules determine whether traffic can reach it.

## Permissions and privilege separation

A service should run as a dedicated user with minimal privileges. If it needs to bind a privileged port or read a protected file, grant a specific capability or permission instead of running the entire daemon as root. Protect secrets, the working directory, and writable paths.

## SSH as a network service

OpenSSH illustrates two roles: `ssh` is a client that opens a connection, while `sshd` is a server that listens (commonly on TCP port 22). The server has a host key that lets clients verify the machine's identity; a user key is a separate way to authenticate a user. Clients store accepted host keys in `known_hosts`. If a key suddenly changes, the machine may have been reinstalled, but it could also indicate spoofing or a man-in-the-middle attack. Verify the fingerprint through a trusted channel before updating the record; do not dismiss the warning automatically.

Server configuration is usually under `/etc/ssh/`; the service is called `ssh` or `sshd` depending on the distribution. Before reloading or restarting remotely, validate the configuration with `sshd -t`, confirm the listening port and interface, and keep a recovery access path. `systemctl status` together with `ss -ltnp` or `lsof -iTCP -sTCP:LISTEN` helps relate a unit to its actual listener. Socket activation is possible, but a server commonly runs as its own daemon; do not assume either setup without checking.

## inetd and socket activation

inetd or xinetd passes a connection to a process started on demand; systemd provides a more modern socket-activation mechanism. Both separate ownership of the listener from the service process in some cases. Not every service can accept an inherited socket; a mismatch may cause the process to open a second port or fail to receive requests.

## Summary

- A socket connects a process to a TCP or UDP endpoint managed by the kernel.
- A service can listen continuously or be socket-activated.
- The bind address defines network scope; firewall policy still matters.
- Run daemons with minimal users and capabilities.
- Inspect the service unit, socket unit, and logs together.

## Check your understanding

**Does a running process mean its port is public on the Internet?** No. Bind address, firewall, routing, and NAT determine reachability.

**Does socket activation make every daemon start faster?** No. The service and workload must support it.

**Is running a daemon as root the simplest safe choice?** No. Reduced privileges limit the impact of a failure.

## Read next

When a service fails, packet capture and socket tools help distinguish handshake, firewall, and application problems.
