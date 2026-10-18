# Cadence English translation — set A

Completed 2026-10-15 after the DSA batch 2 report was saved. Created the complete English counterparts for:

- `cadence/activity-reliability_EN.md`
- `cadence/choosing-cadence_EN.md`
- `cadence/data-and-observability_EN.md`
- `cadence/first-workflow_EN.md`
- `cadence/fundamentals_EN.md`
- `cadence/orchestration_EN.md`

Translated the complete prose, section sequence, examples/tables, limits, image alt text/caption, and answered checks. Preserved all source metadata except localized title/description, omitted translationPending, and set updated to 2026-10-15. The series display name remains Cadence. Internal note links now use /en/. Source links and image path were retained.

The sole fenced Go example (tilde fence in first-workflow) was copied byte-for-byte, including its original contents; other files contain no fenced examples or note-visualization blocks. Text-only comparisons confirmed fence equality, metadata identity for category/kind/translationKey/series/seriesOrder/draft, and no remaining /vi/notes/ links. These are document checks, not code execution.

Source corrections coordinated with the parent:

- Before translating Activity reliability, the parent corrected VI timeout guidance to state Go's explicit timeout requirements and Cadence RetryPolicy's Schedule-to-Start/Schedule-to-Close overrides via ExpirationInterval or workflow timeout. EN translates that corrected source and preserves its official documentation links.
- During first-workflow translation, the sentence near the replay illustration was found to imply external calls happen only for newly scheduled Activities. The parent corrected VI to include retry attempts. EN reflects that correction: replay reuses completed results; new Activities or retries can still call external systems.

No remaining translation ambiguity required a unilateral technical change. Vietnamese files were not edited by this translation agent; the two corrections above were applied by the parent. No tests, builds, typechecks, example runs, commits or PRs were performed.
