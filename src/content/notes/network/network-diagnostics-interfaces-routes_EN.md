---
title: "Diagnosing Interfaces and Routes on Linux"
category: "Network"
tags: ["network", "linux", "routing", "diagnostics"]
description: "Trace interfaces, addresses, routes, and neighbors to find where connectivity breaks before capturing packets."
updated: 2026-10-16
translationKey: "network/network-diagnostics-interfaces-routes"
---

When a connection does not work, trace the path from the source machine: is the interface linked, are the address and prefix correct, which next hop does the route select, and did neighbor resolution work? Only then move on to transport and the application. This avoids labeling every problem “DNS” or “firewall.”

## Interfaces and addresses

`ip link` shows link state and MTU; `ip addr` shows addresses and prefixes; `ip -s link` reports error and drop counters. A configured link state of `UP` does not necessarily mean physical carrier is present. Wi-Fi association, VLAN tagging, or a cable or switch may be the lower-layer problem.

An address may come from manual configuration, DHCP, or IPv6 autoconfiguration. Check the prefix, duplicate addresses, gateway, and tentative or deprecated state. On a machine with multiple interfaces, the selected source address may not be the one expected.

## Routes and next hops

`ip route` shows IPv4 routes; `ip -6 route` shows IPv6 routes. Policy-routing rules select which table to consult; within that table, the kernel uses longest-prefix match and the relevant metrics or rules. A more-specific route in another table does not automatically override an earlier rule selecting a table. ([ip-rule(8)](https://man7.org/linux/man-pages/man8/ip-rule.8.html)). `ip route get 203.0.113.7` asks the kernel which interface, next hop, and source address it will use for that destination.

If the destination is on the same subnet, the machine usually resolves the destination's link-layer address. If it is on another network, it resolves the gateway's MAC address. `ip neigh` shows the neighbor cache and ARP/ND state. A correct route with an unresolved neighbor often points to a link-layer or gateway problem.

## Continue up the layers

After confirming the route, use `ping` carefully: ICMP may be blocked even when a service works. `tracepath` or `traceroute` suggests the path; `ss -tuna` shows sockets; `curl -v` or `nc` tests an endpoint; `tcpdump` inspects packets at an interface. Comparing captures at both ends helps identify whether traffic was lost in transit or at a host.

Keep the commands, interface, timestamp, and results. Network configuration may be managed by NetworkManager, systemd-networkd, netplan, or another tool; identify the source of configuration so a runtime edit is not overwritten.

## Check your understanding

**How do you find the gateway chosen for a specific destination?** Use `ip route get` to ask the kernel for its actual choice.

**Does a failed ping prove the host is down?** No; ICMP may be filtered.

**Does an off-subnet destination require ARP for the final server's MAC?** Usually the machine only needs the next-hop gateway's MAC on the local link.

## Further reading

Once the interface and route are correct, packet capture helps inspect handshakes, retransmissions, and transport errors.
