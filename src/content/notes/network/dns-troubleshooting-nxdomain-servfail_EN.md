---
title: "DNS Troubleshooting: NXDOMAIN, SERVFAIL, and Caches"
category: "Network"
tags: ["network", "dns", "troubleshooting"]
description: "Distinguish nonexistent names, resolver failures, and timeouts; trace caches, delegation, DNSSEC, and search domains."
updated: 2026-10-16
translationKey: "network/dns-troubleshooting-nxdomain-servfail"
---

The message “DNS error” can hide several different cases. NXDOMAIN means the queried name does not exist according to the received answer; SERVFAIL means the resolver could not complete the query; a timeout usually means no response arrived in time. First identify which question was sent to which resolver.

## Separate the layers

`getent hosts name` goes through the operating system's NSS and more closely reflects application behavior than `dig`. `dig name A @resolver` directly tests a DNS server; `dig +trace name` follows delegation. If `dig` succeeds but an application fails, check search domains, `/etc/hosts`, NSS order, proxies, or an application-specific cache.

NXDOMAIN may result from a typo, a nonexistent name, or stale negative caching. If the name exists but lacks the requested record type, the result is commonly `NOERROR` with an empty Answer (NODATA), rather than NXDOMAIN ([RFC 2308](https://www.rfc-editor.org/rfc/rfc2308.html#section-2.2)). SERVFAIL may result from an unreachable authoritative server, broken delegation, failed DNSSEC validation, or an overloaded resolver. A timeout may be caused by blocked UDP/TCP port 53, a wrong route, or a nonresponsive server.

## UDP/TCP and DNSSEC

DNS commonly starts with UDP; large or truncated (TC) responses and some operations use TCP. Blocking TCP/53 can break large queries even when small ones work. A DNSSEC validation failure commonly appears as SERVFAIL at a validating resolver; compare with a trusted resolver and inspect the chain and signatures.

## Procedure

Record the FQDN, record type, resolver, timestamp, source network, and response code. Compare authoritative and recursive resolvers; check TTL and cache; try UDP and TCP; and test both IPv4 and IPv6. Do not flush every cache before recording the state, since that removes useful evidence.

## Check your understanding

**Does NXDOMAIN mean no packet was received?** No.

**Does DNS use only UDP?** No.

**Does successful `dig` prove an application will resolve the same way?** No; it may use NSS, a cache, or different policy.

## Further reading

Recursive resolution and TTL explain why new records do not appear everywhere immediately.
