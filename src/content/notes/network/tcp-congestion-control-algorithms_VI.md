---
title: "Tahoe, Reno, NewReno và CUBIC trong TCP congestion control"
category: "Network"
tags: ["network", "tcp", "congestion control", "reno"]
description: "So sánh slow start, congestion avoidance, fast recovery và các thế hệ controller phổ biến."
sources:
  - title: "TCP Congestion Control"
    url: "https://www.rfc-editor.org/rfc/rfc5681.html"
  - title: "TCP NewReno Modification to TCP's Fast Recovery Algorithm"
    url: "https://www.rfc-editor.org/rfc/rfc6582.html"
  - title: "CUBIC for Fast and Long-Distance Networks"
    url: "https://www.rfc-editor.org/rfc/rfc9438.html"
  - title: "The Addition of Explicit Congestion Notification (ECN) to IP"
    url: "https://www.rfc-editor.org/rfc/rfc3168.html"
  - title: "IETF Recommendations Regarding Active Queue Management"
    url: "https://www.rfc-editor.org/rfc/rfc7567.html"
updated: 2026-10-17
translationKey: "network/tcp-congestion-control-algorithms"
---

Congestion controller quan sát ACK/loss/ECN và điều chỉnh congestion window. Thuật toán cổ điển dùng additive increase/multiplicative decrease để tăng dần khi ổn định và giảm khi có dấu hiệu quá tải.

## Tahoe và Reno

TCP Tahoe dùng slow start ban đầu; khi detect loss, giảm `ssthresh`, đặt congestion window nhỏ và quay về slow start. Reno thêm fast recovery sau fast retransmit để không rơi về cửa sổ nhỏ nhất khi chỉ một segment mất và ACK vẫn tiếp tục tới.

Fast retransmit thường dùng ba duplicate ACK liên tiếp làm dấu hiệu có lỗ trong luồng byte, dù các segment phía sau vẫn tới được. Fast recovery tận dụng các ACK đang tiếp tục về để giữ dữ liệu chạy trong mạng thay vì chờ RTO. Ý tưởng này dựa trên diễn biến ACK, nên ACK duplication/reordering có thể làm diễn giải phức tạp; RTO vẫn là phương án dự phòng khi không có đủ tiến triển.

## NewReno và SACK recovery

NewReno cải thiện xử lý nhiều segment mất trong cùng cửa sổ dựa trên partial ACK. SACK giúp sender biết block đã nhận và retransmit hole cụ thể. Recovery algorithms khác nhau về số lần retransmit và cách cập nhật `cwnd`.

NewReno giữ một recovery point: partial ACK xác nhận tiến triển nhưng chưa xác nhận toàn bộ dữ liệu outstanding tại lúc recovery bắt đầu, nên sender tiếp tục xử lý lỗ còn lại. SACK ghi các dải byte đã nhận ngoài thứ tự, giúp sender lựa chọn retransmission có căn cứ hơn; ACK tích lũy vẫn là xác nhận liên tục chính. Receiver được phép bỏ (renege) dữ liệu đã báo trong SACK nếu phải thu hồi buffer, nên sau timeout sender không thể tin mù quáng vào mọi SACK cũ.

FACK dùng biên nhận SACK cao nhất để suy ra lượng dữ liệu đã đi tới receiver và ước lượng hole bị mất. Rate halving giảm cửa sổ từ từ trong quá trình recovery, thay vì làm cửa sổ rơi tức thời; đây là một lựa chọn thuật toán, không đồng nghĩa mọi TCP hiện nay phục hồi giống hệt ví dụ Linux trong sách. Limited Transmit có thể gửi thêm dữ liệu chưa gửi sau duplicate ACK thứ nhất và thứ hai để duy trì ACK clock, nếu receiver window cho phép và tổng `FlightSize` không vượt `cwnd + 2 × SMSS`. Quy tắc này tránh bơm thêm dữ liệu quá mức chỉ vì ACK lặp.

Khi một ACK mới chỉ xác nhận một phần segment đã gửi, không nên mặc định rằng cả segment đã rời mạng. SACK recovery vì thế cần ước lượng lượng dữ liệu còn trong mạng, chẳng hạn biến `pipe` trong [RFC 6675](https://www.rfc-editor.org/rfc/rfc6675.html#section-4), bằng cách xét byte đã SACK, byte suy là mất và retransmission chưa xác nhận. `FlightSize` theo định nghĩa cổ điển là dữ liệu đã gửi nhưng chưa ACK tích lũy, không đồng nhất với ước lượng `pipe`; phần packet mất phải suy ra chứ không quan sát trực tiếp được. Đây là lý do các biến thể recovery khác nhau có thể phát ra lượng retransmission khác nhau.

## CUBIC và mạng tốc độ cao

CUBIC dùng hàm tăng theo thời gian kể từ congestion event để mở rộng cửa sổ hiệu quả trên đường bandwidth-delay product lớn. Linux thường hỗ trợ CUBIC, nhưng controller mặc định/cấu hình có thể đổi. Không suy controller từ chỉ OS name.

HSTCP điều chỉnh mức tăng và giảm theo kích thước cửa sổ để phù hợp hơn với link tốc độ cao/RTT lớn, còn limited slow start được đề xuất để hạn chế tăng quá mạnh khi cửa sổ đã lớn. BIC dò quanh cửa sổ congestion trước đó bằng các bước tăng/giảm có cấu trúc; CUBIC thay cách tăng cửa sổ bằng hàm theo thời gian, dùng đường cong để tiến về điểm congestion cũ. Đây là các cách xử lý bài toán AIMD cổ điển hội tụ chậm khi BDP rất lớn, đồng thời đặt ra yêu cầu đánh giá fairness khi chia sẻ link với controller khác.

### Khôi phục khi tín hiệu congestion bị sai

RTO, duplicate ACK hoặc reordering có thể khiến TCP kết luận loss dù packet chỉ bị trễ. Timestamp có thể giúp nhận ra một retransmission đến sau khi bản gốc đã được nhận; DSACK có thể cho biết dữ liệu trùng đã tới; Eifel/F-RTO là các họ thuật toán dùng bằng chứng như vậy để phát hiện timeout/retransmission spurious. Nếu đủ bằng chứng, sender có thể undo việc giảm `cwnd`/`ssthresh`. Không phải mọi trường hợp đều nhận biết được, và khôi phục cửa sổ ngay lập tức cũng có thể tạo burst; implementation có thể điều tiết số packet được gửi sau một ACK.

## ECN, delay-based và bufferbloat

ECN cho router mark congestion thay vì drop nếu path hỗ trợ. Delay-based controller nhìn queueing delay để phản ứng sớm, nhưng có thể bị loss-based flow cạnh tranh lấn át tùy thiết kế. AQM như RED/CoDel quản lý queue ở router; TCP controller và AQM có vai trò bổ sung.

Delay-based controller dùng RTT tối thiểu làm xấp xỉ độ trễ đường đi khi queue rỗng, rồi so với RTT đang đo để ước lượng queue. Vegas tăng, giữ hoặc giảm cửa sổ theo khoảng mục tiêu; FAST và Compound TCP thêm cách điều khiển tốc độ/cửa sổ riêng, còn Westwood ước lượng băng thông từ ACK và dùng ước lượng đó khi chọn `ssthresh`. Các thuật toán này nhạy với ACK compression, tắc nghẽn chiều ACK, route change và controller cạnh tranh. Sách mô tả chúng như các thiết kế cụ thể vào thời điểm xuất bản; không nên xem tham số/khả năng hỗ trợ trong sách là hiện trạng của OS ngày nay.

AQM có thể drop hoặc mark trước khi queue đầy. ECN là đường báo hiệu: router đánh dấu CE, receiver echo dấu đó qua ACK, sender giảm congestion window rồi báo CWR. Đánh dấu lặp lại không nên khiến sender giảm nhiều lần cho cùng một cửa sổ dữ liệu. Nếu ECN bị xóa hoặc receiver không echo đúng, sender có thể không nhận được tín hiệu; đây cũng là ranh giới bảo mật và tính tin cậy cần tính đến.

### TCP friendliness và hành vi không hợp tác

TFRC là ví dụ điều khiển tốc độ theo công thức từ RTT, kích thước packet, tỷ lệ loss và RTO, phù hợp hơn với luồng cần tốc độ mượt. “TCP-friendly” là mục tiêu tương đối trong điều kiện chia sẻ xác định, không phải bảo đảm công bằng phổ quát; sai số đo loss/RTT hoặc đường đi khác nhau làm kết quả đổi.

Chương này cũng nêu các cách receiver hoặc bên trung gian có thể làm sai lệch điều khiển: ACK division gửi nhiều ACK cho cùng lượng byte; duplicate-ACK spoofing làm sender tưởng có thêm tiến triển trong fast recovery; optimistic ACK xác nhận dữ liệu chưa tới để sender tăng tốc; xóa/không echo ECN che dấu nghẽn. Biện pháp phụ thuộc giao thức và triển khai, chẳng hạn tính tăng trưởng theo byte được xác nhận thay vì số gói ACK, giới hạn burst và kiểm tra ACK bằng thông tin bổ sung. Source Quench của ICMP là cơ chế lịch sử đã bị loại bỏ khỏi khuyến nghị router từ lâu, không dùng như công cụ congestion control hiện nay.

## Tóm tắt

- Tahoe giảm mạnh sau loss; Reno có fast recovery.
- NewReno/SACK xử lý nhiều loss hiệu quả hơn.
- CUBIC hướng tới link có bandwidth-delay product cao.
- ECN/AQM cung cấp tín hiệu congestion khác drop.
- HSTCP/BIC/CUBIC thay cách tăng cửa sổ để xử lý BDP lớn, nhưng fairness tùy đối thủ và đường đi.
- Vegas/FAST/Westwood/Compound là các thiết kế khác nhau; chi tiết trong sách có mốc lịch sử.
- ACK, SACK, timestamp và ECN là thông tin đầu vào có thể trễ, mất hoặc bị thao túng.
- Controller cụ thể phụ thuộc kernel/configuration/path.

## Tự kiểm tra

**Reno luôn phục hồi tốt nhiều loss cùng cửa sổ?** SACK/NewReno thường xử lý tốt hơn theo trường hợp.

**CUBIC tăng cửa sổ không phụ thuộc loss?** Không; nó phản ứng theo congestion event.

**ECN hoạt động nếu chỉ sender bật?** Path, receiver và router cần hỗ trợ/đàm phán phù hợp.

## Đọc tiếp

Đọc TCP capture cùng congestion window, queueing delay và loss để gắn model với số liệu.
