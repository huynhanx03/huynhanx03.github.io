---
title: "Phân giải tên cục bộ và tìm dịch vụ"
category: "Network"
tags: ["network", "dns", "mdns", "llmnr", "service discovery"]
description: "Phân biệt DNS phân cấp với LLMNR, mDNS và cơ chế công bố dịch vụ trong mạng cục bộ."
updated: 2026-10-16
translationKey: "network/local-name-resolution-and-service-discovery"
---

DNS công cộng phù hợp với tên được quản trị qua zone và delegation. Trong một mạng nhỏ, người dùng đôi khi cần tìm máy in hoặc thiết bị mà không có DNS server được cấu hình riêng. LLMNR và multicast DNS (mDNS) là các cơ chế cục bộ có cách hoạt động gần DNS, nhưng phạm vi và trust model của chúng khác DNS phân cấp.

## LLMNR và mDNS

LLMNR gửi truy vấn tên trong phạm vi mạng cục bộ bằng multicast. mDNS cũng dùng message DNS trên multicast; tên kết thúc bằng `.local` được xử lý theo quy ước link-local. Thiết bị có thể tự công bố tên và phát hiện xung đột tên mà không cần một authoritative server trung tâm. Những cơ chế này tiện cho mạng gia đình/lab, nhưng một câu trả lời nhận được chỉ đến từ cùng link cục bộ, không mang theo chain of trust DNS toàn Internet.

DNS Service Discovery (DNS-SD) mô tả cách duyệt các record DNS để tìm instance dịch vụ và thông tin kết nối như host, port, protocol cùng metadata dạng TXT. DNS-SD có thể dùng mDNS trên mạng cục bộ hoặc DNS thông thường khi có hạ tầng phù hợp. Vì thế “tìm tên máy” và “tìm dịch vụ đang chạy trên máy” là hai bước khác nhau.

## Chọn đúng nguồn tên

Ứng dụng có thể lấy kết quả từ DNS unicast, mDNS, LLMNR, file hosts hoặc cơ chế của hệ điều hành. Thứ tự tra cứu phụ thuộc OS và cấu hình. Nếu hai nguồn cùng trả lời một tên, khác biệt về thứ tự và trust có thể dẫn đến kết quả bất ngờ. Mạng doanh nghiệp thường vô hiệu hóa hoặc giới hạn một số cơ chế multicast khi chúng không cần thiết.

Kẻ ở cùng link có thể giả mạo câu trả lời local-name để dụ client kết nối nhầm máy hoặc gửi thông tin xác thực tới dịch vụ giả. Không nên coi tên `.local` hay câu trả lời LLMNR là danh tính đã xác minh. Dùng HTTPS/certificate hoặc xác thực ở tầng ứng dụng cho dịch vụ nhạy cảm; giới hạn multicast và tắt cơ chế không dùng theo chính sách mạng.

## Phân biệt với LDAP

DNS phân phối RR đã biết theo tên; LDAP hỗ trợ tìm kiếm entry và attribute theo filter trong một directory tree. DNS-SD có thể giúp tìm endpoint của dịch vụ, còn LDAP có thể lưu danh bạ người dùng hoặc thông tin tổ chức. Chúng có thể phối hợp nhưng không thay thế nhau.

## Tự kiểm tra

**Tìm thấy `printer.local` có nghĩa đã xác thực đúng máy in?** Không. Nó chỉ cho biết một thiết bị trên link đã trả lời theo cơ chế local-name.

**DNS-SD chỉ tìm địa chỉ IP?** Không. Nó có thể chỉ ra loại dịch vụ, instance, host, port và metadata để client tiếp tục kết nối.

**mDNS là một phần của delegation root/TLD?** Không. Nó hoạt động trong phạm vi link cục bộ.

## Ghi chú về phiên bản nguồn

TCP/IP Illustrated, Vol. 1 mô tả LLMNR và mDNS theo bối cảnh ấn bản năm 2011, gồm một số chi tiết triển khai và trạng thái tiêu chuẩn đã cũ. Phần trên giữ lại mô hình và ranh giới bảo mật; số port, địa chỉ multicast và trạng thái hỗ trợ cụ thể nên kiểm tra theo hệ điều hành/tiêu chuẩn đang triển khai.
