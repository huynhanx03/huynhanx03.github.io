# All DSA Visualizations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for native execution; use superpowers:subagent-driven-development only if the user chooses delegation. Track the steps below in order.

**Goal:** Add real educational simulations for every main algorithm in the approved 62-note coverage map, embedded at the relevant reading position.

**Architecture:** Keep Scenario<Input, State> and the existing player. Introduce shared scene renderers, bounded trace recording and domain parsers. Register algorithms through lazy family loaders; metadata and presets remain available at build time without importing browser code.

**Tech Stack:** Astro static output, Markdown remark plugin, TypeScript, DOM/SVG/CSS, native BigInt. No new UI framework, execution service or product dependency.

**Spec:** `planning/2026-10-12-dsa-visualization-coverage.md`; existing player design: `planning/2026-10-11-note-illustrations-design.md`.

## Global Constraints

- All 62 notes in the spec are in scope. One demo per note does not satisfy a note containing multiple main algorithms.
- Only local edits: no commit, push, PR or publication.
- The player has no algorithm-specific switch. Scenarios and renderers must be reusable.
- Maximum 2,048 frames per trace. Exhaustion is an explicit limit result/error, never a fake completed output.
- Execution is deterministic TypeScript simulation. Source is optional; do not claim execution of editable Go.
- Input is checked before trace generation; each algorithm also enforces a work budget inside loops/recursion.
- Use BigInt for arithmetic whose intermediate products could exceed safe integer precision; scene values and output are strings.
- No external Kafka, database or service connections.
- No additional automated tests under current developer instructions. Use typecheck/build and direct visual inspection; do not claim unperformed verification.
- Excluded: Persistent structure, Wavelet tree, Li Chao tree, Euler tour on trees, 0–1 BFS, 2-SAT, computational geometry, FFT, ternary search, parallel binary search.

## Review Focus

- Exponential or random-looking scenarios terminate under a work budget independently of their frame count; retries use fixed seeds and report budget exhaustion.
- Parallel edges and residual reverse edges keep separate IDs; highlight/parent data must not collapse edges with the same endpoints.
- Byte-indexed matching and Unicode input preserve the chosen unit; report offsets in that unit rather than silently mixing byte/rune positions.
- Rewind and loop restore queues, parent pointers, tree colors, DP choices and residual capacity, not only the visible labels.
- A multi-demo note loads only required algorithm families, preserves independent clocks and remains readable when a module fails.

## Task 1 — Common trace and input contracts

**Files:** Modify `src/lib/visualizations/types.ts`; create `src/lib/visualizations/core/trace.ts`, `src/lib/visualizations/core/input.ts`, `src/lib/visualizations/core/scene.ts`.

**Interfaces:**
- Preserve Scenario<Input, State>, Frame<State>, Trace<State>.
- `createTraceRecorder<State>(maxFrames = 2048, maxOperations = 100000)` returns `emit(state, explanation, variables, label?)`, `consume(count = 1)`, and `finish(output, summary): Trace<State>`.
- `emit` snapshots with structuredClone; `consume` throws an explanatory limit error. Counters cannot silently overflow.
- `parseInteger(raw, min, max): number`, `parseIntegerArray(raw, maxLength): number[]`, `parseBigInteger(raw, min, max): bigint` preserve safe-number/BigInt boundaries.
- LessonScene has ordered panels. Panel union: array, table, graph, stack, string, intervals, board. Each variant has a stable ID, heading, data and active IDs; graph nodes/edges have separate stable IDs. Text labels are never HTML.

- [ ] Implement recorder and parsers with exact bounds above; retain Binary Search's current trace/source behavior.
- [ ] Add all renderer panel types before algorithm families consume them.
- [ ] Run `pnpm typecheck`; expected zero new errors.
- [ ] Inspect a boundary example manually: rejected unsorted Binary Search retains prior trace; record the observed behavior in the completion log.

## Task 2 — Shared renderers and registry

**Files:** Create `src/lib/visualizations/views/lesson-scene.ts`, `table.ts`, `graph.ts`, `stack.ts`, `string.ts`, `intervals.ts`, `board.ts`; modify `views/indexed-array.ts`, `catalog.mjs`, `bootstrap.ts`, `player.ts`, `src/styles/visualizations.css`.

**Interfaces:** Each renderer factory receives a container and returns `render(panel)` plus optional `destroy`. `createLessonSceneView(container)` composes panels by stable ID and updates existing DOM. Registry maps scenario ID to `loadAndMount(root): Promise<cleanup>` so generic parameter types remain inside their family module.

- [ ] Table renders string values, row/column headers and active cells, with bounded overflow.
- [ ] Graph uses SVG nodes, labeled edges and stable layout. Parallel/reverse edges use separate curved paths; self-loops use a loop path. Tree layout is deterministic from the supplied parent/children relation; DAG/general graph uses supplied or deterministic layout.
- [ ] Stack/queue displays ordered entries with top/front/back labels. String renderer aligns text/pattern by index and marks match/mismatch/radii. Intervals, board and array renderers expose labels that do not rely only on color.
- [ ] Add `multiline` to field metadata for graph edges and operation scripts; player renders a textarea when requested, without knowledge of algorithms.
- [ ] Split catalog into static family metadata files under `src/lib/visualizations/catalog/`; aggregate exports retain visualizationCatalog for the remark plugin. Register only implemented IDs, never a placeholder handler.
- [ ] Run `pnpm typecheck` and `pnpm build`. Inspect one graph with reverse/parallel edges and one two-instance note; record observed independence and layout.

## Common rules for Tasks 3–11

Each family task creates the named TypeScript module and matching metadata `.mjs` file. Each module exports `mountScenarioById(id: string, root: HTMLElement): () => void`, resolves IDs inside the family and calls the existing typed mountScenario. The bootstrap loader imports that named function. Metadata files export `definitions`, a record keyed by scenario ID; each preset includes `expectedOutput: string`, and each definition includes `limits: string`. Extend the metadata/preset types in Task 1; player keeps using label/values while the completion log records expected outputs. Each listed algorithm gets a distinct ID, trace builder, preset values, expected output, fallback and input limits. Source remains absent unless it matches the trace.

Every task includes these steps:

- [ ] Read its mapped note sections and implement each listed ID with real state transitions and Vietnamese explanations.
- [ ] Provide at least a normal preset and a meaningful boundary/failure preset per ID; not every failure is a validation error.
- [ ] Insert a `note-visualization` fence immediately after the relevant explanation using an exact ID/preset from that task's catalog.
- [ ] Update `planning/dsa-visualization-progress.md` with ID, note/heading, presets/expected output, limits and implementation status.
- [ ] Run `pnpm typecheck` and `pnpm build`; inspect the task's representative cases specified below. Fix newly introduced errors before continuing.

Default bounds unless a task overrides them: arrays 24 safe integers, strings 24 units, graphs 12 vertices/30 edges, operation scripts 24 operations, trees 15 nodes. Each metadata definition repeats its actual bounds for the author and reader.

## Task 3 — Foundations, arrays and sorting

**Files:** Create `scenarios/foundations.ts`, `scenarios/sorting.ts`, `catalog/foundations.mjs`, `catalog/sorting.mjs` under `src/lib/visualizations/`.

**Mapped notes:** problem-solving, complexity, abstract-data-types, arrays-and-slices, stacks-queues-deques, searching, elementary-sorting, efficient-sorting, distribution-sorting, divide-and-conquer.

**IDs:** `scan-maximum`, `linear-count`, `nested-loop-count`, `halving-count`, `dynamic-capacity`, `stack-contract`, `slice-alias`, `two-pointers`, `prefix-sum`, `utf8-bytes-runes`, `stack-operations`, `circular-queue`, `monotonic-deque`, `upper-bound`, `answer-binary-search`, `selection-sort`, `insertion-sort`, `bubble-sort`, `merge-sort`, `quick-sort`, `heap-sort`, `counting-sort`, `radix-sort`, `bucket-sort`, `merge-call-tree`. Existing `binary-search` stays registered.

**Decisions:** insertion carries element IDs and a separate held key; merge is stable. Quick sort uses Lomuto partition with deterministic final-element pivot and labels that variant. Radix is LSD base 10 for nonnegative integers. Counting limits value span to 40; bucket uses nonnegative integers 0–99 and insertion within buckets. Answer search uses minimum shipping capacity with days ≥1. Prefix queries are [l,r). Queue capacity is 1–12; overflow is explained, not silently resized.

**Representative review:** empty array, duplicate-key stability, upper-bound target beyond the end, UTF-8 multibyte offsets, all-equal quicksort, input cap rejection and loop returning to clean state.

## Task 4 — Recursion, search, greedy and DP

**Files:** Create `scenarios/search-dp.ts`, `catalog/search-dp.mjs`.

**Mapped notes:** recursion, configuration-generation, backtracking, greedy, dynamic-programming, dp-classics, branch-and-bound, complexity-classes.

**IDs:** `factorial-stack`, `fibonacci-calls`, `binary-configurations`, `next-permutation`, `n-queens`, `interval-scheduling`, `greedy-coin-counterexample`, `stairs-memo`, `stairs-bottom-up`, `lis-dp`, `knapsack-dp`, `edit-distance`, `knapsack-branch-bound`, `hamilton-certificate`.

**Decisions:** factorial n≤12 with BigInt output; recursive Fibonacci n≤8; bit configurations length≤6; N-Queens n≤6 with a 25,000-operation budget and an explicit limit error retaining the prior valid trace. LIS is strictly increasing O(n²), returns a reconstructed subsequence. Knapsack has ≤10 items and capacity≤30; branch-bound uses fractional upper bound, integer comparisons by exact rational cross multiplication. Edit distance uses Unicode code points and strings≤16 units. Certificate verification has ≤8 vertices and checks every proposed Hamilton edge including closure.

**Representative review:** equal LIS values, zero-capacity knapsack, impossible N-Queens n=2/3, UTF-8 edit-distance labels, intervals touching at endpoints and a failed Hamilton certificate.

## Task 5 — Linear structures, search trees and indexes

**Files:** Create `scenarios/structures.ts`, `catalog/structures.mjs`.

**Mapped notes:** linked-lists, hash-tables, binary-search-trees, heaps-priority-queues, balanced-search-trees, b-trees, tries-radix-trees, union-find, segment-fenwick-trees.

**IDs:** `singly-linked-list`, `doubly-linked-list`, `floyd-cycle`, `hash-chaining`, `hash-linear-probing`, `hash-rehash`, `bst-search`, `bst-insert`, `bst-delete`, `heap-push-pop`, `build-heap`, `heap-top-k`, `avl-insert`, `red-black-insert`, `splay-access`, `btree-insert`, `bplus-range`, `trie-insert-search`, `trie-delete`, `radix-compression`, `union-by-size`, `path-compression`, `segment-query`, `segment-update`, `fenwick-query`, `fenwick-update`.

**Decisions:** operation scripts use named operations with line-number validation. BST/AVL/red-black/splay store unique keys; duplicates report existing key. Red-black uses the standard parent/uncle insertion repair. B-tree and B+ tree use minimum degree 2, demonstrate actual splits, and B+ links have stable IDs. Hash keys are integer and normalize modulo; full probing tables report failure. Top-k has 0≤k≤n. Fenwick displays internal 1-based indices and external 0-based input.

**Representative review:** list head deletion, cycle at head, hash table full, all BST delete cases, all AVL rotation shapes, red-black root color after repair, B-tree root split, deleting a trie prefix shared with another word, Fenwick index zero.

## Task 6 — Traversal and shortest paths

**Files:** Create `scenarios/graph-paths.ts`, `catalog/graph-paths.mjs`.

**Mapped notes:** trees-and-traversals, graph-representation-bfs-dfs, shortest-paths, floyd-warshall, minimum-spanning-trees.

**IDs:** `tree-preorder`, `tree-inorder`, `tree-postorder`, `tree-level-order`, `graph-adjacency`, `bfs`, `dfs`, `dag-shortest-path`, `dijkstra`, `bellman-ford`, `floyd-warshall`, `kruskal`, `prim`, `mst-cut`.

**Decisions:** tree traversals use a validated binary tree for inorder. Graph parser carries explicit directed/undirected mode and edge IDs. BFS/DFS neighbors are sorted by vertex/edge ID. Dijkstra rejects negative weights. Bellman–Ford distinguishes source-reachable negative cycles; Floyd displays unreachable and negative-cycle-affected pairs. Prim/Kruskal output a spanning forest for disconnected input with a clear label.

**Representative review:** disconnected BFS, cycles in DAG input, zero-weight Dijkstra, negative cycle unreachable from source, connected/disconnected MST and Floyd pairs affected by a negative cycle.

## Task 7 — Connectivity, flow and advanced tree queries

**Files:** Create `scenarios/graph-advanced.ts`, `scenarios/tree-queries.ts`, `catalog/graph-advanced.mjs`, `catalog/tree-queries.mjs`.

**Mapped notes:** topological-scc, bridges-articulation, euler-hamilton, max-flow, bipartite-matching, dsu-rollback, lca-binary-lifting, heavy-light-decomposition, centroid-decomposition, min-cost-flow.

**IDs:** `kahn-topo`, `dfs-topo`, `tarjan-scc`, `kosaraju-scc`, `scc-condensation`, `bridges-lowlink`, `articulation-lowlink`, `euler-check`, `hierholzer`, `hamilton-search`, `max-flow-augment`, `min-cut`, `bipartite-augment`, `matching-as-flow`, `min-cost-assignment`, `dsu-rollback`, `offline-connectivity`, `ancestor-table`, `lca-query`, `tree-distance`, `hld-decompose`, `hld-path-query`, `centroid-build`, `nearest-red`, `min-cost-flow`.

**Decisions:** max flow uses Edmonds–Karp; min-cost flow uses shortest residual augmenting paths with Bellman–Ford and rejects unsupported reachable negative-cost cycles. Flow limits ≤8 vertices, capacities≤20, |cost|≤20. Hierholzer supports parallel edges and self-loops by edge ID. Hamilton n≤8 and budget≤50,000. Rollback uses union-by-size without path compression; offline connectivity uses time-interval divide-and-conquer, not the excluded Euler tour on trees. HLD/centroid require a connected undirected tree; nearest-red reports no active red nodes.

**Representative review:** parallel-edge lowlink, disconnected Euler edges, topo cycles, SCC stack membership, rerouting on a reverse residual edge, failed matching augmentation, rollback no-op union, LCA ancestor equal to node, HLD path crossing chains and centroid no-red case.

## Task 8 — String matching and compression

**Files:** Create `scenarios/string-matching.ts`, `scenarios/compression.ts`, `catalog/string-matching.mjs`, `catalog/compression.mjs`.

**Mapped notes:** string-matching, rolling-hash, manacher, z-function, data-compression.

**IDs:** `prefix-function`, `kmp-search`, `boyer-moore`, `hash-prefix`, `hash-substring`, `hash-window`, `manacher-odd`, `manacher-even`, `z-box`, `z-pattern`, `rle-codec`, `huffman-codec`, `lz77-codec`.

**Decisions:** KMP/Boyer–Moore use UTF-8 bytes and display byte offsets. Empty pattern matches every byte boundary under an explicit API convention. Manacher uses code points. Z matching uses an internal separator outside the input alphabet. Hash uses BigInt modular products and verifies candidate matches. Huffman tie-breaking is symbol ID order, single-symbol code is 0, and decoded length is recorded. LZ77 uses window≤16, input≤24 bytes, greedy longest match, sequential overlapping decode.

**Representative review:** overlapping pattern matches, empty pattern, repeated characters, even/odd palindromes, a forced hash collision, Huffman empty/single-symbol input and LZ77 overlapping copy.

## Task 9 — Suffix structures and multi-pattern automata

**Files:** Create `scenarios/suffix-automata.ts`, `catalog/suffix-automata.mjs`.

**Mapped notes:** aho-corasick, suffix-array-construction, suffix-approximate, suffix-automaton, suffix-tree.

**IDs:** `aho-trie`, `aho-failure`, `aho-scan`, `suffix-doubling`, `kasai-lcp`, `suffix-search`, `approximate-matching`, `sam-extend`, `sam-substring-count`, `suffix-trie-compress`, `suffix-tree-search`.

**Decisions:** input≤16 code points; Aho ≤5 patterns each≤8 units. Demonstrate actual failure links, output inheritance and SAM clones. Suffix array is doubling; approximate matching is edit-distance DP over text positions. Suffix tree is explicitly an O(n²) educational compressed suffix trie with a unique internal terminal; do not present it as Ukkonen. SAM counts by len[v]−len[link[v]].

**Representative review:** shared-prefix patterns, inherited matches, repeated characters causing clones, unique terminal not in input, duplicate LCP values, absent suffix search and correct substring count on a repeated string.

## Task 10 — Number theory and combinatorics

**Files:** Create `scenarios/number-theory.ts`, `scenarios/combinatorics.ts`, `catalog/number-theory.mjs`, `catalog/combinatorics.mjs`.

**Mapped notes:** modular-arithmetic-euclid, primes-factorization-divisors, arithmetic-functions, modular-inverse-crt, binomial-lucas-wilson, modular-roots-discrete-log, combinatorics-inclusion-exclusion, probability-for-algorithms.

**IDs:** `normalize-modulo`, `euclid`, `extended-euclid`, `binary-power`, `eratosthenes`, `spf-factorization`, `trial-factorization`, `miller-rabin`, `pollard-rho`, `divisor-count-sum`, `totient`, `mobius`, `modular-inverse`, `crt-merge`, `binomial-pascal`, `lucas`, `wilson-factorial`, `euler-criterion`, `sqrt-mod-3`, `tonelli-shanks`, `bsgs`, `permutations-count`, `combinations-count`, `inclusion-exclusion`, `probability-outcomes`, `conditional-probability`, `expectation`.

**Decisions:** arithmetic parses BigInt decimal strings. Sieve N≤100, trial factor n≤1,000,000; MR/Rho educational domain n≤1,000,000, fixed bases/seed and 20,000-operation budget, no claim covering all 64-bit values. Modular powers exponent≤10,000; roots/BSGS prime p≤997; validate primality and invertibility. CRT supports non-coprime compatible moduli and reports incompatible input. Lucas prime p≤97, n≤10,000; Pascal n≤20. Sample space enumeration ≤256 outcomes; probability output is an exact fraction with a labeled decimal approximation.

**Representative review:** negative modulo input, gcd(0,0), non-invertible residue, non-coprime CRT, composites rejected for root assumptions, no modular root/log, n≥p Lucas and conditioning on a zero-probability event.

## Task 11 — Games and pruning

**Files:** Create `scenarios/games.ts`, `catalog/games.mjs`.

**Mapped notes:** nim-sprague-grundy, alpha-beta-pruning.

**IDs:** `nim-xor`, `nim-winning-move`, `grundy-mex`, `minimax`, `alpha-beta`.

**Decisions:** Nim≤8 piles of size≤20, normal play. Grundy uses a validated acyclic impartial move graph≤12 states. Minimax/alpha-beta use the same deterministic game tree≤31 nodes, alternate MAX/MIN, preserve leaf ordering, and show exactly which unvisited subtrees were pruned.

**Representative review:** zero XOR/no winning move, terminal Grundy mex of empty set, negative leaf values, equal minimax alternatives, alpha-beta and minimax equal root output.

## Task 12 — Coverage audit, author guide and delivery

**Files:** Complete `planning/dsa-visualization-progress.md`; update `planning/visualization-author-guide.md`; inspect all 62 mapped Markdown files and registry entries.

- [ ] Compare the spec table against scenario IDs, note sections and fences. Every ID listed in Tasks 3–11 must either exist and be embedded or be explicitly reported incomplete. Do not mark the task complete with gaps.
- [ ] Inspect lazy loading and render all required family assets in the static build. Ensure Markdown errors still identify source location and unknown presets fail build.
- [ ] Run final `pnpm typecheck` and `pnpm build`; record exact outcomes and pre-existing failures separately.
- [ ] Inspect representative notes on desktop/mobile and both themes. Inspect two demos together, replay/loop/rewind, reduced motion and module failure fallback. Use screenshot evidence for the delivered UI; no additional test suite.
- [ ] Finish author instructions for adding metadata, parser, trace and renderer without modifying player branches.
- [ ] Deliver local links, counts of notes/scenarios completed, known limitations and explicit status of the Go runner. Do not publish or create a PR.

## Execution handoff

The approved scope is all 62 notes. Recommended method: native execution in this session, because algorithm families share core contracts and the existing uncommitted notes should stay in the current workspace. A delegated execution method requires an explicit user choice; do not start agents proactively.

Execution completed locally on 2026-10-12: 160 new scenarios plus existing Binary Search, 161 embeds in 62 notes. See `planning/dsa-visualization-progress.md` for evidence and runtime verification limitations; the checklists above preserve the original plan. No commit/push/PR/publication.
