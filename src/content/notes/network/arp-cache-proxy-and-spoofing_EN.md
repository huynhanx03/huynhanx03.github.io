---
title: "ARP cache, proxy ARP, and spoofing on a LAN"
category: "Network"
tags: ["network", "arp", "security", "lan"]
description: "Analyze ARP cache lifecycles, proxy ARP, and how forged mappings can misdirect traffic."
updated: 2026-10-16
translationKey: "network/arp-cache-proxy-and-spoofing"
---

ARP resolution does not query on every packet. A host caches IP-to-MAC mappings and refreshes them according to state and timeout. A wrong mapping can send a frame to the wrong device even when the IP route is correct.

The cache commonly distinguishes resolved entries from entries waiting for a reply. If an on-link IP does not exist or is offline, the host may retry the ARP request; the entry remains incomplete or pending, then expires or becomes failed. Retry count, wait time, and display depend on the OS. Books describe common timeouts from their publication period; do not use them as constants for every current machine.

Dynamic mappings are **soft state**: they remain for a while and are discarded or verified again so hardware or topology changes can be reflected. A host also commonly learns the requester's IP/MAC from a valid ARP request, so a request can update its cache without waiting for an IP packet from that requester.

## Proxy ARP

A router can answer ARP on behalf of another host (proxy ARP), making the sender believe the peer is on the same link and causing it to send the frame to the router. The router then forwards the packet. This supports some legacy topologies, but obscures subnet design and makes routing harder to debug.

Proxy ARP was once used to connect physical network segments that shared a prefix or to support older devices that did not handle subnets as modern systems do. Modern designs usually make subnets and routing explicit rather than hiding topology behind a proxy. In a capture, a reply for the destination IP with the router's MAC is a reason to investigate proxy ARP or special configuration; it does not by itself prove an attack.

## Gratuitous ARP and duplicate-address detection

**Gratuitous ARP** is commonly a request where the sender and target IP are the same address the host intends to use. It can help detect conflicts and inform peers of a cache update when a MAC changes. A gratuitous ARP by itself is not a complete conflict-detection procedure.

IPv4 **Address Conflict Detection (ACD)** distinguishes a probe from an announcement. A probe uses sender IP `0.0.0.0` and the candidate address as the target, so peers do not learn the candidate as an already-used mapping. If no conflict is found, the host sends an announcement stating that it is beginning to use the address, then continues to monitor ARP for later conflicts. Probe counts, random intervals, and responses depend on the RFC and implementation; the key idea is to check before use, then announce the start of use.

## ARP spoofing

ARP has no default authentication. An attacker in the same broadcast domain can send unsolicited replies advertising its MAC for the gateway IP, causing some traffic to pass through the attacker. HTTPS protects application payload when certificate validation is correct, but an attacker may still drop traffic or observe metadata.

An ARP reply need not answer a request just sent, so a host may be tricked into accepting a forged mapping. A common scenario is an attacker advertising its MAC for the gateway's IP, causing traffic leaving a host to pass through the attacker. This can expose unencrypted traffic, allow traffic modification or forwarding, or cause denial of service. The impact depends on the attacker's position, forwarding, and end-to-end protection.

A static ARP entry is not a reliable security boundary if the implementation still allows unsolicited replies to replace it. Books note this behavior in some systems; verify the neighbor-update policy of the platform before relying on a static mapping as protection. Large-scale static mappings also complicate failover and NIC replacement.

For hosts with multiple interfaces, mappings must also be associated with the correct interface. A bug or configuration that lets ARP information from one interface affect another can misdirect traffic to the wrong segment. In practice, inspect neighbors by interface and compare the route and responding interface; sysctl details in older books may not be current guidance.

## Defenses

Dynamic ARP Inspection, port security, DHCP snooping, VLAN segmentation, static neighbor entries in selected use cases, and end-to-end TLS/IPsec can reduce risk at different layers. Static ARP at scale is difficult to operate and does not address every attack.

## Summary

- ARP caching improves efficiency, but mappings have lifetimes and states.
- Proxy ARP answers on behalf of a peer and can obscure topology.
- ARP replies are unauthenticated, so a host on the same LAN can spoof mappings.
- Gratuitous ARP announces a mapping; ACD probe/announcement is a clearer conflict-detection process.
- Switch protection, segmentation, and end-to-end cryptography complement one another.

## Check your understanding

**Does TLS prevent an ARP-spoofing attacker from dropping traffic?** No. TLS can protect content and identity, but an attacker can still cause denial of service.

**Does proxy ARP prove that the host's subnet mask is correct?** No.

**Is static ARP a simple solution at large scale?** No. Mapping administration and failover are difficult.

## Read next

For IPv6, Neighbor Discovery adds RA, NS, and NA messages and has its own security considerations.
