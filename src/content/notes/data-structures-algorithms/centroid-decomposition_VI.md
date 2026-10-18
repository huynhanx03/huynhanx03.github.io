---
title: "Centroid decomposition: chia cây quanh một nút cân bằng"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/centroid-decomposition"
series: "DSA nâng cao"
seriesOrder: 25
tags: ["tree", "centroid-decomposition", "distance-query"]
description: "Xây cây trọng tâm và trả truy vấn khoảng cách tới nút được đánh dấu."
draft: false
updated: 2026-10-15
---

Một cây có nhiều lần tô thêm nút đỏ và hỏi nút đỏ gần nhất. Chạy BFS từ điểm hỏi mỗi lần có thể duyệt cả cây. Centroid decomposition chuẩn bị một hệ thống những điểm trung chuyển cân bằng, để mỗi nút chỉ phải xét `O(log n)` điểm như vậy.

Bài này dùng cây không trọng số, khoảng cách là số cạnh; lập luận cũng mở rộng sang trọng số không âm với công thức khoảng cách phù hợp. Ta chỉ cho **thêm** màu đỏ, chưa cho xóa. Hai giả định này liên quan trực tiếp đến chứng minh và cấu trúc `best` bên dưới.

## Tách tại một nút không để lại phần quá lớn

Centroid của một thành phần cây có `m` nút là nút mà sau khi bỏ nó, mọi thành phần còn lại có tối đa `m/2` nút. Tính size dưới một gốc tạm rồi tìm phía còn quá nửa; phía ấy có thể là một cây con hoặc phần chứa cha, nên phải tính cả `m-size[v]` khi kiểm tra một ứng viên.

Nếu có phía quá nửa, đi sang phía đó. Không thể có hai phía cùng quá nửa. Khi di chuyển, phần vừa bỏ lại không còn quá nửa theo hướng quay lại, và quá trình tiến vào phần lớn còn lại đến khi có nút không còn phía vi phạm. Điều này vừa cho cách tìm vừa giải thích vì sao centroid tồn tại.

Bỏ centroid, đệ quy trên từng thành phần và nối centroid của các phần với centroid hiện tại. Ta được **cây phân rã**, có quan hệ cha khác cây gốc. Mỗi thành phần con nhỏ ít nhất một nửa nên độ sâu cây phân rã là `O(log n)`.

Một đường 7 nút `0–1–2–3–4–5–6` có centroid 3. Bỏ 3 tạo hai đường ba nút, có centroid 1 và 5. Tầng sau là các nút 0,2,4,6. Khoảng cách giữa các nút vẫn đo trên đường gốc, không đếm cạnh trong cây phân rã.

```note-visualization
{"id":"centroid-build","preset":"normal"}
```

## Best chỉ cần theo dõi những cập nhật đi qua centroid ấy

Với mỗi centroid `c`, giữ `best[c]` là khoảng cách nhỏ nhất từ `c` tới một nút đỏ **đã cập nhật qua c**, tức nút có `c` trong dãy tổ tiên của nó ở cây phân rã. Ban đầu đặt vô cực. Khi tô `v`, đi từ `v` lên các centroid tổ tiên và cập nhật `best[c]=min(best[c],dist(v,c))`.

Không cần tuyên bố `best[c]` là khoảng cách tới mọi nút đỏ trên toàn cây: thuật toán không cập nhật `c` cho nút đỏ nằm ngoài nhánh phân rã chứa nó. Tập ứng viên hẹp hơn này vẫn đủ vì mỗi cặp nút có một centroid tổ tiên chung thích hợp.

Hỏi từ `u`: lấy min của `best[c]+dist(u,c)` trên dãy centroid tổ tiên của `u`, bỏ các `best[c]` vô cực. Nếu chưa có nút đỏ nào, trả trạng thái “chưa có”, không cộng sentinel rồi xem như khoảng cách thật.

## Vì sao luôn có một điểm trung chuyển cho đúng đường?

Xét nút đỏ tối ưu `v`. Lần đầu trong quá trình phân rã mà `u,v` thuộc hai thành phần khác nhau, centroid bị tách `c` nằm trên đường duy nhất giữa chúng. Nếu một đầu chính là centroid, cũng lấy `c` ấy. Nó là tổ tiên phân rã của cả hai, nên cập nhật từ `v` đã đóng góp vào `best[c]`. Vì `c` nằm trên đường, `dist(u,c)+dist(c,v)=dist(u,v)`, và query có một ứng viên không lớn hơn đáp án thật.

Ở chiều ngược, mỗi `best[c]` hữu hạn đến từ một nút đỏ thực sự `r`. Đi vòng qua `c` có độ dài `dist(u,c)+dist(c,r)` không nhỏ hơn đường ngắn nhất từ `u` đến `r` khi trọng số không âm. Vì vậy query không thể trả một giá trị nhỏ hơn khoảng cách nút đỏ gần nhất. Hai chiều chặn gặp nhau, chứng minh công thức đúng.

```note-visualization
{"id":"nearest-red","preset":"normal"}
```

Trên đường 7 nút, tô 0 cập nhật các centroid 0,1,3 bằng khoảng cách 0,1,3. Hỏi từ 6 có tổ tiên phân rã 6,5,3; qua 3 cho `3+3=6`, đúng khoảng cách tới 0. Tô thêm 4 làm `best[5]=1`; query 6 qua centroid 5 cho `1+1=2`, tốt hơn đường vòng qua 3. Không phải mọi centroid đều cho đường ngắn nhất, nhưng ít nhất một centroid phù hợp xuất hiện.

## Chi phí nằm ở số tổ tiên và cách lấy khoảng cách

Nếu mỗi `dist(u,c)` được hỏi bằng LCA trong `O(log n)`, một update/query duyệt `O(log n)` tổ tiên mất `O(log² n)`. Có thể lưu trước khoảng cách từ mỗi nút tới từng centroid tổ tiên: tổng `O(n log n)` dữ liệu, update/query còn `O(log n)`. Khoảng cách có thể tính trong lúc xây các thành phần, không cần tìm lại qua cạnh cây phân rã.

Tính size và chọn centroid tốn tuyến tính theo kích thước thành phần. Ở cùng một tầng, các thành phần rời nhau có tổng size không quá `n`; có `O(log n)` tầng nên xây `O(n log n)`. Dùng đánh dấu centroid đã tách để giới hạn duyệt, giữ adjacency gốc cho các phép tính khoảng cách cần nó; không xóa bừa cạnh thật rồi mất dữ liệu cho truy vấn.

## Vì sao thêm và xóa màu không dùng chung một số min?

Nếu `best[c]=2` đến từ nút đỏ duy nhất đạt khoảng cách 2, khi bỏ màu nút đó, con số 2 không cho biết ứng viên tốt thứ hai là ai. Phép min không có thao tác đảo ngược chỉ từ kết quả. Muốn cho xóa cần multiset, heap có quản lý xóa/bản ghi cũ hoặc đếm ứng viên theo một thiết kế phù hợp. Không thể gán `best[c]=∞` vì có thể xóa luôn đóng góp của các nút đỏ khác.

**Tự thử:** centroid đầu của đường 7 nút là đâu? `best[c]` có nhất thiết nhìn thấy mọi nút đỏ không? Vì sao xóa màu cần dữ liệu nhiều hơn min?

**Giải thích:** nút giữa 3, để lại hai phần size 3. Best chỉ theo các cập nhật có `c` là tổ tiên phân rã; centroid chung nằm trên đường bảo đảm tập đó vẫn đủ cho query. Xóa ứng viên nhỏ nhất cần biết các ứng viên còn lại, thông tin mà một con số min đã bỏ mất.

*Đọc thêm: [VNOI — Centroid decomposition](https://wiki.vnoi.info/vi/algo/graph-theory/centroid-decomposition).*

[USACO Guide — Centroid decomposition](https://usaco.guide/plat/centroid) — cách phân rã và lưu trước khoảng cách đến centroid tổ tiên.
