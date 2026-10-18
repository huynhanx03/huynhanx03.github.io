---
title: "Network Troubleshooting: From Routes to Packet Captures"
category: "Network"
tags: ["network", "diagnostics", "tcpdump", "troubleshooting"]
description: "Use hypotheses and observations at each layer to distinguish DNS, routing, firewall, TCP, and application failures."
updated: 2026-10-16
translationKey: "network/network-diagnostics-packet-capture"
---

“I cannot reach the server” could mean incorrect DNS, a missing route, a firewall drop, a TCP port that is not listening, a TLS certificate error, or an application returning 500. Effective troubleshooting starts by reproducing the problem and identifying the layer instead of trying random changes.

## Work from nearby layers outward

1. Check interface, link, and address: `ip link`, `ip addr`.
2. Check the route and next hop: `ip route get <ip>`.
3. Check neighbor resolution: `ip neigh`.
4. Query DNS separately and compare the result with the expected IP.
5. Try a TCP connection to the host and port, according to policy.
6. Inspect the TLS handshake and application response.
7. Compare captures at the client and server when you need to know where packets stop.

Ping is useful but is not the only connectivity check; a firewall may block ICMP.

## Sockets and connection state

On Linux, `ss -lntup` shows TCP/UDP sockets and, when permitted, their owning processes; `ss -ti` can show TCP details. `lsof -i` provides another view. A LISTEN entry proves that the kernel has a socket listening on the shown interface and port, not that the application behind it is healthy.

## Packet capture

`tcpdump` captures packets on an interface; use a filter to limit the data. Look for SYN/SYN-ACK, retransmissions, RST, DNS queries, ICMP errors, and MTU issues. Captures may require elevated permissions and can contain credentials or sensitive data; limit file size, snap length, duration, and sharing.

NIC offload can make a host capture show an uncomputed checksum or a segment larger than the wire packet due to GSO/TSO. A capture on a switch mirror or server may show a different view. Decide where to capture and synchronize clocks before drawing conclusions.

## Read TCP evidence

- Repeated SYN without SYN-ACK: the return path, firewall, listener, or server path may be failing.
- RST: an endpoint or middlebox actively reset the connection, or the port did not accept it in that state.
- Retransmission: distinguish loss, delay, reordering, and capture artifacts.
- Successful TCP handshake but stalled request: check TLS, the application, and downstream services.

These are troubleshooting clues, not unique diagnoses.

## Summary

- Troubleshoot layer by layer: link, route, neighbor, DNS, transport, TLS, application.
- `ss` shows socket state; packet capture shows a view of traffic on the path.
- Blocked ICMP does not mean all traffic fails.
- Offload and capture location affect packet interpretation.
- Captures may contain sensitive data; manage scope and retention.

## Check your understanding

**Does an outgoing SYN prove the server received it?** No; you need a response or an observation on the server side.

**Does an established TCP connection mean an application request succeeded?** No.

**Does Wireshark showing a bad checksum in a host capture prove the packet was corrupted on the wire?** No; offload may mean the capture happened before checksum completion.

## Further reading

A network filesystem exposes file APIs over a network and has different semantics from a local filesystem because of latency and remote failures.
