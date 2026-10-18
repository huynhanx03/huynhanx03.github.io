---
title: "Superscalar và thực thi ngoài thứ tự"
category: "Operating System"
tags: ["cpu", "superscalar", "out-of-order", "computer architecture"]
description: "Hiểu issue nhiều lệnh mỗi chu kỳ, register renaming, reorder buffer và cách CPU giữ kết quả kiến trúc đúng."
updated: 2026-10-16
translationKey: "operating-system/superscalar-out-of-order-execution"
---

Pipeline cho phép chồng lấp lệnh; **superscalar** cho phép CPU phát hành nhiều micro-operation trong cùng chu kỳ nếu có đủ đơn vị thực thi và lệnh độc lập. Đây là cách tăng instruction-level parallelism (ILP) mà không yêu cầu lập trình viên viết thread riêng cho từng phép toán.

## Tìm lệnh độc lập

```text
a = b + c
d = e * f
g = a + d
```

Hai phép tính đầu độc lập, có thể chạy song song nếu CPU có đơn vị phù hợp. Phép tính cuối phụ thuộc cả hai nên phải đợi kết quả. CPU nhìn một cửa sổ lệnh để tìm công việc khả thi; dependency thật đặt giới hạn trên.

## Nhiều execution unit cần băng thông dữ liệu

Có hai ALU chưa đủ để chạy hai lệnh cùng lúc. Chúng phải lấy operand và ghi kết quả đồng thời. Nếu mỗi lệnh đọc hai toán hạng và ghi một kết quả, hai ALU có thể cần bốn read port và hai write port tới register file trong cùng chu kỳ. Thêm port làm register file tốn diện tích và có thể tăng thời gian truy cập; vì thế thiết kế thực tế cân bằng độ rộng issue với số port, loại execution unit và cách chia register file. Lệnh số nguyên, dấu phẩy động, load/store và branch thường đi tới các đơn vị phù hợp khác nhau.

## Instruction window và điều kiện phát lệnh

Front end thường đưa lệnh đã giải mã vào các buffer; execution unit phía sau lấy lệnh khi toán hạng và tài nguyên sẵn sàng. Tách hai phần này giúp CPU hấp thụ lúc fetch/decode bị hụt trong thời gian ngắn, miễn là buffer còn lệnh. Dispatch thường giữ thứ tự chương trình để cấp chỗ theo dõi cho từng lệnh; issue mới có thể đổi thứ tự giữa các đơn vị thực thi; retirement/commit quay lại thứ tự ban đầu.

Một lệnh chỉ dispatch được khi còn chỗ trong ROB, reservation station phù hợp, rename register cần thiết và execution unit/slot có thể nhận việc. Vì vậy, độ rộng decode hay số ALU riêng lẻ không quyết định số lệnh chạy được mỗi chu kỳ. Instruction window rộng cho CPU nhìn xa hơn nhưng tốn diện tích/điện; kích thước buffer cần cân với độ sâu pipeline và số lệnh đang bay.

### Gộp operation để giảm áp lực cửa sổ lệnh

Một lệnh ISA có thể được decode thành nhiều micro-op. Với một số cặp như tính địa chỉ ghi và chuẩn bị dữ liệu ghi, hoặc load rồi tính trên dữ liệu vừa load, CPU có thể **micro-op fusion**: front end theo dõi chúng như một mục trong queue/ROB, nhưng backend vẫn thực thi các phần trên đơn vị phù hợp. Hai phần của store có thể chạy song song; load-op phải đợi load xong mới tính. Nhờ vậy một instruction window hữu hạn có thể theo dõi nhiều lệnh ISA hơn, giảm bookkeeping và decode pressure. Chi tiết lệnh nào được fusion tùy vi kiến trúc.

Một kỹ thuật khác là **macro-fusion**: trước decode, một số cặp lệnh ISA như compare/test theo sau bởi conditional branch được xử lý thành một macro-operation. Nó giảm số mục cần dispatch/retire và bớt áp lực front end, nhưng chỉ áp dụng cho một số mẫu lệnh và điều kiện cụ thể. Hai kỹ thuật có tên gần nhau nhưng fusion ở các giai đoạn khác nhau.

### Case study: dispatch theo nhóm

PowerPC 970/G5 gom các operation nội bộ thành nhóm năm lệnh để dispatch và hoàn tất cùng nhau. Điều này giúp theo dõi nhóm thay vì từng operation trong một backend có rất nhiều lệnh đang bay. Đổi lại, quy tắc vị trí branch, giới hạn loại lệnh trong từng slot, chỗ trống ở issue queue, rename register và chỗ trong completion table có thể khiến cả nhóm phải đợi hoặc chứa slot rỗng. Đây là **internal fragmentation** của dispatch group: backend rộng nhưng tài nguyên nhóm không được lấp đầy vẫn làm giảm thông lượng. Đây là ví dụ lịch sử cụ thể; bài học chung là batching giúp giảm bookkeeping nhưng có thể hy sinh độ linh hoạt.

## Register renaming

Tên register ISA hữu hạn có thể bị tái sử dụng giữa các lệnh. Nếu lệnh sau ghi cùng register mà lệnh trước cũng ghi nhưng không đọc giá trị cũ, đó là false dependency WAR/WAW theo register name. Register renaming map tên kiến trúc sang physical register riêng, loại bỏ một số phụ thuộc giả.

Phụ thuộc RAW (lệnh sau đọc kết quả lệnh trước) là phụ thuộc dữ liệu thật, không thể xóa bằng renaming.

## Reorder buffer và retirement

CPU ngoài thứ tự có thể thực thi lệnh nào đủ operand trước, dù lệnh trước đang chờ memory. Reorder buffer giữ kết quả và trạng thái để commit theo thứ tự kiến trúc. Nếu branch prediction sai hoặc exception xảy ra, CPU loại bỏ phần kết quả đầu cơ chưa commit.

Retirement theo thứ tự giúp trạng thái kiến trúc trông như chương trình chạy tuần tự, dù nội bộ chạy khác. Side channel/speculative execution là vấn đề bảo mật riêng: kết quả bị rollback vẫn có thể để lại dấu vết microarchitectural trong cache.

## Hình dạng khác nhau của CPU superscalar

Hai thiết kế có thể cùng chạy superscalar nhưng dùng ngân sách transistor khác nhau. Một thiết kế **rộng và nông** dùng nhiều execution unit và pipeline ngắn; thiết kế **hẹp và sâu** dùng pipeline dài, nhiều lệnh đang bay và buffer lớn để duy trì dòng lệnh. Đây là cách mô tả hai thiết kế lịch sử trong sách (PowerPC G4e và Pentium 4), không phải phân loại cứng của CPU hiện đại. Pipeline sâu có thể tăng clock nhưng làm flush và refill đắt hơn; pipeline rộng cần đủ ILP và băng thông cấp phát/phát lệnh để tận dụng các unit.

Pentium 4 từng dùng **trace cache** để lưu chuỗi micro-op đã decode, có cả đường nhánh được dự đoán nối vào trace. Khi hit, CPU tránh lặp lại decode x86 cho đoạn code đó; khi miss, lại fetch/decode và tạo trace. Đây là một thiết kế lịch sử cụ thể, khác instruction cache thông thường; nguyên lý tổng quát là cache kết quả decode để giảm áp lực front end. Số liệu và tên cấu trúc phụ thuộc thế hệ, không nên suy ra mọi CPU dùng trace cache.

## Giới hạn ILP

Branch sai, cache miss, dependency chain, register pressure và resource contention giảm khả năng issue song song. Tăng độ rộng superscalar tăng chi phí năng lượng/diện tích và thường có lợi ích giảm dần vì chương trình không có đủ lệnh độc lập.

### Load/store có thể đổi thứ tự, nhưng phải giữ nghĩa chương trình

Địa chỉ của một store có thể chưa tính xong trong khi load phía sau đã biết địa chỉ. Nếu CPU đợi mọi store trước đó chỉ để chắc rằng chúng không đụng cùng địa chỉ, nó có thể bị **false aliasing**: hai truy cập bị xem như xung đột dù thật ra độc lập. Một số vi kiến trúc dự đoán quan hệ này để cho load chạy sớm; khi địa chỉ store được làm rõ, CPU kiểm tra lại. Nếu load đã đọc nhầm dữ liệu vì thực sự alias, các operation phụ thuộc bị hủy/replay với dữ liệu đúng. Kết quả kiến trúc vẫn phải retire đúng thứ tự và đúng quy tắc memory model; thực thi sớm không cho phép chương trình quan sát một thứ tự bất hợp lệ.

## Tóm tắt

- Superscalar issue nhiều operation trong chu kỳ khi có tài nguyên và dependency phù hợp.
- Register renaming loại WAR/WAW giả, không loại RAW thật.
- Out-of-order execution khai thác ILP; reorder buffer giúp retire theo thứ tự kiến trúc.
- Speculative result có thể rollback nhưng side channel vẫn tạo rủi ro bảo mật.
- Dependency chain, branch và memory latency giới hạn speedup.

## Tự kiểm tra

**CPU có thể chạy lệnh `g = a+d` trước khi `a,d` sẵn sàng?** Không; dependency dữ liệu cần hoàn tất.

**Register renaming làm mọi dependency biến mất?** Không; RAW vẫn là phụ thuộc thật.

**Rollback speculation nghĩa không có bất kỳ dấu vết nào?** Không; cache/microarchitecture có thể giữ side effect quan sát được.

## Đọc tiếp

Cache và memory hierarchy quyết định nhiều lệnh load có sẵn dữ liệu đúng lúc hay không.
