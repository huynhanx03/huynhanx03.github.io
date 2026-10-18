---
title: "NTP and Clock Synchronization in Networked Systems"
category: "Network"
tags: ["network", "ntp", "time"]
description: "Understand NTP offset, delay, and stratum, and why accurate clocks matter for TLS, logs, and distributed systems."
sources:
  - title: "Network Time Protocol Version 4: Protocol and Algorithms Specification"
    url: "https://www.rfc-editor.org/rfc/rfc5905.html"
updated: 2026-10-16
translationKey: "network/ntp-clock-synchronization"
---

The Network Time Protocol (NTP) helps a host estimate the time from a time server over a network. A system clock can drift because of hardware, reboot, or misconfiguration. Synchronization often adjusts the clock gradually to avoid time jumps that could disrupt applications.

## Offset, delay, and stratum

NTP uses four timestamps: `T1` when the client sends a request, `T2` when the server receives it, `T3` when the server replies, and `T4` when the client receives the response. The estimated offset is `θ = ((T2 − T1) + (T3 − T4)) / 2`; round-trip delay is `δ = (T4 − T1) − (T3 − T2)`. A positive offset means the server clock is estimated to be ahead of the client clock.

For example, if the relative times are `T1=0 ms`, `T2=40 ms`, `T3=41 ms`, and `T4=61 ms`, then `θ = ((40−0)+(41−61))/2 = 10 ms`, while `δ = (61−0)−(41−40) = 60 ms`. This estimate assumes roughly balanced path delays; network asymmetry can skew the offset even when the calculation is correct.

Stratum describes the logical distance from a reference source; it is not an absolute measure of accuracy. A low-stratum server can still be wrong if its source or configuration is wrong.

## Why applications care

TLS certificates depend on validity periods; logs and traces need consistent timestamps; distributed leases, tokens, and cache expiry rely on time. Clock differences across machines make event ordering difficult to analyze. NTP does not create a global logical clock, and timestamps do not prove causal order between nodes.

## Troubleshooting

On Linux, `timedatectl status`, `chronyc tracking`, or `ntpq -p`, depending on the daemon, show synchronization state. Check UDP/123, upstream servers, timezone, RTC, and time sources. A timezone changes how an instant is displayed as a local date and time; it does not itself set the system clock. An epoch is the origin of a time representation, not the current clock value.

## Check your understanding

**Is a lower stratum guaranteed to be more accurate?** No.

**Does changing the timezone change the kernel's UTC time?** No; timezone mainly changes conversion and display.

**Does NTP guarantee that every machine has exactly the same timestamp?** No.

## Further reading

Synchronized timestamps help correlate network and system logs when investigating distributed failures.
