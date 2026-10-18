---
title: "Network security foundations and TLS"
category: "Network"
tags: ["network", "security", "tls", "cryptography"]
description: "Distinguish confidentiality, integrity, and authentication, and follow how TLS protects an application connection."
sources:
  - title: "DNS Queries over HTTPS (RFC 8484)"
    url: "https://www.rfc-editor.org/rfc/rfc8484.html"
  - title: "TLS Encrypted Client Hello (RFC 9849)"
    url: "https://www.rfc-editor.org/rfc/rfc9849.html"
updated: 2026-10-17
translationKey: "network/network-security-foundations-tls"
---

Network security is not a single property. A protocol may encrypt data but fail to authenticate the correct peer, or authenticate a peer without protecting data after the session ends. Before choosing a technology, identify the attacker, assets to protect, and trust boundaries.

## Three basic goals

- **Confidentiality:** outsiders cannot read the content.
- **Integrity:** unauthorized changes are detected.
- **Authentication:** identify a peer, key, or data source under a policy.

The classic CIA triad means confidentiality, integrity, and availability. Authentication, authorization, non-repudiation, and auditability are related properties but are not the same as CIA. Encryption, for example, can keep content secret without proving that the recipient is authorized to use it; a signature can bind a message to a key without keeping a service available.

When analyzing a threat model, distinguish passive and active attacks. Eavesdropping can reveal unencrypted content. Even with correctly encrypted payloads, traffic analysis can still reveal correspondents, timing, or sizes. Modifying, deleting, reordering, or replaying messages are active attacks; DoS targets availability. Encryption reduces some risks, but does not hide all metadata, prevent every replay if the protocol lacks freshness, or stop flooding.

## Security at different layers

Link-layer protection covers one hop; network-layer protection such as IPsec can protect between hosts or gateways; TLS protects a connection between processes/TLS endpoints; DNSSEC authenticates DNS data through a hierarchy; DKIM signs selected email content for a sending domain. Choose a layer based on the trust boundary: when a proxy or VPN gateway decrypts/terminates protection and forwards traffic, the next segment may need separate protection.

Symmetric encryption uses the same secret to encrypt and decrypt; public-key cryptography supports key agreement and signatures but has greater cost. A hash detects changes but does not authenticate if an attacker can replace the hash too; a MAC uses a shared secret; a digital signature ties data to a private key trusted by the verifier.

## TLS handshake at a high level

A TLS client and server negotiate a version and cipher suite, validate certificates according to policy, establish keys, and then protect application data with the record protocol. TLS 1.3 reduces handshake round trips compared with older versions in common cases. TLS does not hide the destination IP, packet sizes, or timing. DoH encrypts DNS exchanges between a client and resolver; ECH can hide the true SNI hostname from on-path observers when deployed correctly, but still exposes the destination IP and some metadata ([RFC 8484](https://www.rfc-editor.org/rfc/rfc8484.html), [RFC 9849](https://www.rfc-editor.org/rfc/rfc9849.html)).

The source address in an IP header does not prove who sent a packet: IP spoofing can forge it, complicating attribution and some kinds of response. Protection belongs where enough context exists: filtering invalid sources at network edges reduces spoofing, while TLS authenticates endpoints and protects content under certificate policy. These are separate layers solving separate problems; TLS does not prevent every DoS/DDoS or spoofing in protocols without authentication.

A certificate binds a public key to an identity through a CA chain and hostname. The client must validate the chain, validity period, hostname, and policy. Accepting every certificate or disabling verification defeats protection against man-in-the-middle attacks.

## Keys, nonces, and forward secrecy

Ephemeral Diffie–Hellman can provide forward secrecy in a suitable design: later exposure of a long-term key does not necessarily decrypt previously recorded sessions. Nonces must be unique as required by the cipher; weak random numbers can break security. Do not design your own cipher or protocol.

## Where does TLS stop?

TLS protects one hop from the client to the TLS endpoint. If a proxy or terminator decrypts and forwards plaintext, the next hop needs protection too. TLS does not solve application authorization, injection, compromised endpoints, or insecurely stored secrets.

## Summary

- Confidentiality, integrity, and authentication are distinct goals.
- Hashes, MACs, signatures, and encryption have different semantics.
- TLS authenticates peers under certificate policy and protects data on the connection.
- Disabling certificate validation defeats server authentication.
- TLS protects up to its termination endpoint; it does not replace authorization or application security.

## Check your understanding

**Does HTTPS mean data remains safe after the server decrypts it?** No. TLS protects data in transit; the application must protect it afterward.

**Does a file hash prove authorship?** Not without a trusted MAC or signature and trust anchor.

**Does TLS prevent every man-in-the-middle attack if the client skips verification?** No.

## Read next

IPsec protects traffic at the IP layer; EAP/802.1X controls access to a LAN.
