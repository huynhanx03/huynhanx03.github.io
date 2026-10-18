---
title: "Event History, replay, and determinism"
category: "Workflow Engine"
kind: "guide"
translationKey: "temporal/history-and-determinism"
series: "Temporal"
seriesOrder: 2
description: "Follow commands into events, recover Workflow state through replay, and distinguish task failure from execution failure."
sources:
  - title: "Temporal Event History"
    url: "https://docs.temporal.io/encyclopedia/event-history"
  - title: "Temporal Workflow Definition"
    url: "https://docs.temporal.io/workflow-definition"
  - title: "Temporal Tasks"
    url: "https://docs.temporal.io/tasks"
  - title: "Temporal Workflow Task Errors"
    url: "https://docs.temporal.io/references/workflow-task-errors"
draft: false
updated: 2026-10-15
---

A Workflow calls ExecuteActivity to reserve inventory. That line expresses an orchestration intent; it does not perform inventory I/O inside the Workflow. The SDK collects Commands, and at Workflow Task completion the Worker sends them to the Service, which handles them and records corresponding events. Activity results are recorded later too.

If a Worker loses in-memory state, a suitable Worker can replay the definition against inputs/history to reconstruct it. Recorded commands are checked against history and completed results supplied again; those side effects do not run anew merely because of replay. Caching may avoid a full replay per task but does not weaken recovery correctness requirements.

![Temporal reconstructs state from Event History and continues where progress is needed](/images/notes/temporal/durable-execution-replay.jpg)

*Replay uses recorded Activity and timer results rather than repeating I/O for completed work.*

## Determinism means compatibility with history

Given the same inputs and history, a Workflow must issue a compatible command sequence. Do not directly use time.Now, randomness, HTTP, databases, or Go goroutines inside the Workflow Definition. Use SDK clocks, timers, selectors, and concurrency primitives. Compute nondeterministic values in Activities or deliberately record them through appropriate SDK APIs.

A common error inserts an Activity before an existing command. New executions work, but an open execution may replay into ScheduleActivity at a position inconsistent with history. The Service/SDK detects nondeterminism. Activity names/IDs, Child Workflow types, timer ordering, or handlers can also matter. Some input or timeout changes can be safe in specific cases; check the precise SDK rules.

### Compare a short history

Suppose the old order was Reserve → Charge. History records Reserve and its result; old Workflow code receives it and proceeds toward Charge. Replay supplies Reserve's recorded result to reconstruct the pending step.

Deploying Validate before Reserve may issue an incompatible command where old history records Reserve. Success for a new order does not prove old orders can continue. Use compatible patching/versioning for the SDK rather than calling inventory I/O directly from Workflow code.

What must remain compatible is command history, not every local computation forever. Assess each edit by its effect on recorded decisions.

## Workflow Task failure differs from Workflow Execution failure

A Workflow Task failure means a Worker did not successfully process one task, for example due to nondeterminism, a crash, timeout, or code failure not handled as expected by the SDK. The Service may retry that task while the execution remains open for code/infrastructure repair. Workflow Execution failure means the process has ended Failed, such as when an Activity's final error propagates out of the Workflow.

The distinction guides response. Deployment nondeterminism usually requires compatible code repair/rollback rather than restarting the order. A business-level payment decline may require the user to update payment details and begin another process. Inspect history and Worker logs to distinguish task failure from execution failure before choosing reset, retry, or compensation.

## History is also a resource constraint

Recorded Commands/Events and payloads grow history. Long-lived Workflows may replay slowly or exceed Service limits; caches reduce replay frequency without changing correctness. Measure history length and task latency. Continue-As-New starts another run with the necessary state input, avoiding all previous events in that new run. Dashboards should clearly relate Workflow and Run IDs.

Child Workflows have separate histories/lifecycles; parents observe results or send messages. This can divide a large workload, but is not merely a way to split packages. Keep one Workflow when history limits and coupling allow; create a child when the subprocess truly needs its own ownership, retry, state, or scaling.

Retain representative production histories or equivalent fixtures and run a replayer for changes. Task Failure logs help, but automated CI replay identifies the particular incompatible history. Determinism is a condition for old processes to continue after code changes, not merely a style rule.

## Check your interpretation

**Do repeated Workflow Task failures mean the order is already Failed?** Not necessarily. The execution may remain open while its tasks fail; inspect both states and causes.

**Will a new Worker rerun an Activity whose completed result is recorded?** Not solely because of replay. An attempt without recorded completion is different and needs idempotency.

**Can deleting history repair the problem?** Do not treat history as arbitrary editable state. Use supported engine mechanisms and reconcile actual side effects; history directly supports recovery.
