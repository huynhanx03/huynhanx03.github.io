---
title: "Payloads, Visibility, and workflow observability"
category: "Workflow Engine"
kind: "guide"
translationKey: "cadence/data-and-observability"
series: "Cadence"
seriesOrder: 6
description: "Control Event History data, find executions through Visibility, and correlate Activities without exposing sensitive information."
sources:
  - title: "Cadence Workflow History and Data Converter"
    url: "https://cadenceworkflow.io/blog/2026/06/03/2026-06-03-workflow-history-data-converter/workflow-history-data-converter"
  - title: "Cadence Claim-Check Pattern"
    url: "https://cadenceworkflow.io/blog/2026/06/10/2026-06-10-claim-check-pattern/claim-check-pattern"
  - title: "Cadence History Encryption"
    url: "https://cadenceworkflow.io/blog/2026/06/17/2026-06-17-encrypt-cadence-history/encrypt-cadence-history"
  - title: "Cadence Advanced Visibility"
    url: "https://cadenceworkflow.io/docs/concepts/search-workflows"
draft: false
updated: 2026-10-15
---

Support asks which orders have waited for payment over 30 minutes. Inspecting each history can explain individual cases, but is not the right system-wide search. Conversely, a Visibility row showing an open execution cannot explain why its last Activity failed.

Separate replay data, execution-search indexes, and latency/failure telemetry. Workflow input, Activity input/output, Signals, and recorded payloads may outlive a function call. Design resumability, size, security, and retention together.

## Retain what is needed to continue

For video, large documents, or reports, store the blob in object storage and record a durable reference rather than passing the full file through the Workflow. This is claim-check. References must outlive supported retry/continuation paths, with stable keys avoiding unbounded orphan blobs. Address access, retention, deletion, and objects expiring while Workflows remain alive.

Current Cadence documentation/examples discuss payload limits around 2 MB, but verify the specific server, SDK, and field. Compression can help but does not replace size budgets. Measure input/result bytes and detect growth before reaching limits.

### What must a reference identify?

For a long video operation, history can contain object key, data version, and checksum. The key must identify exactly what a later attempt should read. Overwriting that object can leave replay reconstructing valid state while subsequent Activities consume data different from the original contract.

Coordinate three lifetimes: execution, object, and decryption keys. They need not expire together, but must support all retained retry, continuation, and investigation paths. A temporary download URL is not a substitute for durable object identity.

## Data Converters, encryption, and uncovered surfaces

A Data Converter translates payloads between SDK and history, potentially implementing serialization, compression, or encryption. Cadence's AES-GCM example does not imply every metadata field is encrypted. Event types, Activity names, Task Lists, timeouts, and Search Attributes may remain visible in UI/storage. Application logs, metric labels, indexes, and source systems may also retain plaintext.

Define who may read history, backups, logs, blobs, and keys. Every decoding Worker needs appropriate keys; rotation must retain support for old encrypted data while executions still need it. Missing keys or incompatible decoders can cause repeated replay failures. Test old-history restore with the intended keys and rotation process before broad encryption rollout.

Do not put credentials, access tokens, or one-use secrets in Workflow input when only an Activity needs them. Fetch secrets from a manager at execution time, pass references with appropriate lifetimes, and avoid full-payload logging. Required PII storage needs explicit retention and user-rights deletion/handling procedures.

## Visibility finds executions; History explains one

Advanced Visibility lists/queries executions using Workflow ID, type, status, times, and custom Search Attributes. It answers which orders have waited over 30 minutes. History answers which Signals one execution received, when it scheduled Activities, and how they failed. Confusing the surfaces leads to dashboards scanning every history or putting entire payloads into indexes.

Search Attributes are typed metadata selected by the application and indexed for queries. They require Advanced Visibility and keys/types registered on the server; Memo may appear in listings but is not indexed for search. Adding an attribute to a Workflow is not enough if the deployment lacks the required backend. Use stable names, consider high-cardinality support, avoid secrets, and verify deployment-specific querying/indexing. CLI/API queries commonly have Domain/page limits; large listings need pagination or suitable APIs. See the [Advanced Visibility documentation](https://cadenceworkflow.io/docs/concepts/search-workflows) for server requirements.

### Move from a list to a cause

Suppose Visibility finds waiting `order-42`. History shows an Activity scheduled but not started: check Task List/worker routing before optimizing Activity code. If it started and repeatedly timed out, correlate attempts with downstream traces/logs.

An execution legitimately awaiting a payment timer is not faulty merely because it is old. Alert on business stages and SLOs, distinguishing intentional waiting from inability to progress. This makes dashboards lead to useful action.

## Trace across a long process

An HTTP trace starts at order submission, but the workflow may continue hours later. Propagate trace/correlation IDs through input and Activity context using SDK-supported tracing. Do not retain a live span across a timer. Create spans per Activity attempt, attaching Workflow/Run IDs safely for correlation. Unbounded IDs as metric labels cause cardinality growth.

Useful metrics include open executions by business state, oldest workflow age, Activity retries/timeouts, Workflow Task failures, schedule latency, and history/payload size. Logs need correlation keys without secrets. Together Visibility locates the population, History explains individual progress, and traces/metrics expose latency and service relationships.

## Check the data surfaces

**Does encrypting payloads remove access concerns for customer emails in Search Attributes?** No. Do not assume converters cover indexed metadata or logs.

**Should every metric label contain Workflow ID because it is useful for correlation?** Not by default. Unbounded values increase cardinality; use appropriate log/trace and lookup paths.

**How do Visibility and History differ?** Visibility selects executions to inspect; History shows their sequence of events. Business decisions still need an authoritative state source, not only possibly delayed search results.
