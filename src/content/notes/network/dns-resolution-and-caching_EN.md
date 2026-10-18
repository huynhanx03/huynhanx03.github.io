---
title: "DNS: Name Resolution Through Resolvers and the Hierarchy"
category: "Network"
tags: ["network", "dns", "name resolution"]
description: "Follow a query from the stub resolver to recursive and authoritative servers, then understand cache TTLs."
updated: 2026-10-16
translationKey: "network/dns-resolution-and-caching"
---

DNS maps names such as `www.example.com` to records, commonly IP addresses. It is a distributed hierarchy, not a central server containing the entire Internet.

## Resolver roles

An application calls the host's stub resolver, commonly through a libc or system-resolver API. The stub asks a recursive resolver configured by the network, VPN, or OS. The resolver has a cache; if it does not have an answer, it follows the hierarchy through root, TLD, and then authoritative servers for the relevant zone.

The recursive resolver returns a result to the client; an authoritative server answers for its zone. These roles may share infrastructure but have different semantics.

## Delegation and zones

Root servers know where to ask for TLDs; TLD servers know the authoritative nameservers for a domain; authoritative servers hold records for a zone. NS delegation connects the levels. Glue records help find the IP address of a nameserver inside the domain being delegated, avoiding a circular dependency.

A zone does not necessarily match a whole domain; a subdomain may be delegated separately. The DNS hierarchy enables distributed administration and caching.

## Cache and TTL

A record's TTL specifies how long a cache may keep it before asking again. Caching reduces latency and server load, but a record change may not be visible to every resolver until its cache expires. A TTL is not a guarantee that a server will retain a record forever.

Negative caching stores “does not exist” answers according to rules involving SOA and TTL. As a result, a newly created record may still return NXDOMAIN because of a negative cache.

## DNS is not the same as connectivity

DNS returns an address; TCP or UDP, routing, firewalls, and TLS must still work. A successful `dig` does not prove that the application port is open. DNS load balancing can return several addresses, and clients choose among them according to their own policy.

## Summary

- DNS is a hierarchy of root, TLD, and authoritative servers, with a recursive resolver in the client path.
- The stub asks a recursive resolver; an authoritative server manages a zone.
- Delegation distributes domain administration.
- TTL controls caching and contributes to propagation delay.
- Successful DNS only resolves a name; it does not confirm application health.

## Check your understanding

**Is a recursive resolver always authoritative for a domain?** No.

**Does changing an A record make every client see it immediately?** No; caches and negative caching may retain an answer.

**Does DNS returning an IP mean a TCP connection will succeed?** No; those are separate steps.

## Further reading

DNS records and zones describe the data; DNSSEC helps authenticate data in the delegation chain.
