---
title: "Workflow History is durable data"
category: "Workflow Engine"
kind: "note"
translationKey: "workflow-engine/workflow-history"
series: "Workflow Engine"
seriesOrder: 2
description: "History enables replay, but it also stores payloads and creates requirements for size, security, and retention."
sources:
  - title: "Cadence workflow history article"
    url: "https://cadenceworkflow.io/blog/2026/06/03/2026-06-03-workflow-history-data-converter/workflow-history-data-converter"
draft: false
updated: 2026-10-15
---

An Activity processes a video and returns a result. If the worker dies and restarts, the Workflow still needs that result to continue. If the result is a 200 MB video file, sending the whole file through the orchestration path turns History into a place to store data the orchestration itself does not need to read.

Event History is an input for rebuilding state as well as a record of what an execution did. Payload design therefore affects recovery cost, data lifetime, and the places where information may appear.

## A function result can become long-lived data

Workflow input, Activity results, Signals, and payloads recorded through SDK mechanisms may be retained in History. During replay, recorded results let the code follow the same branch without calling an Activity that has already completed again. History is not a copy of a worker's RAM, and this does not mean every temporary variable is serialized independently.

Follow a small flow:

1. An Activity saves the processed video.
2. The Activity returns result information to the Workflow.
3. The Service records the necessary result in History.
4. After a failure, another worker replays the Workflow and uses that information to continue.

At step 2, we decide whether to put all the bytes in History or store a reference. That decision affects later reads of History, not just the current call.

## Carry only what is needed to continue

The claim-check pattern stores the file in object storage while History keeps an object key and the metadata needed to use it, such as a checksum and schema version. The Workflow orchestrates with the reference; an Activity that needs the contents downloads the file. Replay no longer has to carry a large file just to know which file was created.

But a reference creates an external dependency. The object must still exist and be accessible when an Activity retries or the process resumes. A signed URL may expire before the Workflow does; a durable identifier and an Activity that obtains suitable access when needed are often better. If the data must remain unchanged between uses, the reference must identify the right version or an immutable object under the storage contract.

| Situation | What to design |
| --- | --- |
| The Workflow waits for several days | Object retention must cover the period of use |
| An Activity retries a read | Define whether it reads the same data or which version it reads |
| A user requests deletion | Define the relationship among the object, History, copies, and the ability to resume the execution |
| Unused objects are cleaned up | Do not delete an object that an execution still needs |

Claim check moves storage responsibility outside the engine; it does not make that responsibility disappear.

## Payload encryption does not cover every place that holds data

A data converter can serialize, compress, or encrypt payloads that pass through the SDK's conversion path. Activity names, event types, Search Attributes, logs, metric labels, and data in source systems may be outside that scope. A log line containing the full input can still expose data even when the History payload is encrypted.

Inventory the surfaces that read and write data: History and the UI, backups, blob storage, logs, and key stores. A recovering worker must also be able to decode old data; retiring an old key too early can make an execution impossible to replay. Keep a way to read older data versions for as long as active executions require it.

## Limits depend on the field and configuration

The Cadence blog describes a payload limit of about 2 MB and the claim-check pattern as a solution. Do not apply that number to every event, server, or Temporal. Check the limits for the exact version, SDK, and operation; compression is not a substitute for a size budget. The [Cadence article on History and data converters](https://cadenceworkflow.io/blog/2026/06/03/2026-06-03-workflow-history-data-converter/workflow-history-data-converter) is a source to consult, not a guarantee for a different environment.

Large History also increases read and replay costs. Retention for closed executions must balance investigation needs, sensitive data, and cost; it is not a way to arbitrarily delete History that an open execution still needs.

## Check your payload design

**Is a file download URL that expires in 15 minutes enough for a Workflow that waits two days?** No. The URL may expire before the Workflow resumes. Use a durable reference and a suitable way to obtain access or read the file again.

**Does encrypting data with a converter make it safe to put an access token in a metric label?** No. Metrics do not necessarily pass through the converter, and a token is not suitable metadata for an index or label.

**Does retaining all of History guarantee that execution can continue if the external object has been deleted?** No. History still contains only a reference, while the next Activity needs the actual object. Recovery depends on data outside the engine too.

The goal is to retain exactly the data needed for recovery, for the right duration and within the right access scope. Continue with [Cadence data and observability](/en/notes/cadence/data-and-observability/) to distinguish Visibility, History, logs, and traces.
