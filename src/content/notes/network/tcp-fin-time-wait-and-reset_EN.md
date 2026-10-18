---
title: "Closing a TCP Connection: FIN, TIME_WAIT, and RST"
category: "Network"
tags: ["network", "tcp", "connection"]
description: "Trace TCP half-close, the closing handshake, TIME_WAIT, and reset to understand why a port may not be reusable immediately."
updated: 2026-10-16
translationKey: "network/tcp-fin-time-wait-and-reset"
---

TCP is full-duplex: each direction of the byte stream can end independently. FIN says that the sender has no more data to send in that direction; ACK acknowledges bytes or FIN. Since the two directions close independently, a normal connection close usually takes several steps.

## FIN and half-close

After sending FIN, an endpoint can still receive data from the other direction. An application may use a half-close to say “I have finished sending the request” while continuing to read the response. The kernel keeps state until the other direction closes or a timeout expires.

## TIME_WAIT

The endpoint that actively closes usually enters TIME_WAIT so it can acknowledge a retransmitted FIN and ensure old segments are not mistaken for a new connection using the same tuple. The duration depends on the TCP implementation. Many TIME_WAIT sockets do not necessarily indicate a leak; examine new-connection rate, tuple reuse, ephemeral ports, and server state.

## RST

RST resets a connection immediately, commonly when no listener exists on a port, an application aborts, or a packet does not match state. RST differs from FIN: FIN is an orderly close, while reset says not to continue the stream. Firewalls and middleboxes can also send RST, so packet captures at both endpoints help identify its source.

Use `ss -tan state time-wait` to view TIME_WAIT sockets and `ss -ltnp` to view listeners. Application logs alongside a packet capture can show whether the peer, process, or network closed the connection.

## Check your understanding

**Does FIN immediately close both directions?** No.

**Is TIME_WAIT always held by the server?** Usually the actively closing endpoint holds the state; it may be the client or server.

**Is RST equivalent to FIN?** No; reset interrupts immediately rather than closing in an orderly sequence.

## Further reading

After a connection is established, keepalive and application timeouts affect how quickly a lost peer is detected.
