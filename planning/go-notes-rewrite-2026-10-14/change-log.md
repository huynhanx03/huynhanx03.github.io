# Viết lại bộ Go notes — 2026-10-14

## Phạm vi và cách đối chiếu

Đã viết lại 16 bài × 2 ngôn ngữ = **32 file** trong `src/content/notes/go/`. Không xóa file, không đổi filename/URL, giữ category và tags. Cập nhật title/description, ngày cập nhật và translationKey để hai bản cùng chủ đề. Hai bản có cùng thứ tự mục, ví dụ code, kết quả và điều kiện áp dụng; tiếng Anh không còn là bản tóm tắt thiếu ý của tiếng Việt.

**Có rút gọn, gộp và thay nội dung.** Không dùng câu “không xóa gì” để mô tả đợt này. Những câu giải thích lặp, lời quảng bá và khẳng định sai đã bị bỏ/thay; các khái niệm chính của 16 bài vẫn được giữ. Bản gốc của từng file được lưu trong [originals](./originals/) để xem chính xác toàn bộ đoạn đã thay. Các bảng dưới nêu quyết định biên tập và sửa kiến thức.

Không mở rộng ra bài mới, không sửa notes ở category khác, không thêm visualization hay Go runner trong yêu cầu viết nội dung này. Không commit/push/PR/publish.

## Nội dung được giữ, gộp hoặc thay theo từng bài

| Bài (cả VI và EN) | Ý được giữ | Phần được gộp, bỏ hoặc thay |
|---|---|---|
| intro | Nguồn gốc, C/Pascal-family/CSP, 25 keywords, sự tường minh, composition, concurrency, toolchain | Bỏ các câu “chinh phục”, “bậc tiền bối”, “tâm trí trống rỗng” và so số keywords C++/Java không có mốc. Bỏ gán công trạng C/Unix cho cả ba tác giả. Thay ví dụ mở file bằng ReadFile có xử lý lỗi; thêm chương trình đầy đủ, module/package và cách đọc snippet. |
| variables | var/:=, tuple assignment, zero values, basic types, constants/iota, defined types, scope/naming | Gộp lời khuyên naming và scope, thay Math.Pi ví dụ mơ hồ bằng constant rate; thêm alias, shadowing, representability, giới hạn enum. Bỏ nhãn “atomic swap” trong bản EN và lời hứa tránh mọi lỗi memory. |
| flow | if init, expression switch, fallthrough, ba dạng for, range Unicode, labeled loops | Gộp các kết luận “luôn dùng range”; thay bằng điều kiện cụ thể và ví dụ sửa phần tử đúng. Thêm type-switch distinction và language-version loop variables. Bỏ khẳng định switch so được mọi kiểu. |
| functions | Syntax, recursion, multiple/named results, function value, closure, variadic, defer | Sửa số thứ tự mục trùng; gộp anonymous/function value vào mạch rõ. Thay factorial int không giới hạn bằng uint64 có miền n≤20 được ghi rõ. Thay readFile bỏ qua Open error; thêm giải thích lỗi Close, os.Exit, defer trong loop và thời điểm evaluate. |
| pointers | &, *T/*p, new(T), pass/share/mutate, local-address return, escape analysis, C comparison, nil, lựa chọn receiver | Bỏ ví dụ địa chỉ cố định như thể output bảo đảm. Thay lời hứa &/new chắc chắn lên heap và “pointer loại bỏ hoàn toàn lỗ hổng”. Thêm new(expr) theo Go 1.26, make vs new và replace-local-pointer. |
| slices | Array size/type, &array vs &element, descriptor, sharing/append, growth, make/slicing/full expression, in-place filter, retention, nil/empty JSON | Thay SliceHeader pseudocode bằng mô hình pointer/len/cap để tránh coi uintptr là cách dựng slice an toàn. Giữ mốc 256/1.25× dưới nhãn implementation; bỏ 99%, cap doubling cứng và zerobase như public contract. Thêm copy shallow, clear tail và minh họa append qua alias. |
| structs | Definition/literals/tags, access/equality, padding example, conversion, empty struct, pointer, anonymous struct | Gộp access/pointer/copy thành một mục; giữ 24/16 byte với điều kiện kiến trúc. Thay “luôn field lớn trước” bằng alignment + đo. Sửa conversion khác tags; bỏ khẳng định empty struct làm channel/map không tốn memory. |
| methods | Receivers, expressions/values, method sets/addressability, promotion, defined-type methods/no overload | Thay bảng method set dễ nhầm kiểu receiver với kiểu value bằng ví dụ interface assertion. Giữ Rectangle Area/Scale có chủ đích; bỏ “trộn receiver luôn bad practice”, “value receiver bất biến”. Thêm captured-copy/captured-pointer output. |
| interfaces | Implicit satisfaction, compile assertion, concrete type/value, iface/eface, typed nil, any, small interfaces/io | Thay unsafe struct declarations bằng sơ đồ iface/eface có nhãn runtime model; bỏ cách nói “vừa nil vừa không nil”. Đổi duck typing thành structural satisfaction có kiểm tra tĩnh; thêm assertion/type switch/equality panic và type-term constraint boundary. |
| composition | Struct embedding, promotion, has-a vs subtype, ambiguous selector, interface satisfaction/composition, decorator/proxy | Gộp kết luận tu từ; bỏ “phủ quyết”, “domain atomicity”, “polymorphic compliance” và lời hứa giảm coupling tuyệt đối. Thêm named-field delegation, literal promoted-field rule, nil embedded pointer, shadowing không virtual override. |
| errors | error interface, bốn chiến lược, custom error, Is/As, %w, panic/recover | Bỏ gán chính xác “4 chiến lược theo sách The Go Programming Language” khi chưa xác minh văn bản sách; giữ bốn quyết định thực tế. Thay khẳng định As là cast, panic là trạng thái không thể cứu và mọi lỗi bắt buộc trả error. Thêm sentinel, retry/idempotence, log-once, typed nil, errors.Join và recover không resume tại dòng panic. |
| maps | CRUD, comma-ok, bucket/hmap/bmap/tophash/evacuation, Swiss group/control/probe/directory, iteration, same-size grow, NaN, set, Mutex/RWMutex, sync.Map API/read-dirty/promotion, memory/key constraints | Gộp nhiều sơ đồ struct giả thành sơ đồ metadata, giữ tên field/chức năng. Rút các bảng “luôn nhanh / khi nào không dùng” thành hợp đồng + benchmark. Giữ read/dirty ở mục lịch sử, thêm hash trie mới. Sửa hash unique, 8-slot lookup guarantee, universal SIMD, zero latency spike, NaN permanent garbage, exactly-1-byte saving, writer starvation, guaranteed fatal detection và nil/recreate frees immediately. |
| goroutines | go/main/WaitGroup, concurrency/parallelism, process/thread/G comparison, stack/register context-switch, GMP/g0/m0, local/global/runnext, syscall/stealing/netpoll/preemption, 5 leak nhóm + các tình huống, ownership/cleanup/recover, observability | Gộp bảng G/M/P riêng thành sơ đồ và đoạn giải thích; gộp leak taxonomy/case repetition nhưng giữ từng loại/tình huống. Thay Sleep “đợi xong” bằng WaitGroup. Bỏ fixed nanoseconds/millions-without-cost/OS-context-switch eliminated. Giữ 2KiB/256/61 dưới nhãn source detail; thay batch formula thiếu điều kiện và fixed scheduling order. Sửa timer Go 1.23, I/O không luôn block M, M0 không cố định main, không cần recover mọi goroutine. |
| channels | Creation/direction, buffer semantics, state table/close, hchan/ring/sendx/recvx/wait queues, direct handoff/buffer/park, contention/batch/shard/local buffer, select scase/poll/locking/wakeup | Thay hchan unsafe pseudocode bằng sơ đồ đầy đủ các vai trò; gộp phase text lặp. Bỏ guaranteed channel O(1) including payload, buffered-throughput rankings, every op locks, app-level direct-handoff tuning và universal select overhead. Thêm comma-ok drain, ownership multi-sender, shared-pointer race, operand evaluation, nil-case disabling và cancellation selection caveat. |
| context | Motivation, 4 interface methods, Background/TODO, cancel/timeout/deadline/value/cause, internal types/cancellation tree/value chain, API/lifetime rules | Gộp API mô tả lặp; thay “context chấm dứt cưỡng bức”, Background trong handler, key struct instance unique, emptyCtx integer, Value-only tracing/auth và absolute no-context-in-struct. Thêm query có timeout, cooperative cancellation, cause variants/WithoutCancel và child/sibling behavior. |
| garbage_collection | Reachability/allocate-mark-sweep-reuse, pros/cons, tri-color/roots/barrier, concurrent/STW/non-moving/non-generational, Green Tea, Go/JVM comparison, assist/scavenger/pacing/Pinner, Pool/escape/pointer-heavy/preallocation | Gộp phase overview/traditional internals để tránh lặp, giữ từng cơ chế. Thay 8KB-all-spans, 10–40%-whole-runtime, universally-generational JVM, pointer address stable in every case, GC prevents every leak, Pool strongest universal solution. Thêm heap vs RSS, GOGC roots formula/memory-limit scope, Pool lifetime and cgo pinning limitations. |

## Các sửa kiến thức đáng chú ý

1. **Error handling là convention, không được compiler bắt buộc.** Có thể bỏ qua error; code phải chủ động quyết định. `go build` cũng không luôn tạo binary hoàn toàn static khi có cgo/build modes.
2. **Tuple assignment không atomic cho concurrency.** Pass-by-value vẫn có thể chia sẻ dữ liệu qua pointer/slice/map/interface.
3. **Range value là copy; string index là byte offset.** Rune không nhất thiết là một ký tự hiển thị. Loop-variable semantics phân biệt Go 1.22 language version và trường hợp dùng `=`.
4. **Defer cần đăng ký sau khi tài nguyên tạo thành công.** Đối số được tính sớm, closure đọc biến muộn; defer không chạy bởi os.Exit.
5. **Escape analysis không suy luận chắc chắn từ &/new.** Local-address return hợp lệ nhưng compiler có thể inline và đổi allocation.
6. **Slice copy/full expression không deep-copy.** Cap growth/zerobase/descriptor byte count là implementation; clear tail giúp tránh giữ references.
7. **Struct conversion bỏ qua tags theo quy tắc spec.** Field alignment phụ thuộc type/architecture; không phải mọi field được align chung 8 bytes.
8. **Value receiver không bảo đảm immutable.** Method value capture của value khác pointer; auto-addressing không đổi method set/interface satisfaction.
9. **Interface typed nil vẫn non-nil.** Any là alias, không phải keyword riêng; assertion khác conversion; dynamic non-comparable value có thể panic khi equality/map key.
10. **Embedding không tạo subtype hay virtual override.** Nó không tự isolate pointer state và không luôn giảm coupling.
11. **Is tìm target, As điền biến assignable trong error tree.** `%w` giữ cause; `%v` không giữ unwrap relationship. Recover phải cùng goroutine và không resume sau panic.
12. **Map average performance không phải O(1) guarantee.** Hash collisions, overflow/probe và key comparison vẫn tồn tại.
13. **Swiss Table không phải một SIMD instruction trên mọi platform.** Table grow/split giảm phạm vi rehash, không bảo đảm biến mất latency spike.
14. **sync.Map read/dirty là lịch sử trước Go 1.24.** Hash-trie là implementation mới; Range không consistent snapshot, mutable value không được tự bảo vệ, Load + Store không atomic như LoadOrStore.
15. **RWMutex có cơ chế chặn reader mới khi writer chờ.** Long-held RLock vẫn gây delay; không chọn theo “read-heavy luôn nhanh hơn”.
16. **NaN key không phải garbage vĩnh viễn.** Range/clear/discard có thể xử lý; delete/clear không hứa shrink storage, nil không giải phóng khi còn alias.
17. **GOMAXPROCS không giới hạn tổng threads/goroutines.** Go 1.25 có container CPU-limit awareness; goroutine network wait không luôn giữ một M.
18. **Scheduler không chỉ cooperative.** Các mốc stack/queue/tick là source detail, không public performance guarantee.
19. **Timer leak phải gắn phiên bản.** Go 1.23 semantics cho phép collect unreferenced timers/tickers; allocation churn và timeout-reset bug là vấn đề riêng.
20. **Channel an toàn cấu trúc không làm object gửi qua pointer an toàn.** Closed receive drain trước zero/false; cancellation case không có ưu tiên mặc định trong select.
21. **Cancel là tín hiệu, không phải kill/join/rollback.** Child không kéo dài deadline parent; handler cần r.Context(), context value key không unique theo instance struct{}.
22. **GC thu unreachable, không thu object còn bị cache/G giữ.** Non-moving heap GC không bảo đảm stack không di chuyển, và không bỏ cgo rules.
23. **Span không luôn 8KiB.** Green Tea 10–40% nói về GC overhead trong workload phù hợp, không toàn service; Go 1.25 experiment, Go 1.26 default.
24. **GOMEMLIMIT là soft runtime-memory limit.** GC sweep, scavenger và RSS là các lớp khác nhau; Pool không cache durable, Pinner không pin toàn graph đệ quy.

## Nguồn chính thức đã đối chiếu cho các sửa đổi

- [Go specification](https://go.dev/ref/spec): conversion/struct tags, method sets, loop variables, constants và ngữ nghĩa giá trị.
- [Go 1.24](https://go.dev/doc/go1.24) và [source sync.Map](https://go.dev/src/sync/map.go): Swiss maps và hash-trie sync.Map; read/dirty giữ ở mục lịch sử.
- [Swiss Table design](https://go.dev/blog/swisstable): group/control/probe, portable word operations và SIMD tùy kiến trúc.
- [Go 1.25](https://go.dev/doc/go1.25): GOMAXPROCS theo container và Green Tea experiment.
- [Go 1.26](https://go.dev/doc/go1.26): new(expr), Green Tea default; không gọi 1.26 là latest version.
- [Context documentation](https://pkg.go.dev/context) và [source](https://go.dev/src/context/context.go): cancellation/value contract và emptyCtx struct{}.
- [Time documentation](https://pkg.go.dev/time): Go 1.23 timer/ticker collection semantics.
- [Scheduler source](https://go.dev/src/runtime/proc.go): version-sensitive queue/fairness details.
- [GC guide](https://go.dev/doc/gc-guide): tracing/pacing, memory và tuning model.

## Kiểm tra và giới hạn

Số mục/code/nguồn giữa VI và EN được đối chiếu tĩnh; file metadata và kết quả Astro typecheck/build được ghi bên dưới sau khi hoàn tất. Không thêm/chạy Go test suite hoặc benchmark. Các đoạn code thường là snippets, không phải mọi fence là một executable độc lập; convention này được giải thích trong bài intro. Bản gốc được giữ nguyên để người dùng kiểm tra bất kỳ chi tiết nào chưa được nêu trong bảng.

### Thống kê đối chiếu (đếm từ bằng whitespace, gồm code)

| Bài | Từ cũ VI+EN | Từ mới VI+EN | Code blocks mỗi bản | Mục mỗi bản |
|---|---:|---:|---:|---:|
| channels | 2963 | 2063 | 5 | 9 |
| composition | 1184 | 1234 | 4 | 7 |
| context | 2466 | 1961 | 6 | 11 |
| errors | 1277 | 1516 | 4 | 7 |
| flow | 1318 | 1489 | 5 | 8 |
| functions | 1284 | 1610 | 8 | 9 |
| garbage_collection | 2413 | 2589 | 2 | 11 |
| goroutines | 6473 | 3084 | 4 | 10 |
| interfaces | 1250 | 1448 | 4 | 7 |
| intro | 1289 | 1548 | 3 | 8 |
| maps | 5675 | 3037 | 9 | 11 |
| methods | 1524 | 1266 | 5 | 8 |
| pointers | 1401 | 1418 | 6 | 8 |
| slices | 1888 | 1621 | 5 | 8 |
| structs | 1400 | 1332 | 5 | 8 |
| variables | 1622 | 1576 | 6 | 8 |

Tổng: 35427 → 28792 từ. Độ dài giảm không thay cho audit nội dung; các quyết định gộp/sửa được nêu ở trên.

### Kết quả cuối

- Đối chiếu 16 cặp: cùng số mục và cùng code fences; không thiếu bản dịch, không có H1 body lặp với tiêu đề trang.
- `pnpm typecheck`: exit 0, 134 files, 0 errors, 0 warnings, 0 hints.
- `pnpm build`: exit 0; Astro xuất site và Pagefind lập chỉ mục. Pagefind thông báo giới hạn stemming tiếng Việt, không phải lỗi build.
- Rà các dòng quote trong Go fences để tránh escape newline làm vỡ snippet; không biên dịch/chạy toàn bộ snippets, không chạy Go test/benchmark.
- Bản gốc đủ 32 file trong originals; không có file Go note nào bị xóa.


## Đợt bổ sung ví dụ áp dụng — 2026-10-14

Tiếp tục sau bản viết lại: thêm một mục **Ví dụ áp dụng / Worked example** vào mỗi bài, tổng cộng 16 cặp / 32 file. Đợt bổ sung này không xóa hoặc rút gọn phần đã viết lại, không đổi filename/URL. Các thay đổi gộp/bỏ của đợt đầu vẫn được ghi ở trên.

| Bài | Tình huống bổ sung |
| --- | --- |
| intro | Module nhỏ tính tổng chi tiêu, file main.go hoàn chỉnh và cách tách trách nhiệm |
| variables | Phân biệt chưa cấu hình với giá trị 0, kiểm tra miền giá trị |
| flow | Parse port bằng early return; tách lỗi chuyển đổi và lỗi nghiệp vụ |
| functions | Hai closure giữ hai trạng thái riêng; giải thích output và đồng bộ |
| pointers | Trả cấu hình mới; alias vẫn nhìn đối tượng cũ, giới hạn copy nông |
| slices | Theo dõi append qua alias và full slice expression bằng bảng len/cap |
| structs | Copy struct chứa slice; sao chép field khác với sao chép dữ liệu nền |
| methods | Method value giữ receiver tại thời điểm tạo; so sánh với pointer receiver |
| interfaces | Consumer định nghĩa NameReader; thay dependency bằng map có method |
| composition | Logger qua field có tên, kiểm soát API so với embedding |
| errors | Wrap lỗi hết hàng và nhận diện bằng errors.Is; điều kiện retry |
| maps | Khóa cả Increment; bảng minh họa mất cập nhật dù từng Get/Set có khóa |
| goroutines | Chia việc theo index, WaitGroup chờ hoàn tất, output ổn định dù lịch chạy không cố định |
| channels | Producer đóng channel, consumer nhận hết; backpressure và nguy cơ bỏ nhận |
| context | Cancel rồi chờ done; không dùng sleep để đoán thời điểm worker chạy |
| garbage_collection | Slice nhỏ giữ array lớn; copy để tách vòng đời, giới hạn suy luận về RSS |

Code fences ở hai bản giống nhau, số mục tương ứng, mỗi file có đúng một mục ví dụ mới. Ví dụ có output được giải thích theo ngữ nghĩa ngôn ngữ; không chạy chương trình Go, test hoặc benchmark để xác nhận output. Các đoạn trích cần package/import và vị trí khai báo phù hợp như đã hướng dẫn ở bài intro; không ghép tất cả snippet của một bài thành một file vì các snippet có thể khai báo cùng tên.

Số từ hiện tại theo cách đếm whitespace bằng Python: **33.951**, so với **28.792** sau đợt viết lại đầu tiên. Số đếm gồm Markdown và code, chỉ mô tả kích thước nội dung.

Kiểm tra sau bổ sung:

- `pnpm typecheck`: thành công, 134 file; 0 errors, 0 warnings, 0 hints.
- `pnpm build`: thành công, sinh trang tĩnh và hoàn tất Pagefind.
- Đối chiếu tĩnh: 16 cặp có code fences và số mục đồng nhất.
- Không commit, push, PR hay publish.
