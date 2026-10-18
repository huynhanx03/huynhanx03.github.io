---
title: "Thread API: tạo, chờ và kết thúc luồng"
category: "Operating System"
tags: ["thread", "pthread", "concurrency"]
description: "Hiểu vòng đời thread, join, truyền dữ liệu và các lỗi phổ biến khi vòng đời không được quản lý."
updated: 2026-10-16
translationKey: "operating-system/thread-lifecycle-api"
---

Thread là luồng thực thi có program counter, thanh ghi và stack riêng, thường chia sẻ nhiều tài nguyên cấp process như heap và file descriptor. API thread cho phép tạo worker, chờ kết quả và xác định khi nào tài nguyên luồng có thể được thu hồi.

Mỗi thread giữ PC và bộ thanh ghi riêng; khi CPU đổi thread, runtime/kernel lưu trạng thái thread cũ và khôi phục trạng thái thread mới. Vì các thread trong cùng process dùng chung address space, context switch giữa chúng thường không cần đổi page table như khi đổi sang process khác. Mỗi thread cũng cần stack riêng cho biến cục bộ, argument và return address. Nhiều stack làm layout address space phức tạp hơn và cùng tiêu thụ không gian; stack quá lớn hoặc recursion sâu có thể đụng giới hạn/stack guard.

## Tạo thread chưa có nghĩa nó chạy sau thread hiện tại

Khi tạo thread, scheduler có thể chạy thread mới ngay, tiếp tục thread gọi, hoặc xen kẽ cả hai. Không nên dựa vào thứ tự tạo để suy ra thứ tự chạy. Nếu thread chính cần dữ liệu do worker tạo, phải chờ hoặc đồng bộ thay vì đọc ngay.

Một mô hình C/POSIX minh họa:

```c
pthread_t worker;
pthread_create(&worker, NULL, run_task, argument);
pthread_join(worker, NULL);
```

Đây là mã khái niệm; code thật cần include header, kiểm tra mã lỗi và định nghĩa hàm đúng chữ ký. POSIX `pthread_join` chờ một thread joinable kết thúc và thu nhận trạng thái/tài nguyên liên quan.

Trong POSIX C, `pthread_create` nhận function pointer có dạng `void *(*start_routine)(void *)`, một đối số `void *`, và thuộc tính thread tùy chọn (thường để mặc định). `pthread_join` có thể nhận kết quả qua `void **`. Vì kiểu `void *` linh hoạt, caller và worker phải thống nhất kiểu dữ liệu, cách cast và quyền sở hữu. Không được trả pointer tới biến local trên stack của worker: vùng đó hết lifetime khi hàm trả về. Hãy dùng vùng cấp phát có ownership rõ, object sống đủ lâu, hoặc truyền kết quả qua cấu trúc được bảo vệ phù hợp.

## Join và vòng đời

Join thiết lập điểm mà thread gọi chờ worker hoàn tất. Nếu không cần chờ kết quả nhưng vẫn muốn giải phóng tài nguyên phù hợp, API có thể có chế độ detached. Chi tiết phụ thuộc runtime; không join và không detach đúng cách có thể làm rò rỉ metadata hoặc làm chương trình kết thúc trước khi worker xong.

Không nên lưu pointer tới biến stack của thread cha rồi để worker dùng sau khi biến hết vòng đời. Cũng cần xác định ai sở hữu argument/result và ai giải phóng. Lỗi vòng đời thường bị nhầm với race.

## Truyền kết quả

Thread có thể ghi kết quả vào cấu trúc được truyền qua pointer rồi parent đọc sau khi join. Điểm đồng bộ join thường bảo đảm kết quả trước khi thread kết thúc có thể được thread gọi quan sát theo API/memory model. Nếu nhiều worker cùng ghi cùng cấu trúc, vẫn cần partition dữ liệu hoặc synchronization.

Mẫu tốt là mỗi worker sở hữu vùng output riêng, rồi thread chính gộp sau join. Điều này giảm lock và làm ownership rõ. Nếu worker cần dừng sớm, API cancellation cần quy tắc cleanup; không nên kết thúc thread cưỡng bức khi nó đang giữ lock hoặc cập nhật dữ liệu.

## Thread pool

Tạo thread cho từng tác vụ có thể tốn chi phí và làm số thread tăng không kiểm soát. Thread pool giữ một số worker lâu dài và đưa task vào queue. Pool cần quy tắc về kích thước, backpressure, lỗi, shutdown và task đang chờ.

Pool quá nhỏ có thể bị nghẽn bởi tác vụ blocking; pool quá lớn tăng context switch và tranh chấp. Số worker nên dựa trên loại tác vụ và phép đo, không chỉ đặt bằng số CPU cho mọi workload.

## Tóm tắt

- Thread chia sẻ nhiều trạng thái process nhưng có luồng điều khiển riêng.
- Scheduler quyết định thứ tự; tạo thread không bảo đảm thread chạy ngay.
- Join/detach xác định cách thu nhận và kết thúc vòng đời.
- Truyền pointer yêu cầu ownership và lifetime rõ.
- Thread pool giảm chi phí tạo lặp nhưng cần backpressure và shutdown có kế hoạch.

## Tự kiểm tra

**Thread mới luôn chạy sau dòng `create`?** Không; scheduler có thể chạy nó ngay.

**Join bảo vệ mọi dữ liệu mà các thread khác cùng sửa?** Không. Join chỉ đồng bộ ở ranh giới kết thúc của thread được join.

**Pool càng nhiều worker càng nhanh?** Không. Quá nhiều worker có thể làm tranh chấp và context switch tăng.

## Đọc tiếp

Tiếp theo: [Lock và mutex](/vi/notes/operating-system/locks-and-mutexes/).
