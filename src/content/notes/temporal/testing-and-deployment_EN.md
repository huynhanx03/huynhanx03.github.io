---
title: "Testing Workflows and deploying compatible code"
category: "Workflow Engine"
kind: "guide"
translationKey: "temporal/testing-and-deployment"
series: "Temporal"
seriesOrder: 5
description: "Combine unit tests, time skipping, integration checks, and historical replay before rolling out Workers."
sources:
  - title: "Testing - Go SDK"
    url: "https://docs.temporal.io/develop/go/testing-suite"
  - title: "Patching"
    url: "https://docs.temporal.io/patching"
  - title: "Worker Versioning"
    url: "https://docs.temporal.io/worker-versioning"
  - title: "Workflow Definition"
    url: "https://docs.temporal.io/workflow-definition"
draft: false
updated: 2026-10-15
---

A new Workflow completes a new order successfully. Can the same code continue an order that has already waited three days? We do not know yet: the older order carries predeployment decisions in its history, which the new happy path never produced.

This lesson organizes evidence from pure logic through orchestration, integration, and replay. Each layer answers a different question; one layer's success does not replace another's.

## Separate testing layers

Unit-test pure calculations, next-step selection, and validation. Temporal Go SDK test environments for Workflows and Activities can control time to test timers, timeouts, Signals, and cancellation without real waiting. Mock Activities when testing orchestration branches; separate Activity tests focus on adapters and side effects. This prevents Workflow-policy errors from being obscured by HTTP or mock failures.

Integration tests with a Temporal test server or development environment cover type registration, serialization, Client configuration, Task Queues, and actual Worker–Service interaction. Keep representative end-to-end cases: start an order, Signal delivery confirmation, obtain an Activity result, and close in the intended state. Making every test an integration test slows feedback and introduces environmental failure noise.

## Replay old histories before release

Replay tests run new Workflow code against selected saved histories or fixtures. They are useful for changed branches, Activity ordering, command-type names, or state machines. Include long-open executions, error branches, fired timers, received Signals, and prevalent old versions. Investigate mismatches rather than deleting fixtures before understanding the change.

Replay proves compatibility with selected histories, not every possible execution. Capture production fixtures under sensitive-data controls, record version/SDK information, and keep a stable minimum set in the repository or CI. Real payloads need anonymization or suitable protection.

### A test set for replacing Reserve with Validate → Reserve

Pure Validate logic can be checked with valid/invalid inputs. Orchestration tests ensure validation failure never reaches Charge. Integration covers types, serialization, and queues. Replay uses old histories that called Reserve first and checks that new code still emits compatible commands.

These questions differ. Mocking successful Validate and completing a new Workflow does not prove old production histories can be read. Conversely, replay success does not prove a changed provider adapter uses the correct schema.

Include timer/message/error fixtures relevant to the change. Resolve data-access rights and payload protection before moving real histories into testing systems.

## Patching is a compatibility branch within Workflow code

Patch APIs record a decision in history so replay knows which branch applies. Go commonly uses workflow.GetVersion with compatible markers. An old execution replaying past the changed point without a marker may need the old branch; an execution reaching it for the first time after the change may record a new version. Start date alone does not decide the branch; the marker and history at that point do. When no execution needs the old branch, deprecate its marker according to SDK guidance.

Do not remove a marker immediately after one deployment because new tests pass. An old execution may not replay for weeks. Account for maximum lifetime, open-execution state, overlapping deployments, and history policy. Pair branch/history changes with replay fixtures so reviewers can see how old behavior remains readable.

## Worker deployment and the compatibility window

Worker Versioning manages which Worker versions receive execution tasks through supported Server/SDK mechanisms. Features depend on versions; consult the deployed combination before designing rollout. Versioning or patching must ensure every open execution can reach a compatible Worker. Do not leave running executions with only code unable to interpret their histories.

A release can run unit/integration tests, replay fixtures, deploy canaries, observe Workflow Task failure/nondeterminism, expand Workers gradually, and remove old branches only after relevant executions close. On rollback, verify old code understands histories the new version already wrote. Reverting a binary does not undo events.

### Rollback is another compatibility change

Suppose new code writes a marker or command, then the old binary returns. That binary must read histories created during the canary. “The old version used to work” does not answer this question.

Specify which Workers receive which executions, how long old Workers remain, and when old branches may be removed. Current Worker Versioning depends on Server/SDK versions; do not mix API generations merely because they share a label.

## Review checklist

Before merging, identify whether the edit affects new or open executions; replay affected branches; check Activity/Child Workflow names and command order; keep Activity side effects idempotent; and document marker retention/removal. For large rollouts, inspect open execution types/ages, canary by queue or Workflow type, and watch backlog, Workflow Task retries, and failures before expansion.

The purpose is to make compatibility repeatable in CI rather than discover stuck old executions after deployment. Changes remain possible with evidence and a supported transition.

## Check release evidence

**Does one passing replay fixture prove all executions compatible?** No. It covers selected histories; sample quality and rollout observation still matter.

**Can markers be removed when no new traffic enters old code?** Not yet. Long-lived executions and supported replay/reset paths may still need them.

**Does a correct mocked Activity replace integration tests?** No. Mocks do not exercise routing, serialization, SDK configuration, or real Service interaction. Choose each layer for the question it answers.
