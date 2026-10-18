---
title: "Advanced patterns: long-running processes, Nexus, and AI"
category: "Workflow Engine"
kind: "guide"
translationKey: "temporal/advanced-patterns"
series: "Temporal"
seriesOrder: 8
description: "Choose Continue-As-New, Schedules, children, Nexus, and durable agent execution according to lifecycle needs."
sources:
  - title: "Continue-As-New"
    url: "https://docs.temporal.io/develop/go/workflows/continue-as-new"
  - title: "Temporal Nexus"
    url: "https://docs.temporal.io/nexus"
  - title: "Durable execution for AI agents"
    url: "https://temporal.io/blog/of-course-you-can-build-dynamic-ai-agents-with-temporal"
  - title: "Cadence vs Temporal"
    url: "https://cadenceworkflow.io/faq/cadence-vs-temporal"
draft: false
updated: 2026-10-15
---

One Workflow receives events for months, another team exposes a long-running operation to many callers, and an agent waits for human approval before using a tool. All need durable state, but ownership boundaries and waiting contracts differ.

Advanced patterns help with defined needs: history growth, separate ownership, or progress across external calls. Examine Continue-As-New, Schedules/children, Nexus, and agents through those needs rather than adding primitives merely to complicate architecture.

## Continue-As-New keeps long-lived execution manageable

A Workflow may receive continuous Signals or live for months. Growing history increases replay work and duration. Continue-As-New closes the current run as Continued-As-New and starts another with summarized state input, retaining the Workflow ID chain but beginning a fresh Event History. It is neither retry nor reset: the application chooses state to carry and must retain everything necessary.

Choose a safe transition, commonly after handling pending messages or at a business boundary. Do not transition mid-external transaction with an unknown result. Carry compact state, continuation cursor/sequence, and schema version rather than copying history into input. Test Signals near the transition, active handlers, and restarted Workflows to prevent loss/duplicate handling. Check actual SDK/version behavior and limits.

## Schedules and Child Workflows follow ownership

A Schedule manages recurring starts as an ID-addressable resource, with timezone, overlap, catch-up, pause, and actions depending on platform/version. A Workflow timer belongs to one execution, such as an order's payment deadline. Use a Schedule for a report each morning and a timer for this order until 17:00. Define missed-run behavior after downtime; catch-up otherwise may launch many old jobs together.

Children suit subprocesses needing their own lifecycle, retry/timeout, history, or team owner. An onboarding parent might coordinate account-specific children. A simple step usually fits an Activity with less overhead. Share state through schema-defined input/results/messages, not parent/child shared variables. Define close/cancel behavior so parent completion does not leave children running unintentionally.

### Choose the unit that must live independently

Daily reports are usually separate scheduled executions. Continuous account tracking may be a Continue-As-New chain. Independently handled parts of one case may warrant children. These patterns are not interchangeable merely because all can run for a long time.

Ask which state belongs together and who must find/cancel/retry each unit. Choose boundaries, then assess history/task costs. Without an independent lifecycle need, a Workflow helper function may organize code sufficiently.

## Nexus serves cross-service or cross-team contracts

Temporal Nexus offers an operation abstraction for Workflows in one Namespace/service to call another service through a Nexus Endpoint, with request/callback lifecycle suitable for long-running operations. It clarifies independently owned domain contracts but adds endpoint management, Worker capabilities, authentication, versioning, and observability. Do not substitute it for an ordinary internal Activity merely for abstraction. Verify Server/SDK/version support, retries, timeouts, access rights, and correlation across the boundary.

Without a cross-service contract, Activities or Child Workflows via queues may be simpler. For independently evolving teams, specify operation ownership, schema compatibility, timeouts, error mapping, and target-service upgrades. A small caller/endpoint/handler/result diagram often clarifies the boundary better than extra wrappers.

## Durable execution for agents and reasoning processes

Agents call models/tools, await approval, then continue. Model inference and tool I/O are nondeterministic and belong in Activities. A Workflow retains approved inputs, pending steps, policies/timeouts, and recorded results. Replay reuses completed Activity results rather than calling the model again. This supports crash recovery without making model output correct or safe.

Bound tool capabilities, validate output, require human approval at risky decisions, keep PII out of history, set timeout/token budgets, and record prompt/model/policy versions needed to explain results. An LLM Activity can retry after a network failure even if the provider processed the request. Use supported request/idempotency strategies or retain an operation reference for reconciliation. Do not assume a fresh inference will reproduce an earlier one.

### Follow one inference through failure

If a proposal result is already in history, replay uses it even if the current model/prompt changed. If the provider processed the call but no result was recorded, retry can generate a different proposal and incur another cost.

Recording versions aids explanation, not bit-for-bit reproducibility. When output drives side-effecting tools, authorization, validation, and approval remain application contracts. Durable execution preserves progress rather than proving the proposal sound.

Nexus likewise needs an ownership-boundary contract: callers must understand received/running/completed states and error mapping. An abstraction does not remove access-control or operational responsibility.

## Cadence, Temporal, or a queue?

Temporal fits long-lived multistep processes, event/timer waits, stateful retries, progress auditing, and process-failure recovery. Plain queues often fit independent high-throughput jobs with stateless consumers and no days-long orchestration. A backend may combine queue ingestion/fan-out with Workflows coordinating business lifecycles.

Cadence and Temporal share durable-workflow ideas but evolve separately. History/replay intuition, Activity boundaries, and idempotency transfer; SDKs, deployment, versioning, APIs, and features are not automatically compatible. Compare versions, features, Cloud/self-hosting, observability, security, governance, operating costs, and support. Migration must plan open executions, histories, and parallel operation; changing endpoints does not transfer running state.

A design review should identify Workflow state, Activity side effects, expected lifetime, idempotent operations, compatible deployment, and ownership of stuck executions. If those remain unclear, simplify before adding another primitive.

## Check the proposed pattern

**Does Continue-As-New copy all history into new input?** No. Carry the minimum state needed for correct continuation; copying history recreates the size problem elsewhere.

**Does Cadence knowledge imply Temporal SDK/history compatibility?** No. Separate common concepts from concrete APIs/formats and plan open-execution migration.

**Can a durable model result skip validation?** No. Persistence is neither correctness nor authorization to act on the result.
