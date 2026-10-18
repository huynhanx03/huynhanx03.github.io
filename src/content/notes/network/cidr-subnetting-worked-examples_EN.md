---
title: "CIDR Subnetting Through Address Calculations"
category: "Network"
tags: ["network", "ip", "cidr", "subnetting"]
description: "Calculate network prefixes and address ranges, and check whether hosts share a subnet using masks instead of memorized shortcuts."
updated: 2026-10-16
translationKey: "network/cidr-subnetting-worked-examples"
---

CIDR appends a prefix length to an address, such as `/24`: the first bits are the network prefix. The remaining bits distinguish addresses within that prefix. Calculating with masks shows whether a destination is directly on the link or must be reached through a router.

## An IPv4 `/26` example

`192.0.2.70/26` has 26 network bits and 6 host bits. Its subnet mask is `255.255.255.192`; the block size in the final octet is `256 − 192 = 64`. Networks begin at `.0`, `.64`, `.128`, and `.192`, so `.70` belongs to `192.0.2.64/26`.

In this ordinary IPv4 broadcast subnet, `.64` is the network address, `.127` is the broadcast address, and `.65` through `.126` are typical host addresses. Some point-to-point prefixes or special configurations use different rules; do not apply the usable-host formula blindly to every environment.

## Same subnet or use a router?

Compare the source and destination prefix bits using the mask. If the prefix matches, a host commonly ARPs for the destination directly over IPv4. If it differs, the host sends the frame to the next-hop router's MAC address. A default route is used only when no more specific route matches.

In practice, the kernel selects a route using the routing table, longest-prefix match, metric, and policy rules; the interface subnet mask is only part of the information. `ip route get ADDRESS` shows the actual decision on Linux.

## IPv6

IPv6 uses the same prefix-length idea, for example `2001:db8:1::/64`. IPv6 has no broadcast; Neighbor Discovery performs link-layer address resolution and other control functions. `/64` is common on LANs to support SLAAC, but site-to-site routes may use other prefix lengths.

## Check your understanding

**Which prefix contains `10.1.2.130/25`?** The block size is 128, so it belongs to `10.1.2.128/25`.

**Do two hosts in the same A/B/C class necessarily share a subnet?** No; the CIDR prefix decides.

**Does IPv6 have a broadcast address?** No.

## Further reading

Once the destination is known to be off-subnet, the routing table and longest-prefix match choose the next hop.
