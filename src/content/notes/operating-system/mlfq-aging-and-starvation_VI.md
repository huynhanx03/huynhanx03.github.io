---
title: "MLFQ: priority boost, aging và chống starvation"
category: "Operating System"
tags: ["scheduling", "mlfq", "starvation", "fairness"]
description: "Xem rule set MLFQ, vì sao cần ghi nhận CPU allotment và cách priority boost chống đói CPU."
updated: 2026-10-16
translationKey: "operating-system/mlfq-aging-and-starvation"
---

Multi-level feedback queue xếp task vào nhiều mức ưu tiên. MLFQ dự đoán hành vi từ lịch sử: task thường nhường CPU sớm có vẻ interactive; task dùng hết quantum có vẻ CPU-bound. Dự đoán có thể sai, nên policy cần quy tắc phục hồi công bằng.

## Quy tắc điển hình

- Task mới vào hàng ưu tiên cao.
- Mỗi mức có quantum riêng, thường thấp hơn ở queue ưu tiên thấp.
- Dùng hết allotment CPU làm hạ mức, kể cả chia thành nhiều lượt.
- Nhường sớm vì I/O có thể giữ mức cao.
- Định kỳ boost toàn bộ task lên mức cao để chống starvation/behavior drift.

Nếu chỉ tính mỗi lượt quantum, task có thể nhường ngay trước khi hết quantum rồi giả interactive mãi. Allotment tổng CPU ở mức ưu tiên giúp hạn chế gaming.

## Trade-off

Boost định kỳ cải thiện fairness nhưng có thể làm CPU-bound task chen lên cao và ảnh hưởng latency. Khoảng boost quá ngắn tốn overhead/churn; quá dài để job chờ lâu. Parameter cần đo theo workload.

## Starvation và priority inversion

Task thấp có thể không chạy nếu task cao liên tục ready. Aging nâng dần priority theo thời gian chờ; quota/weight giới hạn nhóm. Priority inversion xảy ra khi task cao chờ lock của task thấp đang bị task trung bình preempt; inheritance/ceiling là giải pháp trong một số scheduler.

## Tóm tắt

- MLFQ suy đoán tính tương tác từ hành vi CPU/I/O.
- Allotment tích lũy chống gaming bằng voluntary yield.
- Priority boost/aging giảm starvation.
- Parameter là trade-off response, fairness và throughput.
- Priority inversion khác starvation nhưng cùng liên quan ưu tiên.

## Tự kiểm tra

**Task yield trước quantum luôn được giữ ưu tiên cao?** MLFQ tốt cần tính allotment tích lũy.

**Priority boost không ảnh hưởng throughput?** Có thể tạo churn và đổi phân bổ.

**Priority inheritance làm mọi lock contention biến mất?** Không; nó chỉ giảm một dạng inversion.

## Đọc tiếp

Lập lịch realtime có deadline cần phân tích khác với MLFQ thông thường.
