---
title: "Mobile IP: home address, care-of address, and home agent"
category: "Network"
tags: ["network", "ipv6", "mobility", "routing", "tunnel"]
description: "Understand the Mobile IPv6 model for preserving an IP identity across networks, and the cost of tunneling and route optimization."
updated: 2026-10-16
translationKey: "network/mobile-ip-home-and-care-of-address"
---

Ordinary routing relies on IP address prefixes. When a device moves to another network, its new address usually belongs to a new prefix; if it keeps the old address, the network may continue routing packets to its old location. **Mobile IP** addresses a specific case: a node moves among networks but wants to keep a stable address so connections can continue to identify it.

This is a specialized protocol model, not a required step in every Wi-Fi roam or cellular network change. Its core idea is simpler than the signaling details: keep one address as identity, assign another for the current location, and tell a mobility-aware router how the two relate.

## Four components and two addresses

- **Mobile Node (MN):** a device that can change its point of attachment.
- **Home Address (HoA):** a stable address associated with the home network; peers use it as the node's IP identity.
- **Care-of Address (CoA):** an address obtained on a visited network, reflecting the current network location.
- **Home Agent (HA):** a router on the home network that stores the HoA → CoA binding and helps forward packets when the node is away.

A binding is useful only if authenticated and still valid. If an attacker can forge a binding update, traffic may be redirected to an attacker-chosen location; therefore, signaling and authentication keys are important parts of the design.

## Basic method: bidirectional tunneling

When the MN moves to a visited network, it obtains a CoA and sends a binding update to the HA. The HA acknowledges and records the binding. A correspondent node (CN) sends packets to the HoA as usual; Internet routing delivers them to the home network, where the HA encapsulates them in a tunnel toward the CoA. The MN receives the encapsulated packet and processes the original. The reverse direction can also be tunneled through the HA.

Tunneling means the CN need not know that the MN moved: the original packet still targets the HoA. In return, the path may detour through the HA, adding headers and latency. Tunneling does not encrypt payloads; protecting signaling/bindings and protecting application content are separate concerns.

## Route optimization

To avoid routing every packet through the HA, a design can inform the CN of the MN's current CoA and send traffic directly. The CN needs evidence that the requester can receive at both the HoA and CoA. MIPv6 describes a **Return Routability Procedure** with challenges sent over both paths; the MN combines the tokens to create authentication information for a binding update.

After accepting the binding, packets can travel directly: traffic from MN to CN uses a Home Address option so the application continues to see the HoA; traffic from CN to MN may use Routing Header Type 2 to handle the home address at the destination. Header details and protection depend on version and specification; IPv6 Routing Header Type 0 in a historical book example has been deprecated and is not the route-optimization mechanism to use.

Route optimization shortens detours but adds signaling, binding state, and security surface at the CN. If a CN does not support it, tunneling through the HA remains the basic compatible model.

Some Mobile IPv6 discovery/update functions use ICMPv6: Home Agent Address Discovery Request/Reply helps find an HA; Mobile Prefix Solicitation/Advertisement helps a roaming node receive prefix updates; Fast Handover (FMIPv6) defines proxy-router solicitation/advertisement to prepare information about the next access point. These are specialized signaling extensions, not requirements for every IPv6 host or ordinary Wi-Fi roaming. *TCP/IP Illustrated, Volume 1* describes message types in the context of RFC status in 2012; real deployments should verify current support and standards.

## Reasoning from a diagram or packet capture

1. Ask whether the outer IP header targets the **HoA** or the **CoA**.
2. If there is encapsulation, separate the outer header (routing to the current location) from the original IP packet (end-to-end identity).
3. Check binding updates/acknowledgments and authentication; receiving a packet at the CoA is not sufficient proof of identity.
4. Compare the HA path with direct optimization to see the trade-off among compatibility, latency, and signaling.

The idea of separating “identity address” from “location address” appears in many network designs. Do not infer that applications see the tunnel, that Mobile IP preserves every TCP session by itself, or that every roaming method uses HoA/CoA.

## Summary

- HoA preserves IP identity; CoA indicates current network location.
- The HA stores the binding and can tunnel packets between the home network and CoA.
- Bidirectional tunneling works with peers that do not support mobility but may create a detour.
- Route optimization allows direct traffic after binding authentication, with more signaling and state.
- Tunneling, signaling authentication, and application-data encryption are separate functions.

## Check your understanding

**Does the HoA automatically become an address in the new subnet when an MN moves?** No. The CoA reflects the new network; the HA keeps the association with the HoA.

**Does tunneling through the HA encrypt data by itself?** No. Encapsulation creates a forwarding path; confidentiality needs separate encryption.

**Is route optimization always shorter when enabled?** It may avoid an HA detour, but depends on topology, binding, and peer support.

## Read next

Ordinary routing still forwards packets hop by hop using route tables and next hops; see [Routing and next hops](/en/notes/network/routing-next-hop-and-gateway/).
