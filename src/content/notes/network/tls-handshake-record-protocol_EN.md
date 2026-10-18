---
title: "The TLS Handshake and Record Protocol"
category: "Network"
tags: ["network", "tls", "handshake", "https"]
description: "Trace ClientHello/ServerHello, certificates, key derivation, and record encryption; distinguish TLS 1.2 from 1.3."
sources:
  - title: "The Transport Layer Security (TLS) Protocol Version 1.3 (RFC 8446)"
    url: "https://www.rfc-editor.org/rfc/rfc8446.html"
  - title: "Datagram Transport Layer Security Version 1.2 (RFC 6347)"
    url: "https://www.rfc-editor.org/rfc/rfc6347.html"
  - title: "The Datagram Transport Layer Security (DTLS) Protocol Version 1.3 (RFC 9147)"
    url: "https://www.rfc-editor.org/rfc/rfc9147.html"
updated: 2026-10-17
translationKey: "network/tls-handshake-record-protocol"
---

TLS negotiates security parameters, then protects application bytes with its record protocol. TLS 1.2 and TLS 1.3 have different handshake flows; do not combine every version into one sequence.

## A high-level TLS 1.3 handshake

In the certificate-based TLS 1.3 handshake with ephemeral (EC)DHE considered here, ClientHello lists supported versions, cipher suites, a key share, and extensions; ServerHello selects parameters and a key share. Both sides derive handshake and application traffic secrets. The server certificate and CertificateVerify authenticate the server, and Finished confirms the transcript using the negotiated key. Application Data is then protected with AEAD.

With PSK, peers need not send certificates/CertificateVerify; PSK-only mode can also omit a fresh key share. The certificate flow above therefore does not describe every handshake ([RFC 8446](https://www.rfc-editor.org/rfc/rfc8446.html#section-2.2)). Resumption or PSK can shorten the handshake; 0-RTT data has replay risk and is safe only for suitable, idempotent operations according to policy.

## How TLS 1.2 differs

TLS 1.2 supports more historical cipher and key-exchange suites and commonly needs more round trips; legacy RSA key exchange lacks forward secrecy. Modern configurations commonly prefer ECDHE with AEAD suites. TLS 1.3 removes many legacy algorithms and options.

## Record protocol and metadata

Records divide data into chunks and protect confidentiality and integrity; TCP still provides the underlying stream. TLS does not hide IP addresses, ports, packet sizes, or timing, and certificate/name visibility depends on protocol extensions. TLS termination at a proxy creates a new trust boundary.

In TLS 1.2, the record layer identifies handshake, alert, cipher-state changes, and application data; each direction has read and write state. Records split data into protocol-limited fragments, so application message boundaries are not preserved. The handshake prepares new state and Finished authenticates the transcript before application data is trusted. Older traces and message names in books describe TLS 1.2; do not apply that exact sequence to TLS 1.3.

Renegotiation once created a risk of joining an attacker-controlled prefix to a valid session if the new handshake was not bound to the previous one. The broader lesson is that each renegotiation must be channel-bound and transcript-authenticated; do not enable legacy renegotiation casually.

DTLS adapts TLS to datagrams that may be lost, reordered, or duplicated; handshake details vary by version. DTLS 1.2 uses record epochs and sequence numbers, retransmits handshakes in flights, and uses `HelloVerifyRequest` to send a cookie that checks whether the client can receive a response at its source address. DTLS 1.3 is based on TLS 1.3 and uses a cookie extension in `HelloRetryRequest`, with its own ACK/timer mechanism. Cookies help resist DoS attacks using spoofed source addresses, but do not stop real clients from sending excessive requests ([RFC 6347](https://www.rfc-editor.org/rfc/rfc6347.html), [RFC 9147](https://www.rfc-editor.org/rfc/rfc9147.html)).

## Summary

- The handshake negotiates algorithms and keys and authenticates a peer.
- TLS 1.3 uses key shares and traffic secrets; TLS 1.2 has more legacy suites.
- Certificate-chain and hostname validation are essential.
- 0-RTT reduces latency but requires replay-aware application semantics.
- Records protect application bytes, not all network metadata.

## Check your understanding

**Is TLS 1.3 0-RTT suitable for every POST request?** No; replay is a risk.

**Does TLS protect data after a proxy terminates it?** Not on the next hop unless it is encrypted again.

**Can hostname checking be skipped when a certificate is valid?** No.

## Further reading

Certificate lifecycle and CA chains determine whether a server identity can be trusted.
