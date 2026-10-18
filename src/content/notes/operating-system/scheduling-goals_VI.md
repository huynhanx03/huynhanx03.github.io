---
title: "Lập lịch CPU: tối ưu mục tiêu nào?"
category: "Operating System"
tags: ["scheduling", "process", "operating system"]
description: "Phân biệt response time, turnaround, waiting time, fairness và utilization trước khi chọn thuật toán lập lịch."
updated: 2026-10-16
translationKey: "operating-system/scheduling-goals"
---

CPU không thể chạy tất cả process đồng thời trên một lõi. Khi nhiều process ở trạng thái ready, scheduler chọn ai được chạy tiếp. Không có thuật toán tốt nhất cho mọi tình huống, vì hệ tương tác, batch job và máy chủ đều quan tâm các mục tiêu khác nhau.

## Các đại lượng cần phân biệt

- **Turnaround time:** từ lúc job đến tới lúc hoàn tất.
- **Waiting time:** tổng thời gian job chờ trong hàng ready.
- **Response time:** từ lúc có yêu cầu tới phản hồi đầu tiên hữu ích.
- **Throughput:** số job hoàn tất trên một đơn vị thời gian.
- **CPU utilization:** tỷ lệ thời gian CPU làm việc hữu ích theo cách đo.
- **Fairness:** mức công bằng giữa các job hoặc nhóm người dùng.

Giảm turnaround trung bình có thể khiến job dài chờ lâu; tăng throughput bằng cách gom workload có thể làm người dùng tương tác thấy phản hồi chậm. Cần chọn tiêu chí theo mục đích hệ thống và đo phân vị phù hợp.

## Preemptive và non-preemptive

Scheduler **non-preemptive** để process đang chạy tiếp tục cho tới khi tự nhường hoặc kết thúc. Cách này đơn giản nhưng một job dài có thể khiến job tương tác phải chờ.

Scheduler **preemptive** có thể tạm dừng process, lưu trạng thái và chuyển sang process khác, ví dụ khi timer hết quantum hoặc job ưu tiên cao sẵn sàng. Preemption tăng khả năng đáp ứng nhưng tạo context-switch overhead và cần đồng bộ kernel cẩn thận.

## Một ví dụ về đánh đổi

Giả sử A cần CPU 20 ms, B cần 2 ms, cả hai đến gần như cùng lúc. Nếu A chạy trước non-preemptive, B chờ gần 20 ms mới nhận kết quả. Nếu biết thời gian chạy và chọn job ngắn trước, waiting time trung bình có thể giảm. Nhưng ở hệ tương tác, liên tục ưu tiên job ngắn có thể khiến job dài bị starvation.

Trong thực tế, scheduler thường không biết chính xác thời gian còn lại. Nó dùng ưu tiên, quantum, lịch sử sử dụng và nhóm tài nguyên để xấp xỉ mục tiêu.

## Fairness không tự đồng nghĩa equal share

Chia CPU đều theo thời gian có thể không công bằng giữa một task người dùng và hàng nghìn worker của một tenant. Hệ thống có thể áp dụng trọng số, quota hoặc fairness theo nhóm. Định nghĩa fairness cần tính tới ranh giới người dùng, dịch vụ và ưu tiên.

Ưu tiên quá cao kéo dài có thể làm task khác đói CPU. Aging, quota và giới hạn thời gian là những công cụ giảm starvation. Mỗi chính sách có ý nghĩa vận hành và nên được quan sát.

## Tóm tắt

- Scheduler chọn process/thread ready để dùng CPU.
- Turnaround, waiting, response, throughput và utilization là mục tiêu khác nhau.
- Preemption tăng đáp ứng nhưng có overhead và phức tạp hơn.
- Job ngắn trước có thể giảm waiting trung bình nhưng gây starvation cho job dài.
- Fairness phụ thuộc cách định nghĩa nhóm và trọng số, không chỉ chia đều thời gian.

## Tự kiểm tra

**Giảm thời gian phản hồi đầu tiên đồng nghĩa job hoàn tất nhanh hơn?** Không; response time và turnaround đo những mốc khác nhau.

**Preemptive scheduling không có chi phí?** Sai; lưu trạng thái, chuyển context và cạnh tranh cache có thể tốn tài nguyên.

**Ưu tiên cao luôn là chính sách tốt?** Chỉ khi mục tiêu và giới hạn rõ; nếu không, task khác có thể bị đói.

## Đọc tiếp

Các thuật toán FCFS, SJF, Round Robin và multi-level feedback queue hiện thực những đánh đổi này theo các cách khác nhau.
