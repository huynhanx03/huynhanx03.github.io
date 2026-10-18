---
title: "Nagle's Algorithm, Delayed ACKs, and TCP Latency"
category: "Network"
tags: ["network", "tcp", "latency"]
description: "Explain how Nagle's algorithm interacts with delayed ACKs, and how to measure the effect instead of disabling optimizations by guesswork."
sources:
  - title: "Congestion Control in IP/TCP Internetworks"
    url: "https://www.rfc-editor.org/rfc/rfc896.html"
  - title: "Requirements for Internet Hosts — Communication Layers"
    url: "https://www.rfc-editor.org/rfc/rfc1122.html"
  - title: "Transmission Control Protocol (TCP)"
    url: "https://www.rfc-editor.org/rfc/rfc9293.html"
updated: 2026-10-16
translationKey: "network/tcp-nagle-delayed-ack-latency"
---

TCP groups bytes into segments, and ACKs may be delayed briefly to reduce packet count. Nagle's algorithm limits sending many very small segments while earlier data is still unacknowledged, reducing overhead. Both mechanisms often improve efficiency, but some small request/response protocols can experience significant delay if the application waits at the wrong point.

## A latency pattern

An application writes a small first part of a request, then writes the rest to the socket. Nagle holds the later bytes because the first bytes remain unacknowledged. The receiver briefly delays its ACK to combine acknowledgments, while the server application lacks the complete request needed for its response. Unless another event breaks the wait, the delayed-ACK timer releases an ACK, allowing the sender to transmit the held bytes. This interaction depends on the workload; TCP does not always add a fixed delay.

## How to address it

First inspect packet captures on both ends, send and ACK timing, and the application's write/read API usage. The protocol can send a complete message, combine writes sensibly, or use TCP_NODELAY for latency-sensitive sockets. Disabling Nagle increases small-packet traffic and does not fix application buffering or network queueing.

`tcpdump` and Wireshark show segments and ACKs; `ss -ti` provides some TCP metrics. Host captures can be affected by segmentation or coalescing offload, so distinguish logical packets from frames on the wire.

## Check your understanding

**Does TCP_NODELAY always make an application faster?** No; it can increase packet rate and overhead.

**Is a delayed ACK a lost packet?** No.

**Does one application write always create exactly one segment?** No; TCP is a byte stream and may combine or split data.

## Further reading

When throughput or latency degrades, distinguish application buffering, flow control, congestion, and packet loss.
