---
title: "SOLID Principles"
category: "Fundamentals"
tags: ["solid", "clean-code", "design-patterns", "architecture"]
---

# 5 Nguyên lý SOLID

SOLID là tập hợp 5 nguyên lý thiết kế phần mềm giúp mã nguồn linh hoạt, dễ hiểu và dễ bảo trì. Đây là nền tảng của mọi kiến trúc phần mềm chuyên nghiệp.

---

## S - Single Responsibility Principle

**Nguyên lý đơn trách nhiệm**

-   **Tư duy:** Một class chỉ nên làm một việc duy nhất và có một lý do duy nhất để thay đổi.
-   **Vấn đề:** Nếu class làm quá nhiều việc (vừa xử lý Logic, vừa ghi Log), khi bạn đổi cách ghi Log, toàn bộ logic nghiệp vụ cũng bị ảnh hưởng.

```java
// VI PHẠM: Class làm quá nhiều việc
class UserService {
    void register() { /* Đăng ký */ }
    void sendEmail() { /* Gửi mail */ }
}

// TUÂN THỦ: Tách biệt trách nhiệm
class UserService {
    void register() { /* Chỉ lo đăng ký */ }
}
class EmailService {
    void send() { /* Chỉ lo gửi mail */ }
}
```

---

## O - Open/Closed Principle

**Mở để mở rộng, đóng để sửa đổi**

-   **Tư duy:** Bạn có thể thêm tính năng mới (mở) mà không cần phải sửa đổi mã nguồn cũ (đóng).
-   **Giải pháp:** Thêm Class mới kế thừa Interface thay vì dùng `if/else` để sửa logic hiện tại.

```java
// VI PHẠM: Thêm loại thanh toán mới phải vào sửa hàm process()
class PaymentService {
    void process(String type) {
        if (type.equals("CreditCard")) { /* ... */ }
    }
}

// TUÂN THỦ: Thêm Momo/Zalo chỉ cần tạo Class mới
interface PaymentMethod {
    void pay();
}
class CreditCard implements PaymentMethod {
    public void pay() { /* ... */ }
}
```

---

## L - Liskov Substitution Principle

**Nguyên lý thay thế Liskov**

-   **Tư duy:** Class con phải thay thế được class cha mà không làm hỏng chương trình.
-   **Vấn đề:** Nếu class con phá vỡ hành vi mà cha đã thiết lập (vd: ném lỗi ở hàm mà cha vốn chạy được), bạn đã vi phạm LSP.

```java
// SAI LẦM: Đà điểu là Chim nhưng lại không biết bay
class Bird {
    void fly() { /* Bay... */ }
}
class Ostrich extends Bird {
    @Override
    void fly() {
        throw new UnsupportedOperationException("Không biết bay!");
    }
}
```

---

## I - Interface Segregation Principle

**Phân tách Interface**

-   **Tư duy:** Đừng ép class phải implement những hàm mà nó không sử dụng.
-   **Giải pháp:** Chia một Interface lớn thành nhiều Interface nhỏ, đúng mục đích.

```java
// VI PHẠM: Robot không biết ăn nhưng vẫn phải có hàm eat()
interface Worker {
    void work();
    void eat();
}

// TUÂN THỦ: Chia nhỏ
interface Workable { void work(); }
interface Eatable { void eat(); }

class Robot implements Workable { /* Chỉ làm, không ăn */ }
```

---

## D - Dependency Inversion Principle

**Đảo ngược phụ thuộc**

-   **Tư duy:** Các module không nên phụ thuộc trực tiếp vào nhau, mà nên phụ thuộc qua Interface (Abstraction).
-   **Lợi ích:** Dễ dàng thay đổi thành phần bên dưới (vd: đổi từ MySQL sang Postgres) mà không cần sửa logic chính.

```java
// VI PHẠM: Switch phụ thuộc cứng vào LightBulb
class Switch {
    private LightBulb bulb; 
}

// TUÂN THỦ: Phụ thuộc vào Interface
class Switch {
    private Switchable device; // Có thể bật bất cứ thứ gì Switchable
}
interface Switchable {
    void turnOn();
}
```
