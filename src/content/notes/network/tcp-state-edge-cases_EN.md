---
title: "TCP State: Half-Close, Simultaneous Open, and Reset"
category: "Network"
tags: ["network", "tcp", "state machine", "rst"]
description: "Trace less common transitions, incoming queues, half-open states, and the meaning of RST and TIME_WAIT."
updated: 2026-10-16
translationKey: "network/tcp-state-edge-cases"
---

TCP has many states because the two stream directions can close independently, handshakes can time out, and packets can arrive late. Remembering only “SYN, then ACK, then FIN” is not enough to debug a real server.

## Half-close

After one side sends FIN, it indicates that it has no more data to send in that direction. It can still receive bytes from its peer until the other direction closes. An application can call `shutdown(SHUT_WR)` and continue reading a response; closing the entire socket too early may lose data at the application level.

## Simultaneous open and close

Both endpoints may send SYN at the same time in some protocol workflows, or may begin closing simultaneously. The state machine has transitions for these cases; do not assume the client is always the active opener and the server is always a passive listener.

## RST and half-open connections

RST immediately cancels state or reports an invalid port or connection. A server may reset when an application aborts a socket; a middlebox may also send a reset. If a host restarts, its peer may retain old state and send segments to an endpoint that no longer exists—one form of a half-open connection.

## TIME_WAIT and the incoming backlog

TIME_WAIT protects the tuple and sequence space after an active close. A listener may have one queue for handshakes in progress and another for established connections waiting for `accept`; exact limits and names depend on the kernel. A full queue can drop SYNs or delay connections, but raising the backlog does not solve sustained capacity problems.

## Summary

- FIN closes one direction; a half-close lets the other side continue sending.
- Simultaneous open and close have valid state transitions.
- RST differs from FIN: reset is not graceful.
- TIME_WAIT reduces confusion from old segments and preserves the chance to send the final ACK.
- Backlog is a kernel queue, not a limit on workers or total connections.

## Check your understanding

**Can a socket still receive bytes after FIN?** Yes, in the opposite direction.

**Does RST always come from the application?** It may come from the kernel or a middlebox.

**Does a full backlog always mean the process has used all its workers?** It may be the accept or handshake queue; inspect which one.

## Further reading

Timeouts and retransmission keep a connection progressing when an ACK is lost or delayed.
