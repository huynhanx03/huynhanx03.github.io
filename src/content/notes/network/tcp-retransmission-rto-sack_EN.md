---
title: "TCP retransmission, RTO, and SACK"
category: "Network"
tags: ["network", "tcp", "retransmission", "sack"]
description: "Understand RTT estimation, timeouts, fast retransmit, duplicate ACKs, and selective acknowledgment."
sources:
  - title: "Computing TCP's Retransmission Timer"
    url: "https://www.rfc-editor.org/rfc/rfc6298.html"
  - title: "TCP Selective Acknowledgment Options"
    url: "https://www.rfc-editor.org/rfc/rfc2018.html"
  - title: "An Extension to the Selective Acknowledgment (SACK) Option for TCP"
    url: "https://www.rfc-editor.org/rfc/rfc2883.html"
  - title: "The Eifel Detection Algorithm for TCP"
    url: "https://www.rfc-editor.org/rfc/rfc3522.html"
  - title: "Forward RTO-Recovery (F-RTO)"
    url: "https://www.rfc-editor.org/rfc/rfc5682.html"
  - title: "TCP NewReno Modification to TCP's Fast Recovery Algorithm"
    url: "https://www.rfc-editor.org/rfc/rfc6582.html"
  - title: "Improving TCP's Robustness to Blind In-Window Attacks (RFC 5961)"
    url: "https://www.rfc-editor.org/rfc/rfc5961.html"
  - title: "Low-Rate TCP-Targeted Denial of Service Attacks (The Shrew Attack)"
    url: "https://doi.org/10.1145/863955.863966"
updated: 2026-10-17
translationKey: "network/tcp-retransmission-rto-sack"
---

Packets can be lost, duplicated, or arrive out of order. TCP must decide when to retransmit so that it recovers from loss without sending again too early. The decision uses observed RTT and ACK feedback.

## RTT and retransmission timeout

The sender measures round-trip time (RTT) for acknowledged data. After the first sample `R`, the algorithm recommended by RFC 6298 sets `SRTT = R`, `RTTVAR = R/2`, then computes `RTO = SRTT + max(G, 4 × RTTVAR)`, where `G` is clock granularity. For example, `R = 100 ms` gives `300 ms` from the formula, but the RFC recommends rounding an RTO below `1 s` up to at least `1 s` to avoid retransmitting too early. Stacks may use additional algorithms or implementation-specific behavior.

For a later sample `R′`, `RTTVAR` is updated from the difference between the new sample and the old `SRTT`, then `SRTT` is smoothed toward the new sample. After a timeout, the sender doubles the RTO (backs off), usually up to a cap. RTO therefore reflects both latency and variation, not one global constant.

Karn's algorithm avoids using an ambiguous RTT sample from a retransmitted segment, because an ACK does not reveal which copy arrived. TCP timestamps can improve some measurements and distinctions, depending on implementation.

## Timeout and fast retransmit

If no ACK arrives before the RTO expires, the sender retransmits and usually reduces its sending rate. If a receiver gets bytes beyond a gap, it can send duplicate ACKs indicating the next sequence number it still needs. Several duplicate ACKs can trigger fast retransmit before a timeout.

Read duplicate ACKs in context: an ACK with the same number but a changed receive window may be a window update, not a loss signal. A receiver often ACKs immediately when an out-of-order segment arrives. The sender waits for a threshold of duplicate ACKs before inferring a gap because reordering can also produce them. The traditional threshold is three, but stacks can adjust it. Fast retransmit usually accompanies a congestion response; which data to resend and whether to send more belongs to the recovery and congestion-control algorithms.

With NewReno, a TCP recovery variant that does not require SACK, a partial ACK during recovery indicates that the next gap remains; the sender may retransmit the next missing segment without leaving recovery. Not every TCP variant handles partial ACKs identically. An RTO is usually more severe than duplicate ACKs because the sender has received no sign of progress.

Reordering can look like loss and cause unnecessary retransmission. Duplicate SACK (DSACK) and undo algorithms can help identify some spurious retransmissions, depending on the stack.

## SACK

A cumulative ACK identifies the next contiguous byte the receiver needs. Selective Acknowledgment reports other blocks already received, helping the sender retransmit only the missing range instead of everything after the cumulative ACK. SACK is negotiated when the connection opens.

The receiver usually puts the newest block at the start of its SACK list and repeats older blocks so the information remains useful if an earlier ACK was lost. The sender must maintain its own map of SACKed bytes and implement selective repeat; merely receiving a SACK option does not guarantee effective recovery. SACK blocks are advisory: a receiver may renege on out-of-order data, so the sender must not free retransmission data based only on SACK; the cumulative ACK must pass those bytes. After an RTO, the sender becomes cautious and may discard its previous SACK knowledge until the receiver reports it again.

DSACK extends SACK to report a duplicate byte range, including one below the cumulative ACK. The sender can use DSACK to infer duplicated packets, reordering, or an unnecessary retransmission, but the information appears in one ACK and may itself be lost.

## Spurious retransmission and reordering

Eifel detection uses TCP timestamps: after retransmitting, the sender compares the timestamp echoed in the first ACK with the retransmission's timestamp. An older echo suggests the ACK may have been caused by the original copy. Forward RTO-Recovery (F-RTO) does not require timestamps: after an RTO, the sender probes with new data and checks whether ACKs continue to advance or merely repeat, identifying some spurious timeouts. Depending on conditions, Eifel response can adjust estimators and congestion state. These algorithms solve different cases and help only when implemented.

Forward-path reordering creates a false gap at the receiver; reverse-path ACK reordering can make the sender see a later ACK and then an older one, producing a burst. Duplicate packets can also create enough duplicate ACKs to trigger fast retransmit. A retransmission in a capture therefore does not prove packet loss. Compare traces at both endpoints, SACK/DSACK, timestamps, and sequence-space order.

## Repacketization and path memory

TCP numbers bytes, so a retransmission need not use the same segment boundaries as the original. The sender can combine missing bytes into a differently sized segment as long as it respects MSS and Path MTU. Some stacks also cache path metrics such as RTT or PMTU to initialize new connections, but cache behavior and inspection commands depend on OS and version; route-cache examples in the book describe older Linux.

RTO can also be targeted by a Shrew attack: an attacker sends short, periodic bursts near the retransmission cycle to cause loss just as a sender retries; TCP throughput can collapse even though the attack has a low average rate. This is a denial-of-service attack on timeout behavior, distinct from blind in-window injection, where a forged packet with a valid sequence number can affect a connection. [RFC 5961](https://www.rfc-editor.org/rfc/rfc5961.html) describes mitigations for some blind-injection attacks; none makes TCP a comprehensive denial-of-service defense.

SACK does not turn TCP into a message protocol; it improves recovery for a byte stream. Sender and receiver still need buffers and state.

## Packet captures and interpretation

A capture containing duplicate ACKs or retransmissions is not enough to identify where a packet was lost. Captures at the sender, receiver, a switch mirror, and a NIC with offload enabled can each show a different view. Correlate timestamps, sequence space, ACKs, retransmissions, interfaces, and counters.

## Summary

- RTO uses RTT and its variation, and backs off after a timeout.
- Duplicate ACKs can indicate a byte gap; fast retransmit avoids waiting for the RTO.
- SACK identifies received blocks so the sender can recover more selectively.
- Reordering can look like loss and cause unnecessary retransmissions.
- Packet captures must be interpreted in light of observation point and offload.

## Check your understanding

**Does every retransmitted packet prove network loss?** It may result from loss, delay/reordering, or a timer/observation artifact.

**Does a cumulative ACK mean every later packet has not arrived?** No. The receiver may have later blocks and report them with SACK.

**Does SACK disable congestion control?** No. Recovery and congestion control interact but are different functions.

## Read next

TCP windows control how much data is in flight and how quickly a receiver can consume it.
