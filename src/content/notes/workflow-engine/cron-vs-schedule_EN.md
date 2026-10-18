---
title: "Cron vs. Schedule"
category: "Workflow Engine"
kind: "note"
translationKey: "workflow-engine/cron-vs-schedule"
series: "Workflow Engine"
seriesOrder: 1
description: "Schedules add overlap, pause, and backfill policies to recurring work; choose a policy based on its business meaning."
sources:
  - title: "Cadence Schedules release blog"
    url: "https://cadenceworkflow.io/blog/2026/06/23/cadence-schedules"
draft: false
updated: 2026-10-15
---

An ETL job is scheduled to run every hour, but the 09:00 run takes 90 minutes. Should another run start at 10:00? If so, can both runs write to the same output table? If not, is the 10:00 data window skipped or processed later?

A cron expression defines the expected times. An execution policy decides what happens when runs overlap, a run starts late, or missed runs need to be recovered. Schedulers may have their own mechanisms, so distinguish a cron expression from a complete scheduling product. This article uses Cadence Schedules to explain those decisions; do not transfer its policy names to Temporal.

## Follow a schedule whose runs overlap

Suppose each run processes a separate data window, such as [09:00, 10:00). The 09:00 run starts on time but has not finished when 10:00 arrives. Different business requirements lead to different choices:

| Business meaning | Possible handling | Risk to consider |
| --- | --- | --- |
| Only the latest result matters | Skip the new run or replace the old run, as required | A window that still matters may be skipped |
| Every window must be processed | Queue runs and cap the backlog | Processing will fall behind the schedule indefinitely if it is slower than the arrival rate |
| Windows are independent | Allow bounded concurrency | Several runs may place a large load on dependencies at once |

The scheduled time and the time a worker actually begins are different values. ETL should derive its data window from schedule information or an explicit input contract; it should not assume that the worker's current clock always identifies the window to process. This lets a delayed run still process the correct data.

## A Schedule becomes a manageable object

Cadence Schedules lets you manage a schedule on the server, inspect it, and change it. The documentation checked on 2026-10-15 lists the policies `SkipNew`, `Buffer`, `Concurrent`, `CancelPrevious`, and `TerminatePrevious`. Buffering and concurrency have limits that must be configured; the queue is not an unlimited store for every missed run. The API also supports pausing, unpausing, and backfilling. See [Schedules](https://cadenceworkflow.io/docs/concepts/schedules) and check the server and SDK versions you use before applying these features.

In the example above, choosing Buffer makes sense only if the system can eventually catch up. If each hour creates 90 minutes of work but only one run can execute at a time, the backlog keeps growing. A policy that is valid syntactically does not solve insufficient processing capacity.

## Pause, backfill, and duplicate runs

Pausing a schedule usually means stopping new runs; it does not automatically cancel executions already underway. After resuming, decide whether to skip missed runs, execute some of them, or backfill a time range. Backfilling several hours can create a traffic spike, so consider overlap and resource limits together.

Each ETL run should have a business key that identifies its processing window and version. If the 09:00 window is run again, writes must avoid duplicating metrics or follow an explicit replacement policy. A Schedule does not make an Activity idempotent by itself.

Cancellation is cooperative: code may still be cleaning up, and external I/O may already have happened. Termination forcibly closes the execution; it does not undo side effects already issued. Stopping an execution in the engine also does not prove that an external process or provider has stopped every operation. Choose a policy based on the task's side effects, not only its status in the UI.

## Before putting a schedule into use

Write down what happens when runs overlap, the maximum backlog, how far to backfill after downtime, who may pause the schedule and record a reason, and how to find the next run, last run, and failed runs. In a test environment, run a task longer than its interval and observe whether the next run is skipped, buffered, or overlaps. Check its data window and writes too: the expected execution status alone does not establish correct ETL data.

**Check your understanding.** If every window matters, does SkipNew guarantee that all data is processed? No. It may skip a run; use buffering, backfilling, or an intentional way to combine windows.

If a task only writes the latest report, should you default to TerminatePrevious? There is not enough information. You need to know whether the old task could leave a file or transaction incomplete and whether an external system might continue writing.

[Workflow History](/en/notes/workflow-engine/workflow-history/) explains why runs and payloads remain data that must be managed. The schedule feature was introduced in the [Cadence Schedules blog](https://cadenceworkflow.io/blog/2026/06/23/cadence-schedules); do not infer an exact supported version without checking the release used in your environment.
