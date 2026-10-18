---
title: "What Temporal is and a first Go Workflow"
category: "Workflow Engine"
kind: "guide"
translationKey: "temporal/fundamentals"
series: "Temporal"
seriesOrder: 1
description: "Understand the Service, Workers, Workflows, Activities, Namespaces, and Task Queues through a minimal Go application."
sources:
  - title: "What is Temporal?"
    url: "https://docs.temporal.io/temporal"
  - title: "Temporal Go SDK Developer Guide"
    url: "https://docs.temporal.io/develop/go"
  - title: "Temporal Task Queues"
    url: "https://docs.temporal.io/task-queue"
draft: false
updated: 2026-10-15
---

An order process has reserved inventory and is waiting to charge payment when the application process dies. After restarting, we need to know which steps finished, what remains pending, and whether continuing can duplicate side effects. Temporal supports this need for durable progress.

We write a Go Workflow as a stateful function, but the SDK executes it against an Event History. Temporal Service stores history and coordinates tasks; a Client starts executions and sends messages; application Workers poll Task Queues to run registered code. Workflows decide what happens next, and Activities perform I/O. In-memory state may be cached, but recovery relies on compatible code plus durable history rather than one Worker's RAM.

![Temporal Client, Service, Event History, Workers, and Activities communicate through Task Queues](/images/notes/temporal/temporal-architecture.jpg)

*The Service records history and coordinates tasks; Workers run application code, with Activities providing the I/O boundary.*

## Namespaces, Workflow IDs, and Task Queues

A Namespace is an administrative boundary for executions, configuration, and observation. The application chooses a business Workflow ID such as order-123. A Run ID identifies a particular run; retries, Continue-As-New, or reset can create another run in the same Workflow ID chain. Define conflict/reuse behavior for repeated starts rather than assuming one universal rule about whether a network retry creates another execution.

A Task Queue routes tasks to polling Workers. Code is registered with Workers; the Service does not execute it for the application. If an execution is open but stuck, check that Workers poll the correct Namespace/Task Queue, register the requested Workflow/Activity types, and have capacity. With multiple queues, keep names explicit in configuration and alert on Client/Worker mismatches.

## Run locally and follow the happy path

Follow the official local quickstart: start Temporal, create a Client, register the Workflow and Activities with a Worker, and start it. Use the Client to start an execution with matching Workflow ID and Task Queue. In the Web UI, observe the open state, Workflow Tasks, Activity Tasks, and final result. Starting twice with the same ID helps expose conflict/reuse policy early.

A minimal Go Workflow can call an Activity as follows:

~~~go
func OrderWorkflow(ctx workflow.Context, orderID string) error {
    options := workflow.ActivityOptions{
        StartToCloseTimeout: time.Minute,
        RetryPolicy: &temporal.RetryPolicy{
            InitialInterval: time.Second,
            MaximumInterval: time.Minute,
            MaximumAttempts: 5,
        },
    }
    ctx = workflow.WithActivityOptions(ctx, options)
    return workflow.ExecuteActivity(ctx, ReserveInventory, orderID).Get(ctx, nil)
}
~~~

These timeouts/retries are illustrative; real values must match dependency latency and requirements. If inventory reservation repeats after a timeout, the application must prevent reserving twice. Temporal may retry when the Service does not receive a result on time, but cannot create one atomic transaction across its database and an external provider.

### Read the code as a sequence of events

ActivityOptions attaches timeout and retry settings to reservation. ExecuteActivity requests orchestration; an Activity Worker calls the inventory system. Get waits through SDK mechanisms and returns an error on final failure. It is not a direct HTTP call inside Workflow code.

To integrate the snippet, import go.temporal.io/sdk/workflow, go.temporal.io/sdk/temporal, and time; define ReserveInventory and register it and the Workflow. Client/Worker bootstrap is omitted; the official quickstart supplies the connections for a whole program.

If a Worker is lost after the Activity result has been recorded, replay reuses that result. If the provider acted but no completion was recorded, another attempt may call it again. These two windows explain both Workflow recovery and the Activity's idempotency requirement.

## Design the Workflow as a reconstructible function

A Workflow keeps local variables and control flow, but its Temporal commands must remain compatible with history during replay. Put HTTP, database access, randomness, OS time, and LLM calls in Activities. Use SDK Workflow timers instead of time.Sleep, and SDK concurrency primitives instead of arbitrary Go goroutines. Understand this contract before adding substantial business logic.

Avoid one indefinitely growing Workflow for the whole system. Give each a stable business ID, versioned inputs, and completion or Continue-As-New when long lifetimes grow history. Begin with a clear scope/lifecycle; add Child Workflows for independently needed execution boundaries rather than package organization.

After the quickstart, stop a Worker during an Activity, restart it, and observe recovery. Application code need not manually snapshot its state after every process failure. The next lessons explain why recovery works, safe Activities, and deployment while older executions remain open.

## Check the lifecycle

**Does Temporal Cloud run application Activity code instead of Workers?** Not in this model. The application team still deploys Workers and manages dependencies.

**Is the correct Namespace enough if the Task Queue is wrong?** Workers must poll the correct queue and register the proper types, as well as use valid Namespace/connectivity settings.

**Does a successful start mean inventory has been reserved?** No. The response establishes execution creation; the business result follows task processing. Continue with [history and determinism](/en/notes/temporal/history-and-determinism/) to follow commands into events.
