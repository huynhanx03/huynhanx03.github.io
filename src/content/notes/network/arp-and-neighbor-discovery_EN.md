---
title: "ARP and IPv6 Neighbor Discovery"
category: "Network"
tags: ["network", "arp", "ipv6", "neighbor discovery"]
description: "Resolve a next-hop MAC on a LAN, inspect the neighbor cache, and understand the safety limits of ARP and ND."
updated: 2026-10-16
translationKey: "network/arp-and-neighbor-discovery"
---

IP routing chooses a next hop, but Ethernet needs a destination MAC address to send a frame. IPv4 commonly uses ARP to map an on-link IPv4 address to a MAC; IPv6 uses Neighbor Discovery (ND), based on ICMPv6.

## ARP request and reply

If a host does not know the MAC for `192.0.2.1`, it broadcasts an ARP request on the LAN asking who owns that IP. The owner usually sends a unicast reply. The host receiving the request can learn the requester's mapping from it, because the request contains the sender's IP and MAC. [RFC 826](https://www.rfc-editor.org/rfc/rfc826.html) describes updating the mapping before generating a reply. Hosts cache mappings so they do not broadcast for every packet.

ARP resolves **on-link addresses** for IPv4 on broadcast-capable multi-access networks. When sending outside its subnet, a host resolves the next hop's MAC (usually its gateway), not the remote server's. Point-to-point links such as PPP do not need ARP when both endpoints are already known through link configuration.

## Reading an ARP frame

On untagged Ethernet, EtherType `0x0806` identifies ARP. The payload includes hardware and protocol address types and lengths, an operation code, and sender/target hardware and protocol addresses. For Ethernet/IPv4 these are usually a 6-byte MAC and 4-byte IPv4 address. A request has opcode 1; a reply has opcode 2. The target hardware address in a request is usually zero because the sender is asking for it.

An ARP request usually goes to Ethernet broadcast `ff:ff:ff:ff:ff:ff` in its broadcast domain. A normal reply is unicast to the requester's MAC. A switch forwards the broadcast within the VLAN; a router does not forward Ethernet broadcasts into another VLAN. ARP does not find MAC addresses across the Internet.

In a packet capture, inspect both destination addresses: an IP packet may target a remote server while the Ethernet destination is the gateway's MAC. For an on-link server, the host usually needs an ARP reply or a valid cached mapping before sending the first IP packet. For an off-subnet IP, it ARPs for the default gateway, not the final Internet host.

## Neighbor Discovery in IPv6

IPv6 ND is a group of ICMPv6 functions, not merely a replacement for ARP. It resolves on-link addresses, discovers routers, advertises prefixes and configuration, detects duplicate addresses, checks neighbor reachability, and sends Redirects in some cases.

### Neighbor Solicitation and Advertisement

To find an IPv6 neighbor's MAC, a host sends a **Neighbor Solicitation (NS)** to the target's solicited-node multicast group rather than broadcasting to the whole LAN. The NS contains the target IPv6 address and usually a Source Link-Layer Address option. A neighbor can reply with a **Neighbor Advertisement (NA)** containing a Target Link-Layer Address option. Router, Solicited, and Override flags describe the sender's role, whether it answers a solicitation, and how to handle an existing cache mapping.

NS/NA also support reachability checks. The neighbor cache tracks states: INCOMPLETE while resolving, REACHABLE after recent evidence, STALE when a mapping has not recently been confirmed, then DELAY/PROBE when it needs checking. Evidence can arrive in an NA or from a higher layer. An entry may be removed when probes expire; retry timing depends on implementation and configuration.

### Router Advertisement and IPv6 addresses

A host can send a **Router Solicitation (RS)** to All Routers for an early response. Routers send **Router Advertisements (RAs)** periodically or in reply. An RA can carry router lifetime, prefix information, MTU, route information, and DNS options. In Prefix Information, **L** says the prefix can be used to determine whether an address is on-link; **A** permits SLAAC. Preferred and valid lifetimes govern address state, while router lifetime governs use as a default next hop.

IPv6 does not assume every address with a matching prefix is on-link. A host needs evidence such as RA Prefix Information, configuration, or an appropriate Redirect. This matters when debugging “same subnet” assumptions borrowed from IPv4.

### Duplicate Address Detection

Before using a new unicast address, a host usually performs **Duplicate Address Detection (DAD)**: it sends an NS from the unspecified source address to ask whether anyone already uses the target. If a conflict is detected, the candidate is not used normally. Because the source is unspecified, this NS does not include the Source Link-Layer Address option used by ordinary solicitations. DAD is not identity authentication; its result depends on whether messages reach other hosts.

### Safety limits

ND messages use IPv6 Hop Limit 255. Receivers check it to reject messages forwarded from another link, since routers decrement Hop Limit. This blocks some remote spoofing but does not authenticate devices on the same link. A rogue RA or NA can still redirect hosts. Layer-2 segmentation, suitable RA Guard/switch controls, monitoring, and SEND address different parts of the problem; Hop Limit 255 is not authentication.

SEND adds signatures and Cryptographically Generated Addresses for a particular trust model, but deployment and administration are complex and it is not enabled everywhere. Some ND options in the book reflect Mobile IPv6 or standards at publication; verify current OS and router support before operational use.

ICMPv6 is more than ping. Blocking all ICMPv6 can break neighbor discovery or Path MTU Discovery. IPv6 firewalls need to permit messages required by policy.

## Cache and inspection

On Linux, `ip neigh` displays the neighbor table. States include REACHABLE, STALE, DELAY, and FAILED; a state does not mean a MAC is certainly online at every instant. Caching reduces broadcasts, but old entries may need checking.

If an on-link destination does not answer ARP, the OS usually retries, then marks the neighbor unresolved or failed. Packets may be held briefly before the application sees a timeout or connection error. Exact messages and retry timing vary by OS, version, and workload; a delay in an old book trace is not a universal rule.

An ARP cache is **soft state**: dynamic mappings expire or are refreshed so the system can adapt to NIC, topology, or address changes. Caching reduces latency and broadcasts; stale or poisoned mappings can send frames to the wrong place.

## Security limits

ARP does not authenticate mappings in common deployments; a malicious LAN host can forge replies (ARP spoofing). ND also needs environment-specific protection. SEND exists but is not universally deployed. VLAN isolation, switch protections, and TLS/end-to-end authentication address different layers.

## Summary

- ARP and ND resolve an IP next hop to a link-layer address.
- For an off-subnet destination, a host looks up the gateway's MAC.
- IPv6 ND also handles router discovery, SLAAC, DAD, reachability, and redirects using ICMPv6.
- NS/NA resolve neighbors; RS/RA discover routers and advertise link information.
- RA flags/lifetimes distinguish on-link prefixes, SLAAC, and the default router.
- The neighbor cache has states and lifetimes; inspect it with Linux `ip neigh`.
- Hop Limit 255 keeps ND on-link but does not authenticate peers on that link.

## Check your understanding

**Does a host ARP for an Internet server's MAC?** Usually it ARPs for the gateway if the server is off-subnet.

**Can blocking ICMPv6 break IPv6 even when TCP is allowed?** Yes. Neighbor discovery and Path MTU Discovery need relevant ICMPv6 messages.

**Does STALE mean the mapping is definitely wrong?** No. It may need confirmation when used.

**Does RA prefix A=1 mean an address is on-link?** No. A permits SLAAC; the separate L flag indicates on-link determination.

**Does Hop Limit 255 protect ND from a malicious host on the same LAN?** No. Same-link devices still need controls.

## Read next

The network layer also needs a route table and default gateway to choose the next hop.
