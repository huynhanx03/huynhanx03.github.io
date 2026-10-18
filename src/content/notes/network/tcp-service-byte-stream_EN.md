---
title: "TCP service model: byte streams, ports, and reliability"
category: "Network"
tags: ["network", "tcp", "transport", "socket"]
description: "Understand TCP's ordered byte stream, sequence/ACK behavior, and what transport reliability does not promise to applications."
sources:
  - title: "Transmission Control Protocol (TCP)"
    url: "https://www.rfc-editor.org/rfc/rfc9293.html"
  - title: "On the Implementation of the TCP Urgent Mechanism"
    url: "https://www.rfc-editor.org/rfc/rfc6093.html"
updated: 2026-10-17
translationKey: "network/tcp-service-byte-stream"
---

TCP creates a logical connection between two endpoints and provides an ordered byte stream, detecting loss and retransmitting within the connection. Applications write bytes; TCP may split or combine them into segments. One `write()` is not equivalent to one packet or one `read()` at the other end.

## Sequence numbers and acknowledgments

TCP numbers bytes in the stream. The receiver ACKs the next byte it wants (a cumulative ACK in the common model); the sender retains unacknowledged data for retransmission. Sequence numbers are modulo 32-bit, and the connection manages ISNs and windows to distinguish data within a session.

An ACK says the peer's TCP stack received bytes according to the protocol; it does not prove the application parsed them, stored them in a database, or completed work. A business-level confirmation requires an application response.

## Segment and header

The TCP header contains source/destination ports, sequence and acknowledgment numbers, flags, receive window, checksum, and options. MSS, window scale, SACK, and timestamps negotiate or exchange additional information. Options make the TCP header variable; it is not always 20 bytes.

IP may fragment under certain conditions, but TCP stacks commonly choose segments based on MSS/PMTU to avoid fragmentation. A host packet capture may show checksums or segment sizes that differ from the wire because of NIC offload (TSO/GSO/GRO); know where the capture was taken.

## A byte stream does not preserve message boundaries

If a sender writes `HELLO` and then `WORLD`, the receiver might read `HELLOWORLD`, `HEL` then `LOWORLD`, or another split. The application needs framing such as a length prefix, delimiter, or fixed-size record. Assuming one `read` gets a full header is a common error; loop until enough bytes arrive or EOF/error occurs.

## Reliability and limits

TCP retransmits lost segments, removes duplicates, and delivers data in order. If one byte is missing, later bytes may wait even if they have arrived (head-of-line blocking in the stream). Connections can reset or time out; applications need timeout, retry, and idempotency policies.

## ARQ: detect errors and resend

A checksum can detect many bit errors but usually cannot repair bad data. Another approach is an error-correcting code that recovers errors within its capability; TCP mainly uses Automatic Repeat Request (ARQ): the receiver ACKs valid data, while the sender retains unacknowledged copies for retransmission. If a segment fails its checksum, the receiver discards it; the sender sees a missing ACK or duplicate ACKs and infers that recovery is needed.

Sequence numbers distinguish new data from duplicates, and a lost ACK can make the sender retransmit data already received. The receiver recognizes duplicate sequence space and does not deliver those bytes twice to the application. Across a multi-hop IP path, packets can be lost, duplicated, or reordered; TCP reassembles an ordered byte stream before delivery. Thus, TCP reliability comes from state at the two endpoints, not from IP or Ethernet providing end-to-end reliability.

## Why use a sliding window?

Stop-and-wait allows only one packet to be outstanding for an ACK. In an idealized model that ignores processing and packet transmission time, throughput is roughly data size divided by RTT; with a large RTT, the sender spends most of its time waiting. A sliding window allows multiple unacknowledged bytes on the path; as ACKs advance, the window moves and frees send-buffer space. Useful window size is constrained by both the peer's receive capacity and network conditions: the receive window provides flow control, while the congestion window belongs to congestion control. These limits are not interchangeable.

TCP uses cumulative ACKs: ACK N confirms every byte before N in continuous order and reports N as the next byte expected. If there is a gap, the ACK usually stays at the beginning of the gap even if the receiver has buffered later data; SACK adds information about out-of-order blocks. An ACK is a transport-peer signal, not a guarantee that the application process handled or durably stored data.

## Retransmission timeout is an estimate

RTT varies with queues, endpoint load, and route. A timeout that is too short causes extra retransmissions when data is only delayed; one that is too long slows loss recovery and leaves the path idle. TCP samples RTT from ACKs, estimates variation, and selects an adaptive RTO; standards and implementations update algorithm details, backoff, and bounds over time. Do not use numeric examples from an older book edition as current fixed configuration values.

## TCP urgent data is not a true out-of-band channel

The URG flag and Urgent Pointer mark the boundary of urgent data in the byte stream; in the TCP model, the data remains in the same sequence space rather than using a separate connection. The Berkeley sockets API can expose the urgent byte through a separate `MSG_OOB` read; `SO_OOBINLINE` asks for it to remain in the normal receive stream. What the application observes therefore also depends on the API and implementation.

RFC 9293 specifies that the Urgent Pointer points to the sequence number of the byte immediately after urgent data. RFC 6093 explains why some implementations and older descriptions differ about this boundary, and recommends that new applications avoid the urgent mechanism because middleboxes can cause interoperability problems. A separate application-level control protocol or connection is usually clearer when a distinct control channel is needed.

## Summary

- TCP provides an ordered byte stream, not message boundaries.
- Sequence numbers and ACKs let TCP detect and retransmit lost bytes.
- TCP headers have options; MSS/PMTU and offload affect packet captures.
- A TCP ACK confirms transport receipt, not business processing.
- Reliable transport does not remove application timeout, reset, or retry semantics.

## Check your understanding

**Does one `write()` correspond to one `read()`?** No.

**Does a TCP ACK mean the peer's database committed?** No. That needs application-level confirmation.

**Does TCP preserve byte order after retransmission?** Yes, in the stream; loss of part of the stream can delay later bytes.

## Read next

A TCP connection is initialized and closed through a state machine; see the handshake and TIME_WAIT.
