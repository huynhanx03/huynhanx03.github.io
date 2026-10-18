---
title: "UDP-Lite and Partial Checksum Coverage"
category: "Network"
tags: ["network", "udp", "checksum", "transport"]
description: "Explore UDP-Lite for applications that can tolerate some payload errors and understand why it does not replace ordinary UDP."
updated: 2026-10-16
translationKey: "network/udp-lite-partial-checksum"
---

Standard UDP has two checksum choices: protect the entire datagram or, under IPv4 rules, omit the checksum. UDP-Lite is a separate transport for some applications that can use a payload even when some bits are corrupted, such as certain error-tolerant encoded media. The application selects how many initial bytes receive checksum protection; the UDP-Lite header must always be protected.

## Checksum coverage

UDP-Lite keeps an 8-byte header similar to UDP, but its **Checksum Coverage** field takes the place of UDP Length. A value of 0 means the checksum covers the whole datagram. A value of 8 or greater specifies how many bytes from the start of the UDP-Lite header are protected by the checksum; values 1–7 are invalid because the 8-byte header itself must be covered. UDP-Lite has its own IP protocol/Next Header number (136), so IP demultiplexes it separately from UDP (17), even though it uses port numbers.

Payload outside the checksum coverage may be delivered to an application despite bit errors in transit. This is useful only if the codec or application knows how to handle corrupted data; the application must define its semantics and protect important control information. Checksum coverage does not encrypt, authenticate the sender, or repair errors by itself. Nor does it disable link-layer FCS: if the link discards every damaged frame, corrupted payload never reaches UDP-Lite. Error tolerance needs a link mechanism that can pass errors in the insensitive portion onward ([RFC 3828](https://www.rfc-editor.org/rfc/rfc3828.html#section-4)).

## Compatibility and deployment

Both endpoints and socket APIs must support UDP-Lite and its send/receive coverage. An IP-forwarding router need not understand the transport, but firewalls must permit it and NAT must handle its protocol and mappings correctly. It is not automatically compatible with a service listening only on UDP. A middlebox may block or mishandle an unfamiliar protocol, so one cannot simply change the coverage field and send to an ordinary UDP port.

This is a specialized technique, not the default for every streaming application. Before using it, verify support at both endpoints, middlebox traversal, actual error tolerance of the payload, and separate integrity/authentication where needed.

## Summary

- UDP-Lite permits checksum coverage of part of a datagram; its header is always protected.
- Coverage 0 means the whole datagram; values of 8 or more specify protected bytes.
- Unchecked data may reach the application with errors; the application must know how to tolerate them.
- UDP-Lite uses IP protocol number 136, while UDP uses 17; these are not port numbers.
- End-to-end and middlebox support are required; a checksum is not authentication.

## Check your understanding

**Does coverage 4 mean only the first four bytes are protected?** It is invalid; the 8-byte header must be covered.

**Can UDP-Lite be sent to an ordinary UDP server on the same port?** Not necessarily. IP distinguishes UDP-Lite with a separate protocol number, and the socket must support it.

## Further reading

For standard UDP, an enabled checksum covers the entire datagram; see [UDP Checksums and IPv6](/en/notes/network/udp-checksum-and-ipv6/).
