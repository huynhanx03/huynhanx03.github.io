---
title: "IPsec: IKE, ESP, and transport or tunnel mode"
category: "Network"
tags: ["network", "ipsec", "ikev2", "esp", "vpn"]
description: "Follow a Security Association from IKEv2 to an ESP packet, and understand modes, key lifetimes, and NAT traversal."
updated: 2026-10-16
translationKey: "network/ipsec-ike-esp-modes"
---

IPsec is not a single cipher; it is a suite of protocols and policies for protecting IP packets. A Security Association (SA) defines an SPI, algorithms, keys, lifetime, replay window, and processing direction. Inbound and outbound SAs are usually separate.

An IPsec SA for AH/ESP is unidirectional, so bidirectional protection usually requires a pair. An IKE SA is bidirectional control state for managing CHILD_SAs; the unidirectional rule does not apply to every kind of SA ([RFC 7296](https://www.rfc-editor.org/rfc/rfc7296.html#section-1)). An endpoint can be a host or a security gateway. Policy does not have to protect every packet: the Security Policy Database (SPD) decides whether a packet is bypassed, discarded, or protected; the Security Association Database (SAD) stores SA state; and the Peer Authorization Database (PAD) maps peers to permitted authentication methods. Traffic selectors such as addresses, protocol, and port help determine which packets belong to a policy or SA.

## IKEv2

IKEv2 authenticates peers, negotiates policies and algorithms, and derives keys for child SAs. Authentication can use certificates or a pre-shared key. Rekeying creates new keys before a lifetime expires; an incorrect identity or mode can leave a tunnel working in only one direction or cause traffic not to match policy.

In the initial exchange, `IKE_SA_INIT` negotiates a suite and exchanges nonces and Diffie–Hellman values; `IKE_AUTH` authenticates both identities and establishes the first CHILD_SA. Later, `CREATE_CHILD_SA` can create or rekey an SA, while `INFORMATIONAL` carries state, errors, or deletion messages. IKE message IDs pair requests with responses and help detect replay. Algorithm lists, port numbers, and traces in books may reflect an older standards or implementation snapshot; do not reuse an old example suite as a current configuration.

## ESP

ESP protects a packet's payload with confidentiality and/or integrity and authentication, depending on the selected suite. Transport mode keeps the existing outer IP header for the endpoints and protects the payload. Tunnel mode wraps the entire original IP packet in a new packet, which suits gateway-to-gateway or remote-access links.

ESP carries an SPI and sequence number; the receiver can use an anti-replay window to reject old or duplicate packets. Anti-replay depends on integrity/authentication so the sequence number cannot be altered freely. ESP can be configured for integrity only, but encryption without integrity is dangerous because ciphertext could be modified without detection. Tunnel mode hides the inner IP contents and header, but the outer header, packet size, and timing can still reveal metadata.

AH provides integrity and source authentication at the IP layer, but not encryption. Since it validates immutable address fields, NAT changes to an address can break that validation. This is one reason ESP is more common and AH is difficult to use through NAT. Fragmentation and MTU require attention with AH or ESP in transport mode; tunnel overhead also needs to be accounted for operationally.

## NAT traversal and replay

NAT changes headers or ports. IKE NAT detection can switch to ESP encapsulation over UDP (commonly UDP port 4500). ESP sequence numbers and an anti-replay window protect against replay within the configured limits. Fragmentation and MTU can become more complex when tunnel headers are added.

NAT complicates IPsec because AH protects IP addresses; TCP/UDP transport checksums also depend on an address pseudo-header; IKE identities and traffic selectors may contain private addresses; and ESP has no TCP/UDP port for ordinary NAT demultiplexing. NAT traversal detects the presence of NAT and wraps IKE/ESP in UDP. This supports some topologies; it does not make every combination of mode and protocol NAT-safe.

## Summary

- IKEv2 negotiates and authenticates; ESP carries protected traffic.
- An SA has direction, state, lifetime, algorithms, and keys.
- Transport mode protects the payload; tunnel mode wraps the original packet.
- NAT-T encapsulates ESP in UDP when needed.
- Check tunnel MTU, routes, policy, and rekey behavior together.

## Check your understanding

**Does an established IKE tunnel mean every route is protected?** No. Policy, selectors, or routes may not match.

**Does ESP always encrypt?** Its service depends on the selected configuration.

**Does an IPsec tunnel have no effect on MTU?** It does; headers add overhead.

## Read next

802.1X/EAP controls link access; IPsec protects packets along a path.
