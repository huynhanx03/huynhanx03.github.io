---
title: "NTP và đồng bộ đồng hồ trong hệ thống mạng"
category: "Network"
tags: ["network", "ntp", "time"]
description: "Hiểu offset, delay và stratum trong NTP, cùng lý do đồng hồ chính xác quan trọng với TLS, log và distributed system."
sources:
  - title: "Network Time Protocol Version 4: Protocol and Algorithms Specification"
    url: "https://www.rfc-editor.org/rfc/rfc5905.html"
updated: 2026-10-16
translationKey: "network/ntp-clock-synchronization"
---

Network Time Protocol (NTP) giúp host ước lượng thời gian từ time server qua mạng. Đồng hồ hệ thống có thể lệch do drift phần cứng, reboot hoặc cấu hình sai; đồng bộ thường điều chỉnh clock dần để tránh nhảy thời gian gây lỗi ứng dụng.

## Offset, delay và stratum

NTP dùng bốn timestamp: `T1` lúc client gửi request, `T2` lúc server nhận, `T3` lúc server trả lời và `T4` lúc client nhận response. Offset ước lượng là `θ = ((T2 − T1) + (T3 − T4)) / 2`; delay khứ hồi là `δ = (T4 − T1) − (T3 − T2)`. Offset dương nghĩa đồng hồ server được ước lượng đang đi trước đồng hồ client.

Ví dụ, nếu các thời điểm tương đối là `T1=0 ms`, `T2=40 ms`, `T3=41 ms`, `T4=61 ms`, thì `θ = ((40−0)+(41−61))/2 = 10 ms`, còn `δ = (61−0)−(41−40) = 60 ms`. Ước lượng này giả định độ trễ hai chiều tương đối cân bằng; bất đối xứng mạng có thể làm offset sai dù phép tính đúng.

Stratum mô tả khoảng cách logic từ nguồn tham chiếu, không phải thước đo tuyệt đối về độ chính xác. Server có stratum thấp vẫn có thể sai nếu nguồn hoặc cấu hình sai.

## Vì sao ứng dụng quan tâm?

TLS certificate phụ thuộc thời hạn; log và trace cần timestamp nhất quán; distributed lease, token và cache expiry dựa vào thời gian. Clock sai giữa máy làm thứ tự sự kiện khó phân tích. NTP không tạo đồng hồ logic toàn cục, và timestamp không chứng minh causal order giữa node.

## Chẩn đoán

Trên Linux, `timedatectl status`, `chronyc tracking` hoặc `ntpq -p` tùy daemon cho trạng thái sync. Kiểm tra UDP/123, upstream, timezone, RTC và nguồn thời gian. Timezone đổi cách chuyển thời điểm thành giờ/ngày hiển thị; nó không tự chỉnh đồng hồ hệ thống. Epoch là mốc gốc của một cách biểu diễn thời gian, không phải giá trị giờ hiện tại.

## Tự kiểm tra

**Stratum thấp chắc chắn đúng giờ hơn?** Không.

**Timezone thay đổi thời gian UTC trong kernel?** Không; timezone chủ yếu đổi cách chuyển đổi/hiển thị.

**NTP bảo đảm mọi máy có cùng timestamp chính xác tuyệt đối?** Không.

## Đọc tiếp

Timestamp đồng bộ giúp đối chiếu log network và system khi điều tra lỗi phân tán.
