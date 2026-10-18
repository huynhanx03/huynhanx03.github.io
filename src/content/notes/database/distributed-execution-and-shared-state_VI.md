---
title: "Thực thi đồng thời và state dùng chung trong hệ phân tán"
category: "Database"
description: "Theo dõi cách các thứ tự xen kẽ làm thay đổi kết quả, rồi nối vấn đề concurrency ở một máy với state qua mạng."
updated: 2026-10-17
translationKey: "database/distributed-execution-and-shared-state"
---

Một chương trình chạy tuần tự có một lịch sử thực thi khá dễ đọc: đọc giá trị, tính toán, ghi kết quả. Khi hai luồng cùng sửa một biến, từng thao tác vẫn có thể đúng riêng lẻ nhưng kết quả cuối lại phụ thuộc vào thứ tự chúng xen kẽ. Cùng vấn đề đó xuất hiện trong database phân tán, nơi mỗi node có state cục bộ và phải trao đổi thay đổi qua message.

Trong mô hình phân tán, một **participant** (còn gọi là process, node hoặc replica) giữ state riêng. Các participant trao đổi message qua link; mỗi process có thể dùng physical clock hoặc logical clock. Một distributed algorithm mô tả vai trò, state, bước chuyển, message được gửi, giả định về timing/link và loại lỗi mà nó chịu được. Những chi tiết này là một phần của thuật toán, không phải phần triển khai có thể bỏ qua.

Scale up tăng CPU, RAM hoặc storage của một máy; scale out chia công việc qua nhiều máy. Scale out có thể tăng capacity và availability, nhưng tạo communication, coordination và partial failure mà máy đơn không có cùng dạng. Nhiều database hiện đại là cluster vì những giới hạn đó, nên “chạy trên nhiều node” luôn cần mô hình rõ về state và failure.

## Các thành phần và giả định của distributed algorithm

## Một phép cộng có thể bị ghi đè

Giả sử `x = 1`. Luồng A muốn cộng 2; luồng B muốn nhân 2. Nếu mỗi phép toán gồm ba bước riêng — đọc `x`, tính kết quả, ghi `x` — ta có thể gặp lịch sử sau:

| Bước | Luồng A: cộng 2 | Luồng B: nhân 2 | Giá trị được ghi |
| --- | --- | --- | --- |
| 1 | Đọc `x = 1` |  |  |
| 2 |  | Đọc `x = 1` |  |
| 3 | Tính `1 + 2 = 3` |  |  |
| 4 |  | Tính `1 × 2 = 2` |  |
| 5 | Ghi `3` |  | 3 |
| 6 |  | Ghi `2` | 2 |

Kết quả cuối là 2: phép cộng bị ghi đè. Nếu B đọc và ghi xong trước khi A bắt đầu, kết quả là 4. Nếu A chạy trước B, kết quả là 6. Một lịch xen kẽ khác có thể cho 3. Vậy chương trình có thể cho nhiều kết quả dù input giống nhau; “cả hai luồng đều chạy xong” chưa nói gì về tính đúng đắn.

Đây cũng là cách nhìn hữu ích về lost update trong database. Hai transaction đọc cùng một phiên bản, tính từ dữ liệu cũ rồi ghi đè lẫn nhau. Khóa, atomic operation, optimistic validation hoặc một isolation level phù hợp có thể loại bỏ những lịch sử không được phép.

## Concurrent không nhất thiết là parallel

Hai tác vụ **concurrent** khi khoảng thời gian thực hiện của chúng chồng lấn: tác vụ này chưa xong thì tác vụ kia đã bắt đầu. Trên một CPU, hệ điều hành có thể luân phiên từng bước giữa chúng; chúng vẫn concurrent dù tại một thời điểm chỉ có một bước thực sự chạy.

Hai tác vụ **parallel** khi bước của chúng thực sự chạy cùng lúc trên nhiều lõi hoặc bộ xử lý. Parallel execution luôn có concurrency, nhưng concurrency không đòi hỏi parallelism. Phân biệt này giúp ta không nhầm lỗi do thứ tự xen kẽ với lợi ích tốc độ do nhiều lõi.

## Consistency model giới hạn những lịch sử nào được phép

Một consistency model mô tả thứ tự operation mà client có thể quan sát. Nó là hợp đồng về hành vi, chứ không chỉ là tên của một thuật toán.

- Với **linearizability**, mỗi operation có thể được xem như xảy ra tại một thời điểm giữa lúc gọi và lúc trả kết quả, đồng thời giữ thứ tự thời gian thực của các operation không chồng lấn.
- Với **sequential consistency**, mọi người quan sát một thứ tự tuần tự chung và giữ thứ tự operation của từng client, nhưng thứ tự đó có thể không khớp thời gian thực toàn cục.
- Với mô hình yếu hơn, một số thay đổi có thể đến muộn hoặc replica có thể tạm thời khác nhau; hệ thống cần quy tắc merge, repair hoặc giới hạn về thao tác được phép.

Ví dụ hai transaction cùng đặt chỗ cuối cùng: nếu hệ thống cho phép cả hai đọc “còn một chỗ” trước khi ghi, kết quả có thể vi phạm invariant. Ta phải xác định invariant cần giữ, rồi chọn khóa, constraint, transaction isolation hoặc giao thức có coordination đủ mạnh. Chỉ thêm replica không tự giải quyết được xung đột; nó có thể làm nhiều bản state nhận write song song.

## Database trung tâm vẫn được truy cập qua mạng

Đưa state vào một database chung không biến nó thành shared memory tức thời. Mỗi tiến trình vẫn gửi request, chờ queue, network và xử lý ở server. Khi không có phản hồi, caller không biết database chậm, quá tải, đã crash hay response bị mất. Timeout là quyết định dựa trên ngưỡng thời gian, không phải phép đo trực tiếp trạng thái của node.

Vì vậy, một API remote cần để lộ những điều ảnh hưởng đến cách gọi: deadline, khả năng retry, idempotency, consistency cần thiết và trạng thái lỗi. Iterator local và truy vấn remote có thể trông giống nhau trong code, nhưng chi phí và failure behavior khác hẳn. Che khuất khác biệt này khiến caller vô tình đặt một remote call trong vòng lặp lớn, retry một lệnh không idempotent hoặc giả định lần đọc sau luôn thấy write vừa gửi.

## Từ race condition đến lịch sử phân tán

Ở một máy, ta thường kiểm soát thứ tự bằng mutex, atomic instruction hoặc transaction. Qua nhiều node, không có một bộ nhớ chung để mọi bên nhìn thấy cùng thời điểm cập nhật; message có thể trễ, mất hoặc đến theo thứ tự khác nhau. Các cơ chế như version, sequence number, quorum, consensus và conflict resolution tồn tại để quy định ai thấy gì và khi nào.

Khi đọc một thiết kế database, hãy hỏi ba câu: state nào được chia sẻ; operation nào có thể chồng lấn; và lịch sử nào được phép quan sát? Nếu chưa trả lời được câu cuối, chưa thể đánh giá một kết quả là đúng chỉ từ việc từng node đã hoàn thành công việc.

## Tự kiểm tra

**Nếu hai luồng đọc cùng `x = 1`, một luồng cộng 2 và luồng kia nhân 2, vì sao kết quả có thể là 2?** Cả hai cùng tính từ bản đọc cũ; lần ghi sau ghi đè kết quả trước.

**Concurrency có nghĩa là hai lệnh chạy đúng cùng một thời điểm?** Không. Khoảng thực hiện có thể chồng lấn dù CPU chỉ luân phiên giữa các bước.

**Một database tập trung có loại bỏ uncertainty của mạng không?** Không. Caller vẫn có thể mất response sau khi server xử lý xong và phải quyết định có retry hay không.

Nguồn đọc: *Database Internals*, chương 8; các note kế tiếp đi sâu vào consistency, failure detection và consensus.
