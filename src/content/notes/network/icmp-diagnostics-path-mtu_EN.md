---
title: "ICMP, ping, traceroute, and Path MTU Discovery"
category: "Network"
tags: ["network", "icmp", "diagnostics", "pmtud"]
description: "Understand ICMP as IP control and error reporting, the limits of ping and traceroute, and the role of MTU."
updated: 2026-10-16
translationKey: "network/icmp-diagnostics-path-mtu"
---

ICMP accompanies IP and carries network-layer errors and status. It is not a reliable transport for applications: ICMP packets can also be lost, filtered, or rate-limited. IPv6 relies more deeply on ICMPv6 than IPv4 does: in addition to error reporting, ICMPv6 carries Router and Neighbor Discovery and multicast membership management.

## What does ping test?

`ping` sends an ICMP Echo Request and waits for an Echo Reply. An identifier distinguishes ping processes because ICMP has no transport-layer port; the sequence number helps reveal loss, duplicates, or reordering. Optional payload data is commonly returned unchanged in the Echo Reply. Send and receive times estimate RTT without requiring the two machines' clocks to be synchronized.

A reply shows that an ICMP path worked at that moment; it does not prove an application's TCP port is open, DNS is correct, or a business request succeeds. A firewall may block echo while allowing an application, or the reverse. Pinging an IPv4 broadcast address can make many machines reply and create substantial traffic; do not do this casually on a production network.

RTT includes time in both directions and processing; it is not simply one-way latency. A few lost packets should be assessed over a longer sample and in context.

## Traceroute

Traceroute sends probes with increasing TTL or Hop Limit. When the value reaches zero, a router may send ICMP Time Exceeded; that response helps infer the address of a router interface near the source and the probe's RTT. Tools may use UDP, ICMP Echo, or TCP probes, and different probe types may encounter different policies. A router or firewall may not respond or may rate-limit replies. Forward and reverse paths may differ, so `*` does not prove that hop drops end-to-end traffic.

## Destination Unreachable and fragmentation needed

An ICMP error commonly contains a copy of the offending packet's header and initial bytes so the host can associate the error with the original protocol or flow. Types and codes differ between IPv4 and IPv6. For example, IPv4 port unreachable is Destination Unreachable type 3/code 3, while IPv6 uses type 1/code 4.

IPv4 can report Fragmentation Needed when DF prohibits fragmentation; IPv6 uses Packet Too Big (PTB), and routers do not fragment packets in transit. The sender reduces packet size based on this information. A firewall that blocks these messages can create a PMTU black hole: a small exchange such as a handshake succeeds, but larger data stalls. ICMP errors are constrained to prevent error storms and may be rate-limited.

ICMPv6 also carries Router Solicitation/Advertisement for router discovery and configuration, Neighbor Solicitation/Advertisement for link-layer address resolution and reachability, and MLD for multicast listener management. Therefore, IPv6 diagnosis must check the relevant ICMPv6 types; ICMPv6 is not merely “ping.”

ICMP errors follow rules about which messages may be generated to prevent loops and spoofing. Hosts should not treat every incoming ICMP message as absolute truth; they should process it according to protocol and state.

## Firewall policy

Blocking ping may be a policy choice, but blocking all ICMP/ICMPv6 often breaks error reporting and discovery. Allow the types and codes needed for the network role, rate-limit where appropriate, and log selectively.

## Summary

- ICMP is control and error reporting associated with IP.
- Ping tests an Echo path, not an entire application.
- Traceroute infers hops through TTL/Hop Limit, but replies may be filtered.
- PMTUD depends on ICMP Packet Too Big or Fragmentation Needed messages.
- Firewalls need message-specific policy rather than blindly blocking all ICMP.

## Check your understanding

**Does a successful ping mean an HTTPS service is healthy?** No.

**Does a `*` at hop 3 mean router 3 drops every packet?** No. It may simply not reply to the probe.

**Is blocking all ICMPv6 safe?** No. Neighbor and router discovery, PMTUD, and other functions need ICMPv6. Apply policy by type/code and network position.

## Read next

Multicast sends traffic to a group of hosts rather than broadcasting to every node in a scope.
