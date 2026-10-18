---
title: "Priority, nice và lập lịch trên Linux"
category: "Operating System"
tags: ["linux", "scheduler", "priority"]
description: "Đọc nice value đúng cách, phân biệt lớp lập lịch thường và realtime, và tránh hiểu priority như phần trăm CPU cố định."
updated: 2026-10-16
translationKey: "operating-system/linux-scheduler-priorities-and-nice"
---

Priority không phải cam kết rằng một process luôn nhận đúng một tỷ lệ CPU. Nó ảnh hưởng quyết định khi có nhiều luồng runnable cạnh tranh cùng CPU, trong khi tải thực tế còn phụ thuộc số core, thời gian chờ I/O, affinity và chính sách scheduler.

## Nice trong lớp lập lịch thường

Với các task thông thường, nice thường nằm từ -20 đến 19: số càng thấp biểu thị mức ưu tiên tương đối cao hơn; số càng cao thì task nhường CPU nhiều hơn khi cạnh tranh. Người dùng thường chỉ được tăng nice (giảm ưu tiên); giảm nice xuống mức ưu tiên cao hơn có thể cần quyền quản trị.

Với GNU `nice`, `nice -n 10 command` cộng 10 vào nice được kế thừa, trong giới hạn cho phép; từ nice 0 ta được 10, còn từ 5 ta được 15. Đây là mức điều chỉnh, không phải yêu cầu đặt giá trị tuyệt đối 10. `renice` điều chỉnh process đang chạy. `ps -o pid,ni,pri,stat,comm -p PID` cho thấy một số thông tin liên quan, nhưng không nên nhầm cột `PRI` với một tỷ lệ CPU trực tiếp.

## Realtime và affinity

Linux có các policy realtime như `SCHED_FIFO` và `SCHED_RR`, với ngữ nghĩa khác lớp thường. Một task realtime có thể chiếm CPU trong thời gian dài nếu thiết kế sai, làm hệ thống khó phản hồi. Dùng policy này cần giới hạn quyền và hiểu rõ watchdog, priority inversion cùng ngân sách CPU của hệ thống.

CPU affinity giới hạn những core một task có thể chạy trên. Nó có thể hữu ích cho locality hoặc workload cần tính ổn định, nhưng ràng buộc quá hẹp khiến scheduler mất lựa chọn khi một core quá tải. Cgroup có thể giới hạn hoặc phân bổ tài nguyên theo nhóm, phù hợp hơn khi cần chính sách cho nhiều process.

## Quan sát trước khi thay đổi

`top`/`htop` cho ảnh chụp mức sử dụng; `ps` cho trạng thái từng process; `pidstat` hoặc công cụ tương tự cho chuỗi thời gian. Kiểm tra xem CPU thật sự bận hay task đang blocked. Nếu workload chủ yếu chờ ổ đĩa hoặc mạng, tăng priority thường không giải quyết nguyên nhân.

Thử thay đổi trên một process đại diện, đo latency và throughput rồi mới áp dụng rộng. Một tác vụ ưu tiên cao hơn có thể cải thiện độ trễ của chính nó bằng cách lấy CPU từ tác vụ khác.

## Tự kiểm tra

**Nice 19 nghĩa là process nhận đúng 19% CPU?** Không.

**Tăng priority có giúp I/O chậm không?** Thường không nếu bottleneck là thiết bị hoặc dịch vụ bên ngoài.

**Realtime đồng nghĩa với chạy nhanh hơn?** Nó cung cấp chính sách lập lịch khác và có thể gây starvation nếu lạm dụng.

## Đọc tiếp

Khi process chạy trong container, cgroup đặt giới hạn và accounting theo nhóm tài nguyên.
