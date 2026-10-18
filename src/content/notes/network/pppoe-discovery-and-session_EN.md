---
title: "PPPoE: finding an access concentrator and opening a PPP session"
category: "Network"
tags: ["network", "pppoe", "ppp", "ethernet", "dsl"]
description: "Follow PPPoE from broadcast discovery to a PPP session, subscriber authentication, and IP address configuration."
updated: 2026-10-16
translationKey: "network/pppoe-discovery-and-session"
---

**PPPoE** carries a PPP session over Ethernet. A classic example is a bridged DSL modem: the customer's computer or router creates a PPP session with the provider's access concentrator (AC). The endpoint then uses PPP for authentication and configuration negotiation; a bridged modem does not necessarily act as an IP router itself.

PPPoE has two phases: **Discovery** finds an AC and creates a session; **Session** then carries ordinary PPP packets. The extra encapsulation must be accounted for in the MTU across the entire path, with compatible settings on devices, tunnels, and the upstream path.

## Discovery phase

The client starts with **PADI** (Initiation), an Ethernet broadcast asking whether a PPPoE server offers a suitable service. One or more ACs may reply with unicast **PADO** (Offer). The client chooses an offer and sends **PADR** (Request) to the selected AC. The AC confirms with **PADS** (Session-confirmation) and assigns a Session ID.

PADI/PADO/PADR/PADS messages contain type-length-value tags such as Service-Name and AC-Name. Host-Uniq helps a client match replies to its request; an AC-Cookie can reduce some forms of discovery resource abuse. These tags are session metadata, not proof of subscriber authentication.

Ethernet EtherType `0x8863` is used for discovery; `0x8864` is used for PPP sessions. The initial PADI is broadcast; later steps are usually unicast between the client and AC. After PADS, the two sides use the assigned Session ID to distinguish the session over Ethernet.

## PPP session phase

Once the session is open, Ethernet payloads carry PPP packets. PPP runs LCP to negotiate the link; if policy requires it, the peers authenticate; then IPCP and/or IPv6CP configures the network layer. Other PPP mechanisms may be used depending on the service and equipment.

Successful PPPoE discovery does not prove that the client has an IP address or route. When debugging, separate the layers:

1. Did the client receive a PADO from an AC?
2. Did PADR/PADS complete and assign a Session ID?
3. Did LCP open the link and did authentication succeed?
4. Did IPCP/IPv6CP negotiate an address?
5. Do routes, DNS, MTU, and reachability work?

The session ends when one side sends **PADT** (Termination) or the underlying link is lost. Discovery failures often involve VLAN, bridging, service tags, or the AC; failures after PADS may lie in PPP authentication or IP configuration.

## Limits and security

PPPoE encapsulates PPP over Ethernet; it does not provide encryption by itself. Subscriber authentication and data protection are handled by PPP mechanisms, IPsec/TLS, or other provider architecture. If LCP chooses a weak authentication method, a working link does not mean the credentials are well protected.

Encapsulation consumes some of the available frame size. If interfaces, tunnels, and upstream links disagree on MTU, small packets may work while larger ones fail. Check PMTUD and relevant ICMP behavior instead of assuming PPPoE implies one universal MTU.

## Summary

- Discovery finds an AC and assigns a Session ID through PADI → PADO → PADR → PADS.
- The session carries PPP; LCP, authentication, IPCP, and IPv6CP remain separate PPP steps.
- Ethernet uses EtherType `0x8863` for discovery and `0x8864` for the session.
- PADT or loss of the underlying link ends the session.
- PADS alone does not prove that IP, routes, DNS, or MTU work.

## Check your understanding

**Is PADI sent as unicast to a known AC?** Usually not; the client broadcasts PADI to find offers.

**Does PADS mean IPCP has assigned an address?** No. PADS completes PPPoE discovery; PPP/LCP and NCP run afterward.

**Does PPPoE encrypt the payload itself?** No. It encapsulates PPP over Ethernet.

## Read next

During a PPP session, [LCP, authentication, and NCP](/en/notes/network/ppp-link-negotiation-and-encapsulation/) configure the link and IP.
