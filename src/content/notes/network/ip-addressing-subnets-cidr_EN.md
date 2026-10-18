---
title: "IP addresses, subnets, and CIDR"
category: "Network"
tags: ["network", "ip", "subnet", "cidr"]
description: "Read prefixes, determine whether addresses share a network, and distinguish interface addresses from network/broadcast addresses."
updated: 2026-10-16
translationKey: "network/ip-addressing-subnets-cidr"
---

An IP address belongs to an interface and is interpreted together with a prefix length. The prefix says how many leading bits identify the network; the remaining bits distinguish addresses within the prefix. CIDR writes this as `address/prefix`, for example `192.0.2.17/24`.

## Calculating an IPv4 prefix

IPv4 has 32 bits. A `/24` keeps 24 network bits and leaves 8 host bits. Its subnet mask is `255.255.255.0`; the network address for `192.0.2.17/24` is `192.0.2.0`, with host bits set to zero.

A shorter prefix has more host bits and covers a larger range. The number of usable host addresses depends on the prefix and convention; `/31` can be used for point-to-point links under an RFC, and `/32` represents a host route. Avoid the simplistic rule “always subtract two” for every prefix.

### Class A/B/C is historical, not a way to infer modern prefixes

IPv4 was historically divided into class A, B, and C unicast networks with default boundaries `/8`, `/16`, and `/24`; class D was for multicast and class E was reserved. Fixed block sizes gave organizations too many or too few addresses. Subnetting lets an organization divide a block locally, while VLSM lets subnets at one site use different prefixes. CIDR replaced the class system to allocate blocks according to need and advertise prefixes through routing. Therefore, the first octet does not reveal the subnet mask of a modern address.

## Same subnet or use a router?

A host applies its mask or prefix to the destination to determine whether the destination is on-link. If it is, the host finds the peer's link-layer address and sends a frame directly. If it is outside the prefix, the host looks up a route and selects its next hop, which may be the gateway of a specific route or the default gateway. The IP packet still targets the final IP address; the default route applies only when no more-specific route matches.

For example, host `192.0.2.10/24` sending to `192.0.2.80` sees the same `/24`, so it uses ARP to find the peer's MAC. Sending to `198.51.100.20` is outside the prefix, so the host uses its route or default gateway and resolves the gateway's MAC.

## Private, public, and special-use addresses

Some IPv4 prefixes are reserved for private networks (RFC 1918), loopback, link-local, documentation, and multicast. A private address is not globally routed like a public address, but can reach the Internet through NAT. Public or private status is not a security property; firewall policy still matters.

Addresses also have a **scope**. IPv4 has limited broadcast; IPv6 has no broadcast and uses multicast for corresponding groups or operations. IPv6 has link-local addresses for one link, unique-local addresses for internal scope, and global-unicast addresses for globally routed use according to policy. A host commonly has several addresses at once; do not treat one address as a stable user identity.

IPv6 has 128 bits and uses similar prefix notation. A link-local address is meaningful only on its link; a global-unicast address may be globally routed; multicast replaces many IPv4 broadcast cases. IPv6 is not simply “longer IPv4”; neighbor discovery, autoconfiguration, and address selection also differ.

## Subnetting for a real problem

When dividing a prefix, determine the number of networks, hosts per network, growth needs, and allowed subnets. Variable Length Subnet Masking lets an organization use different prefix lengths. Route aggregation combines consecutive prefixes to reduce entries, but only when the blocks satisfy bit-alignment requirements.

Prefixes are allocated through administrative levels: global coordinating bodies delegate to regional registries, then to ISPs or organizations, and finally to networks and interfaces. **Provider-aggregatable (PA)** addresses are usually easy to aggregate into an ISP prefix and reduce global routing, but changing providers may require renumbering. **Provider-independent (PI)** space offers more flexibility when changing providers, but independent advertisement may increase route count and requires provider support. Multihoming therefore balances redundancy, provider mobility, and routing-table impact; having multiple addresses alone does not provide failover without policy and routing configuration.

**Anycast** uses the same unicast address advertised from multiple locations. Routing sends a packet to one suitable location according to topology and policy, often the nearest by metric rather than geographic distance. Anycast differs from multicast, which delivers to members of a group.

An incorrect prefix causes subtle failures: a host may think a peer is on-link and ARP unsuccessfully, or think it is remote and send the packet to a gateway. When debugging, check address, prefix, route, and neighbor table together.

## Summary

- An IP address needs a prefix to determine its network scope.
- Same-prefix traffic is sent on-link; other traffic uses a router.
- The next-hop MAC and destination IP serve different roles.
- Private addresses commonly need NAT for Internet access, but do not secure a host by themselves.
- IPv6 uses 128-bit addresses with prefix lengths and distinct neighbor and autoconfiguration behavior.

## Check your understanding

**What is the network address of `192.0.2.17/24`?** `192.0.2.0/24`.

**When sending to a host outside the subnet, is the Ethernet destination the final host's MAC?** Usually it is the next-hop gateway's MAC on the current link.

**Does a private IP mean the machine is safe from the Internet?** No. Firewall policy and network architecture are still needed.

## Read next

Before an IP packet reaches a router, the link layer must forward its frame across the LAN using Ethernet or Wi-Fi.
