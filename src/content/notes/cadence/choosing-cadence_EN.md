---
title: "Choosing Cadence or Temporal for a new workflow"
category: "Workflow Engine"
kind: "guide"
translationKey: "cadence/choosing-cadence"
series: "Cadence"
seriesOrder: 8
description: "Compare models, SDKs, deployments, ecosystems, and migration costs rather than assuming identical APIs."
sources:
  - title: "Cadence Workflow Engine"
    url: "https://cadenceworkflow.io/docs/concepts/workflow-engine"
  - title: "Temporal Documentation: Evaluate Temporal"
    url: "https://docs.temporal.io/evaluate"
  - title: "Cadence and Temporal comparison notes"
    url: "https://cadenceworkflow.io/faq/cadence-vs-temporal"
draft: false
updated: 2026-10-15
---

Two teams need long-lived processes: one already operates Cadence reliably, while another starts fresh and needs a particular SDK or feature. The same problem need not imply the same platform choice because operating capability and switching costs differ.

Both Cadence and Temporal use Workflows, Activities, Workers, and history for durable execution. Transfer intuition between them, not unchanged assumptions about APIs, servers, or execution data. This article provides comparison criteria rather than ranking product names. Verify every feature statement against the relevant version, SDK, and deployment.

## Begin with operating requirements

List team languages/SDKs, Service hosting, supported persistence, visibility, encryption, Schedules, multi-region needs, observability, and self-operation capability. Verify key features in the actual SDK rather than only the server landing page. A Service feature may not yet be exposed by your SDK; capabilities can differ between Cloud and self-hosted deployments or versions.

An organization with stable Cadence operations, dashboards, and runbooks may face switching costs greater than the benefit of a new API. Starting fresh, compare SDK maintenance, documentation, community, release cadence, tooling, model support, managed services, and upgrade paths. Score agreed priorities rather than personal preference.

### A decision matrix needs evidence

Suppose mandatory requirements include language X, schedule policy Y, and decoding old history in a self-hosted environment. Record the inspected version, working examples, and encountered limitations for each platform. A landing-page feature differs from your SDK supporting the necessary failure paths.

Separate exclusion criteria from preferences. Missing a required SDK can eliminate an option; a familiar UI may merely score a preference point. Weights should not conceal an unmet hard requirement. Mark unknowns as unverified rather than guessing scores.

## Similar names do not establish equivalence

Both Workflow/Activity models separate orchestration and side effects, but SDK details, commands/history, retry options, and naming differ. Cadence Signal/Query do not imply Temporal Signal/Query/Update equivalence. Compare Cron, Schedule, child workflows, cancellation, visibility, and versioning by behavior. Build a table of important application paths, checking them with code samples and integration tests.

A useful prototype goes beyond hello-world: include a long timer, Activity retries, webhook Signal, cancellation/compensation, history replay after code changes, sensitive payloads, dashboard queries, and deployment rollback. Evaluate developer workflow, recovery speed, failure visibility, operating effort, and discovered limits. Use sufficiently representative load/data to reveal differences.

## Migrating a live system is a data problem

Long-lived executions are attached to history and past decisions. Do not assume an open history can be moved between engines and replayed unchanged. Even similar code may use incompatible event encoding, timers, retries, Activity IDs, or signals. Often safer is letting old executions finish on the old engine while new ones start on the new platform, or defining migration at a business boundary with verified resumable state.

Inventory open executions, maximum SLAs, unfinished side effects, transferred data, and rollback triggers. Map business IDs to old/new Workflow IDs and Run IDs. Do not let both engines own one process without explicit fencing/idempotency. Read-only parallel operation or shadow mode can compare state without producing duplicate side effects.

### Choose a migration boundary

For a paid but unshipped order, a new Workflow must know who still has authority to create the shipment. If the old engine can resume, concurrent orchestration can duplicate effects. Migration needs a business checkpoint, identity mapping/locks, and a mechanism preventing the old owner from issuing unwanted commands.

Letting old executions finish is one option, but may miss migration deadlines. If early transfer is required, include design and reconciliation cost in the decision from the outset.

## Make a context-specific decision

Choose Cadence when its deployment, SDK, and ecosystem meet requirements, the team can operate it, and switching benefits do not outweigh migration costs. Choose Temporal when a specific feature, SDK, Cloud/deployment option, or support arrangement meets a requirement Cadence does not in your environment. This is version/context-dependent, not a universal claim that one platform is better.

Record mandatory needs, rejected options, prototype results, inspected versions/docs, operating costs, upgrade plans, and reconsideration conditions. The decision can then change with SDKs or requirements, and later teams understand why the engine was selected.

## Check the comparison

**Can similar Go Workflow code migrate open history simply by changing endpoints?** No. Event encodings, commands, and APIs may differ; plan actual state migration.

**Should one vendor's comparison be the only evidence?** No. Use it to identify questions, then check both platforms' documentation and capabilities against identical criteria.

**Does successful hello-world suffice for production selection?** No. It misses retry, cancellation, history upgrades, and sensitive-data paths that drive operating cost.
