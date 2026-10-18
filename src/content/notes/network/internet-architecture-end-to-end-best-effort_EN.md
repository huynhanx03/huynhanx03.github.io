---
title: "Internet architecture: datagrams, best effort, and end-to-end"
category: "Network"
tags: ["network", "internet", "architecture"]
description: "Learn the Internet's foundational choices: packet switching, datagrams, best effort, message boundaries, end-to-end, and fate sharing."
updated: 2026-10-16
translationKey: "network/internet-architecture-end-to-end-best-effort"
---

The Internet was designed to connect different networks and let many flows share transmission links. Routers forward datagrams using addresses in each packet instead of reserving a separate circuit for every exchange. This helps the network adapt when paths change, but a flow's quality depends on other traffic sharing its bottlenecks.

## Packet switching and datagrams

In circuit switching, resources or a path are reserved for a connection for some time. Packet switching divides data into packets so traffic can be multiplexed as needed; queues and routers process packets as they arrive. A datagram carries source and destination information in every packet, so the core network need not maintain connection state like a virtual-circuit network.

In return, datagrams may be lost, duplicated, reordered, or routed along different paths. IP offers best-effort delivery: routers try to forward packets but do not promise reliable, ordered delivery. TCP or an application can add the semantics it needs at the endpoints.

### How is a datagram network different from a connection-oriented network?

A **virtual-circuit** network may establish a connection before sending data. Each packet carries a short label used by switches to look up per-connection state, and signaling creates and removes state along the path. In a **datagram** network, every packet carries enough source and destination addressing for the network to forward it independently; routers need not store state for each exchange. This reduces dependence on setting up a fixed path and keeps the core simpler, but each datagram carries addressing information and reliability or ordering is usually handled at the endpoints. “Connectionless” IP does not prevent an application from using a transport connection such as TCP.

## Best effort, error detection, and rate control

**Best effort** does not mean the network ignores errors. A link may detect bit errors with a checksum or CRC and discard a damaged frame; some links can also correct some errors. But IP does not promise to retransmit a lost datagram, remove duplicates, or reorder packets. An application that needs reliable delivery can use TCP or implement suitable semantics; lower-layer retransmission may improve performance but does not fully replace end-to-end acknowledgment.

**Error control** handles corrupted or lost data. **Flow control** adjusts the sending rate so the sender does not overwhelm the receiver's ability to consume data. On the Internet, IP usually does not regulate the rate between two applications. TCP implements end-to-end flow control; congestion control along the path is related but distinct from receiver-side flow control.

## Message boundaries differ from byte streams

Datagrams generally preserve message boundaries: one application send corresponds to one received unit, within protocol limits. TCP is a byte stream: several writes may be combined, or one write may be split across several reads. If an application needs framing, it must define its own length, delimiter, or record structure.

## End-to-end and fate sharing

The end-to-end argument says that some functions, such as confirming that an application received the correct data, can only be completed fully by the endpoints. The network can still provide error checking or retransmission to improve performance, but that does not replace application-level confirmation when correctness matters.

Fate sharing places state needed for a communication session at its endpoints: if the endpoint survives, a temporary network failure need not destroy all session state. Where to place state is a trade-off among reliability, latency, performance, and manageability.

This principle does not prohibit routers or links from providing error correction, retransmission, or security. Local functions can reduce errors and latency, but only the application has enough context to confirm the meaning of an operation—for example, whether a transaction was actually processed.

## Check your understanding

**Does best effort mean routers do nothing to forward packets?** No. They try to forward them but do not guarantee delivery.

**Does TCP preserve the boundary of each `write`?** No.

**Does end-to-end mean lower layers cannot provide reliability?** No. Lower layers can help performance, but the application must confirm its own required semantics.

## Read next

Protocol layers divide responsibilities among link, IP, transport, and application; encapsulation lets each layer handle its part.
