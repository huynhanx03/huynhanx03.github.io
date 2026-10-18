---
title: "Activities, retries, and failures outside Temporal"
category: "Workflow Engine"
kind: "guide"
translationKey: "temporal/activity-reliability"
series: "Temporal"
seriesOrder: 3
description: "Choose Activity boundaries, timeout and retry budgets, heartbeats, checkpoints, and repeat-safe side effects."
sources:
  - title: "Temporal Go SDK Activity basics"
    url: "https://docs.temporal.io/develop/go/activities"
  - title: "Temporal Activity execution"
    url: "https://docs.temporal.io/activity-execution"
  - title: "Temporal Retry Policies"
    url: "https://docs.temporal.io/encyclopedia/retry-policies"
  - title: "Temporal Async Activity Completion"
    url: "https://docs.temporal.io/develop/go/activities/asynchronous-activity"
draft: false
updated: 2026-10-15
---

A payment gateway charged the customer, but its response never reached the Worker. The Service has no completed result, so another attempt may send the command again. Treating retry as rerunning a harmless function can charge twice.

Activities perform application I/O outside deterministic Workflow code. Temporal manages executions/attempts, timeouts, heartbeats, and results needed for orchestration. It cannot know whether the provider committed before its response disappeared. Design business-result boundaries, operation keys, and reconciliation before choosing retry counts.

![The boundary between deterministic Workflows, I/O Activities, and external dependencies](/images/notes/temporal/workflow-activity-boundary.jpg)

*Workflow decisions can replay; Activities interact with external systems.*

## Activity boundaries and at-least-once execution

Temporal can schedule another attempt after a Start-to-Close or Heartbeat Timeout when the retry policy allows it. Design as if the same business request may execute several times. Charging needs a stable idempotency key per order/operation sent to the provider. Shipment creation needs a business ID/idempotency key and appropriate provider-side deduplication. A separate lookup followed by creation does not protect overlapping attempts. After a lost response, the next attempt must be able to recover the existing result.

An overly broad Activity can contain several side effects; failure at the end then retries already-successful steps. Split at independently meaningful results, but do not create an Activity per line of code: every call adds history and overhead. Use local database transactions where available, understanding that they do not include Temporal Service and external HTTP providers in one transaction.

## Timeouts bound different waiting intervals

Start-to-Close limits one attempt after a Worker receives its task. Schedule-to-Start limits Task Queue waiting and can expose absent Workers or incorrect routing. Schedule-to-Close limits total time from scheduling to final result, including queueing and retries. Heartbeat Timeout requires long Activities to report liveness and can carry checkpoints.

Schedule-to-Start expiry is nonretryable: requeueing on the same queue does not fix missing Workers. Schedule-to-Close expiry ends the whole Activity Execution budget. Distinguish an attempt failure from budget exhaustion or routing failure. See [Activity failure detection](https://docs.temporal.io/encyclopedia/detecting-activity-failures).

There is no universal value. Use downstream SLAs, p95/p99 latency, HTTP/database limits, and business needs. Retry backoff must fit the Schedule-to-Close budget. Short timeouts can retry healthy work and increase load; long ones delay failure detection and leave Workflows waiting. Heartbeats fit minutes-long work but are unnecessary for fast operations merely to fill a configuration checklist.

### Where can the budget be spent?

Suppose the overall budget is five minutes and each attempt may run for 30 seconds. Five minutes includes applicable queueing, attempts, and backoff; it is not five minutes plus unlimited retry time. A long initial Worker outage can leave fewer retry opportunities.

Start-to-Close bounds attempts, Schedule-to-Close bounds the whole Activity execution, and heartbeat detects long attempts no longer reporting progress. Assigning one number to all of them hides different causes.

A timeout also does not prove old I/O stopped. Dependency-level limits and idempotency remain necessary so a timed-out attempt does not conflict with its replacement.

## Retry policies and errors that should not repeat

Policies specify initial delay, backoff, maximum delay/attempts, and nonretryable errors. Transient connectivity can merit retry; invalid input typically will not change. Infinite retries for everything can keep broken logical work open, build backlog, and obscure operational signals. Consider bounded retries followed by explicit user/operator handling.

Classify Application Errors and technical failures according to SDK semantics; do not retry permanent business failures such as a final card decline. A nonretryable error can close the Workflow Failed unless Workflow code handles it and chooses another step. Do not swallow errors and report success before the external system confirms it.

## Heartbeats, checkpoints, and cancellation

An Activity handling many files/chunks can heartbeat a checkpoint. Another attempt can read heartbeat details and resume unfinished work. Record a checkpoint after the unit has durably committed: recording first can skip unsaved data on retry. Keep checkpoint payloads small and give them a clear schema/version.

Heartbeats also help Workers learn of cancellation and report progress. Activities should respect context cancellation, stop when possible, and clean up within time bounds. Cancellation cannot forcibly interrupt a permanently blocked Go library that ignores context; use suitable dependency timeout APIs.

## Async completion for external callbacks

A provider may accept work and send a webhook hours later. Async Activity completion hands responsibility to a callback handler instead of retaining a waiting goroutine. Store the completion token/reference securely, authenticate the webhook, detect duplicates, and correlate the correct attempt. If callbacks never arrive, an Activity Timeout or watchdog must end the wait; Heartbeat Timeout detects lost contact only when the handler stops heartbeating. The callback must be idempotent because providers resend and a process can crash after storing a result but before acknowledging the webhook.

In Go, return `activity.ErrResultPending` to leave the Activity Execution pending; an ordinary successful return completes it. The callback uses `CompleteActivity` with the token. Start-to-Close still bounds the waiting attempt. If Heartbeat Timeout is set, the external handler must heartbeat through the Client while waiting. See [async completion](https://docs.temporal.io/develop/go/activities/asynchronous-activity).

Before production, exercise lost responses after provider processing, timeout after commit, Worker loss mid-attempt, duplicate callbacks, cancellation during execution, and permanent dependency errors. Observe retry counts, timeout types, and queue time. This evidence supports policy tuning from actual behavior.

## Check the failure paths

**Can backoff repair a final business card decline?** No. Classify it and select the appropriate Workflow branch rather than retrying without benefit.

**Why checkpoint after committing a chunk rather than before?** Before can skip unsaved work. After can require reprocessing if checkpoint transmission is lost, so chunk processing must itself tolerate repetition.

**Should duplicate async callbacks apply the result twice?** No. Check identifiers/attempt, completion state, and API contract; authenticate before accepting the callback.
