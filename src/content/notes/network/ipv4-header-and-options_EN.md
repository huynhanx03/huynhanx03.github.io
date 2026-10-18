---
title: "The IPv4 Header: TTL, Protocol, Checksum, and Options"
category: "Network"
tags: ["network", "ipv4", "packet header"]
description: "Decode common IPv4 fields in a capture and distinguish the header checksum from payload integrity."
updated: 2026-10-16
translationKey: "network/ipv4-header-and-options"
---

An IPv4 packet begins with a variable-length header. The 20-byte base header contains version, IHL, DSCP/ECN, total length, identification, flags/fragment offset, TTL, protocol, header checksum, and source/destination addresses.

Multi-byte values in the IP header use **network byte order (big-endian)**. IHL counts 32-bit words, so the maximum header is 60 bytes. Total Length is the entire IPv4 datagram, including header and payload; it helps distinguish IP data from padding Ethernet adds to reach its minimum frame size.

## Important fields for debugging

- **IHL:** header length in 4-byte units; options make it longer.
- **Total Length:** the size of the entire IPv4 packet, header and payload.
- **TTL:** decremented at each router; when it reaches 0, the packet is discarded and may cause ICMP Time Exceeded.
- **Protocol:** identifies the directly encapsulated protocol such as TCP, UDP, ICMP, or IP-in-IP; it is not a TCP/UDP port.
- **Identification/Flags/Fragment Offset:** relate fragments when a datagram is fragmented; the offset uses 8-byte units.
- **Header checksum:** detects errors in the IPv4 header; routers update it because TTL changes.
- **DSCP/ECN:** DSCP selects a class or per-hop treatment under policy; ECN can indicate congestion without dropping a packet if endpoints and the path support it.

DSCP is a label, not a guarantee of bandwidth or latency. Routers may classify, queue, or remark traffic according to policy; different networks along the path may apply different policies. ECN uses two separate bits: an ECN-capable router may mark a packet when its queue is congested, and a transport such as TCP responds to the congestion mark using its own mechanism. Enabling ECN at only one endpoint is not enough for an end-to-end signal.

## Options

IPv4 options may include record route, timestamp, source route, and other options. They lengthen the header and complicate processing; many routers process such packets slowly or drop them. Source routing lets a sender specify a path and creates security risks, so it is commonly disabled.

Options are padded so the total header remains a multiple of 4 bytes; End of List and No Operation are one-byte options used for termination and padding. Many options in older books are historical or uncommon; do not assume modern routers will accept them. Router Alert is an exception intended to request additional router processing, but still depends on support and path policy.

## What does the checksum cover?

The IPv4 header checksum does not protect the payload. TCP/UDP checksums and application cryptographic integrity have different scopes. If a host-side send capture shows a “bad” checksum, NIC offload may not have calculated it yet at the capture point.

## Summary

- The IPv4 base header is 20 bytes; options make it variable length.
- TTL, protocol, length, and fragmentation fields help routers process packets.
- DSCP is a policy treatment label; ECN signals congestion if the full path supports it.
- Routers decrement TTL and therefore update the header checksum.
- The header checksum does not protect the payload.
- Options may add overhead and be handled differently by middleboxes.

## Check your understanding

**Is TTL measured in seconds?** No; it is decremented per hop.

**Does the IPv4 header checksum authenticate the packet source?** No.

**Does the Protocol field contain a TCP port?** No; it identifies the next transport or protocol.

## Further reading

IPv6 changes the fixed header and moves extensions into a separate header chain.
