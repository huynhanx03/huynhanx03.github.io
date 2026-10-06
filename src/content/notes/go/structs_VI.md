---
title: "Structs"
category: "Go"
tags: ["golang", "structs", "fundamentals"]
---

# Structs: Định nghĩa cấu trúc dữ liệu

Ngôn ngữ Go không sử dụng khái niệm Lớp (Class). Thay vào đó, chúng ta dùng **Struct** để tập hợp các mẩu dữ liệu có liên quan lại với nhau. Hãy coi Struct như một bản thiết kế kỹ thuật (blueprint) để mô tả một đối tượng trong thực tế.

---

## 1. Định nghĩa và Khởi tạo

```go
type User struct {
    ID       int
    Name     string
    Email    string
    IsActive bool `json:"is_active"` // Field tags: Metadata cho JSON hoặc Database
}

func main() {
    // Cách 1: Khởi tạo đầy đủ tên trường (Được khuyên dùng vì tính rõ ràng)
    u1 := User{
        ID:       1,
        Name:     "An",
        Email:    "an@example.com",
        IsActive: true,
    }

    // Cách 2: Khởi tạo theo thứ tự (Ngắn gọn nhưng dễ gây nhầm lẫn nếu Struct thay đổi)
    u2 := User{2, "Bình", "binh@example.com", false}
}
```

## 2. Truy cập và Hiệu chỉnh

Sử dụng toán tử dấu chấm `.` để truy cập hoặc thay đổi giá trị của các trường (fields).

```go
fmt.Println(u1.Name)
u1.IsActive = false
```

### So sánh Struct (Comparability)
Hai Struct có thể so sánh được bằng toán tử `==` nếu tất cả các trường bên trong chúng đều là kiểu dữ liệu có thể so sánh được.
-   **Có thể so sánh**: `int`, `string`, `bool`, `float`, con trỏ, Array.
-   **KHÔNG thể so sánh**: `slice`, `map`, `func`. Nếu Struct chứa một trong các kiểu này, phép so sánh `==` sẽ gây lỗi biên dịch.

---

## 3. Giải phẫu bộ nhớ (Memory Alignment & Padding)

Đây là kiến thức quan trọng để tối ưu hóa hiệu năng trong các hệ thống tải cao. Cách bạn sắp xếp thứ tự các trường sẽ ảnh hưởng đến dung lượng Struct chiếm dụng trong RAM.

### Cơ chế căn lề (Alignment)
CPU thường đọc dữ liệu theo từng khối (word) - ví dụ 8 bytes trên hệ điều hành 64-bit. Để tối ưu tốc độ đọc, các trường dữ liệu cần được "căn lề" vào đúng biên của khối.

```go
type BadStruct struct {
    A bool  // 1 byte
    B int64 // 8 bytes
    C bool  // 1 byte
} // Chiếm 24 bytes (Padding thêm 7 + 7 bytes)

type GoodStruct struct {
    B int64 // 8 bytes
    A bool  // 1 byte
    C bool  // 1 byte
} // Chiếm 16 bytes (Padding thêm 6 bytes)
```

**Nguyên tắc "vàng":** Luôn sắp xếp các trường có kích thước lớn ở phía trên và các trường nhỏ ở phía dưới để giảm thiểu **Padding**, giúp Struct nhỏ gọn hơn và tối ưu CPU Cache.

---

## 4. Ép kiểu Struct (Conversion Rules)

Bạn có thể ép kiểu giữa hai Struct khác nhau nếu chúng có cấu trúc các trường (tên, kiểu dữ liệu, thứ tự) hoàn toàn giống nhau.

```go
type Person struct {
    Name string
    Age  int
}

type Employee struct {
    Name string
    Age  int
}

p := Person{"An", 25}
e := Employee(p) // Hợp lệ vì cấu trúc tương đồng
```

Tuy nhiên, nếu Struct có **Field Tag** khác nhau, chúng vẫn được coi là hai cấu trúc khác biệt và cần ép kiểu thủ công hoặc dùng các thư viện mapping.

---

## 5. Empty Struct (`struct{}`) - Sức mạnh của 0-byte

`struct{}` là một kiểu dữ liệu đặc biệt không chiếm bất kỳ không gian bộ nhớ nào. Nó cực kỳ hữu ích trong các kịch bản tối ưu hóa:

1.  **Tín hiệu (Signals) trong Channels**: Dùng để thông báo một sự kiện đã xảy ra mà không cần truyền tải dữ liệu.
    ```go
    done := make(chan struct{})
    ```
2.  **Triển khai Set**: Dùng làm Value trong Map để tận dụng 0-byte (đã đề cập ở chương Maps).
3.  **Gán phương thức**: Bạn có thể định nghĩa phương thức cho một kiểu dữ liệu rỗng để đóng gói logic mà không cần lưu trữ trạng thái.

---

## 6. Sự kết hợp với Pointer

Khi làm việc với Struct, chúng ta thường xuyên sử dụng Pointer để tránh việc sao chép những khối dữ liệu lớn gây tốn bộ nhớ, đồng thời cho phép các Hàm có thể thay đổi trực tiếp dữ liệu gốc.

```go
func UpdateName(u *User, newName string) {
    u.Name = newName // Go sẽ tự động "giải tham chiếu" giúp bạn, thay vì phải viết (*u).Name
}
```

---

## 7. Struct ẩn danh (Anonymous Structs)

Dùng cho dữ liệu dùng một lần, thường thấy trong việc parse JSON phức tạp hoặc truyền dữ liệu vào Template/Unit Test.

```go
data := struct {
    Title string
    Count int
}{"Báo cáo", 10}
```
