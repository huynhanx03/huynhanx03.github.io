---
title: "VLAN Access/Trunk Ports and Spanning Tree"
category: "Network"
tags: ["network", "ethernet", "vlan", "switching"]
description: "Understand access ports, 802.1Q trunks, and spanning tree, which prevents Layer 2 loops in redundant topologies."
updated: 2026-10-16
translationKey: "network/vlan-trunk-spanning-tree"
---

VLANs divide a switch fabric into logical broadcast domains. An access port usually connects an endpoint to one VLAN; a trunk carries multiple VLANs between switches, routers, or hypervisors. A mismatch between the two ends can put frames in the wrong VLAN or drop them.

## 802.1Q tags

An Ethernet trunk usually adds a VLAN ID tag to a frame. Native VLAN and untagged-traffic behavior depend on vendor configuration; a mismatch can create a security gap or difficult-to-diagnose connectivity. A VLAN ID has meaning at Layer 2; communication between VLANs requires Layer 3 routing and policy.

An 802.1Q tag adds 4 bytes between the source MAC address and EtherType: the TPID identifies the tag, while Tag Control Information contains a 3-bit PCP priority marking, a 1-bit DEI discard-eligibility indicator, and a 12-bit VID. VID 0 is used for a priority tag without a regular VLAN assignment; VID 4095 is reserved, so the commonly usable VLAN range is 1–4094. A priority marking does not guarantee QoS: devices along the path must map it and apply corresponding policy. The tag increases Layer 2 frame size but typically does not change the IP MTU configuration of 1500 payload bytes.

## Loops and spanning tree

Redundant links between switches create Layer 2 loops: broadcasts can circulate and multiply, while MAC tables flap. Spanning Tree Protocol (STP) exchanges BPDUs and selects a loop-free topology, placing some ports into a blocking or discarding state. If the root bridge or port role changes, the topology reconverges.

RSTP converges faster than classic STP in many cases. PortFast or edge mode brings host-facing ports up quickly, but enabling it on a switch-to-switch link can create a loop; BPDU Guard commonly protects edge ports.

## Troubleshooting

Check VLAN membership, allowed VLAN lists on trunks, native VLAN, STP root and port state, MAC tables, and counters at both ends. A host packet capture may not show tags because of NIC offload; a switch mirror/SPAN port or temporarily disabling offload may be necessary.

## Check your understanding

**Does a VLAN route between subnets by itself?** No.

**Does a trunk always tag every frame?** Native or untagged behavior depends on configuration.

**Do redundant Layer 2 links always improve reliability without side effects?** No; loop prevention is needed.

## Further reading

Layer 3 routing connects VLANs and applies routes and policy between prefixes.
