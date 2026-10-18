---
title: "MLFQ: feedback, priority boost và đoán workload"
category: "Operating System"
tags: ["operating-system", "scheduling", "mlfq"]
description: "Hiểu cách MLFQ điều chỉnh ưu tiên theo hành vi CPU, giới hạn của heuristic và cách ngăn starvation."
updated: 2026-10-16
translationKey: "operating-system/mlfq-priority-boost-and-feedback"
---

Multi-Level Feedback Queue (MLFQ) chia runnable jobs vào nhiều queue ưu tiên. Job mới thường được ưu tiên cao để cải thiện response time; nếu dùng hết quantum CPU, nó bị hạ xuống queue thấp hơn. Job hay nhường CPU sớm có thể được xem là tương tác hoặc I/O-bound và giữ mức ưu tiên cao.

## Scheduler học từ hành vi

MLFQ không cần biết trước job ngắn hay dài. Nó cập nhật ưu tiên dựa trên cách job sử dụng CPU gần đây. Điều này giúp phản hồi tốt với workload hỗn hợp nhưng cũng khiến job có thể “gaming” scheduler bằng cách nhường CPU sát cuối quantum.

## Priority boost và starvation

Nếu job dài luôn bị việc ngắn mới đến đẩy xuống, nó có thể chờ quá lâu. Priority boost định kỳ đưa jobs lên queue cao hơn, giúp job thấp có cơ hội chạy và làm scheduler quên hành vi quá xa trong quá khứ. Boost quá thường xuyên làm giảm phân biệt workload; quá thưa dễ gây starvation.

Quantum thường tăng ở queue ưu tiên thấp để giảm overhead context switch cho CPU-bound job. Tham số cần cân bằng response time, throughput và fairness; một thuật toán MLFQ không có một cấu hình tối ưu cho mọi tải.

## Tự kiểm tra

**MLFQ biết chính xác thời gian CPU còn lại của job?** Không.

**Job I/O-bound luôn được ưu tiên đúng trong mọi tải?** Không; heuristic phụ thuộc workload và tham số.

**Priority boost chỉ để tăng tốc?** Nó còn giúp chống starvation.

## Đọc tiếp

Scheduler proportional-share chọn mục tiêu khác: chia CPU theo trọng số thay vì suy đoán thời lượng job.
