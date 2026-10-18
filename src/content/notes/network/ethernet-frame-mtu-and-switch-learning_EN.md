---
title: "Ethernet frames, MTU, and switch address learning"
category: "Network"
tags: ["network", "ethernet", "switch", "mtu"]
description: "Follow an Ethernet frame across a LAN, see how switches learn source MAC addresses, and relate MTU, frames, and IP packets."
updated: 2026-10-16
translationKey: "network/ethernet-frame-mtu-and-switch-learning"
---

Ethernet carries frames within a link-layer segment. A frame contains source and destination MAC addresses and a payload. A switch observes the source MAC to learn which port a device is on, then uses its forwarding table to send unicast frames.

## How a switch learns and forwards frames

When a frame enters a port, the switch updates its MAC table based on the source MAC and VLAN. If the destination is known, it sends the frame to the corresponding port; if unknown, it usually floods the frame within the VLAN, except back out of the incoming port. Broadcasts are also flooded within the broadcast domain. MAC table entries can expire so the switch can adapt when a device moves.

A MAC table is not an IP routing table. A Layer 2 switch forwards frames by MAC within a VLAN; a router or Layer 3 switch routes packets between subnets. A switch may perform both roles, but the logic remains different.

## MTU and frame size

MTU usually means the maximum payload size on an IP or link interface; an Ethernet frame also has a header and FCS. A VLAN tag increases the frame header. Jumbo frames require compatible configuration across the whole path; a segment with a smaller MTU can create a black hole if Path MTU Discovery is not working.

A basic Ethernet II frame contains a **destination MAC (6 bytes), source MAC (6 bytes), EtherType (2 bytes), payload, and FCS (4 bytes)**. EtherTypes such as `0x0800`, `0x86DD`, and `0x0806` identify IPv4, IPv6, or ARP payloads. In IEEE 802.3 format, the corresponding field can indicate length; values from 1501 to 1535 are not used by either common interpretation, while values of 1536 or greater are EtherTypes. The minimum frame size is 64 bytes from destination address through the FCS; shorter payloads are padded. The minimum originated in historical half-duplex Ethernet collision-detection requirements.

The FCS is a CRC-32 that detects frame bit errors; it does not repair data, authenticate a sender, or guarantee retransmission. A basic frame is commonly at most 1518 bytes: a 14-byte header, an IP packet of up to 1500 bytes (including its IP header), and a 4-byte FCS. An 802.1Q tag adds 4 bytes, so a tagged frame is commonly at most 1522 bytes. Preamble, start-frame delimiter, and inter-packet gap support lower-level transmission and synchronization; they are not included in the IP MTU or the frame-size numbers above in common usage.

For an oversized packet, an IPv4 source may fragment when permitted or report an error to the application. A router unable to forward an IPv4 packet with DF discards it and sends ICMP Fragmentation Needed when the rules permit; an IPv6 router reports Packet Too Big instead of fragmenting a transit packet. A local application error differs from an ICMP message sent across the network to the source. TCP usually adjusts MSS so segments fit the MTU, but tunnels and VPNs add overhead and reduce the effective MTU.

## Tracing a LAN problem

`ip link` shows interface MTU and state; `bridge fdb show` inspects a Linux bridge forwarding database; a managed switch has commands for its MAC table, VLANs, and port counters. Packet capture can confirm frames and VLAN tags, though host captures may see frames after some offload processing.

## Check your understanding

**Does a Layer 2 switch choose a path using IP addresses?** No. It forwards frames using MAC addresses within a VLAN.

**Does MTU include the Ethernet header?** Usually not; MTU describes the Layer 3 payload size an interface can carry.

**Do jumbo frames need to be enabled only on the two endpoints?** No. Every relevant link along the path must support the configuration.

## Read next

If the next-hop MAC address is unknown, ARP or IPv6 Neighbor Discovery resolves the link-layer address.
