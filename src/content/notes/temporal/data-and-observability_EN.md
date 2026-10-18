---
title: "Payloads, Visibility, and Workflow observability"
category: "Workflow Engine"
kind: "guide"
translationKey: "temporal/data-and-observability"
series: "Temporal"
seriesOrder: 6
description: "Design history payloads, protect sensitive data, find executions, and distinguish queueing from execution latency."
sources:
  - title: "Data handling - Go SDK"
    url: "https://docs.temporal.io/develop/go/data-handling"
  - title: "Temporal Visibility"
    url: "https://docs.temporal.io/visibility"
  - title: "Temporal Service"
    url: "https://docs.temporal.io/temporal-service"
  - title: "Protect sensitive data in a Temporal application"
    url: "https://temporal.io/blog/how-to-protect-sensitive-data-in-a-temporal-application"
draft: false
updated: 2026-10-15
---

A large-document Workflow needs to know which files were checked, not carry every file in every message. Support staff need status-based execution search, while dashboards must distinguish queue delay from provider delay. Putting everything in history or Search Attributes mixes these needs.

Separate progress state, execution-search metadata, and diagnostic telemetry. Inputs, Activity results, and Signal/Update data recorded by their APIs can persist in history; payload design therefore affects storage, replay, security, and retention.

## Keep enough history without making it a file store

Workflow replay needs decision data. Large files, videos, reports, or mostly unused object fields can live in object storage, with limited-access references in the Workflow. References must survive retries and last long enough for the process: expiring before continuation leaves durable progress dependent on unavailable data. Define cleanup after closure, cancellation, and data-erasure requests too.

Avoid unnecessary tokens, card details, personal secrets, or sensitive content in arguments, errors, logs, and Search Attributes. Search metadata supports filtering/display, not secure payload storage. Approved minimal data also keeps histories smaller, replay faster, and support investigations easier.

## Data Converters and Payload Codecs

Data Converters serialize application values into transmitted/stored payloads and deserialize them. Codecs can encrypt or compress for protection or bandwidth. Clients, Workers, and payload-reading tools need compatible decoding paths. The UI may require a supported codec server/integration rather than automatically loading application libraries. Missing keys/decoders make corresponding payloads unreadable.

Encryption does not solve key management. Define storage, lifetime/rotation, Worker access, backup, debugging, and audited access. Preserve old decoding for as long as histories remain supported. Exercise new executions and old fixtures; deploy readers before writers when the protocol needs that compatibility. Never log plaintext as a fallback for decryption failure.

Compression/encryption change size, latency, and CPU. Measure representative payloads rather than empty objects. Give application APIs explicit size bounds, distinguish oversized-payload errors from network errors, and do not assume identical Temporal quotas across environments.

### Change writers after readers understand the format

Workers processing old executions must read old payloads; any Worker receiving new data must understand its format before writers produce it. Reader-before-writer deployment is a conditional protocol strategy, not merely replacing a current key in configuration.

One history may contain data from many times. Include version/key references according to codec design and retain decoding over the supported lifetime. Logging plaintext on decode failure turns a compatibility problem into a data incident.

## Visibility finds executions rather than replacing business authority

Visibility lists/queries by Workflow ID, type, status, time, and Search Attributes. Choose fields for operational questions: where is a customer's order, how many processes await approval, which type has rising failures? Small typed attributes with stable meaning, approved sensitivity, and clear owners keep queries understandable.

Search/statistics are not authoritative business state. Do not use a potentially delayed search index to decide charging or permissions. Use Workflow state or an authoritative data system. Verify backend, feature support, indexing, and query limits before relying on Advanced Visibility.

## Observe several layers

Dashboards should separate Service, Worker, and dependencies. Worker signals include pollers, Task Queue backlog, schedule-to-start latency, Workflow Task/Activity duration, retries, timeouts, and open executions. Service signals include API latency/errors, persistence latency, and history resources. Dependencies contribute failures, quotas, and response time. Backlog rising with slow Activities differs from backlog rising while nobody polls.

Trace context can connect API requests through Workflows and Activities. Control propagation; do not store all HTTP headers, cookies, or bearer tokens in history. Workflow IDs help support lookup, but avoid PII-bearing IDs exposed in logs/dashboards. Include necessary execution/run IDs and step names in logs while redacting or omitting payload data.

### Distinguish three durations

An Activity waits 40 seconds to start, runs for two, then receives a provider error. “42 seconds total” hides the cause: schedule-to-start points to queues/Workers; runtime points to code/dependencies; retry backoff is another interval.

Dashboards should drill from aggregates to queue, type, and sample execution. Workflow/Run IDs suit logs/traces, but unbounded metric labels create excessive cardinality. Choose the telemetry surface according to the question.

## A useful investigation sequence

Find the execution by Workflow ID/Search Attributes and inspect state/history. Identify whether it waits for a timer, Signal, Activity, or Worker Task. Compare schedule-to-start and execution latency to separate queueing from slow code. Inspect attempts/heartbeats for retries or stalled work, then correlate Worker/downstream logs and traces. Categorize causes so dashboards answer recurring questions rather than merely display attractive charts.

## Check the observations

**Does Visibility reporting PAID justify another charge?** No. An index may lag and is not business authority; use authoritative state/contracts.

**Does keeping only an object key guarantee replay and all later Activities succeed?** No. Code may replay while the object, access rights, or decryption key has expired, breaking later work.

**Must a trace keep one span open through days of waiting?** Not by default. Use correlation/propagation and spans matching attempts/phases rather than storing an open span object as durable state.
