---
title: "RAID levels và write hole"
category: "Operating System"
tags: ["storage", "raid", "parity", "durability"]
description: "Tính dung lượng RAID phổ biến, hiểu degraded mode, parity write hole và cache protection."
updated: 2026-10-17
translationKey: "operating-system/raid-levels-write-hole"
---

RAID level mô tả cách stripe/mirror/parity được bố trí, nhưng tên level không mô tả toàn bộ controller, cache và failure semantics. Cần biết số drive, kích thước, parity layout, hot spare và chính sách rebuild của implementation.

RAID thường trình bày với filesystem như một thiết bị block duy nhất; controller hoặc software RAID ánh xạ logical block thành một hay nhiều I/O vật lý. Sự trong suốt này giúp thay một ổ đơn bằng array mà ứng dụng không cần biết cách các ổ được ghép. Nhưng RAID không tự giải quyết mọi loại lỗi: mô hình đơn giản chỉ giả định ổ bị lỗi hoàn toàn và lỗi đó được phát hiện; silent corruption hay sector lỗi trên một ổ còn hoạt động cần cơ chế kiểm tra và phục hồi khác.

## Striping và kích thước chunk

RAID 0 rải các block luân phiên qua các ổ để tận dụng song song, nhưng không có redundancy: mất một member có thể làm mất toàn bộ array. Với chunk một block và `N` ổ, logical block `A` nằm ở disk `A % N`, offset `A / N` (chia nguyên). Chunk nhỏ tăng khả năng một request lớn chạy song song trên nhiều ổ; chunk lớn giữ vùng dữ liệu liên tiếp trên cùng ổ lâu hơn, giảm số ổ tham gia request nhưng giảm parallelism nội bộ. Kích thước phù hợp phụ thuộc workload và kích thước request, không có một giá trị tốt nhất cho mọi hệ thống.

## Dung lượng danh nghĩa

Với N ổ cùng dung lượng S:

- RAID 0: gần `N × S`, không redundancy.
- RAID 1 mirror 2 ổ: gần `S` usable.
- RAID 5: gần `(N-1) × S`, chịu một member failure theo cấu hình chuẩn.
- RAID 6: gần `(N-2) × S`, chịu hai member failure theo cấu hình chuẩn.
- RAID 10: thường gần `(N/2) × S` với số ổ chẵn, failure tolerance phụ thuộc pattern.

Filesystem metadata, reserve, spare và khác dung lượng ổ làm usable khác con số tính nhanh.

Hiệu năng nên tách thành latency của một request và throughput khi có nhiều request đồng thời; đồng thời phải ghi rõ workload tuần tự hay ngẫu nhiên. RAID 0 có thể phân phối request qua các ổ để tăng throughput, nhưng một request nhỏ đơn lẻ thường vẫn chịu latency gần như một ổ. Vì vậy số ổ tăng không đồng nghĩa mọi thao tác đơn lẻ đều nhanh lên tương ứng.

Với mô hình RAID 1 hai bản sao đang đồng bộ, một lần ghi cần cập nhật cả hai bản; thời điểm báo hoàn tất còn phụ thuộc implementation và chính sách cache. Nếu mất điện sau khi bản đầu đã ghi nhưng trước bản còn lại, hai bản có thể lệch nhau. Một write-ahead log hoặc vùng ghi được bảo vệ có thể giúp phục hồi cập nhật dang dở. Đọc có thể chọn một trong hai bản, nên nhiều lượt đọc ngẫu nhiên có thể phân phối qua các ổ; ghi phải trả chi phí cập nhật mọi bản sao.

RAID 4 lưu một block parity cho mỗi stripe dữ liệu. Parity XOR theo từng bit cho phép tái tạo một block bị mất bằng XOR các block còn lại với parity. Dung lượng usable là `N - 1` ổ, và cấu hình chuẩn chịu được một ổ hỏng; nhưng mọi lần ghi nhỏ cần cập nhật block parity chung nên ổ parity có thể thành nút thắt. RAID 5 luân phiên vị trí parity giữa các ổ để phân tán tải ghi.

Với ghi toàn stripe, controller có thể tính parity mới từ toàn bộ dữ liệu mới rồi ghi các block dữ liệu và parity song song. Ghi nhỏ thường không có đủ dữ liệu để làm vậy: phải đọc data cũ và parity cũ, tính parity mới (`P_new = P_old XOR D_old XOR D_new`), rồi ghi data mới cùng parity mới. Đó là bốn thao tác I/O vật lý cho một logical write trong mô hình cơ bản. RAID 4 dồn các cập nhật parity vào một ổ nên dễ nghẽn khi có nhiều ghi nhỏ; RAID 5 xoay vị trí parity để các ghi độc lập có thể chạy song song hơn, dù chi phí bốn I/O cho mỗi ghi nhỏ vẫn còn.

Các so sánh throughput trong sách dùng workload giả định và ổ đĩa mô hình hóa; hãy dùng chúng để hiểu cơ chế, không xem là benchmark hiện đại. Khi chọn RAID, tách latency một request khỏi throughput tải đồng thời, và xét kích thước request, tuần tự/ngẫu nhiên, đọc/ghi cùng trạng thái lỗi. RAID 5 cải thiện dung lượng so với mirror nhưng ghi nhỏ kém hơn; RAID 1 tốn dung lượng nhưng thường có lợi cho random read/write. RAID 0 chỉ phù hợp khi chấp nhận không có khả năng chịu lỗi.

## Parity write hole

Parity cần nhất quán với data stripe. Mất điện giữa các ghi data/parity có thể để lại mismatch; khi rebuild, parity sai khiến dữ liệu tái tạo sai. Controller battery/flash-backed cache, write-intent bitmap, journaling hoặc copy-on-write có thể giảm rủi ro tùy hệ thống.

RAID có thể báo degraded và tiếp tục chạy; chạy tiếp lâu tăng rủi ro. Thay ổ, scrub và rebuild cần theo runbook, không rút ổ theo đèn nhấp nháy nếu chưa xác định slot.

## Reliability không phải durability end-to-end

RAID chịu một số ổ hỏng, nhưng ứng dụng vẫn cần flush/ordering đúng, filesystem consistency và backup. Controller có thể xác nhận write khi data còn trong cache volatile nếu cấu hình sai.

### Bài thực hành: từ logical request tới I/O vật lý

Chọn cùng một logical address trace rồi lần ánh xạ qua RAID 0, 1, 4 và 5; với RAID 5 so layout parity trái đối xứng và trái bất đối xứng. Đổi chunk size, request size, đọc/ghi và workload ngẫu nhiên/tuần tự. Ghi số block data/parity được chạm, số I/O phụ và thời gian mô phỏng khi tăng số ổ. Đặc biệt so ghi nhỏ với full-stripe write để thấy parity read-modify-write có thể nghẽn, trong khi request tuần tự đủ lớn tận dụng song song tốt hơn. Kết quả simulator giải thích mô hình mapping/chi phí của nó; controller cache, queueing, firmware và thiết bị thật làm benchmark thực tế khác.

## Tóm tắt

- Usable capacity tùy RAID level, member count và metadata.
- RAID 10 tolerance phụ thuộc ổ nào hỏng, không chỉ số lượng.
- Parity write hole là nguy cơ khi crash giữa update data/parity.
- Cache protection, scrub và rebuild policy quan trọng.
- Redundancy không thay durability của app hay backup.
- Đánh giá RAID bằng cùng trace và request size; logical I/O có thể thành nhiều physical I/O.

## Tự kiểm tra

**RAID 5 mọi cặp ổ hỏng đều sống?** Không; thông thường chỉ chịu một member failure.

**RAID 10 chịu được bất kỳ hai ổ?** Không; pattern hỏng trong cùng mirror pair có thể làm mất array.

**Controller ACK write đảm bảo media bền?** Cần kiểm tra cache protection/flush semantics.

## Đọc tiếp

Filesystem phía trên RAID vẫn cần xử lý crash consistency và data integrity.
