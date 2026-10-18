---
title: "Hashes, MACs, signatures, and key agreement in networking"
category: "Network"
tags: ["network", "cryptography", "mac", "key exchange"]
description: "Distinguish cryptographic primitives and see how protocols combine them for confidentiality, integrity, and authentication."
updated: 2026-10-16
translationKey: "network/cryptographic-primitives-key-agreement"
---

Secure protocols use cryptographic primitives with different purposes. Choosing the wrong primitive or assembling them yourself is often more dangerous than using a vetted protocol library.

## Hashes and MACs

A cryptographic hash maps bytes to a fixed-size digest and is designed to make preimages and collisions difficult under the relevant security standard. A public hash does not prove who created the data. HMAC combines a hash with a secret key to authenticate integrity between parties that share the key.

## Digital signatures

A private key signs; a public key verifies. A signature binds data to a key, but the identity is trustworthy only when the public key is authenticated through a certificate/PKI or a trusted channel. A signature does not encrypt the payload.

## Key agreement and forward secrecy

Diffie–Hellman or ECDH lets two parties create a shared secret over a public channel; the handshake must authenticate the parties to prevent a man-in-the-middle attack. Ephemeral key exchange can provide forward secrecy if ephemeral private keys are erased after the session. Historical RSA key transport has different semantics.

DH alone only lets both sides create a secret. If the public values are unauthenticated, Mallory can stand between the parties, create two different shared secrets, and relay their data. A signature/certificate or trusted channel must bind the exchange to the correct peer. Forward secrecy describes the effect of a later compromise of a long-term key; it does not save a session if an endpoint or ephemeral secret is compromised while the session is active.

Protocols often use hybrid cryptography: public-key operations authenticate or agree on a session key, then a symmetric cipher handles most data because it is faster. A KDF derives purpose-specific keys from input secrets; do not reuse one shared secret for every function outside the protocol's design.

### Nonces, salts, and random sources

A nonce ties an exchange or transaction to a particular use and supports freshness; a salt makes secret hashes more independent and hinders reuse of lookup tables across identical values. They are not interchangeable and do not protect content by themselves. Keys and challenges need unpredictability when the protocol requires it. A nonce need not be random: a counter can work if it guarantees no reuse under the same key, as in [RFC 5116](https://www.rfc-editor.org/rfc/rfc5116.html#section-3.2). A pseudorandom generator intended for simulation may be predictable and unsuitable for keys.

## AEAD

Authenticated Encryption with Associated Data (AEAD) encrypts a payload and authenticates the ciphertext together with associated data such as a header. Nonce or IV uniqueness is critical; reuse can expose or enable forgery of data, depending on the cipher.

Cryptographic hashes and checksums/FCS solve different problems. Checksums and CRCs mainly detect accidental transmission errors. A public hash creates a fingerprint, but anyone can recompute it, so it does not prove the sender. A MAC such as HMAC needs a shared secret and authenticates a message among parties holding that secret. Digital signatures use a private key to sign and a public key to verify, but do not encrypt data and require an authenticated public key. A MAC does not provide non-repudiation when multiple parties share the secret.

A cipher suite specifies algorithms according to the protocol version. Older TLS suites can combine key exchange, authentication, and record protection; TLS 1.3 separates key exchange/signatures from the suite, which selects AEAD and the hash used with HKDF ([RFC 8446](https://www.rfc-editor.org/rfc/rfc8446.html#section-4.1.2)). Changing primitives independently can support evolution, but both endpoints must agree on a compatible suite. DES/3DES, SHA-1, suite names, key lengths, and implementation advice in a 2012 book are time-specific details, not current configuration recommendations.

## Summary

- A hash detects changes but does not authenticate the source.
- A MAC authenticates with a shared secret; a signature uses a key pair.
- Key agreement requires authentication to prevent man-in-the-middle attacks.
- Ephemeral DH can provide forward secrecy.
- AEAD protects confidentiality and integrity; use nonces correctly.

## Check your understanding

**Does a SHA-256 digest prove the publisher's identity?** No, not without a trusted signature or MAC.

**Does ECDH authenticate the server by itself?** No.

**Can an AEAD nonce be reused arbitrarily?** No. Follow the cipher's requirements.

## Read next

TLS combines certificates, key agreement, signatures, and AEAD in its handshake protocol.
