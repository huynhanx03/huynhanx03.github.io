---
title: "OOP: tổ chức trạng thái, hành vi và hợp đồng"
category: "Fundamentals"
tags: ["oop", "programming", "fundamentals", "design-patterns"]
description: "Hiểu đóng gói, kế thừa, trừu tượng và đa hình qua các quyết định thiết kế và ví dụ Java."
updated: 2026-10-15
translationKey: "fundamentals/oop"
---

Một tài khoản ngân hàng có số dư. Nếu mọi nơi trong chương trình đều được gán lại số dư, quy tắc “chỉ nạp số tiền hợp lệ” sẽ phải được nhớ và kiểm tra ở từng nơi. Chỉ một chỗ quên kiểm tra cũng có thể làm đối tượng rơi vào trạng thái sai.

Lập trình hướng đối tượng (OOP) giúp tổ chức dữ liệu cùng những hành vi có trách nhiệm giữ dữ liệu hợp lệ. Bài này dùng Java để phân biệt đóng gói, kế thừa, trừu tượng và đa hình. Đó là những góc nhìn thiết kế có quan hệ với nhau; thuộc bốn tên gọi chưa đủ để quyết định chương trình nên có những class nào.

Các đoạn Java là ví dụ riêng. Đặt khai báo class/interface ở cấp ngoài cùng, method trong class chứa nó và các câu lệnh như `vehicle.honk()` trong `main`. Mỗi đoạn chỉ giữ phần cần cho quyết định đang giải thích.

## Đối tượng chịu trách nhiệm cho trạng thái của mình

Đối tượng có trạng thái, như số dư hiện tại, và hành vi, như nạp tiền. **Class** mô tả một kiểu đối tượng; **instance** là một đối tượng cụ thể được tạo từ class đó. Hai instance có thể cùng cách xử lý nhưng giữ trạng thái khác nhau.

OOP vẫn sử dụng câu lệnh và các bước xử lý. Điểm khác nằm ở cách phân chia trách nhiệm: thay vì để caller tự sửa mọi dữ liệu, một đối tượng cung cấp những thao tác có ý nghĩa trong miền bài toán.

```java
final class BankAccount {
    private long balance;

    public void deposit(long amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("amount must be positive");
        }
        balance = Math.addExact(balance, amount);
    }

    public long getBalance() {
        return balance;
    }
}
```

Ví dụ dùng số nguyên theo một đơn vị tiền đã thống nhất, không dùng `double` để minh họa tiền. `deposit(100)` đưa số dư từ 0 lên 100; `deposit(-5)` ném lỗi trước khi sửa trạng thái. `Math.addExact` cũng từ chối phép cộng vượt miền của `long`. Đây là đoạn class minh họa, chưa có đồng bộ cho nhiều thread hay lưu trữ giao dịch ngân hàng.

Field `private` giúp caller không thể tùy ý gán số dư. Quan trọng hơn, method giữ **invariant**: tính chất cần đúng ở các trạng thái hợp lệ của đối tượng. Với đơn hàng có `total = price * quantity`, việc đổi giá hoặc số lượng cũng phải giữ quan hệ ấy.

Đó là **đóng gói**: giữ dữ liệu và trách nhiệm cập nhật bên trong một ranh giới. Getter/setter không tự tạo ra thiết kế tốt; một setter cho phép gán bất kỳ số dư nào vẫn phá ý nghĩa của ranh giới này. Method nghiệp vụ như `deposit` diễn đạt ý định rõ hơn. Giảm phụ thuộc vào field nội bộ cũng giúp thay biểu diễn mà ít ảnh hưởng caller, nếu hợp đồng công khai được giữ.

## Kế thừa cần một hợp đồng thay thế hợp lý

```java
class Vehicle {
    public void honk() {
        System.out.println("Beep");
    }
}

class Car extends Vehicle {}

Vehicle vehicle = new Car();
vehicle.honk(); // Beep
```

`Car` kế thừa method `honk`, nên không cần viết lại cùng phần triển khai. Java cũng cho phép giữ `Car` qua biến kiểu `Vehicle`. **Kế thừa** vừa tạo quan hệ kiểu, vừa có thể chia sẻ phần triển khai; lợi ích tái sử dụng đi cùng sự phụ thuộc vào class cha.

Một quan hệ “is-a” trong đời sống chưa đủ chứng minh hợp đồng phần mềm phù hợp. Nếu class `Bird` hứa mọi instance đều bay được, `Ostrich` không thể thực hiện lời hứa đó. Tách khả năng bay thành một hợp đồng riêng có thể hợp lý hơn. Nếu mục tiêu chỉ là dùng lại một thành phần, hãy cân nhắc composition: giữ thành phần trong field và gọi nó, thay vì trở thành subtype của nó.

## Trừu tượng xác định điều caller cần biết

```java
interface Flyable {
    void fly();
}

abstract class Bird {
    abstract void sing();
}
```

**Trừu tượng** chọn những đặc điểm có ích cho mục đích đang xét và che phần triển khai chưa cần biết. Caller của `Flyable` cần một hành vi bay; nó không phải biết đối tượng là chim hay máy bay.

Interface và abstract class là hai công cụ biểu đạt, không phải định nghĩa duy nhất của trừu tượng. Abstract class có thể chia sẻ trạng thái và phần triển khai với subclass; interface thường diễn đạt một hợp đồng chung. Không nên quyết định chỉ bằng công thức “abstract class là nguồn gốc, interface là kỹ năng”: hãy xét hợp đồng, quan hệ kiểu và mức phụ thuộc. Khái niệm trừu tượng còn xuất hiện trong hàm, module và API, không chỉ trong OOP.

## Đa hình cho phép cùng lời gọi có triển khai khác nhau

```java
interface Animal {
    void makeSound();
}
class Dog implements Animal {
    public void makeSound() { System.out.println("Woof"); }
}
class Cat implements Animal {
    public void makeSound() { System.out.println("Meow"); }
}

static void performSound(Animal animal) {
    animal.makeSound();
}
```

Khai báo method `performSound` bên trong một class. Khi gọi nó với `new Dog()`, kết quả dự kiến là `Woof`; với `new Cat()`, là `Meow`. Caller dùng cùng hợp đồng `Animal`, còn triển khai method được chọn theo đối tượng thực tế.

Đây là đa hình qua subtype và lời gọi method instance trong Java. Trừu tượng giải thích vì sao caller chỉ cần biết hợp đồng; đa hình giải thích cách các triển khai khác nhau đáp ứng cùng lời gọi. Phân biệt này không có nghĩa mọi hình thức đa hình đều xảy ra ở runtime; thuật ngữ đa hình còn có phạm vi rộng hơn ví dụ đang xét. [Oracle mô tả cơ chế gọi method này](https://docs.oracle.com/javase/tutorial/java/IandI/polymorphism.html).

## Tự kiểm tra bằng một thay đổi thiết kế

Một class `Order` công khai cả `price`, `quantity` và `total`. Bạn thêm setter riêng cho từng field nhưng không cập nhật các field còn lại. Đóng gói đã bảo vệ tính nhất quán chưa?

Chưa. Khả năng truy cập field đã đổi, nhưng quy tắc giữa chúng chưa được bảo vệ. Có thể tính `total` từ hai đầu vào khi đọc hoặc cập nhật các giá trị qua method giữ invariant. Lựa chọn tùy yêu cầu lưu trữ và nghiệp vụ.

Nếu chỉ muốn dùng lại logger, có cần kế thừa logger không? Không nhất thiết: một field logger thường diễn đạt sự hợp tác rõ hơn. Hãy dùng quan hệ subtype khi caller thực sự có thể sử dụng đối tượng thay thế theo hợp đồng, không chỉ vì có vài method cần dùng lại.

Đọc tiếp [SOLID](/vi/notes/fundamentals/solid/) để xem các ranh giới này ảnh hưởng thay đổi phần mềm ra sao. [Oracle: Interfaces and Inheritance](https://docs.oracle.com/javase/tutorial/java/IandI/index.html) là nguồn đối chiếu cú pháp Java.
