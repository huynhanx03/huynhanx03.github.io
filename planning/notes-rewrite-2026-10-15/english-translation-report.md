# English versions for all notes — 2026-10-15

## Scope

At the start there were 103 Vietnamese notes and 23 English notes. I created English counterparts for the 80 Vietnamese-only notes: 62 DSA, 8 Cadence, 8 Temporal, and 2 Workflow Engine. The intended result is 103 Vietnamese notes paired with 103 English notes, using each article's existing `translationKey`.

## Editorial approach

Translate the complete article, including explanations, tables, headings, examples outside code, self-check questions and answers, and reader-facing link text. Write natural English while preserving the source article's technical meaning, conditions, order, and depth. Preserve every code/text fence and `note-visualization` block byte-for-byte. Keep category, tags, article kind, difficulty, draft state, translation key and series order. Translate the series display label; remove the stale `translationPending` flag from VI once its EN pair exists. Translate internal note links to `/en/notes/...`.

## Source corrections made during translation

- Fixed an accidental empty Markdown fence and duplicate/dangling section in Vietnamese `bridges-articulation`; translated the corrected source.
- Clarified in Cadence `first-workflow` that replay reuses recorded results for completed Activities, while new Activities and retry attempts can still call external systems.
- Clarified Cadence retry-policy timeout behavior in `activity-reliability`, including the effective `ExpirationInterval`/workflow timeout bound and Go timeout inputs.
- Made the `ants` loop example safe for modules using older Go loop-variable semantics by capturing `index` explicitly; updated both existing languages.

## Per-batch records

- [Workflow Engine](./translation-en-workflow-engine.md)
- [DSA batch 1](./translation-en-dsa-batch1.md)
- [DSA batch 2](./translation-en-dsa-batch2.md)
- [DSA batch 3](./translation-en-dsa-batch3.md)
- [Cadence batch A](./translation-en-cadence-a.md)
- [Cadence batch B](./translation-en-cadence-b.md)
- [Temporal](./translation-en-temporal.md)

## Final audit

Completed the full set: **103 VI + 103 EN**, covering **103/103 translation keys**. The translation work added 80 EN files. All 80 former `translationPending` flags were removed from their Vietnamese sources, and no VI or EN note retains that flag.

Static pair audit result: **0 errors**. It checked the 103 matching paths and translation keys, structural metadata for the 80 new pairs, translated series labels, 2026-10-15 update dates, exact equality of fenced content across every language pair, and absence of Vietnamese internal routes in EN. The notes retain 161 `note-visualization` fences in each language set. `git diff --check` reported no whitespace errors.

This audit did not run application tests, typecheck, build, snippets, or UI checks. The browser route generation therefore remains unverified by a fresh build.

No application tests, typecheck, build, benchmark, or example execution is included in this translation task. No commit, push, PR, or publish was made.

## Topic guides

Added English titles, descriptions, prerequisites, and section headings to the five guides that were previously Vietnamese-only: Cadence Workflows, Temporal Workflows, DSA Foundations, DSA Advanced, and Algorithmic Math. All seven topic guides now declare and provide both `en` and `vi`. Their ordering, note keys, and prerequisite relationships are preserved from the working file. A static validation confirmed all localized fields and prerequisite topic references are present for both locales.
