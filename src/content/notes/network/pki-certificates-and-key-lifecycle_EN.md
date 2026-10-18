---
title: "Certificates, CAs, and key lifecycle in PKI"
category: "Network"
tags: ["network", "security", "pki", "certificate"]
description: "Understand X.509 chains, hostname validation, revocation, and the operational responsibilities of private keys."
updated: 2026-10-16
translationKey: "network/pki-certificates-and-key-lifecycle"
---

A Public Key Infrastructure (PKI) associates a public key with an identity through certificates and a CA chain. A client trusts a set of trust anchors, verifies each certificate signature along the chain to an anchor, then checks hostname, time, and usage according to policy.

## X.509 chains

A leaf certificate commonly contains a subject/SAN, public key, validity interval, key usage, and issuer. An intermediate CA signs the leaf; a root CA is already trusted in the trust store. A root is not trusted merely because its self-signature is valid; trust comes from the client's installation and policy.

Hostname verification must match the SAN according to client rules; legacy CN-only behavior may be rejected. A certificate valid for a hostname does not by itself prove that the current backend is the intended service if the application connected to the wrong name.

A certificate also has a validity period, serial number, issuer, public key, and extensions that constrain use. `Basic Constraints` distinguishes CAs from end entities; `Key Usage` and `Extended Key Usage` limit operations or roles; a SAN can contain multiple DNS names; and AIA/CDP can point to issuer or status information. A client must understand and accept an extension marked critical, or certificate-path validation must fail according to the rules. A certificate binds identity to a key under a signed policy; it does not automatically grant application authorization.

Web of trust is a decentralized model based on endorsements among users. CA-based PKI builds a hierarchy from leaf through intermediates to a trust anchor already installed on the machine. A valid signature at every link is not enough: the client must also validate the path, validity period, purpose, identity/hostname, and policy.

## Expiration, revocation, and renewal

An expiring certificate needs renewal before its deadline and a correct service reload. CRL and OCSP revocation each have availability, privacy, and caching trade-offs; some clients soft-fail or do not check online. Do not rely on revocation as the only way to retire a compromised secret or key.

A CRL is a CA-signed list, usually containing revoked serial numbers and an update time. OCSP reports status for a specific certificate. In both cases, the client must trust the signature and chain and decide how to behave when status cannot be retrieved. Revoking a certificate does not erase an exposed private key, so the key and certificate must be replaced and every place using that secret must be addressed. An attribute certificate is a different structure for carrying attributes or authorization without the subject's public key; do not confuse it with a public-key identity certificate.

## Private keys

Protect private keys against unauthorized reading, backup, and logging; use an HSM or KMS when the threat model calls for it. Rotation needs an overlap period so clients and servers can update. A certificate may be copied to many servers, so understand the scope of a compromise.

## Summary

- A certificate connects a public key to an identity through a CA chain.
- Trust anchors come from a trust store and policy, not only mathematical signatures.
- Hostname, validity period, and key usage all require validation.
- Revocation and renewal have operational and availability trade-offs.
- Private-key lifecycle is central to TLS and IPsec security.

## Check your understanding

**Does a correctly signed certificate chain mean the client should trust it?** Not yet. The chain must reach a trust anchor and satisfy hostname and policy checks.

**Can a certificate for `api.example.com` be used for every subdomain?** No, unless the SAN and wildcard rules allow it.

**Do clients always check OCSP and fail closed?** Client behavior varies.

## Read next

Return to [TLS](/en/notes/network/network-security-foundations-tls/) to connect PKI to the handshake.
