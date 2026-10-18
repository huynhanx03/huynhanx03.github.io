---
title: "Designing Activities with timeouts, retries, and safe side effects"
category: "Workflow Engine"
kind: "guide"
translationKey: "cadence/activity-reliability"
series: "Cadence"
seriesOrder: 4
description: "Choose Activity boundaries, timeouts, retries, heartbeats, and idempotency to prevent duplicate external effects."
sources:
  - title: "Cadence Activities"
    url: "https://cadenceworkflow.io/docs/concepts/activities"
  - title: "Cadence Activity Timeouts"
    url: "https://cadenceworkflow.io/docs/concepts/activities"
  - title: "Cadence Asynchronous Activity Completion"
    url: "https://cadenceworkflow.io/docs/go-client/activity-async-completion"
  - title: "Cadence Retry Policies"
    url: "https://cadenceworkflow.io/docs/concepts/activities"
draft: false
updated: 2026-10-15
---

A provider created a shipment, but the worker died before reporting its result to Cadence. To the Service, the Activity is unfinished; to the provider, the shipment exists. Retrying creation without a stable key can book two deliveries for one order.

Activities contain work outside deterministic Workflow orchestration. Design around an identifiable business outcome, such as “create shipment for order X,” then determine confirmation, retry, and reconciliation. Too large a boundary repeats many steps on retry; too small adds tasks/events and coordination overhead. Replaying old commands does not itself add events merely because code executes again.

## Four timeouts answer different questions

Schedule-to-Start limits waiting before a Worker receives a task. Schedule-to-Close generally describes the interval from scheduling to Activity completion; Start-to-Close limits one attempt after it starts. Heartbeat Timeout requires periodic progress reports for long-running Activities. These are four timeout concepts; Go ActivityOptions requires explicit Schedule-to-Start and Start-to-Close values, while valid combinations/defaults differ across SDKs.

Under documented Cadence Go `RetryPolicy` behavior, the server extends Schedule-to-Start and Schedule-to-Close in the scheduled event to `ExpirationInterval`, or to the workflow timeout when expiration is absent. Consequently, the original `ScheduleToCloseTimeout` is not necessarily the effective overall retry budget. Set a suitable expiration or workflow timeout for the business deadline; `MaximumAttempts` can stop retries earlier. Start-to-Close still limits one attempt, while queueing and backoff consume the total budget. Check the deployed SDK/server: [Cadence Go retries](https://cadenceworkflow.io/docs/go-client/retries), [Activity timeouts](https://cadenceworkflow.io/docs/concepts/activities).

## Retries do not replace idempotency

Distinguish temporary and permanent failures. Network/rate-limit failures may retry with backoff; invalid input should generally fail immediately. Unlimited retries against a failed dependency keep executions open and accumulate backlog. Bound attempts or expiration, monitor failures, and decide whether the workflow waits, requests corrected data, or compensates.

Assume a timeout can follow a successful external effect. Shipment creation may succeed while its response is lost. Retry must use an idempotency key or inspect shipment state by business key before creating again. For operations unsafe to repeat, design a reconciliation Activity or retain an operation ID before reporting completion.

### Trace an attempt with an unknown outcome

| Moment | Provider | What does Cadence know? |
| --- | --- | --- |
| Before request | No shipment | Activity scheduled/received |
| After processing with lost response | Shipment may exist | No successful result recorded |
| Later attempt | Lookup by business key | A confirmable outcome is needed |

The key must remain stable for the same logical operation, not change per attempt. “Check then create” also needs provider-side duplicate protection or appropriate atomicity: attempts can overlap if old work does not actually stop after timeout.

Do not treat timeout as rollback evidence. It changes engine waiting/retry behavior; external I/O needs its own deadlines, cancellation, and contract.

## Heartbeats and long-running progress

Activities downloading files, processing batches, or awaiting external systems should heartbeat more frequently than their configured timeout. Heartbeats indicate worker liveness and can carry checkpoints for retries to resume near the latest completed chunk. Keep progress data small, durable, and recoverable; heartbeat details are not storage for whole files or the sole authoritative business state.

On Workflow cancellation, an Activity may learn cancellation through heartbeats and clean up or stop. Code blocked in a call lacking context/cancellation support does not stop immediately on request. Define maximum cleanup time and how to handle a dependency ignoring cancellation.

## When completion arrives later by callback

Some systems accept work and webhook the result hours later. Asynchronous Activity completion can retain a token/reference and delegate completion to the callback process without retaining a waiting Activity goroutine. Authenticate callbacks, associate the correct Activity attempt, and handle duplicates. A deadline/watchdog remains necessary: a lost callback must not leave the workflow waiting indefinitely.

In Go, return `activity.ErrResultPending` to hand off completion; an ordinary successful return completes the Activity immediately. The callback later reports through Client `CompleteActivity` using the token. Timeouts still apply while waiting; releasing the goroutine does not extend the deadline. See [Cadence Go async completion](https://cadenceworkflow.io/docs/go-client/activity-async-completion).

Activity boundaries are also security boundaries. Transfer only needed data, avoid secrets in logs, and consider converters/encryption for payloads stored in history. Activity completion does not prove all systems share one state: the database, provider, and Cadence are not one distributed transaction.

Before production, answer: are input/output stable; what repeats; what is the idempotency key; which timeouts apply; which errors are non-retryable; what checkpoint belongs in heartbeats; can cancellation clean up; and which metrics reveal slow or retrying Activities? Recording these in the contract helps other teams use the Activity safely.

## Check the Activity contract

**Does Start-to-Close expiry prove the provider did nothing?** No. The effect may precede a lost response; inspect state using stable identity.

**Is reporting chunk 10 before its durable write safe?** No. A later attempt can skip incomplete work. Checkpoint only resumable committed progress.

**Does async completion make deadlines unnecessary?** No. Callbacks may disappear or arrive late; bound waiting, authenticate, and handle duplicates.
