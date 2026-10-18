---
title: "Đo hiệu năng CPU: latency, throughput và thời gian chờ"
category: "Operating System"
tags: ["performance", "latency", "throughput", "computer architecture"]
description: "Phân biệt thời gian hoàn thành một việc với tốc độ xử lý nhiều việc, rồi tìm nút thắt có bằng chứng."
updated: 2026-10-16
translationKey: "operating-system/performance-latency-throughput"
---

Một máy có thể hoàn tất một tác vụ nhanh hơn nhưng xử lý tổng thể ít yêu cầu hơn; cũng có thể xử lý nhiều việc cùng lúc mà mỗi yêu cầu riêng phải chờ lâu. Vì vậy, câu hỏi “máy này nhanh không?” chưa đủ. Cần biết đang đo latency, throughput hay một mục tiêu khác.

## Hai thước đo trả lời hai câu hỏi

- **Latency (độ trễ):** một tác vụ mất bao lâu từ lúc bắt đầu đến lúc hoàn thành.
- **Throughput (thông lượng):** bao nhiêu tác vụ hoặc dữ liệu được xử lý trong một đơn vị thời gian.

Ví dụ, máy chủ xử lý 100 request mỗi giây có throughput 100 req/s trong khoảng đo. Nhưng một request cụ thể có thể mất 20 ms hoặc 2 giây. Cần xem phân phối latency, nhất là các phân vị như p50, p95 và p99; giá trị trung bình có thể che khuất một nhóm request rất chậm.

CPU pipeline có thể tăng throughput bằng cách chồng lấp nhiều lệnh mà không làm latency của từng lệnh biến mất. Tương tự, chạy nhiều request đồng thời có thể tăng throughput tới lúc tài nguyên bão hòa, đồng thời làm latency tăng do tranh chấp.

## Thời gian CPU và thời gian chờ

Thời gian quan sát của chương trình có thể gồm CPU đang thực thi, chờ bộ nhớ, chờ đĩa, chờ mạng, chờ lock hoặc bị hệ điều hành chưa cấp CPU. Tăng xung nhịp chỉ giúp phần thời gian thực sự bị giới hạn bởi CPU, và còn phụ thuộc giới hạn điện năng, nhiệt độ, cache và khả năng song song.

Một phân rã hữu ích là:

```text
thời gian hoàn thành
≈ thời gian CPU hữu ích
 + thời gian chờ tài nguyên
 + chi phí đồng bộ/lập lịch/điều phối
```

Đây là mô hình để đặt câu hỏi; các phần có thể chồng lấp nên không phải lúc nào cũng cộng trực tiếp được. Công cụ profiling và tracing giúp xác định phần nào chiếm nhiều thời gian trong workload thực.

## Công thức CPU cơ bản và giới hạn của nó

Một mô hình cổ điển viết:

```text
CPU time ≈ số lệnh × CPI × chu kỳ thời gian
```

Trong đó CPI là số chu kỳ trung bình trên mỗi lệnh theo cách đếm đã chọn. Công thức nhắc ta rằng hiệu năng không chỉ do xung nhịp: số lệnh và chu kỳ mỗi lệnh cũng quan trọng.

Trên CPU hiện đại, “một lệnh” ở cấp ISA có thể thành nhiều micro-operation; nhiều lệnh có thể chạy đồng thời; cache miss và nhánh làm thời gian biến thiên. Vì thế, công thức là công cụ lý luận, không thay thế benchmark hoặc bộ đếm hiệu năng.

## Định luật Amdahl: phần không được cải thiện giới hạn tốc độ chung

Nếu tỷ lệ `p` của thời gian được tăng tốc `s` lần, speedup tổng thể lý tưởng là:

```text
speedup = 1 / ((1 - p) + p / s)
```

Giả sử 80% thời gian có thể chạy nhanh gấp 4 lần:

```text
speedup = 1 / (0.2 + 0.8 / 4) = 2.5 lần
```

Phần 20% không được cải thiện đặt giới hạn. Thực tế có thể còn thấp hơn vì overhead, giao tiếp giữa lõi và tài nguyên dùng chung. Bài học thực dụng: đo trước, xác định phần chiếm thời gian, rồi chọn tối ưu tác động trực tiếp tới phần đó.

## Benchmark cần so sánh công bằng

Một phép đo có ý nghĩa cần giữ điều kiện so sánh phù hợp: cùng dữ liệu đầu vào, cùng tác vụ, cùng chế độ build, cùng cấu hình máy và đủ số lần chạy để thấy biến thiên. Ghi cả latency lẫn throughput nếu hệ thống phục vụ nhiều việc. Theo dõi nhiệt độ và trạng thái máy khi phép đo dài.

Không nên chỉ so sánh một lần chạy hoặc kết luận từ benchmark vi mô sang ứng dụng lớn. Phép đo vi mô hữu ích để hiểu một thao tác cô lập; nó có thể không đại diện cho cache, cấp phát, I/O và concurrency trong chương trình thật.

## Tóm tắt

- Latency đo thời gian của một tác vụ; throughput đo lượng công việc hoàn thành theo thời gian.
- Tăng mức đồng thời có thể cải thiện throughput nhưng làm latency xấu đi khi tài nguyên bão hòa.
- Thời gian chờ bộ nhớ, I/O và đồng bộ có thể lớn hơn thời gian CPU tính toán.
- Amdahl cho thấy phần không được tối ưu giới hạn speedup tổng thể.
- Benchmark phải đại diện cho workload và điều kiện sử dụng thực tế.

## Tự kiểm tra

**Throughput tăng có nghĩa mọi request đều hoàn tất nhanh hơn?** Không. Có thể xử lý nhiều request hơn trong khi từng request phải chờ lâu hơn.

**CPU có xung nhịp cao hơn chắc chắn làm chương trình nhanh hơn?** Không. Chương trình có thể bị giới hạn bởi bộ nhớ, I/O, đồng bộ hoặc phần khác.

**Nếu tối ưu một đoạn code nhanh gấp 10 lần thì toàn ứng dụng nhanh gấp 10 lần?** Chỉ khi gần như toàn bộ thời gian nằm ở đoạn đó và overhead không đáng kể; Amdahl cho cách ước lượng giới hạn.

## Đọc tiếp

Khi bắt đầu topic **Processes & Scheduling**, các khái niệm latency và throughput sẽ giúp phân tích độ đáp ứng và mức sử dụng CPU.
