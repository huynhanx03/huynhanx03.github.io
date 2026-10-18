---
title: "Heap và priority queue: giữ cực trị mà không sắp toàn bộ"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/heaps-priority-queues"
series: "DSA cơ bản"
seriesOrder: 17
tags: ["heap", "priority-queue", "sift-up", "sift-down"]
description: "Heap nhị phân trong mảng, chi phí từng thao tác và cách dùng với Dijkstra, top-k."
draft: false
updated: 2026-10-15
---

Một hệ thống xử lý job theo deadline cần biết công việc sớm nhất sau mỗi lần thêm hoặc hoàn thành. Sort lại mọi job sau mỗi thay đổi là làm nhiều việc hơn cần thiết: ta chưa cần thứ tự của toàn bộ danh sách, chỉ cần phần tử ưu tiên nhất để lấy tiếp.

Priority queue là hợp đồng lấy theo ưu tiên. Min-heap nhị phân là một cách cài: khóa ở mỗi cha không lớn hơn khóa ở con. Quan hệ cục bộ này đủ đặt minimum ở gốc, nhưng không sắp thứ tự mọi phần tử còn lại.

## Hình cây hoàn chỉnh có thể nằm ngay trong array

Với index bắt đầu 0, con của i là `2i+1`, `2i+2` nếu chúng nhỏ hơn len; cha của i>0 là `(i-1)/2`. Các node lấp theo tầng từ trái sang phải, nên không cần pointer để biểu diễn hình cây. Cây hoàn chỉnh có chiều cao O(log n), vì số vị trí tăng gần gấp đôi theo tầng.

Array `[1,2,7,5]` là min-heap: 1≤2,7 và 2≤5. Nhưng 7 đứng trước 5 trong array; đọc array từ đầu đến cuối không cho dãy tăng. Mọi đường từ gốc xuống đều không giảm, nên gốc không lớn hơn bất kỳ hậu duệ nào. Đó là chứng minh minimum, không phải chứng minh array sorted.

## Push chỉ tạo một đường vi phạm

Thêm x ở cuối để giữ hình hoàn chỉnh. Nếu x nhỏ hơn cha, đổi hai giá trị và đi lên; nếu không, dừng. Các cây con vốn là heap vẫn đúng, chỉ quan hệ giữa node mới và cha có thể sai. Sau swap, vi phạm nếu còn chỉ nằm tiếp trên đường lên gốc.

Ví dụ bắt đầu `[1,2,7,5]`, Push 0 tạo `[1,2,7,5,0]`. 0 ở index 4, cha index 1 có 2: swap được `[1,0,7,5,2]`. Cha tiếp theo có 1: swap thành `[0,1,7,5,2]`. Dừng ở gốc, các quan hệ cha–con khác vẫn đúng.

PopMin giữ lại gốc để trả, chuyển phần tử cuối lên gốc rồi rút len. Chọn con nhỏ hơn để sift-down, đổi nếu cha lớn hơn con ấy. Chọn con lớn hơn có thể để cha mới vẫn lớn hơn người con nhỏ, nên không đủ phục hồi heap.

Với `[0,1,7,5,2]`, lấy 0, chuyển 2 lên: `[2,1,7,5]`; chọn con 1 rồi đổi được `[1,2,7,5]`. Heap trở lại hợp lệ. Rỗng cần một hợp đồng vắng mặt như bool/error; một phần tử chỉ cần lấy rồi rút về rỗng, không đọc con không tồn tại.

```note-visualization
{"id":"heap-push-pop","preset":"normal"}
```

Sift-up/down đi nhiều nhất chiều cao, nên O(log n). Với array động, phần điều chỉnh Push O(log n), nhưng một lần append cấp lại có thể O(n); bảng độ phức tạp heap thường tách giả định vùng chứa/cấp phát hoặc báo chi phí amortized phù hợp. Peek O(1); tìm một khóa bất kỳ có thể O(n) vì heap không có quan hệ BST để bỏ một nửa.

## Build-heap không cần Push n lần

Nếu Push lần lượt n mục, cận trên O(n log n) cho việc điều chỉnh. Cách dưới lên xem mọi lá đã là heap, rồi sift-down từ node trong cuối về gốc. Khi xử lý node, hai cây con đã đúng nên chỉ cần sửa quan hệ gốc của cây con ấy.

Với `[5,2,7,1]`, node trong cuối index 1 có con 1: đổi được `[5,1,7,2]`. Tại gốc 5, chọn con 1 rồi đổi `[1,5,7,2]`; tiếp tục đổi 5 với 2 được `[1,2,7,5]`. Không có bước nào nhằm sắp 7 với 5 vì điều đó không thuộc invariant heap.

```note-visualization
{"id":"build-heap","preset":"normal"}
```

Khoảng n/2 node là lá; khoảng n/4 node chỉ cao 1; các node cao h có số lượng tỷ lệ tối đa n/2^(h+1). Tổng công việc bị chặn bởi `O(n Σ h/2^h)=O(n)`. Dùng max chi phí log n cho tất cả node sẽ đếm quá mức. Heapify tuyến tính là nền của heapsort và khởi tạo priority queue từ một tập có sẵn.

## Top-k giữ một ngưỡng thay vì toàn thứ tự

Muốn k số lớn nhất trong luồng, giữ min-heap tối đa k phần tử. Khi chưa đủ, thêm. Khi đủ, gốc là số nhỏ nhất trong tập k đang giữ. Số mới không lớn hơn gốc thì bỏ; lớn hơn thì thay gốc và sift-down. Bất biến: sau mỗi tiền tố, heap giữ k giá trị lớn nhất đã thấy, hoặc toàn bộ nếu chưa đủ k.

Với k=3 và luồng `[5,2,7,1,6]`, ba mục đầu tạo tập {2,5,7}; 1 không vượt ngưỡng 2 nên bỏ; 6 thay 2 tạo {5,6,7}. Array heap nội bộ không nhất thiết theo thứ tự ấy. Chi phí thường ghi O(n log k) cho k≥2, bộ nhớ O(k); tổng quát có thể viết O(n log(k+1)) để bao gồm k=1. k=0 cần trả rỗng, không đọc gốc; k>n trả toàn bộ nếu hợp đồng là “tối đa k”.

```note-visualization
{"id":"heap-top-k","preset":"normal"}
```

## Cập nhật priority cần biết phần tử đang ở đâu

Nếu một mục đổi khóa, chỉ sửa field rồi để nguyên vị trí có thể phá heap. Cần sift-up hoặc down tại đúng index. Một map ID→index giúp tìm vị trí; mọi swap phải cập nhật cả hai index trong map. `decrease-key` trong min-heap thường đi lên, còn tăng khóa có thể cần đi xuống.

Dijkstra có thể dùng cách đơn giản hơn: khi tìm khoảng cách tốt hơn, thêm một bản ghi mới; khi Pop gặp bản ghi có khoảng cách cũ hơn giá trị tốt nhất đang lưu, bỏ nó. Đổi lại heap có nhiều bản ghi cùng đỉnh, nên bộ nhớ/chi phí tính theo số bản ghi chứ không chỉ số đỉnh. Không bỏ stale entry có thể làm công việc lặp hoặc xử lý sai theo cách cài.

Heap thông thường không giữ FIFO giữa các khóa bằng nhau. Nếu cần, comparator so `(priority,sequenceNumber)`, trong đó số thứ tự tăng khi thêm và cần không tràn trong vòng đời dự kiến.

## Hai tầng Push/Pop trong Go

Với [container/heap](https://pkg.go.dev/container/heap), kiểu cài `Len`, `Less`, `Swap`, `Push`, `Pop`. **Method** Push thêm vào cuối slice, method Pop lấy cuối; **hàm package** `heap.Push`, `heap.Pop` mới phối hợp các method ấy để duy trì invariant. Gọi thẳng method Pop rồi cho rằng nó lấy minimum là nhầm tầng hợp đồng. `Less` chọn min/max theo thứ tự ưu tiên, và `Swap` cần cập nhật index nếu bạn giữ handle.

**Tự kiểm tra:** từ heap `[1,2,7,5]`, Push 0 và PopMin cho trạng thái nào? Vì sao không dùng binary search trực tiếp trên array heap?

**Giải thích:** Push theo trace tạo `[0,1,7,5,2]`; Pop trả 0 và phục hồi `[1,2,7,5]`. Binary search cần toàn dãy theo thứ tự để loại cả nửa, nhưng heap chỉ có thứ tự dọc cạnh cha–con. Hai phần array liên tiếp không phải hai miền khóa tách rời.
