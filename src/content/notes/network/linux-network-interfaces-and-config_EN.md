---
title: "Network Interfaces and Configuration on Linux"
category: "Network"
tags: ["linux", "network", "interface", "networkmanager"]
description: "Explore links, addresses, and routes; distinguish temporary from persistent configuration; and understand NetworkManager and systemd-networkd."
updated: 2026-10-16
translationKey: "network/linux-network-interfaces-and-config"
---

The kernel represents network cards and logical interfaces; a userspace manager configures addresses, routes, DNS, and link state. The `ip` command reads or changes the kernel's current state, while NetworkManager or systemd-networkd may restore persistent configuration at boot or when a link changes.

## Link, address, route

```sh
ip link
ip addr
ip route
ip -6 route
```

`ip link` shows device and link state; `ip addr` displays addresses and prefixes; `ip route` displays the routing table. A link being up does not guarantee that DHCP, a gateway, DNS, or a remote service is working.

Commands such as `ip addr add` and `ip route add` usually change runtime state; persistent configuration lives in NetworkManager profiles, systemd-networkd files, or another distribution framework. A runtime change may not survive a reboot.

## NetworkManager and systemd-networkd

NetworkManager suits desktops and servers that need dynamic interface, Wi-Fi, VPN, and profile management. systemd-networkd manages declarative link configuration on many servers. A machine may have multiple managers installed, but avoid having them manage the same interface in conflicting ways.

DNS may be managed by `systemd-resolved`, NetworkManager, or a resolver file. `/etc/resolv.conf` may be a symlink; manual edits may be overwritten by a manager. Use the appropriate tool to inspect per-link or VPN DNS.

## Diagnose layer by layer

1. Is the link or carrier up?
2. Does the interface have the correct address and prefix?
3. Is the right route or default gateway selected?
4. Does neighbor resolution work?
5. Can IP traffic reach the destination?
6. Does DNS resolve correctly?
7. Does the port, service, or application respond?

Ping may be blocked; try route lookup, neighbor state, a resolver query, and a TCP connection according to policy. Do not flush a remote interface without a console or rollback path.

## Summary

- The kernel holds interface, address, and route state; a manager stores persistent configuration.
- A link being up does not prove end-to-end connectivity.
- Runtime changes made with `ip` may disappear after reboot.
- DNS is often managed by a service; manual `resolv.conf` edits may be overwritten.
- Investigate from the link up through the application, one layer at a time.

## Check your understanding

**Does `ip link` reporting UP mean the server can reach the Internet?** No.

**Is a route added with `ip` always persistent?** No.

**Is `/etc/resolv.conf` always a regular file managed by the user?** No; a resolver manager may generate it.

## Further reading

Network applications depend on socket and service lifecycles; see how a daemon listens and is managed by systemd.
