---
title: "DHCP and network address autoconfiguration"
category: "Network"
tags: ["network", "dhcp", "ipv4", "ipv6"]
description: "Follow a DHCP lease from discovery to renewal, and distinguish DHCP from SLAAC and static configuration."
updated: 2026-10-16
translationKey: "network/dhcp-address-autoconfiguration"
---

A new host joining a network needs an address, prefix, gateway, and usually DNS. DHCP distributes configuration automatically through a lease; SLAAC lets an IPv6 host create an address from a Router Advertisement. Static configuration is another option, but it requires consistent administration.

## DHCPv4 DORA

The usual process is summarized as DORA:

1. **Discover:** the client broadcasts to find a DHCP server.
2. **Offer:** a server proposes an address and options.
3. **Request:** the client requests one offer.
4. **Acknowledgment:** the server confirms the lease.

DHCPv4 uses UDP: client port 68 and server port 67. A client without an address initially sends DISCOVER/REQUEST with source `0.0.0.0` and limited broadcast; a transaction ID matches a reply to its request. After receiving one or more OFFERs, the client broadcasts REQUEST with the Server Identifier and Requested IP so other servers know which offer it selected. The selected server commits the binding and returns ACK; if the address is no longer valid, it may return NAK. The client may use the lease only after ACK; it commonly checks for an address conflict and sends DECLINE if one is found.

DHCP extends the older BOOTP layout with options. Common options carry a subnet mask, router, DNS, domain or search list, lease, and list of options the client wants. A server may use a client identifier; the MAC in `chaddr` is traditional but is not always a stable identity or authentication. A server may allocate dynamically from a pool, reserve an address for a configured client, or allocate automatically according to policy; terminology and policy vary by product.

Once the client has an address, it can renew without repeating all of DORA. DHCPINFORM requests additional configuration when an address was assigned outside DHCP. DHCPRELEASE returns an address early; DHCPDECLINE reports a conflict.

## Leases and conflicts

A lease has an expiration time; the client tries to renew to keep the address. At T1 it asks the server that granted the lease; if communication fails by T2, it enters rebinding and may ask another server. If the lease expires without renewal, it must stop using the address. T1/T2 defaults in books are common DHCPv4 values for that era, not mandatory numbers for every server or client.

A DHCP reservation maps a client identity to an address through server configuration, but is not strong authentication. If a DHCP ACK offers an address already in use, the client may send DHCPDECLINE and try again according to policy.

## Without a DHCP server

IPv4 link-local autoconfiguration can choose an address from `169.254.0.0/16` and use ARP-based conflict detection before adopting it. It works only on the local link; having such an address does not create a default route, DNS, or Internet access. IPv6 has link-local addressing and SLAAC/RA with its own process.

A malicious DHCP server can provide an incorrect gateway or DNS server. Network access control, segmentation, and switch protections reduce risk; TLS authentication of services remains important.

## IPv6: SLAAC, stateless, and stateful DHCPv6

An RA advertises a prefix and router; SLAAC creates an address and performs duplicate-address detection. Stateless DHCPv6 can provide additional information; stateful DHCPv6 manages address allocation through leases. RA flags and client policy affect the choice. Not every IPv6 network has a DHCPv6 server.

In DHCPv6, client and server identity commonly use a DUID; an IAID distinguishes the association or interface requesting configuration. Stateful DHCPv6 can allocate one or more addresses or prefixes. **Prefix Delegation** commonly gives a customer router a prefix to subdivide for downstream networks. DHCPv6 does not replace Router Advertisements for announcing the default router. RA M/O flags are configuration signals, while the final behavior also depends on client policy.

## Coordinating DHCP and DNS updates

DHCP can send DNS server and search-domain information to clients. On an internal network, DHCP and DNS servers may coordinate to update name-to-address records as leases are issued or changed. This may use an integrated service or dynamic DNS; policy is needed to prevent clients from registering arbitrary names or leaving stale records when leases change. See [DNS updates and zone management](/en/notes/network/dns-message-zones-and-updates/) for update details.

## Troubleshooting

Check interface link state, address and prefix, route, DNS, and lease. On Linux, `ip addr`, `ip route`, `resolvectl`, and related tools show different layers. A valid address with no default route is different from a DNS failure.

## Summary

- DHCP distributes leased configuration; DORA is the common DHCPv4 process.
- The Server Identifier tells servers which offer the client chose; transaction IDs match replies to requests.
- A relay lets DHCP servers serve multiple subnets.
- IPv4 link-local helps only on the local link; it does not provide a gateway or DNS.
- Reservations do not replace authentication or network security.
- SLAAC and DHCPv6 work according to RA and policy; DHCPv6 is not always required.
- Debug link state, address, route, and DNS separately.

## Check your understanding

**Does a DHCP server assigning an IP prove that DNS is correct?** No. Check the options and resolver.

**Is a DHCP lease permanent?** No. It expires and must be renewed.

**Does IPv6 require DHCPv6 for a default gateway?** Usually the gateway is announced through Router Advertisement, not DHCPv6.

## Read next

When a network fails or MTUs do not match, ICMP carries error and diagnostic information to hosts.
