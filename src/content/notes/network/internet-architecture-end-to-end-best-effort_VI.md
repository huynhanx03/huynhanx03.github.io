---
title: "Kiến trúc Internet: datagram, best effort và end-to-end"
category: "Network"
tags: ["network", "internet", "architecture"]
description: "Nắm các quyết định nền tảng của Internet: packet switching, datagram, best effort, message boundary, end-to-end và fate sharing."
updated: 2026-10-16
translationKey: "network/internet-architecture-end-to-end-best-effort"
---

Internet được thiết kế để nối nhiều mạng khác nhau và cho nhiều luồng cùng chia sẻ đường truyền. Các router chuyển datagram theo địa chỉ trong packet thay vì giữ một mạch riêng cho từng cuộc trao đổi. Điều này giúp mạng thích nghi khi đường đi đổi, nhưng chất lượng của một luồng phụ thuộc traffic khác đang chia sẻ bottleneck.

## Packet switching và datagram

Trong circuit switching, tài nguyên/đường truyền được dành cho kết nối trong một khoảng thời gian. Packet switching chia dữ liệu thành packet để multiplex traffic theo nhu cầu; queue và router xử lý packet khi chúng tới. Datagram mang thông tin nguồn/đích trong từng packet, nhờ đó core network không cần duy trì trạng thái kết nối như virtual circuit.

Đổi lại, datagram có thể mất, trùng, đến sai thứ tự hoặc đi đường khác nhau. IP cung cấp best-effort delivery: router cố chuyển packet nhưng không hứa reliable, ordered delivery. TCP hoặc ứng dụng có thể bổ sung những semantics cần thiết ở endpoint.

### Datagram khác mạng connection-oriented như thế nào?

Một mạng **virtual circuit** có thể thiết lập kết nối trước khi gửi dữ liệu. Mỗi packet mang nhãn ngắn để switch tra trạng thái per-connection, và signaling tạo/xóa trạng thái trên đường đi. Trong mạng **datagram**, mỗi packet mang thông tin địa chỉ nguồn/đích đủ để mạng tự chuyển tiếp; router không cần lưu trạng thái riêng cho từng cuộc trao đổi. Cách này giảm phụ thuộc vào việc thiết lập một đường cố định và giúp mạng lõi đơn giản hơn, đổi lại mỗi datagram mang địa chỉ và việc tin cậy/thứ tự thường được xử lý ở endpoint. “Connectionless” ở IP không có nghĩa ứng dụng không thể dùng transport connection như TCP.

## Best effort, phát hiện lỗi và điều khiển tốc độ

**Best effort** không có nghĩa mạng bỏ qua lỗi. Link có thể phát hiện lỗi bit bằng checksum/CRC và loại frame hỏng; một số link còn sửa một phần lỗi. Nhưng IP không hứa retransmit datagram bị mất, loại bản sao trùng hay sắp lại thứ tự. Nếu ứng dụng cần reliable delivery, có thể dùng TCP hoặc tự xây semantics phù hợp; retransmission ở tầng thấp có thể hỗ trợ hiệu năng nhưng không thay thế hoàn toàn xác nhận đầu cuối.

**Error control** xử lý hỏng/mất dữ liệu; **flow control** điều chỉnh tốc độ để bên gửi không đẩy dữ liệu nhanh hơn khả năng bên nhận tiêu thụ. Trong Internet, IP thường không điều tiết tốc độ giữa hai ứng dụng. TCP thực hiện kiểm soát luồng đầu cuối; việc kiểm soát tắc nghẽn trên đường truyền là vấn đề liên quan nhưng khác với flow control phía nhận.

## Message boundary khác byte stream

Datagram thường giữ ranh giới message; một lần gửi ứng dụng tương ứng một đơn vị nhận (trong giới hạn protocol). TCP là byte stream: nhiều lần write có thể được gộp, hoặc một write bị chia thành nhiều lần read. Nếu ứng dụng cần framing, nó phải định nghĩa độ dài, delimiter hoặc cấu trúc record của riêng mình.

## End-to-end và fate sharing

End-to-end argument nói một số chức năng như xác nhận ứng dụng đã nhận đúng dữ liệu chỉ endpoint mới có đủ thông tin để làm hoàn chỉnh. Mạng trung gian vẫn có thể cung cấp kiểm tra lỗi hay retransmission để cải thiện hiệu năng, nhưng không thay thế xác nhận ở ứng dụng khi correctness quan trọng.

Fate sharing đặt state cần cho một phiên giao tiếp ở endpoint: nếu endpoint còn tồn tại, lỗi tạm thời trong mạng không nhất thiết phá hủy toàn bộ state của phiên. Cách chọn nơi đặt state là trade-off giữa độ tin cậy, latency, hiệu năng và khả năng quản trị.

Nguyên tắc này không cấm router hoặc link cung cấp sửa lỗi, retransmission hay bảo mật. Những chức năng cục bộ có thể giảm lỗi và độ trễ; nhưng chỉ ứng dụng biết đầy đủ ý nghĩa thao tác để xác nhận điều nó thực sự cần, chẳng hạn một giao dịch đã được xử lý hay chưa.

## Tự kiểm tra

**Best effort nghĩa router không làm gì để chuyển packet?** Không; nó cố chuyển nhưng không cam kết giao thành công.

**TCP giữ ranh giới từng lần `write`?** Không.

**End-to-end có nghĩa tầng dưới không được làm reliability?** Không; tầng dưới có thể hỗ trợ performance, nhưng ứng dụng cần xác nhận semantics của chính nó.

## Đọc tiếp

Các tầng giao thức chia trách nhiệm giữa link, IP, transport và ứng dụng; encapsulation cho phép mỗi tầng xử lý phần việc của mình.
