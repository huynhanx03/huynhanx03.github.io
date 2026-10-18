---
title: "TCP congestion control: slow start, loss và công bằng"
category: "Network"
tags: ["network", "tcp", "congestion control", "cubic"]
description: "Theo congestion window, slow start và recovery để hiểu TCP chia sẻ băng thông giữa các luồng."
updated: 2026-10-16
translationKey: "network/tcp-congestion-control"
---

Nếu mọi sender truyền hết tốc độ có thể, router queue sẽ đầy, latency tăng và packet bị drop. TCP congestion control điều chỉnh lượng dữ liệu đang bay theo dấu hiệu đường mạng để chia sẻ tài nguyên và giảm congestion collapse.

## Congestion window

`cwnd` giới hạn bytes sender cho phép in-flight vì tình trạng mạng; `rwnd` là receive window của peer. Send window hiệu dụng bị giới hạn bởi hai yếu tố cùng các giới hạn khác. `cwnd` không được quảng bá trực tiếp như rwnd.

Có thể hình dung lượng dữ liệu sender được phép giữ trên đường truyền là `min(cwnd, rwnd)`. `rwnd` trả lời “receiver còn chỗ nhận không?”, còn `cwnd` trả lời “mạng có thể chịu thêm bao nhiêu dữ liệu?”. Trong kết nối hai chiều, mỗi hướng có cửa sổ và trạng thái riêng.

ACK tạo nhịp cho sender: khi dữ liệu đã được xác nhận rời khỏi flight, sender có thể đưa dữ liệu mới vào, miễn còn nằm trong cả hai giới hạn. Đây là ACK clock. Trên một đường ổn định, lượng dữ liệu đang bay gần với bandwidth-delay product (BDP) giúp lấp đầy đường truyền; thấp hơn nhiều thì link có thể nhàn, cao hơn nhiều có thể đẩy dữ liệu vào queue và tăng độ trễ. Vì vậy throughput một mình không cho biết đường truyền đang hoạt động tốt hay đang bị queue quá dài.

## Slow start và congestion avoidance

Kết nối mới bắt đầu với cửa sổ congestion ban đầu, rồi tăng nhanh trong slow start khi ACK về. Khi đạt threshold hoặc có tín hiệu congestion, thuật toán chuyển sang tăng thận trọng hơn. Chi tiết hiện đại tùy congestion controller (Reno, CUBIC, BBR và biến thể theo hệ điều hành).

Slow start không có nghĩa là sender bắt đầu gửi chậm: nó tăng `cwnd` nhanh theo các ACK nhận được, xấp xỉ gấp đôi mỗi RTT khi ACK xác nhận từng segment. Đây là cách dò khả năng đường truyền lúc đầu, không phải cam kết rằng mạng đang “không nghẽn”. Khi `cwnd` tới `ssthresh`, sender thường chuyển sang congestion avoidance. Với AIMD cổ điển, congestion avoidance tăng dần khoảng một MSS mỗi RTT; khi loss được xem là congestion, cửa sổ giảm theo quy tắc của controller. `ssthresh` là ranh giới giữa hai pha, không phải trần tốc độ cố định.

Loss không phải bằng chứng chắc chắn rằng router quá tải: lỗi đường truyền hoặc reordering cũng có thể tạo dấu hiệu giống loss. Ngược lại, queue có thể làm RTT tăng trước khi packet bị drop. Các controller khác nhau vì thế chọn tín hiệu và phản ứng khác nhau; đừng suy ra thuật toán chỉ từ tên hệ điều hành.

Loss thường được xem là tín hiệu congestion trong nhiều controller cổ điển. Fast retransmit/recovery giảm cửa sổ; RTO thường phản ánh tình trạng nghiêm trọng hơn. ECN có thể báo congestion mà không đợi drop nếu cả hai đầu và mạng hỗ trợ.

## Bufferbloat

Buffer queue quá lớn có thể giữ packet thay vì drop, làm throughput cao nhưng latency tăng mạnh. Active Queue Management/ECN cố kiểm soát queue trước khi buffer đầy. QoS/shaping có thể giúp chia sẻ theo policy, nhưng không tạo thêm băng thông vật lý.

### AQM và ECN

Drop-tail chỉ loại packet khi queue đầy. Active Queue Management (AQM) chủ động quản lý queue; RED là ví dụ lịch sử dùng độ dài queue trung bình và xác suất để drop hoặc đánh dấu packet khi queue tăng. AQM và congestion control làm hai việc khác nhau: router quản lý queue và có thể phát tín hiệu, endpoint quyết định điều chỉnh tốc độ.

Với ECN, sender và receiver thương lượng khả năng ECN; router hỗ trợ có thể đánh dấu congestion thay vì drop. Receiver phản hồi dấu hiệu ấy trong ACK, sender giảm tốc độ và gửi tín hiệu xác nhận đã phản ứng. Nếu một đầu hoặc mạng giữa đường không hỗ trợ đúng cách, ECN không cung cấp lợi ích đó. RED và cách cấu hình cụ thể được mô tả trong sách là bối cảnh thời điểm xuất bản, không phải khuyến nghị cấu hình hiện nay.

## Fairness và nhiều luồng

Nhiều TCP flow có thể cạnh tranh cùng bottleneck. Fairness phụ thuộc RTT, controller, queue, ứng dụng và đường đi. Một app mở hàng chục connection có thể chiếm nhiều hơn app mở một flow; fairness “mỗi flow” không luôn công bằng “mỗi người dùng”.

TCP friendliness là mục tiêu để một giao thức hoặc controller mới không chiếm phần băng thông quá mức khi cùng chia sẻ bottleneck với TCP thông thường. Một ví dụ là TFRC: thay vì tăng/giảm cửa sổ theo từng ACK như TCP, nó tính giới hạn tốc độ từ RTT, kích thước packet và tỷ lệ loss, tạo luồng gửi mượt hơn cho ứng dụng thời gian thực. Công thức chỉ có ý nghĩa nếu đo RTT và loss event đúng; một con số “fairness” không bảo đảm công bằng với mọi controller, RTT hay queue.

Một số hệ thống còn chia sẻ ước lượng RTT, reordering hoặc congestion giữa các kết nối tới cùng đích để kết nối mới có điểm khởi đầu tốt hơn. Đây là tối ưu của implementation, có thể phụ thuộc route/path và cache trạng thái; không nên coi số liệu của kết nối cũ luôn đúng cho đường đi mới.

## Tuning và chẩn đoán

Đo throughput cùng RTT/queueing latency, loss, retransmission và cwnd nếu có công cụ. Tăng socket buffer không tự giải quyết bottleneck; với RTT ổn định, cửa sổ hữu dụng `W` đặt giới hạn xấp xỉ `W / RTT` cho throughput; để tận dụng băng thông `B` cần cửa sổ đủ phủ `B × RTT`. Băng thông bottleneck, receiver, CPU và policy vẫn đặt các giới hạn khác. Chọn congestion controller ở mức máy cần theo workload và quản trị, không theo mẹo chung.

### Đọc dấu hiệu trên một trace

- `cwnd` tăng nhanh lúc đầu thường là slow start; sau đó tăng chậm hơn thường là congestion avoidance.
- Nhiều duplicate ACK/SACK có thể khiến sender retransmit trước khi RTO hết hạn. SACK cho biết các block đã tới receiver, giúp sender chọn hole cần gửi lại; sender vẫn phải tính lượng dữ liệu còn thực sự in-flight để không bơm quá nhiều vào mạng.
- Partial ACK trong NewReno cho biết một phần dữ liệu đã được sửa nhưng recovery chưa xong. Với SACK, sender có thể nhận diện nhiều khoảng dữ liệu đã đến và xử lý nhiều mất mát trong một cửa sổ hiệu quả hơn.
- RTO thường làm sender phản ứng mạnh hơn fast recovery vì sender thiếu ACK tiến triển. Tuy nhiên timeout có thể spurious do RTT biến động; timestamp/DSACK và thuật toán undo như Eifel hoặc F-RTO có thể nhận diện một số trường hợp và khôi phục trạng thái congestion. Đây là tối ưu có điều kiện, không phải mọi timeout đều có thể hoàn tác.
- Khi receiver reneging SACK (bỏ dữ liệu ngoài thứ tự đã báo trước đó), sender cần thận trọng với thông tin SACK cũ; vì vậy SACK recovery vẫn phải phối hợp với ACK tích lũy và timeout.

Một trace minh họa hữu ích cần đặt trên cùng trục thời gian: `cwnd`/`ssthresh`, bytes in-flight, RTT, ACK/SACK, retransmission, ECN/CWR và tốc độ ứng dụng. Nó giúp phân biệt sender bị ứng dụng ngừng cấp dữ liệu, queue tăng, loss được sửa nhanh, và RTO thật.

### Những họ thuật toán trong sách

Các thuật toán high-speed như HSTCP, BIC và CUBIC điều chỉnh cách tăng cửa sổ để lấp đầy đường truyền có BDP lớn nhanh hơn AIMD cổ điển. Chúng vẫn cần đánh giá mức công bằng khi cạnh tranh với flow khác. CUBIC dùng thời gian kể từ congestion event để định hình tăng trưởng cửa sổ; chi tiết triển khai và controller mặc định thay đổi theo hệ thống và phiên bản.

Delay-based controller như Vegas ước lượng queue từ chênh lệch giữa RTT tối thiểu và RTT đang thấy, rồi cố giữ một lượng queue mục tiêu. Điều này có thể giảm queueing và loss, nhưng ACK bị trễ trên đường về cũng làm RTT tăng; hơn nữa, flow loss-based có thể lấp queue và lấn át flow delay-based. FAST, Westwood và Compound TCP là các hướng nghiên cứu/thiết kế khác được sách mô tả; chúng kết hợp đo delay, ước lượng băng thông hoặc thành phần loss-based theo những cách riêng. Tên gọi và mô tả ở đây giúp hiểu họ ý tưởng, không xác nhận mức hỗ trợ hiện hành.

### Cửa sổ không phải lúc nào cũng phản ánh khả năng hiện thời

Sau khi ứng dụng idle lâu, `cwnd` cũ có thể lớn hơn lượng dữ liệu mạng hiện tại chịu được; congestion window validation (CWV) là nhóm quy tắc nhằm tránh bắn một burst lớn chỉ vì cửa sổ trước đây từng đạt cao. Congestion window moderation giới hạn lượng dữ liệu được giải phóng bởi một ACK khi phục hồi trạng thái sau timeout. Khi loss signal được xác định là giả, undo algorithm có thể khôi phục `cwnd`/`ssthresh`, nhưng cần bằng chứng như timestamp hoặc DSACK.

## Tóm tắt

- Congestion control giới hạn in-flight data theo tình trạng mạng.
- `cwnd` khác receive window `rwnd`.
- Slow start tăng nhanh ban đầu; congestion avoidance điều chỉnh thận trọng hơn.
- Loss, ECN, queueing delay là tín hiệu tùy controller.
- SACK/NewReno giúp recovery, nhưng sender vẫn phải kiểm soát lượng dữ liệu còn in-flight.
- AQM quản lý queue; ECN có thể báo congestion bằng dấu thay vì drop nếu cả đường hỗ trợ.
- Fairness phụ thuộc controller, RTT, queue và số lượng flow của từng ứng dụng.
- Bufferbloat làm latency tăng; throughput đơn lẻ không mô tả chất lượng.

## Tự kiểm tra

**TCP congestion control chỉ bảo vệ receiver?** Không; đó là flow control. Congestion control bảo vệ mạng.

**Loss luôn do router quá tải?** Không; lỗi link, wireless và thiết bị cũng gây loss. Reordering còn có thể làm sender suy nhầm là loss dù dữ liệu chỉ đến sai thứ tự.

**Tăng socket buffer luôn tăng tốc download?** Không; có thể chỉ tăng memory/queueing latency.

## Đọc tiếp

TCP keepalive và ứng dụng heartbeat giúp phát hiện peer không hoạt động, mỗi cơ chế có thời hạn khác nhau.
