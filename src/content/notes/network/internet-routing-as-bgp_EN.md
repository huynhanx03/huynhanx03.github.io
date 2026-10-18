---
title: "Internet Routing: ISPs, ASes, and BGP"
category: "Network"
tags: ["network", "routing", "bgp", "internet"]
description: "Expand routing from a LAN to the global Internet, and understand autonomous systems and BGP policy."
updated: 2026-10-16
translationKey: "network/internet-routing-as-bgp"
---

Routers on a LAN commonly use a default gateway. On the Internet, networks operated by organizations and ISPs connect through exchanges, transit providers, and peering. An **Autonomous System (AS)** is a network under a common routing policy and is identified by an ASN.

## Intra-domain and inter-domain routing

An IGP such as OSPF or IS-IS commonly exchanges routes within an AS according to cost or topology. BGP exchanges prefixes between ASes and applies economic or administrative policy. BGP does not select paths only by shortest physical distance; local preference, AS path, communities, and policy all matter.

## Prefix announcements and reachability

An AS advertises which prefixes are reachable. A route leak or hijack can send traffic in the wrong direction even when the IP protocol works correctly. RPKI origin validation checks whether an ASN is authorized by a ROA to originate a prefix; it does not verify the full AS path or prevent every misconfiguration.

## Peering and transit

Peering is traffic exchange between two networks under an agreement; transit buys reachability to the rest of the Internet. BGP policy decides which routes to accept or advertise. Two networks can have asymmetric routes, so requests and responses may take different paths.

## Summary

- The Internet links many ASes; it does not use one centralized routing table.
- IGPs usually operate inside an AS; BGP exchanges inter-domain policy.
- BGP route selection considers policy, not only latency or path length.
- RPKI validates prefix origin against a ROA, not the entire path.
- Asymmetric routing and route leaks affect troubleshooting.

## Check your understanding

**Does BGP always choose the path with the fewest hops?** No; policy often decides.

**Does valid RPKI mean the entire route is safe?** No.

**Do ping requests and responses use the same route?** Not necessarily.

## Further reading

Applications see DNS and IP results, but packet captures can reveal a real path that differs from expectations.
