---
title: "Routing, Next Hops, and Default Gateways"
category: "Network"
tags: ["network", "routing", "gateway", "linux"]
description: "Read a routing table, apply longest-prefix match, and trace a packet from a host across routers."
updated: 2026-10-16
translationKey: "network/routing-next-hop-and-gateway"
---

A routing table says which interface or next hop should carry a packet for each prefix. A host does not need to know the entire Internet; it needs routes to local networks and usually a default route to a gateway.

## Longest-prefix match

A router compares the destination address with matching route prefixes, then selects the most specific one (the prefix with the most bits). If no more specific route exists, it may use a default route, `0.0.0.0/0` or `::/0`.

A route may include a directly connected interface, a next-hop gateway, a metric or priority, and its configuration source. Multiple routes for the same prefix are handled according to kernel and policy rules. Do not look only at the default gateway while ignoring more specific routes or VPN routes.

## A host sends a packet

1. The application writes to a socket.
2. The kernel looks up a route for the destination IP.
3. If the peer is on-link, the peer is the next hop; if it is off-subnet, the gateway is the next hop.
4. Neighbor resolution finds the next hop's MAC address.
5. The kernel and driver send a frame; each router repeats route lookup at each hop.

Routers decrement the IPv4 TTL or IPv6 Hop Limit; when it reaches zero, the packet is discarded and ICMP may report an error. TTL is not an absolute age in seconds; it limits the number of forwarding hops.

## Inspect routes on Linux

```sh
ip route
ip -6 route
ip route get 203.0.113.10
```

The documentation address in the example is not a real server destination. `ip route get` asks the kernel which path it would select for a destination. When troubleshooting, compare routes with interface/address/neighbor state and policy rules.

## Dynamic and static routing

A static route is simple for a small network but must be updated manually when topology changes. A routing protocol such as OSPF or BGP exchanges reachability and policy between routers; an announcement does not mean the path is always healthy or safe. BGP policy and route filtering matter because a global route can be advertised incorrectly.

## Summary

- A routing table maps destination prefixes to next hops or interfaces.
- Longest-prefix match prefers the most specific route.
- A MAC address is needed only for the next hop on the current link.
- TTL/Hop Limit limits forwarding loops; ICMP may report an error.
- Static and dynamic routing have different administration and policy costs.

## Check your understanding

**Does a router need a separate route for every website?** Usually it routes by prefix; the host resolves a name to an IP first.

**Does the Ethernet destination MAC remain the same at every hop?** No; each link uses a new frame addressed to its next hop.

**Is the default gateway always used even when a more specific route exists?** No; longest-prefix match may select the specific route.

## Further reading

A packet may cross many networks and encounter MTU limits; the IP and Network Control topic covers fragmentation and ICMP in more detail.
