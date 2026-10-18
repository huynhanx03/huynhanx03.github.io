---
title: "Hệ điều hành làm gì? Ba trụ cột và các mục tiêu thiết kế"
category: "Operating System"
tags: ["operating system", "virtualization", "concurrency", "persistence"]
description: "Nhìn hệ điều hành như lớp quản lý tài nguyên qua ảo hóa, concurrency và lưu trữ bền vững."
updated: 2026-10-16
translationKey: "operating-system/operating-system-principles"
---

Một chương trình đang chạy liên tục lấy lệnh từ bộ nhớ, giải mã rồi thực thi. Nhưng máy tính thường cần chạy nhiều chương trình, chia sẻ RAM và thiết bị, đồng thời giữ lại dữ liệu sau khi tắt nguồn. Hệ điều hành phối hợp phần cứng và ứng dụng để những việc đó có thể xảy ra mà mỗi chương trình không phải tự điều khiển toàn bộ máy.

OS vừa là **resource manager** phân phối tài nguyên vật lý, vừa cung cấp **abstraction/API** để chương trình yêu cầu dịch vụ. Một phần giao diện trông giống thư viện, nhưng thao tác đặc quyền đi qua system call để kernel kiểm tra quyền và bảo vệ trạng thái máy.

Có thể nhìn môn hệ điều hành qua ba câu hỏi lớn:

| Trụ cột | Vấn đề cần giải quyết | Abstraction quen thuộc |
| --- | --- | --- |
| **Ảo hóa** | Chia CPU, RAM và thiết bị giữa nhiều chương trình mà vẫn tạo giao diện dễ dùng | process, virtual address space, file |
| **Concurrency** | Giữ chương trình và kernel đúng khi nhiều luồng công việc xen kẽ hoặc chạy song song | thread, lock, condition variable, atomic operation |
| **Persistence** | Lưu dữ liệu qua crash hoặc mất điện, tổ chức và tìm lại dữ liệu hiệu quả | file, directory, filesystem, storage device |

Ba nhóm này liên quan nhau nhưng không thay thế nhau. Process có thể được lập lịch để dùng CPU, các process có thể cùng thao tác trên file, và filesystem phải phối hợp request đồng thời trong khi vẫn phục hồi được sau sự cố.

## Ảo hóa: một tài nguyên vật lý, nhiều giao diện logic

### CPU thành các process

Trên một CPU core, kernel chạy một process trong một khoảng thời gian, lưu trạng thái của nó rồi chuyển sang process khác. Việc luân phiên tạo cảm giác mỗi process có CPU riêng. Scheduler quyết định ai được chạy; interrupt và cơ chế privilege giúp kernel giành lại quyền điều khiển khi cần.

### RAM thành không gian địa chỉ riêng

Một process nhìn thấy các địa chỉ ảo của nó. MMU và page table ánh xạ chúng tới RAM vật lý; process khác có thể dùng cùng con số địa chỉ ảo nhưng nhận mapping khác. Cách nhìn riêng này tạo isolation và cho phép kernel quản lý RAM chung. Địa chỉ in ra từ một chương trình vì thế không mặc nhiên là địa chỉ vật lý.

### Đĩa và thiết bị qua API

Ứng dụng yêu cầu dịch vụ qua system call, chẳng hạn `open`, `read` và `write`; kernel và driver giao tiếp với thiết bị. Tuy nhiên, filesystem không nhất thiết tạo một đĩa riêng cho từng process. File thường được chia sẻ có chủ đích giữa editor, compiler và chương trình chạy; quyền truy cập và semantics đồng thời quyết định việc chia sẻ đó an toàn ra sao.

Hai cách chia sẻ tài nguyên thường gặp là **time sharing** và **space sharing**. CPU được luân phiên theo thời gian; bộ nhớ và block trên đĩa thường được chia thành vùng hoặc đơn vị không gian. Một tài nguyên có thể dùng cả hai cách tùy cơ chế: network link có thể chia thời gian truyền giữa flow, còn bộ đệm của nó được chia theo dung lượng. Cách chia ảnh hưởng latency, utilization và mức cô lập.

## Concurrency: cùng lúc không có nghĩa là an toàn

Concurrency xuất hiện khi nhiều công việc có thể tiến triển xen kẽ; trên máy nhiều core, một số công việc còn thực sự chạy đồng thời. Ngay cả một lệnh có vẻ đơn giản như `counter++` thường gồm đọc giá trị, cộng một rồi ghi lại. Hai thread có thể đọc cùng giá trị cũ và ghi đè kết quả của nhau.

Đây không chỉ là vấn đề của ứng dụng. Interrupt, nhiều CPU và worker kernel có thể cùng chạm vào process table, page table hoặc metadata filesystem. Cần primitive đồng bộ để bảo vệ invariant; “đã chạy đúng một lần” hoặc “thường không lỗi” không chứng minh chương trình đúng với mọi lịch xen kẽ.

## Persistence: `write` không đồng nghĩa dữ liệu đã bền

RAM là volatile: mất điện hoặc crash có thể làm nội dung chưa lưu biến mất. Filesystem quản lý file trên thiết bị lưu trữ, chọn vị trí block, cập nhật metadata và thực hiện I/O. Để tăng hiệu năng, hệ thống có thể gom hoặc trì hoãn ghi; để đảm bảo nhất quán, nó cần quy tắc thứ tự ghi và cách khôi phục, chẳng hạn journaling hoặc copy-on-write.

Do đó, phải phân biệt việc một lệnh ghi trả về với dữ liệu thực sự đã đạt mức durability mà ứng dụng yêu cầu. Buffer, cache, filesystem và thiết bị đều có thể nằm giữa ứng dụng với môi trường lưu trữ bền. Cách bảo đảm cụ thể phụ thuộc API, filesystem, thiết bị và cấu hình.

## Mechanism, policy và mục tiêu thiết kế

**Mechanism** là cách hệ thống thực hiện một chức năng — ví dụ timer interrupt cho kernel cơ hội thu hồi CPU. **Policy** là quyết định dùng chức năng đó thế nào — ví dụ chọn process nào tiếp theo. Tách chúng giúp thay đổi quyết định mà không phải thiết kế lại toàn bộ cơ chế bên dưới.

Hệ điều hành phải cân bằng nhiều mục tiêu:

- **Abstraction và dễ dùng:** cung cấp giao diện dễ hiểu thay vì buộc mỗi ứng dụng thao tác trực tiếp với phần cứng.
- **Hiệu năng:** giảm overhead về thời gian và bộ nhớ mà vẫn giữ được chức năng cần thiết.
- **Protection và isolation:** lỗi hoặc hành vi xấu của một ứng dụng không được tùy tiện làm hỏng ứng dụng khác hay kernel.
- **Reliability:** giữ hệ thống hoạt động và phục hồi trạng thái hợp lý khi phần mềm hoặc phần cứng gặp lỗi.
- **Energy efficiency, security và mobility:** mức ưu tiên thay đổi theo máy chủ, desktop, thiết bị nhúng hay điện thoại.

Không có một policy tối ưu đồng thời cho mọi mục tiêu. Thiết kế OS là chọn trade-off phù hợp với workload và môi trường, rồi đo xem cơ chế đó có tạo overhead hoặc điểm lỗi mới không.

## Vì sao hệ điều hành phát triển thành hệ thống có privilege?

Các hệ thống ban đầu phần lớn cung cấp thư viện I/O và để người vận hành xếp lịch các batch job. Khi nhiều chương trình cần cùng dùng máy, việc để ứng dụng tùy ý đọc đĩa hoặc ghi RAM của nhau không còn an toàn. System call cùng user/kernel mode tạo một lối vào có kiểm soát để kernel thực hiện thao tác đặc quyền.

Multiprogramming cho phép kernel chuyển sang job khác trong lúc một job đợi I/O, tăng mức sử dụng CPU nhưng làm nảy sinh yêu cầu về bảo vệ bộ nhớ và đồng bộ. Unix sau đó phổ biến cách ghép các chương trình nhỏ bằng shell và pipe. Các hệ thống PC ban đầu có những mô hình kiểm soát hạn chế; nhiều hệ điều hành hiện đại đưa protection, preemption và các ý tưởng time-sharing trở lại. Đây là lược sử khái niệm, không phải danh sách đầy đủ các dòng phát triển hay thứ tự duy nhất mà mọi OS đi qua.

## Tóm tắt

- Hệ điều hành quản lý tài nguyên và cung cấp abstraction cho ứng dụng.
- Ba trụ cột là ảo hóa, concurrency và persistence.
- Process và virtual address space tạo giao diện chia sẻ CPU/RAM có isolation; filesystem tổ chức dữ liệu bền mà không nhất thiết tạo đĩa riêng cho từng app.
- Concurrency làm lộ race trong ứng dụng lẫn kernel; persistence cần xử lý thứ tự ghi và phục hồi.
- Mechanism trả lời cách thực hiện; policy chọn quyết định.
- Hiệu năng, tiện dụng, protection, reliability, năng lượng và security đòi hỏi trade-off.

## Tự kiểm tra

**Mỗi process có thật một CPU và vùng RAM vật lý riêng?** Thường không. OS và phần cứng tạo các abstraction để chia sẻ tài nguyên vật lý.

**Một lệnh tăng biến luôn atomic vì nó viết trên một dòng?** Không. Compiler/CPU có thể thực hiện nhiều bước; cần cơ chế đồng bộ khi có truy cập cạnh tranh.

**`write()` trả về nghĩa là dữ liệu chắc chắn sống sót sau mất điện?** Không nhất thiết. Durability phụ thuộc semantics API và các lớp lưu trữ bên dưới.

**OS chỉ có một policy đúng cho mọi máy?** Không. Mục tiêu và workload khác nhau nên các trade-off cũng khác.

## Đọc tiếp

Đọc tiếp các bài về [process](/vi/notes/operating-system/process-model/), [không gian địa chỉ](/vi/notes/operating-system/memory-address-space/), [concurrency](/vi/notes/operating-system/concurrency-fundamentals/) và [filesystem](/vi/notes/operating-system/filesystem-implementation/).
