---
title: "Cache và hệ thống bộ nhớ: giữ dữ liệu cần dùng ở gần CPU"
category: "Operating System"
tags: ["cache", "memory hierarchy", "locality", "computer architecture"]
description: "Giải thích vì sao bộ nhớ được tổ chức thành nhiều tầng và chương trình tận dụng locality như thế nào."
updated: 2026-10-16
translationKey: "operating-system/cache-memory-hierarchy"
---

CPU có thể thực hiện phép tính nhanh hơn nhiều so với thời gian cần để lấy dữ liệu từ RAM. Nếu mỗi lần cộng đều phải chờ RAM, nhiều đơn vị tính toán sẽ không có việc. Máy tính giải quyết khoảng cách này bằng một hệ thống bộ nhớ nhiều tầng: phần nhỏ và nhanh nằm gần CPU, phần lớn hơn và chậm hơn nằm xa hơn.

Một sơ đồ khái niệm thường là:

```text
Thanh ghi → L1 cache → L2 cache → L3 cache → RAM → SSD/HDD
nhanh, nhỏ                                      lớn, bền hơn
```

Sơ đồ này không đảm bảo mọi CPU có đúng từng tầng hoặc cấu hình giống nhau. SSD/HDD cũng không phải cache của RAM theo cùng một nghĩa vật lý; sơ đồ nhấn mạnh sự đánh đổi về dung lượng, độ trễ và chi phí.

## Cache lưu một bản sao để truy cập nhanh

Cache giữ bản sao của một phần dữ liệu từ tầng xa hơn. Khi CPU yêu cầu địa chỉ:

- **Cache hit:** dữ liệu có trong tầng cache đang kiểm tra.
- **Cache miss:** phải tìm ở tầng tiếp theo hoặc RAM, thường tốn lâu hơn.

Cache không chứa toàn bộ RAM. Nó giữ một tập con được chọn và thay thế khi cần chỗ. Phần cứng thường đưa dữ liệu theo **cache line**, một khối liên tiếp có kích thước phụ thuộc CPU. Do đó, đọc một byte có thể kéo theo nhiều byte lân cận.

Các tầng L1, L2, L3 thường khác nhau về dung lượng, độ trễ, chia sẻ giữa lõi và cách kết hợp. Không nên khẳng định một kích thước hoặc latency cụ thể cho mọi máy; hãy xem tài liệu CPU hoặc đo trên hệ thống đích.

## Locality giúp cache đoán đúng dữ liệu cần giữ

Cache hoạt động hiệu quả vì nhiều chương trình thể hiện locality:

- **Temporal locality:** dữ liệu vừa dùng có khả năng sớm được dùng lại.
- **Spatial locality:** dữ liệu gần địa chỉ vừa dùng có khả năng được dùng tiếp.

Vòng lặp đọc mảng theo thứ tự thường tận dụng cả hai: phần tử kế tiếp gần phần tử hiện tại, và cùng một vùng có thể được truy cập lặp lại. Truy cập các node rải rác trong một cấu trúc liên kết có thể kém locality hơn, dù cả hai đều duyệt cùng số phần tử.

Locality là xu hướng, không phải bảo đảm. Một workload có thể vượt dung lượng cache, truy cập dữ liệu ngẫu nhiên hoặc dùng dữ liệu một lần. Trong trường hợp đó, cache hit rate thấp và lợi ích giảm.

## Nơi đặt cache line: linh hoạt hay dễ tra cứu

Khi nạp block từ RAM, cache cần quy tắc xác định block đó được phép nằm ở đâu. **Direct-mapped** cho mỗi block đúng một vị trí: tra nhanh, nhưng hai block cùng ánh xạ vào một frame sẽ đẩy nhau ra dù cache còn chỗ khác. **Fully associative** cho block vào bất kỳ frame nào, giảm collision nhưng phải tìm tag trong nhiều vị trí. **N-way set-associative** chia cache thành set; block chỉ vào một set nhất định nhưng được chọn một trong N way trong set đó. Tăng associativity giảm một số conflict nhưng cần so sánh/chọn trong nhiều way và có thể tăng độ trễ/độ phức tạp. Thiết kế thật cân bằng dung lượng, latency, năng lượng và workload.

## Working set, streaming và cache pollution

Một **working set** là nhóm code/data được chương trình dùng lặp lại trong một giai đoạn. Nếu working set vừa với tầng cache, temporal locality có thể tạo nhiều hit. Dữ liệu streaming được đọc một lần có spatial locality tốt nhưng temporal locality thấp; nạp toàn bộ vào cache có thể đẩy code hoặc dữ liệu sẽ được dùng lại ra ngoài (**cache pollution**). Nhiều kiến trúc tách I-cache và D-cache ở L1 một phần vì code và data có mẫu truy cập khác nhau. Chính sách streaming/non-temporal tùy CPU và không phải lúc nào cũng có lợi; cần đo workload.

## Khi cache đầy: chọn dòng nào để thay?

Khi miss cần nạp một dòng mới nhưng set tương ứng đã đầy, cache phải đẩy một dòng cũ ra. Chính sách thay thế cố tận dụng temporal locality: dòng vừa được dùng có thể còn được dùng lại sớm. Lý tưởng là bỏ dòng sẽ lâu nhất mới được cần lại, nhưng muốn biết điều đó phải đoán tương lai. **LRU** (least recently used) dùng lịch sử gần đây làm dấu hiệu; triển khai LRU chính xác có thể tốn mạch và thời gian, nên phần cứng thường dùng các chính sách gần đúng như pseudo-LRU. FIFO hoặc chọn ngẫu nhiên là những lựa chọn đơn giản hơn, đôi khi hợp với một số thiết kế.

Việc thay thế chỉ chọn trong các way của set mà địa chỉ được ánh xạ vào, chứ không nhất thiết được chọn bất kỳ dòng nào trên toàn cache. Vì vậy associativity và replacement cùng ảnh hưởng đến conflict miss. Không có chính sách nào luôn thắng trên mọi workload.

## Kích thước cache line là một đánh đổi

Dòng lớn tận dụng spatial locality nếu chương trình sớm dùng các byte lân cận. Nhưng với dung lượng cache cố định, dòng lớn làm giảm số dòng có thể giữ, có thể đưa dữ liệu không cần thiết vào cache và tốn thêm băng thông mỗi lần nạp. Dòng nhỏ giữ working set với độ hạt mịn hơn nhưng có thể bỏ lỡ lợi ích của truy cập tuần tự. Kích thước thực tế do kiến trúc chọn; đây là cách hiểu trade-off, không phải một tham số mà ứng dụng thường tự đổi.

## Ghi dữ liệu: write-through và write-back

Cache cũng phải quyết định khi CPU sửa dữ liệu. Với **write-through**, lần ghi được chuyển ngay xuống tầng thấp hơn; tầng dưới thấy bản cập nhật sớm hơn, đổi lại mỗi lần ghi tạo thêm lưu lượng. Với **write-back**, cache cập nhật bản sao của mình trước và hoãn ghi xuống tầng thấp hơn đến khi dòng bị đẩy ra. Cách này có thể giảm lưu lượng ghi lặp lại, nhưng cache phải theo dõi dòng đã bị sửa (dirty) và phối hợp đúng lúc ghi trả.

Đây là mô hình cơ bản để hiểu trade-off. Cache nhiều tầng, nhiều lõi, DMA/I/O và giao thức coherence khiến việc giữ các bản sao nhất quán phức tạp hơn mô hình một CPU, một L1 trong sách. **Write-back cũng không có nghĩa dữ liệu đã bền vững trên SSD/HDD**: cache CPU và độ bền sau mất điện là những vấn đề khác nhau.

## Cache miss có nhiều nguyên nhân

Một cách phân loại nhập môn:

1. **Compulsory miss:** lần đầu chạm tới một cache line.
2. **Capacity miss:** working set lớn hơn khả năng giữ dữ liệu hữu ích của cache.
3. **Conflict miss:** nhiều địa chỉ tranh cùng vị trí/set theo chính sách ánh xạ.

Đây là khung phân tích, không phải cách chẩn đoán hoàn hảo cho mọi CPU. Các bộ tiền nạp, cache nhiều tầng, chia sẻ giữa lõi và chính sách thay thế làm tình hình phức tạp hơn.

## Một ví dụ: duyệt ma trận

Trong ngôn ngữ lưu mảng hai chiều theo hàng, duyệt từng hàng thường đọc địa chỉ liên tiếp:

```c
for (int row = 0; row < n; row++)
  for (int col = 0; col < n; col++)
    total += matrix[row][col];
```

Nếu đổi thứ tự vòng lặp để bước giữa hai lần đọc nhảy qua một đoạn lớn, chương trình có thể sử dụng ít byte hữu ích trên mỗi cache line hơn. Tuy nhiên, kết quả phụ thuộc layout, kích thước ma trận, compiler và máy. Hãy benchmark đúng chương trình; đừng biến một ví dụ thành quy luật cho mọi ngôn ngữ và cấu trúc dữ liệu.

## Cache và nhiều lõi

Khi nhiều lõi có bản sao của cùng một dòng cache, một lõi ghi dữ liệu có thể yêu cầu các bản sao khác được cập nhật hoặc vô hiệu hóa để giữ tính nhất quán. Giao thức coherence giúp các lõi nhìn thấy quy tắc phù hợp, nhưng giao tiếp giữa cache có chi phí.

Hai biến độc lập nằm cùng một cache line có thể làm các lõi liên tục tranh quyền sở hữu dòng đó — hiện tượng thường gọi false sharing. Chương trình đúng về mặt logic vẫn có thể chậm vì bố trí dữ liệu. Đây là vấn đề tối ưu nâng cao; trước tiên cần đo và phân biệt với contention do cùng sửa một biến.

## Cache không đồng nghĩa với bền vững

CPU cache chủ yếu giúp truy cập nhanh; không nên nhầm nó với bản sao bền vững trên đĩa. Dữ liệu đang ở cache có thể chưa được ghi về RAM hoặc thiết bị. Hệ điều hành và phần cứng có các cơ chế riêng cho thứ tự ghi và tính bền vững. Ta sẽ gặp lại sự khác biệt này khi học filesystem và crash consistency.

## Tóm tắt

- Hệ thống bộ nhớ nhiều tầng cân bằng tốc độ, dung lượng và chi phí.
- Cache giữ bản sao của dữ liệu để giảm số lần đi tới tầng chậm hơn.
- Temporal và spatial locality giải thích vì sao một số mẫu truy cập có hit rate tốt.
- Cache miss, truy cập ngẫu nhiên và tranh chấp giữa lõi có thể làm chương trình chờ.
- Cache CPU không tự bảo đảm dữ liệu đã bền vững trên thiết bị lưu trữ.

## Tự kiểm tra

**Cache hit có nghĩa dữ liệu được lấy từ RAM nhanh hơn?** Không; hit ở một tầng cache nghĩa là dữ liệu được tìm thấy tại tầng đó.

**Duyệt mảng tuần tự luôn nhanh hơn mọi cách duyệt khác?** Không thể khẳng định nếu chưa biết layout, workload và nền tảng; locality là lý do nên đo mẫu truy cập.

**Cache coherence đồng nghĩa mọi truy cập giữa các lõi không tốn chi phí?** Không. Nó giúp duy trì quy tắc nhất quán nhưng có thể tạo truyền thông và tranh chấp.

## Đọc tiếp

Cache là một phần của hệ thống bộ nhớ. Học sâu hơn về không gian địa chỉ, paging và bộ nhớ ảo trong topic **Memory**.
