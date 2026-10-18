---
title: "Bộ nhớ ảo trong VM: nested paging, ballooning và overcommit"
category: "Operating System"
tags: ["virtualization", "memory", "paging", "hypervisor"]
description: "Theo địa chỉ guest qua hypervisor tới RAM host và hiểu các kỹ thuật chia sẻ bộ nhớ giữa máy ảo."
updated: 2026-10-16
translationKey: "operating-system/vm-memory-virtualization"
---

Guest OS nghĩ nó quản lý RAM vật lý riêng, nhưng hypervisor phải map “địa chỉ vật lý guest” sang RAM vật lý host. Một truy cập vì vậy có thể cần hai lớp dịch: virtual address của process sang guest physical address, rồi guest physical sang host physical.

## Shadow page table và nested translation

Trong mô hình cũ, hypervisor có thể duy trì shadow page table kết hợp ánh xạ guest và host để CPU dùng. Cập nhật page table guest cần được theo dõi và phản chiếu, tạo overhead.

Phần cứng hiện đại thường hỗ trợ nested paging (tên như EPT/NPT tùy hãng), cho phép MMU phối hợp hai tầng ánh xạ. Cơ chế giảm một số trap nhưng tăng số bước tra bảng khi TLB miss; CPU cache kết quả dịch để giảm chi phí. Tên, giới hạn và hiệu năng phụ thuộc kiến trúc.

## Overcommit và ballooning

Hypervisor có thể cấp cho guest tổng RAM lớn hơn RAM host nếu kỳ vọng không phải mọi guest dùng tối đa cùng lúc. Đây là overcommit; khi kỳ vọng sai, host phải thu hồi/đẩy trang và latency tăng hoặc guest OOM.

Balloon driver trong guest có thể được hypervisor yêu cầu “phình” bằng cách giữ page guest, để host thu hồi backing RAM. Guest biết áp lực và có thể chọn trang phù hợp hơn host nhìn từ ngoài. Nếu driver thiếu hoặc cấu hình không hỗ trợ, hypervisor có thể dùng swapping/technique khác với độ minh bạch và hiệu quả khác.

## Hai tầng paging tạo hai loại áp lực

Guest có thể nghĩ còn RAM nhưng host đang thiếu; host có thể swap backing page của guest mà guest chưa thấy ngay. Ngược lại, guest kernel có thể swap page dù host còn RAM. Khi cả hai tầng cùng paging, I/O và latency có thể tăng mạnh.

Điều tra cần xem metric guest và host: guest page fault/swap, host memory pressure, balloon state, VM residency và storage latency. Một số lần guest fault chỉ là demand paging bình thường; phân loại sự kiện trước khi kết luận.

## Tóm tắt

- VM memory có ít nhất hai khái niệm địa chỉ: guest virtual/physical và host physical.
- Nested paging hỗ trợ MMU dịch nhiều tầng; TLB giảm chi phí lặp lại.
- Overcommit tận dụng mức dùng trung bình nhưng tạo rủi ro khi host thiếu RAM.
- Ballooning giúp guest phối hợp thu hồi page với hypervisor.
- Chẩn đoán memory pressure cần nhìn cả guest lẫn host.

## Tự kiểm tra

**Guest báo 16 GiB RAM nghĩa host đang dành riêng đủ 16 GiB?** Không nhất thiết; có thể overcommit.

**Guest swap bằng 0 chứng minh host không swap VM?** Không; hypervisor/host có thể chịu áp lực riêng.

**Nested paging bỏ hoàn toàn chi phí dịch địa chỉ?** Không; nó giảm một số overhead nhưng vẫn có tra cứu và TLB miss.

## Đọc tiếp

So sánh cơ chế này với container: container dùng chung kernel nên không có guest page table/kernel độc lập theo cùng mô hình.
