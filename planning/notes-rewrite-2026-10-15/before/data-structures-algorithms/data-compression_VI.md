---
title: "Nén dữ liệu không mất mát: RLE, Huffman và LZ"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/data-compression"
translationPending: true
series: "DSA nâng cao"
seriesOrder: 21
tags: ["compression", "rle", "huffman", "lz", "prefix-code"]
description: "Ba nguồn dư thừa khác nhau và những thông tin decoder bắt buộc phải có."
draft: false
---

Nén không mất mát phải cho phép giải mã ra **đúng dãy byte ban đầu**. Một ý tưởng chỉ “lưu ít hơn” nhưng không nêu định dạng để decoder biết ranh giới, bảng mã và khi nào dừng thì chưa phải codec hoàn chỉnh. Hiệu quả phụ thuộc dữ liệu: không có thuật toán nén mọi chuỗi thành chuỗi ngắn hơn mà vẫn giải mã một-một, vì số chuỗi ngắn hơn ít hơn số đầu vào cùng độ dài.

## 1. Run-length encoding (RLE)

RLE thay một đoạn lặp bằng `(giá trị, số lần)`. `AAAAABBC` thành `(A,5),(B,2),(C,1)`. Quét `O(n)` thời gian; rất tốt cho dãy có nhiều run dài, nhưng dữ liệu xen kẽ như `ABABAB` có thể **phình**. Định dạng phải quy định cách mã hóa số lần, escape ký tự đặc biệt, và giới hạn run lớn. Nếu dùng một byte đếm, run dài hơn 255 cần chia thành nhiều bản ghi.





```note-visualization
{"id":"rle-codec","preset":"normal"}
```

## 2. Huffman: mã ngắn cho ký hiệu thường gặp

Đếm tần suất từng ký hiệu, đưa các nút lá vào min-heap. Lặp lấy hai nút tần suất nhỏ nhất, tạo nút cha có tổng tần suất, đưa lại vào heap. Hai nhánh cây gán bit `0` và `1`; mã của ký hiệu là đường gốc đến lá. Mã **prefix-free**: không mã nào là tiền tố của mã khác, nên decoder đọc bit đến lá là biết ranh giới. Lập luận tham lam: trong một cây tối ưu, hai ký hiệu hiếm nhất có thể làm cặp lá sâu nhất; gộp chúng biến bài toán nhỏ hơn, rồi tách ra. Với `σ` ký hiệu và `n` byte, xây cây `O(σ log σ)` sau khi đếm `O(n)`.



Decoder cần biết cây hoặc bảng độ dài mã (canonical Huffman), tổng số ký hiệu đầu ra hay số bit hợp lệ để không giải mã cả padding cuối byte. Với chỉ một loại ký hiệu, phải định nghĩa mã và độ dài đầu ra rõ ràng. Huffman tối ưu trong lớp mã tiền tố **theo tần suất ký hiệu đơn lẻ**, không phải tối ưu tuyệt đối cho mọi nguồn có mẫu lặp dài.



```note-visualization
{"id":"huffman-codec","preset":"normal"}
```

## 3. Lempel–Ziv: tham chiếu đoạn đã thấy

Họ LZ khai thác chuỗi con lặp, thay đoạn hiện tại bằng tham chiếu về dữ liệu đã giải mã và độ dài; các biến thể LZ77, LZ78, LZW có từ điển/cú pháp khác nhau. Với LZ77, decoder có thể sao chép từ cửa sổ đã xuất; nguồn và đích sao chép đôi khi **chồng lấn**, nên phải sao chép tuần tự chứ không giả định một lần `memcpy` độc lập. Tìm match dài nhất bằng quét ngây thơ có thể đắt; triển khai thực tế dùng hash chain hoặc chỉ mục khác.



Nhiều định dạng kết hợp LZ để bắt lặp dài và entropy coding như Huffman để mã hóa token. Đừng so tỷ lệ nén mà bỏ overhead header, từ điển và kích thước dữ liệu nhỏ.



```note-visualization
{"id":"lz77-codec","preset":"normal"}
```

**Tự luyện:** (1) Mã hóa RLE cho `AAABCCCC`, rồi tính kích thước nếu mỗi cặp dùng 2 byte. (2) Tạo cây Huffman cho tần suất `A:5,B:2,C:1`. (3) Giải thích vì sao decoder LZ cần cửa sổ các byte đã giải mã.

*Đối chiếu: Drozdek, chương 11.*
