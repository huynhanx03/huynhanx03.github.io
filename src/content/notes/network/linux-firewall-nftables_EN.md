---
title: "Linux Firewall: nftables, Chains, and Connection State"
category: "Network"
tags: ["linux", "network", "firewall", "nftables"]
description: "Understand nftables tables, chains, hooks, default policy, and stateful rules—and avoid locking yourself out of SSH."
updated: 2026-10-16
translationKey: "network/linux-firewall-nftables"
---

nftables is the modern Linux firewall framework; the `nft` command configures rules that the kernel executes at network hooks. A distribution may use a frontend such as firewalld or UFW to generate rules. Before making changes, identify which component manages policy so you do not create conflicting sources of configuration.

## Tables, chains, and hooks

Tables group chains. A base chain attaches to a hook such as input, output, or forward; a regular chain has no hook of its own and is called through jump/goto. Several base chains can share a hook and run by priority. Accept in one chain does not guarantee acceptance by later chains; drop ends packet processing ([nftables manual](https://netfilter.org/projects/nftables/manpage.html)). Rules match interfaces, addresses, protocols, ports, connection-tracking state, and then return a verdict such as accept, drop, reject, or jump. Rule order may matter.

`input` handles traffic destined for the host, `output` handles traffic created by the host, and `forward` handles traffic passing through a router or container host. DNAT and SNAT use NAT hooks, which differ from filter chains.

## Stateful policy

Rules commonly allow traffic in established or related states so responses to outbound connections can return. New inbound connections need their own rules. The conntrack table has timeouts and capacity; many UDP flows or scans can put pressure on it.

## Safe remote changes

Save the current configuration, add rules for SSH or management before applying a default drop, and use a timed rollback or out-of-band console. Test both IPv4 and IPv6; a rule that covers only one address family may leave the other open.

## Summary

- nftables uses tables, chains, hooks, and verdicts in the kernel.
- Input, output, and forward handle traffic to the host, from the host, and through the host.
- NAT and filtering are different functions.
- Conntrack state allows responses for established flows but does not replace inbound policy.
- Remote firewall updates need rollback and IPv4/IPv6 checks.

## Check your understanding

**Does an established-state accept rule open a new port to the Internet?** No; state depends on an already established flow.

**Does a NAT chain replace a filter chain?** No.

**Can a firewall change over SSH lock you out?** Yes; always prepare a rollback path.

## Further reading

NFS and SMB also need appropriate firewall ports and authentication policy.
