---
title: "IPv6 SLAAC, DHCPv6, and Address Lifetimes"
category: "Network"
tags: ["network", "ipv6", "dhcp"]
description: "Distinguish Router Advertisements, SLAAC, stateful/stateless DHCPv6, and how a host tracks IPv6 addresses."
updated: 2026-10-16
translationKey: "network/dhcpv6-slaac-and-address-lifecycle"
---

An IPv6 host commonly learns its prefix and default router through a Router Advertisement (RA). Depending on RA flags, the host may create an address with SLAAC, ask DHCPv6 for additional information, or obtain an address through stateful DHCPv6. These mechanisms can coexist.

## The role of RAs

An RA advertises prefixes, lifetimes, MTU, and router information. The M (managed) flag suggests using DHCPv6 to obtain addresses; the O flag suggests using DHCPv6 for other information. M/O do not determine the entire configuration: client policy, prefix flags, and other RA information matter too. The default router usually comes from an RA, not DHCPv6.

SLAAC creates an interface identifier; modern mechanisms may use temporary addresses to reduce tracking. Stateful DHCPv6 assigns addresses and leases; stateless DHCPv6 may provide DNS or a search domain without managing addresses. DHCPv6 commonly does not provide a default gateway; RAs remain important.

DHCPv6 has SOLICIT/ADVERTISE/REQUEST/REPLY messages with goals similar to DHCPv4 but a different message format; it is not BOOTP. A client sends to multicast `ff02::1:2` to find a server or relay on the link; UDP client/server ports are 546/547. A client has a stable identifier called a DUID; an IAID distinguishes an association tied to an interface. IA_NA commonly requests a non-temporary address, IA_TA requests a temporary address, and IA_PD requests prefix delegation for a router. These identifiers support binding management; they are not cryptographic proof of identity.

## Lifetimes and checks

An IPv6 address has a preferred lifetime and a valid lifetime. A deprecated address may still be used by an existing connection but should not be selected for a new one; after the valid lifetime expires, it is removed. DAD checks for duplicates before use.

A new address begins in **tentative** state: the host uses it for necessary Neighbor Discovery but not as an ordinary address yet. DAD sends a Neighbor Solicitation from the unspecified address to solicited-node multicast; if another node is already using the candidate, the address is rejected. After successful DAD, the address becomes preferred. After its preferred lifetime ends, it is deprecated; it may continue serving an existing flow until its valid lifetime expires.

SLAAC does not need a DHCP server to create an address from the prefix in an RA. Stateless DHCPv6 can add DNS or a search list; stateful DHCPv6 can manage addresses or prefixes. If M/O are off, a client may still use SLAAC; if either is on, final behavior still depends on the client. Prefix Delegation gives a router a prefix to divide among downstream networks, which differs from assigning one host address.

On Linux, `ip -6 addr`, `ip -6 route`, `ip -6 neigh`, and `rdisc6` (if available) help inspect state. Capturing ICMPv6 RA and DHCPv6 traffic shows what the host actually received. Blocking all ICMPv6 can break Neighbor Discovery and Path MTU Discovery.

## Check your understanding

**Does DHCPv6 usually provide the default route?** Usually the default router is learned through an RA.

**Are SLAAC and DHCPv6 mutually exclusive?** No.

**Can IPv6 have multiple addresses on one interface?** Yes, with different scopes and lifetimes.

## Further reading

ICMPv6 reports errors and supports control functions such as Neighbor Discovery.
