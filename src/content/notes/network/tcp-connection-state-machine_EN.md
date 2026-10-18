---
title: "TCP handshake, connection teardown, and TIME_WAIT"
category: "Network"
tags: ["network", "tcp", "handshake", "time-wait"]
description: "Follow SYN/SYN-ACK/ACK, FIN/RST, and TCP states when connections open, close, or fail."
updated: 2026-10-16
translationKey: "network/tcp-connection-state-machine"
---

A TCP connection is not a fixed physical wire; it is state at the two endpoints identified by source/destination addresses and ports plus protocol. The handshake establishes sequence space and some options; closing is a separate state exchange.

## Three-way handshake

1. The client sends SYN with its Initial Sequence Number (ISN).
2. The server replies with SYN-ACK, acknowledging the client's ISN and providing its own ISN.
3. The client ACKs; both sides can send data under the established state.

The SYN bit consumes one sequence number in addition to any application bytes present; in the no-data handshake shown here, SYN and SYN-ACK each consume one position ([RFC 9293](https://www.rfc-editor.org/rfc/rfc9293.html#section-3.4)). Each side therefore acknowledges the peer's ISN with ISN+1. The handshake negotiates capabilities/options and proves both directions can receive the initiating messages; it **does not authenticate the server's identity**. TLS or an application protocol provides identity and data protection. If SYN or SYN-ACK is lost, TCP retries with timers and increasing wait intervals; timing and retry count depend on the stack and policy, so packet-trace numbers in a book are not a general SLA.

The SYN queue/backlog is affected by server load and configuration. SYN cookies mitigate some queue-exhaustion attacks; they do not replace firewalls or comprehensive connection limits.

## Closing both directions

TCP is full duplex; each direction of the byte stream can end separately. FIN says the sender has no more data in that direction; the peer can ACK and continue sending in the reverse direction. This is a half-close. RST aborts a connection abruptly or reports that no suitable endpoint/listener exists.

Calling `close()` in an application does not necessarily make the peer see EOF immediately if data remains buffered or unsent. Semantics depend on socket options, shutdown, and errors.

A graceful close commonly has four steps: FIN, ACK, FIN in the reverse direction, final ACK. One side's FIN closes only its sending direction; the peer can still send a response before closing its own direction. Both sides can actively open or close simultaneously; the state machine supports these less common cases. RST aborts: queued data may be discarded and the peer sees an error instead of normal EOF. Do not conflate RST and FIN in a capture.

## TIME_WAIT

The actively closing side commonly enters TIME_WAIT to keep old segments from being confused with a new connection using the same tuple and to retransmit the final ACK if needed. TIME_WAIT holds temporary state; a high count may reflect many short connections but is not automatically a leak requiring a kernel safeguard to be disabled.

TIME_WAIT is commonly described as waiting for 2×MSL: if the final ACK is lost, the peer sends FIN again and the endpoint still holding state can ACK it. MSL and TIME_WAIT duration are implementation policies; do not treat a timer or old sysctl name from a book as universal kernel behavior. `SO_REUSEADDR` semantics vary by OS and do not automatically make reusing the same 4-tuple safe. TCP must protect a new connection instance from delayed segments belonging to an old one; timestamps can help distinguish them when protocol conditions permit.

Port and tuple reuse are constrained by state, sequence numbers, and socket options. `SO_REUSEADDR`/`SO_REUSEPORT` have OS-specific semantics; do not use them as a way to “remove every port limit.”

## Half-open connections and timeouts

One side may believe a connection is open while the other has restarted or lost network access. TCP detects this through timeout/retransmission, keepalive, or an application heartbeat; it cannot instantly detect every unplugged cable. Application deadlines should be shorter than an unbounded wait.

If a peer has forgotten the connection (for example, after reboot), the next data segment commonly receives RST because no matching state remains. RST sent to a port without a listener is also how TCP reports connection refused; this differs from UDP, where a closed port is commonly reported through ICMP. A spoofed reset can interrupt a connection if it matches the tuple and passes sequence/window checks, so stacks apply stricter validation. TLS protects payload but does not prevent every TCP-layer DoS.

TIME_WAIT Assassination is a state error where an old RST causes an endpoint to leave TIME_WAIT too early, creating a risk that old segments are confused with a new connection instance. Defenses depend on the TCP implementation; this is one reason not to remove state or shorten timers casually.

## Attacks on connection management

A SYN flood sends many incomplete handshakes to exhaust state or queue space reserved for SYN_RCVD. SYN cookies let a server defer allocating state until the client ACKs the SYN-ACK; this reduces pressure but does not stop every flood and trades off some options. Rate limiting, spoofed-source filtering at the edge, adequate capacity, and queue monitoring still matter.

An attacker may also forge SYN/RST/ACK segments to disrupt a connection if it guesses the 4-tuple and a valid sequence/window. Hard-to-predict ISNs, strict RST checks, TCP-AO where supported, and contextual ICMP filtering reduce risk. TCP-AO requires shared keys managed outside the mechanism; TLS encrypts/authenticates the application stream but cannot stop queue exhaustion or link disruption.

## Summary

- The handshake exchanges ISNs and establishes state/options.
- FIN closes one direction; TCP supports half-close.
- RST resets abruptly; timeouts handle an unresponsive peer.
- TIME_WAIT protects tuple and ACK correctness; it is not necessarily a leak.
- Connection state lives at both endpoints, while middleboxes may expire state earlier.

## Check your understanding

**Does the three-way handshake authenticate the server?** No. TLS or application authentication does that.

**Does FIN immediately close both directions?** No. It closes the sender's direction.

**Does a growing TIME_WAIT count mean the kernel timer should be shortened immediately?** No. First inspect connection lifecycle and client/server design.

## Read next

When segments are lost or delayed, TCP estimates RTT and retransmits using timeout and SACK mechanisms.
