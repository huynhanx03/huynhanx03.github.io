---
title: "Pipeline CPU: xử lý nhiều lệnh chồng lấp"
category: "Operating System"
tags: ["cpu", "pipeline", "hazards", "computer architecture"]
description: "Hiểu các giai đoạn pipeline và ba loại hazard khiến CPU phải chờ hoặc đổi cách thực thi."
updated: 2026-10-17
translationKey: "operating-system/cpu-pipeline"
---

Nếu mỗi lệnh phải hoàn tất toàn bộ công việc rồi CPU mới bắt đầu lệnh tiếp theo, nhiều bộ phận phần cứng sẽ nhàn rỗi theo từng khoảng. Pipeline chia quá trình xử lý thành các giai đoạn, giống dây chuyền: một lệnh được giải mã trong lúc lệnh trước đang thực thi và lệnh sau đang được lấy.

Pipeline tăng khả năng **throughput** — số lệnh hoàn tất trong một khoảng thời gian — bằng cách chồng lấp công việc. Nó không nhất thiết giảm **latency** của một lệnh đơn. Sự khác nhau này rất quan trọng khi diễn giải câu “pipeline làm CPU nhanh hơn”.

## Mô hình dây chuyền năm giai đoạn

Một mô hình giảng dạy phổ biến chia lệnh thành:

| Giai đoạn | Công việc khái quát |
| --- | --- |
| IF | Lấy lệnh từ bộ nhớ lệnh/cache |
| ID | Giải mã lệnh và đọc thanh ghi |
| EX | Tính toán hoặc tính địa chỉ |
| MEM | Truy cập bộ nhớ dữ liệu nếu cần |
| WB | Ghi kết quả về thanh ghi |

Đây là sơ đồ đơn giản, không phải sơ đồ của mọi CPU. CPU thật có thể có nhiều giai đoạn hơn, nhiều đơn vị thực thi, cache nhiều tầng và các hàng đợi nội bộ.

Với lệnh độc lập, sau khi dây chuyền được lấp đầy, mô hình lý tưởng **single-issue** có thể hoàn tất gần một lệnh mỗi chu kỳ. CPU superscalar có thể phát hành nhiều lệnh mỗi chu kỳ; giai đoạn chậm nhất và số đơn vị thực thi cùng đặt giới hạn. Phụ thuộc và chờ đợi tạo khoảng trống. Pipeline không biến một phép cộng thành năm phép cộng cùng chạy trên cùng dữ liệu.

## Khởi động dây chuyền và throughput thực tế

Trong mô hình lý tưởng single-issue có `k` giai đoạn, mỗi giai đoạn mất `T/k`, lệnh đầu tiên cần khoảng `T` để đi hết pipeline. Sau khi lấp đầy, pipeline có thể hoàn tất một lệnh mỗi `T/k`. Vì thế lợi ích lớn nhất xuất hiện ở luồng dài; chương trình ngắn phải trả chi phí lấp đầy và xả pipeline. Nếu 4 giai đoạn mỗi 1 ns chạy 4 lệnh, lệnh đầu ra sau 4 ns và sau đó mỗi ns có thêm một lệnh. Với chỉ vài lệnh, không thể lấy throughput ổn định để suy ra speedup toàn chương trình.

Đo throughput theo instructions per cycle (IPC), rồi đổi sang tốc độ lệnh mỗi giây bằng `IPC / clock period`. IPC trung bình thấp hơn giới hạn lý thuyết của thiết kế khi pipeline còn đang lấp đầy hoặc có bubble. Một stall kéo dài làm bubble chạy xuống pipeline; khi bubble tới write-back thì chu kỳ đó không hoàn tất lệnh nào. Latency của một lệnh là số chu kỳ nó ở trong pipeline: tối thiểu thường gần độ sâu pipeline, nhưng tăng thêm nếu bị stall.

Độ sâu lớn chỉ giúp nếu các stage được cân bằng và clock thật sự ngắn hơn. Clock bị giới hạn bởi stage chậm nhất; stage nhanh hơn phải chờ, pipeline sâu hơn cũng tốn logic điều khiển/buffering và mất lâu hơn để lấp lại sau khi flush. Do đó mức speedup lý tưởng bằng số stage là trần của mô hình, không phải dự báo hiệu năng thực tế.

## Hazard là gì?

Hazard là tình huống ngăn pipeline tiến theo lịch lý tưởng. Có ba nhóm thường gặp:

1. **Structural hazard:** hai thao tác cần cùng tài nguyên phần cứng trong cùng thời điểm.
2. **Data hazard:** một lệnh cần kết quả mà lệnh trước chưa tạo xong.
3. **Control hazard:** CPU chưa biết đường đi tiếp theo vì nhánh phụ thuộc vào điều kiện.

Thiết kế CPU có thể thêm tài nguyên, chuyển tiếp kết quả, trì hoãn lệnh hoặc dự đoán đường đi. Các biện pháp này giảm một số lần chờ nhưng làm phần cứng phức tạp hơn.

## Data hazard và forwarding

```text
add r3, r1, r2
sub r4, r3, r5
```

Lệnh thứ hai cần `r3`, là kết quả lệnh đầu. Nếu pipeline chỉ đọc thanh ghi trước khi lệnh `add` ghi kết quả về, `sub` phải chờ. CPU có thể **forward** kết quả trực tiếp từ giai đoạn đang giữ nó tới đầu vào phép tính kế tiếp mà chưa cần đợi ghi rồi đọc lại từ register file.

Forwarding không giải quyết mọi phụ thuộc. Một lệnh load có thể chưa nhận dữ liệu từ cache khi lệnh sau cần dùng ngay:

```text
load r3, [r1]
add  r4, r3, r5
```

Đây là load-use dependency. CPU có thể chèn một bubble, tức chu kỳ không đưa lệnh hữu ích tương ứng vào giai đoạn đó, rồi tiếp tục khi dữ liệu sẵn sàng. Số chu kỳ chờ phụ thuộc CPU và tình trạng bộ nhớ.

Trong CPU ngoài thứ tự, lệnh độc lập sau đó có thể được thực thi trong lúc một load chờ. Tuy vậy, nếu nhiều lệnh cùng phụ thuộc dữ liệu chưa về, việc đổi thứ tự không thể tạo ra dữ liệu còn thiếu.

## Control hazard và dự đoán nhánh

```text
if (x == 0) {
    do_a();
} else {
    do_b();
}
```

CPU cần biết nhánh nào được chọn để nạp đúng lệnh tiếp theo. Nó có thể đợi điều kiện hoàn tất, hoặc dự đoán. Nếu dự đoán đúng, pipeline tránh được một phần thời gian chờ. Nếu sai, những lệnh trên đường dự đoán có thể bị loại bỏ trước khi tạo kết quả kiến trúc có thể nhìn thấy; CPU quay lại đường đúng.

Nhánh không có nghĩa mọi chương trình chứa `if` đều chậm. Bộ dự đoán có thể học được nhánh ổn định. Chi phí phụ thuộc mức khó dự đoán và độ sâu pipeline. Đổi code để loại nhánh chỉ có ích nếu phép đo cho thấy nó là nút thắt và phiên bản mới vẫn dễ hiểu.

## Structural hazard

Trong mô hình một cổng bộ nhớ dùng chung, lấy lệnh và đọc dữ liệu có thể tranh cùng tài nguyên. CPU có thể tạm dừng một thao tác hoặc dùng đường dẫn/cache tách biệt để giảm xung đột. Cách giải quyết phụ thuộc thiết kế vi kiến trúc; đây là một lý do không nên lấy sơ đồ pipeline trong sách nhập môn làm bản sao chính xác của một chip cụ thể.

## Vì sao pipeline sâu hơn không phải luôn tốt hơn?

Chia công việc thành nhiều giai đoạn ngắn có thể cho phép tần số cao hơn, nhưng tăng chi phí khi nhánh dự đoán sai và làm dữ liệu phải đi qua nhiều ranh giới hơn. Tần số xung cao hơn không tự bảo đảm hoàn thành nhiều công việc hơn mỗi giây. Hiệu năng phụ thuộc cả số chu kỳ mỗi lệnh, mức song song, cache, công suất và workload.

## Tóm tắt

- Pipeline chồng lấp các giai đoạn của nhiều lệnh để tăng throughput.
- Hazard xuất hiện do tranh chấp tài nguyên, phụ thuộc dữ liệu hoặc nhánh.
- Forwarding và thực thi ngoài thứ tự có thể giảm thời gian chờ, nhưng không xóa phụ thuộc thật.
- Dự đoán nhánh giúp CPU làm trước; đoán sai thì phần việc đầu cơ bị bỏ.
- Pipeline là chi tiết vi kiến trúc; cùng ISA vẫn có thể có pipeline khác nhau.

## Tự kiểm tra

**Pipeline năm giai đoạn có nghĩa một lệnh luôn hoàn tất trong năm chu kỳ?** Không. Các giai đoạn có thể chồng lấp, và latency thực còn phụ thuộc thiết kế cũng như hazard.

**Forwarding có loại bỏ mọi data hazard không?** Không. Ví dụ load-use vẫn có thể phải chờ dữ liệu.

**CPU đoán nhánh sai có trả lại mọi tác dụng phụ đã xảy ra không?** CPU loại bỏ trạng thái đầu cơ theo cơ chế kiến trúc của nó; các tác dụng phụ bên ngoài như truy cập thiết bị không được xem như phép tính thuần để tùy ý đảo ngược.

## Đọc tiếp

Xem [CPU thực thi chương trình](/vi/notes/operating-system/cpu-execution/) để ôn mô hình fetch/decode/execute, rồi đọc phần [cache và hệ thống bộ nhớ](/vi/notes/operating-system/cache-memory-hierarchy/).
