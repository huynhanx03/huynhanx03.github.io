---
title: "TCP sequence space, MSS và các option kết nối"
category: "Network"
tags: ["network", "tcp", "sequence number", "mss"]
description: "Đọc sequence/ACK theo byte, hiểu ISN modulo, MSS, window scale, timestamps và SACK negotiation."
updated: 2026-10-16
translationKey: "network/tcp-sequence-numbers-and-options"
---

TCP đánh số **byte**, không đánh số packet. Nếu segment bắt đầu tại sequence 1000 và mang 500 byte, byte tiếp theo có sequence 1500; ACK 1500 nghĩa receiver đang chờ byte 1500. Bit SYN và FIN mỗi bit còn tiêu thụ một vị trí trong sequence space, ngoài số byte dữ liệu nếu segment có mang data.

ACK thường là cumulative: khi receiver đã có liên tục mọi byte trước N, nó gửi ACK N để nói byte kế tiếp cần là N. Nếu nhận byte sau một khoảng trống, receiver không thể dùng ACK thường để xác nhận phần rời rạc ấy; SACK blocks có thể bổ sung thông tin đó. Mỗi chiều của kết nối có sequence space riêng, nên một segment có thể đồng thời mang dữ liệu theo một chiều, ACK/window cho chiều ngược lại.

## ISN và wraparound

Mỗi bên chọn Initial Sequence Number (ISN) để bắt đầu stream. Sequence number 32-bit wrap modulo `2^32`; TCP dùng receive window, timing và ISN generation để phân biệt dữ liệu trong kết nối mới với segment cũ. ISN không phải số packet đơn giản tăng đều giữa mọi kết nối.

SYN mang ISN và tự tiêu thụ một sequence number; do đó byte dữ liệu đầu tiên theo chiều ấy bắt đầu tại ISN+1. FIN cũng tiêu thụ một vị trí. Pure ACK không tiêu thụ sequence number, vì thế ACK của chính nó không được retransmit như một byte stream item. ISN generation còn liên quan đến an toàn connection establishment, không nên xem nó như giá trị cố định 0 hoặc 1.

## Trường header và flags

TCP segment được đóng gói trong IP; IPv4 protocol number hoặc IPv6 Next Header là 6. Header tối thiểu 20 byte, tối đa 60 byte vì Data Offset đếm độ dài header theo từ 32-bit. Source/destination ports cùng cặp địa chỉ IP hai đầu tạo 4-tuple nhận diện connection.

ACK flag cho biết Acknowledgment Number có hiệu lực; SYN đồng bộ sequence space khi mở kết nối; FIN báo một phía hết dữ liệu gửi; RST hủy/đặt lại kết nối; PSH là gợi ý chuyển dữ liệu lên nhanh và không nên dựa vào như ranh giới message. URG/urgent pointer thuộc cơ chế hiếm dùng. ECE/CWR liên quan ECN congestion signaling. Header có reserved bits và các option có định dạng riêng; đừng diễn giải flags tách rời state machine và phiên bản tiêu chuẩn.

Window Size quảng bá số byte receiver sẵn sàng nhận bắt đầu từ ACK number, với window scaling nếu đã thương lượng. TCP checksum bắt buộc kiểm tra header và data cùng pseudo-header IP; nó phát hiện lỗi truyền nhưng không phải mã xác thực mật mã hay bảo đảm toàn vẹn chống attacker. Ứng dụng nhạy cảm vẫn cần TLS hoặc cơ chế integrity phù hợp.

## MSS và PMTU

MSS là số TCP payload tối đa mà peer báo có thể nhận trong segment; thường được suy từ IP MTU trừ IP/TCP header cơ bản. TCP options làm header dài hơn; đường đi có thể MTU thấp hơn local link. MSS negotiation không nhất thiết phản ánh mọi tunnel/PMTU change sau handshake.

## Window scale và SACK

TCP header receive window cơ bản rộng 16 bit. Window Scale option thương lượng scale factor lúc handshake để biểu diễn cửa sổ lớn hơn; option này chỉ có hiệu lực nếu hai bên thương lượng. SACK-permitted báo hai đầu có thể dùng SACK blocks để mô tả dữ liệu đã nhận không liên tục.

Timestamps hỗ trợ RTT measurement và PAWS chống wrapped sequence confusion trên kết nối nhanh/lâu. TCP-AO có thể xác thực một số môi trường routing; nó khác TLS payload encryption.

## Packet capture

Wireshark hiển thị `Seq=1` tương đối có thể dùng relative numbering thay vì sequence tuyệt đối. Tắt relative view nếu cần so byte chính xác. NIC offload có thể làm capture thấy segment lớn hơn MSS trên wire.

## Tóm tắt

- Sequence number đếm byte; SYN/FIN tiêu thụ sequence space.
- ACK là byte kế tiếp cần nhận theo cumulative semantics.
- MSS, MTU và TCP option header ảnh hưởng payload mỗi segment.
- Window Scale/SACK/Timestamps cần được thương lượng trong handshake.
- Capture có thể dùng relative sequence và chịu ảnh hưởng offload.

## Tự kiểm tra

**Sequence number đếm segment?** Không, đếm byte theo stream.

**MSS bằng MTU?** Không; MSS là payload TCP, MTU là kích thước tầng IP/link theo ngữ cảnh.

**SACK thay cumulative ACK?** Không; nó bổ sung mô tả block ngoài ACK liên tục.

## Đọc tiếp

Option thiết lập trong handshake; các trạng thái half-close, simultaneous open và RST mở rộng lifecycle connection.
