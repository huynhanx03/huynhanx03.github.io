---
title: "Máy ảo và hypervisor: mô phỏng một máy hoàn chỉnh"
category: "Operating System"
tags: ["virtualization", "virtual machine", "hypervisor"]
description: "Phân biệt VM với process/container, hiểu hypervisor và cách guest tin rằng nó sở hữu phần cứng riêng."
updated: 2026-10-16
translationKey: "operating-system/virtual-machines-and-hypervisors"
---

Máy ảo (VM) cung cấp cho guest operating system một môi trường phần cứng ảo hóa: CPU, bộ nhớ, thiết bị và firmware ảo. Hypervisor quản lý việc nhiều guest cùng chia sẻ máy host. Guest thường có kernel riêng; đây là điểm khác căn bản so với container thông thường.

## Type 1 và Type 2 là phân loại khái niệm

Type 1 chạy trực tiếp trên phần cứng theo cách phân loại giáo khoa; Type 2 chạy như ứng dụng trên host OS. Sản phẩm hiện đại có thể kết hợp kiến trúc và driver theo nhiều lớp, nên nhãn không đủ để so sánh hiệu năng/bảo mật.

Hypervisor cần cô lập CPU state, bộ nhớ và thiết bị giữa guest. Hardware virtualization extensions hỗ trợ trap một số thao tác nhạy cảm vào hypervisor, nhưng không làm mọi thao tác miễn phí.

## Ảo hóa CPU

Guest nghĩ nó có CPU logic và thực thi kernel của nó. Hypervisor phân phối CPU vật lý giữa vCPU. Khi guest thực hiện thao tác cần kiểm soát, CPU/hypervisor chuyển sang lớp quản lý. Nếu VM có nhiều vCPU nhưng host không có đủ CPU vật lý rảnh, guest task có thể chờ scheduler host.

Trong mô hình software virtualization cổ điển, guest kernel chạy ở mức đặc quyền thấp hơn hypervisor. Guest vẫn cài trap handler của mình; hypervisor ghi nhận handler đó rồi chuyển trap phù hợp xuống guest. Khi guest cố chạy lệnh privileged như cập nhật TLB hoặc return-from-trap, quyền thấp khiến thao tác trap ngược lên hypervisor để kiểm tra/giả lập. Việc vòng qua thêm một lớp làm system call và TLB miss tốn hơn; VT-x/AMD-V cùng hardware assist hiện đại xử lý nhiều trường hợp khác đi, nên đây là mô hình giải thích lịch sử, không phải mô tả mọi máy hiện nay.

Thời gian CPU trong guest và host khác góc nhìn; oversubscription làm latency biến động. Việc pin vCPU có thể cải thiện locality nhưng giảm linh hoạt.

## Ảo hóa thiết bị

Emulated device mô phỏng thiết bị quen thuộc để guest dùng driver phổ biến, nhưng có thể tốn overhead. Paravirtualized device như virtio thiết kế giao diện tối ưu cho VM và cần driver phù hợp. Passthrough gắn thiết bị vật lý trực tiếp hơn với VM, tăng hiệu năng/khả năng truy cập nhưng làm chia sẻ, migration và cách ly phức tạp.

## Snapshot và migration

Snapshot có thể lưu trạng thái đĩa và đôi khi trạng thái VM; snapshot sống lâu tạo chuỗi phụ thuộc và tăng storage. Migration chuyển trạng thái VM sang host khác, cần tương thích CPU, mạng, storage và thiết bị. Snapshot không thay backup độc lập.

## Khi nào chấp nhận chi phí của VM

VM hữu ích khi cần một guest OS/kernel riêng: thử distro hoặc thay đổi hệ thống an toàn hơn, chạy phần mềm phụ thuộc OS khác, hoặc cấp một máy chủ cloud có ranh giới guest rõ. Đổi lại, mỗi VM phải khởi động và cập nhật một hệ điều hành đầy đủ, giữ các dịch vụ nền cần thiết và quản lý dependency riêng; tạo nhiều VM nhỏ có thể tốn thời gian, RAM, storage và chi phí vận hành.

Container thường khởi chạy process nhanh và chia sẻ kernel host, nên phù hợp khi cần đóng gói, nhân bản hoặc cập nhật ứng dụng trong cùng họ kernel. Nhưng container không xóa nhu cầu quản lý máy nền. Khi cần chạy nhiều instance trên nhiều host, hệ điều phối như Kubernetes xử lý placement, restart, networking và rollout; nó thêm một lớp cấu hình và hạ tầng cần vận hành. Hãy chọn theo ranh giới kernel, độ tương thích, mức cách ly và chi phí quản trị, không chỉ theo tốc độ khởi động.

## Tầng dịch bộ nhớ và khoảng trống thông tin

Guest process dùng virtual address → guest physical frame theo page table của guest OS; hypervisor còn ánh xạ guest physical → machine/host frame. Shadow page table có thể gộp ánh xạ để hardware dùng trực tiếp; nested paging cho MMU đi qua nhiều tầng nhưng TLB miss vẫn tốn thêm tra cứu. Hypervisor cũng phải xử lý khi guest muốn sửa page table/TLB theo cơ chế phụ thuộc kiến trúc.

Hypervisor thường không biết guest OS đang rảnh hay đang zero page vì bảo mật; thiếu tín hiệu này tạo “information gap”, dẫn tới cấp phát CPU kém hiệu quả hoặc page bị zero hai lần. Implicit inference có thể đoán một số trạng thái mà không đổi interface; paravirtualization cho guest hợp tác rõ hơn, nhưng cần guest hỗ trợ và đổi tính trong suốt/khả năng tương thích.

## Tóm tắt

- VM có guest OS/kernel riêng; hypervisor chia sẻ phần cứng host.
- vCPU là CPU ảo được scheduler host map lên CPU vật lý.
- Emulation, paravirtualization và passthrough có các đánh đổi khác nhau.
- VMM phải giữ quyền privileged, xử lý trap/TLB và ánh xạ guest physical sang machine memory.
- Shadow/nested paging cùng TLB đổi chi phí dịch; paravirtualization có thể giảm một số khoảng trống thông tin nhưng cần guest hỗ trợ.
- Oversubscription có thể tạo latency dù guest thấy nhiều vCPU.
- Snapshot/migration phụ thuộc storage, thiết bị và tương thích host.

## Tự kiểm tra

**VM có luôn chạy trực tiếp trên phần cứng không?** Không; có hypervisor type 2 chạy trên host OS theo phân loại phổ biến.

**Guest có 8 vCPU nghĩa được bảo đảm 8 core vật lý?** Không; đó là tài nguyên ảo được host lập lịch.

**Snapshot VM thay thế backup?** Không; snapshot thường phụ thuộc cùng hạ tầng/storage.

## Đọc tiếp

Container chia sẻ kernel host; bài sau so sánh hai mức cách ly này.
