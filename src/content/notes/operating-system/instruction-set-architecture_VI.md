---
title: "Lệnh máy và ISA: hợp đồng giữa phần mềm với CPU"
category: "Operating System"
tags: ["computer architecture", "isa", "machine code"]
description: "Hiểu lệnh máy, thanh ghi, bộ nhớ và vì sao chương trình cần một giao diện kiến trúc rõ ràng."
updated: 2026-10-16
translationKey: "operating-system/instruction-set-architecture"
---

CPU không thực thi trực tiếp ý tưởng “tính tổng danh sách” hay “mở cửa sổ”. Nó thực hiện những thao tác nhỏ được mã hóa thành lệnh máy: cộng hai giá trị, nạp dữ liệu từ bộ nhớ, so sánh, hoặc chuyển điều khiển sang một vị trí khác.

Tập lệnh mà phần mềm có thể dựa vào được gọi là **Instruction Set Architecture (ISA)**. ISA là một hợp đồng: nó mô tả những trạng thái và thao tác mà phần mềm nhìn thấy, còn vi kiến trúc là cách một CPU cụ thể thực hiện hợp đồng đó.

## Chương trình trở thành chuỗi lệnh

Ví dụ, một ngôn ngữ cấp cao có biểu thức:

```c
sum = a + b;
```

Compiler có thể biến nó thành một chuỗi thao tác gần với dạng minh họa sau:

```text
load r1, [address_of_a]
load r2, [address_of_b]
add  r3, r1, r2
store [address_of_sum], r3
```

Đây là mã giả; tên lệnh và quy tắc thật thay đổi theo ISA. Ý chính là phép tính có thể cần đọc dữ liệu, tính trong CPU, rồi ghi kết quả. Compiler được quyền chọn cách khác nếu vẫn bảo toàn ý nghĩa chương trình.

## Trạng thái mà lệnh máy thao tác

Một CPU có trạng thái kiến trúc, thường gồm:

- **Program counter (PC):** vị trí lệnh tiếp theo theo mô hình ISA.
- **Thanh ghi:** các ô lưu trữ nhỏ, nằm ngay trong CPU và được lệnh sử dụng.
- **Cờ trạng thái:** ghi nhận kết quả như bằng không hoặc tràn, tùy ISA.
- **Bộ nhớ:** nơi chứa lệnh và dữ liệu mà lệnh có thể truy cập theo các quy tắc nhất định.

Lệnh số học thường thao tác với thanh ghi. Lệnh load đọc từ bộ nhớ vào thanh ghi; lệnh store ghi từ thanh ghi ra bộ nhớ. Không phải ISA nào cũng cho phép mọi phép toán trực tiếp trên ô nhớ.

PC không phải lúc nào cũng chỉ tăng một đơn vị đơn giản. Lệnh nhảy có điều kiện, gọi hàm, trả về và ngắt có thể thay đổi luồng điều khiển. Kích thước lệnh và quy tắc tăng PC phụ thuộc ISA.

## ISA định nghĩa nhiều hơn tên lệnh

Để hai chương trình và CPU hiểu nhau, ISA cần quy định cách biểu diễn lệnh và dữ liệu, thanh ghi nhìn thấy được, chế độ địa chỉ, hành vi của phép toán, cách xử lý một số sự kiện và mô hình truy cập bộ nhớ ở mức kiến trúc.

Ví dụ, hai lệnh “load” có thể khác nhau ở kích thước dữ liệu, dấu/không dấu, căn chỉnh hay cách tính địa chỉ. Một ISA cũng có thể quy định phép toán tràn tạo kết quả nào hoặc cờ nào được cập nhật. Những chi tiết này ảnh hưởng compiler, hệ điều hành và phần mềm mức thấp.

## ISA khác với vi kiến trúc

ISA nói **CPU phải thể hiện hành vi gì**. Vi kiến trúc nói **CPU tổ chức phần cứng ra sao để thực hiện hành vi đó**.

Hai bộ xử lý khác nhau có thể cùng thực hiện một ISA nhưng khác số lõi, độ sâu pipeline, kích thước cache, khả năng thực thi ngoài thứ tự và mức tiêu thụ điện. Vì vậy, cùng một chương trình máy có thể chạy trên cả hai nhưng đạt hiệu năng khác nhau.

Ngược lại, một chương trình biên dịch cho ISA này thường không chạy trực tiếp trên ISA khác nếu không có biên dịch lại hoặc lớp chuyển dịch. Hệ điều hành và ABI còn đặt thêm quy ước về gọi hàm, định dạng tệp thực thi và giao tiếp với thư viện; ISA không tự định nghĩa toàn bộ môi trường chương trình.

### Một ví dụ mã hóa lệnh

Hãy tưởng tượng ISA đồ chơi có lệnh dài 16 bit, 4 thanh ghi, cùng một bit chọn kiểu lệnh. Một phép cộng dạng thanh ghi có thể mã hóa `mode + opcode + source1 + source2 + destination`; phần bit không dùng được điền 0. Dạng immediate có thể dùng byte thứ hai làm hằng số thay vì thanh ghi thứ hai. Lệnh `add r1, 5, r2` vì thế khác cấu trúc bit với `add r1, r3, r2`, dù cả hai đều mang mnemonic `add`.

Ví dụ này cho thấy mnemonic chỉ là cách viết dễ đọc; CPU giải mã trường bit theo định dạng ISA. Số bit dành cho opcode giới hạn số thao tác có thể mã hóa, còn số bit dành cho trường thanh ghi giới hạn số thanh ghi được định danh. ISA thật có thể dùng định dạng phức tạp hơn, độ dài lệnh thay đổi và quy ước khác; không suy ra encoding của x86 hay ARM từ mô hình đồ chơi.

## Vì sao có lệnh đặc quyền?

Nếu ứng dụng bình thường có thể tùy ý sửa bảng ánh xạ bộ nhớ, cấu hình thiết bị hay trạng thái của tiến trình khác, một lỗi nhỏ cũng có thể làm hỏng cả máy. CPU vì vậy thường có các mức quyền hoặc chế độ thực thi. Một số thao tác chỉ được thực hiện ở chế độ đặc quyền.

Khi ứng dụng cần dịch vụ như tạo tiến trình hoặc truy cập tệp, nó đi qua system call. Cơ chế chuyển quyền được CPU hỗ trợ; kernel kiểm tra tham số và quyền trước khi thực hiện. Đây là điểm gặp nhau giữa ISA và thiết kế hệ điều hành.

## Tóm tắt

- ISA là hợp đồng phần mềm có thể dựa vào khi chạy trên CPU.
- Lệnh máy thao tác với PC, thanh ghi, bộ nhớ và trạng thái kiến trúc.
- Compiler biến ý nghĩa của chương trình thành lệnh phù hợp với ISA.
- Nhiều vi kiến trúc có thể cùng triển khai một ISA nhưng hiệu năng khác nhau.
- Cơ chế đặc quyền giúp kernel bảo vệ tài nguyên khỏi chương trình thông thường.

## Tự kiểm tra

**ISA có nói CPU dùng pipeline dài bao nhiêu tầng không?** Không; đó thường là chi tiết vi kiến trúc.

**Hai CPU cùng ISA có bắt buộc chạy chương trình với tốc độ như nhau không?** Không. Cache, lõi, pipeline, xung nhịp và nhiều yếu tố khác có thể khác.

**ISA có đồng nghĩa với ngôn ngữ lập trình không?** Không. Ngôn ngữ lập trình là cách biểu đạt chương trình ở mức cao hơn; compiler có thể dịch nó thành lệnh của một ISA.

## Đọc tiếp

Ở bài [CPU thực thi chương trình](/vi/notes/operating-system/cpu-execution/), ta sẽ lần theo chu kỳ lấy lệnh, giải mã và thực thi.
