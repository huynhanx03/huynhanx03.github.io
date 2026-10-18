---
title: "Memory: không gian địa chỉ của một tiến trình"
category: "Operating System"
tags: ["memory", "address space", "operating system"]
description: "Hiểu vì sao mỗi tiến trình có thể thấy một vùng địa chỉ riêng và kernel biến địa chỉ đó thành truy cập an toàn."
updated: 2026-10-16
translationKey: "operating-system/memory-address-space"
---

Một chương trình thường dùng các địa chỉ như thể nó có vùng nhớ riêng: mã lệnh ở một nơi, dữ liệu toàn cục ở nơi khác, stack cho lời gọi hàm và heap cho dữ liệu cấp phát động. Nhưng RAM là tài nguyên hữu hạn được nhiều tiến trình cùng chia sẻ. Làm sao hai chương trình cùng dùng địa chỉ `0x1000` mà không ghi đè lên nhau?

Câu trả lời là **không gian địa chỉ ảo**. Mỗi tiến trình làm việc với một không gian địa chỉ do hệ điều hành và phần cứng quản lý. Địa chỉ mà lệnh của chương trình tạo ra không nhất thiết là vị trí vật lý trên RAM.

## Địa chỉ ảo và địa chỉ vật lý

- **Địa chỉ ảo (virtual address):** địa chỉ mà tiến trình sử dụng.
- **Địa chỉ vật lý (physical address):** vị trí trong hệ thống bộ nhớ vật lý.
- **MMU:** đơn vị phần cứng dịch địa chỉ theo cấu hình bảng trang hiện hành.

Khi tiến trình chạy, CPU phát sinh địa chỉ ảo. MMU phối hợp với hệ điều hành để tìm ánh xạ phù hợp. Nếu ánh xạ hợp lệ, truy cập đi tới vùng vật lý tương ứng; nếu không, CPU tạo ngoại lệ để kernel xử lý, chẳng hạn báo lỗi truy cập hoặc nạp trang từ nơi lưu trữ.

```text
CPU tạo địa chỉ ảo
        ↓
       MMU ── tra bảng ánh xạ
        ↓                   ↘ không hợp lệ / chưa hiện diện
RAM vật lý                    trap vào kernel
```

Tiến trình A và B có thể cùng có địa chỉ ảo `0x1000`, nhưng bảng ánh xạ của chúng trỏ tới các trang vật lý khác nhau. Việc dịch này cũng cho phép hệ điều hành chuyển vị trí vật lý của một trang mà chương trình không cần thay mọi con trỏ trong code.

Ví dụ, bảng của A có thể ánh xạ `0x1000` tới frame 42, còn bảng của B ánh xạ cùng địa chỉ đó tới frame 91. Khi CPU chạy A, MMU dùng bảng của A; khi chạy B, MMU dùng bảng của B. Vì vậy, hai chương trình dùng cùng một địa chỉ ảo nhưng mỗi chương trình vẫn truy cập vùng RAM riêng.

## Một không gian địa chỉ điển hình

Sơ đồ khái niệm thường đặt vùng mã chương trình, dữ liệu toàn cục, heap và stack ở các vùng khác nhau. Vị trí, hướng tăng và số vùng cụ thể tùy kiến trúc, hệ điều hành, định dạng chương trình và cơ chế bảo mật. Không nên coi sơ đồ trong sách là bản đồ cố định của mọi tiến trình Linux.

**Text/code** thường chứa lệnh và có thể được ánh xạ chỉ đọc, chia sẻ giữa nhiều tiến trình chạy cùng chương trình. **Data** giữ biến toàn cục đã khởi tạo; **BSS** dành cho biến toàn cục bằng không theo quy ước định dạng thực thi. **Heap** phục vụ cấp phát có vòng đời động theo allocator. **Stack** lưu trạng thái lời gọi hàm theo quy ước runtime/ABI.

Heap và stack không phải hai vùng duy nhất; thư viện chia sẻ, memory mapping, vùng thread, bộ đệm runtime và ánh xạ file cũng có thể xuất hiện. Các vùng ảo có thể chưa chiếm RAM vật lý ngay khi được dành chỗ.

## Vì sao không dùng địa chỉ vật lý trực tiếp?

Nếu mọi chương trình tự chọn địa chỉ vật lý, hệ điều hành khó cách ly dữ liệu và nạp nhiều chương trình cùng lúc. Ánh xạ ảo cho phép:

- **Cách ly:** tiến trình không tự do đọc/ghi vùng của tiến trình khác.
- **Tái định vị:** chương trình có thể được nạp ở trang vật lý khác mà vẫn dùng địa chỉ ảo quen thuộc.
- **Chia sẻ có kiểm soát:** nhiều tiến trình có thể ánh xạ cùng vùng vật lý, chẳng hạn thư viện chỉ đọc hoặc vùng shared memory.
- **Bảo vệ theo quyền:** một trang có thể được đánh dấu đọc, ghi hoặc thực thi theo chính sách kiến trúc.
- **Nạp theo nhu cầu:** chỉ một phần dữ liệu cần thiết phải ở RAM tại một thời điểm.

Các khả năng trên cần phối hợp giữa kernel, MMU, định dạng chương trình và chính sách cấp phát. Địa chỉ ảo tự nó không bảo đảm cách ly nếu kernel cấu hình sai hoặc có lỗ hổng phần cứng/phần mềm.

## Bộ nhớ ảo không có nghĩa mỗi byte đều ở RAM

Tên “virtual memory” dễ làm ta nghĩ có một bản sao đầy đủ của toàn bộ không gian tiến trình trên đĩa. Thực tế, nhiều địa chỉ có thể chưa được ánh xạ, được ánh xạ vào file, đang ở RAM, hoặc tạm thời không resident. Kernel có thể cấp một vùng địa chỉ trước rồi chỉ cấp trang vật lý khi chương trình thật sự chạm vào nó.

Nếu truy cập một địa chỉ chưa có trang resident nhưng hợp lệ, page fault cho kernel cơ hội tạo hoặc nạp nội dung. Nếu truy cập vi phạm quyền hoặc không thuộc vùng hợp lệ, tiến trình có thể bị báo lỗi như segmentation fault. Tên lỗi không có nghĩa máy dùng segmentation theo cơ chế phần cứng cũ.

## Tóm tắt

- Tiến trình tạo địa chỉ ảo; MMU dịch nó qua bảng ánh xạ sang địa chỉ vật lý.
- Không gian địa chỉ giúp cách ly, tái định vị, chia sẻ có kiểm soát và đặt quyền.
- Các vùng code, data, heap, stack là mô hình hữu ích nhưng không phải toàn bộ bản đồ của tiến trình.
- Một vùng địa chỉ ảo không đồng nghĩa mọi trang đã chiếm RAM.
- Page fault là sự kiện kernel xử lý; nguyên nhân có thể hợp lệ hoặc là lỗi truy cập.

## Tự kiểm tra

**Hai tiến trình dùng cùng địa chỉ ảo thì có chắc ghi cùng byte RAM không?** Không. Mỗi tiến trình có thể có bảng ánh xạ khác nhau.

**Cấp phát địa chỉ ảo đồng nghĩa đã cấp đủ RAM vật lý chưa?** Không nhất thiết; trang có thể chỉ được cấp khi chạm tới hoặc được hỗ trợ bởi file.

**Segmentation fault chứng minh CPU đang dùng segmentation để dịch địa chỉ?** Không. Đây là tên lỗi phổ biến khi truy cập bộ nhớ không hợp lệ.

## Đọc tiếp

Tiếp theo: [Paging và page table](/vi/notes/operating-system/paging-page-tables/), cơ chế phổ biến để ánh xạ không gian địa chỉ.
