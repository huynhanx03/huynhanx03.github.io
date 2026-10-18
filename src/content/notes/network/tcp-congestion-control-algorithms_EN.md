---
title: "Tahoe, Reno, NewReno, and CUBIC in TCP congestion control"
category: "Network"
tags: ["network", "tcp", "congestion control", "reno"]
description: "Compare slow start, congestion avoidance, fast recovery, and widely known generations of congestion controllers."
sources:
  - title: "TCP Congestion Control"
    url: "https://www.rfc-editor.org/rfc/rfc5681.html"
  - title: "TCP NewReno Modification to TCP's Fast Recovery Algorithm"
    url: "https://www.rfc-editor.org/rfc/rfc6582.html"
  - title: "CUBIC for Fast and Long-Distance Networks"
    url: "https://www.rfc-editor.org/rfc/rfc9438.html"
  - title: "The Addition of Explicit Congestion Notification (ECN) to IP"
    url: "https://www.rfc-editor.org/rfc/rfc3168.html"
  - title: "IETF Recommendations Regarding Active Queue Management"
    url: "https://www.rfc-editor.org/rfc/rfc7567.html"
updated: 2026-10-17
translationKey: "network/tcp-congestion-control-algorithms"
---

A congestion controller observes ACKs, loss, and ECN, then adjusts the congestion window. Classic algorithms use additive increase and multiplicative decrease: increase gradually when conditions are stable and reduce the window after signs of congestion.

## Tahoe and Reno

TCP Tahoe uses slow start initially. When it detects loss, it lowers `ssthresh`, sets a small congestion window, and returns to slow start. Reno adds fast recovery after fast retransmit so a single lost segment does not always force the window down to its smallest value while ACKs are still arriving.

Fast retransmit commonly treats three duplicate ACKs in a row as evidence of a gap even though later segments are arriving. Fast recovery uses continuing ACKs to keep data moving instead of waiting for an RTO. Since this relies on ACK behavior, duplication and reordering can complicate interpretation. The RTO remains a fallback when progress is insufficient.

## NewReno and SACK recovery

NewReno improves handling of multiple segments lost in one window using partial ACKs. SACK tells the sender which blocks arrived and lets it retransmit specific holes. Recovery algorithms differ in how many retransmissions they send and update `cwnd`.

NewReno keeps a recovery point: a partial ACK indicates progress but does not acknowledge all data outstanding when recovery began, so the sender continues working on the remaining gap. SACK reports out-of-order byte ranges and gives the sender better evidence for retransmission choices; cumulative ACK remains the primary confirmation of continuous bytes. A receiver is permitted to renege on data previously reported with SACK if it must reclaim buffers, so the sender cannot blindly trust old SACK information after a timeout.

FACK uses the highest SACKed edge to infer how much data reached the receiver and estimate missing holes. Rate halving reduces the window gradually during recovery rather than immediately dropping it; it is one algorithmic choice, not a claim that all current TCP stacks recover exactly like the Linux example in the book. Limited Transmit can send previously unsent data after the first and second duplicate ACKs to maintain the ACK clock, if the receiver window allows it and total `FlightSize` stays at or below `cwnd + 2 × SMSS`. This prevents excessive extra traffic based only on duplicate ACKs.

If an ACK acknowledges only part of a sent segment, do not assume the entire segment left the network. SACK recovery therefore estimates data still in the network, for example with `pipe` in [RFC 6675](https://www.rfc-editor.org/rfc/rfc6675.html#section-4), accounting for SACKed bytes, inferred losses, and unconfirmed retransmissions. Classic `FlightSize` means sent data not cumulatively acknowledged; it is not the same quantity as the `pipe` estimate. Lost packets must be inferred rather than directly observed. This is why recovery variants can send different amounts of retransmitted data.

## CUBIC and high-speed networks

CUBIC uses a time-based growth function after a congestion event to expand the window efficiently on paths with a large bandwidth-delay product. Linux often supports CUBIC, but defaults and configuration can change; do not infer the controller from the OS name alone.

HSTCP adjusts increase and decrease according to window size for high-speed, long-RTT links; Limited Slow Start was proposed to limit overly aggressive growth when the window is already large. BIC probes around the previous congestion window using structured increases and decreases. CUBIC instead makes window growth a function of elapsed time, using a curve that approaches the previous congestion point. These methods address how slowly classic AIMD fills a very large BDP path, while raising fairness questions when sharing with other controllers.

### Recovering from misleading congestion signals

An RTO, duplicate ACKs, or reordering can make TCP infer loss when a packet was merely delayed. Timestamps may reveal that a retransmission arrived after the original; DSACK can report duplicate data; Eifel and F-RTO are algorithm families that use such evidence to detect some spurious timeouts or retransmissions. With enough evidence, a sender may undo a reduction to `cwnd` or `ssthresh`. Not every case is detectable, and restoring the full window immediately can create a burst, so implementations may limit packets sent after an ACK.

## ECN, delay-based control, and bufferbloat

ECN lets a router mark congestion instead of dropping packets when the path supports it. Delay-based controllers observe queueing delay to react early, but depending on their design they can be overpowered by competing loss-based flows. Router AQM such as RED or CoDel manages queues; TCP controllers and AQM have complementary roles.

Delay-based controllers use minimum RTT as an estimate of path delay with an empty queue, then compare it with current RTT to estimate queueing. Vegas increases, holds, or decreases its window around a target range. FAST and Compound TCP use their own rate/window controls, while Westwood estimates bandwidth from ACKs and uses that estimate when choosing `ssthresh`. These algorithms are sensitive to ACK compression, congestion on the ACK path, route changes, and competing controllers. The book presents designs from its publication period; its parameters and support descriptions are not a statement of current OS behavior.

AQM can drop or mark before a queue fills. ECN is a signaling path: a router marks CE, the receiver echoes the mark in an ACK, the sender reduces its congestion window, then signals CWR. Repeated marks should not cause a sender to reduce repeatedly for the same window of data. If ECN is cleared or the receiver fails to echo it, the sender may not see the signal; this is also a trust and security boundary.

### TCP friendliness and non-cooperative behavior

TFRC is an example of rate control based on a formula using RTT, packet size, loss rate, and RTO, which can suit smoother traffic. “TCP-friendly” is a relative goal under specified sharing conditions, not a universal fairness guarantee; measurement errors or different paths can change the result.

The chapter also describes ways a receiver or intermediary can distort control: ACK division sends multiple ACKs for the same bytes; duplicate-ACK spoofing makes the sender believe fast recovery is progressing; optimistic ACKs acknowledge data not yet received to accelerate a sender; removing or failing to echo ECN hides congestion. Mitigations depend on the protocol and implementation, such as counting growth per acknowledged byte rather than per ACK, limiting bursts, and validating ACKs with additional information. ICMP Source Quench is a historical mechanism removed from router recommendations long ago, not a congestion-control tool for current use.

## Summary

- Tahoe sharply reduces its window after loss; Reno adds fast recovery.
- NewReno and SACK handle multiple losses more effectively in many cases.
- CUBIC targets paths with a high bandwidth-delay product.
- ECN and AQM provide congestion signals beyond packet drops.
- HSTCP, BIC, and CUBIC change window growth for large BDP paths, with fairness depending on competing flows and paths.
- Vegas, FAST, Westwood, and Compound TCP are distinct designs; descriptions in the book are historically situated.
- ACK, SACK, timestamps, and ECN can be delayed, lost, or manipulated.
- The selected controller depends on kernel, configuration, and path.

## Check your understanding

**Does Reno always recover well from multiple losses in one window?** NewReno or SACK often handles such cases better.

**Does CUBIC grow without regard to loss?** No. It responds to congestion events.

**Will ECN work if only the sender enables it?** The path, receiver, and router must support and negotiate it appropriately.

## Read next

Read a TCP capture alongside congestion window, queueing delay, and loss to connect the model to measurements.
