---
title: "Replay, Determinism và thay đổi Workflow đang chạy"
category: "Workflow Engine"
kind: "guide"
translationKey: "cadence/replay-and-code-changes"
translationPending: true
series: "Cadence"
seriesOrder: 3
description: "Hiểu Event History, quy tắc determinism, side effect, replay test và cách thay đổi code mà không làm hỏng execution cũ."
sources:
  - title: "Cadence Workflows"
    url: "https://cadenceworkflow.io/docs/concepts/workflows"
  - title: "Cadence Workflow Versioning"
    url: "https://cadenceworkflow.io/docs/go-client/workflow-versioning"
  - title: "Cadence Workflow Replay and Shadowing"
    url: "https://cadenceworkflow.io/docs/go-client/workflow-replay-shadowing"
  - title: "Cadence Continue-As-New"
    url: "https://cadenceworkflow.io/docs/go-client/continue-as-new"
draft: false
---

Event History là nhật ký có thứ tự của các sự kiện trong một Workflow Execution: bắt đầu, schedule Activity, kết quả Activity, timer, signal và kết thúc. Khi Worker nhận một Workflow Task, SDK chạy lại định nghĩa Workflow từ đầu với input ban đầu. Các lệnh cũ được đối chiếu với history; Activity đã hoàn tất trả về kết quả đã ghi, không chạy side effect thêm lần nữa. Khi code đến điểm cần tạo lệnh mới, SDK gửi command tiếp theo cho Service.

Điều này tạo yêu cầu determinism: với cùng input và cùng history, Workflow phải phát ra chuỗi quyết định tương thích với những gì lịch sử ghi nhận. Không đọc đồng hồ hệ điều hành, số ngẫu nhiên, biến global có thể đổi, file local, database hoặc HTTP trực tiếp trong Workflow. Hãy dùng primitive của SDK cho clock/timer/concurrency; chuyển thao tác bên ngoài vào Activity. Nếu Workflow tạo các goroutine SDK hoặc timer theo một thứ tự khác, replay có thể phát hiện lệnh lệch và báo nondeterminism.

## Side effect và idempotency

Activity nằm ngoài replay path nhưng có thể được thực thi nhiều lần do timeout, worker crash hoặc phản hồi bị mất. Ví dụ, cổng thanh toán đã trừ tiền nhưng Activity chết trước khi báo kết quả; retry có thể gọi charge lần nữa. Dùng khóa idempotency do ứng dụng tạo từ định danh nghiệp vụ, lưu kết quả có thể tra cứu và thiết kế thao tác an toàn khi được thử lại. Không dựa vào giả định “Cadence chỉ gọi Activity đúng một lần”.

Một Activity hoàn tất thường được ghi vào history cùng kết quả. Nếu workflow replay sau đó, kết quả này được cung cấp lại để khôi phục biến và nhánh logic. Nhưng side effect còn dang dở hoặc phản hồi chưa kịp được ghi nhận có thể được thực hiện lại. Mỗi tích hợp nên có quy trình đối soát: tìm charge theo idempotency key, kiểm tra trạng thái reservation, hoặc gửi hành động bù nếu không thể lặp thao tác an toàn.

## Thay đổi code có thể làm history cũ không còn hợp lệ

Giả sử bản đầu gọi Activity `Reserve`, rồi `Charge`. Bản mới thêm `Validate` trước `Reserve`. Workflow mới khi replay history cũ có thể yêu cầu `Validate` tại vị trí mà history đang ghi `Reserve`; chuỗi command không khớp. Đây không phải lỗi kiểu dữ liệu mà là incompatibility với quyết định đã phát trong quá khứ. Execution đóng rất nhanh có thể không gặp vấn đề, nhưng quy trình chạy nhiều ngày khiến nhiều version code cùng phục vụ.

Cadence cung cấp `workflow.GetVersion` để tạo nhánh tương thích. Khi nâng cấp, giữ nhánh version cũ cho history trước marker và cho execution mới dùng nhánh mới. Không xóa nhánh cũ chỉ vì deploy đã ổn; trước hết phải biết còn execution nào cần replay nhánh ấy không. Lịch sử thực tế từ production nên được đưa vào replay test trong pipeline để phát hiện nondeterminism trước khi phát hành.

~~~go
version := workflow.GetVersion(ctx, "reserve-before-charge", workflow.DefaultVersion, 1)
if version == workflow.DefaultVersion {
    // Giữ thứ tự command mà execution cũ đã ghi.
    if err := workflow.ExecuteActivity(ctx, Reserve, orderID).Get(ctx, nil); err != nil {
        return err
    }
} else {
    if err := workflow.ExecuteActivity(ctx, Validate, orderID).Get(ctx, nil); err != nil {
        return err
    }
    if err := workflow.ExecuteActivity(ctx, Reserve, orderID).Get(ctx, nil); err != nil {
        return err
    }
}
~~~

Ví dụ trên chỉ minh họa vị trí version marker; hãy kiểm tra API SDK đang dùng và viết test cho cả history cũ lẫn execution mới. Sửa code bằng cách đổi tên Activity, chuyển lệnh qua nhánh khác hoặc thay đổi thứ tự timer đều cần được đánh giá theo history, không dựa vào cảm giác “logic vẫn vậy”.

## History tăng không giới hạn

Workflow sống dài sẽ tích lũy Event History. Khi lịch sử lớn, replay lâu hơn và giới hạn Service có thể trở thành rủi ro. `Continue-As-New` đóng run hiện tại rồi mở run mới cho cùng Workflow ID với input state đã chọn; history cũ không được sao chép sang run mới. Trước khi chuyển, serialize rõ state tối thiểu cần mang theo, tính đến message đang chờ và bảo đảm chuyển tiếp không làm mất nghiệp vụ.

Quy tắc thực hành là coi workflow code như một protocol với các execution đang tồn tại. Mỗi lần đổi thứ tự command, đặt câu hỏi: history cũ replay với code này sẽ phát ra điều gì? Dùng version marker khi cần, lưu fixture history, chạy replayer và theo dõi Workflow Task failure sau deploy. Đó là cách biến determinism từ một khái niệm khó nắm thành quy trình triển khai kiểm chứng được.
