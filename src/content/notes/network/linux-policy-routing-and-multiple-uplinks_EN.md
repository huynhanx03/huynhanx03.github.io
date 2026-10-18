---
title: "Policy Routing and Multiple Uplinks on Linux"
category: "Network"
tags: ["network", "linux", "routing"]
description: "Understand rules that select routing tables by source or mark, and why multiple default gateways can create asymmetric paths."
updated: 2026-10-16
translationKey: "network/linux-policy-routing-and-multiple-uplinks"
---

A single routing table usually selects a path based on the destination. A machine with a VPN, multiple interfaces, or two uplinks may need to choose a path based on source address, packet mark, or another policy. Linux policy routing uses rules to select which routing table to consult before choosing the next hop.

## Rules and tables

`ip rule` lists rules by priority; `ip route show table NAME` displays a table. The kernel applies rules in order, then looks up a route in the selected table. `ip route get DEST from SOURCE` helps test the choice for a specific source address.

A firewall mark (fwmark) can direct a packet to a policy table; the mark needs to be applied consistently across the flow. Strict reverse-path filtering may discard valid packets if the reverse route does not match the receiving interface, especially in asymmetric multi-homing configurations.

## Asymmetric paths

A request may leave through ISP A while its response returns through ISP B. Stateful firewalls, NAT, or asymmetric routing in between may drop the flow. Source NAT must match the uplink and return path; adding two default routes alone does not guarantee correct load balancing.

## Troubleshooting

Record source and destination, routing rules, route lookup, conntrack/NAT state, and captures on each interface. Check which network manager created the configuration so changes persist. Test each uplink separately before enabling multi-path policy.

## Check your understanding

**Does Linux always select the lowest-metric default route across all tables?** A rule may select another table first.

**Do two default gateways automatically provide stable load balancing?** No.

**Is asymmetric routing only a performance issue?** It may cause stateful firewalls or NAT to drop connections.

## Further reading

Conntrack associates state and NAT mappings with a flow, so the return path needs to fit firewall policy.
