---
title: "Proportional-share scheduling: chia CPU theo trọng số"
category: "Operating System"
tags: ["scheduling", "lottery scheduling", "fairness"]
description: "Hiểu ticket/lottery, stride scheduling và cách phân phối phần CPU theo tỷ trọng mong muốn."
updated: 2026-10-16
translationKey: "operating-system/proportional-share-scheduling"
---

Round Robin chia lượt theo hàng, nhưng hệ thống đôi khi cần nhóm A nhận khoảng 70% CPU và nhóm B 30%. **Proportional-share scheduling** biểu diễn entitlement bằng weight và phân phối CPU gần tỷ lệ mong muốn trong một khoảng đủ dài.

## Lottery scheduling

Mỗi process được cấp ticket. Scheduler rút số ngẫu nhiên; process sở hữu ticket trúng được chạy một quantum. Nếu A có 70 ticket và B có 30, A có xác suất xấp xỉ 70% nhận mỗi lần rút.

Tỷ lệ thực tế trong cửa sổ ngắn có thể dao động; nhiều lượt hơn thường làm tỷ lệ hội tụ. Ticket có thể được chia cho child hoặc truyền qua client/server để phản ánh quan hệ ownership, nhưng policy đó cần định nghĩa.

## Stride scheduling

Stride là mô hình deterministic: mỗi process có stride tỷ lệ nghịch với ticket. Scheduler chọn process có pass nhỏ nhất, cho chạy rồi cộng stride vào pass. Điều này phân phối tỷ lệ ít ngẫu nhiên hơn nhưng cần xử lý overflow, process mới và state reset.

## Weight không đồng nghĩa ưu tiên tuyệt đối

Weight 2x thường hướng tới gần gấp đôi CPU share trong điều kiện tranh chấp tương đương; nếu CPU còn rảnh, task có thể dùng nhiều hơn entitlement. cgroups/CPU shares, nice và scheduler policy có semantics khác nhau; đọc tài liệu kernel/runtime trước khi chuyển thuật ngữ giáo khoa sang cấu hình Linux.

## Fairness qua nhóm

Nếu một user tạo 100 process còn user khác một process, chia đều theo process khiến user đầu nhận nhiều hơn. Hierarchical scheduling chia trước theo nhóm rồi mới chia bên trong từng nhóm. Fairness cần xác định đơn vị: thread, process, tenant hay user.

## Tóm tắt

- Proportional-share nhắm phân chia CPU theo weight.
- Lottery scheduling chọn ngẫu nhiên theo ticket; ngắn hạn có thể dao động.
- Stride scheduling xấp xỉ tỷ lệ bằng pass value deterministic.
- CPU share chỉ quan trọng khi có tranh chấp và semantics tùy scheduler.
- Fairness theo process khác fairness theo user/tenant.

## Tự kiểm tra

**70/30 ticket nghĩa mọi cửa sổ 10 quantum đúng 7/3?** Không; lottery là xác suất, dao động ở mẫu nhỏ.

**Weight gấp đôi luôn làm chương trình hoàn tất nhanh gấp đôi?** Không; chỉ phân chia CPU tương đối dưới điều kiện nhất định.

**Chia đều mỗi PID luôn công bằng?** Không nếu người dùng tạo số lượng PID khác nhau.

## Đọc tiếp

Topic **Processes & Scheduling** kết hợp proportional share với mục tiêu latency/fairness và đa lõi.
