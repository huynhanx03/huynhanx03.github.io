---
title: "TCP window, flow control và Nagle"
category: "Network"
tags: ["network", "tcp", "flow control", "window"]
description: "Hiểu sliding window, receive window, zero-window, delayed ACK và tương tác với Nagle."
sources:
  - title: "Congestion Control in IP/TCP Internetworks"
    url: "https://www.rfc-editor.org/rfc/rfc896.html"
  - title: "Requirements for Internet Hosts — Communication Layers"
    url: "https://www.rfc-editor.org/rfc/rfc1122.html"
  - title: "Transmission Control Protocol (TCP)"
    url: "https://www.rfc-editor.org/rfc/rfc9293.html"
updated: 2026-10-17
translationKey: "network/tcp-flow-control-windows"
---

TCP không gửi từng byte rồi dừng chờ ACK từng byte. Sliding window cho phép nhiều bytes đang “in flight” cùng lúc. Receiver quảng bá receive window để báo còn bao nhiêu buffer; sender không nên vượt khả năng tiếp nhận đó.

## Flow control khác congestion control

**Flow control** bảo vệ receiver khỏi bị tràn buffer. **Congestion control** bảo vệ mạng khỏi quá tải. Lượng dữ liệu sender có thể gửi thường bị giới hạn bởi minimum của receive window và congestion window.

Receive window quá nhỏ giới hạn throughput trên đường có bandwidth-delay product lớn. Window scale option cho phép biểu diễn cửa sổ lớn hơn 65,535 bytes; nó được thương lượng khi handshake.

Mỗi chiều TCP có send window và receive window riêng. Receive window là số byte còn có thể nhận, tính từ ACK number kế tiếp; nó giới hạn điểm cuối của byte sequence mà sender có thể đưa vào mạng vì bảo vệ buffer peer. Send window theo dõi byte đã ACK, đang in-flight và còn được phép gửi. Lượng gửi mới còn có thể bị chặn bởi congestion window, nên flow control của receiver và congestion control của mạng là hai giới hạn độc lập.

ACK number tiến làm mép trái của offered window đi tới; receiver đọc dữ liệu khỏi buffer thì có thể đẩy mép phải ra xa bằng window update. Gọi `SND.UNA` là byte đầu chưa ACK, `SND.WND` là offered window, `SND.NXT` là byte kế tiếp sender sẽ gửi; lượng cửa sổ dùng được gần bằng `SND.UNA + SND.WND - SND.NXT`. TCP ưu tiên tránh làm mép phải co lùi (window shrink), kể cả khi điều đó có nghĩa phải quảng bá cửa sổ nhỏ.

## Zero window và persist

Receiver có thể quảng bá window bằng 0 khi buffer đầy. Sender tạm dừng dữ liệu nhưng dùng persist timer/probe để biết khi window mở lại, tránh deadlock nếu cập nhật window bị mất. Ứng dụng đọc chậm socket có thể gây zero-window dù mạng vẫn khỏe.

Window update thường là pure ACK nên bản thân nó không được retransmit như byte dữ liệu. Nếu update mở cửa sổ bị mất, sender và receiver có thể cùng chờ. Persist timer làm sender thăm dò định kỳ bằng segment nhỏ buộc peer gửi ACK kèm window hiện tại; khoảng thăm dò thường backoff. Persist khác retransmission timer: mục đích của nó là phá deadlock cửa sổ đóng, và nó có thể tiếp tục lâu khi peer vẫn quảng bá zero window. Điều này giữ state/tài nguyên nên application cũng cần deadline và chính sách timeout riêng.

## Delayed ACK và Nagle

Receiver có thể trì hoãn ACK ngắn để gộp phản hồi; sender dùng Nagle để gom các byte nhỏ khi còn dữ liệu chưa ACK. Kết hợp Nagle với delayed ACK trong ứng dụng request-response nhỏ có thể tạo độ trễ đáng kể nếu các bên chờ nhau.

Tắt Nagle có thể giúp latency của workload nhỏ nhưng tăng số segment. Tối ưu phải đo và xét framing/buffering ứng dụng. TCP_NODELAY không phải nút “tăng tốc Internet”.

Delayed ACK giảm ACK traffic và có thể piggyback cùng dữ liệu gửi ngược chiều, nhưng cũng có thể thêm độ trễ.

Ví dụ, client write phần đầu nhỏ của request rồi write phần còn lại vào socket trước khi phần đầu được ACK. Nagle giữ phần sau trong buffer gửi. Server chưa có request hoàn chỉnh để trả response, trong khi TCP server trì hoãn ACK ngắn để gom phản hồi. Nếu không có ACK hoặc dữ liệu khác phá thế chờ, delayed-ACK timer hết hạn mới giải phóng ACK, rồi client mới phát phần còn lại. Chỉ một số kiểu batching và request/response mới tạo tình huống này; không phải message nhỏ nào cũng bị trễ. Với workload tương tác nhạy độ trễ, cân nhắc `TCP_NODELAY` hoặc thay đổi cách ứng dụng gom dữ liệu sau khi đo; đây không phải thiết lập nên bật đại trà.

## Silly window syndrome và buffer autotuning

Nếu receiver quảng bá các cửa sổ rất nhỏ liên tục, sender có thể gửi nhiều segment nhỏ; thuật toán tránh silly window syndrome cố gắng gom dữ liệu/đợi đủ lượng. TCP stack hiện đại có autotuning buffer, nhưng cấu hình giới hạn có thể ảnh hưởng throughput.

Silly window syndrome (SWS) xảy ra khi sender liên tục gửi payload rất nhỏ hoặc receiver liên tục quảng bá cửa sổ nhỏ. Receiver-side avoidance thường đợi buffer rảnh đủ lớn trước khi quảng bá thêm cửa sổ; sender-side avoidance gom byte nhỏ cho tới khi có thể gửi gần một MSS, đủ một phần đáng kể của cửa sổ lớn nhất đã thấy, hoặc cần gửi hết phần dữ liệu còn lại theo điều kiện Nagle. Thuật toán phải tránh co mép phải lùi của window, vì điều đó làm protocol khó tiến triển.

Receive buffer nhỏ giới hạn receive window, từ đó giới hạn dữ liệu in-flight và throughput dù link còn dung lượng. Cần cửa sổ đủ lớn để phủ bandwidth-delay product (băng thông × RTT), nhưng buffer quá lớn tiêu tốn memory và có thể làm queueing delay tăng. Nhiều TCP stack tự điều chỉnh send/receive buffer dựa trên tốc độ đọc, RTT và giới hạn quản trị. Tên sysctl, giá trị mặc định và thuật toán autotuning trong TCP/IP Illustrated là Linux 2.4/2.6 và Windows XP/Vista/7 đời cũ, không dùng như hướng dẫn cấu hình hiện hành.

## Tóm tắt

- Sliding window cho phép nhiều byte in-flight.
- Receive window là flow control; congestion window là congestion control.
- Zero-window thường liên quan buffer receiver, có persist probe.
- Delayed ACK/Nagle có thể tương tác gây chờ với message nhỏ.
- Tắt Nagle hay tăng buffer cần benchmark theo workload.

## Tự kiểm tra

**Receive window lớn nghĩa mạng không congest?** Không; đó là phía receiver, còn congestion window khác.

**Zero-window nghĩa server offline?** Không; receiver có thể đang bận hoặc buffer đầy.

**Tắt Nagle luôn làm app nhanh hơn?** Không; có thể tăng overhead và packet nhỏ.

## Đọc tiếp

Congestion control điều chỉnh gửi theo tình trạng đường mạng, không chỉ buffer peer.
