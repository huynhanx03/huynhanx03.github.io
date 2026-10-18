---
title: "DHCP relay, lease renewal, and options"
category: "Network"
tags: ["network", "dhcp", "relay", "configuration"]
description: "Follow broadcasts across subnets, renewal and rebinding timers, and options that affect client configuration."
updated: 2026-10-16
translationKey: "network/dhcp-relay-renewal"
---

A new DHCPv4 client has no address, so it broadcasts DHCPDISCOVER within its subnet. Routers do not normally forward broadcasts. A DHCP relay receives the request and forwards it to a server on another network, setting a relay or gateway address (`giaddr`) so the server can identify the source subnet and choose an appropriate pool. The relay returns the reply to the client. A relay is especially important while a client discovers and obtains a lease; after the server is known, some renewal exchanges can be sent directly by unicast.

The Relay Agent Information option, commonly called Option 82, lets a relay add context such as a circuit ID or remote ID that the client did not provide. DHCPv6 has its own relay format, wrapping messages in RELAY-FORW and RELAY-REPL and allowing nested relays. Relays must be trusted: a server may use relay metadata to choose a pool or policy, so untrusted port information needs to be rejected according to configuration.

## Lease timers T1 and T2

The client renews a lease with the original server before it expires (T1). If it receives no response by the rebinding time (T2), it broadcasts or tries another server according to the protocol. Defaults are commonly based on fractions of the lease, but a server can configure them. After a lease expires without renewal, the client should not continue using the address under the old assumption.

In DHCPv4, T1 normally starts renewal with the server that granted the lease; T2 moves to rebinding so another server can be contacted if the first does not respond. Once the lease expires, the client no longer has a right to use that leased address. Do not confuse a DHCPNAK (the server rejects the current address or request) with one missing ACK; the client's state machine and timers determine what happens next.

## Options and client behavior

DHCP options can carry a subnet mask, router, DNS servers, search domain, NTP servers, MTU, or classless static routes. Server and client behavior must be compatible; an option does not mean the host will apply the value if local policy overrides it.

A client identifier is not necessarily a MAC address. DHCPv6 uses a DUID together with an IAID to identify a client and association. A relay can forward metadata to a server, but not every option is sent in every message. A DHCPv6 server can also provide an address through an IA, stateless configuration through INFORMATION-REQUEST/REPLY, or a delegated prefix for a router through IA_PD.

## Protecting DHCP and relays

A rogue DHCP server may assign a wrong gateway or DNS server; DHCP starvation may exhaust a pool. DHCP snooping on a switch can restrict server replies to trusted ports and build a DHCP binding table, but it depends on correct VLAN and port configuration and does not make a MAC address a cryptographic identity. DHCP authentication is standardized but, as noted in older books, has seen limited deployment because distributing shared keys is difficult. Do not assume that DHCP authenticates clients or servers by default.

Lease query lets a relay or access device ask a server about a binding when it needs to resynchronize state; bulk query serves a large number of bindings. This is infrastructure operations traffic, not a normal step in DORA.

## Troubleshooting

If a client does not receive an IP address, check the VLAN and link, relay/helper configuration, pool exhaustion, server logs, UDP firewall rules, and duplicate-address detection. If it has an address but cannot reach the Internet, investigate the router and DNS separately.

## Summary

- A DHCP relay lets a server in another subnet receive broadcast requests.
- T1 renewal, T2 rebinding, and lease expiry govern the lease lifecycle.
- Options can provide routes, DNS, time, and MTU, but client policy also matters.
- `giaddr` and relay metadata help the server identify the subnet and client context.
- DHCP snooping can reduce rogue-server risk when correctly configured, but does not replace end-to-end authentication.
- Pool exhaustion, relay, VLAN, and firewall configuration are common failure sources.
- Having an IP address does not prove that the gateway or DNS is correct.

## Check your understanding

**Does a router automatically forward DHCP broadcasts?** Usually a DHCP relay or helper must be configured.

**Does a client keep an IP address forever after its lease expires?** No, not under the DHCP contract.

**Does receiving DHCP option 3 (router) prove the gateway is reachable?** No. Check the link, route, and neighbor resolution.

## Read next

ICMP helps diagnose the path after a client has an address and route.
