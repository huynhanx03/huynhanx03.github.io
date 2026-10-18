---
title: "CPU thực thi chương trình: từ PC đến kết quả"
category: "Operating System"
tags: ["cpu", "instruction cycle", "computer architecture"]
description: "Theo dấu một chuỗi lệnh qua program counter, thanh ghi, bộ nhớ và luồng điều khiển."
updated: 2026-10-17
translationKey: "operating-system/cpu-execution"
---

Ta thường nói “CPU chạy chương trình”, nhưng câu đó gói gọn một chuỗi sự kiện. CPU phải tìm lệnh tiếp theo, hiểu lệnh yêu cầu gì, lấy dữ liệu cần thiết, thực hiện phép toán rồi xác định bước kế tiếp. Mô hình này giúp đọc sơ đồ kiến trúc và hiểu vì sao truy cập bộ nhớ có thể ảnh hưởng mạnh đến thời gian chạy.

## Chu kỳ lệnh ở mức khái niệm

Một mô hình đơn giản gồm các bước:

1. **Fetch:** dùng PC để tìm lệnh.
2. **Decode:** xác định loại thao tác và toán hạng.
3. **Read operands:** lấy dữ liệu cần thiết từ thanh ghi hoặc bộ nhớ.
4. **Execute:** thực hiện phép toán hoặc tính địa chỉ.
5. **Write back:** ghi kết quả vào thanh ghi hoặc bộ nhớ.
6. **Update control flow:** chọn lệnh tiếp theo, có thể là lệnh kế tiếp hoặc địa chỉ nhảy.

Đây là cách phân tích, không nhất thiết là thứ tự tuần tự mà mọi CPU hiện đại dùng. CPU có thể chồng lấp nhiều lệnh, thực thi ngoài thứ tự và đổi tên thanh ghi bên trong, miễn kết quả quan sát được phù hợp với hợp đồng kiến trúc.

Trong một ISA đồ chơi có lệnh dài 2 byte, PC có thể tăng 2 sau mỗi lần fetch để trỏ tới lệnh kế tiếp. Lệnh nhảy được thực thi bằng cách ghi địa chỉ đích vào PC thay vì giữ giá trị tuần tự đó. Lệnh số học có thể cập nhật các bit trạng thái như zero, negative hoặc overflow; lệnh nhảy có điều kiện đọc các bit ấy để chọn đường đi. Đây là mô hình trực quan; ISA thực tế khác nhau về độ dài lệnh, cờ và cách tính địa chỉ nhánh.

## Một ví dụ từng bước

Giả sử hai giá trị đã nằm trong thanh ghi `r1`, `r2`, và chương trình muốn cộng rồi so sánh:

```text
add  r3, r1, r2
cmp  r3, 10
beq  equal_case
```

Lệnh `add` đọc hai toán hạng, tính tổng và ghi vào `r3`. `cmp` đánh giá quan hệ giữa `r3` với 10, có thể cập nhật trạng thái kiến trúc. `beq` dùng trạng thái đó để quyết định có đổi PC sang `equal_case` hay tiếp tục theo luồng bình thường.

Một ISA khác có thể mã hóa so sánh và nhảy theo cách khác. Vì vậy, ví dụ này giải thích vai trò của lệnh, không đại diện chính xác cho mọi CPU.

## Khi dữ liệu chưa ở thanh ghi

Nếu lệnh cần dữ liệu trong RAM, CPU phải thực hiện một lần truy cập bộ nhớ. Trước đó dữ liệu có thể đã nằm trong cache gần lõi nên nhanh hơn nhiều so với việc đi tới RAM. Nếu không có, CPU có thể phải chờ dữ liệu về hoặc tiếp tục làm việc khác nếu vi kiến trúc cho phép.

Cache miss không đồng nghĩa với page fault: cache miss cho biết dữ liệu không có trong tầng cache đang kiểm tra; page fault liên quan đến việc trang ảo có được ánh xạ, đang cư trú trong RAM và được phép truy cập hay không.

Điều này giải thích vì sao hai đoạn code có cùng số phép cộng vẫn có thời gian khác nhau. Một đoạn liên tục đọc dữ liệu gần nhau có thể tận dụng cache; đoạn kia truy cập ngẫu nhiên trên vùng lớn có thể thường xuyên chờ bộ nhớ. Số lệnh là một phần của hiệu năng, không phải toàn bộ câu chuyện.

## Lệnh nhảy làm thay đổi đường đi

Lệnh tuần tự giúp CPU đoán vị trí kế tiếp dễ dàng: thường là lệnh sau lệnh hiện tại. Lệnh nhảy có điều kiện khiến đường đi phụ thuộc dữ liệu. CPU hiện đại thường dự đoán nhánh để bắt đầu làm việc sớm; nếu dự đoán sai, một phần công việc đầu cơ có thể bị loại bỏ và CPU phải khôi phục trạng thái phù hợp.

Không nên rút gọn điều này thành “mọi if đều chậm”. Hiệu quả còn phụ thuộc khả năng dự đoán, dữ liệu, trình biên dịch và phần cứng. Tối ưu nhánh chỉ nên dựa vào phép đo trên workload thực.

## Từ mô hình tuần tự đến pipeline

Nếu mỗi lệnh phải hoàn tất đủ sáu bước rồi CPU mới bắt đầu lệnh kế, nhiều phần cứng sẽ nhàn rỗi. Pipeline chia công việc thành giai đoạn để các lệnh khác nhau cùng hiện diện ở các giai đoạn khác nhau. Ví dụ, khi lệnh A đang thực thi, lệnh B có thể được giải mã và lệnh C đang được lấy.

Pipeline tăng khả năng hoàn thành nhiều lệnh theo thời gian, nhưng không làm độ trễ của mọi lệnh biến mất. Phụ thuộc dữ liệu, nhánh, cache miss và tranh chấp tài nguyên có thể khiến pipeline phải chờ. Bài sau sẽ đi sâu vào pipeline và các hazard.

## CPU không nhất thiết chạy đúng thứ tự nội bộ

Một CPU ngoài thứ tự có thể bắt đầu lệnh sau trước khi lệnh trước hoàn tất, nếu chúng độc lập và có tài nguyên sẵn. Ví dụ phép cộng hai số có thể hoàn thành trong lúc một phép load đang chờ RAM. CPU vẫn phải làm cho chương trình quan sát được hành vi kiến trúc đúng, thường bằng cách hoàn tất/commit kết quả theo các quy tắc được thiết kế.

Vì vậy, “thứ tự code” và “thứ tự mạch xử lý” không luôn giống nhau. Lập trình đa luồng còn cần mô hình bộ nhớ và đồng bộ để xác định khi nào thay đổi của một lõi được lõi khác nhìn thấy. Đây là lý do chương concurrency không thể chỉ dựa vào việc nhìn thứ tự dòng lệnh.

## Tóm tắt

- PC xác định luồng điều khiển; lệnh đọc và ghi trạng thái kiến trúc.
- Fetch/decode/execute là mô hình hữu ích, không phải lịch hoạt động chính xác của CPU hiện đại.
- Cache và bộ nhớ ảnh hưởng thời gian chờ dữ liệu.
- Pipeline chồng lấp công việc; hazard có thể làm nó phải dừng.
- CPU có thể xử lý nội bộ ngoài thứ tự nhưng phải giữ hành vi kiến trúc đúng.

## Tự kiểm tra

**Mỗi lệnh luôn chạy tuần tự từ fetch đến write-back rồi mới bắt đầu lệnh sau?** Không. Đó là mô hình cơ bản; CPU hiện đại thường chồng lấp và tối ưu thứ tự nội bộ.

**Cùng số phép toán có nghĩa là cùng tốc độ?** Không. Truy cập bộ nhớ, nhánh, cache, mức song song và nhiều yếu tố khác cũng ảnh hưởng.

**CPU thực thi ngoài thứ tự có làm chương trình nhìn thấy kết quả sai thứ tự không?** Thiết kế CPU phải bảo toàn hành vi kiến trúc; nhưng chia sẻ bộ nhớ giữa các luồng vẫn cần quy tắc đồng bộ phù hợp.

## Đọc tiếp

Tiếp theo: [Pipeline và hazard trong CPU](/vi/notes/operating-system/cpu-pipeline/).
