---
title: "ICMP errors and rate limiting"
category: "Network"
tags: ["network", "icmp", "firewall", "diagnostics"]
description: "Read ICMP errors by type/code, understand quoted packets and rate limiting, and learn about Redirect and PMTUD."
updated: 2026-10-16
translationKey: "network/icmp-errors-and-rate-limits"
---

ICMP is carried inside IP: IPv4 uses Protocol 1; IPv6 uses Next Header 58 (possibly after extension headers). A message begins with Type, Code, and checksum; Type selects a message family and Code clarifies the cause. ICMPv6 checksum also includes an IPv6 pseudo-header to bind the message to source/destination addresses.

ICMP Echo is only the easiest message group to recognize. ICMP also reports forwarding errors and carries control signals hosts need for IP operation. It does not make IP reliable: a packet dropped because a queue is congested commonly does not generate ICMP; transport and applications still handle loss.

## Common ICMP errors

- **Destination Unreachable:** no route, unreachable host/address/port, or policy prohibition; type/code distinguish some causes.
- **Time Exceeded:** TTL/Hop Limit expired along the path, or a fragment-reassembly timer expired.
- **Fragmentation Needed / Packet Too Big (PTB):** a packet does not fit the next-hop MTU and cannot be forwarded under the rules for that IP version.
- **Parameter Problem:** a router/host found a header field, Next Header, or option it could not process; a pointer may identify the byte.
- **Redirect:** a router tells a host there is a better next hop or that the destination is actually on-link. The host may update route information; this is a sensitive control message and must be validated in the context of interface and policy.

An ICMP error commonly quotes the offending IP header and the initial payload bytes. This lets the OS find the related protocol, port, and socket; it also helps NAT/router devices handle the error for the correct flow. Some ICMP extensions can attach additional information such as an interface/next hop or MPLS data. Type/code details differ between ICMPv4 and ICMPv6; do not assume an IPv4 code has the same meaning in IPv6.

Common errors to distinguish:

- IPv4 Destination Unreachable type 3/code 3 and IPv6 type 1/code 4 report a port with no listener (common with UDP). A UDP application may not receive the error if its socket/API has not enabled asynchronous network errors; a packet capture can still show ICMP arriving at the host.
- IPv4 type 3/code 4 reports “fragmentation needed” when DF is set; IPv6 uses its own Packet Too Big type 2. IPv6 routers do not fragment transit packets, so the sender adjusts size or fragments at the source when appropriate.
- Time Exceeded code 0 supports traceroute; code 1 reports reassembly timeout.
- ICMPv6 Parameter Problem distinguishes erroneous header (code 0), unrecognized Next Header (code 1), and unrecognized option (code 2). IPv4 codes have a different history, and some values are obsolete.

## Rate limiting and filtering

Do not send an ICMP error in response to another ICMP error; also avoid responding to broadcast/multicast packets and non-initial fragments in cases specified by the standard. These constraints limit nested errors and broadcast storms. ICMPv6 has some exceptions, so do not transfer IPv4 rules blindly to IPv6.

Routers and kernels may rate-limit ICMP to prevent floods. Seeing a few replies and then silence does not prove that the data plane also drops traffic; control-plane responses have separate policy. Limits vary by device and OS; do not treat a number from a trace or book example as universal. For UDP, an application may continue retrying even after ICMP Port Unreachable reached the kernel, depending on socket API and implementation.

A firewall should distinguish ICMP version, type/code, direction, and device role. Allowing messages needed for PMTUD and IPv6 operation while limiting Echo according to need is usually better than blocking all ICMP. Blocking PTB/Fragmentation Needed can create a PMTU black hole: a handshake or small packet works, but large data stalls.

## Risks and translation between versions

ICMP can be abused to amplify traffic, probe information, mislead route/PMTU, or send forged errors that make some old stacks mishandle a flow. Historical examples such as smurf, ping of death, teardrop, and land illustrate attack classes; do not assume modern systems remain vulnerable to the same old flaws. The lasting lesson is to validate ICMP source and context, limit responses, not trust Redirect/PMTU solely because a packet has the right type, and keep operating systems and network devices updated.

When a translator converts IPv4↔IPv6, it must translate the IP header and ICMP type/code/checksum. For an ICMP error, the quoted original packet also needs translation so the host on the other side can match the error to the right flow. Some messages have no equivalent mapping and may be dropped; MTU and checksum differences between versions also affect the result. Therefore, an error over NAT64 or another translator may not look like one on a native path.

## Summary

- ICMP errors report IP conditions and differ from Echo ping.
- Type/code identify a cause; quoted packet data links the error to the original flow.
- Time Exceeded supports traceroute; Fragmentation Needed/PTB supports PMTUD.
- ICMP responses may be rate-limited or filtered separately.
- ICMPv4 and ICMPv6 have different types, codes, and some processing rules.
- Firewall policy should use type/code rather than blindly blocking all ICMP.

## Check your understanding

**Does a ping timeout mean the route is broken?** Not necessarily; Echo may be filtered.

**Is it safe to block Packet Too Big if TCP works?** It can create a PMTU black hole for large payloads.

**Does a router generate an ICMP error for every dropped packet?** No.

**If a capture shows ICMP Port Unreachable, did the UDP application definitely receive the error?** No. The kernel may receive it without reporting it asynchronously to the application.

**Is allowing ping while blocking PTB enough?** No. Small pings may work while large application packets hit a PMTU black hole.

## Read next

Connect ICMP errors to `ip route get`, packet capture, and MTU tests in a diagnostic workflow.
