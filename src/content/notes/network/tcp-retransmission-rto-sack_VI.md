---
title: "TCP retransmission, RTO và SACK"
category: "Network"
tags: ["network", "tcp", "retransmission", "sack"]
description: "Giải thích RTT estimator, timeout, fast retransmit, duplicate ACK và selective acknowledgment."
sources:
  - title: "Computing TCP's Retransmission Timer"
    url: "https://www.rfc-editor.org/rfc/rfc6298.html"
  - title: "TCP Selective Acknowledgment Options"
    url: "https://www.rfc-editor.org/rfc/rfc2018.html"
  - title: "An Extension to the Selective Acknowledgment (SACK) Option for TCP"
    url: "https://www.rfc-editor.org/rfc/rfc2883.html"
  - title: "The Eifel Detection Algorithm for TCP"
    url: "https://www.rfc-editor.org/rfc/rfc3522.html"
  - title: "Forward RTO-Recovery (F-RTO)"
    url: "https://www.rfc-editor.org/rfc/rfc5682.html"
  - title: "TCP NewReno Modification to TCP's Fast Recovery Algorithm"
    url: "https://www.rfc-editor.org/rfc/rfc6582.html"
  - title: "Improving TCP's Robustness to Blind In-Window Attacks (RFC 5961)"
    url: "https://www.rfc-editor.org/rfc/rfc5961.html"
  - title: "Low-Rate TCP-Targeted Denial of Service Attacks (The Shrew Attack)"
    url: "https://doi.org/10.1145/863955.863966"
updated: 2026-10-17
translationKey: "network/tcp-retransmission-rto-sack"
---

Packet có thể mất, bị duplicate hoặc tới sai thứ tự. TCP phải quyết định khi nào retransmit để vừa phục hồi loss vừa tránh gửi lại quá sớm. Quyết định đó dựa trên RTT quan sát và phản hồi ACK.

## RTT và retransmission timeout

Sender đo round-trip time (RTT) cho dữ liệu được ACK. Sau mẫu đầu tiên `R`, thuật toán khuyến nghị trong RFC 6298 đặt `SRTT = R`, `RTTVAR = R/2`, rồi tính `RTO = SRTT + max(G, 4 × RTTVAR)`; `G` là độ phân giải đồng hồ. Ví dụ, `R = 100 ms` cho kết quả công thức `300 ms`, nhưng RFC khuyến nghị làm tròn RTO lên ít nhất `1 s` để tránh retransmit quá sớm. Các stack có thể có thuật toán bổ sung hoặc cách triển khai khác.

Với mẫu tiếp theo `R′`, `RTTVAR` được cập nhật từ độ lệch giữa mẫu mới và `SRTT` cũ, rồi `SRTT` được làm mượt theo mẫu mới. Khi timeout lặp lại, sender tăng gấp đôi RTO (backoff), thường tới một mức trần. Vì vậy RTO phản ánh cả độ trễ lẫn độ dao động của đường truyền, chứ không phải một hằng số toàn cục.

Karn’s algorithm tránh dùng RTT sample mơ hồ từ segment đã retransmit, vì ACK không cho biết bản gửi nào tới. TCP timestamps giúp một số phép đo/phân biệt tốt hơn theo implementation.

## Timeout và fast retransmit

Nếu không có ACK tới khi RTO hết, sender retransmit và thường giảm tốc độ. Nếu receiver nhận bytes sau một khoảng trống, nó có thể gửi duplicate ACK báo sequence tiếp theo còn thiếu. Nhiều duplicate ACK liên tiếp có thể kích hoạt fast retransmit trước timeout.

Duplicate ACK phải được đọc trong ngữ cảnh: ACK có cùng số nhưng đổi receive window là window update, không nhất thiết là tín hiệu loss. Receiver thường ACK ngay khi nhận segment ngoài thứ tự; sender đợi một ngưỡng duplicate ACK trước khi suy ra có lỗ hổng, vì reorder cũng tạo duplicate ACK. Ngưỡng truyền thống là ba nhưng thuật toán/stack có thể điều chỉnh. Fast retransmit thường đi cùng congestion response; quyết định gói nào gửi lại và gửi thêm dữ liệu thuộc thuật toán recovery/congestion control.

Trong NewReno (biến thể TCP recovery không cần SACK), một partial ACK trong lúc recovery cho biết lỗ hổng kế tiếp vẫn còn; sender có thể retransmit segment thiếu tiếp theo mà chưa thoát recovery. Không phải mọi TCP variant đều xử lý partial ACK giống nhau. RTO hết hạn thường nghiêm trọng hơn duplicate ACK vì sender không còn nhận được dấu hiệu tiến triển.

Reordering có thể trông giống loss, dẫn tới retransmit thừa. Duplicate SACK (DSACK) và thuật toán undo có thể giúp phát hiện một số spurious retransmission, nhưng hoạt động tùy stack.

## SACK

ACK cumulative nói tới byte liên tục tiếp theo mà receiver cần. Selective Acknowledgment cho biết các block khác đã nhận, giúp sender chỉ retransmit khoảng thiếu thay vì gửi lại mọi thứ sau cumulative ACK. SACK option được thương lượng khi mở connection.

Receiver thường đặt block mới nhất vừa nhận vào đầu SACK list rồi lặp lại một số block cũ để thông tin còn hữu ích nếu ACK trước bị mất. Sender cần tự duy trì map các byte đã được SACK và thực hiện selective repeat; việc chỉ nhận SACK option không tự đảm bảo recovery hiệu quả. SACK block mang tính advisory: receiver có thể renege dữ liệu out-of-order, vì vậy sender không giải phóng retransmission buffer chỉ dựa vào SACK; cumulative ACK phải tiến qua byte đó. Sau RTO, sender thận trọng và có thể bỏ hiểu biết SACK trước đó cho tới khi receiver báo lại.

DSACK mở rộng SACK để báo một dải byte đã nhận trùng, kể cả khi nó nằm dưới cumulative ACK. Sender có thể dùng DSACK để suy ra duplicate packet, reorder hoặc retransmission không cần thiết; thông tin DSACK chỉ xuất hiện trong một ACK nên có thể mất.

## Spurious retransmission và reordering

Eifel detection dựa trên TCP timestamps: sau khi retransmit, sender so TS echo trong ACK đầu tiên với timestamp bản retransmit; echo cũ hơn cho thấy ACK có thể do bản gốc tạo ra. Forward RTO-Recovery (F-RTO) không cần timestamp; sau RTO, sender gửi thăm dò dữ liệu mới và xem ACK có tiếp tục tiến hay chỉ lặp, để nhận diện một số timeout giả. Eifel response có thể điều chỉnh lại estimator và state congestion tùy điều kiện. Những thuật toán này giải quyết các tình huống khác nhau và chỉ có ích nếu implementation hỗ trợ.

Reordering trên forward path tạo lỗ hổng giả ở receiver; reordering ACK trên reverse path có thể làm sender thấy ACK tiến xa rồi ACK cũ, gây burst. Packet duplicate cũng có thể tạo đủ duplicate ACK để kích hoạt fast retransmit. Vì vậy retransmission trong capture không tự chứng minh packet loss; cần so sánh trace hai đầu, SACK/DSACK, timestamps và thứ tự theo sequence space.

## Repacketization và path memory

TCP đánh số byte nên retransmit không bắt buộc dùng cùng ranh giới segment như lần gửi đầu. Sender có thể gộp các byte còn thiếu thành segment khác kích thước, miễn không vượt giới hạn MSS/PMTU. Một số stack còn giữ metrics đường đi như RTT hoặc PMTU để khởi tạo connection mới, nhưng cơ chế cache và lệnh quan sát phụ thuộc OS/phiên bản; các ví dụ route-cache trong sách là lịch sử Linux cũ.

RTO cũng có thể bị khai thác trong tấn công Shrew: kẻ tấn công gửi các đợt traffic ngắn, lặp lại gần chu kỳ retransmission để gây loss đúng lúc sender thử gửi lại; thông lượng TCP có thể sụt mạnh dù lưu lượng tấn công trung bình thấp. Đây là dạng tấn công DoS vào cơ chế timeout, khác với blind in-window injection, trong đó packet giả mạo có sequence number hợp lệ có thể tác động lên connection. [RFC 5961](https://www.rfc-editor.org/rfc/rfc5961.html) mô tả một số biện pháp giảm kiểu injection mù; không cơ chế nào biến TCP thành giao thức chống DoS toàn diện.

SACK không biến TCP thành message protocol; nó cải thiện recovery dữ liệu trong byte stream. Receiver/sender vẫn cần buffer và state.

## Packet capture và diễn giải

Một capture có duplicate ACK hoặc retransmission chưa đủ xác định packet mất ở đâu. Capture ở sender, receiver, switch mirror và NIC offload có góc nhìn khác nhau. Trình tự timestamp, sequence space, ACK và retransmit cần ghép cùng interface/counter.

## Tóm tắt

- RTO dựa trên RTT và biến thiên, có backoff khi timeout.
- Duplicate ACK có thể báo lỗ hổng byte; fast retransmit giảm thời gian chờ RTO.
- SACK chỉ rõ block đã nhận để sender phục hồi hiệu quả hơn.
- Reordering có thể bị nhầm là loss và tạo retransmission thừa.
- Capture cần xác định điểm quan sát và ảnh hưởng offload.

## Tự kiểm tra

**Mọi packet retransmission chứng minh loss mạng?** Có thể do loss, delay/reordering hoặc timer/observation artifact.

**Cumulative ACK cho biết tất cả packet sau điểm ACK chưa tới?** Không; có thể receiver đã nhận block sau và SACK báo chúng.

**SACK tắt được congestion control?** Không; recovery và congestion control là chức năng liên quan nhưng khác nhau.

## Đọc tiếp

TCP window điều khiển lượng dữ liệu đang bay và tốc độ receiver có thể tiêu thụ.
