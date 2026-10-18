---
title: "RTT estimation and retransmission timeout calculation"
category: "Network"
tags: ["network", "tcp", "rto", "rtt"]
description: "Understand smoothed RTT, variation, timer backoff, and why one fixed timeout cannot fit every path."
sources:
  - title: "Computing TCP's Retransmission Timer (RFC 6298)"
    url: "https://www.rfc-editor.org/rfc/rfc6298.html"
  - title: "TCP Extensions for High Performance (RFC 7323)"
    url: "https://www.rfc-editor.org/rfc/rfc7323.html"
  - title: "TCP Congestion Control (RFC 5681)"
    url: "https://www.rfc-editor.org/rfc/rfc5681.html"
  - title: "TCP DSACKs (RFC 3708)"
    url: "https://www.rfc-editor.org/rfc/rfc3708.html"
  - title: "The Eifel Detection Algorithm (RFC 3522)"
    url: "https://www.rfc-editor.org/rfc/rfc3522.html"
  - title: "Forward RTO-Recovery (F-RTO) (RFC 5682)"
    url: "https://www.rfc-editor.org/rfc/rfc5682.html"
updated: 2026-10-17
translationKey: "network/tcp-rtt-estimation-rto"
---

RTT changes with congestion, routes, queues, and endpoint load. If a timeout is too short, a sender retransmits data that already arrived (a spurious retransmission); if it is too long, recovery from loss is slow. TCP uses an estimator instead of a fixed timeout.

## Smoothed RTT and variation

A classic estimator updates smoothed RTT using weights for old and new samples, while also estimating deviation or variation. RTO uses SRTT plus a margin based on variation, then applies minimum and maximum bounds defined by the specification or implementation.

Under the algorithm in [RFC 6298](https://www.rfc-editor.org/rfc/rfc6298.html), given the first RTT sample `R`, TCP sets `SRTT = R` and `RTTVAR = R/2`; later samples update the EWMA values with different weights for SRTT and RTTVAR. RTO has the form `SRTT + max(G, 4 × RTTVAR)`, where `G` is timer granularity. The safety margin grows with RTT variation instead of multiplying SRTT by one constant. RFC 6298 recommends rounding a computed RTO below one second up to one second; implementations may use different bounds. Books also describe older Linux-specific algorithms, so do not mix Linux 2.6 numbers with current rules.

RTT is usually estimated separately for each connection. TCP tracks a timer for unacknowledged data that consumes sequence space, including SYN and FIN; a pure ACK consumes no sequence space. Timestamp echo can provide samples more often and help distinguish retransmissions, but TCP clocks need only advance suitably; the two machines do not need synchronized clocks.

New samples can be noisy. EWMA smooths them but responds slowly to abrupt changes. Timer granularity and scheduling also introduce error.

## Ambiguous ACKs and Karn's algorithm

If a sender retransmits a segment, an incoming ACK might acknowledge the original or the retransmission. The sender cannot know which RTT sample is valid. Karn's algorithm skips ambiguous RTT samples unless timestamps distinguish them. Repeated timeouts usually trigger exponential backoff to reduce load on a failing path.

Karn's algorithm handles only the ambiguity in RTT samples: skip samples for retransmitted data when the corresponding ACK cannot be identified. Separately, RFC 6298 requires doubling the RTO after each timeout; when TCP gets a new valid sample from data that was not retransmitted, it recomputes RTO and may remove the backoff. A timeout is also a reason for congestion control to be cautious and avoid retransmitting too aggressively while the path is slow.

A TCP connection commonly has one active retransmission timer for unacknowledged data; when ACK advances, the timer is canceled or updated for remaining data. This is the final recovery timer when there are not enough ACKs for fast retransmit. It is designed not to fire during normal conditions.

## Timestamps and RTT with reordering

Timestamps can carry a monotonically increasing clock value and be echoed in ACKs. RTTM uses the difference between the current clock and echoed timestamp to sample RTT; PAWS uses timestamp information to recognize old segments after sequence-number wraparound. The mechanism does not need synchronized clocks between hosts.

When segments arrive out of order, a receiver commonly ACKs immediately to report the gap. Timestamp echo is generally associated with the most recent segment that advanced the cumulative ACK, not simply the newest segment to arrive. Therefore, RTT samples during reordering or loss can be larger and make TCP less aggressive about retransmission; this trade-off helps reduce spurious retransmissions.

## When RTO fires too early

A sudden latency increase, a lost or delayed ACK, or packet reordering can create a spurious timeout while the original data is still in transit. The retransmission wastes bandwidth, and the congestion-control response to an RTO may reduce the congestion window even though no loss occurred. [DSACK](https://www.rfc-editor.org/rfc/rfc3708.html) reports duplicate data received; [Eifel](https://www.rfc-editor.org/rfc/rfc3522.html) uses timestamps to recognize an ACK for the original transmission; [F-RTO](https://www.rfc-editor.org/rfc/rfc5682.html) tries new data after a timeout to see whether the path is still making progress. Support depends on the stack; these mechanisms do not guarantee that every spurious retransmission will be undone.

## Fast recovery differs from RTO

Duplicate ACKs or SACK can indicate loss while packets are still arriving, enabling fast retransmit. RTO fires after ACK feedback has been absent long enough and usually reduces the sending rate more sharply. Reordering or delayed ACKs can affect the trigger.

## Summary

- RTO uses smoothed RTT and variation, with bounds.
- A retransmitted segment makes RTT samples ambiguous.
- Karn's algorithm avoids invalid samples; repeated timeouts back off to reduce load.
- Fast retransmit relies on ACK feedback; RTO is a timer fallback.
- RTT and latency vary with queues, routes, and endpoints.

## Check your understanding

**Is RTO exactly the average RTT?** No. It needs a margin for variation.

**Does a timeout prove that a packet was lost?** No. The packet or ACK may only be delayed.

**Should TCP retry faster after repeated timeouts?** It usually backs off to avoid adding congestion.

## Read next

SACK and duplicate SACK help handle reordering, loss, and unnecessary retransmission.
