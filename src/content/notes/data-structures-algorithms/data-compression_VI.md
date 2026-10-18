---
title: "Nén dữ liệu không mất mát: RLE, Huffman và LZ"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "advanced"
translationKey: "data-structures-algorithms/data-compression"
series: "DSA nâng cao"
seriesOrder: 21
tags: ["compression", "rle", "huffman", "lz", "prefix-code"]
description: "Ba nguồn dư thừa khác nhau và những thông tin decoder bắt buộc phải có."
draft: false
updated: 2026-10-15
---

Dãy `AAAAABBC` chứa tám ký hiệu nhưng phần đầu có thể mô tả là “năm chữ A”. Một đoạn văn khác có thể ít run lặp, song một số ký hiệu xuất hiện rất thường xuyên; hoặc cả cụm từ lặp lại nhiều lần. Ba kiểu dư thừa ấy dẫn tới RLE, Huffman và họ Lempel–Ziv.

Mục tiêu nén không mất mát là giải mã ra **đúng dãy byte ban đầu**. Vì vậy cần nghĩ cả encoder và decoder. Một biểu diễn ngắn mà decoder không biết ranh giới bản ghi, bảng mã hoặc khi nào dừng chưa phải codec đầy đủ.

## Không thể làm mọi input ngắn hơn

Giả sử mỗi chuỗi n bit đều được gán một mã ngắn hơn n bit và giải mã duy nhất. Có 2^n input, nhưng tổng số chuỗi có độ dài từ 0 tới n−1 chỉ là 2^n−1. Không đủ mã khác nhau để gán một-một. Vì vậy codec có thể nén tốt một lớp dữ liệu nhưng sẽ có input không ngắn hơn, thậm chí dài hơn do header.

Lập luận đếm này giúp đọc đúng các tuyên bố tỷ lệ nén: cần biết dữ liệu nào, kích thước nào và có tính chi phí metadata không. Nó không ngăn nén tốt dữ liệu thực có cấu trúc dư thừa.

## RLE: mô tả một run thay vì từng ký hiệu

RLE ghi mỗi run bằng `(giá trị,số lần)`. Với `AAAAABBC`, các cặp là (A,5),(B,2),(C,1). Encoder đi từ trái sang phải, tăng đếm khi ký hiệu còn giống, gặp ký hiệu mới thì xuất run cũ; phải nhớ xuất run cuối khi hết input.

Nếu mỗi value và count đều một byte, tám byte gốc thành sáu byte cặp. Nhưng `ABABAB` có sáu run, thành mười hai byte. Nguồn lợi là run dài, không phải chỉ có ít loại ký hiệu.

```note-visualization
{"id":"rle-codec","preset":"normal"}
```

Decoder đọc từng cặp rồi xuất count bản sao. Định dạng phải nói count có bao nhiêu byte, byte nào là value và có cần escape hay không. Nếu count một byte và không cho 0, run dài 300 phải tách, ví dụ (A,255),(A,45). Nếu ghi dạng chữ như `A5`, còn phải phân biệt chữ số trong dữ liệu với chữ số biểu diễn count.

Encoder/decoder quét theo kích thước input/output tương ứng; encode O(n), decode phải tốn ít nhất số byte đầu ra. Một input nhỏ có count rất lớn cũng có thể yêu cầu output lớn, nên hệ thống nhận dữ liệu cần biết giới hạn dung lượng giải nén.

## Huffman: dùng độ dài mã theo tần suất ký hiệu

RLE không tận dụng được một nguồn xen kẽ nhưng có chữ A rất thường gặp. Huffman gán bitcode ngắn cho ký hiệu thường gặp, dài cho ký hiệu hiếm, trong lớp mã prefix-free: không mã nào là tiền tố của mã khác. Nhờ đó decoder đọc tới lá là xác định xong một ký hiệu, không cần dấu ngăn giữa từng mã.

Đếm tần suất rồi đưa các lá vào min-heap. Mỗi lần lấy hai nút nhỏ nhất, gộp thành cha có trọng số bằng tổng và đưa lại heap. Gán 0/1 cho hai cạnh con, đường từ gốc tới lá là mã.

Với A:5,B:2,C:1, gộp C và B thành nút 3, rồi gộp với A:5. Một bảng hợp lệ là A=0, B=11, C=10. Payload có `5·1+2·2+1·2=11` bit, thay vì 16 bit nếu dùng hai bit cố định cho ba loại ký hiệu. Các tie hoặc cách gán trái/phải có thể cho mã khác mà cùng chi phí.

```note-visualization
{"id":"huffman-codec","preset":"normal"}
```

Lập luận tham lam bắt đầu từ một cây tối ưu: có thể hoán đổi để hai ký hiệu hiếm nhất nằm ở một cặp lá sâu nhất mà không tăng tổng tần suất×độ dài. Gộp cặp ấy thành một ký hiệu giảm bài toán đi một lá; giải bài nhỏ tối ưu rồi tách lại giữ tối ưu. Huffman vì vậy tối ưu trong lớp mã tiền tố theo **tần suất từng ký hiệu riêng**, không nắm hết phụ thuộc giữa các chuỗi ký hiệu.

Đếm n byte tốn O(n); với σ ký hiệu, heap xây cây tốn O(σ log σ). Khi chỉ có một loại ký hiệu, phải định nghĩa rõ mã và độ dài output; không giả định cây một lá tự cho decoder biết có bao nhiêu bản sao.

### Decoder còn cần những gì ngoài payload?

Encoder phải chuyển cây hoặc bảng độ dài mã theo một quy ước như canonical Huffman. Decoder cũng cần số ký hiệu đầu ra hoặc số bit hợp lệ để phân biệt bit padding cuối byte. Mười một bit ở ví dụ chưa bao gồm bảng mã và các trường độ dài; với file tám byte, header có thể khiến tổng file nén lớn hơn. Chi phí codec không dừng ở tổng độ dài các codeword.

## LZ: dùng lại một đoạn đã xuất

Họ Lempel–Ziv tìm dư thừa ở chuỗi con lặp. Trong LZ77, token có thể tham chiếu một đoạn đã giải mã bằng khoảng cách ngược và độ dài, còn ký hiệu chưa biểu diễn được xuất dạng literal. LZ78 và LZW dùng quy tắc từ điển/token khác; không dùng một mô tả cửa sổ để coi mọi biến thể có cùng định dạng.

Giả sử output hiện có `AB`, token “lùi 2, chép 6” có thể tạo `ABABABAB`. Sau hai byte đầu được chép, chính các byte mới này tiếp tục là nguồn cho các bước sau. Nguồn và đích chồng lấn có ý nghĩa hợp lệ, nên decoder phải copy tuần tự theo quy tắc token; không giả định một lần memcpy trên một vùng nguồn độc lập đã đầy đủ.

```note-visualization
{"id":"lz77-codec","preset":"normal"}
```

Decoder cần giữ phần cửa sổ quá khứ còn được phép tham chiếu. Encoder tìm match dài nhất bằng quét ngây thơ có thể đắt: thử nhiều vị trí cũ và so nhiều ký tự. Hash chain hoặc chỉ mục khác giảm công tìm kiếm trong triển khai thực, đổi lại bộ nhớ và giới hạn cửa sổ. Không có một độ phức tạp encoder duy nhất cho toàn bộ họ LZ nếu chưa chọn cách tìm match.

Nhiều định dạng dùng LZ tạo token rồi Huffman mã hóa token. Hai bước tận dụng hai kiểu dư thừa khác nhau, không cạnh tranh cho cùng một vai trò. Tỷ lệ cuối cần tính cả cửa sổ/từ điển, bảng mã và header, nhất là khi input nhỏ.

## Tự thử cùng góc nhìn decoder

1. RLE của `AAABCCCC` là gì, và nếu mỗi cặp hai byte thì có tiết kiệm không?
2. Với Huffman A:5,B:2,C:1, vì sao A nên ở độ sâu 1?
3. Nếu token lùi 2, dài 6 sau `AB`, vì sao chỉ sao chép hai byte đầu nguồn một lần là chưa đủ?

**Đối chiếu:** (1) (A,3),(B,1),(C,4), sáu byte so với tám byte gốc, chưa tính header. (2) A có tần suất cao nhất; cây gộp hai loại hiếm thành nhánh sâu giúp tổng trọng số là 11 bit. (3) Token yêu cầu sáu byte, có phần nguồn xuất hiện trong lúc copy; decoder phải cho phép tái dùng byte vừa xuất. Cả ba đáp án đều cần một định dạng rõ thì mới thành giải mã được.

## Tài liệu

[RFC 1951 — DEFLATE](https://www.rfc-editor.org/rfc/rfc1951) là một đặc tả thực kết hợp mã Huffman và tham chiếu khoảng cách/độ dài; đọc nó để thấy vai trò của bit order, bảng mã và giới hạn token.
