---
title: "Lập trình hướng đối tượng"
category: "Fundamentals"
tags: ["oop", "programming", "fundamentals", "design-patterns"]
---

# Lập trình hướng đối tượng (OOP)

Lập trình hướng đối tượng (Object-Oriented Programming - OOP) là một triết lý thiết kế phần mềm lấy **Đối tượng** (Object) làm trung tâm. Thay vì tập trung vào các bước thực hiện lệnh (Imperative), OOP tập trung vào việc mô hình hóa các thực thể, dữ liệu và mối quan hệ giữa chúng.

---

## 1. Đóng gói (Encapsulation) - Bảo vệ sự toàn vẹn

**Bản chất:** Gom dữ liệu (Field) và hành vi (Method) vào một lớp (Class), đồng thời **che giấu** những chi tiết triển khai nội bộ thông qua cơ chế Access Modifiers (`private`, `protected`).

### Tại sao không nên để `public` bừa bãi?

Trong các hệ thống lớn, việc để thuộc tính là `public` (truy cập tự do từ mọi nơi) giống như việc giao chìa khóa nhà cho bất kỳ ai đi ngang qua. 

- **Vô tình phá vỡ logic (Accidental Corruption):** Code ở bất kỳ đâu cũng có thể gán giá trị sai cho biến mà không thông qua kiểm tra. Ví dụ: gán `age = -5` hoặc `balance = 999999999` cho một tài khoản vừa tạo.
- **Rò rỉ logic (Leaky Logic):** Nếu bên ngoài can thiệp trực tiếp vào dữ liệu, khi bạn muốn thay đổi cấu trúc dữ liệu bên trong (ví dụ đổi từ `int` sang `long` để tối ưu), bạn sẽ làm hỏng toàn bộ những chỗ đang gọi đến thuộc tính đó.
- **Mất tính nhất quán (Invariants):** Một đối tượng thường có những quy tắc ngầm (vd: `total = price * quantity`). Nếu `price` là public, ai đó đổi `price` mà không cập nhật `total` thì dữ liệu sẽ bị mâu thuẫn ngay lập tức.

**Giải pháp:** Luôn ưu tiên `private`. Chỉ lộ ra những gì thực sự cần thiết qua các "cửa khẩu" kiểm soát (Getter/Setter hoặc Business Methods).

```java
public class BankAccount {
    private double balance; // Dữ liệu được bảo vệ nghiêm ngặt

    public void deposit(double amount) {
        if (amount > 0) {
            balance += amount;
        }
    }

    public double getBalance() {
        return balance;
    }
}
```

---

## 2. Kế thừa (Inheritance) - Chia sẻ "Dòng máu" (Is-a)

**Bản chất:** Xây dựng mối quan hệ cha-con. Lớp con thừa hưởng đặc tính từ lớp cha để **Tái sử dụng code** (Reuse) mà không cần viết lại.

- **Điểm khác biệt:** Kế thừa tập trung vào việc kế thừa lại **Mã nguồn** và **Cấu trúc dữ liệu**. Nó tạo ra một hệ thống phân cấp chặt chẽ.
- **Rủi ro:** Gây ra sự phụ thuộc quá lớn vào lớp cha (**Tight Coupling**). Nếu cha sửa, con cũng "vỡ" theo.

```java
public class Vehicle {
    protected String brand = "Ford";
    public void honk() { System.out.println("Tuut, tuut!"); }
}

public class Car extends Vehicle {
    private String modelName = "Mustang";
}
// Car không cần viết lại hàm honk() nhưng vẫn có thể dùng nó.
```

---

## 3. Trừu tượng (Abstraction) - "Bản thiết kế/Hợp đồng"

**Bản chất:** Tập trung vào việc **Định nghĩa** đối tượng phải có những gì, thay vì làm như thế nào.

> - **Abstract Class:** Nó **LÀ** cái gì? (Nguồn gốc). Ví dụ: Chó, Mèo là Động vật. Ta dùng abs class để gom những đặc tính chung của tổ tiên.
> - **Interface:** Nó **LÀM** được gì? (Hành vi/Kỹ năng). Ví dụ: Chim và Máy bay đều có thể Bay (`Flyable`). Ta dùng interface cho những thực thể khác loài nhưng chung kỹ năng.

```java
// Interface: Kỹ năng "Làm được gì"
interface Flyable {
    void fly(); 
}

// Abstract Class: Nguồn gốc "Nó là gì"
abstract class Bird {
    abstract void sing();
}
```

---

## 4. Đa hình (Polymorphism) - "Biến hóa tại Runtime"

**Bản chất:** Cho phép một danh xưng chung (Interface/Parent) đại diện cho nhiều thực thể khác nhau, và mỗi thực thể tự chọn cách hành động tại thời điểm chạy.

### Phân biệt Trừu tượng (Abstraction) vs Đa hình (Polymorphism)

Rất nhiều người nhầm hai cái này là một. Hãy hiểu đơn giản:
- **Abstraction** là lúc ta **Lên kế hoạch** (Design-time). Ta nói: "Tôi cần một thứ có thể kêu (`makeSound`)".
- **Polymorphism** là lúc ta **Thực thi** (Run-time). Khi ta gọi lệnh `makeSound()`, hệ thống sẽ tự biết chọn âm thanh của Chó sủa hay Mèo kêu dựa trên biến thực tế đang giữ.

```java
public void performSound(Animal a) {
    // Abstraction cho phép ta viết hàm này mà không cần biết 'a' là con gì.
    // Polymorphism sẽ tự chọn đúng tiếng kêu của 'a' tại thời điểm chạy.
    a.makeSound(); 
}
```

---

### Bảng tóm tắt nhanh

| Trụ cột | Bản chất | Câu hỏi đại diện |
| :--- | :--- | :--- |
| **Đóng gói** | Bảo mật thông tin | Ai được quyền sờ vào dữ liệu này? |
| **Kế thừa** | Tái sử dụng "Gốc gác" | Nó có cùng dòng máu với cha không? |
| **Trừu tượng** | Thiết kế "Hợp đồng" | Nó LÀ gì (Abstraction) và LÀM được gì (Interface)? |
| **Đa hình** | Thực thi "Biến hóa" | Lúc chạy nó sẽ hành động ra sao? |
