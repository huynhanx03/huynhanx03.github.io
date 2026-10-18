---
title: "Context switch và vòng đời process"
category: "Operating System"
tags: ["operating-system", "process", "context-switch"]
description: "Theo dõi cách kernel chuyển CPU giữa các luồng thực thi và phân biệt chi phí chuyển ngữ cảnh với trạng thái tiến trình."
sources:
  - title: "Intel: Hyper-Threading Technology Architecture and Microarchitecture"
    url: "https://www.intel.com/content/dam/www/public/us/en/documents/research/2002-vol06-iss-1-intel-technology-journal.pdf"
updated: 2026-10-17
translationKey: "operating-system/context-switch-and-process-state"
---

Mỗi logical CPU thực thi một OS thread tại một thời điểm, nhưng một physical core có SMT có thể cung cấp nhiều logical CPU để nhiều thread cùng tiến triển, chia sẻ tài nguyên thực thi. Nếu không có SMT, hệ điều hành tạo cảm giác nhiều chương trình cùng chạy trên một core bằng cách luân phiên cấp CPU. Khi đổi thread trên một logical CPU, kernel phải lưu trạng thái cần thiết của thread cũ và khôi phục thread mới ([Intel: Hyper-Threading](https://www.intel.com/content/dam/www/public/us/en/documents/research/2002-vol06-iss-1-intel-technology-journal.pdf)).

## Trạng thái process/thread

Một luồng có thể đang chạy, sẵn sàng chờ CPU, hoặc bị chặn chờ sự kiện như I/O, lock hay timer. Khi I/O hoàn tất, kernel chuyển nó từ blocked sang runnable; scheduler có thể chọn nó ở lần cấp CPU kế tiếp. Process chứa tài nguyên và không gian địa chỉ; thread là đơn vị thực thi được lập lịch, thường chia sẻ tài nguyên với các thread cùng process.

Trạng thái kiến trúc có thể mở rộng khi ISA thêm tập thanh ghi mới, chẳng hạn thanh ghi vector/SIMD. Hệ điều hành phải bảo đảm trạng thái đó được bảo toàn khi thread bị đổi hoặc khi ứng dụng dùng extension; chi tiết eager/lazy save và phần trạng thái nào được bật phụ thuộc CPU và OS. Vì vậy, thêm một nhóm lệnh vào ISA còn kéo theo thay đổi cho context management, không chỉ cho compiler.

## Điều gì được chuyển?

Ở một điểm chuyển hợp lệ, kernel lưu program counter, stack pointer, thanh ghi và các trạng thái kiến trúc cần thiết vào cấu trúc thread. Sau đó kernel đổi sang stack và trạng thái của thread đích rồi tiếp tục thực thi. Tùy thiết kế, việc đổi không gian địa chỉ có thể đổi page-table root và làm mất một phần lợi ích của TLB/cache; nhiều kiến trúc có hỗ trợ giảm chi phí này.

Interrupt timer có thể đưa CPU vào kernel để scheduler quyết định tiếp tục hay đổi thread. Chuyển sang kernel mode nhưng vẫn chạy cùng thread là system call/interrupt entry, chưa chắc đã là context switch. Context switch thường xảy ra khi kernel chọn một thread khác.

## Chi phí và hệ quả

Chi phí không chỉ là số lệnh lưu/khôi phục thanh ghi. Thread mới có thể làm cache nóng của thread trước ít hữu ích; trên nhiều core, cache coherence và migration cũng tạo thêm chi phí. Tuy vậy, chuyển ngữ cảnh cho phép một tác vụ bị chặn nhường CPU để tác vụ khác tiến lên.

Tạo quá nhiều thread có thể làm tăng bộ nhớ stack, tranh chấp lock và số lần chuyển. Pool giới hạn concurrency có thể giữ hệ thống ổn định, nhưng số thread phù hợp phụ thuộc workload: tác vụ CPU-bound và I/O-bound có đặc điểm khác nhau.

### Đo system call và context switch

Muốn ước lượng system-call overhead, lặp một syscall nhỏ rồi chia thời gian tổng cho số lần gọi. Muốn ước lượng chuyển process, cho hai process trên cùng CPU luân phiên gửi/nhận qua hai pipe: mỗi lần một process block chờ đọc, kernel có thể chạy process kia. Đây là phép đo cả vòng trao đổi; cần tách chi phí pipe/read/write khỏi context switch nếu muốn diễn giải con số.

Đo thời gian rất ngắn dễ bị sai bởi độ phân giải timer, chi phí đọc timer, compiler, scheduler, interrupt và CPU migration. Lặp đủ nhiều lần, đo baseline của timer, ghim hai process vào cùng một CPU khi hệ điều hành hỗ trợ, chạy nhiều lượt rồi báo phân phối thay vì chỉ một con số. Kết quả của một máy không phải hằng số kiến trúc phổ quát.

## Tự kiểm tra

**Mỗi lần vào kernel đều context switch?** Không; kernel có thể xử lý system call rồi quay lại cùng thread.

**Thread blocked vì I/O có chiếm CPU liên tục không?** Không; nó chờ sự kiện rồi mới trở lại runnable.

**Context switch chỉ có chi phí lưu thanh ghi?** Không; cache, TLB và migration cũng có thể ảnh hưởng.

**Một vòng pipe ping-pong đo riêng context switch?** Không; syscall, pipe và scheduling cũng góp chi phí.

## Đọc tiếp

Scheduler quyết định runnable thread nào được chạy dựa trên mục tiêu latency, fairness và throughput.
