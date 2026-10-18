---
title: "Relocation và segmentation: chia không gian nhớ theo vùng"
category: "Operating System"
tags: ["memory", "segmentation", "relocation"]
description: "So sánh địa chỉ logic, relocation động và segmentation với paging để hiểu cách bảo vệ các vùng nhớ."
updated: 2026-10-16
translationKey: "operating-system/segmentation-and-relocation"
---

Trước khi paging phổ biến, nhiều hệ thống cần nạp tiến trình vào một vùng RAM liên tục. Nếu chương trình được biên dịch với giả định bắt đầu ở một địa chỉ cố định, kernel khó đặt nó ở nơi khác mà không sửa mọi địa chỉ. **Relocation** giải quyết vấn đề bằng cách biến địa chỉ mà chương trình tham chiếu thành địa chỉ phù hợp với vị trí đang nạp.

## Base và bounds: relocation động đơn giản

Một mô hình cơ bản dùng thanh ghi base chứa địa chỉ vật lý bắt đầu của tiến trình, và bounds/limit chứa kích thước vùng hợp lệ. Địa chỉ logic `x` được dịch thành `base + x` nếu `x` nằm trong giới hạn; nếu vượt giới hạn, phần cứng báo lỗi.

```text
if 0 <= logical_address < limit:
    physical_address = base + logical_address
else:
    protection_fault
```

Đây là mô hình minh họa. Thanh ghi base/limit, đơn vị địa chỉ và kiểm tra thực tế phụ thuộc kiến trúc. Ý chính là phần cứng có thể đổi vị trí tiến trình mà không sửa code, đồng thời ngăn nó truy cập vượt vùng được giao.

Trong base-and-bounds đơn giản, bounds có thể biểu diễn kích thước của không gian ảo hợp lệ (kiểm tra offset trước khi cộng base) hoặc địa chỉ vật lý cuối (cộng base rồi kiểm tra); hai cách có thể diễn đạt cùng giới hạn nếu tính nhất quán. Base/bounds nằm trong trạng thái CPU: khi context switch, kernel lưu cặp này vào metadata process và nạp cặp của process kế tiếp trước khi trở lại user mode. Kernel cũng quản lý free list/vùng trống để cấp RAM khi tạo process và thu hồi khi process kết thúc.

**Static relocation** có thể sửa địa chỉ trong executable khi loader đặt chương trình vào RAM. Cách này không tự bảo vệ một process khỏi truy cập vùng của process khác và khiến việc di chuyển sau khi chạy khó hơn. **Dynamic relocation** dịch mỗi lần truy cập bằng phần cứng, nên kernel có thể đặt hoặc chuyển address space khi process không chạy, rồi cập nhật base đã lưu; chương trình tiếp tục dùng địa chỉ ảo cũ.

## Segmentation chia theo ý nghĩa chương trình

Thay vì coi toàn bộ tiến trình là một vùng đơn, segmentation chia thành các vùng logic như code, data, stack. Địa chỉ có thể biểu diễn cặp `(segment, offset)`. Mỗi segment có base và limit riêng, cùng quyền truy cập phù hợp. Code có thể chỉ đọc/thực thi; data có thể đọc/ghi.

Cách tổ chức này gần với cách người lập trình suy nghĩ và hỗ trợ chia sẻ một số segment. Nhưng mỗi segment có kích thước biến đổi, nên cấp vùng liên tục có thể tạo **external fragmentation**: tổng khoảng trống đủ lớn nhưng bị chia thành lỗ nhỏ không vừa yêu cầu mới. Nén vùng nhớ có thể tốn công và đòi hỏi di chuyển dữ liệu.

Khi phần cứng nhận địa chỉ ảo, nó phải xác định segment và offset. Một thiết kế có thể dành một số bit cao để chọn segment, phần còn lại làm offset; thiết kế khác có thể suy ra segment từ loại truy cập hoặc cách địa chỉ được tạo. Heap thường được tính offset từ đầu segment. Stack có thể tăng theo hướng ngược, nên địa chỉ ảo cần được đổi thành offset âm tương ứng trước khi cộng base. Sau đó phần cứng kiểm tra offset nằm trong kích thước segment.

Segment có thể có quyền riêng như đọc, ghi và thực thi. Chẳng hạn, code có thể được chia sẻ giữa process ở chế độ chỉ đọc/thực thi, trong khi data mỗi process riêng. Chia nhiều segment nhỏ cho độ linh hoạt cao hơn nhưng đòi hỏi bảng segment và metadata lớn hơn. Dù dùng ít hay nhiều segment, vùng vật lý có kích thước biến đổi vẫn dễ phân mảnh ngoài; compaction có thể gom lỗ trống bằng cách dừng/move process và cập nhật base, nhưng việc copy tốn băng thông và CPU.

## Paging chia theo kích thước cố định

Paging chia địa chỉ thành các trang cùng kích thước và ánh xạ sang frame vật lý rời rạc. Nó tránh yêu cầu tiến trình có một vùng vật lý liên tục, đổi lại page table và phần lãng phí ở page cuối. Segmentation đặt ranh giới theo vùng logic; paging đặt ranh giới theo đơn vị cố định.

Hai cách không phải lúc nào cũng loại trừ nhau: một số kiến trúc lịch sử kết hợp segment với page. Hệ điều hành hiện đại thường trình bày không gian địa chỉ theo các vùng logic, còn dịch vật lý chủ yếu dựa trên paging. Đừng suy cơ chế phần cứng từ tên lỗi hoặc sơ đồ ứng dụng.

## Phân mảnh là dấu hiệu của cách cấp phát

- **External fragmentation:** vùng trống bị chia nhỏ giữa các vùng đã cấp.
- **Internal fragmentation:** vùng cấp lớn hơn lượng dữ liệu thật sự cần, phần chênh lệch bị lãng phí.

Vùng biến kích thước dễ chịu external fragmentation; đơn vị cố định như page tránh kiểu lỗ rời rạc đó ở cấp frame nhưng có internal fragmentation. Thiết kế allocator và kích thước đơn vị luôn là đánh đổi giữa quản lý đơn giản, độ linh hoạt và hiệu quả sử dụng.

## Thực hành: kiểm tra giới hạn địa chỉ

Chọn một address space nhỏ, rồi với mỗi segment ghi rõ base, limit, hướng tăng/giảm và quyền. Tự phân loại một dãy virtual address là hợp lệ hay lỗi bảo vệ; nếu hợp lệ, tính physical address theo quy tắc của mô hình. Sau đó đổi limit để kiểm tra tỷ lệ địa chỉ hợp lệ và xem một cặp segment có thể bao phủ toàn bộ address space hay để lại khoảng không hợp lệ.

Khi so kết quả với simulator, cố định seed và ghi rõ quy ước biên: limit thường mô tả độ dài nên địa chỉ đúng tại biên trên có thể đã nằm ngoài segment. Không mang công thức của mô hình giáo khoa sang kiến trúc thật nếu chưa kiểm tra ISA.

## Tóm tắt

- Relocation cho phép đặt chương trình ở vị trí vật lý khác mà không viết lại mọi địa chỉ.
- Base/bounds là mô hình dịch và kiểm tra phạm vi đơn giản.
- Segmentation chia theo vùng logic có base/limit và quyền riêng.
- Vùng biến kích thước có thể bị external fragmentation.
- Paging dùng page cố định và frame rời rạc, giảm yêu cầu vùng vật lý liên tục nhưng có chi phí khác.

## Tự kiểm tra

**Segmentation và paging là hai tên cho cùng cơ chế?** Không. Một bên chia theo vùng logic biến kích thước, bên kia chia theo block cố định.

**Paging không có fragmentation?** Nó tránh external fragmentation trong cấp frame cố định nhưng vẫn có internal fragmentation và chi phí page table.

**Base/bounds có thể kiểm tra quyền ghi code nếu chỉ dùng một cặp giới hạn?** Cơ chế cần thêm quyền hoặc vùng riêng; một cặp base/limit chỉ minh họa relocation và phạm vi.

## Đọc tiếp

Xem [paging và page table](/vi/notes/operating-system/paging-page-tables/) để hiểu cách trang ảo được đặt vào các frame rời rạc.
