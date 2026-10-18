---
title: "Ví dụ dịch địa chỉ: page number, offset và TLB"
category: "Operating System"
tags: ["memory", "paging", "address translation", "tlb"]
description: "Tính page/offset từ địa chỉ nhị phân và lần translation qua TLB cùng page table."
updated: 2026-10-16
translationKey: "operating-system/address-translation-worked-example"
---

Giả sử hệ thống minh họa có địa chỉ 16-bit và page 1 KiB (`2^10` byte). Offset cần 10 bit; virtual page number còn 6 bit. Với virtual address `0x1234`, ta tách số trang và offset theo ranh giới này rồi tra page table.

## Tính từng bước

Page size 1024 byte nên:

```text
VPN = floor(address / 1024)
offset = address mod 1024
```

`0x1234 = 4660` decimal. `VPN = 4`, `offset = 564`. Nếu page 4 map sang physical frame 9, physical address là `9 × 1024 + 564 = 9780` (`0x2634`). Frame number thay, offset giữ nguyên.

Con số là giả định giảng dạy. Máy thật có địa chỉ rộng, page sizes và page table levels khác.

## Thêm TLB

MMU tìm `(ASID, VPN)` trong TLB. Hit trả frame ngay; miss cần hardware page walk hoặc kernel trap tùy kiến trúc. Nếu PTE present và quyền cho phép, translation có thể được đưa vào TLB. Nếu page không present, page fault yêu cầu kernel nạp/tạo page.

TLB miss và page fault khác nhau: miss là thiếu translation cache; page fault là điều kiện ánh xạ/presence cần xử lý. Miss có thể được xử lý hoàn toàn bằng page walk mà không block ứng dụng.

## Quyền và protection fault

PTE có thể cấm write/execute hoặc user access. Một translation tồn tại vẫn có thể fault vì quyền; kernel phân biệt nguyên nhân để xử lý COW hoặc báo lỗi. Nếu cùng page được chia sẻ nhưng chỉ đọc, write fault có thể là bước hợp lệ tạo bản riêng.

## Bài thực hành: ước lượng kích thước page table

Giả sử virtual address rộng 32 bit, page size là 4 KiB và mỗi PTE chiếm 8 byte. Bỏ qua các vùng địa chỉ không hợp lệ, page table tuyến tính cần `2^(32−12) = 2^20` entry, tức `2^20 × 8 = 8 MiB`. Nếu page size tăng lên 16 KiB trong cùng address space, offset cần 14 bit và còn `2^18` page; bảng cần `2^18 × 8 = 2 MiB`.

Đây là kích thước của bảng tuyến tính giả định có entry cho mọi virtual page. Bảng nhiều cấp có thể chỉ cấp các nhánh đang dùng nên thường tốn ít hơn với address space thưa. Tự thay đổi page size hoặc PTE size trong phép tính để thấy mỗi tham số tác động ra sao; nhớ tách kích thước virtual address space khỏi lượng RAM vật lý.

## Tóm tắt

- Số bit offset là log2(page size) khi page size lũy thừa hai.
- VPN chọn entry, offset giữ nguyên trong physical frame.
- TLB miss khác page fault.
- Present page có thể vẫn gây protection fault nếu quyền sai.
- ASID giúp phân biệt cùng VPN của nhiều process theo kiến trúc.
- Linear page table tăng theo số virtual page; page lớn giảm entry nhưng có trade-off.

## Tự kiểm tra

**Page 1 KiB cần 10-bit offset?** Có vì `2^10 = 1024`.

**TLB miss luôn đọc SSD?** Không; page table có thể hợp lệ và resident.

**PTE present nghĩa ghi luôn được?** Không; permission có thể cấm.

## Đọc tiếp

Khi RAM cần frame, page replacement chọn nạn nhân theo policy.
