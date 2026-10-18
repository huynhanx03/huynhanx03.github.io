# Kiến thức nền, database, network, hệ điều hành và ants

## Phạm vi

Đã viết lại 7 chủ đề × 2 bản VI/EN = 14 file: OOP, SOLID, concurrency_race, ACID, API communication, stack_vs_heap, ants. Giữ filename, category/tags và URL; thêm description, translationKey và ngày 2026-10-15 ở bài còn thiếu. Các snippet độc lập, output dự kiến không được mô tả như kết quả đã chạy.

## Đối chiếu kiến thức

| Chủ đề | Giữ và phát triển | Thay hoặc gộp |
| --- | --- | --- |
| OOP | Bốn khái niệm, encapsulation/invariant, BankAccount, Vehicle/Car, Flyable/Bird, performSound | Bỏ ví von chìa khóa/dòng máu và bảng tóm tắt lặp; bỏ field brand/modelName không cần cho ví dụ kế thừa, giữ Vehicle/Car/honk; thay tiền double bằng long có kiểm tra overflow; giải thích trừu tượng không chỉ design-time và đa hình không chỉ runtime nói chung; encapsulation không phải bảo mật dữ liệu |
| SOLID | Đủ năm nguyên tắc, UserService/EmailService, PaymentMethod, Bird/Ostrich, Worker/Robot, Switchable | Gộp các khung before/after lặp thành tình huống + code có ngữ cảnh; listing UserService/EmailService và Bird/Ostrich chuyển thành phân tích bằng lời, giữ vấn đề/hướng sửa; bỏ lời hứa là nền tảng bắt buộc mọi kiến trúc, không sửa code cũ, đổi DB không ảnh hưởng gì; bổ sung điều kiện hợp đồng, chi phí abstraction và DI khác DIP |
| Race | Data race, overselling, mutex/atomic/channel, transaction, idempotency, immutability, detector | Thay kết luận undefined behavior chung theo C/C++ bằng Go memory model; thêm WaitGroup để phân biệt chờ kết thúc với bảo vệ truy cập; bỏ khẩu hiệu quan hệ hai loại race như mệnh đề luôn đúng; sửa hiểu nhầm transaction/isolation và idempotency giải mọi race |
| ACID | Đủ bốn thuộc tính, transfer, constraints, dirty/non-repeatable/phantom, isolation names, WAL/redo/replication | Thay tuyệt đối hóa durability/cháy nổ và automatic refund; nói rõ transaction boundary, kết quả commit chưa biết, DB không tự biết nghiệp vụ; sửa NoSQL=khôngACID và eventual consistency=đối nghịchACID |
| API | gRPC/HTTP API, protobuf tag, HTTP2/HPACK, bốn kiểu RPC, browser/gateway/cache, balancing/TLS/interceptor/circuit breaker/deadline | Bỏ bảng latency xếp hạng không số đo, REST bắt buộc HTTP1/unary, HTTP1 luôn mở TCP mới; sửa TLS không tự bật, không bắt buộc Envoy/Istio; timeout không tự dừng mọi công việc; cache không phải bất khả thi |
| Stack/heap | Frame/LIFO, overflow, heap/lifetime, fragmentation, escape analysis, ảnh hưởng GC | Thay luôn-contiguous/always-auto-grow và local-array-chắc-overflow bằng điều kiện; bổ sung register/compiler optimization, internal/external fragmentation; không gán GC cho mọi ngôn ngữ, không suy tốc độ từ vị trí |
| ants | Worker stack/ring, GOMAXPROCS channel choice, expiry binary search, spin/backoff, cached time, Cond, sync.Pool, generic worker | Gắn v2.11.0; sửa cached time thực tế atomic.Value/time.Time, không phải int64; bỏ FIFO fairness/CPU residency/immediate-switch guarantees; sửa time.Now luôn syscall, mutex luôn sleep, generics luôn zero-allocation; thêm ví dụ submission/join/error và admission/nested-pool risks |

Rà soát độc lập sau khi viết phát hiện ví dụ `ants` phụ thuộc vào ngữ nghĩa loop variable của language version Go 1.22, không chỉ toolchain. Đã thêm `index := index` trong hai bản để closure hoạt động nhất quán cả với module còn khai báo phiên bản ngôn ngữ cũ; phần giải thích nêu rõ điều kiện version nếu bỏ dòng capture.

Không bỏ khái niệm cốt lõi; có thay code minh họa, bỏ lời quảng bá, ví von dễ hiểu sai và các khẳng định không đúng điều kiện. Không giữ nguyên mọi đoạn hoặc mọi ví dụ lặp.

## Nguồn đối chiếu

Oracle Java interfaces/inheritance/polymorphism; bài SRP của Robert C. Martin; Go memory model, race detector, FAQ; PostgreSQL transaction tutorial/isolation/asynchronous commit; gRPC core concepts/deadlines/authentication, gRPC-Web/Gateway; mã nguồn ants tag v2.11.0 gồm ants.go, worker_stack.go, worker_loop_queue.go, pkg/sync/spinlock.go và pool_func_generic.go. Link gắn trong từng bài. Một số raw page bị web parser cắt mất code, đã đọc trực tiếp các file công khai để xác minh thay vì suy từ README.

Không chạy test, benchmark hoặc code ví dụ. Typecheck/build chung do bước tổng hợp cuối đợt thực hiện.
