---
title: "IP multicast and IGMP/MLD membership management"
category: "Network"
tags: ["network", "multicast", "igmp", "mld"]
description: "Track multicast membership and source filters on a LAN with IGMP/MLD, and understand queriers, snooping, and timeouts."
updated: 2026-10-16
translationKey: "network/multicast-membership-igmp-mld"
---

A multicast address identifies a **destination group**; it does not contain a list of receiving machines. An application registers interest in a group on an interface. The host updates membership and source filters, while routers and switches use that information to decide which branches need traffic. Membership mechanisms do not route multicast across networks by themselves.

## What do IGMP and MLD do?

IPv4 uses **IGMP**. IPv6 uses **MLD**, carried in ICMPv6. Both let hosts report membership on a link so a multicast router need not send every group out of every interface. A router keeps soft state: it queries periodically, refreshes state when it receives reports, and deletes state when it expires.

IGMPv1/2 and MLDv1 mainly express interest in a group. IGMPv3/MLDv2 add source filtering, needed for **Source-Specific Multicast (SSM)** and also able to express ASM modes. Newer versions include compatibility mechanisms when older nodes or routers are detected; a packet capture may therefore show multiple versions in use.

## How does a host report membership?

When an application joins or leaves a group or changes its source set, the host may send an unsolicited report. Routers also send periodic queries. A host need not reply immediately: it chooses a random delay within the query's response interval, allowing multiple changes to be combined in one report and reducing bursts. In older versions, report suppression lets a host hear another host's report for the same group and suppress its own; newer versions do not rely on suppression in the same way.

IGMPv3/MLDv2 reports can contain multiple **group records**. Each record describes current state, changes filter mode, or adds/removes sources:

- **INCLUDE(S):** receive only from sources in set S. An empty set means no interest in the group in this mode.
- **EXCLUDE(S):** receive from sources outside S. EXCLUDE with an empty set commonly means joining the group from any source.
- **ALLOW_NEW_SOURCES / BLOCK_OLD_SOURCES:** update the source list without necessarily changing mode.
- **CHANGE_TO_INCLUDE / CHANGE_TO_EXCLUDE:** switch between the two modes.

The semantics are include or exclude per group; SSM commonly means interest in a particular source. Do not confuse application membership with network-wide multicast routing state.

## Router queries, querier, and timers

There are three query types: **general query** asks about all groups; **group-specific query** checks one group; **group-and-source-specific query** checks a particular source set. A specific query is commonly sent after a reported change and before the router stops forwarding traffic, to confirm that no listener still needs the flow.

Multiple multicast routers may share a link, but one **querier** is responsible for periodic queries. Routers monitor queries and elect a querier; in the basic mechanism described by the book, the lowest IP address wins. A backup router takes over after it stops hearing queries for the appropriate interval. Election and timer details vary by version and implementation.

Timers control responsiveness and control traffic: query interval, response interval, membership interval, last-member query interval/count, startup query, and robustness variable. Increasing robustness better tolerates packet loss but creates more reports and queries; reducing the last-member time speeds up leaving but risks removing state incorrectly if a report is lost. Values in a 2012 book are protocol defaults from that period, not mandatory settings for every network.

## IGMP/MLD snooping on a switch

A Layer 2 switch can inspect IGMP/MLD queries and reports to remember which ports have receivers for a group/source. Correct snooping can limit multicast to relevant ports. Without snooping or a querier, some switches flood multicast in the VLAN or lose state when it times out. MLD snooping must distinguish MLD in ICMPv6 from other ICMPv6 messages; do not block Neighbor Discovery or PMTUD just because the switch handles MLD.

Snooping does not replace a multicast router. Router membership determines which groups to forward across Layer 3 interfaces; switch snooping optimizes Layer 2 branches within a VLAN. Many devices need a querier to refresh snooping state reliably. When multicast is lost, inspect host joins, queries and reports, querier, snooping table, and multicast routing together.

## Robustness and security

IGMP/MLD rely on state and timers. Lost queries or reports can cause either unwanted traffic to continue or a valid receiver to stop receiving it. State-change reports and specific queries may be retransmitted; the robustness parameter adjusts the trade-off between resilience and control traffic.

A malicious device on the link may join many groups to consume bandwidth or CPU, send queries that trigger too many reports, or impersonate a querier if implementation allows it. Control membership and group/source/rate limits according to device capability, and protect the access layer. This is a link control protocol; access scope and implementation vulnerabilities matter more than simply blocking all multicast.

## Summary

- IGMP manages IPv4 membership; MLD manages IPv6 membership through ICMPv6.
- Membership is per interface and maintained as soft state.
- IGMPv3/MLDv2 add source filters; include/exclude modes describe desired traffic.
- A querier sends periodic queries; routers confirm leaves with specific queries and use timers/retransmission.
- Switch snooping optimizes Layer 2 ports; multicast routers still handle Layer 3 forwarding.
- When multicast fails, check queries, reports, querier, snooping, and routing together.

## Check your understanding

**Does joining a group mean an Internet router knows about my host?** No. A report updates membership on the link; network-wide multicast routing is separate.

**Is MLD a separate protocol equivalent to IGMP?** It serves a similar purpose, but MLD messages are ICMPv6.

**Does not seeing multicast on a switch port prove that the application never joined?** Not by itself. Check the host join, VLAN and querier, snooping, and route state.

## Read next

To distinguish a group IP address from the actual MAC address used on a LAN, see [Broadcast, multicast, and IGMP/MLD](/en/notes/network/ip-multicast-broadcast/).
