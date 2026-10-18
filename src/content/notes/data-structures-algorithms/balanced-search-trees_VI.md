---
title: "Cây tìm kiếm cân bằng: AVL, red-black và splay"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/balanced-search-trees"
series: "DSA nâng cao"
seriesOrder: 6
tags: ["avl", "red-black-tree", "splay-tree", "rotation"]
description: "Ba cách kiểm soát chiều cao BST và vai trò của phép quay."
draft: false
updated: 2026-10-15
---

Chèn 1,2,3 vào BST thường cho một dây đi sang phải. Tìm 3 phải đi qua mọi node trên dây; nếu tiếp tục chèn tăng, thời gian đường đi có thể tuyến tính. Cây tìm kiếm cân bằng bổ sung một cách kiểm soát hình cây hoặc chi phí của cả chuỗi thao tác, trong khi vẫn giữ thứ tự BST.

AVL, red-black và splay đều dùng phép quay, nhưng chúng không có cùng loại bảo đảm. AVL theo chênh lệch chiều cao, red-black theo màu và black-height, splay tự điều chỉnh sau truy cập với cận amortized.

## Phép quay giữ thứ tự khóa bằng cách chuyển cây con giữa

Cho x có con phải y; A là cây trái x, B là cây trái y, C là cây phải y. Theo BST, mọi khóa có thứ tự `A < x < B < y < C`. Quay trái tại x làm y thành gốc vùng, x thành con trái y, B chuyển thành con phải x; A và C giữ nguyên phía.

Inorder trước và sau đều là A,x,B,y,C. Vì B nằm giữa x và y, gắn B vào phải x vẫn đúng; bỏ qua bước chuyển B sẽ làm mất node hoặc phá liên kết. Quay phải đối xứng. Nếu vùng quay từng gắn với cha, phải cập nhật liên kết cha hoặc gốc toàn cây, cùng metadata chiều cao/kích thước nếu có.

Một phép quay sửa O(1) liên kết/metadata cục bộ; chọn **khi nào quay và quay ở đâu** mới là phần bất biến cân bằng phải giải thích.

## AVL giữ chênh lệch chiều cao ở mọi node

Balance factor `height(left)-height(right)` phải thuộc {-1,0,1}. Sau chèn hoặc xóa, chỉ các tổ tiên trên đường sửa có thể đổi chiều cao, nên đi ngược đường ấy cập nhật và kiểm tra. Cây con chưa bị chạm vẫn giữ invariant.

Với chèn 1,2,3: node 1 lệch phải hai tầng, thuộc phải–phải. Quay trái tại 1 tạo gốc 2 với hai con 1,3; chiều cao hai bên cân bằng và inorder vẫn 1,2,3. Với 3,1,2: tại 3 là trái–phải; quay trái tại con 1 để tạo quan hệ trái–trái, rồi quay phải tại 3, cũng được gốc 2.

```note-visualization
{"id":"avl-insert","preset":"normal"}
```

Bốn mẫu là trái–trái quay phải, phải–phải quay trái, trái–phải quay kép trái ở con rồi phải ở cha, phải–trái đối xứng. Khi xóa, cần xem balance factor của con, không chỉ nhớ hướng của một khóa vừa chèn; các trường hợp con cân bằng cũng xuất hiện. Xóa có thể làm chiều cao giảm và cần tái cân bằng nhiều tổ tiên, nên sửa một điểm rồi dừng luôn chưa đủ.

Vì sao invariant cục bộ giữ chiều cao logarithmic? Cây AVL cao h ít node nhất phải có hai cây con cao h-1 và h-2, cho truy hồi số node tối thiểu `N(h)=1+N(h-1)+N(h-2)`. Dãy này tăng theo hàm mũ của h, nên h=O(log n). Tìm, thêm, xóa đều worst-case O(log n); mỗi bước cập nhật metadata và mỗi phép quay hằng số.

## Red-black cho phép khác chiều cao nhưng chặn sự lệch

Quy ước lá nil đen; gốc đen; node đỏ không có con đỏ; từ một node, mọi đường xuống lá nil có cùng số node đen theo cùng cách đếm. Các node thật có màu đỏ/đen. Chỉ nói “cùng số đen” mà bỏ điều kiện không có đỏ kề đỏ sẽ cho phép kéo dài một đường bằng bao nhiêu node đỏ cũng được.

Khi không có hai đỏ liên tiếp, một đường có nhiều nhất khoảng một node đỏ giữa hai node đen. Cùng black-height khiến đường dài nhất không quá hai lần đường ngắn nhất. Để nối điều đó với số node, gọi b là số node đen trên đường xuống lá nil, không tính node bắt đầu nhưng tính lá nil. Cây con ấy chứa ít nhất `2^b−1` node thật: mỗi mức đen đòi hai nhánh đạt số đen còn lại. Vì vậy b không quá `log₂(n+1)`, và chiều cao cũng là O(log n). Đây là cân bằng theo bậc, không đòi trái/phải chênh chiều cao tối đa 1 như AVL. [Open Data Structures: Red-Black Trees](https://opendatastructures.org/newhtml/ods/latex/redblack.html) phát triển lập luận chiều cao này.

```note-visualization
{"id":"red-black-insert","preset":"normal"}
```

Chèn node mới thường tô đỏ để chưa đổi số đen trên các đường. Nếu cha đen, không tạo đỏ–đỏ. Nếu cha đỏ, xét chú: một trường hợp cha/chú đỏ cho phép đổi hai node thành đen và đẩy đỏ lên ông; chú đen có thể cần quay kèm đổi màu. Gốc sau xử lý được giữ đen. Ví dụ chèn 1,2,3 trong một bản chuẩn: trước sửa có dây hai node đỏ dưới gốc 1; quay trái và đổi màu tạo gốc 2 đen, con 1/3 đỏ.

Xóa một node đen có thể tạo thiếu một đơn vị đen trên các đường của một nhánh. Sửa bằng các trường hợp màu của anh em và các con anh em, có thể truyền thiếu đen lên cao. Không dùng nguyên quy tắc sửa chèn để xóa. Bài này trình bày cơ chế invariant, chưa phải danh sách đầy đủ các trường hợp cài red-black delete.

Tìm/thêm/xóa worst-case O(log n), metadata là màu. Một số cách cài/workload có chi phí quay và cập nhật khác AVL; không suy “red-black luôn ít sửa hơn” hay luôn nhanh hơn từ màu. Sự đánh đổi cần xét bản cài và tải đọc/ghi thực tế.

## Splay trả chi phí theo chuỗi truy cập

Splay tree không giữ màu/chiều cao làm điều kiện bắt buộc. Sau truy cập, đưa node liên quan lên gốc bằng quay: zig khi cha là gốc; zig-zig khi node và cha cùng hướng; zig-zag khi hai hướng khác nhau. Zig-zig quay ở ông rồi cha theo mẫu chuẩn, còn zig-zag quay tại cha rồi ông; không thay chúng tùy tiện bằng một vòng quay đơn giống nhau mà vẫn mượn nguyên phân tích splay.

```note-visualization
{"id":"splay-access","preset":"normal"}
```

Tìm 3 trong dây 1→2→3 rồi splay bằng hai quay trái có thể cho gốc 3, dưới là 2 rồi 1. Truy cập 3 tiếp theo rất gần; truy cập một node sâu khác vẫn có thể tốn O(n). Khi tìm không có khóa, các cách cài chuẩn thường splay node cuối đã truy cập; khi chèn/xóa có quy trình splay và ghép tương ứng để giữ BST.

Bảo đảm cơ bản là amortized O(log n) cho các thao tác chuẩn trên chuỗi, có tính đến khởi tạo/trạng thái đầu khi phát biểu cận tổng. Nó không bảo đảm từng lần có độ sâu logarithmic. Node vừa truy cập được đưa gần gốc là một lý do splay hữu ích khi có tính lặp truy cập, nhưng không cần giả định ngẫu nhiên để có cận amortized.

Ngay cả tìm kiếm có thể đổi liên kết, nên splay không phù hợp với giả định “mọi reader chỉ đọc, không sửa cây” nếu chưa có đồng bộ thích hợp.

| Cấu trúc | Loại bảo đảm thao tác chuẩn | Metadata cân bằng |
| --- | --- | --- |
| AVL | worst-case O(log n) | chiều cao/balance |
| Red-black | worst-case O(log n) | màu |
| Splay | amortized O(log n), riêng lẻ có thể O(n) | không cần màu/chiều cao |

## Tự kiểm tra

**1.** Vì sao quay trái không được bỏ B? **2.** Bằng black-height có buộc đường dài bằng đường ngắn không? **3.** Có thể dùng cận amortized splay làm cam kết độ trễ tối đa một request không?

**Giải thích:** B chứa các khóa nằm giữa x và y, cần chuyển sang phải x để bảo toàn cả node và thứ tự. Hai đường có cùng số đen vẫn có số đỏ khác nhau; điều kiện không đỏ kề đỏ mới chặn tỷ lệ chiều dài. Amortized chỉ chặn tổng theo chuỗi theo điều kiện phân tích, chưa chặn một truy cập sâu riêng lẻ; yêu cầu deadline từng request cần bảo đảm khác.

Đọc thêm: [CMU: Splay Trees](https://www.cs.cmu.edu/afs/cs.cmu.edu/academic/class/15451-f97/www/splay.html) giải thích phép quay và loại cận của splay.
