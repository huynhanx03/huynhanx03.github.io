---
title: "Event-based concurrency: event loop và I/O bất đồng bộ"
category: "Operating System"
tags: ["concurrency", "event loop", "asynchronous io"]
description: "Hiểu event loop, callback, blocking và cách event-based design đánh đổi cấu trúc code với số thread."
updated: 2026-10-16
translationKey: "operating-system/event-based-concurrency"
---

Một server có thể tạo thread cho từng kết nối, hoặc dùng một event loop theo dõi nhiều socket rồi xử lý khi có sự kiện. Event-based concurrency giảm số thread cần quản lý cho workload I/O lớn, nhưng đòi hỏi mỗi handler không chặn event loop quá lâu.

## Vòng lặp sự kiện

Một event loop điển hình lặp:

1. Đợi tập sự kiện như socket readable/writable, timer hoặc completion.
2. Lấy các sự kiện sẵn sàng.
3. Gọi handler phù hợp.
4. Đăng ký thao tác cần chờ tiếp theo rồi quay lại vòng lặp.

API cụ thể có thể dùng readiness (fd sẵn sàng để thử I/O) hoặc completion (thao tác đã hoàn tất). `select`, `poll`, `epoll`, `kqueue` và IO completion APIs có semantics/giới hạn khác nhau.

`select`/`poll` là readiness API: chúng báo descriptor nào có thể đọc/ghi mà không chặn ngay; ứng dụng vẫn phải gọi I/O và xử lý kết quả (kể cả partial read/write, EOF và lỗi). Với asynchronous file I/O kiểu completion, ứng dụng gửi control block chứa file descriptor, offset, buffer và số byte; lời gọi trả trước khi I/O xong, rồi chương trình polling trạng thái hoặc nhận notification để tiếp tục. Polling nhiều request liên tục tốn công; completion notification tránh một phần polling nhưng thêm quản lý callback/state.

## Blocking call làm nghẽn loop

Nếu handler xử lý một request rồi gọi hàm đọc đĩa blocking trong 500 ms, event loop có thể không xử lý socket khác trong thời gian đó. Giải pháp là dùng API bất đồng bộ phù hợp, chuyển tác vụ blocking sang worker pool hoặc chia nhỏ xử lý.

Đưa mọi việc sang worker pool cũng có giới hạn: pool có thể cạn, queue phình và deadline hết hạn. Cần backpressure và giới hạn tài nguyên.

## Callback, future và state machine

Callback tách công việc thành nhiều bước; control flow có thể bị phân tán qua nhiều hàm. Future/promise hoặc async/await cho cách viết tuần tự hơn trên một runtime bất đồng bộ, nhưng không loại chi phí cancellation, timeout hay ownership.

Khi một request chờ nhiều sự kiện, state machine tường minh giúp biết bước hiện tại, dữ liệu giữ lại và cách xử lý lỗi. Callback lồng sâu không phải yêu cầu bắt buộc của event-driven design.

Thread giữ continuation tự nhiên trên stack: sau `read`, biến `socket` vẫn ở cùng stack frame để gọi `write`. Event handler phải tự lưu dữ liệu cần bước kế tiếp — continuation có thể là object/state machine được tra bằng request hoặc file descriptor. Đây là manual stack management: giảm phụ thuộc stack thread nhưng làm code và vòng đời buffer/request phức tạp hơn. Buffer cho I/O bất đồng bộ phải còn sống tới completion.

## Event loop không tự loại race

Một loop đơn có thể tuần tự hóa handler của nó, nhưng app có thể dùng nhiều loop, worker thread, callback reentrant hoặc shared state ngoài loop. Event-driven code vẫn cần xác định ownership và đồng bộ ở ranh giới song song.

Mô hình event không loại được blocking ẩn. Page fault khi handler chạm dữ liệu có thể block toàn loop dù API gọi là non-blocking; thay đổi thư viện từ non-blocking sang blocking cũng buộc handler/state machine đổi theo. Khi thiếu async disk I/O, một thiết kế lai có thể để event loop xử lý socket còn worker pool xử lý I/O đĩa. Nhiều loop chạy song song trên nhiều CPU lại cần đồng bộ như các thread thông thường.

## Khi nào chọn mô hình nào?

Thread-per-task dễ hiểu khi số tác vụ vừa phải và blocking phù hợp. Event loop hữu ích khi có nhiều I/O đồng thời và runtime cung cấp API phù hợp. Thread pool phù hợp với công việc CPU hoặc API blocking. Nhiều hệ thống kết hợp cả ba.

## Tóm tắt

- Event loop chờ sự kiện rồi gọi handler cho tài nguyên sẵn sàng.
- Blocking trong handler có thể ngăn xử lý các sự kiện khác.
- Worker pool giúp cô lập công việc blocking nhưng cần giới hạn queue và backpressure.
- Async abstraction không tự giải quyết cancellation, timeout hay ownership.
- Event-driven code vẫn có thể gặp race khi nhiều loop/worker chia sẻ trạng thái.

## Tự kiểm tra

**Event loop nghĩa là không có thread?** Không; thường có một hoặc nhiều thread loop và worker.

**Async/await làm I/O chạy nhanh hơn tự động?** Không. Nó đổi cách phối hợp chờ; giới hạn thiết bị và server vẫn còn.

**Một event loop đơn chắc chắn không có race?** Chỉ với trạng thái được tuần tự hóa trên loop; shared state ở nơi khác vẫn cần đồng bộ.

## Đọc tiếp

Nối event loop với topic **Network** để xem socket readiness và TCP tạo ra sự kiện nào cho ứng dụng.
