---
title: "Swap, memory pressure và OOM killer"
category: "Operating System"
tags: ["operating-system", "memory", "linux"]
description: "Phân biệt bộ nhớ ảo với swap, theo dõi memory pressure và hiểu kernel xử lý tình huống cạn RAM thế nào."
sources:
  - title: "Linux kernel documentation: Control Group v2"
    url: "https://docs.kernel.org/admin-guide/cgroup-v2.html"
updated: 2026-10-17
translationKey: "operating-system/swap-memory-pressure-oom"
---

Virtual memory cho process không đồng nghĩa mọi trang phải luôn nằm trong RAM. Kernel có thể giữ trang dùng gần đây trong RAM, bỏ trang file-backed có thể đọc lại, hoặc chuyển trang anonymous ít dùng sang swap. Swap mở rộng khả năng chịu áp lực bộ nhớ nhưng chậm hơn RAM nhiều và không thay thế dung lượng RAM cho workload cần working set lớn.

## File-backed và anonymous pages

Trang từ executable hoặc file mapping có thể được nạp lại từ file nếu chưa bị sửa. Anonymous memory như heap không có bản gốc trên file; kernel có thể ghi trang đó vào swap để giải phóng RAM. Shared pages, dirty pages và mapping loại khác có quy tắc riêng.

## Pressure và thrashing

Khi working set vượt RAM khả dụng, kernel reclaim page cache, ghi dirty pages, swap hoặc trì hoãn cấp phát. Nếu liên tục phải lấy trang ra rồi đọc lại ngay, hệ thống thrash: CPU ít làm công việc ứng dụng trong khi I/O paging tăng. Chỉ nhìn tổng RAM “used” không đủ; Linux tận dụng RAM nhàn rỗi làm cache.

Kernel không nhất thiết đợi RAM cạn hẳn mới thu hồi trang. Hệ điều hành có thể duy trì ngưỡng thấp/cao cho số frame sẵn dùng: khi xuống dưới ngưỡng thấp, một luồng nền thu hồi hoặc ghi ra nhiều trang cho tới khi đạt ngưỡng cao. Gom nhiều trang dirty thành đợt ghi có thể giảm chi phí I/O; tiến trình cần frame có thể phải đợi quá trình reclaim hoàn tất. Cách triển khai và tên ngưỡng/luồng nền khác nhau theo hệ điều hành.

`free -h` cho snapshot; `/proc/meminfo`, `vmstat`, PSI files dưới `/proc/pressure/` và cgroup memory events cho dấu hiệu khác nhau. `si/so` trong `vmstat` là swap-in/out; giá trị liên tục cao cùng latency tăng gợi ý pressure nhưng cần đối chiếu workload.

## OOM handling và cgroup

Khi không thể thu hồi đủ memory, kernel có thể kết thúc process để giữ hệ thống hoạt động. OOM killer chọn nạn nhân theo heuristic, không nhất thiết process “xấu” nhất theo ý ứng dụng. Trong cgroup v2, `memory.high` gây reclaim và throttle mạnh nhưng không gọi OOM killer; `memory.max` là giới hạn cứng và có thể kích hoạt OOM trong nhóm khi reclaim không đủ. Vì vậy container bị kill không chứng minh toàn host hết bộ nhớ; hãy phân biệt đúng limit và kiểm tra `memory.events` ([tài liệu Linux](https://docs.kernel.org/admin-guide/cgroup-v2.html)).

Điều tra bằng kernel log (`journalctl -k`), cgroup memory events, giới hạn hiện tại và thời điểm tăng tải. Cần phân biệt OOM kill với process tự crash hoặc bị supervisor dừng.

## Tự kiểm tra

**Swap tương đương RAM nhanh?** Không.

**RAM used cao luôn là dấu hiệu xấu?** Không; page cache dùng RAM nhàn rỗi và có thể được thu hồi.

**OOM kill trong container chứng minh toàn máy hết RAM?** Không; limit cgroup có thể đã chạm trước.

## Đọc tiếp

Khi memory của VM hoặc container được lồng qua nhiều lớp, guest virtual memory và host memory pressure cùng tác động.
