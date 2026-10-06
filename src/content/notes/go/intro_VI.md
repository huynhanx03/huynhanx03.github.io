---
title: "Introduction"
category: "Go"
tags: ["golang", "philosophy", "intro"]
---

# Mở đầu: Tư duy của một Gopher

Chào mừng bạn đến với chương đầu tiên của hành trình chinh phục Golang (Go). Trước khi chạm vào những dòng mã đầu tiên, chúng ta cần hiểu **tại sao Go lại tồn tại** và **di sản từ những bậc tiền bối**.

## 1. Nguồn gốc: Những "lão làng" hội ngộ

Go không được sinh ra chỉ để "thêm thắt" vào thế giới lập trình. Nó được nhào nặn bởi **Robert Griesemer, Rob Pike, và Ken Thompson** (những người đã đặt nền móng cho C và Unix) tại Google vào năm 2007. 

Go thừa kế DNA từ những dòng họ ngôn ngữ kinh điển:
- **Từ C:** Cú pháp tinh gọn, hiệu suất thực thi tối đa và mô hình bộ nhớ gần gũi với phần cứng.
- **Từ Pascal/Modula/Oberon:** Cấu trúc Gói (Package) và kỷ luật chặt chẽ về kiểu dữ liệu.
- **Từ CSP (Communicating Sequential Processes):** Mô hình Lập trình đồng thời (Concurrency) dựa trên **Channels**.

## 2. Ít hơn là Nhiều hơn (Less is More)

Trong khi các ngôn ngữ khác chạy đua để bổ sung những tính năng phức tạp, Go chọn con đường ngược lại: **Sự đơn giản**.

Triết lý của Go là: **Nếu ngôn ngữ càng ít tính năng dư thừa, lập trình viên càng ít phải bận tâm về "cách viết" mà tập trung toàn lực vào việc "giải quyết vấn đề".**

> Go chỉ vỏn vẹn 25 từ khóa (keywords). Để so sánh, C++ có hơn 90 và Java có trên 50.

## 3. Sự đơn giản không đồng nghĩa với dễ dãi

Đừng nhầm lẫn giữa *Đơn giản* (Simple) và *Dễ dãi* (Easy). 
- Go đơn giản vì nó loại bỏ những yếu tố gây nhiễu.
- Go buộc bạn phải viết mã một cách tường minh (Explicit), không "mập mờ".

**Minh chứng về tính tường minh:**
Trong Go, không có khái niệm "bỏ qua lỗi". Lỗi (Error) được coi là một giá trị và bạn **bắt buộc** phải kiểm soát nó. Điều này giúp hệ thống của bạn ổn định và dễ dự đoán hơn.

```go
f, err := os.Open("filename")
if err != nil {
    return err
}
```

## 4. Ưu tiên Lắp ghép thay vì Kế thừa (Composition over Inheritance)

Go rũ bỏ hệ thống phân cấp kế thừa phức tạp của lập trình hướng đối tượng truyền thống. Thay vào đó, Go tận dụng sức mạnh của sự **Lắp ghép** (Composition) và **Giao tiếp** (Interfaces).

Hãy tưởng tượng bạn đang chơi Lego. Bạn không cần một "viên gạch cha" để tạo ra "viên gạch con". Bạn chỉ cần lắp ghép các khối nhỏ lại với nhau để dựng nên một cấu trúc vĩ đại. Đó chính là cách Go vận hành.

## 5. "Đừng giao tiếp bằng cách chia sẻ bộ nhớ..."

Đây là tôn chỉ nổi tiếng nhất của Go về lập trình đồng thời (Concurrency):
> *Đừng giao tiếp bằng cách chia sẻ bộ nhớ; thay vào đó, hãy chia sẻ bộ nhớ bằng cách giao tiếp.*

Thay vì dùng các ổ khóa (Locks/Mutexes) phức tạp để bảo vệ dữ liệu chung, Go dùng **Channels** để các tiến trình (Goroutines) trao đổi thông tin trực tiếp. Điều này giúp triệt tiêu phần lớn các lỗi Xung đột tài nguyên (Race Condition).

## 6. Go Toolchain: Bộ công cụ thực chiến

Một Gopher chuyên nghiệp không thể thiếu bộ công cụ đi kèm để tối ưu hóa quy trình làm việc:
- **`go fmt`**: Tự động định dạng mã nguồn theo chuẩn chung của Go. Bạn sẽ không bao giờ phải tranh cãi về việc đặt dấu ngoặc ở đâu.
- **`go build`**: Biên dịch mã nguồn thành file thực thi (binary) duy nhất.
- **`go run`**: Vừa biên dịch vừa chạy mã nguồn ngay lập tức (thường dùng khi phát triển).
- **`go mod`**: Quản lý các thư viện phụ thuộc (dependencies).

## 7. Kết luận: Hành trình trở thành Gopher

Học Go không đơn thuần là học cú pháp, mà là học cách **đơn giản hóa tư duy**. Một Gopher chân chính luôn ưu tiên sự rõ ràng hơn là sự hoa mỹ (Clarity over Cleverness).

---

**Sai lầm thường gặp:** Cố gắng áp đặt lối tư duy của Java hay C++ (như kế thừa tầng tầng lớp lớp, hay dùng try-catch) vào Go. 

> Hãy giữ tâm trí trống rỗng và đón nhận Go theo cách nguyên bản nhất.