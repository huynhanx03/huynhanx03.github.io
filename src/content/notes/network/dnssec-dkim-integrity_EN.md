---
title: "DNSSEC and DKIM: authenticating DNS and email"
category: "Network"
tags: ["network", "dnssec", "dkim", "email security"]
description: "Understand the DNSSEC chain of trust and DKIM signatures, and what neither mechanism guarantees."
sources:
  - title: "DNS Security Introduction and Requirements (RFC 4033)"
    url: "https://www.rfc-editor.org/rfc/rfc4033.html"
  - title: "Resource Records for the DNS Security Extensions (RFC 4034)"
    url: "https://www.rfc-editor.org/rfc/rfc4034.html"
  - title: "Protocol Modifications for the DNS Security Extensions (RFC 4035)"
    url: "https://www.rfc-editor.org/rfc/rfc4035.html"
  - title: "DNS64: DNS Extensions for Network Address Translation from IPv6 Clients to IPv4 Servers (RFC 6147)"
    url: "https://www.rfc-editor.org/rfc/rfc6147.html"
  - title: "Secret Key Transaction Authentication for DNS (TSIG) (RFC 2845)"
    url: "https://www.rfc-editor.org/rfc/rfc2845.html"
  - title: "DNS Request and Transaction Signatures (SIG(0)) (RFC 2931)"
    url: "https://www.rfc-editor.org/rfc/rfc2931.html"
  - title: "Secret Key Establishment for DNS (TKEY) (RFC 2930)"
    url: "https://www.rfc-editor.org/rfc/rfc2930.html"
  - title: "DomainKeys Identified Mail (DKIM) Signatures (RFC 6376)"
    url: "https://www.rfc-editor.org/rfc/rfc6376.html"
  - title: "Cryptographic Algorithm and Key Usage Update to DKIM (RFC 8301)"
    url: "https://www.rfc-editor.org/rfc/rfc8301.html"
  - title: "A New Cryptographic Signature Method for DKIM (RFC 8463)"
    url: "https://www.rfc-editor.org/rfc/rfc8463.html"
updated: 2026-10-17
translationKey: "network/dnssec-dkim-integrity"
---

DNSSEC and DKIM use digital signatures to authenticate data in different systems. DNSSEC authenticates DNS records through a chain of trust; DKIM attaches a signature to selected email headers and body content for a sending domain. Neither mechanism encrypts content or proves that a particular human is trustworthy.

## The DNSSEC chain

A zone signs record sets with a private key. DNSKEY and RRSIG records, together with DS records in the parent zone, connect the trust chain to the resolver's trust anchor. NSEC/NSEC3 can prove that a name or record does not exist according to the protocol.

A validating resolver checks signatures, validity, and the chain. If signed data is invalid, it may be treated as bogus and return SERVFAIL. Key rollover, delegation, and the registrar's DS record must be operated in sync.

In a query, the `DO` bit in the EDNS OPT record indicates that the client wants DNSSEC records. The `CD` bit in the DNS header tells the recursive resolver that the client wants data returned even if the resolver's validation fails, so the client can check it itself. In a response, the `AD` bit is the resolver's assertion that the relevant data was authenticated. A client should rely on it only when it trusts the resolver and has a secure path to that resolver ([RFC 4035](https://www.rfc-editor.org/rfc/rfc4035.html)).

A validating resolver classifies data as secure, insecure, bogus, or indeterminate. A delegation with no DS record may be authenticated as insecure; however, if a zone is validated as secure but a required signature is missing, the data may be bogus. Interpret a missing signature in the context of the chain of trust.

DNSKEY publishes a zone's public key; DS in the parent contains a digest that links a child zone key into the chain; and RRSIG signs an RRset. NSEC/NSEC3 lets a resolver authenticate a negative answer, such as the absence of a name or record type. NSEC exposes the ordering of zone names and may allow zone enumeration. NSEC3 hashes names, but does not make DNS secret: guessable names can still be tried, and DNSSEC provides neither confidentiality nor DoS protection. DNSSEC authenticates DNS data, not application users.

DNSSEC and transaction authentication protect different things. TSIG uses a shared secret to authenticate a DNS transaction such as a dynamic update or zone transfer; SIG(0) uses a key pair; TKEY supports key establishment in some designs. They do not by themselves validate that zone contents are correct. DNSSEC protects the origin and integrity of RRsets, but does not authorize zone updates. The mechanisms can be used together.

DNS64 may synthesize an AAAA record from an A record. The synthesized AAAA is not an original signed RRset, so the resolver must coordinate synthesis with DNSSEC validation; otherwise, a validating client may treat the synthetic data as bogus. [RFC 6147](https://www.rfc-editor.org/rfc/rfc6147.html) describes DNS64's interaction with DNSSEC and its limits.

## DKIM

The sender chooses header and body canonicalization rules and signs with a private key. The public key is published in DNS under a selector. The receiver looks up the key, verifies the signature, and may use the result together with SPF/DMARC when deciding how to handle the message.

DKIM proves that the message was signed by the corresponding key and that selected content has not changed under the signing rules; it does not prove the human author or guarantee that the message is not phishing. Forwarding or mailing-list modification can affect the signature, depending on what changes.

The selector `s=` and signing domain `d=` identify a TXT public-key record at a name such as `<selector>._domainkey.<domain>`. The `h=` tag lists the signed header fields; `bh=` is the body digest; and `b=` contains the signature over those fields and the canonicalized `DKIM-Signature` header (with the `b=` value empty during signing) ([RFC 6376](https://www.rfc-editor.org/rfc/rfc6376.html)). Canonicalization permits some common formatting changes while keeping the signature valid, but cannot guarantee that every part of a message's content or metadata is signed. DKIM confirms that the domain owning the key signed the message; that is not necessarily the displayed author or sender mailbox. SPF and DKIM can complement one another; recipient policy such as DMARC is a separate decision layer.

## Trust and key management

A signature is useful only if its public key or chain is distributed through a trusted source and the private key remains protected. Design rotation, revocation, TTL caching, and incident response. Hash and signature algorithms can be deprecated when they are no longer safe; DKIM algorithm requirements were updated by RFC 8301 and RFC 8463.

## Summary

- DNSSEC authenticates DNS data through a chain; it does not encrypt queries.
- DKIM verifies that selected email content was signed by a domain key identified by a selector.
- TSIG authenticates DNS transactions; it does not replace DNSSEC validation of RRsets.
- DNSSEC does not encrypt, prevent DoS, or stop NSEC from exposing zone names.
- Neither mechanism proves that a human sender is trustworthy or that content is safe.
- DNS key and DS rollover need coordination and monitoring.
- Trust depends on private-key protection and correct public-key validation.

## Check your understanding

**Does DNSSEC make DNS queries private?** No.

**Does a DKIM pass mean an email is not phishing?** No. An attacker can sign with their own domain.

**Is having a public key enough to trust a signature?** The distribution source and validation chain must be trusted.

## Read next

The Network Services topic connects security to firewalls, NAT, and naming services.
