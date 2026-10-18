---
title: "Firewalls, NAT, and connection tracking"
category: "Network"
tags: ["network", "firewall", "nat", "conntrack"]
description: "Understand how firewalls filter traffic, how NAT translates flows, and why NAT does not replace security policy."
updated: 2026-10-16
translationKey: "network/firewalls-nat-conntrack"
---

Think of an edge router as the entrance to a building. A firewall decides who may pass; NAT changes address information so packets find the right recipient on the other side. One device may do both, but they solve different problems. NAT does not automatically become a firewall: inbound traffic may be blocked by filtering policy, by the absence of a mapping, or both.

Chapter 7 of *TCP/IP Illustrated, Volume 1* (Stevens, Fall, 2012) is the source for the extended discussion of firewalls, mapping/filtering behavior, traversal, and IPv4/IPv6 translation. Commands and protocol names in the book reflect its publication period; this note explains mechanisms rather than treating old examples as current configuration advice.

## How firewalls filter traffic

A stateless rule evaluates each packet independently using interface, address, protocol, port, TCP flags, and direction. This is simple, but rules may need to allow both directions for requests and replies.

A stateful firewall tracks flows. After policy permits a new connection, the firewall stores state to recognize reply packets belonging to it. Linux conntrack is a related tracking mechanism; nftables can use conntrack state in rules. “Established” does not mean a packet is safe; it means the device recognizes it as part of a previously seen flow. “Related” often describes auxiliary traffic associated with another flow, but helpers, protocol, and policy must be understood.

An application-layer proxy goes beyond header filtering: it terminates one connection and creates another to the destination, often after understanding the application protocol. As an intermediary endpoint, it can apply policy to application commands or content, but requires a suitable proxy and configured client/service. A proxy is not another name for NAT.

Networks may be split into zones such as inside, outside, and DMZ. A DMZ holds services that need outside connectivity, with policies limiting access from the DMZ into the internal network. ACLs/rules are often evaluated in order; an overly broad earlier rule can make a later narrow rule ineffective. Inspect order, chain/hook, interface, and default policy.

IP fragmentation complicates port filtering: usually only the first fragment contains the TCP/UDP header, while later fragments do not. A firewall must handle fragments consistently with destination reassembly. A simple port rule cannot infer a port from every fragment; inconsistent handling or state can enable bypass or denial of service.

## NAT changes packets and keeps mappings

Two operations are often grouped under NAT:

- **Basic NAT** changes IP addresses, often between address ranges.
- **NAPT/PAT** changes addresses and ports (or corresponding identifiers for some protocols), allowing multiple hosts to share an external address.

Source NAT changes a source address as a packet leaves; masquerading commonly chooses the current interface address. Destination NAT/port forwarding changes a destination to direct inbound traffic to an internal service. NAT keeps a mapping so return packets can be translated back to the correct internal endpoint.

When an address or port changes, IP and transport checksums may need updates. ICMP errors often include part of the original packet; a NAT device must adjust the quoted portion enough to deliver the error to the correct internal endpoint. Fragments after the first do not carry ports, so NAT needs to associate them with the first fragment or handle them through appropriate reassembly/state. Tunnels and protocols embedding addresses in payloads may need an application-level gateway (ALG); payload rewriting can break across protocol versions and add complexity.

NAT also complicates end-to-end connectivity: an external host often cannot open a connection to a private host without a suitable mapping. Port forwarding is a static or preconfigured mapping from an external address/port to an internal endpoint. Hairpin NAT (NAT loopback) lets an internal client reach an internal service using its external address; router support varies.

## Mapping and filtering are different

Do not conflate **mapping behavior** with **filtering behavior**. Mapping describes how an external address/port is allocated and reused for outbound traffic. Filtering describes which external endpoints may send packets back through that mapping. A device may use endpoint-independent mapping with stricter filtering, or another combination. The label “symmetric NAT” groups several behaviors and is insufficient to predict every device. For P2P diagnosis, determine both behaviors rather than asking only “Is there NAT?”

CGNAT/LSN adds another address-translation layer at the carrier; port forwarding on a home router may not enable inbound Internet traffic. NAT64 lets some IPv6 clients reach IPv4 services through a translator; DS-Lite shares IPv4 through a provider. NPTv6 translates IPv6 prefixes statelessly in suitable cases. None replaces firewall policy. A global IPv6 address does not mean all inbound traffic should be allowed.

## Conntrack and resource pressure

Conntrack stores flow information by tuple and timeout. TCP has connection setup/close states; UDP has no handshake, but a firewall can still track a pseudo-state based on packets and time. Timeouts depend on OS, device, and configuration; a value from a book or one router is not universal.

The conntrack table has limits. Many short flows, scans, UDP traffic, or unusual load can consume entries. When the table is full, new flows may be dropped even though the link is working. Inspect counters and logs and manage resource limits rather than blindly increasing timeouts.

## NAT traversal: STUN, TURN, and ICE

NAT traversal can use temporary mappings (“pinholes”) and hole punching: peers exchange information through a signaling channel, then try sending directly to create state in the NAT. Success depends on mapping/filtering behavior, firewall, timing, and topology; direct connectivity is not guaranteed for every pair.

- **STUN** helps an endpoint discover the address/port seen by an external server and may keep a binding alive. STUN does not relay data or guarantee NAT traversal.
- **TURN** provides a relay when a direct path fails, at the cost of server bandwidth and resources.
- **ICE** gathers candidates (local addresses, STUN server-reflexive addresses, and TURN relays), checks candidate pairs, and selects a usable path, usually preferring a successful direct path.

UPnP IGD, NAT-PMP, and PCP let a device ask a router to create a mapping. Automatic mapping reduces manual configuration but increases the attack surface; enable it only when the trust and administration model allows. Do not open broad ports just to “make NAT work.”

## Designing and checking policy

Default deny can suit a trust boundary, but requires minimal allow rules and monitoring. Read rules in their actual order and hook; separately inspect traffic to the host (input), created by the host (output), and forwarded by the router (forward). NAT and filter chains have different jobs. When changing a remote firewall, preserve management access and a rollback path.

Check IPv4 and IPv6; configuring only IPv4 can leave another path open. Rate-limit logs to avoid log floods. NAT does not encrypt traffic, authenticate users, patch vulnerable services, or replace a firewall.

## Summary

- Firewalls enforce policy; NAT translates addresses/ports. A device can do both.
- Stateful firewalls use conntrack to recognize flows and related packets.
- Basic NAT changes addresses; NAPT/PAT changes addresses and ports.
- Mapping allocates an address/port; filtering decides who may send through it.
- STUN discovers a binding, TURN relays when needed, and ICE tests/selects candidates; none guarantees a direct path.
- Conntrack exhaustion and timeouts affect connections; NAT is not encryption or authentication.

## Check your understanding

**Is a host behind NAT automatically safe?** No. NAT does not replace firewall policy, patches, or authentication.

**Does IPv6 without NAT mean no firewall is needed?** No. Firewall policy is independent of NAT.

**Does conntrack not apply to UDP because UDP has no connection?** It can still track UDP state based on traffic and timeouts.

**Does STUN guarantee direct P2P connectivity?** No. Filtering or a firewall may still block it; TURN can relay when needed.

**Are NAT mapping and filtering the same?** No. One describes outbound translation; the other describes accepted inbound sources.

## Read next

For Linux details, read [Linux firewalls: nftables, chains, and connection state](/en/notes/network/linux-firewall-nftables/). For packet fundamentals, see [IP packet forwarding and fragmentation](/en/notes/network/ip-packet-forwarding-fragmentation/).
