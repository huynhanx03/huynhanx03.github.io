---
title: "Tunneling and Overlay Networks"
category: "Network"
tags: ["network", "tunnel", "overlay", "vpn", "encapsulation"]
description: "Understand how tunnels encapsulate packets or frames, and how overhead, MTU, asymmetric paths, and security boundaries affect their design."
updated: 2026-10-16
translationKey: "network/tunneling-and-overlay-networks"
---

A tunnel creates a logical link by encapsulating traffic inside another protocol. For example, an IPv4 packet can be carried inside IPv6, or an Ethernet frame inside UDP/IP. The tunnel endpoint at the other side removes the wrapper and forwards the original traffic. The underlay network only needs to deliver the outer packet to the remote endpoint, allowing tunnel endpoints to form an **overlay network** without a direct physical connection between every pair of nodes.

## How does a packet travel through a tunnel?

Suppose host A sends an original packet to host B. The tunnel gateway receives it, adds an outer header containing the addresses of the tunnel endpoints, and sends it through the intermediate network. Intermediate routers forward according to the outer header. The gateway at the other end removes the wrapper and continues forwarding the original packet to B.

```text
original packet → add tunnel header → intermediate network → remove header → original packet
```

Encapsulation does not replace routing: the intermediate network still needs to route the outer packet, while the tunnel endpoint needs to know where to forward the inner packet. Depending on the tunnel, its payload may be a layer 3 IP packet or a layer 2 frame. That determines which traffic types it can carry and whether it can extend a link or its broadcast scope.

GRE is an example of general-purpose encapsulation. Its basic header identifies the encapsulated protocol; extensions can add a key to distinguish flows and a sequence number to help order packets. PPTP, a historical example in the book, combines GRE with PPP to create a virtual point-to-point link. L2TP provides a tunnel but does not encrypt traffic by itself. IP-in-IP, GRE, L2TP, IPsec-based VPNs, and UDP tunnels over IPv4 or IPv6 have different properties, reliability, and purposes; they should not be treated as interchangeable choices.

## A tunnel does not secure traffic by itself

Encapsulation only creates a logical transport path. A network observer may still see the outer endpoints, packet sizes, timing, and traffic volume. Without encryption and authentication, packets may be read or injected, depending on the mechanism and the attacker's position. When security is required, use a suitable protocol that authenticates peers and protects integrity and confidentiality, such as IPsec or TLS at the application layer. Endpoint authentication and key protection matter as much as algorithm selection.

Tunnel endpoints are part of the trust boundary. An attacker may target their resource limits or peer configuration, compromise keys or certificates, or try to inject unauthorized traffic into the inner network. Define which peers may establish tunnels, which traffic may pass, and how endpoint resources are logged and limited.

## Overhead and MTU

The outer header consumes space in each packet, reducing the maximum payload that can travel without exceeding the path's MTU. Nested tunnels, encryption, UDP encapsulation, and extra tags can add more overhead. If an endpoint still sends packets larger than the Path MTU, they may be fragmented or dropped. Small application messages may work while file transfers or larger handshakes stall. Accounting for MTU and MSS, and allowing the ICMP messages needed by Path MTU Discovery, is part of the design rather than a final tuning step.

## Asymmetry and endpoint configuration

The two ends of a tunnel may traverse different physical paths. Even a logically symmetric tunnel does not guarantee the same latency, bandwidth, or Path MTU in both directions. A one-way link may not support a link protocol that requires exchanges in both directions. One workaround is to carry the return traffic through a tunnel over another network; this hides the asymmetry from upper layers, but does not remove the delay or bandwidth limits.

Both endpoints need compatible endpoint addresses, payload types, routes, policies, and authentication mechanisms. Automatic configuration reduces manual work but does not remove dependencies on NAT, firewalls, DNS, or interoperability. Examples such as 6to4, Teredo, PPTP, and operating-system commands in *TCP/IP Illustrated* reflect the context of its 2012 edition; check current standards, support, and security guidance before deploying them.

## Summary

- A tunnel encapsulates packets or frames to create a logical link across an intermediate network.
- Tunnels can form overlays, but routing is needed in both the outer and inner networks.
- Encapsulation does not provide encryption or authentication on its own.
- Added headers reduce usable payload and affect Path MTU.
- Endpoints, policies, peer configuration, and bidirectional paths are all part of tunnel design.

## Check your understanding

**Does an active tunnel mean its payload is encrypted?** No. Check whether a separate security protocol is in use.

**Is the NIC's MTU also the usable MTU inside a tunnel?** No. Tunnel headers reduce the remaining payload size.

**Do packets necessarily take the same path in both directions?** No. Routing, latency, and Path MTU may be asymmetric.

## Further reading

See [IPsec: IKE, ESP, and transport/tunnel modes](/en/notes/network/ipsec-ike-esp-modes/) for an authenticated suite that protects packets. See [MTU and fragmentation](/en/notes/network/ethernet-wifi-switching-mtu/) and [Path MTU Discovery](/en/notes/network/path-mtu-discovery-black-hole/) to investigate dropped packets.
