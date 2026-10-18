---
title: "Mẫu nâng cao: lịch dài hạn, Nexus và AI"
category: "Workflow Engine"
kind: "guide"
translationKey: "temporal/advanced-patterns"
series: "Temporal"
seriesOrder: 8
description: "Chọn Continue-As-New, Nexus và durable execution cho tiến trình dài; cuối bài đối chiếu khi nào dùng Temporal thay vì queue."
sources:
  - title: "Continue-As-New"
    url: "https://docs.temporal.io/develop/go/workflows/continue-as-new"
  - title: "Temporal Nexus"
    url: "https://docs.temporal.io/nexus"
  - title: "Durable execution for AI agents"
    url: "https://temporal.io/blog/of-course-you-can-build-dynamic-ai-agents-with-temporal"
  - title: "Cadence vs Temporal"
    url: "https://cadenceworkflow.io/faq/cadence-vs-temporal"
draft: false
updated: 2026-10-15
---

Một workflow nhận sự kiện liên tục nhiều tháng, một đội khác cần cung cấp thao tác dài hạn cho nhiều caller, còn một agent chờ người duyệt trước khi dùng tool. Cả ba đều cần state bền vững, nhưng ranh giới và cách chờ khác nhau.

Các mẫu nâng cao có ích khi giải một nhu cầu đã xác định: kiểm soát history, tách quyền sở hữu hay giữ tiến trình qua nhiều lần gọi hệ thống ngoài. Ta xem Continue-As-New, Schedule/Child, Nexus và agent dưới góc đó, thay vì thêm primitive chỉ để kiến trúc trông phức tạp hơn.



## Continue-As-New giữ execution dài hạn gọn

Một Workflow có thể nhận Signal liên tục hoặc sống lâu nhiều tháng. Khi history tích lũy lớn, replay ngày càng tốn chi phí và thời gian. Continue-As-New đóng run hiện tại theo trạng thái Continued-As-New rồi tạo run mới với input tóm tắt, giữ Workflow ID cho chuỗi nghiệp vụ nhưng bắt đầu Event History mới. Đây không phải retry hay reset: ứng dụng phải chủ động chọn state nào chuyển sang và bảo đảm dữ liệu cần thiết còn nguyên.

Chọn điểm chuyển an toàn, thường sau khi xử lý xong message đang chờ hoặc tại ranh giới nghiệp vụ. Tránh cắt giữa transaction ngoài mà chưa biết kết quả. Chuyển checkpoint gọn gồm state hiện tại, cursor/sequence cần tiếp tục và version schema; không chép nguyên toàn bộ history thành input. Test Signal đến gần lúc Continue-As-New, handler đang chạy và Workflow được start lại để chắc message không bị mất hoặc xử lý hai lần. Kiểm tra SDK behavior và giới hạn theo phiên bản đang dùng.

## Schedules và Child Workflows theo quyền sở hữu

Schedule quản lý việc tạo Workflow định kỳ như một tài nguyên có ID; nó có thể cấu hình timezone, overlap, catch-up, pause và action tùy nền tảng/version. Timer bên trong Workflow là thời điểm thuộc một execution cụ thể, ví dụ hạn thanh toán của một đơn. Dùng Schedule cho “mỗi sáng tạo báo cáo”, timer cho “chờ đơn này đến 17:00”. Cần định nghĩa missed run khi hệ thống gián đoạn, nếu không catch-up có thể tạo một loạt công việc cũ cùng lúc.

Child Workflow phù hợp khi một sub-process cần lifecycle, retry/timeout, history hoặc team ownership riêng. Ví dụ workflow onboarding điều phối child theo từng tài khoản. Nếu chỉ là một bước đơn giản, Activity thường đủ và ít overhead hơn. Truyền state qua input/result/message có schema rõ; không dựa vào biến dùng chung giữa parent và child. Định nghĩa child close/cancel behavior để parent kết thúc không để child ngoài ý muốn tiếp tục.

### Chọn theo đơn vị cần sống độc lập

Báo cáo hằng ngày thường là nhiều execution do Schedule tạo. Quy trình theo dõi một tài khoản liên tục có thể là chuỗi run Continue-As-New. Một hồ sơ có nhiều phần được xử lý độc lập có thể cần child theo phần. Không thay thế ba cách này chỉ dựa vào việc chúng đều “chạy lâu”.

Hỏi state nào phải đi cùng nhau và ai cần tìm/cancel/retry từng đơn vị. Từ đó chọn ranh giới, rồi kiểm tra chi phí history và số task. Khi chưa có nhu cầu lifecycle riêng, một hàm phụ trong Workflow có thể đủ để tổ chức code.

## Nexus khi cần giao tiếp giữa Service/đội

Temporal Nexus cung cấp abstraction operation để Workflow ở một namespace/service gọi dịch vụ khác qua Nexus Endpoint, với lifecycle request và callback phù hợp cho operation dài hạn. Nó có thể làm rõ hợp đồng giữa hai domain sở hữu riêng, nhưng đem thêm endpoint, worker capability, auth, version và observability vào hệ thống. Đừng dùng Nexus chỉ để thay một lời gọi Activity nội bộ. Trước khi áp dụng, kiểm tra feature support trong đúng server/SDK/version, luồng retry, timeout, quyền truy cập và cách correlation id đi xuyên qua service boundary.

Khi chưa cần cross-service contract, parent gọi Activity hoặc Child Workflow qua task queue thường dễ hiểu hơn. Nếu cần nhiều đội phát triển độc lập, ghi rõ ai sở hữu operation, schema compatibility, timeout, error mapping và hành vi khi service đích triển khai phiên bản mới. Một diagram nhỏ về caller, endpoint, handler và kết quả thường giúp review ranh giới này tốt hơn nhiều lớp wrapper.

## Durable execution cho agent và quy trình có suy luận

Agent có thể gọi model, tool, chờ người phê duyệt rồi tiếp tục. Model inference và tool I/O là nondeterministic, nên thực hiện qua Activity. Workflow giữ tiến trình: input đã duyệt, bước đang chờ, retry policy, timeout và kết quả đã ghi. Khi replay, Temporal dùng kết quả Activity trong history chứ không tự gọi model lần nữa cho bước đã hoàn tất. Điều đó giúp resume sau crash nhưng không biến output của model thành đúng hoặc an toàn.

Giới hạn tool, validate output, yêu cầu human approval ở điểm rủi ro, ẩn PII khỏi history, đặt timeout/budget token và ghi nhận phiên bản prompt/model cùng policy cần thiết để giải thích kết quả. Một Activity gọi LLM có thể retry sau lỗi mạng dù nhà cung cấp đã xử lý request; dùng request/idempotency strategy nếu có, hoặc lưu operation reference và reconcile. Đừng giả định replay có thể tái tạo một lần inference mới giống hệt cũ.

### Theo một lần inference qua sự cố

Agent gọi Activity để lấy đề xuất từ model. Nếu kết quả đã được ghi vào history, replay dùng kết quả cũ, dù model hoặc prompt hiện tại có thể đã thay đổi. Nếu provider đã xử lý nhưng response chưa ghi, retry có thể tạo một lần inference mới khác kết quả cũ và phát sinh chi phí khác.

Ghi phiên bản prompt/model giúp giải thích quá trình, nhưng không bảo đảm inference mới tái lập bit-for-bit. Khi output dẫn đến tool có tác dụng phụ, bước kiểm tra quyền, dữ liệu và phê duyệt phải nằm ở hợp đồng ứng dụng. Durable execution giữ tiến trình; không chứng minh đề xuất model đúng.

Nexus cũng cần hợp đồng theo ranh giới sở hữu: caller cần biết operation được nhận, đang chạy hay hoàn tất, và lỗi được ánh xạ thế nào. Dùng abstraction không làm quyền truy cập hay trách nhiệm vận hành biến mất.

## Cadence, Temporal hay queue?

Temporal phù hợp khi có quy trình nhiều bước sống lâu, chờ event/timer, cần retry có trạng thái, audit tiến trình và phục hồi sau process failure. Queue thuần thường phù hợp cho job độc lập, throughput cao, consumer có thể stateless và không cần orchestration qua nhiều ngày. Một backend có thể dùng cả hai: queue để ingest fan-out, Workflow để điều phối lifecycle nghiệp vụ.

Cadence và Temporal chia sẻ mô hình durable workflow nhưng phát triển riêng. Trực giác về history/replay, Activity boundary và idempotency vẫn hữu ích; SDK, deployment, versioning, API và feature không mặc định tương thích. Nếu chọn engine, so sánh SDK/version, nhu cầu tính năng, Cloud hay self-host, observability, bảo mật, governance, chi phí vận hành và khả năng hỗ trợ. Nếu migrate, lập kế hoạch cho execution đang mở, dữ liệu history và chạy song song; đổi endpoint không tự chuyển được state đang chạy.

Một design review tốt có thể trả lời: state nào nằm trong Workflow, side effect nào ở Activity, workflow sống bao lâu, thao tác nào idempotent, cách deploy code tương thích ra sao, và ai chịu trách nhiệm khi execution bị kẹt. Nếu chưa trả lời được, hãy đơn giản hóa mô hình trước khi thêm một primitive mới.

## Tự kiểm tra trước khi thêm mẫu nâng cao

**Continue-As-New có phải copy toàn history sang input mới không?** Không. Mang state tối thiểu để tiếp tục đúng; sao chép cả lịch sử lại giữ nguyên vấn đề kích thước theo dạng khác.

**Tái sử dụng hiểu biết Cadence có nghĩa SDK và history tương thích Temporal không?** Không. Tách trực giác chung với API/định dạng thực tế, lập kế hoạch cho execution đang mở khi chuyển nền tảng.

**Activity gọi model xong có thể bỏ kiểm tra output vì nó đã durable không?** Không. Độ bền của một kết quả không phải độ đúng hoặc quyền được thực hiện hành động từ kết quả đó.
