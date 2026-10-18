---
title: "TCP/IP layers and data encapsulation"
category: "Network"
tags: ["network", "tcp/ip", "encapsulation", "protocol"]
description: "Trace bytes from an application through transport, IP, and link layers to understand each layer's responsibility."
updated: 2026-10-16
translationKey: "network/tcpip-layers-and-encapsulation"
---

When a browser sends a request, data does not travel directly from an application function to the network wire. Each layer adds control information so the lower layer knows where to deliver data and how to handle it. At the receiving machine, headers are read in reverse order to deliver the payload to the right application.

## Four TCP/IP layers to reason with

| Layer | Main question | Examples |
| --- | --- | --- |
| Application | What does the data mean? | HTTP, DNS, SSH |
| Transport | Which processes communicate, and with what semantics? | TCP, UDP |
| Internet | Which host/network should receive the packet? | IPv4, IPv6, ICMP |
| Link | How is a frame sent to the next node on this link? | Ethernet, Wi-Fi |

The OSI model divides analysis into seven layers. TCP/IP commonly combines some layers; do not force every protocol into one box if it serves multiple roles.

The five-layer model often separates physical from link; the four-layer model combines them as network access/link. These are ways to reason, not mandatory physical boundaries in every system. TCP/IP has no standard separate session or presentation layer; an application handles sessions, encoding, or data conversion when needed.

## Encapsulation and decapsulation

An application creates a message; transport adds ports, sequence numbers, and checksums according to its protocol to create a segment or datagram; IP wraps it in a packet with source/destination addresses; the link layer wraps it in a frame for the current link.

```text
Ethernet frame [ IP packet [ TCP segment [ HTTP bytes ] ] ]
```

PDU names vary by document and layer. At a router, the old frame is usually removed to read the IP packet, then a new frame is created for the next link; a router usually does not interpret the TCP/application payload. NAT, firewalls, or proxies may modify or terminate some layers according to their role.

Each layer also **multiplexes** several data types over a shared lower layer, then **demultiplexes** them at the receiver using its identifier: EtherType or a corresponding field distinguishes link payloads, the protocol number distinguishes IP payloads such as TCP/UDP/ICMP, and ports let transport deliver data to the right socket. Each identifier has a different scope; a port does not replace an IP address, and a MAC address does not route across the Internet.

## Addresses have different scopes

An Ethernet MAC address is used on a local link; an IP address identifies an interface in a routed network; a TCP/UDP port identifies a transport endpoint on a host. These address types do not replace one another.

An IP packet carries the final destination address, but a frame targets the next hop on the current link. Across the Internet, a router replaces link headers at each segment; IP addresses commonly remain unchanged except with NAT, tunnels, or other mechanisms.

## Hosts, routers, and switches work at different layers

An end host commonly runs applications, transport, IP, and link protocols for its connected networks. A router needs IP forwarding and link protocols for its interfaces; an ordinary Ethernet switch forwards frames on a link and does not need transport or application processing to do so. This is a basic role model: real devices may also run management services, firewalls, NAT, or host functions. IP is multi-hop; a link frame travels one hop to the next hop.

Some supporting protocols are placed between layers for explanation: ARP maps IPv4 to a link address on a multi-access network; ICMP carries IP errors and control information; ICMPv6 also contains Neighbor Discovery and IPv6 address configuration functions. They are often called supporting or adjunct protocols, not ordinary application transport.

TCP and UDP are both at transport but provide different contracts. TCP creates a reliable, ordered byte stream and flow control; UDP preserves datagram boundaries but does not itself guarantee delivery or order. An application chooses semantics, not simply “fast or slow.”

## Why is layering useful?

An application can use TCP over Ethernet or Wi-Fi without rewriting all its logic. A router can change routes and links without understanding HTTP. Each layer provides its own abstraction and protocol contract.

Layering does not mean the layers are entirely independent. Link MTU affects packets; IP/link latency and loss affect TCP; NAT affects connections; TLS runs above transport but depends on hostname authentication. Debugging must follow several layers.

## Summary

- Each layer adds headers for addressing, delivery, or application semantics.
- MAC, IP, and ports have different roles and scopes.
- Routers usually replace frames at each link while forwarding the IP packet.
- Layers allow technologies to be replaced somewhat independently, but do not remove cross-layer dependencies.

## Check your understanding

**Does an Ethernet frame header contain the final destination IP address?** No. The link header addresses the current link; the IP header contains the network destination.

**Does TCP guarantee that an application processes a request exactly once?** TCP provides a reliable byte stream within a connection; exactly-once business behavior requires an application protocol.

**Does a router always preserve every header?** No. Frames change per link, and middleboxes may modify packets or transport.

## Read next

To cross a router, a host needs an IP address and must know the network prefix. See IPv4/IPv6 addressing, subnets, and CIDR.
