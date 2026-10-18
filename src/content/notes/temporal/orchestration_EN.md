---
title: "Signals, Queries, Updates, timers, and Child Workflows"
category: "Workflow Engine"
kind: "guide"
translationKey: "temporal/orchestration"
series: "Temporal"
seriesOrder: 4
description: "Choose interaction contracts and orchestration primitives for long-lived Workflows and recurring processes."
sources:
  - title: "Temporal Workflow Message Passing"
    url: "https://docs.temporal.io/encyclopedia/workflow-message-passing"
  - title: "Temporal Schedules"
    url: "https://docs.temporal.io/schedules"
  - title: "Temporal Child Workflows"
    url: "https://docs.temporal.io/child-workflows"
  - title: "Temporal Continue-As-New"
    url: "https://docs.temporal.io/develop/go/workflows/continue-as-new"
draft: false
updated: 2026-10-15
---

An order awaits approval. A dashboard needs its status, a webhook needs to report an event, and an approver wants to submit a decision and receive confirmation. All interact with the Workflow but need different contracts.

Temporal offers Signals, Queries, and Updates alongside timers, Schedules, and child executions. Start with what callers need to know after a call, then choose an API. Durable waiting across Worker restarts does not itself define business policy for duplicate or near-deadline messages.

## Signals, Queries, and Updates

A Signal is an asynchronous write: the Client sends a message without waiting synchronously for its processing result. For example, a carrier reports a parcel was received. Deterministic Workflow code handles it and changes local state; external acknowledgment needs a separate response design if required.

A Query reads current Workflow state without adding a history event. Its handler should read existing state, not perform I/O or mutate it. Use it for display rather than as a command. The answer is a snapshot when processed and can become stale immediately afterward.

An Update is an acknowledged write: the Client can wait for acceptance/validation and processing to receive a result or error. Use it for request-response and rejecting invalid requests before acceptance. Accepted Updates have API-defined durable recording; handlers obey Workflow determinism. Validators must not mutate state or cause I/O/side effects. Perform I/O through Activities where the handler API allows it. Check SDK/version behavior before assuming concurrency limits or semantics.

### Receipt, acceptance, and completion differ

| Need | Common choice | What the caller should not infer |
| --- | --- | --- |
| Report a delivery event | Signal | Send response alone proves processing finished |
| Read the current step | Query | State cannot change just after the response |
| Submit a decision and await processing | Update with appropriate waiting | Every call defaults to the same lifecycle milestone |

Updates have processing milestones, and Client APIs can choose which to await. Specify accepted versus completed and how to recover status by identifier after a lost response. The API name alone does not define the received guarantee.

## Timers, Schedules, and long waits

A Workflow timer waits inside one execution. Use Temporal timer APIs rather than time.Sleep: the Service records the timer, the Worker may stop while waiting, and execution continues after it fires. Examples include 24 hours for payment or a Signal with a 15-minute timeout branch.

A Schedule creates recurring Workflow Executions, manages overlap/catch-up, and may be paused/updated through supported APIs. It differs from a timer loop inside one execution. Choose Schedules for recurring starts managed by ID; choose a timer for one order's deadline. Decide catch-up versus skipping after downtime to avoid unintentionally launching thousands of old runs together.

## Child Workflows and Continue-As-New

A Child Workflow suits a subprocess needing its own state/history, timeout, retry, or owner. A parent can launch children for products, but must bound concurrency and define parent close policy. Children may use separate Task Queues for team/Worker isolation; state and communication are not shared like local function variables.

Begin with one bounded Workflow. Split children for real lifecycle independence, reuse, or history separation, not merely file organization that adds executions to find and correlate.

Continue-As-New closes a run and starts the next with the same Workflow ID and new state input. It supports indefinite or periodic processes whose history has grown. Carry only necessary state: attempt totals, business checkpoints, configuration versions, pending data. Old state is not copied automatically; account for pending Signals and messages during transition.

### A run transition is a state handoff

A high-message Workflow needs a safe point after current handling is complete. Closing while a handler waits on an Activity does not automatically transfer all that work to the next run. Define the checkpoint and processed-message boundary explicitly.

A handler can yield while awaiting an Activity, allowing the main function or another handler to continue. Closing the run before a handler finishes can prevent its caller from receiving an Update result. In Go, use `workflow.Await` with `workflow.AllHandlersFinished(ctx)` before completion where appropriate; handle Signal-channel draining separately. See [waiting for handlers](https://docs.temporal.io/develop/go/workflows/message-passing#ensure-your-handlers-finish-before-the-workflow-completes).

For children, distinguish creation requested, child started, and child completed. Parent close policy and waiting determine what survives parent closure; a Future variable alone does not prove lifecycle ownership is complete.

## Cancellation and compensation

Cancellation cooperatively requests Workflow/Activity termination. A Workflow may stop waiting, clean up, and call compensating Activities. Termination cuts off execution immediately and should not replace ordinary cancellation when external cleanup is required. Timeouts end or fail configured scopes; distinguish business deadlines from Activity timeouts.

A Saga models side effects that cannot share one transaction: reserve, charge, ship. Later failure runs compensations in reverse or business-defined order. Compensation can fail too and needs retry, idempotency, state, and escalation. Sometimes “manual attention required” is more appropriate than automatic rollback.

For each primitive, ask what changes in history, who needs a response, and what happens with duplicates or messages just before closure. Test timer/Signal races, cancellation during Activities, child failure, and Continue-As-New. These boundaries often decide whether orchestration is more dependable than a custom queue handler.

## Check the interaction contract

**Does a Query immediately after a Signal confirm the Signal was processed?** Not by default. Use request IDs and processing milestones or an API matching the required acknowledgment.

**Who decides when a timer and approval are both ready?** Application code/state-machine policy. SDK deterministic coordination does not choose which event is valid business behavior.

**Does closing a parent guarantee children stop?** Inspect close policy and actual lifecycle state; parent–child relationships alone imply no universal answer.
