---
title: "Running Cadence and building your first Go workflow"
category: "Workflow Engine"
kind: "guide"
translationKey: "cadence/first-workflow"
series: "Cadence"
seriesOrder: 2
description: "Follow a Go Workflow through Client, Service, and Worker, including IDs, Task Lists, and durable state."
sources:
  - title: "Cadence Workflows"
    url: "https://cadenceworkflow.io/docs/concepts/workflows"
  - title: "Cadence Activities"
    url: "https://cadenceworkflow.io/docs/concepts/activities"
  - title: "Cadence Deployment Topology"
    url: "https://cadenceworkflow.io/docs/concepts/topology"
  - title: "Cadence Go samples"
    url: "https://cadenceworkflow.io/docs/get-started"
draft: false
updated: 2026-10-15
---

Start with a small complete loop: a Client starts an order, a Worker receives work, an Activity reserves inventory, and the Workflow receives its result. Knowing who issues commands and who runs code makes an open but stalled execution easier to diagnose.

In Cadence, Clients communicate with the Service; it stores history and routes tasks; application Workers poll the correct Task List to execute registered code. The Service does not fetch and run Go application code itself. Treat these as separate roles even when local development places them on one machine.

## Set up the smallest environment

Use the official development environment instructions, create a Domain, and run the Service and Web UI. The first goal is not production topology but the full lifecycle: start execution, receive a Workflow Task, call an Activity, receive its result, and close successfully. Record Server and Go SDK versions because Schedule, Visibility, and options vary by release.

Register Workflow and Activity functions before the Go Worker begins polling, then create it for the Domain and Task List. The Client can run separately; Workers usually run continuously in an application service. Starting sends the workflow type, input, Workflow ID, Task List, and timeout. Start does not mean business completion: the Client receives a handle for lookup, awaiting results, or later signals.

~~~go
func OrderWorkflow(ctx workflow.Context, orderID string) error {
    options := workflow.ActivityOptions{
        ScheduleToStartTimeout: time.Minute,
        StartToCloseTimeout:    30 * time.Second,
    }
    ctx = workflow.WithActivityOptions(ctx, options)

    return workflow.ExecuteActivity(ctx, ReserveInventory, orderID).Get(ctx, nil)
}
~~~

This is an illustrative outline. Real timeout settings depend on Activity SLAs, errors need classification, and inventory reservation needs an idempotency key. Keep I/O outside the Workflow function. It issues an Activity command; Cadence records commands/results for replay.

The outline does not set `RetryPolicy`, so it does not enable automatic Activity retries in Cadence Go. Add a policy with backoff, limits, and error classification when retries are needed; see [Cadence Go retries](https://cadenceworkflow.io/docs/go-client/retries). The two timeout settings alone do not promise retries.

### Read the outline as an execution sequence

`workflow.WithActivityOptions` creates a context carrying Activity call policies. `ExecuteActivity` requests reservation; `Get` waits through the SDK's Workflow mechanism. The inventory HTTP request is not executed directly inside the Workflow function.

If Activity completion is in history, replay reuses that result. Without a correctly routed Activity Worker, the Workflow can remain open while its task waits and timeouts still apply. Distinguish execution started, Activity received, and business operation completed.

The fragment needs `go.uber.org/cadence/workflow`, `time`, `ReserveInventory`, and SDK-specific worker/client registration. It defines the Workflow portion, not a standalone quickstart.

## Workflow ID represents business identity

A Workflow ID often identifies the orchestrated object, such as `order-12345`. It supports lookup and can prevent duplicate starts under the chosen reuse/conflict policies. Run ID identifies one run; retries or Continue-As-New may create another run within the execution chain. Do not confuse Workflow ID with a temporary HTTP request ID: define what happens when a Client retries after a network timeout.

## Task Lists and Workers

A Task List is a logical queue routing tasks to suitable Workers. Producers and polling Workers must agree on its name. Separate Workers by Activity group, reliability, resources, or access permissions when useful, but avoid premature separation that adds deployment overhead. With no polling worker, tasks are not necessarily lost; they wait, while backlog and timeouts need monitoring.

Initially verify Domain, Workflow ID, Workflow Type, and Task List in Web UI or CLI. For a running but stalled execution, check worker health, type registration, exact queue name, and blocked Activities. This separates routing/configuration failures from business failures.

The image highlights ownership: history belongs to the Service, while Workers can be replaced. Replay reconstructs state from recorded completed results; external calls may still occur for new Activities or retry attempts.

![Cadence reconstructs a Workflow from history without rerunning completed Activities](/images/notes/cadence/durable-replay.png)

*The Service stores Event History; a Worker replays decisions and continues from recorded Activity results.*

## Check the first complete loop

**Start returned a handle but no worker exists: is inventory reserved?** You cannot conclude an Activity ran. The handle indicates execution creation/acceptance according to the response, not the business outcome.

**Client uses Task List A but Workers poll only B: will more B replicas help?** No. Correct routing/registration for the waiting task first.

**Should an HTTP start retry immediately choose a new Workflow ID?** Not by default. It may duplicate the business process; use stable identity and appropriate reuse/conflict policies.

After the happy path, read [Replay and code changes](/en/notes/cadence/replay-and-code-changes/) to understand recovery beyond rerunning an ordinary function.
