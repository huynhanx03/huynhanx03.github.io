---
title: "The Error Guardian"
category: "Go"
tags: ["golang", "errors", "fundamentals"]
---

# Kiểm soát lỗi: Người bảo vệ thầm lặng

Trong hầu hết các ngôn ngữ lập trình hiện đại, khi có sự cố phát sinh, hệ thống thường "ném" (throw) một ngoại lệ (Exception) và lập tức ngắt quãng dòng chảy của chương trình. Go chọn một lối đi riêng: **Lỗi (Error) chỉ đơn thuần là một giá trị.**

## 1. Triết lý "Coi lỗi là giá trị" (Error as Value)

Go hoàn toàn không có `try-catch`. Tại sao lại như vậy? Vì Go muốn người lập trình phải đối mặt và xử lý lỗi ngay tại nơi nó phát sinh, thay vì bỏ mặc lỗi trôi nổi và hy vọng sẽ bắt được nó ở một tầng nào đó cao hơn.

> Tư duy Gopher: Nếu một Hàm có khả năng thất bại, nó **phải** trả về đối tượng lỗi như là kết quả cuối cùng.

```go
func Divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("không thể thực hiện phép chia cho số 0")
    }
    return a / b, nil
}
```

## 2. Các chiến lược xử lý lỗi

Theo cuốn *The Go Programming Language*, có 4 chiến lược chính để đối phó với lỗi:

1.  **Lan truyền lỗi (Propagating)**: Trả lỗi về cho hàm gọi nó để xử lý ở tầng cao hơn.
2.  **Thử lại (Retrying)**: Nếu lỗi có tính tạm thời (ví dụ lỗi mạng), bạn có thể thử thực hiện lại thao tác sau một khoảng thời gian chờ.
3.  **Dừng chương trình (Terminating)**: Nếu lỗi nghiêm trọng đến mức không thể tiếp tục (ví dụ thiếu file cấu hình quan trọng), hãy log lỗi và dừng chương trình (`os.Exit(1)`).
4.  **Ghi log và tiếp tục**: Đối với các lỗi không quá quan trọng, bạn chỉ cần ghi lại nhật ký và để chương trình chạy tiếp.

```go
result, err := Divide(10, 0)
if err != nil {
    // Chiến lược: Log lỗi và trả về
    return fmt.Errorf("không thể tính toán dữ liệu: %w", err)
}
```

## 3. Lỗi tự định nghĩa (Custom Errors)

Bản chất của `error` trong Go cực kỳ đơn giản, nó là một **Interface**:

```go
type error interface {
    Error() string
}
```

Nhờ vậy, bạn có thể tự tạo bất kỳ cấu trúc dữ liệu (**Struct**) nào thỏa mãn Giao diện (Interface) này để đính kèm thêm nhiều thông tin hữu ích (như mã lỗi, thời điểm xảy ra, ngữ cảnh người dùng...).

```go
type MyError struct {
    Code    int
    Message string
}

func (e *MyError) Error() string {
    return fmt.Sprintf("Mã lỗi %d: %s", e.Code, e.Message)
}
```

## 4. `errors.Is` và `errors.As`

Đôi khi bạn cần bao bọc (**wrap**) một lỗi cũ bên trong một lỗi mới để bổ sung thông tin. Go cung cấp các công cụ để bạn "truy vết" lại lỗi gốc:

-   **`errors.Is`**: Kiểm tra xem một lỗi có tương ứng với một loại lỗi cụ thể hay không (tương tự như phép so sánh `==`).
-   **`errors.As`**: Chuyển đổi (cast) lỗi về một kiểu cấu trúc cụ thể để truy xuất các dữ liệu đặc thù.

### Kỹ thuật Wrapping với `%w`

Khi bạn muốn thêm ngữ cảnh cho lỗi mà không làm mất đi danh tính của lỗi gốc, hãy dùng động từ `%w` trong `fmt.Errorf`:

```go
if err != nil {
    return fmt.Errorf("không thể kết nối DB: %w", err)
}
```
Lúc này, lỗi trả về sẽ chứa thông báo mới nhưng vẫn "ngầm" giữ lỗi gốc bên trong. Nhờ vậy, ở tầng cao hơn, bạn vẫn có thể dùng `errors.Is(err, sql.ErrConnDone)` để kiểm tra chính xác nguyên nhân cốt lõi.

```go
if errors.Is(err, os.ErrNotExist) {
    fmt.Println("Tệp tin không tồn tại trên hệ thống!")
}
```

## 5. Panic và Recover: Khi mọi thứ vượt tầm kiểm soát

`panic` là trạng thái "hoảng loạn" của chương trình khi gặp lỗi không thể cứu vãn (ví dụ truy cập mảng ngoài phạm vi). 

> Đừng bao giờ dùng `panic` cho các lỗi thông thường. Hãy dùng `error`. Chỉ dùng `panic` cho các lỗi lập trình không thể phục hồi.

`recover` có thể dùng trong một hàm được `defer` để "hồi sinh" chương trình từ trạng thái `panic`, nhưng đây là kỹ thuật nên hạn chế tối đa để tránh làm che lấp các lỗi nghiêm trọng.

---

> **Lời khuyên từ Gopher chuyên nghiệp:** Đừng bao giờ phớt lờ lỗi bằng cách sử dụng dấu gạch dưới `_, _ := DoSomething()`. Đó là cách nhanh nhất để tạo ra những mầm mống lỗi khó lòng truy vết trong tương lai.

---
