---
title: "Pointers"
category: "Go"
tags: ["golang", "basics", "pointers", "memory"]
---

# Cầu nối bộ nhớ: Thấu hiểu Pointer không chút sợ hãi

Nhiều lập trình viên từ các ngôn ngữ như Java hay Python thường cảm thấy "e ngại" khi nghe đến Pointer (Con trỏ). Tuy nhiên, trong Go, Pointer cực kỳ an toàn và dễ hiểu. Nó là chiếc cầu nối giúp bạn tối ưu hóa hiệu suất ứng dụng bằng cách kiểm soát trực tiếp cách dữ liệu được lưu trữ.

## 1. Pointer là gì?

Nói một cách đơn giản nhất: **Pointer là một biến chứa địa chỉ bộ nhớ của một biến khác.**

Hãy tưởng tượng:
- Một **biến bình thường** giống như một chiếc hộp đựng quà.
- Một **Pointer** giống như một mảnh giấy ghi **địa chỉ** ngôi nhà chứa chiếc hộp quà đó.

## 2. Tại sao cần sử dụng Pointer?

Có hai lý do cốt yếu để bạn sử dụng Pointer trong Go:

1.  **Chia sẻ dữ liệu (Share data):** Thay vì tạo ra một bản sao (copy) khổng lồ của dữ liệu (gây tốn bộ nhớ), bạn chỉ cần đưa cho Hàm cái "địa chỉ" để nó tìm đến và sử dụng trực tiếp.
2.  **Sửa đổi dữ liệu (Modify data):** Khi bạn truyền một biến vào Hàm theo cách thông thường, Go sẽ tạo một bản sao độc lập. Mọi thay đổi bên trong Hàm sẽ không ảnh hưởng đến biến gốc. Nếu muốn tác động trực tiếp vào biến gốc, bạn bắt buộc phải truyền Pointer.

## 3. Cú pháp nền tảng

Trong Go, chúng ta chỉ cần ghi nhớ hai ký tự đặc biệt:

- `&` (Ampersand): Dùng để lấy **địa chỉ** bộ nhớ của một biến.
- `*` (Asterisk): 
    - Đặt trước một kiểu dữ liệu để khai báo kiểu Pointer (ví dụ: `*int`).
    - Đặt trước một biến Pointer để "mở hộp" truy cập giá trị bên trong địa chỉ đó (ví dụ: `*p`).

```go
func main() {
    age := 15
    ptr := &age // ptr bây giờ chứa địa chỉ của age

    fmt.Println(ptr)  // Kết quả: 0xc000012088 (địa chỉ bộ nhớ)
    fmt.Println(*ptr) // Kết quả: 15 (giá trị thực sự tại địa chỉ đó)

    *ptr = 20 // Thay đổi giá trị tại địa chỉ đó
    fmt.Println(age) // Kết quả: 20 (biến gốc age đã thay đổi!)
}
```

## 4. Hàm `new(T)` (Khởi tạo ẩn danh)

Ngoài việc lấy địa chỉ của một biến có tên, bạn có thể tạo ra một "biến không tên" và lấy địa chỉ của nó thông qua hàm `new`:

```go
p := new(int)   // Tạo một biến int ẩn danh, khởi tạo giá trị 0
fmt.Println(*p) // Kết quả: 0
*p = 10         // Sử dụng như pointer bình thường
```

## 5. Vòng đời của biến và Escape Analysis (Vùng nhớ Stack vs Heap)

Go sở hữu trình quản lý bộ nhớ cực kỳ thông minh. Khác với C++, bạn có thể an toàn trả về địa chỉ của một biến cục bộ từ trong Hàm:

```go
func createPointer() *int {
    v := 10
    return &v // HOÀN TOÀN AN TOÀN TRONG GO!
}
```

Trình biên dịch của Go sẽ tự động nhận diện biến `v` cần được "sống sót" sau khi Hàm kết thúc và đưa nó lên vùng nhớ **Heap** thay vì **Stack**. Kỹ thuật này được gọi là **Escape Analysis**.

## 6. Pointer trong Go vs C/C++

Nếu bạn đã có nền tảng C/C++, hãy lưu ý những điểm khác biệt giúp Go trở nên an toàn hơn:
- **Không có phép toán trên Pointer (Pointer Arithmetic):** Bạn không thể thực hiện phép tính `ptr + 1` để nhảy đến ô nhớ tiếp theo. Điều này loại bỏ hoàn toàn các lỗ hổng bảo mật nghiêm trọng.
- **Cơ chế dọn rác (Garbage Collection):** Bạn không cần lo lắng về việc gọi `free()` hay `delete`. Go sẽ tự động dọn dẹp bộ nhớ khi không còn đối tượng nào tham chiếu đến địa chỉ đó.

## 7. Khi nào nên và không nên dùng Pointer?

- **Nên dùng:** Khi bạn làm việc với các cấu trúc dữ liệu lớn (**Structs** lớn) hoặc khi bạn thực sự cần thay đổi trạng thái của đối tượng (sử dụng trong **Pointer Receivers**).
- **Không nên dùng:** Với các kiểu dữ liệu nhỏ và cơ bản (`int`, `float`, `bool`). Việc tạo Pointer cho chúng đôi khi còn tốn tài nguyên hơn là sao chép giá trị trực tiếp.

---

> Pointer trong Go mặc định có giá trị là `nil` nếu chưa được trỏ vào đâu. Luôn kiểm tra `nil` trước khi truy cập giá trị để tránh chương trình bị lỗi dừng đột ngột (panic).

---
