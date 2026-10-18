---
title: "Lottery và stride scheduling"
category: "Operating System"
tags: ["operating-system", "scheduling", "fairness"]
description: "So sánh lottery scheduling ngẫu nhiên với stride scheduling xác định để phân bổ CPU theo share."
updated: 2026-10-16
translationKey: "operating-system/lottery-scheduling-stride"
---

Proportional-share scheduler cố chia CPU theo trọng số. Trong lottery scheduling, mỗi job có số ticket; scheduler bốc một ticket ngẫu nhiên và chạy job sở hữu. Ticket nhiều hơn nghĩa cơ hội nhận CPU cao hơn trong dài hạn, nhưng ở cửa sổ ngắn có biến động ngẫu nhiên.

## Ticket và quyền chia sẻ

Nếu A có 20 ticket và B có 10, A nhận kỳ vọng hai phần ba thời gian CPU khi cả hai runnable. Lottery có thể dùng ticket transfer để một client tạm trao share cho server đang phục vụ nó, hoặc currency để phân cấp phân bổ.

Tỷ lệ là kỳ vọng xác suất, không phải cam kết đúng sau từng quantum hay trong mọi khoảng thời gian ngắn. Khi các job chạy lâu và có nhiều lần bốc thăm, tỷ lệ quan sát thường tiến gần tỷ lệ ticket hơn; một job ngắn vẫn có thể hoàn tất trước hoặc sau đối thủ chỉ vì chuỗi kết quả ngẫu nhiên. Cơ chế ticket cũng không tự giải quyết câu hỏi quản trị quan trọng: ai được gán bao nhiêu share.

## Stride scheduling

Stride scheduling chuyển share thành khoảng cách xác định. Job có stride nhỏ hơn (share cao hơn) được chọn khi pass value thấp nhất; sau khi chạy, pass tăng thêm stride. Cách này giảm biến động ngẫu nhiên và có thể cung cấp fairness tốt hơn trên khoảng ngắn, nhưng phải quản lý pass khi job tham gia/rời hệ thống.

## Giới hạn

Share áp dụng khi jobs cạnh tranh CPU; task blocked không nhận CPU chỉ vì có ticket. Multiprocessor scheduling, affinity và latency tương tác làm mô hình phức tạp hơn. Ticket count cũng không phải real-time deadline guarantee.

## Thực hành: xác suất và độ công bằng

Chạy lottery với cùng workload nhưng nhiều random seed. So hai job có số ticket cân bằng với một cặp lệch mạnh; ghi thời điểm mỗi job hoàn tất và lượng CPU nhận được theo từng đoạn thời gian. Lặp lại khi quantum tăng để xem độ dao động trong cửa sổ ngắn thay đổi ra sao. Cuối cùng vẽ tỷ lệ CPU quan sát được theo thời gian và đặt cạnh stride scheduler.

Kỳ vọng ticket là dài hạn; một lần chạy hoặc cửa sổ ngắn có thể lệch đáng kể. Khi so công bằng, hãy nói rõ metric đang dùng—tỷ lệ CPU theo thời gian hay độ lệch thời điểm hoàn tất—vì chúng không trả lời cùng một câu hỏi.

## Tự kiểm tra

**Lottery bảo đảm tỷ lệ chính xác ở mỗi quantum?** Không.

**Job có ticket nhưng blocked sẽ dùng CPU?** Không.

**Stride scheduler ngẫu nhiên?** Không; nó chọn dựa trên pass.

## Đọc tiếp

Multiprocessor scheduler còn cần quyết định core nào chạy task để cân bằng fairness và cache locality.
