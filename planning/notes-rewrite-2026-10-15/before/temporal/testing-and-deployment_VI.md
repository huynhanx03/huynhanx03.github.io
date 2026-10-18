---
title: "Kiểm thử Workflow và triển khai code an toàn"
category: "Workflow Engine"
kind: "guide"
translationKey: "temporal/testing-and-deployment"
translationPending: true
series: "Temporal"
seriesOrder: 5
description: "Kết hợp unit test, time-skipping và replay lịch sử để phát hiện thay đổi không tương thích trước khi rollout Worker."
sources:
  - title: "Testing - Go SDK"
    url: "https://docs.temporal.io/develop/go/testing-suite"
  - title: "Patching"
    url: "https://docs.temporal.io/patching"
  - title: "Worker Versioning"
    url: "https://docs.temporal.io/worker-versioning"
  - title: "Workflow Definition"
    url: "https://docs.temporal.io/workflow-definition"
draft: false
---

Workflow là code chạy qua nhiều bản deploy. Một execution có thể được start bởi phiên bản Worker cũ, tạm dừng vài ngày rồi mới cần chạy tiếp trên Worker mới. Vì vậy một bài test “code mới chạy qua happy path” chưa đủ: ta cần biết code có phát lại được history cũ không, nhánh lỗi có ổn định không và quá trình rollout có giữ execution tương thích không.

## Chia kiểm thử thành nhiều lớp

Unit test cho logic thuần như tính phí, chọn bước tiếp theo hoặc validate input. Temporal Go SDK có test environment cho Workflow và Activity, hỗ trợ điều khiển thời gian để test timer, timeout, Signal và cancellation mà không phải đợi ngoài đời. Activity cần được mock khi kiểm tra nhánh orchestration, còn Activity test riêng tập trung vào adapter và side effect. Tách hai dạng test giúp lỗi chính sách Workflow không bị che bởi lỗi mock hay HTTP.

Integration test với Temporal test server hoặc môi trường phát triển kiểm tra đăng ký type, serialization, cấu hình client, task queue và tương tác thực tế giữa Worker với Service. Nên giữ một số test đại diện cho hợp đồng end-to-end như: start một đơn hàng, Signal xác nhận giao hàng, Activity trả kết quả và execution đóng đúng trạng thái. Không cần biến mọi test thành integration test vì tốc độ chậm và lỗi môi trường làm phản hồi kém tin cậy.

## Replay lịch sử cũ trước khi phát hành

Workflow replay test dùng history đã lưu hoặc fixture để chạy code mới qua các execution thật đã được chọn. Nó đặc biệt hữu ích khi sửa logic branch, đổi thứ tự gọi Activity, thay tên loại command hay chuyển state machine. Tạo bộ mẫu history gồm workflow đang mở lâu, nhánh lỗi, timer đã fire, Signal đã nhận và các phiên bản cũ còn phổ biến. Khi replay mismatch, coi đó là tín hiệu cần điều tra; không xóa fixture cho đến khi hiểu thay đổi nào gây khác biệt.

Replay xác nhận tương thích với những history được chọn chứ không chứng minh mọi execution có thể tiếp tục. Hãy lưu fixture từ production có kiểm soát dữ liệu nhạy cảm, ghi version/SDK và giữ một bộ tối thiểu ổn định trong repository hoặc hệ thống CI. Nếu history chứa payload thật, dùng dữ liệu đã ẩn danh hoặc cơ chế bảo vệ phù hợp.

## Patching là nhánh tương thích trong cùng Workflow code

Khi cần thay một đoạn logic của execution đang mở, API patch ghi quyết định vào history để replay biết execution thuộc nhánh cũ hay nhánh mới. Luồng phổ biến là phát patch marker, chạy logic mới cho Workflow mới và execution đã đi qua điểm patch, nhưng để execution cũ dùng logic cũ. Sau khi không còn execution nào cần nhánh cũ, có thể chuyển qua deprecate marker theo đúng hướng dẫn SDK.

Không xóa marker ngay sau một deploy chỉ vì các test mới đã qua. Một execution cũ có thể chưa replay trong nhiều tuần. Cần biết tuổi thọ tối đa của workflow, trạng thái execution đang mở, thời gian deploy đồng thời và chính sách giữ lịch sử. Mỗi lần sửa lịch sử/nhánh nên đi cùng fixture replay để người review thấy trường hợp cũ được bảo toàn ra sao.

## Worker deployment và compatibility window

Worker Versioning cho phép quản lý phiên bản Worker nhận task của execution theo các cơ chế hỗ trợ ở Temporal Server và SDK. Khả năng cụ thể phụ thuộc phiên bản; đọc tài liệu đúng server/SDK đang triển khai trước khi thiết kế rollout. Dù dùng versioning hay patching, phải bảo đảm task của execution đang mở được một Worker tương thích nhận xử lý. Không deploy mới theo kiểu khiến execution đang chạy chỉ còn một bản code không đọc được history hiện tại.

Quy trình release thực tế có thể là: chạy unit và integration test; replay bộ history; deploy canary; quan sát Workflow Task failure và nondeterminism; tăng dần worker; sau đó chỉ dọn nhánh cũ khi execution tương ứng đã đóng. Khi rollback, kiểm tra Worker cũ còn tương thích với history mà bản mới đã ghi. Rollback binary không tự đảo ngược các Event đã phát sinh.

## Checklist review

Trước khi merge thay đổi Workflow, xác định nó tác động execution mới hay cả execution đang mở; chạy fixture replay có nhánh chịu ảnh hưởng; kiểm tra tên Activity/Child Workflow và thứ tự command; bảo đảm các side effect ở Activity vẫn idempotent; và ghi kế hoạch giữ/xóa patch marker. Với rollout lớn, thống kê loại và tuổi của execution mở, chia canary theo queue hoặc workflow type, rồi quan sát task queue backlog, Workflow Task retries và failure trước khi tăng tỷ lệ.

Mục tiêu không phải tránh mọi thay đổi. Mục tiêu là biến compatibility thành một kiểm tra có thể lặp lại trong CI, thay vì phát hiện execution cũ bị mắc kẹt sau deploy.
