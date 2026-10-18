---
title: "TCP options: MSS, window scaling, SACK, and timestamps"
category: "Network"
tags: ["network", "tcp", "protocol"]
description: "Learn important TCP options negotiated during connection setup and how they improve data transfer."
updated: 2026-10-16
translationKey: "network/tcp-options-mss-window-scaling"
---

The TCP header has a variable-length options area. Some options are exchanged mainly in SYN packets so the endpoints can agree on transfer behavior; others appear in segments throughout the connection. Options extend TCP while preserving its basic byte-stream semantics.

## MSS and MTU

Maximum Segment Size describes the largest TCP payload one endpoint wants to receive in a segment, commonly derived from MTU minus IP/TCP headers. MSS excludes headers. Tunnels, VPNs, and encapsulation reduce the effective MTU; if part of the path has a smaller MTU, packets may be fragmented or dropped when PMTUD fails.

MSS is advertised in the reverse direction: the value one endpoint sends tells its peer the maximum payload that **the sender of the option** wants to receive. This is a receive limit, not one shared MSS negotiated by both peers. The sender still considers PMTU and header length when selecting an actual segment. The two directions may have different PMTUs. If the MSS option is absent, the protocol has a default rule, but historical values in books should not be used as universal current configuration defaults for every stack.

## Window scaling

The TCP header window field is only 16 bits. The Window Scale option negotiates a scale factor to represent receive windows larger than 65,535 bytes, which is needed on high bandwidth-delay paths. The scale is exchanged in SYN; afterward, the header's window value uses the factor for that direction. The Window field in SYN and SYN-ACK itself is never scaled ([RFC 7323](https://www.rfc-editor.org/rfc/rfc7323.html#section-2.2)).

## SACK and timestamps

Selective Acknowledgment lets a receiver report byte ranges received beyond the first continuous range, helping a sender retransmit only the gaps instead of an entire region. Timestamps help measure RTT and PAWS helps reject old segments in some sequence-wrap situations.

SACK-Permitted is exchanged in SYN; once permitted, the receiver may include SACK blocks in ACKs to identify ranges beyond the first contiguous range. Cumulative ACK remains fundamental. The TCP option space is at most 40 bytes, limiting how many blocks fit in a segment; the sender also needs recovery logic that uses this information.

The Timestamp option carries TSval and TSecr and does not require synchronized clocks between machines. Echoed timestamps can provide additional RTT samples; a monotonically increasing timestamp also supports PAWS (Protection Against Wrapped Sequence numbers), which rejects old segments when sequence space wraps on a high-speed connection. This is a TCP timestamp feature, not an application-business timestamp.

## UTO, TCP-AO, and option space

User Timeout (UTO) can exchange a threshold for waiting on unacknowledged data before an application considers the peer failed. The value is advisory; each endpoint still applies its own local limits and policy. TCP Authentication Option (TCP-AO) authenticates segments using configured shared keys and algorithms, but does not provide a key-distribution process or payload encryption. Actual support depends on the stack and environment.

Options use Kind/Length and may be padded so the header length is a multiple of four bytes; EOL ends the list and NOP provides alignment. The maximum header is 60 bytes, so options compete for space. TCP stacks commonly ignore unrecognized options under compatibility rules, but a middlebox that modifies or removes options can prevent negotiated capabilities from working as expected.

## PMTU and black holes

TCP selects payload based on the peer's MSS and path MTU. With classic PMTUD, it sends unfragmented packets; ICMP Fragmentation Needed or Packet Too Big reports the next-hop MTU, and TCP reduces segment size before retransmitting. PLPMTUD can probe sizes at the packetization layer without depending entirely on ICMP. If a firewall drops required ICMP, the handshake with small packets may succeed while larger transfers stall or retransmit—a sign of a PMTU black hole. Captures on both sides and checks for PTB/Fragmentation Needed help distinguish this from an application error.

A forged ICMP PTB with an overly small MTU can also force a sender to use tiny segments and reduce performance. Do not mechanically block all ICMP; filter and validate messages in context and use the OS's appropriate PMTU mechanism.

Middleboxes may remove or alter options; captures at both endpoints help determine what the SYNs actually negotiated. On Linux, `ss -ti` often shows some TCP socket metrics.

## Check your understanding

**Does MSS include TCP/IP headers?** No. It is the TCP payload size.

**Can window scaling be negotiated after a connection is established?** Not in the standard mechanism; the option is exchanged in SYN.

**Does SACK turn TCP into a message protocol?** No. TCP remains a byte stream.

## Read next

RTO, retransmission, and congestion control use ACKs and RTT measurements to adjust sending behavior.
