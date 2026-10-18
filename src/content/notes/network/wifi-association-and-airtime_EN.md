---
title: "Wi-Fi: association, contention, and airtime"
category: "Network"
tags: ["network", "wifi", "802.11", "wireless"]
description: "Follow a client from scanning and authentication to association, then understand CSMA/CA, retries, and airtime fairness."
updated: 2026-10-16
translationKey: "network/wifi-association-and-airtime"
---

A Wi-Fi client scans beacons, selects an access point and SSID, authenticates, and associates before exchanging frames. WPA2/WPA3 and 802.1X can protect the link, depending on the network. Association does not mean the client already has an IP address or DNS configuration.

In infrastructure mode, an AP and its associated stations form a **BSS**. Multiple BSSs connected through a distribution system can form an **ESS**, often advertising one SSID so clients can move between APs. In ad hoc/IBSS mode, stations communicate directly without an AP. An SSID is a network name, not a secret or proof of identity. Management frames handle scanning, beacons, authentication, and association; control frames coordinate transmission and acknowledgments; data frames carry higher-layer traffic. An 802.11 header can contain several addresses because frames may travel between a station, AP, and distribution system; it is not simply a wireless Ethernet header.

## CSMA/CA

Radio cannot detect a collision while transmitting as easily as classic wired Ethernet. 802.11 uses Carrier Sense Multiple Access with Collision Avoidance: a station listens, waits a random backoff, and acknowledges frames at the link layer. Collisions and interference cause retries that consume airtime.

A hidden node may let two clients that cannot hear each other transmit to the same AP. RTS/CTS can reduce this problem in some conditions, at the cost of additional overhead.

Stations use **physical carrier sense** (the radio reports channel busy through CCA) and **virtual carrier sense**: they read the Duration field of a frame and set a Network Allocation Vector (NAV) timer to defer access. After the channel remains idle for the required inter-frame spacing, a station chooses a random backoff from its contention window. The counter decreases only while the medium stays idle. After a successful unicast, the receiver sends a link ACK after SIFS; without an ACK, the sender retries with a larger backoff. Multicast and broadcast usually do not get this kind of ACK, so their reliability differs from unicast.

Optional RTS/CTS tells stations that hear the sender or receiver how long the channel is reserved, helping with hidden nodes. It also adds frames and channel time; its value depends on frame size, density, and topology.

802.11 can **fragment** a large frame into smaller pieces so only a failed piece needs retransmission, but each piece has its own header and ACK. In good conditions this adds overhead. 802.11n-era standards describe two aggregation styles: A-MSDU combines payloads inside one MPDU, saving headers but often losing the whole aggregate on an error; A-MPDU combines MPDUs with individual FCS values and a block ACK, allowing selected subframes to be retried. Exact names and limits vary by generation. In general, aggregation reduces overhead, while the error-checking unit determines retry cost.

## Power saving and airtime access

In power-save mode, a station can turn off its receive radio for part of the time. The AP buffers frames for sleeping stations and indicates pending data in a beacon; a station wakes on schedule, checks, and retrieves its frames. This reduces radio-on time but increases delay and may reduce throughput. AP/station time synchronization helps the client wake for beacons; actual battery use also depends on display, CPU, firmware, and workload.

802.11 QoS maps traffic to access categories such as background, best effort, video, and voice, each with different contention parameters or TXOP. Priority gives a better chance to access the channel; it does not guarantee latency or bandwidth in a noisy or congested environment.

## Airtime matters more than raw bytes

A slow client occupies the channel longer for the same amount of data. More clients competing for a channel, retries, and beacon/management overhead reduce aggregate throughput. A wider channel can increase peak rate but is more exposed to interference and consumes more spectrum.

PHY rate varies with modulation/coding, channel width, spatial streams/MIMO, signal quality, and the capabilities of both endpoints. Higher-order modulation carries more bits but is more sensitive to noise; forward error correction trades some raw throughput for error recovery. Wider channels can raise peak rate but leave fewer non-overlapping channels and increase exposure to nearby networks. Channel planning depends on the regulatory domain and actual band. Channel numbers, widths, and rates in a 2012/802.11n-era book are not a current Wi-Fi configuration guide.

Roaming depends on client/AP policy, signal, and authentication. An application may see packet loss or a latency spike during a roam; TCP retries may mask some of it but user experience can still suffer.

## Security and link-layer limits

The book describes the historical progression from weak WEP to WPA/TKIP and WPA2/CCMP with 802.1X/EAP. This is history, not current configuration advice. The lasting idea is that Wi-Fi encryption protects the link between station and AP. A PSK is simple to deploy but difficult to manage as users change; 802.1X/EAP supports per-user or organizational authentication. Link security does not replace TLS: traffic still needs end-to-end protection after the AP when confidentiality, integrity, and server authentication matter.

Wi-Fi mesh lets nodes forward traffic instead of relying on a central AP. It can extend coverage but adds hops, airtime contention, routing, and security requirements. A draft 802.11s reference or protocol name in the book should not be assumed to describe current deployments.

## Summary

- Association is link-layer state, separate from IP, DNS, and applications.
- Wi-Fi shares radio using contention, backoff, and acknowledgments.
- Retries and interference consume airtime; PHY rate is not useful throughput.
- A slow client can affect shared airtime.
- Roaming can cause short periods of latency or loss.

## Check your understanding

**Does a 600 Mbps Wi-Fi link rate mean an application gets 600 Mbps?** No.

**Does successful association mean DHCP is complete?** No.

**Is a wider channel always better?** No. Interference and spectrum competition can reduce quality.

## Read next

After a host joins a link, its IP address/prefix and route determine where traffic goes.
