---
title: "Container Networking: Namespaces, Bridges, and Port Mapping"
category: "Network"
tags: ["network", "containers", "bridge", "nat"]
description: "Trace packets from a container network namespace through veth and bridges to the host, NAT, and external networks."
updated: 2026-10-16
translationKey: "network/container-networking"
---

A container can have its own network namespace with separate interfaces, routes, and firewall view. A runtime commonly connects a container to the host using a veth pair, bridge, or overlay, then configures routes or NAT for external access. Details depend on the runtime and CNI/plugin.

## Veth and bridges

A veth pair works like the two ends of a virtual cable: one end is in the container namespace and the other is on the host. A bridge connects multiple Layer 2 endpoints; the host or a router handles routing between subnets and external networks. A container commonly receives a private internal IP.

A default Docker-style bridge may use a host bridge such as `docker0`, connect container interfaces through veth pairs, and use NAT for external access. Two namespaces may both name an interface `eth0` and still have different devices. If a container subnet overlaps an existing VPN or LAN subnet, routing becomes ambiguous; choose a non-conflicting range.

## NAT and port publishing

Outbound traffic may be masqueraded through the host address. Port publishing maps a host IP/port to a container IP/port through a NAT or proxy rule. Binding to `127.0.0.1` on the host differs from binding to a wildcard address; consider firewall and IPv6 policy separately.

Container IPs may change on recreation; service discovery should use service names, a service network, or a control plane instead of hard-coding an IP indefinitely.

Rootless networking does not necessarily have the same datapath as a rootful bridge. A runtime may forward traffic through a userspace helper, with limits on ports, inbound connectivity, or inter-container communication depending on the tool and configuration. When debugging, identify the runtime and mode before assuming there is a `docker0`, an iptables/nftables rule, or a host veth.

## Overlays and multiple hosts

An overlay encapsulates packets between hosts to create one logical network. Encapsulation reduces usable MTU; an MTU mismatch may break large packets. A CNI plugin configures interfaces, routes, and policy; multi-host networking also needs routing, encryption or identity, and observability.

## Summary

- A network namespace separates the container's view of interfaces and routes.
- Veth connects a container to a host bridge or another datapath.
- NAT and port publishing map flows; the firewall still controls access.
- Container IPs can change; use service discovery.
- Overlays add headers and affect MTU.

## Check your understanding

**Does a private container IP mean it cannot be reached from outside?** Port mapping or routing can expose it.

**Does publishing a port mean the application is healthy?** No; health checks are needed.

**Does an overlay MTU always equal the physical interface MTU?** No; encapsulation headers reduce usable payload.

## Further reading

Container connectivity uses the same TCP/IP foundations: DNS and service discovery, routes, NAT, firewalls, and MTU.
