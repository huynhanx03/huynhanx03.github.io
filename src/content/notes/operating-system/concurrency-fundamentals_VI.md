---
title: "Concurrency: nhiều luồng cùng tiến triển"
category: "Operating System"
tags: ["concurrency", "thread", "race condition"]
description: "Phân biệt concurrency với parallelism và hiểu vì sao xen kẽ thực thi làm lộ lỗi trên trạng thái dùng chung."
updated: 2026-10-16
translationKey: "operating-system/concurrency-fundamentals"
---

Một chương trình có thể xử lý nhiều việc bằng cách để các luồng tiến triển xen kẽ, dù CPU chỉ có một lõi. Trên máy nhiều lõi, một số luồng còn có thể chạy thật sự cùng lúc. Cả hai tình huống đều tạo bài toán chung: kết quả không nên phụ thuộc vào một thứ tự chạy ngẫu nhiên mà chương trình không kiểm soát.

## Concurrency và parallelism

**Concurrency** là cách tổ chức nhiều công việc có thể tiến triển trong các khoảng thời gian chồng lấp. **Parallelism** là thực hiện nhiều công việc đồng thời trên các tài nguyên tính toán khác nhau. Một chương trình concurrent có thể chạy trên một lõi; chương trình parallel cần phần cứng thực thi song song.

Concurrency hữu ích để tách công việc độc lập, giữ giao diện phản hồi trong khi chờ I/O, hoặc phục vụ nhiều request. Nó cũng tạo overhead: chuyển ngữ cảnh, đồng bộ, giao tiếp và tranh chấp cache.

## Interleaving làm thay đổi kết quả

Giả sử hai thread cùng tăng biến `count` từ 0. Phép `count++` thường là chuỗi đọc, cộng, ghi chứ không phải thao tác nguyên tử:

```text
Thread A: đọc 0
Thread B: đọc 0
Thread A: ghi 1
Thread B: ghi 1
```

Kết quả cuối là 1 thay vì 2. Lỗi này là **race condition**: kết quả phụ thuộc vào thứ tự các thao tác đồng thời. **Data race** xảy ra khi nhiều luồng truy cập cùng một vị trí bộ nhớ đồng thời, có ít nhất một thao tác ghi, mà không được đồng bộ theo mô hình bộ nhớ của ngôn ngữ. Hai thuật ngữ liên quan nhưng không hoàn toàn đồng nghĩa.

## Critical section và atomicity

Đoạn code truy cập trạng thái dùng chung cần một quy tắc bảo vệ. Critical section là vùng mà các thread phải phối hợp để không tạo lịch chạy làm hỏng invariant. Nếu cập nhật số dư cần bảo đảm “không âm”, invariant đó có thể đòi hỏi khóa cả chuỗi kiểm tra và cập nhật, không chỉ phép ghi cuối.

Atomic operation xuất hiện như một thao tác không bị quan sát ở trạng thái nửa chừng theo hợp đồng của kiến trúc/ngôn ngữ. Atomic không có nghĩa cả thuật toán nhiều bước tự động trở thành nguyên tử; cần thiết kế đúng order và phạm vi đồng bộ.

Ý “all or nothing” còn xuất hiện ngoài concurrency: filesystem có thể dùng journal hoặc copy-on-write để phục hồi một chuyển trạng thái sau crash; database gom nhiều thao tác thành transaction. Đây là cùng một trực giác về trạng thái trung gian không được công bố, nhưng failure model và cơ chế bảo đảm khác nhau. Mutex bảo vệ khỏi interleaving của thread không tự làm dữ liệu bền qua mất điện; journal không tự bảo vệ invariant giữa hai thread.

## Chờ một luồng khác

Không phải mọi phối hợp đều nhằm bảo vệ critical section. Có lúc một thread phải ngủ cho tới khi thread khác hoàn thành một việc — ví dụ I/O xong hoặc producer đưa dữ liệu vào queue. Đây là bài toán chờ/đánh thức, được xử lý bằng condition variable hoặc primitive tương tự; chờ không nên biến thành vòng lặp bận kiểm tra điều kiện.

Concurrency quan trọng trong môn hệ điều hành vì chính kernel là chương trình concurrent đầu tiên: interrupt và nhiều CPU có thể chạm cùng lúc vào page table, danh sách process, inode hoặc bitmap cấp phát. Kernel cũng cần bảo vệ invariant của mình; race trong kernel có thể làm hỏng trạng thái toàn hệ thống.

## Lịch chạy không do chương trình quyết định hoàn toàn

Thread có thể bị ngắt giữa hai lệnh, block vì I/O hoặc chạy trên lõi khác. Compiler và CPU cũng có thể đổi thứ tự nội bộ nếu vẫn giữ ngữ nghĩa được cho phép. Vì vậy, code đúng không nên dựa vào “lần nào cũng chạy A trước B” trừ khi có cơ chế thiết lập quan hệ thứ tự.

Stress test có thể làm lỗi dễ xuất hiện hơn nhưng không chứng minh lỗi không tồn tại. Hãy mô tả invariant, tìm dữ liệu chia sẻ, xác định synchronization edge, rồi dùng công cụ race detector nếu ngôn ngữ hỗ trợ.

## Thực hành: lần theo một interleaving

Viết `count++` như ba bước đọc, cộng và ghi. Với hai thread, liệt kê các cách xen kẽ hợp lệ và tính giá trị cuối; sau đó đặt lock quanh critical section rồi lặp lại. Thử thêm một vòng chờ “đợi thread kia đổi cờ” và xem khi nào nó chỉ đốt CPU mà không tiến triển. Mục tiêu là chỉ ra đúng thao tác nào phải được bảo vệ và thao tác nào chỉ cần chờ/đánh thức.

## Các cách giảm trạng thái dùng chung

- **Ownership:** một luồng chịu trách nhiệm sửa dữ liệu.
- **Message passing:** gửi bản tin giữa các worker thay vì cùng ghi một cấu trúc.
- **Immutable data:** sau khi công bố, dữ liệu không đổi.
- **Synchronization:** lock, condition variable, semaphore hoặc atomic được dùng quanh invariant.

Không có lựa chọn nào tốt tuyệt đối. Message passing vẫn có thể cần đồng bộ ở queue; immutable data có thể tốn sao chép; lock đơn giản nhưng có thể giảm parallelism. Chọn cách làm rõ quyền sở hữu và vòng đời dữ liệu.

## Chỉ thêm concurrency khi bài toán cần

Trước khi tạo thread, hãy hỏi liệu chương trình có thật sự cần nhiều việc tiến triển cùng lúc hay chỉ cần một luồng điều khiển dễ hiểu. Concurrency có chi phí: phải nghĩ tới nhiều cách xen kẽ, phối hợp trạng thái và xử lý lỗi khó tái hiện. Nếu một luồng đáp ứng được yêu cầu, đó thường là thiết kế dễ kiểm chứng hơn.

Khi cần, ưu tiên mẫu đã quen thuộc như lock quanh invariant hoặc producer–consumer queue thay vì tự tạo giao thức phối hợp mới. Nếu mục tiêu là **parallelism** trên dữ liệu lớn, có thể tìm abstraction gom bớt đồng bộ mức thấp. MapReduce là một ví dụ: chia dữ liệu thành phần để xử lý độc lập (map), rồi gộp kết quả (reduce). Nó không phù hợp mọi workload, nhưng có thể tránh việc mỗi bước tính toán phải tự quản lý lock và condition variable.

Đây không phải quy tắc cấm concurrency. Hãy dùng nó khi độ phản hồi, I/O chồng lấp hoặc thông lượng song song cần thiết xứng đáng với phần phức tạp phải trả thêm.

## Tóm tắt

- Concurrency nói về nhiều công việc tiến triển; parallelism nói về thực thi đồng thời.
- Race condition làm kết quả phụ thuộc thứ tự interleaving.
- Data race là một loại truy cập xung đột thiếu đồng bộ theo mô hình ngôn ngữ.
- Bảo vệ invariant, không chỉ một lệnh riêng lẻ.
- Cách đơn giản nhất đôi khi là giảm hoặc loại bỏ trạng thái dùng chung.

## Tự kiểm tra

**Một lõi CPU có thể chạy chương trình concurrent không?** Có; scheduler xen kẽ các thread.

**Atomic increment khiến toàn bộ hàm cập nhật tài khoản nguyên tử?** Không; chỉ thao tác atomic được bảo đảm theo hợp đồng của nó.

**Race condition chỉ xảy ra trên nhiều lõi, và stress test có chứng minh chương trình race-free không?** Không. Interleaving trên một lõi cũng đủ tạo lỗi, còn stress test không thể bao phủ mọi lịch chạy.

## Đọc tiếp

Để tạo và phối hợp thread, trước hết xem [Thread API](/vi/notes/operating-system/thread-lifecycle-api/), rồi học cách bảo vệ critical section bằng lock.
