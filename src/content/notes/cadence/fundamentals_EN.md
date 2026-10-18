---
title: "What is a durable workflow, and when should you use Cadence?"
category: "Workflow Engine"
kind: "guide"
translationKey: "cadence/fundamentals"
series: "Cadence"
seriesOrder: 1
description: "Understand durable execution, workflow engines versus queues, and when Cadence justifies its operating cost."
sources:
  - title: "Cadence Workflow Engine"
    url: "https://cadenceworkflow.io/docs/concepts/workflow-engine"
  - title: "Cadence Workflows"
    url: "https://cadenceworkflow.io/docs/concepts/workflows"
  - title: "Cadence Blog: workflow history"
    url: "https://cadenceworkflow.io/blog/2026/06/03/2026-06-03-workflow-history-data-converter/workflow-history-data-converter"
draft: false
updated: 2026-10-15
---

An order has reserved inventory, but its worker dies just before requesting payment. A new process must know which steps finished and which remain. Blindly restarting could reserve inventory or charge again.

Durable workflows manage progress across such interruptions. Side effects still require safe design; the engine provides history and resumed orchestration. A Cadence Workflow can wait, receive a Signal, and continue without one application process remaining alive throughout. Local variables are reconstructed from code and history, rather than arbitrary RAM snapshots.

## Workflow, Activity, Service, and Worker

A Workflow decides business order and policies. It should not call databases, HTTP, or payment systems directly because external results cannot safely be reproduced during replay. Side effects belong in Activities. An Activity may call external services, write data, and retry independently, so its operations must tolerate repeated invocation.

The Cadence Service records decisions and distributes tasks. A Worker is an application process you run; it polls a Task List, executes Workflow or Activity code, and reports results. Stopping workers does not lose durably recorded state, but without appropriate workers workflows cannot progress. Process-failure tolerance does not remove the need to operate workers.

### Follow progress after a worker dies

Suppose the Service recorded successful inventory reservation but no payment result. A replacement worker reconstructs “inventory reserved” from history. When replay passes the completed reservation step, the SDK supplies its recorded result rather than calling inventory merely because Workflow code runs again.

If inventory reserved successfully but the Service did not record its result, a later attempt may repeat the request. Idempotency and reconciliation address this window. Durable execution protects orchestration progress without creating an atomic transaction with inventory.

Durable history alone also does not guarantee immediate progress: Service/persistence must operate and suitable workers must return. A Workflow awaiting a user for two days differs from an Activity occupying a worker for two days.

## Why not just a queue or cron?

Queues suit independent messages: receive work, process, acknowledge, or retry. They do not automatically model a long process with branches, timers, waiting state, and compensating actions. You can build these using a database, outbox, scheduler, and custom state machine; Cadence combines durable execution mechanisms in one model.

In return, the team must understand replay/determinism, manage Service and persistence, operate Workers, control payloads, and change code while old executions remain alive. One independent email task rarely needs Cadence. Credit approval, onboarding, or multistep payments surviving downtime with inspectable history are stronger candidates.

## A decision exercise

Describe business states such as `PENDING_PAYMENT`, `PAID`, `SHIPPING`, and `REFUNDED`. For every step ask whether it waits externally, how long, whether retry is safe, what must compensate a later failure, and how operators find the execution. If answers require many state tables, scattered cron jobs, and handwritten retry logic, a workflow engine may reduce effort and risk.

Do not choose Cadence merely because a process contains many functions. Choose it when durable progress, recovery, observability, and exception handling outweigh platform cost. Prototype a real process with timeouts, retries, cancellation, and sensitive data; a happy-path-only prototype misses the hardest parts.

Following chapters use an order throughout: start with the smallest Workflow, add retrying Activities, process messages and timers, then test replay and move into production. Each primitive should address an observed requirement rather than appear merely because the SDK offers it.

## Check before choosing an engine

**Does one independent email task require a workflow engine?** The task count alone provides no strong reason. A queue with appropriate retry/state handling may suffice; examine waiting, branching, recovery, and visibility requirements.

**Does stopping a worker erase recorded state?** Not under the configured durability model, but tasks do not execute without the right worker. State durability and forward progress both need operations support.

**Do Activities still need duplicate protection with Cadence?** Yes. The window between successful side effect and recorded result remains. [Activity reliability](/en/notes/cadence/activity-reliability/) examines that boundary.
