---
title: "UDP: small datagrams and simple semantics"
category: "Network"
tags: ["network", "udp", "transport"]
description: "Read the UDP header and understand that applications must handle loss, ordering, datagram limits, and congestion."
updated: 2026-10-16
translationKey: "network/udp-datagrams-and-design"
---

UDP provides connectionless datagrams between ports. It preserves message boundaries: one datagram send creates one UDP datagram, unlike TCP's byte stream. UDP does not handshake, retransmit, remove duplicates, reorder data, provide flow control, or provide congestion control. IP may still fragment a datagram below UDP; the application receives the complete message after IP reassembly, or nothing if a fragment is missing—unless the receive API truncates it because its buffer is too small.

## Header and checksum

The UDP header is always 8 bytes: source port, destination port, length, and checksum (each 16 bits). The source port may be zero if the sender does not need replies; the destination port lets the kernel demultiplex a datagram to a socket. UDP and TCP have separate port spaces even though a service commonly registers the same number for both for convenience. Length includes header and payload and must be at least 8 bytes, so an empty UDP payload is valid. The length may seem redundant because IP also has a length, but it lets UDP validate its own datagram. IPv6 jumbograms larger than 65,535 bytes are a special case: UDP Length can be zero under the jumbogram rules.

The checksum covers the UDP header and payload plus an IP pseudo-header with source/destination addresses and protocol/length information for IPv4 or IPv6. The pseudo-header is not transmitted as packet bytes; it binds the datagram to the correct IP endpoints. For an odd-length payload, a virtual zero byte is added only for the checksum calculation. If the resulting checksum is zero, the on-wire value is `0xffff`; in IPv4, a checksum field of zero means the sender omitted the checksum. RFCs require hosts by default to enable UDP/IPv4 checksums and validate any nonzero checksum; UDP/IPv6 checksums are mandatory in most cases, with specialized exceptions. A checksum is neither encryption nor authentication against an attacker.

The port helps the kernel deliver the datagram to a socket. UDP does not create connection state like TCP; an application can filter peer addresses and ports or serve many clients through one socket.

## Loss, duplication, and ordering

Datagrams can be lost, delayed, duplicated, or reordered. If an application needs reliability, sequencing, retries, duplicate suppression, or congestion control, it must design them or use an appropriate protocol. Unbounded retries can create congestion and repeat side effects.

A minimal request/response protocol can keep a pending message, send a sequence ID, set a timeout, and retry if an ACK does not arrive. ACKs can also be lost: the receiver must recognize a duplicate ID, resend the ACK, and avoid performing the same operation twice. IDs and receiver state must be retained long enough and handled across restarts; merely retrying the same payload does not guarantee exactly-once side effects.

A timeout that is too short creates unnecessary retransmissions; one that is too long makes callers wait even when a request was lost. When many clients retry against an overloaded server, exponential backoff and retry limits prevent load amplification. If widely implemented and carefully tested semantics are needed, consider TCP/QUIC or a suitable application protocol rather than writing a simplistic reliability layer.

DNS commonly uses UDP for small queries but can fall back to TCP; QUIC uses UDP as a transport substrate and provides reliability and congestion control in userspace. “Using UDP” does not mean an application can ignore transport behavior.

UDP fits when an application needs message boundaries and wants to choose its own retry semantics, needs multicast/broadcast, or uses another userspace transport with its own congestion/reliability behavior. Low header overhead does not automatically make it faster: the application may need to implement handshakes, retransmission, deduplication, rate control, and security.

A historical example in the book is **Teredo**: it wraps IPv6 datagrams inside UDP/IPv4 to traverse some IPv4/NAT networks, using a server to discover mappings and a relay when no direct path exists. This illustrates UDP as an encapsulation layer for another protocol, similar to VPN and NAT traversal problems. Teredo depends on infrastructure and has security and operational limitations; treat it as an architectural example from an IPv6 transition era, not as a current deployment recommendation.

## Size and fragmentation

A large datagram may be IP-fragmented; losing one fragment can lose the entire datagram. An application buffer supplied to one receive call may truncate the message if too small; a full kernel receive queue commonly drops whole datagrams, which is a different issue. Path MTU varies with route; designs should limit payload and handle errors or responses clearly.

## Server design

A server needs to bind the correct address and port, read the source IP/port for replies, handle multiple peers, limit queues and buffers, and prevent amplification. A wildcard bind accepts on multiple local addresses; a specific bind restricts the destination IP accepted; it is not automatically a device/interface binding. A UDP socket can be “connected” to filter a default peer and receive ICMP errors through the API on some systems, but that creates no TCP handshake and does not prove the peer exists. A source IP can be spoofed in some environments because UDP is connectionless; do not send a large response to an unauthenticated small request.

## Summary

- UDP preserves datagram boundaries but does not provide reliability, ordering, or congestion control.
- Its 8-byte header has source/destination ports, length, and checksum; source port zero may be used when no reply is needed.
- Ports deliver datagrams to sockets; UDP connect is not a TCP connection.
- Applications must handle loss, retries, duplicates, and congestion when needed.
- Large datagrams risk IP fragmentation and truncation.
- Servers need to prevent amplification and limit resource use.

## Check your understanding

**Does connectionless UDP mean packets have no IP source or destination?** No. IP still routes the datagram.

**Is UDP always faster than TCP?** No. An application may need to rebuild transport features, and results depend on workload.

**Does a UDP checksum authenticate the peer?** No. It detects errors over a defined scope; it does not prove identity.

## Read next

TCP turns packets into a reliable byte stream within a connection; see the TCP service model.
