---
title: "TLS: Certificate Name Validation, SNI, and Trust Chains"
category: "Network"
tags: ["network", "tls", "pki", "https"]
description: "Follow how a client selects a certificate using SNI and validates its chain, hostname, expiration, and trust store."
sources:
  - title: "Service Identity in TLS"
    url: "https://www.rfc-editor.org/rfc/rfc9525.html"
  - title: "The Transport Layer Security (TLS) Protocol Version 1.3"
    url: "https://www.rfc-editor.org/rfc/rfc8446.html"
  - title: "TLS Encrypted Client Hello"
    url: "https://www.rfc-editor.org/rfc/rfc9849.html"
updated: 2026-10-17
translationKey: "network/tls-certificate-name-validation-sni"
---

TLS encrypts a channel, but the client must verify that it is talking to the right server. A certificate contains a public key and an identity signed by a CA; the client checks the signature chain up to a configured trust anchor. Encryption without identity verification can still mean encrypting traffic to an impostor.

## Trust chain and hostname

The client checks that the certificate is valid at the current time, has an appropriate usage, has a valid signature chain, and contains the requested hostname in its Subject Alternative Name. The operating system, runtime, or application manages the trust store. A missing intermediate certificate may cause one client to fail while another succeeds after downloading the intermediate.

## SNI and multiple virtual hosts

A single IP can serve multiple hostnames. The client sends Server Name Indication (SNI) in its ClientHello so the server can select the appropriate certificate and configuration. SNI helps select a configuration; it does not authenticate the server.

Encrypted ClientHello (ECH) can encrypt the inner ClientHello, including the real hostname in SNI, when the client and server infrastructure support and correctly configure it. The outer ClientHello still contains a public name used to reach the fronting server. ECH does not hide the destination IP or replace certificate verification. A server may process the outer ClientHello when it cannot accept ECH, but the client must detect rejection and cannot use that connection for application data; depending on policy, it can retry with a fresh ECH configuration or abort ([RFC 9849](https://www.rfc-editor.org/rfc/rfc9849.html)).

## Troubleshooting

`openssl s_client -connect host:443 -servername host -showcerts` inspects the handshake and received chain. `curl -v` helps identify hostname or CA errors; do not fix them in production by turning off certificate verification. Check the system clock too, since an incorrect time can make a certificate appear not yet valid or expired.

## Check your understanding

**Does a CA-signed certificate make every hostname valid?** No; the client checks the SAN.

**Does SNI prove the server's identity?** No.

**Is disabling verification a TLS fix?** No; it removes server authentication.

## Further reading

The TLS handshake negotiates ciphers and keys; the record layer then protects application data.
