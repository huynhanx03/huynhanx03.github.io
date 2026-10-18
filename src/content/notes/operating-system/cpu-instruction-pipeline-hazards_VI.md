---
title: "Pipeline CPU và các dạng hazard"
category: "Operating System"
tags: ["computer-architecture", "cpu", "pipeline"]
description: "Theo dõi instruction qua pipeline và hiểu data, control, structural hazard làm giảm thông lượng như thế nào."
updated: 2026-10-17
translationKey: "operating-system/cpu-instruction-pipeline-hazards"
---

Pipeline chia việc thực thi instruction thành các giai đoạn như fetch, decode, execute, memory và writeback. Khi pipeline đã đầy, nhiều instruction thuộc các giai đoạn khác nhau có thể tiến song song. Mục tiêu là tăng throughput; latency của một instruction không nhất thiết giảm theo cùng tỷ lệ.

## Ba dạng hazard

- **Data hazard:** instruction sau cần kết quả instruction trước chưa ghi xong. Forwarding chuyển kết quả giữa các stage; nếu chưa đủ, pipeline chèn stall/bubble.
- **Control hazard:** nhánh làm chưa biết instruction tiếp theo. CPU có thể dự đoán nhánh; dự đoán sai phải bỏ công việc speculative và nạp lại đường đúng.
- **Structural hazard:** hai thao tác cùng cần một tài nguyên phần cứng không thể phục vụ đồng thời, như một cổng memory dùng chung.

## CPI và throughput

Trong mô hình lý tưởng **single-issue**, pipeline có thể hoàn tất gần một instruction mỗi chu kỳ sau khi lấp đầy. CPU superscalar có thể phát hành nhiều instruction mỗi chu kỳ, nên giới hạn lý thuyết của nó cao hơn. Stall, cache miss, dependency và branch misprediction làm IPC giảm so với giới hạn của thiết kế. Tổng thời gian còn phụ thuộc clock frequency và số instruction; giảm CPI không đảm bảo chương trình nhanh hơn nếu tần số hoặc số lệnh thay đổi.

Compiler có thể sắp xếp instruction để che latency khi semantics cho phép; CPU out-of-order có thể tìm instruction độc lập phía sau. Cả hai vẫn phải giữ kết quả quan sát được đúng theo kiến trúc.

## Tự kiểm tra

**Pipeline năm stage có nghĩa mỗi instruction hoàn tất trong một phần năm chu kỳ?** Không; các stage chạy song song trên instruction khác nhau.

**Branch misprediction làm sai kết quả chương trình?** Không; kết quả speculative bị bỏ trước khi trở thành trạng thái kiến trúc.

**Throughput và latency giống nhau?** Không.

## Đọc tiếp

Branch predictor đoán hướng nhánh để giảm bubble, còn speculative execution mở rộng công việc trước khi biết nhánh chắc chắn.
