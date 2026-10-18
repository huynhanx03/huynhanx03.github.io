---
title: "IPsec, EAP, and Network Access Protection"
category: "Network"
tags: ["network", "ipsec", "eap", "vpn", "security"]
description: "Compare Layer 2, Layer 3, and transport protection and understand the roles of IKE, ESP, and 802.1X/EAP."
updated: 2026-10-16
translationKey: "network/ipsec-eap-network-access"
---

TLS commonly protects an application connection; IPsec can protect IP packets according to policy; 802.1X/EAP authenticates a device or user before it joins a LAN. Choose the layer based on where the trust boundary belongs and which systems need to interoperate.

## IPsec and ESP

IPsec uses Security Associations to define algorithms, keys, direction, and protection parameters. IKEv2 negotiates and authenticates peers and derives keys; ESP can provide confidentiality, integrity/authentication, or both depending on its mode. AH authenticates some IP fields but has difficulty with NAT because headers change.

Transport mode protects the IP payload while retaining the outer header; tunnel mode encapsulates an IP packet in a new one, commonly for a VPN gateway. NAT traversal encapsulates IPsec in UDP for some topologies.

## EAP/802.1X

802.1X controls access to a wired or wireless port; a supplicant (client), authenticator (switch/AP), and authentication server (commonly RADIUS) coordinate. EAP is a framework for authentication methods; EAP-TLS is one method that uses certificates.

An authenticator may simply relay EAP between the supplicant and an AAA backend (pass-through), so it does not need to implement every authentication method itself. EAP messages have request/response and success/failure codes; the EAP method determines credentials, mutual authentication, and whether keys are generated. If a method exports keys, the MSK can provide keying material for the authenticator and link layer. The EMSK must remain at the EAP peer/server and must not be sent to the authenticator ([RFC 5247](https://www.rfc-editor.org/rfc/rfc5247.html#section-1.4)). VLAN, role, or ACL assignment is a separate authorization decision, not just the result of a correct password.

PANA is one way to carry EAP over UDP/IP, separating authentication from a specific link type; it does not replace an EAP method or policy-enforcement point. Some method names, standard status, and algorithms in the 2012 book are historical; real deployments should check current support in the supplicant, AP/switch, and AAA server.

After authentication, policy may assign a VLAN or role. 802.1X does not encrypt all Internet traffic; WPA/802.11 link security and TLS/IPsec solve different goals.

## VPNs and trust

A VPN creates a tunnel but does not automatically make every internal resource safe. Routing, DNS, authorization, split/full-tunnel policy, key rotation, and trusted endpoint devices are still required. Split tunneling reduces traffic through the gateway but complicates policy and the threat model.

## Summary

- TLS, IPsec, and EAP provide protection at different layers and for different roles.
- IKEv2 negotiates Security Associations; ESP protects IP traffic according to mode.
- 802.1X/EAP controls access to a link or network; it does not replace application TLS.
- VPNs need routing, DNS, and authorization policy in addition to a tunnel.
- Protocol choice depends on NAT, endpoints, key management, and interoperability.

## Check your understanding

**Does a successful VPN connection mean a user may access every subnet?** No; routes, firewalls, and authorization still decide.

**Is EAP a single encryption algorithm?** No; it is a framework with multiple methods.

**Does an IPsec tunnel make TLS unnecessary in every application?** No; end-to-end protection and endpoint trust are different concerns.

## Further reading

DNSSEC and DKIM authenticate DNS and email data at the application or service layer.
