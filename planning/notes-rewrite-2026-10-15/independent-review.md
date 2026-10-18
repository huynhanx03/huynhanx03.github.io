# Independent editorial review — actionable findings

## [P2] Explain Cadence's retry-policy timeout overrides before treating the configured timeout as the business budget

Location: [cadence/activity-reliability_VI.md:31](/Users/nhan.huynh1/coding/self/huynhanx03.github.io/src/content/notes/cadence/activity-reliability_VI.md:31), with the generic qualification at line 33.

The paragraph presents Schedule-to-Start as the queue limit and Schedule-to-Close as the all-attempt budget without explaining that Cadence retry policy changes the effective values. In the documented Go/server behavior, enabling RetryPolicy extends/overwrites the scheduled event's ScheduleToStart and ScheduleToClose to ExpirationInterval, or the workflow timeout when expiration is absent. A reader setting a short ScheduleToClose and a longer retry expiration can therefore run well beyond the presumed budget. Replace the generic “check the relation” sentence with this concrete Cadence rule (scoped to the documented SDK/server behavior), and say which effective bound actually enforces the business deadline. Also distinguish Go's required explicit ScheduleToStart/StartToClose options from the conceptual four-timeout list.

Evidence: [Cadence Go retry documentation](https://cadenceworkflow.io/docs/go-client/retries), the section describing history changes under RetryPolicy; [Cadence Activities](https://cadenceworkflow.io/docs/concepts/activities), timeout validation/default differences. This finding concerns parameter interpretation, not whether external work is undone; the article correctly rejects that rollback inference.

## [P2] State the Go language-version prerequisite for the captured loop index

Locations: [libraries/ants_VI.md:52](/Users/nhan.huynh1/coding/self/huynhanx03.github.io/src/content/notes/libraries/ants_VI.md:52) and [libraries/ants_EN.md:52](/Users/nhan.huynh1/coding/self/huynhanx03.github.io/src/content/notes/libraries/ants_EN.md:52), applying to the closure at lines 31–35 in both files.

The note says Go 1.22+ supplies separate index variables, but upgrading the toolchain alone does not select that language behavior for an existing module declaring an older Go version. Copied into a `go 1.21` module built by a newer toolchain, the closure can still capture the shared index, race with the loop, and write the wrong result slots. Specify `go 1.22` or later in the module's language directive (or the relevant per-file language selection), or capture `index := index` inside the loop so the pedagogical example is independent of the module's prior directive. This is a prerequisite clarification to the existing claim of distinct-index writes and stable successful output.

Evidence: [Go's loop-variable change explanation](https://go.dev/blog/loopvar-preview), “The Fix”: the semantics apply per module declaring `go 1.22` or later, with per-file build constraints also supported.

## Scope and limits

Read the complete current VI/EN pairs for ACID, concurrency_race, API communication, stack_vs_heap and ants (10 files), plus Cadence activity-reliability/replay-and-code-changes/orchestration and Temporal orchestration/testing-and-deployment/advanced-patterns (6 files). The supplied path list totals 16 files. Consulted selected before snapshots for replay/versioning/advanced patterns and ants. Read official Cadence timeout/retry docs, Temporal Go versioning and Continue-As-New/message-handler guidance, ants v2.11.0 ants.go/spinlock source, and Go loop-variable documentation. The parent's previously checked ants internals were used as context; this was not a fresh source audit of every library file.

No further actionable issue was identified in the reviewed scope. That is a bounded editorial result, not a claim that every runtime configuration or integration is verified. No article edits, tests, builds, typechecks or example execution were performed.
