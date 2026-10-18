---
title: "Conntrack, NAT State, and Firewall Timeouts"
category: "Network"
tags: ["network", "firewall", "nat", "conntrack"]
description: "Trace connection tracking in stateful firewalls, how NAT uses flow state, and how timeouts can disrupt connections."
updated: 2026-10-16
translationKey: "network/conntrack-nat-state-timeouts"
---

A stateless firewall evaluates each packet from its current headers; a stateful firewall stores flow state to recognize packets from a connection it has already seen. Linux netfilter uses connection tracking (conntrack) for many stateful features and NAT. This state lives in a kernel table with size limits and timeouts.

## State and packet direction

Conntrack classifies flows by address, port, and protocol tuples, along with zones and metadata. `NEW`, `ESTABLISHED`, and `RELATED` are common rule states; they describe a packet's relationship to the state table, not absolute proof of a complete TCP handshake.

NAT commonly associates mappings with conntrack so packets in both directions are translated consistently. A reply packet can therefore be translated back using the mapping that was created earlier. If the state expires or the table fills, packets may be dropped even when a rule appears to allow them.

## Timeouts and troubleshooting

UDP can also have conntrack state, but has no FIN to close a connection like TCP; an idle timeout removes its entry. A flow that sends no packets for a long time may lose its mapping. Raising timeouts indiscriminately grows the table and can increase resource risk.

Use `conntrack -L` or `conntrack -E` (if installed) to inspect entries and events; `nft list ruleset` to inspect policy; and kernel logs and counters to check drops. For NAT failures, compare tuples before and after translation and capture traffic on both interfaces.

## Check your understanding

**Does `ESTABLISHED` always prove that TCP completed its handshake correctly?** No; it is a firewall state based on observed packets.

**Is NAT stateless in every common implementation?** No; mappings commonly depend on conntrack state.

**Does UDP have no state because it is connectionless?** UDP applications have no connection handshake, but a firewall can still track flow state.

## Further reading

nftables rules combine hooks, chains, priority, and conntrack state to apply policy in each direction.
