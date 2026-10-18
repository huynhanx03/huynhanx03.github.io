---
title: "Name Resolution on Linux: NSS, resolv.conf, and systemd-resolved"
category: "Network"
tags: ["linux", "dns", "resolver", "nss"]
description: "Follow getaddrinfo from an application through NSS to a DNS stub or cache, and understand why dig and applications can differ."
updated: 2026-10-16
translationKey: "network/linux-name-resolution"
---

On Linux, applications usually call `getaddrinfo()` rather than sending DNS packets themselves. The Name Service Switch (NSS) defines lookup sources and their order, which may include `/etc/hosts`, DNS, mDNS, or other modules. Therefore, a direct DNS query with `dig` may return something different from an application using NSS.

## `/etc/resolv.conf`

This file usually declares nameservers and search domains. On machines using NetworkManager or systemd-resolved, it may be a symlink to a stub resolver or an automatically generated file. Editing it directly may be overwritten or bypass per-link or VPN DNS policy.

## systemd-resolved

`systemd-resolved` may provide a local stub, caching, and DNS routing by interface or domain. Split DNS can send corporate domains to a VPN resolver and public domains to another resolver. `resolvectl status` shows link-specific DNS servers and search domains.

## Troubleshooting

Compare `getent hosts name`, `dig name`, `/etc/hosts`, the NSS configuration, and resolver status. Check IPv4/IPv6 A and AAAA records, search suffixes, cache TTLs, VPN link selection, and UDP/TCP port 53 in the firewall.

## Summary

- Applications usually use NSS and `getaddrinfo()`, not a direct DNS query.
- `dig` and NSS lookups exercise different paths.
- A resolver service may manage or symlink `resolv.conf`.
- Split DNS applies policy by interface or domain.
- Troubleshooting should separate hosts files, NSS, the local resolver, DNS servers, and connectivity.

## Check your understanding

**Does a successful `dig` mean `curl hostname` will resolve the same way?** No; NSS, address-family selection, and proxies can differ.

**Is a direct edit to `resolv.conf` always persistent?** No, if a manager regenerates it.

**Is a search domain just another DNS server?** No; it changes how short names are tried.

## Further reading

The Linux firewall processes packets through hooks and connection state; configuring routes or DNS does not automatically open a port.
