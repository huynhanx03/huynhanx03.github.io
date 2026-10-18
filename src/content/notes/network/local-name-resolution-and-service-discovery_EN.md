---
title: "Local name resolution and service discovery"
category: "Network"
tags: ["network", "dns", "mdns", "llmnr", "service discovery"]
description: "Distinguish hierarchical DNS from LLMNR, mDNS, and service-advertisement mechanisms on a local network."
updated: 2026-10-16
translationKey: "network/local-name-resolution-and-service-discovery"
---

Public DNS works well for names managed through zones and delegation. On a small network, users may need to find a printer or device without a separately configured DNS server. LLMNR and multicast DNS (mDNS) are local mechanisms with behavior similar to DNS, but their scope and trust model differ from hierarchical DNS.

## LLMNR and mDNS

LLMNR sends name queries using multicast within a local network. mDNS also uses DNS messages over multicast; names ending in `.local` are handled by convention as link-local names. Devices can advertise their own names and detect conflicts without a central authoritative server. These mechanisms are convenient for home or lab networks, but a reply comes from the local link and does not carry the Internet-wide DNS chain of trust.

DNS Service Discovery (DNS-SD) describes how to browse DNS records to find a service instance and connection details such as host, port, protocol, and TXT metadata. DNS-SD can use mDNS on a local network or ordinary DNS when suitable infrastructure is available. Thus, “find a host name” and “find a service running on that host” are separate steps.

## Choosing the name source

An application may obtain results from unicast DNS, mDNS, LLMNR, a hosts file, or an operating-system mechanism. Lookup order depends on the OS and configuration. If two sources answer the same name, differences in lookup order and trust can produce surprising results. Enterprise networks often disable or restrict multicast mechanisms when they are not needed.

An attacker on the same link may forge a local-name response and trick a client into connecting to the wrong machine or sending credentials to a fake service. Do not treat a `.local` name or an LLMNR response as verified identity. Use HTTPS/certificates or application-layer authentication for sensitive services; restrict multicast and disable unused mechanisms according to network policy.

## How this differs from LDAP

DNS distributes known resource records by name. LDAP supports searching entries and attributes with filters in a directory tree. DNS-SD can help locate a service endpoint, while LDAP may store a directory of users or organizational information. They can work together but do not replace each other.

## Check your understanding

**Does finding `printer.local` prove that the correct printer has been authenticated?** No. It only means a device on the link answered through a local-name mechanism.

**Does DNS-SD only find an IP address?** No. It can identify a service type, instance, host, port, and metadata for the client to use when connecting.

**Is mDNS part of root/TLD delegation?** No. It operates on a local link.

## Version note

*TCP/IP Illustrated, Volume 1* describes LLMNR and mDNS in the context of its 2011 edition, including implementation details and standards status that may be dated. This note retains the model and security boundaries; verify port numbers, multicast addresses, and support status against the OS and standards currently deployed.
