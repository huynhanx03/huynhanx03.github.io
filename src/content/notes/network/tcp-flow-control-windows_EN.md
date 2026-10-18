---
title: "TCP windows, flow control, and Nagle's algorithm"
category: "Network"
tags: ["network", "tcp", "flow control", "window"]
description: "Understand the sliding window, receive window, zero window, delayed ACK, and interaction with Nagle's algorithm."
sources:
  - title: "Congestion Control in IP/TCP Internetworks"
    url: "https://www.rfc-editor.org/rfc/rfc896.html"
  - title: "Requirements for Internet Hosts — Communication Layers"
    url: "https://www.rfc-editor.org/rfc/rfc1122.html"
  - title: "Transmission Control Protocol (TCP)"
    url: "https://www.rfc-editor.org/rfc/rfc9293.html"
updated: 2026-10-17
translationKey: "network/tcp-flow-control-windows"
---

TCP does not send one byte and then stop to wait for an ACK for each byte. A sliding window allows multiple bytes to be in flight at once. The receiver advertises a receive window to report how much buffer remains; the sender should not exceed what the receiver can accept.

## Flow control differs from congestion control

**Flow control** protects the receiver from overflowing its buffer. **Congestion control** protects the network from overload. The amount of data a sender may send is commonly limited by the smaller of the receive window and congestion window.

A small receive window limits throughput on a path with a large bandwidth-delay product. The Window Scale option allows windows larger than 65,535 bytes; it is negotiated during the handshake.

Each TCP direction has its own send and receive windows. The receive window is the number of bytes that can still be accepted starting at the next expected ACK number; it limits how far the sender may put byte sequence into the network to protect the peer's buffer. The send window tracks acknowledged bytes, bytes in flight, and bytes the sender is allowed to transmit. Sending can also be limited by the congestion window, so receiver flow control and network congestion control are independent constraints.

An advancing ACK moves the left edge of the offered window forward; as the receiver reads data from its buffer, it can move the right edge forward with a window update. Let `SND.UNA` be the first unacknowledged byte, `SND.WND` the offered window, and `SND.NXT` the next byte the sender will send. Usable window space is roughly `SND.UNA + SND.WND - SND.NXT`. TCP tries to avoid moving the right edge backward (window shrinking), even if that means advertising a smaller window.

## Zero window and persist

The receiver may advertise a zero window when its buffer is full. The sender pauses data but uses a persist timer and probe to learn when the window reopens, avoiding deadlock if a window update was lost. An application that reads its socket slowly can cause a zero window even when the network is healthy.

A window update is usually a pure ACK, so it is not retransmitted like data bytes. If an update that opens the window is lost, sender and receiver may both wait. The persist timer periodically probes with a small segment that makes the peer send an ACK containing the current window; probe intervals commonly back off. Persist differs from the retransmission timer: it breaks a closed-window deadlock and may continue for a long time while the peer advertises zero. This retains state and resources, so applications also need their own deadlines and timeout policy.

## Delayed ACK and Nagle's algorithm

The receiver may briefly delay an ACK to combine responses; the sender uses Nagle's algorithm to group small bytes while data remains unacknowledged. Together, in a small request-response application, they can add significant latency if the endpoints wait for each other.

Disabling Nagle can help latency-sensitive small workloads but increases segment count. Optimization should be measured and consider application framing and buffering. `TCP_NODELAY` is not an “increase Internet speed” switch.

Delayed ACK reduces ACK traffic and may be piggybacked on data sent in the reverse direction, but it can also add latency.

For example, a client writes a small first part of a request, then writes the rest to the socket before the first part is acknowledged. Nagle holds the later bytes in the send buffer. The server cannot respond to the incomplete request, while its TCP briefly delays the ACK to combine acknowledgments. If no other ACK or data breaks the wait, the delayed-ACK timer expires, releases the ACK, and lets the client transmit the rest. Only some batching and request/response patterns create this situation; not every small message is delayed. For latency-sensitive interactive workloads, consider `TCP_NODELAY` or changing application batching after measurement; it is not a setting to enable indiscriminately.

## Silly window syndrome and buffer autotuning

If a receiver continually advertises very small windows, the sender may transmit many small segments. Algorithms that avoid silly window syndrome try to batch data or wait until enough is available. Modern TCP stacks autotune buffers, but configured limits can affect throughput.

Silly window syndrome (SWS) occurs when the sender repeatedly sends tiny payloads or the receiver repeatedly advertises tiny windows. Receiver-side avoidance usually waits for enough free buffer before advertising a larger window. Sender-side avoidance groups small bytes until it can send near an MSS, a meaningful fraction of the largest window seen, or the remaining data under Nagle's conditions. The algorithm must avoid shrinking the window's right edge, which complicates progress.

A small receive buffer limits the receive window, which limits in-flight data and throughput even when the link has spare capacity. The window needs to cover the bandwidth-delay product (bandwidth × RTT), but oversized buffers consume memory and may increase queueing delay. Many TCP stacks adjust send and receive buffers based on reading rate, RTT, and administrative limits. Sysctl names, defaults, and autotuning algorithms in *TCP/IP Illustrated* refer to older Linux 2.4/2.6 and Windows XP/Vista/7 versions; do not use them as current configuration guidance.

## Summary

- A sliding window allows multiple bytes in flight.
- The receive window is flow control; the congestion window is congestion control.
- A zero window commonly reflects receiver buffering and uses persist probes.
- Delayed ACK and Nagle can interact to cause waits for small messages.
- Disabling Nagle or increasing buffers should be benchmarked for the workload.

## Check your understanding

**Does a large receive window mean the network is uncongested?** No. It is a receiver limit; the congestion window is separate.

**Does a zero window mean the server is offline?** No. The receiver may be busy or its buffer may be full.

**Does disabling Nagle always make an application faster?** No. It can increase overhead and small packets.

## Read next

Congestion control adjusts sending based on network conditions, not only peer buffering.
