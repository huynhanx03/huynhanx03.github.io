---
title: "Broadcast, multicast, and IGMP/MLD"
category: "Network"
tags: ["network", "multicast", "broadcast", "igmp"]
description: "Distinguish broadcast from multicast, understand IP-to-MAC mapping, and learn forwarding scope on a LAN."
updated: 2026-10-16
translationKey: "network/ip-multicast-broadcast"
---

Unicast sends to one destination; IPv4 broadcast sends to every node in a broadcast domain; multicast sends to a group of interested receivers. Multicast distributes one stream to many parties without requiring the sender to create a separate copy for every connection, but membership and routing must be managed.

## Multicast groups

IPv4 multicast uses `224.0.0.0/4`; IPv6 uses `ff00::/8`. A group address is not an ordinary host address. Membership is associated with an interface: a process can join the same group on multiple interfaces or choose sources to accept or exclude. A process can also send to a group without joining it.

On Ethernet, IP multicast maps directly to a multicast MAC address instead of using ARP for each member. IPv4 uses `01:00:5e` plus the low 23 bits of the group address; because only 23 bits are used, **32 different IPv4 multicast addresses can map to the same MAC**. IPv6 uses `33:33` plus the low 32 bits, so many IPv6 groups also share a MAC. A NIC may filter MACs using a limited table or hash, so frames outside the desired IP group can sometimes be delivered up the stack for IP to inspect and discard. A multicast MAC only helps receive a link-layer frame; it does not prove the host joined the exact IP group.

IGMP for IPv4 and MLD for IPv6 let hosts and routers exchange link membership information. A switch can snoop these messages to forward multicast only to ports with receivers, but behavior depends on device and configuration.

## Link-local scope and multicast routing

Some multicast scopes exist only on one link; others have broader scope. Multicast routers need protocols and state to forward traffic across networks. A host joining a group on a LAN does not by itself ensure end-to-end multicast routing.

In **any-source multicast (ASM)**, a receiver joins a group and may receive streams from multiple senders. In **source-specific multicast (SSM)**, a receiver selects a source and group, making the desired stream explicit and reducing some ASM complexity. These are membership and forwarding semantics; a group address does not guarantee Internet multicast routing or support from every router.

IPv6 multicast addresses contain a scope field that limits reach, such as node-local, link-local, organization, or global. IPv4 has multicast ranges and separate limited/directed broadcast; directed broadcast is commonly blocked at routers because it can amplify traffic. Do not confuse multicast and broadcast: group membership is central to multicast.

Multicast is common for discovery, internal streaming, and control protocols, but Internet multicast routing is not as widespread as unicast. Many applications use CDNs or application-layer replication instead.

## IPv4 broadcast

IPv4 has **limited broadcast** (`255.255.255.255`) for the local link and **subnet-directed broadcast** with all host bits set to one. Ethernet broadcast uses `ff:ff:ff:ff:ff:ff`; every NIC in the broadcast domain must consider the frame. Routers commonly do not forward broadcasts between networks, and directed broadcast from outside is disabled on many devices because it can amplify replies (smurf-style amplification). Sending broadcast through a socket commonly requires an application flag such as `SO_BROADCAST`, helping avoid accidental traffic spread.

Broadcast is simple and useful when receiver addresses are unknown, but affects every host in scope. Multicast is more complex because it needs membership and forwarding state; in return, traffic primarily reaches links/hosts with listeners. TCP is a connection between two unicast endpoints; broadcast and multicast are commonly used with UDP or ICMP, not TCP.

## Which device receives a multicast frame?

Reception happens across multiple layers: the switch chooses which ports receive a frame (possibly using IGMP/MLD snooping); the NIC filters destination MACs (with possible false positives from hash/capacity); the driver/IP stack checks the group address; finally, transport filters the port and socket membership or source filters. Since IP-to-MAC mapping is not one-to-one, a NIC receiving a frame does not mean the application receives its datagram.

## Limits of broadcast

Broadcast can create unnecessary processing and is usually not forwarded by routers. IPv6 has no broadcast; related functions use multicast or anycast according to the protocol. Reducing a broadcast domain through VLANs controls scope but does not solve every performance issue.

## Summary

- Unicast targets one destination; broadcast targets every node in scope; multicast targets a receiver group.
- IGMP/MLD track membership for IPv4/IPv6.
- Switch snooping and multicast routers require support and configuration.
- Joining a group on a LAN does not imply multicast routes across the whole network.
- IPv6 uses multicast instead of broadcast.
- IP multicast-to-MAC mapping is not unique; NICs and higher layers continue filtering.
- IPv4 mapping uses 23 low bits; IPv6 uses 32, so MAC collisions are normal.
- Broadcast is simple but makes every host in scope process traffic; multicast needs membership state.

## Check your understanding

**Is a multicast packet always sent to every host like a broadcast?** No. The network may filter by membership.

**Does IPv6 have a broadcast address?** No. The protocol uses multicast for related functions.

**Does IGMP route multicast across the Internet?** No. IGMP manages membership on a link; routing is a separate function.

## Read next

After IP and the control plane, the Transport Layer topic moves to UDP/TCP communication between processes.
