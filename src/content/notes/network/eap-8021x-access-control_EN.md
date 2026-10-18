---
title: "802.1X and EAP: Authenticate Before Joining a Network"
category: "Network"
tags: ["network", "802.1x", "eap", "authentication"]
description: "Follow the supplicant, authenticator, and RADIUS server; distinguish the EAP framework from its methods and from link encryption."
updated: 2026-10-16
translationKey: "network/eap-8021x-access-control"
---

802.1X controls access to an Ethernet or Wi-Fi port before a client can join the regular network. The supplicant runs on the endpoint; the authenticator (switch or access point) controls the port; and an authentication server, commonly RADIUS, decides identity and policy.

## The EAP framework

EAP is a framework for carrying authentication methods, not an algorithm itself. EAP-TLS uses certificates; PEAP and TTLS create a tunnel and authenticate inside it according to the configuration. A weak method or incorrect server-certificate validation can expose credentials to theft.

The authenticator relays EAP messages between client and server, often using EAPOL on the local link and RADIUS across the network. After authentication, the server may return VLAN, role, or ACL attributes.

## Port state and guest access

Before authentication, a port may allow only EAP and control traffic; after authentication, policy grants access. A guest VLAN or quarantine network handles devices that cannot authenticate. Fail-open versus fail-closed policy affects availability when RADIUS is unavailable.

## Encryption differs from authentication

WPA2/3 link encryption protects radio frames using the association key; in enterprise mode, 802.1X/EAP authenticates the client and derives keys. Wired 802.1X authenticates access to a port but does not encrypt Ethernet frames by itself. Application TLS may still be needed for end-to-end protection.

## Summary

- The supplicant, authenticator, and RADIUS server coordinate authentication.
- EAP is a framework; EAP-TLS and PEAP are different methods.
- Client-side certificate validation matters.
- VLANs or ACLs can be assigned dynamically after authentication.
- Port authentication and link- or application-layer encryption provide different guarantees.

## Check your understanding

**Is EAP a cipher suite?** No.

**Does wired 802.1X always encrypt frames?** No.

**Does a successful EAP exchange grant every user permission?** No; authorization policy determines access.

## Further reading

Combine EAP with firewall segmentation and TLS in a zero-trust architecture with multiple policy layers.
