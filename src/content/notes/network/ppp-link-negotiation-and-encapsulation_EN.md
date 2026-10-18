---
title: "PPP: encapsulation and point-to-point link setup"
category: "Network"
tags: ["network", "ppp", "link-layer", "lcp", "ncp"]
description: "Follow PPP framing, link negotiation with LCP, peer authentication, and network protocol setup with NCP."
updated: 2026-10-16
translationKey: "network/ppp-link-negotiation-and-encapsulation"
---

**Point-to-Point Protocol (PPP)** carries network-layer data over a link with two endpoints, such as a serial line or some WAN access links. On a dedicated PPP link, peers do not contend as stations sharing a Wi-Fi channel or historical half-duplex Ethernet do; modern full-duplex Ethernet also avoids that contention. PPP is more than a header: it is a set of mechanisms for establishing a link, negotiating options, authenticating peers, and configuring network protocols.

Remember the sequence: **physical link up → LCP negotiates the link → authenticate if requested → NCP configures each network protocol → exchange data → terminate the link**. Each direction can negotiate options independently; one peer proposing an option does not mean the other accepted it.

## What does a PPP frame look like?

A common HDLC-like frame is:

`Flag | Address | Control | Protocol | Information | FCS | Flag`

- **Flag `0x7E`** marks a frame boundary.
- **Address `0xFF`** and **Control `0x03`** are commonly constant; peers may omit them if they negotiate Address-and-Control-Field Compression (ACFC).
- **Protocol** identifies IPv4, IPv6, or a control message such as LCP. Protocol Field Compression (PFC) can shorten some protocol values to one byte when agreed; LCP still uses two bytes.
- **Information** carries a control packet or network-layer payload.
- **FCS** detects frame transmission errors, commonly with CRC-16; peers may negotiate CRC-32. FCS neither repairs errors nor provides encryption or authentication.

PPP packets do not all have a common Length field. Frame boundaries usually come from the underlying link. On serial links, flags and stuffing help distinguish boundaries without mistaking payload bytes for flags.

On asynchronous links, **byte stuffing** replaces an embedded `0x7E` with `0x7D 0x5E` and `0x7D` with `0x7D 0x5D`; the receiver reverses the transformation. ACCM (Asynchronous Control Character Map) defines control characters to escape, useful when equipment or software flow control such as XON/XOFF might interpret data bytes. On synchronous links, PPP uses **bit stuffing**: it inserts a zero after five consecutive one bits in the contents so a flag pattern cannot appear accidentally inside a frame.

PPP does not usually retransmit frames itself as an end-to-end reliability service. FCS detects a damaged frame; retransmission policy, if any, belongs to the implemented link mechanism. “Has an FCS” does not mean a frame is guaranteed to arrive.

## LCP establishes and negotiates the link

**Link Control Protocol (LCP)** opens, configures, tests, and closes a PPP link. An LCP packet uses Protocol `0xC021` and Code, Identifier, and Length fields. The Identifier lets a peer match a response to its request.

Configuration usually proceeds in both directions: each peer sends a `Configure-Request` with desired options. The other replies `Configure-Ack` if it accepts the entire set, `Configure-Nak` if it proposes different values, or `Configure-Reject` if it does not support an option. A peer may resend a revised request, so the handshake can take more than one request/response pair.

LCP also has terminate request/ack messages, echo request/reply for checking the peer, and other diagnostic/control messages. The **magic number** option can help detect loopback: if a value sent by one end returns as though the peer sent it, the link may be looping data back to its source.

Common options include:

- **MRU (Maximum Receive Unit):** the largest payload a peer wants to receive. The other peer should limit transmitted frames accordingly. A smaller value may reduce waiting behind a large frame on a slow link, at the cost of more overhead.
- **ACCM:** selects control characters to escape on an asynchronous link.
- **ACFC/PFC:** omit Address/Control or shorten the Protocol field when both ends agree.
- **FCS-Alternative:** negotiate another FCS format, such as CRC length.
- Authentication options: require the peer to use an identity mechanism before network configuration.

MRU is a PPP receive limit and is not automatically the same as IP MTU on every path. Encapsulating PPP in another technology can add headers and reduce usable MTU; configure and diagnose all relevant layers.

## Peer authentication: PAP, CHAP, and EAP

PPP can run without authentication when policy permits, but remote access commonly verifies its peer. Authentication answers “who is the peer, and may it connect?” It does not encrypt all application data.

- **PAP** sends password information in a form that can be exposed on the link. It is weak and should not be treated as a modern security choice.
- **CHAP** uses a random challenge and a response calculated from the challenge and a shared secret, avoiding direct transmission of the password. It does not solve every attack and does not make the link end-to-end secure.
- **EAP** is a framework for multiple authentication methods. An access server can delegate decisions to a central authentication system. Protection depends on the EAP method, certificate/identity validation, configuration, and deployment.

Algorithm names, vendor extensions, and encryption choices in the book's examples belong to the historical dial-up/Windows access ecosystem of that era; do not use them as current secure configuration advice.

## NCP enables IPv4 or IPv6

After LCP brings the link up and authentication policy is satisfied, PPP can run one or more **Network Control Protocols (NCPs)** to configure network-layer protocols. NCP uses a configure exchange similar to LCP, but each protocol has its own Protocol ID and options.

- **IPCP** (`0x8021`) configures IPv4 on the link; it may negotiate an address and options such as header compression or DNS information in some deployments.
- **IPv6CP** (`0x8057`) negotiates an interface identifier for the PPP endpoint. This is link configuration; other IPv6 steps such as address creation, duplicate detection, and routing follow their own mechanisms.

LCP establishes link-level agreement; NCP configures each network protocol. “PPP connected” alone does not prove IPv4, IPv6, DNS, or routes are ready. Check the relevant NCP state and IP configuration installed on the interface.

## Multilink PPP combines several links

**Multilink PPP (MP)** combines multiple point-to-point links into one logical bundle. It can fragment a packet, send pieces over member links, and reassemble them at the other end. Each fragment has a sequence number and beginning/end bits so the receiver can reconstruct the packet.

Simply sending whole packets alternately across links can cause reordering when their delays differ. MP sequence numbers let the receiver reorder fragments, at the cost of buffering and possibly waiting for a late fragment. MRRU specifies the size of a reassembled packet the bundle can receive; an endpoint discriminator identifies members of the same bundle. Extensions can add or remove links dynamically, depending on implementation.

Bundling does not guarantee throughput equal to the sum of nominal link rates. Overhead, delay differences, load distribution, and endpoint bottlenecks all matter.

## Payload and header compression

PPP distinguishes **payload compression** from **protocol-header compression**. CCP (Compression Control Protocol) negotiates payload compression algorithms; a reset mechanism can resynchronize if decompression state diverges. Compression can reduce transmitted bytes but costs CPU, and already-compressed or encrypted data usually compresses poorly.

Header compression exploits the fact that successive packets in a TCP/IP flow repeat much of their header. Rather than resend every field, peers keep state and send a flow identifier plus changing fields. VJ compression is a historical TCP/IPv4 example; later mechanisms cover more protocols and links. Because decompression depends on state, transmission errors can corrupt compressed headers; link error checking and state recovery matter.

## Diagnose a connection in order

Read logs from the lower layers upward:

1. **Interface/link:** does the serial device, modem, or tunnel report a connection?
2. **LCP:** did the peers agree on framing, MRU, compression, and authentication? `ConfNak` usually proposes a different value; `ConfRej` rejects an option.
3. **Authentication:** was the peer verified under policy?
4. **NCP:** did IPCP/IPv6CP open and install an address on the interface?
5. **Routing and services:** do routes, DNS, and destination connectivity work?

Seeing a PPP interface alone does not prove the whole path works. If LCP succeeds but IPCP fails, investigate IPv4 NCP configuration rather than basic framing.

## Summary

- PPP carries many payload types on a point-to-point link; the Protocol field identifies the current payload.
- LCP negotiates link behavior; PAP/CHAP/EAP handle policy-dependent authentication; IPCP/IPv6CP configure network protocols.
- FCS detects errors and stuffing protects frame boundaries; neither means encryption or guaranteed delivery.
- Multilink splits and reassembles fragments; compression applies to payload or headers and requires coordinated state.
- Diagnose link, LCP, authentication, NCP, and then routing/DNS in order.

## Check your understanding

**Does open LCP mean IPv4 has an address?** No. IPCP must negotiate separately.

**Does the FCS hide contents from eavesdroppers?** No. It detects transmission errors, not encryption.

**Does `Configure-Nak` mean the peer does not support PPP?** No. It may propose a different option value; `Configure-Reject` rejects an option.

## Read next

Once the link carries IP, see how a host chooses a next hop and a router forwards packets in [Routing, gateways, and next hops](/en/notes/network/routing-next-hop-and-gateway/).
