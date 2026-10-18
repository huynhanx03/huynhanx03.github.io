---
title: "DNS records, queries, and security risks"
category: "Network"
tags: ["network", "dns", "dnssec", "security"]
description: "Read A/AAAA/CNAME/MX/TXT records and understand DNS over UDP/TCP, dynamic updates, and cache poisoning."
sources:
  - title: "Domain Names - Implementation and Specification (RFC 1035)"
    url: "https://www.rfc-editor.org/rfc/rfc1035.html"
  - title: "Clarifications to the DNS Specification (RFC 2181)"
    url: "https://www.rfc-editor.org/rfc/rfc2181.html"
  - title: "A DNS RR for Specifying the Location of Services (RFC 2782)"
    url: "https://www.rfc-editor.org/rfc/rfc2782.html"
  - title: "Negative Caching of DNS Queries (RFC 2308)"
    url: "https://www.rfc-editor.org/rfc/rfc2308.html"
  - title: "Extension Mechanisms for DNS (EDNS(0)) (RFC 6891)"
    url: "https://www.rfc-editor.org/rfc/rfc6891.html"
  - title: "DNS Transport over TCP (RFC 7766)"
    url: "https://www.rfc-editor.org/rfc/rfc7766.html"
  - title: "DNS Security Introduction and Requirements (RFC 4033)"
    url: "https://www.rfc-editor.org/rfc/rfc4033.html"
  - title: "DNS64: DNS Extensions for Network Address Translation from IPv6 Clients to IPv4 Servers (RFC 6147)"
    url: "https://www.rfc-editor.org/rfc/rfc6147.html"
  - title: "Dynamic Updates in the Domain Name System (RFC 2136)"
    url: "https://www.rfc-editor.org/rfc/rfc2136.html"
updated: 2026-10-17
translationKey: "network/dns-records-protocol-security"
---

A DNS message has question, answer, authority, and additional sections; the record type determines what data is being requested. Ordinary queries normally start over UDP, but implementations must also support TCP, which is used for zone transfers and some large responses. EDNS(0) (Extension Mechanisms for DNS) adds options and lets the querying client advertise the largest UDP payload it can receive ([RFC 6891](https://www.rfc-editor.org/rfc/rfc6891.html)); this does not guarantee every response will fit.

## Common records

- **A:** IPv4 address.
- **AAAA:** IPv6 address.
- **CNAME:** alias to a canonical name; it cannot be combined arbitrarily with every record at the same owner name.
- **MX:** mail exchanger with a preference value.
- **NS:** a zone's or delegation's nameserver.
- **TXT:** text used for purposes such as SPF or DKIM verification, with semantics and limits defined by the application.
- **PTR:** reverse lookup.

DNS records provide data; the consuming service must interpret and validate it for its purpose. TXT does not inherently mean “secure text.”

## Meaning and limits of additional records

NS identifies nameservers authoritative for a zone or delegated portion. If a nameserver is inside the domain being delegated, a resolver may need a glue address from the parent zone to find it without a dependency loop. Glue is bootstrap data, not the final authoritative answer.

SOA describes zone administration, including the primary server, an administrative email in DNS syntax, serial number, refresh/retry/expire timers, and the MINIMUM field. MINIMUM helps determine the TTL for negative answers so resolvers can cache NXDOMAIN/NODATA ([RFC 2308](https://www.rfc-editor.org/rfc/rfc2308.html)); it is not a refresh timer.

PTR supports reverse lookup under `in-addr.arpa` (IPv4) or `ip6.arpa` (IPv6). Reverse DNS is administered by address ranges and does not prove that a hostname owns an address.

MX records have preferences: lower values are tried first, and multiple servers with equal preference can provide load distribution. An MX target should be an appropriate host name, not an arbitrary CNAME. TXT strings get their meaning from the application: SPF, domain verification, and other uses can coexist, so read the correct application's syntax.

SRV can publish priority, weight, port, and service target ([RFC 2782](https://www.rfc-editor.org/rfc/rfc2782.html)); the owner name identifies the service and transport. NAPTR enables more flexible service selection or name rewriting, but its expressions and DDDS process make configuration more complex. A simpler mechanism is usually easier to operate when an application only needs a host and port.

## DNS is not a general directory database

DNS is optimized to distribute and cache resource records by name; it does not provide rich arbitrary queries for attributes. LDAP queries and modifies a directory tree of entries and attributes. Domain names can map to `dc` components, but LDAP and DNS solve different problems. An organization might keep name-to-IP mappings in DNS and user, department, or access information in LDAP/Active Directory.

## Split DNS, DNS64, and extensibility

Split DNS returns different views based on network or client identity, often letting internal clients see private names/addresses while Internet clients see only public services. This is data-distribution policy, not encryption. Misconfiguration can expose internal names or send a VPN client to the wrong resolver.

DNS64 helps IPv6-only clients reach some IPv4-only services: a resolver synthesizes an AAAA record from an A record using a configured translation prefix, commonly alongside NAT64. The synthetic address does not mean the destination actually has IPv6. DNS64 interacts subtly with DNSSEC because the AAAA data is synthesized; design must account for validator/translator cooperation.

Software that does not understand a new RR type can sometimes forward it as opaque data if it follows protocol rules. A DNS proxy should forward records without changing or interpreting them unnecessarily; if it must truncate a message, it must signal truncation so the client can try TCP. This is an important compatibility principle as DNS evolves.

## Distinguishing DNS risks

DNS attacks often target availability (overloading a resolver or authoritative server) or integrity (injecting a false cached answer or impersonating a nameserver). Responses larger than queries can amplify traffic when source addresses are spoofed and resolvers are open. Restricting recursion to trusted clients, source-address anti-spoofing, rate limiting, and protecting authoritative infrastructure reduce risk. Cache poisoning targets the integrity of resolver data; the defenses are explained in the section below.

Attack examples, TLDs, dynamic-DNS providers, and deployment states in *TCP/IP Illustrated* reflect its 2011 edition, not a current inventory or assessment. The underlying mechanisms remain useful to learn; operational decisions should check current standards and configurations.

## UDP, TCP, truncation, and zone transfer

If a response is too large for the client, it may be truncated and the client can retry over TCP ([RFC 7766](https://www.rfc-editor.org/rfc/rfc7766.html)). DNS over TCP is not only for zone transfers. AXFR/IXFR transfer zone data between controlled nameservers.

Dynamic DNS Update lets a client update records through the protocol if server policy allows it. Open resolvers or broadly permitted zone transfers can be abused; use ACLs, authentication, and rate limits appropriate to the threat model.

## Cache poisoning and DNSSEC

Resolver cache poisoning tries to make a resolver store a false record. Transaction IDs, source-port entropy, bailiwick checking, and DNSSEC are different layers of defense. DNSSEC signatures authenticate integrity and origin of DNS data through a chain of trust; they do not encrypt queries or hide queried names from the resolver.

DNSSEC validation requires correct key rollover, trust anchors, and operations. A domain with incorrectly signed records may cause a validating resolver to return SERVFAIL; diagnosis should distinguish the authoritative answer from validation failure.

## LLMNR/mDNS and split DNS

mDNS resolves names locally on a link; LLMNR is a local name-resolution mechanism in some environments. Neither replaces the global DNS hierarchy. Split DNS can return different answers inside a VPN or corporate network; resolver policy decides where each zone is sent.

## Summary

- Record types define data: A/AAAA are addresses, CNAME is an alias, and MX is for mail routing.
- DNS uses UDP and TCP; large or truncated responses can retry over TCP.
- Zone transfer and dynamic updates need suitable ACLs and authentication.
- DNSSEC validates DNS data through a chain of trust but does not encrypt queries.
- mDNS/LLMNR and split DNS have scopes distinct from public DNS.

## Check your understanding

**Does DNSSEC hide a domain from an ISP?** No. It authenticates data; it does not encrypt it.

**Does DNS only use UDP?** No.

**Does SERVFAIL always mean the authoritative server does not exist?** No. Validation or resolver failure can also cause it.

## Read next

Firewalls and NAT handle state and translation separately from DNS; see connection tracking.
