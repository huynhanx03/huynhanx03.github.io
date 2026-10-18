---
title: "Operating Cadence in production"
category: "Workflow Engine"
kind: "guide"
translationKey: "cadence/production-operations"
series: "Cadence"
seriesOrder: 7
description: "Connect deployment topology and Task Lists to Worker scaling, CLI investigation, retention, and multi-region decisions."
sources:
  - title: "Cadence Deployment Topology"
    url: "https://cadenceworkflow.io/docs/concepts/topology"
  - title: "Cadence Task Lists"
    url: "https://cadenceworkflow.io/docs/concepts/task-lists"
  - title: "Cadence CLI"
    url: "https://cadenceworkflow.io/docs/cli"
  - title: "Cadence Cross-DC Replication"
    url: "https://cadenceworkflow.io/docs/operation-guide"
draft: false
updated: 2026-10-15
---

The queue grows while Worker CPU remains low. Should replicas be added immediately? If Workers are waiting on an overloaded database, more replicas may merely create more waiting requests. If they poll the wrong Task List, adding the same incorrect configuration will not receive work either.

Operating Cadence begins with responsibility boundaries: the Service manages APIs, state, history, and routing; persistence and visibility retain their respective data; application Workers execute logic and call dependencies. Check actual components/configuration against the deployed version's topology. These boundaries help locate the cause before intervening.

## Operate Workers as backend services

Workers poll Task Lists and consume CPU, memory, and database/provider connections. Monitor backlog, schedule-to-start delay, attempts, processing duration, and failures. Growing backlog with low CPU can indicate downstream limits or missing registration; replicas may overload the dependency further. Scale by task type and concurrency limits while retaining recovery capacity for region or Worker-group failures.

A Task List is a routing contract. Choose meaningful workload names, avoid mismatched client/Worker hard-coding, and review rollouts when renaming because old tasks may still wait. Separate Task Lists for resource, access, or SLA isolation; excessive queues increase deployment and observability complexity.

### Classify before scaling

| Observation | Investigate first |
| --- | --- |
| Long start delay, insufficient matching pollers | Worker health, Domain/Task List, registration, and capacity |
| Long-running Activities or increasing retries | Dependency latency, quotas, deadlines, and idempotency |
| Repeated Workflow Task failures after deployment | Code/history compatibility and nondeterminism logs |
| One execution waiting for a Signal | Business condition, message arrival, and handler state |

These are diagnostic hypotheses rather than conclusions from one metric. Compare representative execution histories with telemetry before selecting an intervention.

## Use the CLI to investigate, alongside observability

The CLI can describe/list workflows, inspect history, query handlers, signal, cancel, or terminate executions. For a stuck order, use its Workflow ID to inspect the latest event, Task List, and Activity attempts. Follow history in sequence: was a Workflow Task scheduled/started; was an Activity created; did it time out or fail; is a timer pending; did a Signal arrive?

Signal, cancel, terminate, and batch commands directly affect executions. Runbooks need preconditions, expected outcomes, required permissions, and verification rather than treating terminate as the first response. Cancel gives code a cleanup opportunity; terminate stops noncooperatively. Record a reason with business context and maintain audits under internal policy.

## Storage, retention, and replay capacity

Retain Event History long enough for investigation and workflow continuation. Too little retention can prevent inspection of closed executions; indefinite storage increases cost. Choose according to support, security, compliance, and persistence capacity. External-blob retention must also match executions that can retry or Continue-As-New. Rehearse backup/restore: a database snapshot alone does not prove applications can decode payloads and resume replay.

Long histories increase replay work and may reach limits. Monitor large histories, use Child Workflows for genuinely independent workloads, and Continue-As-New for recurring executions retaining a Workflow ID. Do not truncate history for cost savings without establishing complete state transfer.

### Retention does not replace backup

Retention typically governs closed-execution data through engine mechanisms. Open workflows still need history; do not impose arbitrary storage deletion based solely on execution age. External blobs and decryption keys must survive their designed lifetimes too.

A backup matters when the complete read path and application recover. Restored persistence with missing keys or incompatible Worker code does not establish resumability. Rehearsals must check that dependency chain in an authorized environment.

## High availability and multiple data centers

Multi-DC replication requires more than a flag. Establish the Domain, orchestration authority, replication lag, partition behavior, and failover/failback procedures. Check version compatibility and failover policy in the relevant Cadence documentation. External Activity side effects can still collide when both sides retry; business-level idempotency remains an important protection.

Before production rollout, hold a game day: stop a Worker mid-Activity, induce dependency timeouts, restart Service components according to topology, restore persistence, and exercise failover where configured. Measure detection time, backlog recovery, and successful execution continuation. Define SLOs for Activity start delay, oldest waiting workflow age, and task failure rates; dashboards should lead from aggregate metrics to individual executions.

A usable runbook identifies Service/persistence and Worker owners, distinguishes backlog from code failure, explains when to pause a Schedule, how to replay-test history, what history can expose, and when to escalate to a provider/platform team. Answers existing only in one person's memory do not support sustainable operations.

## Check incident responses

**Does terminate automatically undo an existing shipment?** No. Understand actual side effects and business state before intervention; compensation or reconciliation may be needed separately.

**All Workers poll correctly, backlog grows, and downstream reports rate limiting: is higher concurrency the default?** No. Adjust admission, concurrency, and backoff to dependency limits and business budgets.

**Does one successful failover guarantee every side effect happened exactly once?** No. Repeated external calls still need idempotency and ownership control.
