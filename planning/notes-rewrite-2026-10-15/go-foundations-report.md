# Go foundations rewrite — 2026-10-15

## Scope and editorial basis

Rewrote the ten assigned files: `src/content/notes/go/{intro,variables,flow,functions,pointers}_{VI,EN}.md`. Read both language originals, the before snapshots for mapping, `planning/notes-writing-guide.md` v2.1, and both approved slice articles. The articles now develop the explanations through concrete state changes instead of introducing terse definitions followed by a mechanically appended worked-example section. Structure varies with the subject; length follows the retained knowledge and missing reasoning.

All filenames, categories, tags, and translation keys remain intact. Each article has `updated: 2026-10-15`; titles and descriptions were rewritten to describe its learning purpose. Vietnamese and English have corresponding explanations, conditions, examples, and self-check answers. All fenced examples in each pair are identical, including shell/text blocks. Language-specific prose and internal locale links differ appropriately.

## Per-topic mapping

### intro

- **Retained:** compiled/static typing/automatic memory management; creators, 2007 design and 2009 public release; C, Pascal/Modula/Oberon and CSP influences; small keyword count without promising easy software; package/module/file distinction; import by package path; main versus library packages; cgo/static-link caveat; explicit errors and compiler not enforcing meaningful error handling; struct/method/interface/composition/embedding overview; goroutines/channels/mutex and shared-object caveat; runtime role; six tool commands and suggested learning sequence.
- **Retained examples:** complete Hello program; module initialization/run/build commands; `os.ReadFile`/wrapped error fragment; expense directory layout and complete `total` application.
- **Moved/merged:** module commands formerly used `example.com/hello`; merged them with the existing `expense` scenario using `example.com/expense` so there is one project identity to follow. The late appended expense example now belongs in the main teaching progression, before the error discussion. Historical/design context follows concrete program organization rather than opening with a list of language attributes.
- **Expanded:** compiler versus execution; package initialization before main; package declarations versus file-local imports; `go mod init` runs once; why another file need not imply another package; stepwise expense calculation; units and overflow assumption; what each tool can and cannot establish; answered checks on same-package access and business meaning.
- **Omissions/replacements:** no substantive original knowledge removed. Replaced the duplicate opening description with a concrete task; replaced the old unanswered recall question with explained application questions.

### variables

- **Retained:** `var`/type inference/`:=` distinction; short declaration at function scope; same-block new-name requirement and `_`; redeclaration versus shadowing; multiple assignment and non-atomicity caveat; zero values for all original groups and nil operational limits; basic numeric types/byte/rune/string; architecture-related choice; explicit conversion and information loss; exact-money caveat; typed/untyped constants and representability; `iota`; open numeric state space; defined type versus alias; Celsius/Fahrenheit conversion not being a formula; universe/package/file/block scopes; export rules and naming/initialisms; optional retry count representation.
- **Retained examples:** package/local `count` and `ready`; swap; mixed-number arithmetic; `rate` and `MaxRetries`; `Status`; Celsius/Fahrenheit/Temperature; `RetrySetting` with negative-value validation.
- **Moved/merged:** scope explanation follows shadowing; presence versus zero is introduced immediately after zero values instead of as an appendix. Naming/export guidance stays adjacent to scope. Numeric constants precede the state-type application.
- **Expanded:** explicit nested-block comparison of `:=` and `=`; the package `count` versus local `count`; compiler inference does not mean runtime type changes; how swap differs from successive assignments; the reason `Set` must survive storage; conversion changes an expression rather than a variable's declared type; truncation direction and out-of-range caveat; constant default type; type identity versus numeric formula; self-checks with reasoning.
- **Omissions/replacements:** no substantive original knowledge removed. Added `uintptr` to the basic-type overview rather than leaving it implicitly absent; no advanced pointer-integer operations were introduced. Original unanswered exercises were replaced by specific prediction questions and answers.

### flow

- **Retained:** boolean if condition/no parentheses; initialization scope through else branches; same-line else syntax; expression switch's first matching case/no implicit fallthrough; grouped cases/default; expressionless switch; equality/type restrictions; distinction from type switch; explicit fallthrough rule; all three for forms; continue/break/return boundaries; element copies versus indexed mutation; string byte offsets/runes/user-visible characters; map order; channel closure plus buffered values; nil-channel blocking; range does not automatically extend to appended elements and does not remove all indexing errors; Go 1.22 integer range, Go 1.23 iterator-function range; version-dependent loop variables; `:=` versus preexisting `=` variables; package language version; explicit goroutine arguments; labeled break/continue; early-return port validation and rejection of port zero.
- **Retained examples:** if initialization; GOOS switch; hour condition switch; counted/conditional/unconditional loops; slice doubling; `éa` string range; two nested labeled loops; full `parsePort` function.
- **Moved/merged:** `parsePort` now follows if and demonstrates why each failure stops early. The late worked-example scaffold was removed while retaining the complete example and its two kinds of failure.
- **Replaced for scope clarity:** supplied `items`, `hour`, and a locally changing `finished` rather than leaving them unexplained. The infinite-loop syntax remains, but its small example now reaches a stated stop. Added a caveat that this is not a concurrent busy-waiting technique.
- **Expanded:** traces for all port inputs, overlapping switch conditions and changed case order, loop state progression, nearest-switch break behavior, slice element reference caveat, UTF-8 decoding boundary, a deterministic closure example that demonstrates the 1.22 change without goroutine scheduling, and the first successful labeled exit at `i=3,j=4`. Explained self-checks target these rules.
- **Omissions:** no substantive original knowledge removed. Full iterator-function mechanics remain outside this beginner article, as in the original.

### functions

- **Retained:** declaration/signature shorthand; all arguments passed by value, with pointer/slice/map sharing caveat; functions as values and `apply`; multiple results/error-last convention and invalid primary result on failure; named results/zero initialization/bare return tradeoff/defer mutation; anonymous functions/closure captures a variable/lifetime/separate factories/concurrency caveat/nil function/comparison restriction; variadic parameter last/slice inside/existing-slice sharing/resource limits; recursion base case/progress/stack/input bounds/n≤20/tail-call non-guarantee; defer after successful open/LIFO/panic unwinding/os.Exit exception/ignored read Close error/write Flush-Close importance/defer arguments now versus closure later/loop resource accumulation.
- **Retained examples:** `add`/`apply`, `divide`, `split`, both `sequence` and `counter`, `sumAll` with three call forms, `factorial`, `readFile`, and the two defer calls.
- **Moved/merged:** `counter` is now a deliberate extension of `sequence` with a starting value, rather than a duplicated appended explanation. Its independent-factory behavior and expected output are retained.
- **Expanded:** checked empty-slice mutation example connecting pass-by-value to shared data; actual caller branch for division; finite-input scope rather than implying NaN/Inf validation; integer division and intermediate overflow assumption in `split`; copying a closure value versus calling its factory again; arithmetic bounds; concrete recursive descent/unwinding; return-expression/defer/result-delivery sequence; `adjusted` example demonstrates the existing named-result claim; explained prediction questions.
- **Omissions:** no original example or substantive rule removed. This remains a function lesson rather than expanding into a general error-handling or panic/recover tutorial.

### pointers

- **Retained:** address-of, pointer type, dereference; actual address varies; pointer assignment aliases a target; copied parameter can mutate target while pointer reassignment stays local; usually return replacement pointer, `**T` possible with complexity; slice/map mutation usually needs no pointer wrapper; nil/panic/API contract/optional values; concurrency and synchronization; zero-initializing `new(T)` versus literal and make; `new(map)` still nil internally; Go 1.26 expression operand for new; safe return of local address; escape analysis/inlining/no syntax-only heap conclusion; compiler diagnostic command; moving goroutine stacks; no ordinary pointer arithmetic/manual free; unsafe exception; resource cleanup distinct from GC; pointer/value cost tradeoffs; no copying mutex after use; copy-and-replace configuration with non-nil precondition and shallow-copy limit.
- **Retained examples:** age/address/dereference; `set` and `replaceLocal`; nil pointer; `new(int)` and initialized anonymous struct pointer; returned local pointer; `-gcflags="-m"` diagnostic command; complete `Config`/`withPort` alias example.
- **Moved/merged:** the configuration example now develops the mutation/replacement distinction established at the start. Performance and C/C++ comparisons follow lifetime and sharing so the choice discussion has enough foundation.
- **Expanded:** copied `q` and a table distinguishing `p` from `*p`; exact reason `replaceLocal` cannot replace a caller's pointer; optional presence versus pointer preconditions; field selector shorthand; explicit version-labeled `new(10)` snippet; new-expression result versus existing-variable address; scope versus lifetime; mutation-instead-of-copy counterfactual; answered checks on shallow copying and heap assumptions.
- **Omissions:** no substantive original knowledge removed. The pointer choice question now has decision criteria in prose and prediction answers rather than an unanswered open prompt.

## Official sources consulted

Consulted via browser on 2026-10-15; the articles link relevant sources directly. Sources were used to check rules and version conditions, rather than treating implementation details as language guarantees.

- [Go specification](https://go.dev/ref/spec): declarations/scope/exported names, short declarations, constants/conversions/zero values, if/switch/for/range, function types/calls/literals/defer, pointer/address/allocation rules.
- [Go FAQ](https://go.dev/doc/faq): origins and language influences, runtime, automatic lifetime and stack/heap distinction.
- [Effective Go](https://go.dev/doc/effective_go): declaration/naming/function/return/defer conventions; not used as a complete reference for newer language features.
- [Create a Go module](https://go.dev/doc/tutorial/create-module): module initialization and module identity.
- [Go 1.22 release notes](https://go.dev/doc/go1.22#language) and [Fixing For Loops in Go 1.22](https://go.dev/blog/loopvar-preview): fresh loop variables, integer range, and applicability by language version. Current spec also confirms iterator-function range since Go 1.23.
- [Go 1.26 release notes](https://go.dev/doc/go1.26#language): `new` accepting an expression; kept the version condition in both translations.
- [Defer, Panic, and Recover](https://go.dev/blog/defer-panic-and-recover): registration-time arguments, LIFO, named-result changes.
- [os.Exit](https://pkg.go.dev/os#Exit): deferred calls do not run on Exit.
- [sync.Mutex](https://pkg.go.dev/sync#Mutex): mutex must not be copied after first use.

## Review performed and limits

Read and edited for knowledge, causal progression, snippet scope, natural language, and translation correspondence. Performed a static text comparison of fenced blocks: all five pairs match exactly (5, 8, 9, 12, and 8 blocks respectively). Compared retained category/tags/translationKey to the snapshots. Inspected the assigned-file diff summary and content. These are editorial/file inspections, not code execution or application validation.

No tests, benchmarks, build, typecheck, example execution, commit, push, or PR was performed. The compiler diagnostic shell command appears as instructional content only. No product/UI files or notes outside the assigned ten were edited. No missing assigned topic remains in this report's scope.
