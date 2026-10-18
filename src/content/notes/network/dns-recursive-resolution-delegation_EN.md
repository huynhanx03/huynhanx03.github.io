---
title: "DNS Recursive Resolvers and Delegation"
category: "Network"
tags: ["network", "dns", "resolver"]
description: "Follow a DNS question from a stub resolver through a recursive cache to root, TLD, and authoritative servers."
updated: 2026-10-16
translationKey: "network/dns-recursive-resolution-delegation"
---

When an application needs an address for a domain name, it usually asks the operating system's stub resolver. The stub sends a query to a configured recursive resolver, which may answer from cache or follow the DNS hierarchy to find an authoritative answer.

## Delegation through the name tree

If it does not know `www.example.com`, a resolver may ask a root server where to find the TLD server, then ask the TLD server for the authoritative nameserver of the `example.com` zone. The authoritative server returns a record or another delegation. Root servers do not know every host; they know how to direct resolvers to child zones.

## Recursive and iterative queries

The client usually asks the recursive resolver to do the work on its behalf (recursion desired). The resolver then sends iterative queries; each server returns data it manages or a referral to the appropriate server. The AA flag indicates an authoritative answer in the context of a response; referrals and glue records help the resolver contact the next nameserver.

## Cache, TTL, and negative answers

Resolvers cache records according to their TTL, reducing latency and load. Changing authoritative DNS does not clear caches immediately; a resolver may keep the old answer until the TTL expires. Negative caching retains “does not exist” results for a specified time. After editing a record, check the specific resolver and its remaining TTL.

`dig name A`, `dig @server name A`, and `dig +trace name` help inspect the selected resolver or follow delegation. `+trace` does not fully emulate every policy of a corporate resolver.

## Check your understanding

**Does root DNS return the IP for every website?** No; root returns delegation information.

**Does changing an authoritative record make every resolver see it immediately?** No; caches may still be valid.

**Are a recursive resolver and an authoritative server always the same machine?** No.

## Further reading

DNS records and zone files describe the data; DNSSEC helps authenticate it along the delegation chain.
