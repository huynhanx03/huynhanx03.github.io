---
title: "UDP datagram size, fragmentation, and truncation"
category: "Network"
tags: ["network", "udp", "fragmentation", "mtu"]
description: "Estimate practical UDP payload limits, understand reassembly, and avoid large datagrams that can be lost as a whole."
updated: 2026-10-16
translationKey: "network/udp-fragmentation-path-mtu"
---

UDP preserves message boundaries, but IP fragmentation turns one IP datagram containing a UDP message into multiple packets. Only the first fragment carries the UDP header and port; later fragments carry an offset and IP payload, with no port for ordinary filtering rules to inspect directly. NAT and firewalls must associate fragments with the same datagram and handle them consistently. Fragments may arrive out of order and still be reassembled at the destination.

IPv4 uses Identification, Fragment Offset (in units of 8 bytes), and More Fragments to group and reassemble fragments. An IPv4 router may fragment a transit packet if DF does not prohibit it. Fragments are not reassembled in the middle of the path. IPv6 routers do not fragment transit packets; only the source uses a Fragment header. Losing even one fragment prevents delivery of the entire UDP datagram; UDP cannot request retransmission of only the missing fragment.

The receiver must retain fragment buffers and use a timeout so it does not wait forever for fragments that never arrive. After timeout, the whole datagram is discarded; some stacks may send an ICMP reassembly-timeout message, but applications should not count on always receiving one. Missing fragments or reassembly-limit violations can also consume resources.

## Payload size

The theoretical maximum payload depends on IP version, header length, and protocol length fields, but implementation and socket-buffer limits are usually lower. On Ethernet with MTU 1500, basic IPv4 and UDP headers use 28 bytes, leaving a maximum unfragmented payload of about 1472 bytes; options and tunnels reduce it further.

This calculation illustrates MTU 1500 and basic headers; it is not a universally safe application payload. The Internet path MTU may be smaller.

## Path MTU Discovery with UDP

Because applications commonly choose the length of each UDP send, they should avoid packets larger than the path MTU when they want to avoid IP fragmentation. PMTUD uses ICMP Fragmentation Needed (IPv4) or Packet Too Big (IPv6) to report a smaller next-hop MTU. The IP stack usually handles this information and may cache it by destination; the socket API may report “message too long” or provide an MTU to the application, depending on the OS. If several datagrams are sent before ICMP returns, all may be dropped. If a firewall blocks the necessary ICMP, the sender cannot learn the MTU and the connection may hit a PMTU black hole.

PMTU can change by path and over time; tunnels and encapsulation reduce the usable MTU because of added headers. Applications should set sensible payload limits, handle send errors, and consider a discovery mechanism independent of ICMP when the protocol supports one. Do not disable PMTUD globally just to avoid an undiagnosed failure.

Before a fragment is sent over Ethernet, the host still needs the next hop's MAC through ARP or Neighbor Discovery. If the mapping is missing, some packets or fragments may be queued while neighbor resolution runs; queueing and retry details depend on implementation. Fragmentation does not bypass link-layer delivery.

## Datagram truncation

If the application buffer passed to one receive call is smaller than a datagram, the API may report truncation or return only its beginning, depending on the system call or runtime. The application must know whether the full message arrived; parsing truncated data can create a protocol error or security bug. The theoretical IP maximum is not a practical limit: socket and implementation limits and the receive buffer may be much smaller. For optionless IPv4, the theoretical maximum UDP payload is 65,507 bytes (65,535 minus 20-byte IP and 8-byte UDP headers); IPv6 without extension headers or jumbograms has a theoretical maximum of 65,527 payload bytes. These are not safe payload sizes for the Internet.

This differs from a full kernel receive queue, which commonly drops the whole datagram. [udp(7)](https://man7.org/linux/man-pages/man7/udp.7.html) describes receive-call buffer truncation on Linux. If a UDP datagram exceeds the read-call buffer, many APIs discard the remainder of that datagram; truncation reporting depends on the OS and API. Check return length and flags instead of assuming the next read returns the rest.

## Safer design

- Keep datagrams below a practical path MTU or fragment at the application protocol layer.
- Allow the ICMP PTB/Fragmentation Needed messages required for PMTUD.
- Add message IDs, lengths, checksums, or authentication if reassembling at the application layer.
- Limit total buffers and fragment retention time to prevent memory exhaustion.
- Use backoff and congestion control for retries when reliability is required.

A UDP flood can exhaust bandwidth, socket queues, and CPU; a large reply to a small request can create amplification if the source is spoofed. Fragmentation increases state and buffers needed for reassembly and has caused implementation bugs. Historical attack names such as Fraggle, teardrop, and ping of death illustrate risk classes; do not assume modern OSs still have those same old vulnerabilities. Defend by updating stacks, filtering spoofed sources, limiting rate and size, constraining reassembly, and authenticating requests before large replies.

## Summary

- IP fragmentation makes delivery of the whole datagram depend on every fragment.
- IPv4 routers may fragment under conditions; only an IPv6 source fragments, not a transit router.
- Non-initial fragments have no UDP port; firewalls and NAT must handle fragment state consistently.
- Headers and tunnels reduce payload size below the MTU.
- A small UDP receive buffer can truncate a message.
- The theoretical UDP maximum is not a practical payload size.
- Application fragmentation needs memory/time limits and authentication.
- Do not treat the theoretical UDP maximum as Internet-safe.

## Check your understanding

**If one of ten fragments is lost, does the application receive the other nine as a stream?** Usually the incomplete datagram is discarded after the reassembly timeout.

**Does MTU 1500 mean a UDP payload of 1500?** No. IP and UDP headers use part of it.

**Will an application always detect truncation?** It depends on the API; check return flags and length semantics.

## Read next

PMTUD and ICMP need to work so senders do not have to fragment oversized packets.
