---
title: "Ephemeral Ports, Socket Tuples, and Connection Limits"
category: "Network"
tags: ["network", "tcp", "socket", "nat"]
description: "Understand a connection's four-tuple, ephemeral-port allocation, TIME_WAIT, and port exhaustion from too many short-lived connections."
updated: 2026-10-16
translationKey: "network/socket-nat-ephemeral-ports"
---

A TCP connection is commonly identified by its protocol and source and destination IP addresses and ports (the four-tuple). A client gets an ephemeral source port when it opens an outbound connection; a server listens on a stable destination port. Many connections to the same server can coexist because their source ports or addresses differ.

## Ephemeral-port range

The kernel selects ports from a configured range while avoiding some ports that are already in use or reserved. On Linux, inspect it with `sysctl net.ipv4.ip_local_port_range`; use `ss -tan` to view current sockets. TIME_WAIT retains a tuple for a period after a normal close so that old packets are not mistaken for a new connection.

## NAT and resource exhaustion

NAT may translate source ports so multiple machines can share a public IP address. The limit is not just the theoretical port count: each mapping consumes conntrack state, and timeouts, traffic patterns, and destination count affect reuse. A client opening too many short-lived connections may encounter `EADDRNOTAVAIL` or NAT port exhaustion.

Connection pooling, application-level keep-alive, concurrency limits, and backpressure often reduce connection churn. Expanding the ephemeral range can help in some cases, but does not fix socket leaks or an excessive connection rate.

## Check your understanding

**Does every TCP connection need a separate server port?** No; the server distinguishes connections by their tuple.

**Does NAT have an unlimited number of ports?** No.

**Will increasing the port range certainly solve connection exhaustion?** No.

## Further reading

TCP close states and TIME_WAIT explain why a tuple cannot be reused immediately.
