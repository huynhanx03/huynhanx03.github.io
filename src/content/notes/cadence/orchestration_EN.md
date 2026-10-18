---
title: "Orchestrating workflows with Signals, Queries, and Timers"
category: "Workflow Engine"
kind: "guide"
translationKey: "cadence/orchestration"
series: "Cadence"
seriesOrder: 5
description: "Choose primitives for incoming requests, state reads, schedules, and long-lived business coordination."
sources:
  - title: "Cadence Workflow Signals and Queries"
    url: "https://cadenceworkflow.io/docs/concepts/events"
  - title: "Cadence Timers"
    url: "https://cadenceworkflow.io/docs/concepts/timers"
  - title: "Cadence Schedules"
    url: "https://cadenceworkflow.io/docs/concepts/schedules"
  - title: "Cadence Child Workflows"
    url: "https://cadenceworkflow.io/docs/concepts/workflows"
draft: false
updated: 2026-10-15
---

An order waits 15 minutes for payment. A dashboard asks whether it still waits, a webhook reports payment, and expiry should release inventory. All look like Workflow communication, but their contracts differ.

Choose the guarantee first: submit an event, read state, await a deadline, or create a new execution unit. Cadence preserves progress across worker shutdowns without one ordinary Go goroutine remaining in RAM for the entire wait.

## Signal and Query have different contracts

Signals asynchronously send information into a running Workflow. The Client neither waits for processing nor directly receives its result. Use them for events such as delivery confirmation when synchronous feedback is unnecessary. If a Signal may arrive while another step runs, retain it in state or use SDK channels/selectors for ordered handling.

Queries read current state without adding history events. They suit dashboard status, but handlers must read Workflow memory rather than call databases or mutate state. A Query does not launch work; its answer represents a point in time and may become stale immediately.

Cadence provides asynchronous writes through Signals and reads through Queries; do not assign it Temporal's Update API. A write needing acknowledgment requires an explicit contract: Signal with request ID, persisted Workflow result and an application response path, or Query after establishing that the request was processed. Synchronous reads alone do not establish processing of a particular Signal. The comparison chapter explains why similar names do not ensure identical APIs/behavior.

### Successful submission is not completed processing

A webhook Signals `payment-received` with a request ID. Successful submission is not the business outcome “order is PAID.” The Workflow may await a task or finish other work. Applied-event acknowledgment needs a result correlated to that exact request ID.

Cadence supports eventual and strong Queries. A strong Query reflects events successfully received before the Query was issued; an eventual Query may not yet reflect the earlier Signal. Event receipt still does not prove every resulting Activity has finished. Track request IDs and business-completion state to distinguish these milestones. See [Consistent Query](https://cadenceworkflow.io/docs/go-client/queries#consistent-query).

Repeated webhooks need event identity representing the same logical action to prevent double increments/transitions. Signals deliver information without replacing business deduplication rules.

## Timers, Cron, and Schedules

Workflow timers durably wait: the Service records start/expiry in history and Workers may stop while waiting. Do not use Go `time.Sleep` in Workflow code; unrecorded local sleeping can retain process resources or disrupt replay.

Timers ask when this process stops waiting; Schedules ask when to start another recurring Workflow. Cron is the older recurring-start mechanism with more limited semantics. Cadence Schedules manage schedule state, pause, backfill, and overlap policy. If a previous run remains active, choose skip, buffer, concurrent, cancel, or terminate according to data meaning. Concurrent runs updating one account without coordination are unsafe.

Before backfilling, specify UTC times, the catch-up window, repeatable effects, and concurrency limits. Catch-up during overload can worsen it. Observe last/next runs and provide emergency pause procedures.

## Child Workflow or another branch in this Workflow?

Children suit work requiring separate lifetime/history, reuse, or parallel independent units. An order parent might start a child per product to check suppliers. But children add executions, tasks, and asynchronous communication; do not split merely for modular-looking code. Bounded work with tightly shared state and one owner is often clearer in one Workflow.

For multiple children, define whether parent closure leaves them running, cancels, or terminates them, and whether to await all or accept partial results. Bound concurrent children to avoid task storms. They do not share parent memory; results, Signals, and durable inputs/outputs form their contract.

### Payment and timer becoming ready together

Define what happens when payment arrives close to expiry. Timer firing does not prove the provider did not charge; a Signal still needs authentication/order validation. Use an explicit state transition policy, for example one decision from WAITING followed by reconciliation/refund handling for late external outcomes.

SDK selectors/channels support deterministic waiting, not a business policy for deadline races. Put that policy in the state machine so operators can explain the chosen branch.

## Cancellation, timeout, and compensation

Cancellation requests cooperation. A Workflow can stop waiting, cancel Activities/children, clean up, and close canceled. Termination stops execution forcibly without cleanup code. Use it when immediate closure is necessary and incomplete external state is acceptable; coordinated cancellation is generally safer for payments/shipping.

Saga compensation is not automatic transaction rollback. After successful reservation and failed charge, release is a new business operation. It too may fail or retry; implement idempotent compensation Activities, define ordering, and decide whether failed compensation stops or allows other steps. More effects require clearer business state.

Start by asking what enters the process and what it awaits. Choose Signals for asynchronous events, Queries for reads, Timers for within-execution waits, Schedules for recurring starts, children for independent units, and compensation when business reversal cannot be atomic.

## Check the primitive

**Should a Query mutate state to mark it viewed?** No. Use an appropriate write path; read handlers must not become implicit commands.

**Is a daily report an order timer or a Schedule?** A Schedule expresses independent daily executions; a Timer represents waiting/deadlines inside an existing execution.

**If release fails after charge failure, has the Saga rolled back?** No. Compensation is new work that can fail and needs retry or manual-handling state. Observe compensating steps too.
