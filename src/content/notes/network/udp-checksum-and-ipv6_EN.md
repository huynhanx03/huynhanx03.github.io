---
title: "UDP Checksums, the Pseudo-Header, and IPv6"
category: "Network"
tags: ["network", "udp", "checksum", "ipv6"]
description: "Understand how a UDP checksum covers the header, payload, and IP pseudo-header, and compare IPv4 and IPv6 behavior."
sources:
  - title: "User Datagram Protocol"
    url: "https://www.rfc-editor.org/rfc/rfc768.html"
  - title: "Internet Protocol, Version 6 (IPv6) Specification"
    url: "https://www.rfc-editor.org/rfc/rfc8200.html"
  - title: "IPv6 and UDP Checksums for Tunneled Packets"
    url: "https://www.rfc-editor.org/rfc/rfc6935.html"
  - title: "Requirements for Internet Hosts - Communication Layers (RFC 1122)"
    url: "https://www.rfc-editor.org/rfc/rfc1122.html"
  - title: "IP/ICMP Translation Algorithm (RFC 7915)"
    url: "https://www.rfc-editor.org/rfc/rfc7915.html"
  - title: "Stateful NAT64: Network Address and Protocol Translation from IPv6 Clients to IPv4 Servers (RFC 6146)"
    url: "https://www.rfc-editor.org/rfc/rfc6146.html"
updated: 2026-10-17
translationKey: "network/udp-checksum-and-ipv6"
---

The UDP checksum detects some errors in the UDP header and payload. To associate a datagram with the correct IP endpoints, the checksum also covers a pseudo-header containing the source and destination addresses, protocol or next-header value, and UDP length. The pseudo-header is not transmitted as part of UDP; it is only used in the checksum calculation. If the payload has an odd number of bytes, the calculation treats it as if a zero byte were appended; that byte is not part of the packet. Length is included in both the UDP header and checksum calculation.

## IPv4 and IPv6

In IPv4, a UDP checksum of zero means the sender did not calculate one. [RFC 1122](https://www.rfc-editor.org/rfc/rfc1122.html) requires hosts to enable checksums by default; a receiver must discard a datagram whose nonzero checksum is invalid. In IPv6, UDP checksums are mandatory in most cases, with limited specified exceptions for some tunnels. This matters because IPv6 has no IP-layer header checksum.

The Internet checksum uses one's-complement arithmetic. If the calculated checksum is `0x0000`, the sender writes `0xffff` to avoid confusion with the “checksum not calculated” value in UDP/IPv4. When NAT or a translator changes an address or port, the UDP checksum usually needs updating because the pseudo-header or UDP header changed. When translating IPv4 to IPv6, a translator cannot preserve a zero UDP checksum because ordinary IPv6 UDP requires one. For an unfragmented datagram, the translator can calculate a new checksum or discard it. A stateless translator lacks enough data to calculate a checksum for individual fragments; RFC 7915 recommends dropping the first fragment, while stateful NAT64 can handle it through the reassembly procedure in RFC 6146.

## A checksum is not cryptographic integrity

The Internet checksum detects many accidental errors, but collisions can occur and an attacker can recompute it. A MAC, TLS, or DTLS provides authentication and integrity against attackers using a key or session.

## Summary

- A UDP checksum includes a pseudo-header to bind the segment to IP endpoints.
- UDP over IPv4 can omit a checksum in some cases; IPv6 generally requires one.
- A zero UDP/IPv4 checksum means none was calculated; a valid checksum that calculates to zero is encoded as `0xffff`.
- Checksums detect transmission errors but do not authenticate a sender against an attacker.
- Checksum offload can affect host packet captures.

## Check your understanding

**Is the pseudo-header transmitted as extra packet data?** No; it is only used in the checksum calculation.

**Does a correct checksum prove the datagram was not forged?** No.

**Are UDP checksum rules identical in IPv4 and IPv6?** No; requirements and exceptions differ.

## Further reading

TLS/DTLS adds authentication and encryption for applications using UDP or TCP.
