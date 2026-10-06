---
title: "Stack vs Heap: Bản chất bộ nhớ"
category: "Operating System"
tags: ["memory", "stack", "heap", "gc", "fundamentals"]
---

# Quản lý bộ nhớ: Stack và Heap

Trong hệ điều hành và lập trình hiện đại, bộ nhớ của một chương trình thường được chia thành hai vùng quan trọng: **Stack** và **Heap**. Hiểu rõ sự khác biệt giữa chúng là chìa khóa để viết mã hiệu năng cao và tối ưu hóa tài nguyên.

---

## 1. Stack (Bộ nhớ ngăn xếp)

Stack là vùng nhớ được tổ chức theo cấu trúc dữ liệu LIFO (Last In, First Out).

### Đặc điểm kỹ thuật:
- **Tổ chức:** Luôn là vùng nhớ liên tiếp. Quản lý thông qua con trỏ **Stack Pointer**.
- **Phạm vi:** Mỗi Thread hoặc Goroutine có Stack riêng biệt (Isolation).
- **Dữ liệu lưu trữ:** Biến cục bộ, tham số hàm, địa chỉ trả về.
- **Tốc độ:** Cực kỳ nhanh (O(1)). Chỉ cần di chuyển con trỏ bộ nhớ.
- **Kích thước:** Ban đầu nhỏ và tự động mở rộng khi cần.

### 1.1. Rủi ro: Stack Overflow
Dù rất nhanh, Stack có giới hạn về chiều sâu. **Stack Overflow** xảy ra khi:
- **Đệ quy vô hạn/quá sâu**: Mỗi lần gọi hàm tạo ra một Stack Frame mới, nếu không có điểm dừng, Stack sẽ hết chỗ.
- **Cấp phát cục bộ quá lớn**: Khai báo các mảng khổng lồ (vd: `var buf [1000000]int`) bên trong hàm có thể làm tràn ngăn xếp ngay lập tức.

---

## 2. Heap (Bộ nhớ đống)

Heap là vùng nhớ dùng chung (Shared memory) cho toàn bộ chương trình, không bị giới hạn bởi cấu trúc LIFO.

### Đặc điểm kỹ thuật:
- **Tổ chức:** Không liên tiếp, phân bổ rải rác.
- **Phạm vi:** Dùng chung cho toàn bộ chương trình.
- **Dữ liệu lưu trữ:** Đối tượng sống lâu, dữ liệu chia sẻ giữa các luồng, hoặc dữ liệu có kích thước động.
- **Tốc độ:** Chậm hơn do phải tìm kiếm vùng trống (Free list).
- **Quản lý:** Thu hồi nhờ **Garbage Collector (GC)**.

### 2.1. Vấn đề: Phân mảnh (Fragmentation)
Đây là "cơn ác mộng" của Heap mà Stack không bao giờ gặp phải:
- **Lý do:** Heap cấp phát các vùng nhớ có kích thước khác nhau và giải phóng chúng tại các thời điểm không cố định. Sau một thời gian, bộ nhớ sẽ xuất hiện các "lỗ hổng" nhỏ.
- **Hệ quả:** Dù tổng dung lượng trống vẫn đủ, nhưng hệ thống không thể tìm được một khối nhớ **liên tiếp** đủ lớn để cấp phát cho một đối tượng mới.
- **Tại sao Stack miễn nhiễm?** Vì Stack luôn hoạt động theo kiểu "xếp gạch" liên tiếp và giải phóng theo đúng thứ tự ngược lại (LIFO), nên không bao giờ để lại lỗ hổng ở giữa.

---

## 3. So sánh nhanh

| Tiêu chí | Stack | Heap |
| :--- | :--- | :--- |
| **Bản chất** | Liên tiếp (LIFO). | Tự do (Shared). |
| **Tốc độ** | Rất nhanh. | Chậm hơn. |
| **Thu hồi** | Tức thì khi xong hàm. | Đợi Garbage Collector. |
| **Dòng đời** | Ngắn hạn. | Dài hạn. |

---

## 4. Insight: Escape Analysis (Trong Go)

Go sử dụng **Escape Analysis** để quyết định:
- Nếu biến "thoát" khỏi phạm vi hàm (như trả về pointer): Đưa lên **Heap**.
- Nếu chỉ dùng nội bộ hàm: Ưu tiên nằm ở **Stack**.

> Giữ dữ liệu ở Stack giúp giảm áp lực cho GC, từ đó tăng hiệu năng toàn hệ thống.
