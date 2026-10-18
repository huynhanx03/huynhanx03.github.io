---
title: "IPv6: addresses, scope, and autoconfiguration"
category: "Network"
tags: ["network", "ipv6", "slaac", "addressing"]
description: "Read IPv6 addresses, distinguish link-local/global/multicast scope, and understand SLAAC and DHCPv6."
updated: 2026-10-16
translationKey: "network/ipv6-addressing-autoconfiguration"
---

IPv6 uses 128-bit addresses and CIDR prefixes. The shortened form omits leading zeroes in each hextet and uses `::` once to replace a run of zero groups. For example, `2001:db8:0:0:0:0:0:12` can be written as `2001:db8::12`. A `/64` is common for a LAN subnet, but link type and architecture can create exceptions.

## Common address types

- **Global unicast:** can be routed globally according to policy.
- **Link-local (`fe80::/10`):** meaningful only on a link and commonly appears automatically on an IPv6 interface.
- **Unique local (`fc00::/7`):** used within a local scope; it is not equivalent to a public global address.
- **Multicast (`ff00::/8`):** sends to a group; IPv6 does not use broadcast like IPv4.
- **Loopback (`::1`):** a host communicates with itself.

An interface can have multiple addresses with different scopes and lifetimes. Temporary or privacy addresses may change according to operating-system policy.

An Interface Identifier (IID) identifies an interface in some IPv6 address/prefix schemes. A historical method converts a 48-bit MAC into modified EUI-64 by inserting `ff:fe` and flipping the U/L bit; books often use this mechanism in examples. Do not assume every current IPv6 address exposes a MAC this way: many operating systems use stable but less linkable IIDs, random or temporary IIDs, or other mechanisms to limit tracking. IID construction also depends on address type, OS version, and policy.

## Router Advertisement: routers, prefixes, and options

A host may send a Router Solicitation to request a Router Advertisement (RA), or wait for periodic advertisements. An RA announces a router lifetime (how long the host may use the router as a default next hop), prefixes, and link parameters. A router lifetime of zero means that router must not be used as a default router; it does not by itself disable other prefix options in the same RA.

In the Prefix Information option, the **L** flag says the prefix may be used for on-link determination; the **A** flag says it may be used for SLAAC address configuration. These roles are independent. The valid lifetime limits how long a prefix/address remains valid; a shorter preferred lifetime can deprecate an address before it fully expires. A host should not assume “same prefix” means on-link without confirming information.

An RA may carry an MTU, route information, recursive DNS server (RDNSS), and DNS search list (DNSSL) when routers and clients support them. So if IPv6 has an address but name resolution fails or route selection is wrong, inspect the actual RA in a capture and the host policy, not only the M/O flags. DHCPv6 can provide additional information or addresses according to policy; the default router is normally still discovered through RA.

RS and RA are ICMPv6 Neighbor Discovery messages. ND messages use Hop Limit 255, which receivers check to constrain them to the link; this is not authentication. A rogue RA on the same LAN can advertise a fake router, prefix, or DNS server, so enterprise networks may need RA Guard or equivalent switch controls and monitoring of permitted routers.

IPv6 Neighbor Discovery uses ICMPv6; blocking all ICMPv6 often breaks essential functions. A host needs prefix, router, and neighbor mappings to send packets.

## Dual stack and transition

Dual stack runs IPv4 and IPv6 side by side. A client can receive both A and AAAA records, then choose a path according to its OS and algorithm (Happy Eyeballs is one approach to reduce waiting when one address family fails). An application having an IPv6 address does not prove that its IPv6 path to the service works.

NAT64/DNS64 and tunnels support some transition scenarios but add dependencies and constraints. Prefer native dual stack where possible, then test DNS, firewalls, MTU, and telemetry for both address families.

## Summary

- IPv6 addresses are 128 bits; an interface may have several addresses.
- Link-local, global, unique-local, multicast, and loopback addresses have different scopes.
- SLAAC uses prefixes from RAs; DHCPv6 participates according to configuration.
- In an RA, L says a prefix may be on-link; A says it may be used for SLAAC.
- RAs may provide a default router, MTU, routes, and DNS options; each lifetime applies to its own field.
- Neighbor Discovery uses ICMPv6; firewalls must allow required messages.
- Dual stack requires checking DNS and end-to-end paths for both IPv4 and IPv6.

## Check your understanding

**Did IPv6 remove broadcast and multicast?** It removed broadcast; multicast remains important.

**Must every IPv6 subnet always be `/64`?** `/64` is common for LANs and SLAAC, but link types have exceptions.

**Does an RA advertising a router prove IPv6 Internet access works?** No. Routes, firewalls, DNS, and upstream connectivity must also work.

## Read next

DHCPv4 and DHCPv6 work alongside SLAAC to configure different parts of a host; next, look at lease and address lifecycles.
