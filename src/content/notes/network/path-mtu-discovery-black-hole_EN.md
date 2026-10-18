---
title: "Path MTU Discovery and MTU Black Holes"
category: "Network"
tags: ["network", "ip", "mtu", "tcp"]
description: "Follow how a host discovers the smallest MTU along a path and recognize connections that stall only for large data transfers."
updated: 2026-10-16
translationKey: "network/path-mtu-discovery-black-hole"
---

The source interface's MTU does not guarantee that every link along the path supports the same packet size. Path MTU Discovery (PMTUD) lets a sender learn the largest packet that can travel end to end without router fragmentation. If error messages are blocked, large packets can fall into a black hole.

## IPv4 and IPv6

In IPv4, a sender can set DF. A router that encounters a smaller MTU must return an ICMP “fragmentation needed” message so the sender can reduce its packet size. IPv6 routers do not fragment packets in transit; they return ICMPv6 Packet Too Big and the source adjusts the packet.

TCP commonly combines MSS negotiation with PMTUD to choose suitable segments. UDP and application datagrams that are too large need their own size handling or fragmentation; losing one fragment makes the entire datagram unusable.

## Symptoms and diagnosis

A small handshake succeeds but a file download or large response stalls; one network or VPN works while another fails. Use `tracepath`, appropriately sized `ping` packets, and packet capture to check ICMP errors. Blocking all ICMP often breaks PMTUD and causes hard-to-recognize failures.

Tunnels add headers and reduce the effective MTU. MSS clamping may work around an issue for TCP in some networks, but it does not fix UDP or every packet. Determine the overhead and address the ICMP or policy cause.

## Check your understanding

**Does blocking ICMP improve security without affecting connectivity?** It can break PMTUD and diagnostics.

**Does MSS clamping fix every application?** No; it only affects TCP MSS.

**Is the source interface's maximum MTU the MTU of the entire path?** No; PMTU is the minimum along the path.

## Further reading

ICMP errors provide the information a sender needs to adjust packet size.
