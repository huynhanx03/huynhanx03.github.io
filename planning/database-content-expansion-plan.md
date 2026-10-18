# Database Notes Content Expansion Plan

**Goal:** Turn the current four bilingual database tracks from a topic overview into a substantial learning curriculum that explains the meaningful material in all four supplied books and current official product documentation.

**Architecture:** Keep four top-level localized topics and one `src/content/notes/database/` folder. Add focused note pairs where one current article is carrying too many chapter subjects; use a source-outline ledger to track each substantive section as `unreviewed`, `overview`, `partial`, or `taught`, with page references and exact note headings. Each added note is original explanation with worked examples, failure cases, practical interpretation, and a parallel English version.

**Sources:** `../book-db/Database Internals.pdf`, `../book-db/High Performance MySQL.pdf`, `../book-db/postgresql_internals-14_en.pdf`, `../book-db/Redis-in-Action.pdf`; `planning/notes-writing-guide.md`; current official MySQL, PostgreSQL, and Redis docs.

## Global constraints

- Keep exactly four database topic guides and all notes in the database folder.
- Preserve the agreed topic names and order.
- Every new or revised note has VI and EN versions with matching `translationKey` and equivalent scope.
- Teach concepts in original prose and examples; do not reproduce the books or make chapter-by-chapter paraphrases that substitute for them.
- Label older book behavior and current product behavior separately.
- Do not commit or create a PR. Do not run tests/build unless requested; use editorial/static consistency checks only.

## Work units

1. Inventory every substantive bookmark and meaningful unbookmarked body subsection in the four PDFs. Read sections in source order and classify current coverage honestly. Every section must record source pages, learning concepts, VI/EN note heading destinations, and a verification date. A note that names a mechanism without teaching it stays `overview`.
2. Expand Database Systems around storage/file formats, B-tree implementation and variants, buffer replacement, ARIES/recovery, isolation/MVCC/locks, LSM implementation/amplification, and distributed-system foundations, consistency, anti-entropy, transactions, and consensus.
3. Expand MySQL around schema/data type decisions, InnoDB record/index/redo/undo/buffer behavior, query access and optimizer cases, benchmark/profiling/configuration, replication/binlog/failover, backup/recovery, and the historical examples whose behavior changed since the book edition.
4. Expand PostgreSQL around page/tuple/snapshot rules, each vacuum/freezing phase, WAL/cache/checkpoint behavior, each lock family and wait diagnosis, protocol/planner statistics, scan/join/sort mechanics, each index access method, and backup/replication/operations.
5. Expand Redis around each book application example (login/cookie, carts, page/row cache, logs/counters/statistics, IP lookup, configuration/service discovery, autocomplete, locks/semaphores, queues/delayed work, pull messaging/file transfer, search/ads/jobs, social timelines/streaming), memory representations/sharding/packed bits, scaling, and Lua scripts. Mark obsolete APIs/setup separately and link current docs.
6. Reconcile each source-outline item against the actual VI/EN prose and specific headings. Do not treat a chapter-level destination or total word count as completion evidence. Preserve exactly four topics; update guides only when new note keys are introduced. Finish with static checks for bilingual pairs, source-to-note links, references, and `git diff --check`.

## Completion evidence

- Every substantive source-outline section has a page reference, primary note and heading assignment, status, and audit evidence; no section is marked `taught` because its title appears in a coverage sentence.
- Worked examples show intermediate state and explain why each step changes it.
- Every product-specific operational claim is checked against the official docs for a stated version or labeled as edition-dependent.
- Static audit reports every note key assigned exactly once where intended, both language variants present, and no topic guide reference missing.
