---
title: "Replay, determinism, and changing running Workflows"
category: "Workflow Engine"
kind: "guide"
translationKey: "cadence/replay-and-code-changes"
series: "Cadence"
seriesOrder: 3
description: "Understand history-driven state reconstruction, Activity idempotency, replay compatibility, and safe code evolution."
sources:
  - title: "Cadence Workflows"
    url: "https://cadenceworkflow.io/docs/concepts/workflows"
  - title: "Cadence Workflow Versioning"
    url: "https://cadenceworkflow.io/docs/go-client/workflow-versioning"
  - title: "Cadence Workflow Replay and Shadowing"
    url: "https://cadenceworkflow.io/docs/go-client/workflow-replay-shadowing"
  - title: "Cadence Continue-As-New"
    url: "https://cadenceworkflow.io/docs/go-client/continue-as-new"
draft: false
updated: 2026-10-15
---

A Worker holds `reserved=true` when its process dies. RAM state disappears, but if reservation success was recorded in Event History, another Worker can reconstruct the same decision branch. It reruns Workflow logic against history without automatically repeating the completed side effect.

History records ordered events such as execution start, Activity scheduling/results, timers, Signals, and completion. During state-reconstructing replay, the SDK matches previous commands against history, supplies recorded results, and reaches the point requiring a new decision. Workers may cache state between tasks; every Workflow Task need not replay everything from the beginning.

This requires determinism: the same input/history must produce compatible commands. Do not directly use the operating-system clock, randomness, changing globals, files, databases, or HTTP inside a Workflow. Use SDK clocks, timers, and concurrency primitives; place I/O in Activities. Reordering timers or tasks can break replay compatibility.

## Side effects and idempotency

Activities are outside the replay path but can execute repeatedly after timeouts, Worker crashes, or lost responses. A payment provider might charge successfully before an Activity dies without reporting completion; retry can charge again. Use application-generated idempotency keys derived from business identity, queryable stored outcomes, and operations safe to retry. Do not assume Cadence calls an Activity exactly once.

Completed Activities are normally recorded with results. Later Workflow replay reuses those results to restore variables and branches. An unfinished side effect or result not durably acknowledged can instead be attempted again. Each integration needs reconciliation: find a charge by idempotency key, inspect reservation status, or compensate when safe repetition is impossible.

### Two different failure windows

| What history records | During replay | Can the external system be called again? |
| --- | --- | --- |
| Successful Activity and its result | Supply the recorded result to the Workflow | Not because of that replay alone |
| Provider succeeded but result was not recorded | No recorded proof of completion | Possibly in a subsequent attempt |

The distinction is durable engine recording, rather than merely the Activity function reaching its last line. This explains why replay avoids old I/O while Activities still require idempotency.

## Code changes can invalidate old history

Suppose the original code calls Reserve, then Charge. New code inserts Validate before Reserve. Replaying old history may now request Validate where history records Reserve, producing incompatible commands. This is compatibility with past decisions rather than a type error. Short executions may finish before encountering the change, but multi-day workflows keep old histories active across code versions.

Cadence's `workflow.GetVersion` enables compatible branches. Preserve the old branch for histories preceding the marker while new executions use the new one. A healthy deployment alone is insufficient reason to delete the old branch: first establish whether any executions still need it. Production histories should become pipeline replay fixtures to catch nondeterminism before release.

~~~go
version := workflow.GetVersion(ctx, "reserve-before-charge", workflow.DefaultVersion, 1)
if version == workflow.DefaultVersion {
    // Preserve the command order recorded by the earlier execution.
    if err := workflow.ExecuteActivity(ctx, Reserve, orderID).Get(ctx, nil); err != nil {
        return err
    }
} else {
    if err := workflow.ExecuteActivity(ctx, Validate, orderID).Get(ctx, nil); err != nil {
        return err
    }
    if err := workflow.ExecuteActivity(ctx, Reserve, orderID).Get(ctx, nil); err != nil {
        return err
    }
}
~~~

This fragment illustrates version-marker placement. Check the actual SDK API and test both old histories and new executions. Activity renaming, moving commands between branches, or timer reordering require history-based assessment rather than assuming the logic is unchanged.

### Read the marker in the example

DefaultVersion identifies the path compatible with history from before a marker existed at this change point. The new path runs Validate then Reserve; the old path retains Reserve. Charge, ActivityOptions, and function registration are outside the illustrative fragment.

A marker is a recorded historical decision rather than a feature flag reread from the environment. Changing an external flag during replay can send an old execution down another branch. Removing old code must consider histories still needing it and supported replay/reset behavior, not only current traffic percentages.

## History cannot grow without limit

Long-lived Workflows accumulate Event History. Large histories cost replay time and can approach Service limits. Continue-As-New closes the current run and starts another with the same Workflow ID and selected input state; old history is not copied into the new run. Serialize the minimum required state explicitly, account for pending messages, and preserve business continuity across the transition.

Treat Workflow code as a protocol with existing executions. Whenever command order changes, ask what old history will cause the new code to emit. Use version markers where needed, retain history fixtures, run replayers, and monitor Workflow Task failures after deployment. This turns determinism into a verifiable release practice.

## Check compatibility reasoning

**Does success for new executions establish old-history compatibility?** No. Compare against commands already recorded by old histories.

**Does Continue-As-New automatically transfer every variable and pending Signal?** No. The application selects input state and handles the API transition, including unprocessed messages.

**Do more replicas repair deployment-induced nondeterminism?** No. Incompatible code can keep failing; correct or route to compatible Workers and verify against appropriate histories.
