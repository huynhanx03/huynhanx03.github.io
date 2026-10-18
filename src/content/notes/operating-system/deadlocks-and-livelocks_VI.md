---
title: "Deadlock, livelock và starvation"
category: "Operating System"
tags: ["concurrency", "deadlock", "livelock", "starvation"]
description: "Phân biệt ba kiểu tiến trình không hoàn thành, hiểu điều kiện deadlock và các cách phòng tránh."
updated: 2026-10-16
translationKey: "operating-system/deadlocks-and-livelocks"
---

Hai thread có thể không sai dữ liệu nhưng vẫn không hoàn thành việc. **Deadlock** là nhóm thread chờ tài nguyên do nhau giữ, tạo vòng phụ thuộc. **Livelock** là các thread vẫn hoạt động nhưng liên tục nhường/đổi trạng thái mà không tiến tới kết quả. **Starvation** là một thread bị bỏ đói vì liên tục không được cấp tài nguyên.

## Ví dụ deadlock

Thread A giữ lock L1 rồi chờ L2; thread B giữ L2 rồi chờ L1. Cả hai không thể tiếp tục:

```text
A: lock(L1) ── chờ L2
B: lock(L2) ── chờ L1
```

Hệ thống có thể vẫn sử dụng CPU ở nơi khác, nên deadlock không đồng nghĩa toàn máy treo. Process bị deadlock có thể giữ tài nguyên và làm các request sau ùn lại.

Dining philosophers minh họa vòng chờ: mỗi người cầm nĩa bên trái rồi đợi nĩa bên phải. Nếu tất cả cùng lấy nĩa trái trước, mỗi người giữ một tài nguyên và chờ người kế bên — tạo circular wait. Đánh số nĩa và luôn lấy theo thứ tự toàn cục sẽ phá vòng; trong ví dụ năm người, cho một người lấy nĩa theo thứ tự ngược cũng đủ phá đối xứng. Điều đó loại deadlock theo chu trình này nhưng tự nó chưa đảm bảo mọi người được phục vụ công bằng.

## Bốn điều kiện Coffman

Deadlock cổ điển cần đồng thời bốn điều kiện:

1. **Mutual exclusion:** tài nguyên chỉ một bên dùng tại một thời điểm.
2. **Hold and wait:** thread giữ tài nguyên trong lúc chờ thêm tài nguyên.
3. **No preemption:** không thể cưỡng bức lấy tài nguyên khỏi thread.
4. **Circular wait:** tồn tại vòng chờ tài nguyên.

Phòng deadlock bằng cách phá một điều kiện, chẳng hạn áp thứ tự toàn cục lên lock, lấy tất cả tài nguyên cùng lúc, hoặc dùng timeout/cancellation phù hợp. Timeout không phải lời giải phổ quát: thao tác có thể đã gây side effect trước khi timeout.

Với hàm nhận nhiều lock động, thứ tự có thể chuẩn hóa theo một khóa ổn định như thứ tự địa chỉ của mutex, để hai caller truyền `L1,L2` và `L2,L1` vẫn acquire cùng thứ tự. `trylock` rồi nhả lock đã lấy nếu lock kế tiếp bận cũng có thể tránh chờ vòng; nhưng hai thread có thể lặp lại cùng nhịp và livelock, nên backoff ngẫu nhiên đôi khi giúp. Thứ tự lock thường đơn giản, dễ kiểm tra hơn giao thức retry.

Phân biệt ba chiến lược: **prevention** phá một điều kiện cần (thường circular wait); **avoidance** chỉ cấp tài nguyên/lên lịch nếu biết trước nhu cầu và trạng thái an toàn (ví dụ Banker), nên hiếm dùng cho workload tổng quát; **detection/recovery** cho deadlock xảy ra rồi tìm chu trình và hủy/rollback/restart một nạn nhân. Mỗi cách đổi chi phí thiết kế, mức concurrency và khả năng phục hồi.

## Livelock và starvation

Hai thread có thể mỗi lần thấy xung đột đều nhả lock rồi thử lại cùng lúc; chúng hoạt động liên tục nhưng không ai lấy được tài nguyên. Random backoff hoặc điều phối công bằng có thể giúp.

Starvation thường đến từ ưu tiên cố định hoặc scheduler/tài nguyên không công bằng. Aging, quota và fairness queue giảm rủi ro nhưng có thể làm giảm throughput ở nơi khác.

## Cách phòng và phát hiện

- Quy định thứ tự acquire lock và ghi rõ trong code.
- Giữ critical section ngắn, tránh I/O/callback khi đang giữ lock.
- Dùng try-lock hoặc timeout khi semantics cho phép và có kế hoạch rollback.
- Thu thập thread dump/stack trace khi hệ thống kẹt.
- Ghi log việc chờ lock kèm danh tính tài nguyên và thời gian chờ.

Phát hiện deadlock có thể dựa vào wait-for graph: node là thread/resource, cạnh biểu diễn quan hệ chờ/giữ. Vòng trong đồ thị chỉ ra chu trình ứng viên; việc kết luận chính xác phụ thuộc mô hình tài nguyên và khả năng share.

## Tóm tắt

- Deadlock là chờ vòng; livelock là hoạt động không tiến; starvation là bị bỏ đói.
- Bốn điều kiện Coffman cung cấp cách suy nghĩ về phòng ngừa deadlock.
- Lock ordering là biện pháp thực dụng để phá circular wait.
- Timeout cần semantics xử lý side effect, không chỉ bỏ qua lỗi.
- Thread dump và wait graph hỗ trợ tìm nguyên nhân.

## Tự kiểm tra

**Deadlock luôn làm CPU utilization 0%?** Không. Các thread khác vẫn có thể chạy.

**Timeout đảm bảo thao tác được rollback?** Không. Thao tác có thể đã commit ở tầng khác.

**Livelock giống deadlock?** Cả hai không tiến tới hoàn tất, nhưng livelock vẫn tiêu tốn công việc và thay đổi trạng thái.

## Đọc tiếp

Event-based concurrency dùng event loop thay vì một thread chờ cho mỗi I/O; nó giải quyết dạng vấn đề khác chứ không tự loại mọi race.
