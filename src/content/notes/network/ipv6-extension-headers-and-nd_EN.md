---
title: "IPv6 Extension Headers, Router Advertisements, and Neighbor Discovery"
category: "Network"
tags: ["network", "ipv6", "icmpv6", "neighbor discovery"]
description: "Trace extension-header chains, RA/SLAAC, and neighbor checks on an IPv6 link."
updated: 2026-10-16
translationKey: "network/ipv6-extension-headers-and-nd"
---

The fixed IPv6 header is 40 bytes and keeps fields commonly needed for forwarding. Other options and metadata can be carried in extension headers linked by Next Header; each header points to the next until a transport protocol or `No Next Header` is reached. When reading a capture, follow the entire chain rather than assuming TCP or UDP always immediately follows the base header.

## Extension headers

Types include Hop-by-Hop Options, Routing, Fragment, Destination Options, and AH/ESP for related mechanisms. Hop-by-Hop Options appears directly after the base header. Options use a type-length-value structure and encode how a node should handle an unrecognized option (ignore it, discard the packet, or discard it and send ICMPv6 Parameter Problem, depending on action bits). Long or uncommon extension headers may be handled differently by middleboxes, causing interoperability problems.

IPv4 options and IPv6 extension headers are protocol capabilities; that does not mean every network forwards every variant. But blindly dropping all packets with extension headers can also block legitimate functions; policy should understand the specific header type and permitted traffic.

An IPv6 router does not fragment packets in transit. If fragmentation is needed, the **source** divides the datagram using a Fragment header; the destination must receive all fragments to reassemble it. Offsets use 8-byte units and fragments of one datagram share an Identification value. Large packets should use PMTUD and ICMPv6 Packet Too Big to select a suitable size rather than relying on a router to split them.

A Routing header enables certain special routing behaviors. Routing Header Type 0 (RH0), described in the book, was deprecated because it could create forwarding loops and amplify traffic; do not confuse it with ordinary IPv6 routing or use old RH0 examples as current deployment guidance. IPv6 also has a Jumbo Payload option for payloads above 65,535 bytes on suitable networks, but this is specialized rather than the common Internet case.

## Router Advertisement

Routers send RAs with prefixes, on-link flags, lifetimes, and router preferences. Hosts use RAs for a default route and may configure addresses through SLAAC. A rogue RA on a LAN can advertise an incorrect gateway or DNS server; RA Guard, switch policy, and trusted segmentation help defend against it.

## Neighbor Discovery

Neighbor Solicitation/Advertisement resolves link-layer addresses and supports DAD; Router Solicitation requests an RA. Neighbor Unreachability Detection checks whether a peer remains reachable. These messages use ICMPv6 type/code and multicast scope.

## Summary

- IPv6 extension headers extend the fixed header as a chain.
- The sender handles fragmentation; routers report Packet Too Big.
- RAs advertise prefixes and default routers and can be spoofed on an unprotected link.
- ND handles neighbor resolution, DAD, and reachability.
- Blindly blocking ICMPv6 or extension headers can break connectivity.

## Check your understanding

**Is an IPv6 header always 40 bytes including extensions?** The base header is 40 bytes; extensions are added afterward.

**Does an IPv6 router fragment a packet when the MTU is too small?** No.

**Does an RA provide only DNS?** It carries prefixes, router information, lifetimes, and flags; DNS may be provided through extensions or configuration.

## Further reading

For distinguishing neighbor, route, and MTU failures, see the ICMP diagnostic workflow.
