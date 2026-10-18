---
title: "VLANs, Bridges, and Layer 2 Loop Prevention"
category: "Network"
tags: ["network", "vlan", "switching", "stp"]
description: "Understand access and trunk ports, VLAN tagging, and why bridges need spanning tree to prevent broadcast storms."
updated: 2026-10-16
translationKey: "network/vlan-bridging-loop-prevention"
---

VLANs divide one physical switch into logical broadcast domains. An access port is usually assigned to one VLAN for an endpoint; a trunk carries multiple VLANs over one link using 802.1Q tags. Native VLAN and tag handling must be configured consistently at both ends.

## Bridges and switching loops

A switch is a multiport bridge. If a Layer 2 path forms a loop, broadcasts and unknown unicasts may circulate indefinitely because Ethernet frames have no TTL. MAC tables may also flap between ports.

Spanning Tree Protocol (STP) detects loops and blocks some paths to create a loop-free tree; redundant links can be re-enabled when the topology changes. RSTP converges faster than classic STP. Root-bridge, edge-port, and BPDU Guard configuration affect stability and security.

### How does STP choose a tree?

Switches exchange **BPDUs** containing bridge ID, root ID, and path cost to the root. The lowest bridge ID is elected root. Other switches select a root port with the lowest-cost path to the root, then a designated port for each segment. Redundant ports do not forward data, preventing loops. Cost and bridge priority can change the tree, so deliberately choose the root bridge in a managed network.

When the topology changes, STP updates port states and the MAC forwarding database. RSTP has the same goal but detects failures more quickly; proposal/agreement exchanges let some point-to-point paths forward without waiting for classic STP timers. RSTP uses discarding, learning, and forwarding states. An edge port moves directly to forwarding if it receives no BPDU, so BPDU Guard or equivalent policy is important for edge ports. **MSTP** can map VLANs to several spanning-tree instances instead of requiring every VLAN to use one tree. Timer and field details in older books may differ; actual behavior depends on the switch and standard version.

## A VLAN is not encryption

A VLAN isolates Layer 2 broadcasts according to switch configuration, but does not encrypt traffic or replace a Layer 3 firewall. A misconfigured trunk or native VLAN, or a compromised switch, can undermine isolation.

## Summary

- VLANs divide broadcast domains; 802.1Q tags let trunks carry multiple VLANs.
- Switch loops cause broadcast storms and MAC flapping.
- STP/RSTP block paths that create loops while preserving redundancy.
- VLANs provide segmentation, not encryption or an absolute security boundary.

## Check your understanding

**Can VLAN 10 and VLAN 20 communicate at IP level by themselves?** They need routing and policy between subnets, depending on configuration.

**Does an Ethernet loop stop by itself like an IP TTL?** No; Layer 2 frames have no equivalent TTL.

**Does a trunk port carry only one VLAN?** It may carry multiple VLANs according to its allowed list and tagging.

## Further reading

ARP/ND resolves a peer within each VLAN or link after routing selects the next hop.
