---
title: "Ví dụ lập lịch: tính waiting, turnaround và response time"
category: "Operating System"
tags: ["scheduling", "fcfs", "round robin", "metrics"]
description: "Tính Gantt chart cho FCFS, SJF và Round Robin để thấy metric đổi theo policy."
updated: 2026-10-16
translationKey: "operating-system/scheduling-worked-example"
---

Giả sử ba job cùng đến thời điểm 0 với CPU burst: A=6 ms, B=2 ms, C=4 ms. Bỏ qua context-switch cost để làm ví dụ. Waiting time là thời gian trong ready queue; turnaround là completion trừ arrival; response là thời điểm chạy đầu tiên trừ arrival.

## FCFS

```text
0 ───── A ───── 6 ─ B ─ 8 ─── C ─── 12
```

Completion: A=6, B=8, C=12. Waiting: A=0, B=6, C=8; trung bình `14/3`. Turnaround: 6,8,12. Response ở non-preemptive model bằng thời điểm bắt đầu.

## SJF non-preemptive

```text
0 ─ B ─ 2 ─── C ─── 6 ───── A ───── 12
```

Waiting: B=0, C=2, A=6; trung bình `8/3`. Nhưng kernel không biết burst tương lai chính xác; đây là mô hình so sánh.

## Round Robin quantum 2 ms

```text
0 A 2 B 4 C 6 A 8 C 10 A 12
```

Response: A=0, B=2, C=4. Completion: B=4, C=10, A=12. RR cải thiện phản hồi job mới so với FCFS nhưng A/C hoàn tất muộn hơn SJF trong ví dụ.

## Cách dùng metric

Thêm arrival khác 0, I/O block hoặc context-switch cost sẽ đổi kết quả. Turnaround trung bình có thể giảm trong khi response của job dài tệ hơn. Cần chọn metric theo hệ thống, không chỉ một con số.

## Tự kiểm tra

**RR luôn giảm turnaround?** Không; quantum/arrival/workload ảnh hưởng.

**Response time của job là thời gian tới completion?** Không; đó là thời điểm phản hồi đầu tiên.

**Bỏ context-switch cost an toàn khi benchmark thật?** Chỉ cho mô hình; hệ thống thật phải tính overhead.

## Đọc tiếp

Scheduler thực tế thêm fairness, priority, multicore và cgroup policies.
