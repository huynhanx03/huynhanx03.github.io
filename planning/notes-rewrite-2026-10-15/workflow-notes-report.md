# Workflow Engine, Cadence và Temporal

## Phạm vi và cách biên tập

18 bài tiếng Việt: 2 Workflow Engine, 8 Cadence, 8 Temporal. Không tạo EN mới vì các bài đang có translationPending. Giữ slug, thứ tự series, taxonomy, nguồn và ảnh hiện có; cập nhật ngày sửa. Một số link Temporal chuyển sang đường dẫn canonical còn đọc được.

Hai bài Workflow Engine được viết lại toàn mạch. Với Cadence/Temporal, bản cũ đã có nhiều đoạn giải thích tốt: giữ các phần đúng và rõ, viết lại phần mở đầu theo tình huống, đan diễn biến cụ thể vào giữa các mục, sửa khẳng định cần điều kiện và thêm câu hỏi có lời giải. Không thay mọi câu chỉ để tạo diff; không chỉ gắn thêm một đoạn giới thiệu chung. Mỗi bài có tình huống và bước lập luận riêng.

## Đối chiếu theo bài

| Bài | Giữ | Bổ sung/gộp/sửa |
| --- | --- | --- |
| cron-vs-schedule | Overlap, pause, backfill, ETL, quyền vận hành, Cadence/Temporal khác semantics | Theo ETL 90 phút/chu kỳ 60 phút, tách cron expression với scheduler, thời điểm lịch với start thật, backlog và khóa cửa sổ; bỏ mốc hỗ trợ v1.4.1 chưa được nguồn đã đọc xác nhận |
| workflow-history | History là dữ liệu replay, blob/reference, converter, phạm vi bảo mật, giới hạn payload | Theo một kết quả video qua crash; reference/version/retention, nil URL hết hạn, khả năng phục hồi phụ thuộc storage ngoài; giữ khoảng 2MB dưới nhãn blog/trường hợp cụ thể |
| cadence/fundamentals | Workflow/Activity/Service/Worker, queue/cron, chi phí vận hành, quyết định chọn | Giữ hàng đã có/đã thiếu kết quả trong history, phân biệt độ bền state với khả năng tiến triển, self-check có đáp án |
| cadence/first-workflow | Local/domain/task list/start, code OrderWorkflow, ID/run, chẩn đoán và ảnh replay | Giải thích ActivityOptions/ExecuteActivity/Get theo thời điểm, nêu import/bootstrap bị lược, ba trạng thái start/nhận task/hoàn tất |
| cadence/activity-reliability | Timeout/retry/heartbeat/checkpoint/async completion và bảo mật | Bảng provider có thể xong nhưng Cadence chưa biết; tra rồi tạo chưa tự chống hai attempt chồng; sửa câu replay tự sinh thêm event; timeout budget gắn đúng SDK |
| cadence/orchestration | Signal/Query, timer/schedule, child, cancel/terminate, saga | RequestID và mốc xác nhận, timer/signal sát hạn, phản hồi gửi không phải kết quả áp dụng, bù trừ có thể thất bại |
| cadence/replay-and-code-changes | History, determinism, idempotency, GetVersion code, replay/shadowing, Continue-As-New | Phân biệt cached state với replay khi cần, hai cửa sổ Activity, marker khác feature flag, giải thích snippet và nhánh cũ/mới |
| cadence/data-and-observability | Payload/claimcheck, converter/encryption/key, Visibility/history, trace/metric | Reference xác định nội dung, ba vòng đời execution/object/key, đi từ list đến event/queue/dependency; không coi chờ timer có chủ đích là lỗi |
| cadence/production-operations | Service/worker/persistence, routing/scale, CLI, retention, HA/multiDC/runbook | Bảng giả thuyết trước scale, retention không xóa tùy ý history đang mở, restore cần key/code, xác định sideeffect trước terminate/failover |
| cadence/choosing-cadence | Tiêu chí SDK/deploy/feature, prototype đường lỗi, migration execution, decision record | Tiêu chí loại trừ khác ưu tiên, bằng chứng theo version, checkpoint và owner migration, tránh dùng nguồn nhà cung cấp như căn cứ duy nhất |
| temporal/fundamentals | Service/client/worker/activity/Workflow, namespace/ID/queue, code Go, ảnh, local/restart | Giải thích từng lời gọi, import/bootstrap, trạng thái cached không phải nguồn durable, cửa sổ kết quả chưa ghi |
| temporal/history-and-determinism | Command/event/replay, constraints, task vs execution failure, resource/child/CAN, ảnh | History Reserve→Charge đối chiếu code thêm Validate; không phải mọi task replay hết; tách thay tính toán cục bộ với command compatibility |
| temporal/activity-reliability | At-least-once, ranh giới Activity, timeout/retry, checkpoint/cancel/async, ảnh | Budget nhiều attempt/queue/backoff, timeout chưa chứng minh I/O cũ dừng, chống trùng không chỉ tra rồi tạo, câu hỏi checkpoint có lời giải |
| temporal/orchestration | Signal/Query/Update, timer/schedule, child/CAN, cancel/saga | Bảng mốc phản hồi, accepted/completed theo cách chờ; validator không I/O/mutate state; bàn giao run/handler và child-start lifecycle |
| temporal/data-and-observability | History/blob, converter/codec/key, Visibility, metric/trace, điều tra | Reader/writer rollout và nhiều định dạng history, UI cần đường codec phù hợp; phân ba khoảng thời gian, label cardinality |
| temporal/testing-and-deployment | Unit/SDK/time-skipping/integration/replay, patching/versioning, canary/rollback/review | Cùng một thay đổi qua bốn lớp bằng chứng; Go GetVersion theo marker tại điểm replay thay vì mọi execution cũ luôn nhánh cũ; rollback phải đọc được history mới |
| temporal/production | Cloud/selfhost trách nhiệm, queues/capacity, namespace/quyền, deploy/upgrade/reset, alerts | Bảng backlog theo lớp, reset không rollback provider, retention lịch sử đã đóng khác CAN; self-check theo SLO |
| temporal/advanced-patterns | CAN, Schedule/Child/Nexus, agent/model/tool, Cadence/Temporal/queue | Sửa trạng thái CAN thành Continued-As-New; vòng đời/sở hữu, inference đã ghi khác attempt chưa có kết quả, durable output không có nghĩa output đúng |

Không bỏ chủ đề kỹ thuật chính, ảnh hay snippet Workflow cũ. Có thay văn phong, gộp câu lặp, bỏ các lời dẫn quảng bá và chỉnh khẳng định không chính xác. Không thêm tính năng, migration hay integration vận hành thực tế.

## Nguồn và giới hạn kiểm chứng

Đã đối chiếu các nhóm tài liệu chính thức được dẫn trong bài: Cadence Workflows/Activities/Events/Timers/Schedules/Topology/Task Lists/Visibility, versioning/replay/CAN/async completion, CLI/operation overview, blog claim-check/history/encryption; Temporal core/Workflow Definition/Activity/Tasks/History/message passing, Go guide/testing/async/data handling/CAN, worker versioning/patching, visibility/workers/deployment/Nexus và bài AI. Đọc nguồn so sánh Cadence theo góc nhìn nhà cung cấp, không dùng để tự xếp hạng hai nền tảng.

Một số URL cũ Temporal không tải được; đã tìm đường Go canonical cho CAN và async completion. Không xem lỗi fetch là bằng chứng sản phẩm không có tính năng. Không áp một version/quota của engine này cho engine khác. Con số payload và mốc release thiếu bằng chứng bị giới hạn hoặc bỏ như bảng ghi nhận.

Không chạy code ví dụ, provider, test, benchmark, replay, fault injection, migration hoặc các lệnh can thiệp execution. Những phần nói về kiểm thử là nội dung hướng dẫn, không phải bằng chứng đã thực thi. Chỉ có kiểm tra tĩnh nội dung và typecheck/build chung ở cuối đợt.
