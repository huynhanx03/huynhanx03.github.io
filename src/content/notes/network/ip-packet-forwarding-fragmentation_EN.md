---
title: "IP packets, forwarding, and fragmentation"
category: "Network"
tags: ["network", "ip", "forwarding", "mtu"]
description: "Read IP headers conceptually, trace a packet through routers, and understand fragments and Path MTU Discovery."
updated: 2026-10-16
translationKey: "network/ip-packet-forwarding-fragmentation"
---

IP provides best-effort datagram service: it tries to deliver a packet from source to destination across networks, but does not guarantee that the packet arrives, arrives in order, or appears only once. Reliability is commonly handled by an upper layer such as TCP or the application.

## Header and forwarding

An IPv4 header contains source and destination addresses, protocol, TTL, total length, identification and fragment fields, and a header checksum. IPv6 has a different base header with Next Header and Hop Limit; some functions use extension headers. A router reads the destination, looks up a route, decrements TTL/Hop Limit, and forwards or discards the packet.

An IP address is configured on an interface; a multihomed host may have multiple addresses and routes. Source address selection follows policy and routes, not necessarily one “IP address of the machine.”

## Routes choose a path; frames carry each hop

A forwarding table commonly contains a destination prefix, mask or prefix length, next hop, and interface. The kernel compares the destination with matching routes and uses **longest-prefix match**: a more-specific route wins over a general one; the default route is the broadest fallback. If several routes have the same prefix length, metric, policy routing, or OS rules provide further choices.

An `on-link` or connected route usually sends directly to a peer on the link. A route with a gateway sends to the next-hop router. IP source and destination usually remain the same across hops; NAT, tunnels, or special mechanisms can change them. The link-layer frame is recreated on every link, and its destination MAC is the next hop's MAC for that link. A switch forwards a frame by MAC; a router reads the IP destination, looks up a route, and creates a new frame for the next hop.

When an IP packet reaches a host, the host checks whether the destination address is local. If not, it forwards only when configured as a router; an ordinary host discards it. A router may return ICMP when there is no route or TTL/Hop Limit expires, but policy may also silently discard a packet.

## Multihomed hosts

A machine with multiple interfaces must choose a source address, outgoing interface, and receive behavior. The **strong host model** closely binds sending and receiving an IP address to the interface that owns it; the **weak host model** allows a local address to be used or received through another interface. Actual behavior depends on OS, configuration, and routing policy; it affects multihoming, firewalls, and the risk of traffic entering an unexpected interface.

When an application does not specify a source address, the OS usually selects one based on route/interface, scope, address state, and policy. IPv6 needs particular attention because an interface may have several addresses in the same or different scopes. If a connection takes the wrong path or receives no response, check the selected route, source address, interface, and filtering policy together rather than looking only at the destination IP.

## IPv4 fragmentation

If an IPv4 packet is larger than the next link's MTU, a router may fragment it when DF is not set and configuration permits. Fragments carry offsets and identification for reassembly at the destination; losing one fragment can make the whole datagram unusable. Reassembly usually occurs at the destination, increasing sensitivity to loss and requiring buffers.

An IPv6 router does not fragment packets. The sender needs to know the path MTU and use a Fragment header if fragmentation is needed under the appropriate mechanism. This makes Path MTU Discovery and ICMP important.

## Path MTU Discovery and black holes

The sender transmits packets according to an estimated MTU. A router that encounters a smaller link may send an ICMP “too big” message (IPv6) or Fragmentation Needed (IPv4 with DF). The sender reduces the payload size accordingly. If a firewall blocks the required message, small packets work but large packets are repeatedly dropped—a PMTU black hole.

TCP MSS is the negotiated or adjusted TCP payload limit, based on MTU and headers. Tuning MSS can be a workaround in a specific topology, but investigate the MTU/ICMP cause instead of applying it blindly.

## Best effort and other layers

The IPv4 IP checksum protects the header, not the payload end-to-end. A link checksum applies only to one link, and the packet may be carried in a different frame through a router. TCP checksum covers the segment and pseudo-header; TLS authenticates application content for a session. Each layer has a different scope.

## Summary

- IP forwards best-effort datagrams and does not provide reliability itself.
- Routers forward by destination and route, decrementing TTL/Hop Limit.
- Longest-prefix match selects the most specific route; default is used only when no better route matches.
- IP addresses identify end hosts; link-layer addresses identify the next hop and change across links.
- IPv4 may fragment under conditions; IPv6 routers do not fragment.
- PMTUD needs relevant ICMP; blocking it incorrectly can create a black hole.
- Checksums at different layers protect different scopes.

## Check your understanding

**Does IP guarantee packets arrive in order?** No.

**Does an IPv6 router fragment a packet when the MTU is small?** No. The sender handles PMTU and fragmentation.

**Does Ethernet FCS protect payload through every router?** No. FCS is recalculated on each link.

## Read next

ICMP provides errors and diagnostics for IP in addition to ping.
