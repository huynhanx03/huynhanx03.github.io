---
title: "DNS message format, zone transfer, and dynamic update"
category: "Network"
tags: ["network", "dns", "edns", "zone"]
description: "Read query and response flags and sections, EDNS0 and truncation, and mechanisms for synchronizing zones."
sources:
  - title: "Domain Names - Implementation and Specification (RFC 1035)"
    url: "https://www.rfc-editor.org/rfc/rfc1035.html"
  - title: "Extension Mechanisms for DNS (EDNS(0)) (RFC 6891)"
    url: "https://www.rfc-editor.org/rfc/rfc6891.html"
  - title: "DNS Transport over TCP (RFC 7766)"
    url: "https://www.rfc-editor.org/rfc/rfc7766.html"
  - title: "Incremental Zone Transfer in DNS (RFC 1995)"
    url: "https://www.rfc-editor.org/rfc/rfc1995.html"
  - title: "A Mechanism for Prompt Notification of Zone Changes (RFC 1996)"
    url: "https://www.rfc-editor.org/rfc/rfc1996.html"
  - title: "Dynamic Updates in the Domain Name System (RFC 2136)"
    url: "https://www.rfc-editor.org/rfc/rfc2136.html"
  - title: "Protocol Modifications for the DNS Security Extensions (RFC 4035)"
    url: "https://www.rfc-editor.org/rfc/rfc4035.html"
  - title: "Secret Key Transaction Authentication for DNS (TSIG) (RFC 2845)"
    url: "https://www.rfc-editor.org/rfc/rfc2845.html"
  - title: "DNS Request and Transaction Signatures (SIG(0)) (RFC 2931)"
    url: "https://www.rfc-editor.org/rfc/rfc2931.html"
updated: 2026-10-17
translationKey: "network/dns-message-zones-and-updates"
---

A DNS message has a header with a transaction ID, flags, record counts for each section, and payload containing Question, Answer, Authority, and Additional sections. Response codes distinguish success, NXDOMAIN, SERVFAIL, REFUSED, and other states. A client must check that a response matches a pending query; DNSSEC validation, when enabled, is a separate data-authentication step.

## Reading a DNS message from header to answer

The DNS header is 12 bytes long. A transaction ID matches a response to a pending query; it is not authentication. Important flags include QR (query or response), Opcode (operation type), AA (authoritative answer), TC (truncated message), RD (client requests recursion), RA (server supports recursion), AD/CD (DNSSEC validation-related state), and RCODE. During diagnosis, inspect both flags and RCODE: `NOERROR` can still have no desired answer, and `NXDOMAIN` differs from `SERVFAIL`.

Each DNS message has Question, Answer, Authority, and Additional sections. A resource record contains an owner name, type, class, TTL, RDATA length, and RDATA. Records with the same owner, class, and type form an RRset; DNSSEC signs the RRset rather than each record individually. Names in a message may use compression pointers to earlier positions to reduce size. EDNS(0) adds an OPT pseudo-record in Additional. The querying client advertises the largest UDP payload it can receive; OPT also carries options such as the DNSSEC DO bit. This is message metadata, not an ordinary data record.

Ordinary queries usually try UDP first. If a response has the TC flag, the client may retry over TCP; TCP is also used for AXFR and large responses. A firewall that allows only UDP/53 can therefore make some queries fail. The EDNS(0) UDP size is the limit advertised by the client, not a guarantee that this size can travel across the whole path; IP fragmentation and network devices can make large responses less reliable.

## Queries and responses

Question specifies QNAME, QTYPE, and QCLASS. Answer contains records answering the query; Authority may contain delegation or SOA information; Additional may contain supporting data such as glue. A resolver may return a CNAME chain with the target record or make another query.

## Zone transfer and notification

AXFR transfers an entire zone; IXFR transfers incremental changes when the server has a journal. A primary can send [NOTIFY (RFC 1996)](https://www.rfc-editor.org/rfc/rfc1996.html) so a secondary knows to check its serial. [IXFR is specified in RFC 1995](https://www.rfc-editor.org/rfc/rfc1995.html). Transfers must be restricted by server and identity; unintentionally allowing AXFR can expose zone structure.

The secondary also relies on SOA fields such as serial, refresh, retry, and expire to synchronize when NOTIFY is absent or unused. NOTIFY only indicates that data may have changed; the secondary checks the SOA serial before deciding to transfer. AXFR uses TCP and sends the whole zone; IXFR exchanges changes between old and new serials, but may fall back to AXFR if change history is unavailable. The serial must increase according to the zone management system's convention. Restrict who can request transfers and monitor secondary status to avoid serving stale or expired data.

## Dynamic update

DNS UPDATE allows records to be added or deleted subject to conditions, which is useful for DHCP/DDNS. The server needs authentication and policy for updates and must restrict the zone. Do not allow unauthenticated updates from the entire Internet.

Under [RFC 2136](https://www.rfc-editor.org/rfc/rfc2136.html), an update targets a zone and may include prerequisites so the operation runs only if the current state is still valid. A prerequisite can require an RRset to exist (with or without a value constraint), not to exist, or a name to be in use or unused. The update section can add an RR, delete an RRset, delete all RRsets at a name, or delete a specific RR. The server checks prerequisites first; if one fails, it rejects the entire operation rather than partially applying it. This helps multiple clients update names without overwriting one another's changes.

RFC 2136 DNS UPDATE differs from a provider's Dynamic DNS API. Both can update a changing address, but a commercial API may be its own protocol. Whichever method is used, update rights must be tied to an identity or strict policy; [TSIG](https://www.rfc-editor.org/rfc/rfc2845.html) and [SIG(0)](https://www.rfc-editor.org/rfc/rfc2931.html) are message-authentication mechanisms; see also the DNS security note.

## Summary

- DNS messages have a header and Question, Answer, Authority, and Additional sections.
- EDNS0 extends message capabilities; truncation may require a TCP retry.
- AXFR/IXFR synchronize zones; NOTIFY tells a secondary to check.
- Dynamic updates need clear authentication and ACLs.
- Firewalls must consider DNS over TCP and UDP.

## Check your understanding

**Does DNS use only UDP/53?** No. TCP/53 is required in many cases.

**Are Additional records always authoritative?** No. Supporting data still needs to be interpreted under protocol and trust rules.

**Is it safe to allow arbitrary clients to update DNS records?** No. An attacker could modify the namespace.

## Read next

DNSSEC signs RRsets and validates a chain of trust, while DNS messages are still transported over UDP or TCP.
