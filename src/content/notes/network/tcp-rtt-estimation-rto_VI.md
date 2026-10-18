---
title: "Ước lượng RTT và tính retransmission timeout"
category: "Network"
tags: ["network", "tcp", "rto", "rtt"]
description: "Hiểu smoothed RTT, variation, timer backoff và vì sao timeout không thể chọn bằng một hằng số cho mọi đường."
sources:
  - title: "Computing TCP's Retransmission Timer (RFC 6298)"
    url: "https://www.rfc-editor.org/rfc/rfc6298.html"
  - title: "TCP Extensions for High Performance (RFC 7323)"
    url: "https://www.rfc-editor.org/rfc/rfc7323.html"
  - title: "TCP Congestion Control (RFC 5681)"
    url: "https://www.rfc-editor.org/rfc/rfc5681.html"
  - title: "TCP DSACKs (RFC 3708)"
    url: "https://www.rfc-editor.org/rfc/rfc3708.html"
  - title: "The Eifel Detection Algorithm (RFC 3522)"
    url: "https://www.rfc-editor.org/rfc/rfc3522.html"
  - title: "Forward RTO-Recovery (F-RTO) (RFC 5682)"
    url: "https://www.rfc-editor.org/rfc/rfc5682.html"
updated: 2026-10-17
translationKey: "network/tcp-rtt-estimation-rto"
---

RTT thay đổi theo congestion, route, queue và tải endpoint. Nếu timeout quá ngắn, sender retransmit dữ liệu đã tới (spurious retransmission); nếu quá dài, loss phục hồi chậm. TCP dùng estimator thay vì một timeout cố định.

## Smoothed RTT và variation

Estimator cổ điển cập nhật smoothed RTT bằng trọng số sample cũ và mới, đồng thời ước lượng deviation/variation. RTO lấy SRTT cộng phần bù theo biến thiên, rồi áp dụng min/max clamp theo specification/implementation.

Theo thuật toán trong [RFC 6298](https://www.rfc-editor.org/rfc/rfc6298.html), khi có RTT sample `R` đầu tiên, TCP đặt `SRTT = R`, `RTTVAR = R/2`; các mẫu sau cập nhật EWMA với trọng số khác nhau cho SRTT và RTTVAR. RTO có dạng `SRTT + max(G, 4 × RTTVAR)`, trong đó `G` là độ hạt timer. Biên độ dự phòng tăng theo mức dao động của RTT, thay vì chỉ nhân SRTT với một hằng số. RFC này khuyến nghị làm tròn RTO dưới một giây lên một giây; implementation có thể đặt giới hạn khác. Sách cũng mô tả thuật toán Linux đời cũ riêng, nên không trộn các con số Linux 2.6 với quy tắc hiện hành.

Ước lượng RTT thường tính riêng cho từng kết nối. TCP theo dõi timer cho dữ liệu đang chờ ACK có tiêu thụ sequence number, gồm cả SYN/FIN; ACK thuần không tự tiêu thụ sequence space. Sample timestamp echo có thể giúp lấy mẫu thường xuyên hơn và phân biệt bản truyền lại, nhưng clock TCP phải tăng phù hợp; hai máy không cần đồng bộ giờ.

Sample mới có thể nhiễu; EWMA làm mượt nhưng phản ứng chậm với thay đổi đột ngột. Timer granularity và scheduling cũng tạo sai số.

## Ambiguous ACK và Karn

Nếu sender retransmit segment, ACK nhận được có thể trả lời bản đầu hoặc bản retransmit. Không biết sample RTT nào đúng; Karn’s algorithm bỏ RTT sample mơ hồ trừ khi timestamp giúp phân biệt. Timeout liên tiếp thường exponential backoff để giảm tải trên đường đang lỗi.

Karn’s algorithm chỉ xử lý sự mơ hồ của RTT sample: bỏ mẫu cho dữ liệu đã retransmit nếu không phân biệt được ACK thuộc bản gửi nào. Riêng RFC 6298 yêu cầu tăng gấp đôi RTO sau mỗi lần timeout; khi TCP lấy được sample hợp lệ mới từ dữ liệu không retransmit, nó tính lại RTO và có thể bỏ phần backoff. Timeout cũng là tín hiệu để congestion control thận trọng hơn, tránh gửi lại quá dày khi đường truyền đang chậm.

Một TCP connection thường chỉ cần một retransmission timer đang hoạt động cho dữ liệu chưa xác nhận; khi ACK tiến lên, timer được hủy/cập nhật cho phần dữ liệu còn lại. Đây là timer phục hồi cuối cùng khi không có đủ ACK để fast retransmit. Nó được thiết kế để không kích hoạt trong tình huống bình thường.

## Timestamp và hành vi RTT khi có reorder

Timestamps có thể mang giá trị clock tăng đơn điệu, được echo trong ACK. RTTM dùng hiệu giữa clock hiện tại và timestamp echo để lấy RTT sample; PAWS dùng thông tin timestamp để nhận ra segment cũ sau khi sequence number wrap. Cơ chế không cần đồng bộ đồng hồ giữa hai host.

Khi segment tới sai thứ tự, receiver thường ACK ngay để báo lỗ hổng. Timestamp echo thường gắn với segment gần nhất đã làm tiến ACK liên tục, không phải segment mới nhất bất kỳ vừa tới. Vì vậy RTT sample trong thời kỳ reorder/loss có thể lớn hơn và làm TCP bớt hung hăng retransmit; đây là trade-off giúp giảm retransmission giả.

## Khi RTO quá sớm

Độ trễ tăng đột ngột, ACK bị mất/trễ hoặc packet reorder có thể tạo spurious timeout dù dữ liệu gốc vẫn đang trên đường. Lần retransmission đó tốn thêm băng thông; phản ứng congestion-control sau RTO cũng có thể giảm congestion window dù thực tế không có loss. [DSACK](https://www.rfc-editor.org/rfc/rfc3708.html) báo duplicate data đã tới receiver; [Eifel](https://www.rfc-editor.org/rfc/rfc3522.html) dùng timestamps để nhận ra ACK thuộc bản gốc; [F-RTO](https://www.rfc-editor.org/rfc/rfc5682.html) thử gửi dữ liệu mới sau timeout để xem đường truyền còn tiến triển không. Mức hỗ trợ tùy stack; các cơ chế này không đảm bảo mọi retransmission giả đều được hoàn tác.

## Fast recovery khác RTO

Duplicate ACK/SACK có thể chỉ loss khi vẫn có packet đi qua, giúp fast retransmit. RTO xảy ra khi thiếu tín hiệu ACK đủ lâu và thường làm giảm tốc độ mạnh hơn. Reordering hoặc delayed ACK có thể ảnh hưởng trigger.

## Tóm tắt

- RTO dựa trên smoothed RTT và variation, kèm bound.
- Retransmitted segment làm sample RTT mơ hồ.
- Karn tránh sample sai; timeout lặp backoff để giảm tải.
- Fast retransmit dựa feedback ACK; RTO là timer fallback.
- RTT/latency thay đổi theo queue, route và endpoint.

## Tự kiểm tra

**RTO bằng đúng RTT trung bình?** Không; cần margin cho biến thiên.

**Timeout luôn chứng minh packet mất?** Không; packet/ACK có thể chỉ chậm.

**Timeout lặp có nên retry nhanh hơn?** TCP thường backoff để tránh congestion thêm.

## Đọc tiếp

SACK và duplicate SACK giúp xử lý reordering, loss và retransmission thừa.
