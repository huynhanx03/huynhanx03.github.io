---
title: "Ethernet, Wi-Fi, switching, and MTU"
category: "Network"
tags: ["network", "ethernet", "wifi", "switch", "mtu"]
description: "Understand LAN frames, switch MAC learning, and how frame size relates to MTU."
updated: 2026-10-16
translationKey: "network/ethernet-wifi-switching-mtu"
---

An IP packet must be carried over a particular link. Ethernet and Wi-Fi define how a host frames data, identifies nodes on the link, and shares the medium. Switches connect LAN ports; routers connect different IP networks.

## Ethernet frames and MAC addresses

An Ethernet frame has source and destination MAC addresses, a type/length field, payload, and a frame-check trailer. MAC addresses are usually 48 bits, with multicast/broadcast and locally administered addresses also available. A MAC address is not an Internet routing address.

Ethernet operates within a LAN/VLAN. Broadcast frames are delivered within a broadcast domain according to the topology. A router does not normally forward Ethernet broadcasts to other networks.

## How a switch learns addresses

A switch observes the source MAC on each port and records it in a forwarding table. If the destination MAC is known, it sends the frame to the corresponding port. If unknown, it floods within the VLAN except through the incoming port, according to switching rules. Entries expire or update when a host moves.

A switch does not “route by MAC across the Internet.” VLANs divide layer-2 domains; communication between VLANs requires a router or layer-3 switch.

## Wi-Fi shares a medium

802.11 uses radio-medium access, association with an access point, link security, and frames with more fields than wired Ethernet. Interference, signal quality, roaming, and airtime affect performance; the advertised link rate is not application throughput.

An access point often bridges traffic between wireless clients and a LAN, but may apply client isolation, VLANs, or a captive portal. An IP packet is commonly encapsulated in a Wi-Fi frame for the radio link; frame and link behavior differ from wired Ethernet.

## MTU and fragmentation

The MTU is the configured maximum payload size for a link-layer protocol. A common Ethernet IP MTU is 1500 bytes, but VLANs, tunnels, PPP, and other networks can change it. If a packet exceeds the MTU along a path, IPv4 may fragment if permitted; IPv6 routers do not fragment, so the sender relies on Path MTU Discovery.

Tunnels add headers and reduce usable payload. An MTU mismatch can let small requests work while large transfers stall if ICMP errors are blocked. When diagnosing, check end-to-end MTU and ICMP/PMTUD rather than lowering MTU arbitrarily.

The MTU of one link and the **Path MTU** are different scopes. Across multiple networks, Path MTU is limited by the smallest MTU on the path at that time. Routes can change after a routing event, and the two directions need not have the same MTU. A NIC's local MTU therefore does not tell you the largest packet that will certainly traverse the whole path. Tunnels also change this limit: the inner packet must fit in the payload left after encapsulation headers.

## Loopback and communication on one host

Loopback is a virtual interface for IP/TCP/UDP communication within a host. IPv4 reserves `127.0.0.0/8` for loopback (applications commonly use `127.0.0.1`); IPv6 uses `::1`. Loopback packets are not sent over a physical network. The OS still processes them through its network stack, so loopback measurements can help observe software cost but do not represent a NIC, cable, Wi-Fi, or real network.

## Link-layer risks

An Ethernet packet capture may see traffic addressed to the capture host, broadcast/multicast traffic, or traffic deliberately copied to a monitor port. Putting a card in promiscuous mode does not make a switch send it every port's unicast traffic. Application/transport encryption protects content when frames are observed, but not all metadata such as addresses, size, and timing.

Switches also have their own attack surface: exhausting a MAC table can cause unknown-destination flooding within a VLAN; forged BPDU or topology information can affect STP; Wi-Fi exposes the radio medium more broadly than a cable. These are threat-model concepts, not exploitation instructions. Defenses include suitable port limits and authentication, BPDU protection, VLAN separation, current Wi-Fi encryption, and end-to-end encryption. PPP and tunnels also need authentication, protected configuration, and controlled endpoints; encapsulation alone is not encryption.

## Link aggregation and Ethernet flow control

**Link aggregation** combines physical links into one logical link to increase aggregate throughput across flows or provide redundancy if a member fails. LACP exchanges state and capabilities so both ends agree which links belong to the group. Distribution commonly hashes flows or addresses, so a single flow usually stays on one member and does not automatically receive the sum of all link capacities. Both ends need compatible configuration, speed/duplex settings, and member state.

Full-duplex Ethernet can use **802.3x PAUSE frames** to ask a peer to stop transmitting temporarily when buffers approach capacity. This is link flow control, distinct from TCP's end-to-end congestion control. Pausing broadly can stall traffic that did not cause the overload and spread congestion to other flows. Enable it according to the network and device design rather than as a default response to every packet loss.

**Wake-on-LAN** is a separate power-management feature: a NIC on standby power may wake a machine after receiving a magic packet, commonly containing six `FF` bytes followed by 16 repetitions of the target MAC. Waking still depends on the NIC, firmware, standby power, network delivery, and security policy; delivering the packet does not guarantee that the machine wakes. [Microsoft's adapter documentation](https://github.com/MicrosoftDocs/windows-powershell-docs/blob/main/docset/winserver2025-ps/NetAdapter/Set-NetAdapterPowerManagement.md) describes this byte pattern.

## Summary

- Ethernet/Wi-Fi frames carry IP packets over a local link.
- Switches learn source MACs and forward within a VLAN; routers move packets between IP networks.
- Wi-Fi capacity is shared airtime, so link rate is not application throughput.
- Path MTU is determined along a route; tunnels reduce usable payload.
- Loopback tests the local network stack, not a physical network.
- Promiscuous mode does not bypass switch forwarding; encryption protects content but not all metadata.
- Link aggregation and pause frames have topology and performance tradeoffs.

## Check your understanding

**Does an ordinary switch replace IP routing between networks?** A Layer 2 switch forwards within a VLAN; routing is a Layer 3 function.

**Does MTU 1500 mean the entire Ethernet frame is at most 1500 bytes?** No. The IP packet occupies the payload; Ethernet header and trailer are outside that MTU.

**Does a 1 Gbit/s Wi-Fi link rate guarantee 1 Gbit/s application throughput?** No. Protocol overhead, retries, contention, and the Internet path affect it.

**Does a switch forward every frame to every port?** No. It uses its forwarding table, flooding only when appropriate.

**Does a 1500-byte interface MTU guarantee a 1500-byte packet can cross a tunnel?** No. Encapsulation may lower the path MTU.

**Does promiscuous mode show all switched unicast traffic?** No. The switch must mirror or otherwise deliver that traffic to the port.

## Read next

After a frame reaches its next hop, routing decides how the IP packet proceeds.
