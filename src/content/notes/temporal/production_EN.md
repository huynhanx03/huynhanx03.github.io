---
title: "Operating Temporal and Workers in production"
category: "Workflow Engine"
kind: "guide"
translationKey: "temporal/production"
series: "Temporal"
seriesOrder: 7
description: "Plan responsibilities, capacity, Namespaces, persistence, upgrades, and incident response for Cloud or self-hosted Temporal."
sources:
  - title: "Temporal Platform production deployments"
    url: "https://docs.temporal.io/production-deployment"
  - title: "Workers"
    url: "https://docs.temporal.io/workers"
  - title: "Temporal Service"
    url: "https://docs.temporal.io/temporal-service"
  - title: "Temporal Visibility"
    url: "https://docs.temporal.io/visibility"
draft: false
updated: 2026-10-15
---

The Service API responds, but orders stop progressing after a Worker deployment. This alone does not establish lost Temporal data: Workers might not poll, register the wrong types, or repeatedly fail while interpreting history.

Production needs a responsibility map. Temporal Cloud manages Service components within its offering; the application team still operates Workers, code, and dependencies. Self-hosting adds servers, persistence, Visibility, backup, security, and recovery. Choosing an endpoint location does not replace a whole-system plan.

## Separate the Service from Workers in the responsibility map

Clients issue commands/queries; Temporal Service retains Workflow state, dispatches tasks, tracks timeouts, and manages history; application-deployed Workers poll queues and execute code. A healthy Service cannot progress Workflows without correctly registered, running Workers. Healthy Workers cannot repair persistence or Service connectivity failures.

Organize runbooks by API/Namespace/connectivity, persistence/Visibility, queue routing, Workflow Tasks, and Activities/dependencies. Include metrics, dashboards, logs, and safe actions per layer. Before production, exercise Worker loss/restart and short downstream outages; confirm task recovery, Activity idempotency, and useful alerts.

## Capacity and backlog classification

Task Queues route work rather than designate one fixed Worker. Clients/Workers must agree on Namespace/queue, and Workers must register required types. Track backlog and schedule-to-start by queue/workload. A brief burst may be normal; sustained growth with latency indicates insufficient capacity or downstream throughput.

Scale by CPU, memory, concurrency, and dependency quotas. More parallel Workers can overload databases/APIs, causing timeouts and a retry storm. Set appropriate poller/Activity concurrency limits, scale cautiously from lag, and reserve capacity for deployments or zone loss. For Workflow Task backlog, inspect deterministic code and replay speed: long histories can raise CPU per task.

### One backlog number cannot prescribe every response

| Observation | Hypothesis to investigate |
| --- | --- |
| High Activity schedule-to-start, few pollers | Worker capacity shortage or wrong queue |
| Activities start but frequently time out | Dependency, deadlines, or processing code |
| Repeated Workflow Task failure on one history | Version compatibility, determinism, or code |
| A Workflow waits for its intended timer | Possibly normal operation |

These direct investigation rather than prove causes. More Workers can worsen an overloaded dependency; more pollers cannot fix commands incompatible with history. Connect metrics to a representative execution trace.

## Namespaces, access, and data

Namespaces separate configuration and executions; use consistent environment/team/domain naming. Manage endpoints, TLS, credentials, and Client/Worker permissions through a secret manager, with rehearsed rotation. Support actions such as history inspection, terminate, reset, or Signal need auditing and explicit authorization roles.

History can contain application inputs/results. Define retention from debugging needs, cost, data obligations, and continuation requirements. Exercise archival and large/sensitive-data policies against actual deployed versions. Calling a field metadata does not make it harmless; classify Search Attributes and logs too.

## Deployments and upgrades must preserve open executions

Workflows can outlive releases. Attach Worker build/version to telemetry, run replay regressions, canary, and retain older code where open executions need it. Deployments can change routing, serialization, or Activity behavior; prepare Worker rollback and history compatibility. Server/SDK upgrades also need release-note review, compatibility checks, backup before storage changes, and recovery plans.

Runbooks must require state inspection before terminate/reset. Reset continues a branch from a selected history point; it does not erase external side effects. Determine what Activities already did, their idempotency keys, and whether the business intends continuation, compensation, or a new execution.

### What must be known before a reset?

Identify the intended history point, existing external effects, and their deduplication keys. Returning to an earlier point may request an action again; a provider's delivered parcel does not become undelivered because the engine has a new run.

Separate intervention permissions from diagnostic read permissions. Define owners, pre/postconditions, and business-state verification rather than one universal command for every incident.

## Alerts and incident response

Alert on service impact: rising latency/API errors, sustained backlog, missing pollers, increased Activity retries/timeouts, slow persistence, or excessive failed executions. Choose time windows/thresholds from SLOs instead of alarming on every retry. Link dashboards, Visibility queries, and diagnostic actions in runbooks.

For stuck queues, first distinguish tasks awaiting Workers from Workers awaiting dependencies. Repeated Workflow Task failure calls for checking nondeterminism, version/registration, and history instead of blindly increasing Worker count. Excessive Activity retries need dependency protection through concurrency limits, backoff, and suitable circuit policies; permanent errors need a path out of infinite retry. After incidents, add history fixtures or fault-injection cases so lessons become repeatable checks.

## Check operational assumptions

**Does Cloud remove Worker/downstream monitoring needs?** No. Those components still determine whether business progress occurs.

**Does closed-history retention reduce history of open Workflows?** No. Long executions need suitable state boundaries/Continue-As-New, not deletion of replay data still required.

**Must every retry alert?** No. Choose SLO/impact-based signals, while ensuring persistent retries and permanent errors have visible handling rather than disappearing behind automatic retry.
