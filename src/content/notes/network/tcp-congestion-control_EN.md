---
title: "TCP congestion control: slow start, loss, and fairness"
category: "Network"
tags: ["network", "tcp", "congestion control", "cubic"]
description: "Follow the congestion window, slow start, and recovery to understand how TCP shares bandwidth among flows."
updated: 2026-10-16
translationKey: "network/tcp-congestion-control"
---

If every sender transmits as fast as possible, router queues fill, latency rises, and packets are dropped. TCP congestion control adjusts in-flight data in response to network signals to share resources and reduce congestion collapse.

## Congestion window

`cwnd` limits bytes the sender allows in flight because of network conditions; `rwnd` is the peer's receive window. The effective send window is limited by both along with other limits. `cwnd` is not advertised directly like `rwnd`.

Think of the allowed in-flight data as `min(cwnd, rwnd)`. `rwnd` asks, “Does the receiver have room?” `cwnd` asks, “How much more can the network carry?” Each direction of a bidirectional connection has its own window and state.

ACKs clock the sender: when acknowledged data leaves flight, the sender can put new data into the network, provided both limits allow it. On a stable path, an amount near the bandwidth-delay product (BDP) keeps the path full. Much less may leave the link idle; much more may build a queue and increase delay. Throughput alone therefore cannot tell whether a path is healthy or has an excessively long queue.

## Slow start and congestion avoidance

A new connection begins with an initial congestion window, then grows quickly in slow start as ACKs arrive. At a threshold or congestion signal, the algorithm switches to more cautious growth. Current behavior depends on the controller (Reno, CUBIC, BBR, and OS-specific variants).

Slow start does not mean the sender initially transmits slowly: `cwnd` grows quickly with ACKs, approximately doubling each RTT when ACKs acknowledge each segment. It probes the path's capacity; it does not certify that the network is uncongested. When `cwnd` reaches `ssthresh`, the sender usually enters congestion avoidance. With classic AIMD, this phase adds roughly one MSS per RTT; when loss is treated as congestion, the controller reduces the window. `ssthresh` is a boundary between phases, not a fixed speed limit.

Loss does not prove a router is overloaded: link errors or reordering can look similar. Conversely, queues can increase RTT before dropping packets. Controllers choose different signals and responses, so do not infer an algorithm from an OS name alone.

Many classic controllers treat loss as congestion. Fast retransmit/recovery reduces the window; an RTO usually indicates a more severe lack of progress. ECN can report congestion without waiting for a drop when both endpoints and the path support it.

## Bufferbloat

An oversized buffer can hold packets instead of dropping them, preserving throughput while sharply increasing latency. Active Queue Management (AQM) and ECN try to control queues before they fill. QoS or shaping can share capacity according to policy, but cannot create physical bandwidth.

### AQM and ECN

Drop-tail discards packets only when a queue is full. AQM actively manages queues; RED is a historical example that probabilistically drops or marks based on average queue length. AQM and congestion control have different jobs: a router manages its queue and may signal; endpoints decide how to change their sending rate.

With ECN, sender and receiver negotiate capability; a supporting router can mark congestion instead of dropping a packet. The receiver reports the mark in an ACK, the sender reduces its rate, and signals that it responded. If an endpoint or the path does not support ECN correctly, it provides no benefit. RED and configurations described in the book reflect its publication era, not current configuration advice.

## Fairness and multiple flows

Several TCP flows may compete at one bottleneck. Fairness depends on RTT, controller, queue, application, and path. An application opening dozens of connections may get more capacity than one using a single flow; per-flow fairness is not always per-user fairness.

TCP friendliness is a goal for a new protocol/controller not to consume an excessive share when competing with ordinary TCP. TFRC is one example: instead of adjusting a window on every ACK like TCP, it calculates a rate limit using RTT, packet size, and loss rate, producing smoother sending for real-time applications. The formula is useful only with sound RTT and loss-event measurements; a “fairness” result does not guarantee fairness with every controller, RTT, or queue.

Some systems share RTT, reordering, or congestion estimates among connections to the same destination to give new connections a better starting point. This is an implementation optimization that may depend on route and cached state; metrics from an old connection are not necessarily valid for a new path.

## Tuning and diagnosis

Measure throughput together with RTT/queueing latency, loss, retransmissions, and `cwnd` when tools expose it. Increasing socket buffers does not fix a bottleneck by itself; with a stable RTT, a usable window `W` gives an approximate throughput bound of `W / RTT`; filling bandwidth `B` requires a window covering `B × RTT`. Bottleneck bandwidth, receiver, CPU, and policy impose additional limits. Choose a system-wide congestion controller based on workload and administration, not a universal tip.

### Reading a trace

- Rapid early `cwnd` growth often indicates slow start; slower growth later often indicates congestion avoidance.
- Duplicate ACKs/SACK can trigger retransmission before the RTO. SACK identifies received blocks and helps choose a hole, but the sender must still track actual in-flight data to avoid injecting too much.
- A NewReno partial ACK indicates some data was recovered while recovery continues. SACK can identify multiple received ranges and handle several losses in one window more efficiently.
- An RTO usually triggers a stronger reaction than fast recovery because the sender has no ACK progress. A timeout can be spurious due to RTT variation; timestamps/DSACK and undo algorithms such as Eifel or F-RTO can identify some cases and restore congestion state. This is conditional, not every timeout can be undone.
- If a receiver reneges on SACKed data by discarding out-of-order bytes it reported earlier, the sender must treat old SACK information cautiously and still coordinate recovery with cumulative ACKs and timeout.

A useful trace places `cwnd`/`ssthresh`, bytes in flight, RTT, ACK/SACK, retransmissions, ECN/CWR, and application sending rate on one timeline. This helps distinguish an application that stopped supplying data, a growing queue, fast loss recovery, and a true RTO.

### Controller families discussed in the book

High-speed algorithms such as HSTCP, BIC, and CUBIC adjust window growth to fill paths with large BDP faster than classic AIMD. Their fairness still needs evaluation when sharing with other flows. CUBIC shapes growth based on time since a congestion event; implementation details and defaults vary by system and version.

Delay-based controllers such as Vegas estimate queueing from the difference between minimum and current RTT, then try to maintain a target queue. This can reduce queueing and loss, but delay on the ACK path also increases measured RTT; loss-based flows may fill the queue and overwhelm a delay-based flow. FAST, Westwood, and Compound TCP are other designs described in the book, combining delay measurements, bandwidth estimates, or loss-based components differently. These descriptions explain ideas, not current support status.

### A window does not always reflect current capacity

After a long application idle period, an old `cwnd` may be larger than the network can currently tolerate. Congestion Window Validation (CWV) is a family of rules intended to avoid a large burst based only on a previously high window. Congestion-window moderation limits data released by an ACK when recovering state after a timeout. If a loss signal is identified as false, an undo algorithm may restore `cwnd`/`ssthresh`, but needs evidence such as timestamps or DSACK.

## Summary

- Congestion control limits in-flight data based on network conditions.
- `cwnd` differs from the receive window `rwnd`.
- Slow start grows quickly at first; congestion avoidance adjusts more cautiously.
- Loss, ECN, and queueing delay are signals interpreted differently by controllers.
- SACK/NewReno help recovery, while the sender still controls in-flight data.
- AQM manages queues; ECN can mark congestion instead of dropping when supported end to end.
- Fairness depends on controller, RTT, queues, and each application's number of flows.
- Bufferbloat increases latency; throughput alone does not describe quality.

## Check your understanding

**Does TCP congestion control only protect the receiver?** No. Flow control protects the receiver; congestion control protects the network.

**Is all loss caused by an overloaded router?** No. Link errors, wireless conditions, and devices can also cause loss. Reordering can make a sender infer loss even when the data only arrived out of order.

**Will a larger socket buffer always speed up downloads?** No. It may only increase memory use or queueing latency.

## Read next

TCP keepalive and application heartbeats detect inactive peers, with different timing and purposes.
