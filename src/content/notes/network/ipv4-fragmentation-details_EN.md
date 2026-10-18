---
title: "IPv4 Fragmentation: Identification, Offset, and Reassembly"
category: "Network"
tags: ["network", "ipv4", "fragmentation", "mtu"]
description: "Decode fragment offsets, MF/DF flags, and the costs of reassembling an IP datagram."
updated: 2026-10-16
translationKey: "network/ipv4-fragmentation-details"
---

The IPv4 header has Identification, Flags, and Fragment Offset fields that associate fragments with the same datagram. The offset is measured in units of 8 bytes; every fragment except the last generally needs a payload length that is a multiple of 8 so the offset can represent it.

## DF and MF

DF (Don't Fragment) asks routers not to fragment the packet. If it is too large for the MTU, a router drops it and may return an ICMP fragmentation-needed message. MF (More Fragments) indicates that another fragment follows; the last fragment has MF=0. The offset identifies the payload's position in the original datagram.

Identification together with source, destination, and protocol helps the destination group fragments. Reusing an identification value while old fragments may still exist can create ambiguity. Reassembly buffers are limited and have timeouts.

## Operational risks of fragmentation

Losing one fragment makes the entire datagram impossible to reconstruct. Firewalls and NAT must handle fragment state; attackers can exploit overlapping-fragment or teardrop-like edge cases if stacks and filters do not agree. Many networks are designed to avoid fragmentation through PMTUD or MSS adjustment.

## Summary

- IPv4 fragments use ID, MF, DF, and an offset measured in 8-byte units.
- Reassembly happens at the destination and needs buffers and timeouts.
- Losing one fragment usually loses the original datagram.
- Firewalls and NAT must handle fragments consistently.
- PMTUD helps avoid unintended fragmentation.

## Check your understanding

**Is a fragment offset measured directly in bytes?** No; its unit is 8 bytes.

**Does each router reassemble all fragments and fragment the packet again at every hop?** Usually not. Routers forward fragments; reassembly occurs at the destination.

**Does setting DF mean an oversized packet will still reach the destination?** No. The sender needs an error signal or PMTUD and must reduce the packet size.

## Further reading

IPv6 changes fragmentation and puts responsibility for packet sizing on the sender.
