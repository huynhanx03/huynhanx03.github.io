---
title: "TCP sequence space, MSS, and connection options"
category: "Network"
tags: ["network", "tcp", "sequence number", "mss"]
description: "Read sequence and ACK numbers by byte, understand ISN wraparound, MSS, window scaling, timestamps, and SACK negotiation."
updated: 2026-10-16
translationKey: "network/tcp-sequence-numbers-and-options"
---

TCP numbers **bytes**, not packets. If a segment starts at sequence 1000 and carries 500 bytes, the next byte has sequence 1500; ACK 1500 means the receiver is waiting for byte 1500. The SYN and FIN bits each consume an additional position in sequence space, beyond any data bytes carried by the segment.

ACK is usually cumulative: after receiving every byte continuously before N, the receiver sends ACK N to indicate that byte N is next. If it receives data beyond a gap, an ordinary ACK cannot confirm those noncontiguous bytes; SACK blocks can add that information. Each direction of a connection has its own sequence space, so a segment can carry data one way and an ACK/window for the other direction.

## ISN and wraparound

Each side chooses an Initial Sequence Number (ISN) to start its stream. The 32-bit sequence number wraps modulo `2^32`; TCP uses the receive window, timing, and ISN generation to distinguish data in a new connection from old segments. An ISN is not a simple packet counter that increases across every connection.

A SYN carries an ISN and consumes one sequence number, so the first data byte in that direction starts at ISN+1. FIN also consumes one position. A pure ACK consumes no sequence number, so the ACK itself is not retransmitted as a byte-stream item. ISN generation also matters to connection-establishment security; it should not be treated as a fixed value of 0 or 1.

## Header fields and flags

A TCP segment is encapsulated in IP; the IPv4 protocol number or IPv6 Next Header is 6. The minimum header is 20 bytes and the maximum is 60 because Data Offset counts the header length in 32-bit words. Source/destination ports and the two endpoint IP addresses form the 4-tuple that identifies a connection.

The ACK flag indicates that the Acknowledgment Number is valid; SYN synchronizes sequence space when opening a connection; FIN means one side has no more data to send; RST aborts or resets a connection; PSH is a hint to deliver data promptly and should not be relied on as a message boundary. URG and the urgent pointer are rarely used. ECE/CWR relate to ECN congestion signaling. Reserved bits and options have their own formats; interpret flags in the context of the state machine and applicable standard version.

Window Size advertises how many bytes the receiver is ready to accept beginning at the ACK number, with window scaling if negotiated. The TCP checksum covers header and data plus an IP pseudo-header; it detects transmission errors but is not cryptographic authentication or protection from an attacker. Sensitive applications still need TLS or suitable integrity protection.

## MSS and PMTU

MSS is the maximum TCP payload a peer says it can receive in a segment; it is commonly derived from IP MTU minus basic IP/TCP headers. TCP options make the header longer, and the path may have a smaller MTU than the local link. MSS negotiation does not necessarily reflect every tunnel or PMTU change after the handshake.

## Window scaling and SACK

The basic TCP receive-window field is 16 bits wide. The Window Scale option negotiates a scale factor during the handshake to represent larger windows; it applies only if both peers negotiate it. SACK-permitted indicates that the peers can use SACK blocks to describe noncontiguous received data.

Timestamps help measure RTT and PAWS helps prevent confusion from wrapped sequence numbers on fast or long-lived connections. TCP-AO can authenticate some routing environments; it is different from encrypting application payload with TLS.

## Packet capture

Wireshark may show relative sequence numbers such as `Seq=1` rather than absolute values. Disable relative numbering when exact byte comparisons are needed. NIC offload can make a host capture show segments larger than the MSS observed on the wire.

## Summary

- Sequence numbers count bytes; SYN/FIN consume sequence space.
- ACK is the next byte needed under cumulative acknowledgment semantics.
- MSS, MTU, and TCP option headers affect payload per segment.
- Window Scale, SACK, and Timestamps must be negotiated during the handshake.
- Captures may use relative sequence numbers and can be affected by offload.

## Check your understanding

**Does the sequence number count segments?** No. It counts bytes in the stream.

**Is MSS the same as MTU?** No. MSS is TCP payload; MTU is a layer-specific packet size.

**Does SACK replace cumulative ACK?** No. It adds information about blocks beyond the continuous ACK.

## Read next

Options are established during the handshake; half-close, simultaneous open, and RST extend the connection lifecycle.
