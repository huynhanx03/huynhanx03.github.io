---
title: "FCFS, SJF, Round Robin và feedback queue"
category: "Operating System"
tags: ["scheduling", "round robin", "operating system"]
description: "So sánh các thuật toán lập lịch kinh điển và xem chính sách nào phù hợp với từng kiểu workload."
updated: 2026-10-17
translationKey: "operating-system/scheduling-algorithms"
---

Các thuật toán lập lịch kinh điển giúp ta thấy mục tiêu nào đang được ưu tiên. Chúng là mô hình để suy luận; scheduler của hệ điều hành phổ thông thường phức tạp hơn, có nhiều lớp và xử lý workload đa lõi.

## FCFS: đến trước chạy trước

First-Come, First-Served chạy job theo thứ tự đến, thường non-preemptive. Ưu điểm là dễ hiểu và ít overhead chính sách. Nhược điểm là một job dài ở đầu hàng có thể làm nhiều job ngắn phía sau chờ lâu — hiệu ứng convoy.

FCFS phù hợp khi công việc tương tự nhau hoặc đơn giản hóa là ưu tiên; nó thường không đáp ứng tốt tương tác nếu job có thời gian CPU biến thiên lớn.

## SJF và shortest remaining time

Shortest Job First chọn job có burst CPU dự đoán ngắn nhất. Trong mô hình một CPU, mọi job đã sẵn sàng cùng lúc, không preempt và biết đúng burst CPU, xếp theo burst tăng dần sẽ tối thiểu waiting time trung bình. Khi thời điểm đến khác nhau hoặc có ràng buộc khác, kết luận này không áp dụng nguyên xi. Kernel thường không biết trước burst; hệ thống phải dự đoán từ lịch sử hoặc dùng heuristic.

Shortest Remaining Time First là biến thể preemptive: job mới có thời gian còn lại ngắn hơn có thể ngắt job đang chạy. Điều đó có thể cải thiện phản hồi cho job ngắn nhưng khiến job dài chờ vô hạn nếu job ngắn liên tục tới.

## Round Robin

Round Robin cấp mỗi job một quantum. Hết quantum mà job chưa xong thì đưa nó về cuối hàng ready. Quantum quá dài làm thuật toán gần FCFS; quá ngắn làm context switch tăng và phần lớn thời gian có thể tiêu cho điều phối.

Quantum không phải thời lượng hoàn tất của job, mà là giới hạn một lượt CPU trước khi scheduler đánh giá lại. Workload tương tác thường muốn quantum cân bằng giữa phản hồi và overhead. Giá trị thực tế do hệ điều hành và cấu hình quyết định.

## Multi-level feedback queue

MLFQ dùng nhiều hàng với mức ưu tiên khác nhau. Job mới có thể bắt đầu ở mức ưu tiên cao; nếu dùng hết quantum liên tục, hệ thống hạ xuống hàng thấp hơn. Job thường chờ I/O và nhường CPU sớm có thể giữ ưu tiên cao, phản ánh xu hướng tương tác.

Quy tắc feedback cần tính tổng CPU allotment ở mỗi mức, không chỉ nhìn một quantum riêng lẻ. Nếu không, process có thể cố tình phát I/O ngay trước lúc hết quantum để được giữ ưu tiên cao và chiếm CPU nhiều hơn. Khi đã dùng hết allotment của mức, process bị hạ hàng dù CPU time được tiêu thụ qua một lượt dài hay nhiều lượt ngắn.

Nếu hàng ưu tiên cao luôn có việc, process ở hàng thấp có thể đói CPU. Một cách giảm starvation là định kỳ nâng toàn bộ process lên hàng cao nhất; cách này cũng cho process cơ hội được đánh giá lại nếu hành vi workload đổi từ CPU-bound sang tương tác. Khoảng nâng ưu tiên là tham số cần chọn theo workload: quá thưa thì chờ lâu, quá dày thì giảm lợi ích của phân loại.

Quantum ngắn ở hàng cao hỗ trợ phản hồi nhanh cho công việc tương tác; hàng thấp có thể được quantum dài hơn để giảm overhead cho tác vụ CPU-bound. Số hàng, quantum, allotment và chu kỳ nâng ưu tiên là quyết định riêng của từng triển khai. MLFQ là họ chính sách học hành vi từ lịch sử, không phải một cấu hình duy nhất cố định.

## Chọn thuật toán theo workload

| Workload | Mối quan tâm | Hướng đánh đổi |
| --- | --- | --- |
| Batch job | throughput, turnaround | gom việc hoặc tối ưu job ngắn, tránh starvation |
| Desktop tương tác | phản hồi nhanh | preemption, ưu tiên task tương tác |
| Server đa người dùng | fairness, tail latency | nhóm, trọng số, quota và quan sát tải |
| Hệ thời gian thực | deadline | phân tích schedulability và mức ưu tiên phù hợp |

Không nên đổi ưu tiên process chỉ vì một biểu đồ CPU cao. Đầu tiên xác định task bị chậm, nó đang ready hay blocked, và tiêu chí dịch vụ nào cần cải thiện.

## Tự tính response time và turnaround

Với job đến lúc `arrival`, lần đầu được chạy lúc `first_run` và hoàn tất lúc `finish`:

```text
response time   = first_run - arrival
turnaround time = finish - arrival
waiting time    = turnaround time - tổng CPU burst
```

Trong bài chỉ có CPU, job không bị block nên công thức waiting time trên đúng. Nếu có I/O, thời gian bị block vẫn nằm trong turnaround nhưng không phải thời gian chờ ở ready queue. Khi ấy, `ready waiting = turnaround - tổng CPU burst - tổng thời gian blocked`, hoặc cộng trực tiếp các khoảng job ở trạng thái ready. Turnaround từ lúc đến tới lúc hoàn tất vẫn bao gồm thời gian chạy, chờ ready và block. Khi so scheduler, dùng cùng thời điểm đến và cùng burst để kết quả phản ánh chính sách thay vì workload khác nhau.

### Bài thực hành: lập trace cùng một workload

Tự vẽ timeline cho ba job đến cùng lúc, trước hết cho burst bằng nhau rồi đổi thành 100, 200 và 300 đơn vị. Tính response, turnaround và waiting time từng job dưới FIFO, SJF và Round Robin; với RR đổi quantum từ 1 lên giá trị lớn hơn. Sau đó đổi thứ tự đến và kiểm tra điều kiện nào làm SJF/FIFO cho kết quả giống nhau. Với `N` job đã cùng sẵn sàng, RR quantum `q` và không tính overhead, job cuối trong một vòng có thể đợi xấp xỉ `(N−1)q` trước lượt đầu; overhead chuyển ngữ cảnh làm thời gian thực tăng. Nêu rõ giả định trước khi so số liệu.

## Thực hành: đọc trace MLFQ

Vẽ trace cho hai job qua hai queue với quantum ngắn, rồi thay từng yếu tố một: job có burst CPU khác nhau, job thường xuyên block vì I/O, vị trí đưa job trở lại queue sau I/O, hoặc thời điểm priority boost. Đo phần CPU mỗi job nhận và thời gian job dài nhất phải chờ.

Sau đó so một chính sách có tính CPU allotment với quy tắc cũ chỉ dựa vào việc nhường CPU: thử job cố tình nhường ngay trước khi hết quantum để xem nó có giữ ưu tiên cao bất hợp lý không. Bài tập này giúp phân biệt “nhường CPU vì đang chờ I/O” với “nhường để né accounting”; con số simulator không phải bảo đảm của scheduler hệ điều hành hiện đại.

## Tóm tắt

- FCFS đơn giản nhưng dễ gặp convoy.
- SJF có đặc tính tốt trong mô hình biết burst, nhưng thời gian tương lai không sẵn có.
- Round Robin đánh đổi quantum giữa phản hồi và overhead.
- MLFQ điều chỉnh ưu tiên theo hành vi quan sát được, cần cơ chế chống starvation.
- Scheduler thật còn xét đa lõi, nhóm người dùng, ưu tiên và giới hạn tài nguyên.

## Tự kiểm tra

**Round Robin quantum nhỏ tùy ý luôn công bằng hơn?** Không; overhead lớn và công bằng cần xét theo workload/nhóm.

**SJF luôn triển khai chính xác được trong kernel?** Không nếu không biết burst tương lai; hệ thống chỉ có thể ước lượng.

**MLFQ có thể khiến job CPU-bound đói?** Có, nếu không có aging hoặc chính sách cân bằng.

## Đọc tiếp

Trên máy nhiều lõi, scheduler còn phải quyết định task chạy ở CPU nào và cân bằng tải ra sao.
