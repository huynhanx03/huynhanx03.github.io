---
title: "SOLID: đặt ranh giới để phần mềm dễ thay đổi"
category: "Fundamentals"
tags: ["solid", "clean-code", "design-patterns", "architecture"]
description: "Hiểu năm nguyên tắc qua trách nhiệm, hợp đồng và hướng phụ thuộc; tránh áp dụng interface và chia class máy móc."
updated: 2026-10-15
translationKey: "fundamentals/solid"
---

Một service đăng ký người dùng vừa kiểm tra dữ liệu, lưu database, dựng HTML email và gọi nhà cung cấp gửi mail. Mỗi lần đổi mẫu thư lại phải đọc qua logic đăng ký. Vấn đề thiết kế bắt đầu rõ khi những lý do thay đổi khác nhau bị buộc vào cùng một chỗ.

SOLID là năm nguyên tắc giúp xem lại các ranh giới trách nhiệm và phụ thuộc. Chúng là công cụ suy nghĩ khi phần mềm thay đổi, không phải điều kiện đủ cho mọi kiến trúc tốt. Bài dùng các đoạn Java độc lập để giải thích quyết định, không cung cấp một ứng dụng hoàn chỉnh.

## S: nhóm phần thay đổi vì cùng một lý do

Single Responsibility không có nghĩa một class chỉ được có một method. Cần hỏi ai yêu cầu thay đổi và quy tắc nào đang được quản lý. Chính sách đăng ký và cách trình bày email có thể thay đổi độc lập, nên có lý do để tách.

`UserService.register` vẫn có thể điều phối việc đăng ký rồi gửi thông báo; nó không nhất thiết phải tự dựng HTML và nói chuyện với SMTP. Chuyển chi tiết gửi mail sang `EmailService` giúp thay nhà cung cấp mà không sửa quy tắc đăng ký. [Robert C. Martin diễn giải SRP](https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html) theo những nguồn yêu cầu thay đổi.

Tách class cũng có chi phí: nhiều tên, nhiều bước gọi, nhiều dependency. Nếu hai phần luôn thay đổi cùng nhau và chưa có nhu cầu độc lập, việc tách quá nhỏ có thể làm khó theo dõi hơn.

## O: chọn điểm mở rộng cần ổn định

```java
interface PaymentMethod {
    void pay(long amount);
}

final class PaymentService {
    public void process(PaymentMethod method, long amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("amount must be positive");
        }
        method.pay(amount);
    }
}

final class CreditCard implements PaymentMethod {
    public void pay(long amount) {
        // Phần adapter gọi nhà cung cấp thẻ được lược bỏ.
    }
}
```

Open/Closed hướng đến việc thêm cách thực hiện mà ít phải sửa phần xử lý đã ổn định. Với thiết kế dùng `if (type.equals(...))` bên trong `process`, mỗi loại thanh toán lại làm phương thức dài thêm. Qua `PaymentMethod`, một adapter mới có thể đáp ứng cùng hợp đồng.

Điều này không có nghĩa “thêm tính năng không được sửa bất kỳ code cũ nào”. Nơi chọn adapter, cấu hình, kiểm thử và quy tắc nghiệp vụ vẫn có thể phải đổi. Nếu chỉ có hai nhánh nhỏ ít thay đổi, interface có thể chưa đáng chi phí. Mở rộng theo điểm biến thiên thực tế, không tạo plugin cho mọi chỗ có `if`.

Ví dụ chỉ minh họa lời gọi; nó chưa xác định xử lý kết quả, lỗi mạng hoặc chống trừ tiền lặp. Muốn thay adapter thật, hợp đồng cần mô tả những điều đó.

## L: thay kiểu phải giữ lời hứa hành vi

Liskov Substitution xét điều caller được quyền dựa vào. Nếu `Bird.fly()` hứa bay được, một `Ostrich` ném `UnsupportedOperationException` chỉ vì không biết bay làm hợp đồng không còn đúng. Cách sửa là bỏ lời hứa bay khỏi kiểu chim chung hoặc dùng khả năng `Flyable` cho những kiểu đáp ứng được.

Điểm cần xét là hợp đồng, không phải cấm mọi exception ở subtype. Nếu API đã cho phép lỗi khi mất kết nối, adapter trả lỗi ấy chưa tự vi phạm LSP. Nhưng subtype yêu cầu thêm điều kiện đầu vào mà caller trước đây không cần đáp ứng, hoặc làm mất bảo đảm đầu ra, là dấu hiệu cần xem lại.

Bởi vậy, chung tên method chưa đủ chứng minh thay thế được nhau. Khi đổi implementation, cần xét cả ý nghĩa trạng thái và cách báo lỗi.

## I: caller chỉ phụ thuộc hành vi mình cần

```java
interface Workable { void work(); }
interface Eatable { void eat(); }

final class Robot implements Workable {
    public void work() { System.out.println("Working"); }
}

static void startShift(Workable worker) {
    worker.work();
}
```

Khai báo `startShift` bên trong class chứa ví dụ. Nó chỉ cần `work`, nên không phải phụ thuộc vào hợp đồng có cả `eat`. Robot không bị ép cài một method ăn vô nghĩa như khi dùng interface `Worker` quá rộng.

Interface Segregation tập trung vào nhu cầu của phía dùng. Có thể có một kiểu vừa `Workable` vừa `Eatable`; không cần ép tất cả implementation vào cùng một tập khả năng. Ngược lại, tách mỗi method thành một interface dù chúng luôn được dùng cùng nhau cũng có thể làm code rời rạc.

## D: chính sách không bị buộc vào chi tiết

```java
interface Switchable {
    void turnOn();
}

final class Switch {
    private final Switchable device;

    Switch(Switchable device) {
        this.device = java.util.Objects.requireNonNull(device);
    }

    void press() {
        device.turnOn();
    }
}
```

Nếu `Switch` tự tạo một `LightBulb` cụ thể, chính sách bật thiết bị bị buộc vào bóng đèn đó. Qua `Switchable`, caller có thể cung cấp bóng đèn hoặc thiết bị khác đáp ứng hợp đồng. Chi tiết thiết bị đi theo khả năng mà phía dùng cần.

Dependency Inversion nói về hướng phụ thuộc vào abstraction. Dependency Injection là một kỹ thuật cung cấp dependency, như constructor ở trên; dùng DI chưa tự bảo đảm ranh giới hợp lý. Không cần framework để truyền một đối tượng qua constructor.

Ví dụ “đổi MySQL sang PostgreSQL không sửa nghiệp vụ” cũng chỉ đúng trong phạm vi hợp đồng thật sự che được khác biệt. Kiểu dữ liệu, transaction, lỗi và truy vấn đặc thù có thể làm migration cần thay nhiều phần. Interface không tự xóa khác biệt ngữ nghĩa.

## Dùng SOLID để đặt câu hỏi khi sửa thiết kế

| Khi gặp tình huống | Câu hỏi nên đặt |
| --- | --- |
| Một yêu cầu kéo theo nhiều sửa đổi không liên quan | Có nhiều nguồn thay đổi bị gom chung không? |
| Mỗi biến thể mới phải sửa bộ điều phối | Có điểm mở rộng ổn định và thật sự cần thiết không? |
| Đổi implementation làm caller sai | Hợp đồng đầu vào, đầu ra hay lỗi đã bị thay đổi không? |
| Caller bị buộc biết nhiều method không dùng | Có thể thu hẹp hợp đồng theo nhu cầu không? |
| Chính sách khó tách khỏi database/provider | Chi tiết có thể đáp ứng hợp đồng do phía dùng cần không? |

**Tự kiểm tra.** Một repository chỉ có một implementation. Có bắt buộc thêm interface cho “đúng SOLID” không?

Không. Cần xét nhu cầu thay đổi, cách dùng và độ phức tạp thêm vào. Một interface có thể hữu ích dù hiện chỉ có một implementation, nhưng số implementation cũng không phải lý do tự động để thêm nó. Giải thích được ranh giới đang bảo vệ quan trọng hơn đạt đủ năm chữ cái.

[Bài OOP](/vi/notes/fundamentals/oop/) làm rõ các công cụ nền; [bài interface Go](/vi/notes/go/interfaces/) cho thấy cách diễn đạt hợp đồng ở phía dùng mà không dựa vào kế thừa class.
