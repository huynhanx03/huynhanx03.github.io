---
title: "Nagle, delayed ACK và độ trễ TCP"
category: "Network"
tags: ["network", "tcp", "latency"]
description: "Giải thích tương tác giữa Nagle algorithm và delayed ACK, cùng cách đo thay vì tắt tối ưu theo cảm tính."
sources:
  - title: "Congestion Control in IP/TCP Internetworks"
    url: "https://www.rfc-editor.org/rfc/rfc896.html"
  - title: "Requirements for Internet Hosts — Communication Layers"
    url: "https://www.rfc-editor.org/rfc/rfc1122.html"
  - title: "Transmission Control Protocol (TCP)"
    url: "https://www.rfc-editor.org/rfc/rfc9293.html"
updated: 2026-10-16
translationKey: "network/tcp-nagle-delayed-ack-latency"
---

TCP gom byte thành segment và ACK có thể được trì hoãn ngắn để giảm packet. Nagle algorithm hạn chế gửi nhiều segment rất nhỏ khi còn dữ liệu chưa được ACK, nhằm giảm overhead. Hai cơ chế thường cải thiện hiệu quả nhưng một số giao thức request/response nhỏ có thể tạo độ trễ đáng kể nếu ứng dụng chờ sai thời điểm.

## Mẫu độ trễ

Ứng dụng write một phần request nhỏ rồi write phần còn lại vào socket. Nagle giữ phần sau vì byte đầu chưa được ACK. Receiver trì hoãn ACK ngắn để gom phản hồi, trong khi ứng dụng server chưa có request hoàn chỉnh để trả response. Nếu không có sự kiện khác phá thế chờ, delayed-ACK timer hết hạn mới tạo ACK, cho phép sender phát phần đang giữ. Đây là tương tác phụ thuộc workload, không phải TCP luôn thêm một khoảng trễ cố định.

## Cách xử lý

Trước tiên xem packet capture hai đầu, thời gian gửi/ACK và API write/read. Có thể thiết kế protocol gửi đủ một message, gom write hợp lý hoặc dùng TCP_NODELAY cho socket latency-sensitive. Tắt Nagle tăng packet nhỏ; không giải quyết application buffering hay network queueing.

`tcpdump` và Wireshark cho thấy segment/ACK; `ss -ti` cung cấp một số TCP metrics. Capture trên host có thể bị ảnh hưởng bởi segmentation/coalescing offload, nên cần phân biệt packet logic với frame thực trên dây.

## Tự kiểm tra

**TCP_NODELAY luôn làm ứng dụng nhanh hơn?** Không; nó có thể tăng packet rate và overhead.

**Delayed ACK là mất packet?** Không.

**Một write của ứng dụng luôn tạo đúng một segment?** Không; TCP là byte stream và có thể gộp/chia dữ liệu.

## Đọc tiếp

Khi throughput hoặc latency giảm, phân biệt ứng dụng buffering, flow control, congestion và packet loss.
