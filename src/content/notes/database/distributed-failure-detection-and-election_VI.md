---
title: "Failure detector và leader election: bức tranh tổng thể"
category: "Database"
description: "Nối failure detection với leader election và hiểu vì sao chúng chưa tự tạo ra một cụm an toàn."
updated: 2026-10-17
translationKey: "database/distributed-failure-detection-and-election"
---

Một node không thể nhìn trực tiếp process ở máy khác. Nó chỉ thấy message đến, message trễ hoặc không đến. Vì vậy, hệ phân tán thường tách hai việc: **failure detector** đưa ra nghi ngờ về node; **leader election** chọn process giữ vai trò điều phối. Cả hai phụ thuộc vào membership view và giả định về mạng.

Nghi ngờ một leader không chứng minh leader đã chết. Nếu hai nhóm node có góc nhìn khác nhau, mỗi nhóm có thể bầu một leader. Muốn biến kết quả bầu thành quyền ghi an toàn, hệ thống còn cần cơ chế đồng thuận, epoch và fencing để storage từ chối leader cũ. Các thuật toán nhập môn trong hai note dưới giúp hiểu đường đi của quyết định và những giả định mà consensus production phải giải quyết.

## Hai câu hỏi khác nhau

Failure detection hỏi: “Node này có còn phản hồi theo mô hình ta chấp nhận không?” Leader election hỏi: “Process nào sẽ điều phối nhóm hiện tại?” Distributed lock lại hỏi process nào được vào một vùng tới hạn và bảo đảm quyền đó cuối cùng được nhả. Các câu hỏi liên quan nhưng không thể thay thế nhau.

Đọc [Failure detection: heartbeat, SWIM, phi và gossip](./distributed-failure-detection_VI.md) trước để theo dõi cách một node thành “suspect”. Sau đó đọc [Leader election: Bully, Invitation và Ring](./distributed-leader-election_VI.md) để xem membership cùng suspicion được dùng trong một vòng bầu như thế nào.

## Điều cần giữ lại

- Timeout là ngưỡng quyết định vận hành; nó không phải bằng chứng node đã chết.
- Bầu được một process có ID cao nhất theo góc nhìn cục bộ chưa bảo đảm các node khác cũng đồng ý.
- Một leader mới chỉ an toàn khi quyền của leader cũ bị chặn ở nơi nhận ghi, thường bằng epoch/token được kiểm tra.
- Consensus protocols như Raft và Paxos ghép bầu chọn với quy tắc quorum và log safety. Chúng giải quyết thêm việc các replica chấp nhận cùng thứ tự lệnh.

*Database Internals*, chương 9–10, đặt failure detector và leader election cạnh nhau để chỉ ra mối phụ thuộc này. Chương 14 và các note về [consensus](./distributed-consensus-algorithms_VI.md) đi tiếp vào quorum, term và replicated log.

## Tự kiểm tra

Một node bị timeout và một nhóm khác vẫn nhận heartbeat từ nó. Điều gì đã được chứng minh? Chỉ có việc các node quan sát đường mạng khác nhau; trạng thái thật của process chưa được xác định chắc chắn. Trước khi cấp quyền ghi cho leader mới, cần bảo đảm gì? Storage phải phân biệt epoch mới với quyền cũ để leader bị cô lập không thể tiếp tục ghi.
