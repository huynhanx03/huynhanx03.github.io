---
title: "Số học thuật toán II: số nguyên tố, phân tích thừa số và ước"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "intermediate"
translationKey: "data-structures-algorithms/primes-factorization-divisors"
series: "Toán cho thuật toán"
seriesOrder: 2
tags: ["number-theory", "sieve", "primality", "factorization", "divisors"]
description: "Từ sàng Eratosthenes đến công thức đếm và cộng các ước của một số."
draft: false
updated: 2026-10-15
---

Muốn biết 360 có bao nhiêu ước, ta có thể thử 360 số. Nhưng khi viết `360=2³·3²·5`, bài toán trở thành chọn ba số mũ: mũ của 2 từ 0..3, của 3 từ 0..2 và của 5 từ 0..1. Cấu trúc thừa số giúp đếm mà chưa cần sinh từng ước.

Bước đầu lại phụ thuộc dữ liệu: một truy vấn số lớn và hàng triệu truy vấn trong miền nhỏ cần những cách chuẩn bị khác nhau. Bài này nối sàng, phân tích thừa số và công thức ước; kiến thức cần trước là chia dư và gcd.

## Nhận ra hợp số bằng một ước nhỏ

Số nguyên tố là số nguyên p>1 chỉ có hai ước dương 1 và p. Nếu n>1 là hợp số, n=ab với 1<a≤b nên a≤√n. Vì vậy không tìm thấy ước từ 2 tới √n thì n nguyên tố; không cần thử tới n−1. Số 1 không nguyên tố, còn 0 và số âm nằm ngoài định nghĩa này.

Để phân tích n, thử d=2,3,... và mỗi khi chia hết thì chia liên tiếp để đếm số mũ. Điều kiện d²≤n dùng **n còn lại**. Sau khi dừng, nếu n>1 thì n còn lại là prime: nếu hợp số, nó phải có một ước nhỏ hơn hoặc bằng căn mà ta chưa loại, trái điều kiện dừng.

Với 756, chia 2 hai lần được 189, chia 3 ba lần được 7. Phần còn lại 7 là nguyên tố nên `756=2²·3³·7`. Không cần tiếp tục thử tới căn của 756 ban đầu.

```note-visualization
{"id":"trial-factorization","preset":"normal"}
```

Thử chia có cận `O(√n)` phép thử ở trường hợp xấu. Trong code có thể viết `d<=n/d` thay `d*d<=n` để tránh tràn tích. Cách này đủ với số vừa, nhưng căn của một số 64-bit lớn vẫn có thể lên tới hàng tỷ; “chỉ thử tới căn” chưa đồng nghĩa đủ nhanh cho mọi giới hạn.

## Khi có nhiều truy vấn: loại bội cùng lúc

Sàng Eratosthenes chuẩn bị tất cả prime tới N. Đánh dấu 0 và 1 không nguyên tố; mỗi p còn chưa bị gạch là prime, rồi gạch các bội của p từ p². Vì sao bỏ qua 2p,3p,... trước p²? Mỗi bội kp với 2≤k<p đã có một thừa số nguyên tố nhỏ hơn p nên đã được xử lý trước.

```note-visualization
{"id":"eratosthenes","preset":"normal"}
```

Tới 30, các số còn lại là `2,3,5,7,11,13,17,19,23,29`. Chỉ cần phát việc gạch từ p có p²≤N: mọi hợp số đã có ước nhỏ không vượt căn. Bản sàng mảng dùng `O(N)` bộ nhớ và `O(N log log N)` thời gian; tổng số lần gạch được đánh giá qua tổng nghịch đảo các prime, không phải N lượt đầy đủ cho mọi p. Với N<2, xử lý kích thước trước khi gán prime[1].

Nếu còn cần phân tích từng x≤N, lưu `spf[x]`, smallest prime factor. Sau đó lấy p=spf[x], chia x cho p tới hết và lặp với phần còn lại. Ví dụ x=756 lần lượt lấy 2,3,7; bảng đã thay việc tìm ước bằng một lookup.

```note-visualization
{"id":"spf-factorization","preset":"normal"}
```

Sau tiền xử lý phù hợp, một truy vấn tốn số bước tỷ lệ số thừa số tính cả số lần lặp, tối đa O(log x) lần chia. Đổi lại, phải giữ bảng theo cả miền N. Một số cực lớn không khiến việc cấp mảng tới nó trở thành ý tưởng hợp lý.

## Số lớn: phân biệt kiểm tra nguyên tố với tìm thừa số

Miller–Rabin kiểm tra nguyên tố bằng lũy thừa modulo và các lần bình phương, thay vì thử mọi ước. Với một số lẻ n>2, viết `n−1=d·2^s`, d lẻ; kiểm tra các base theo điều kiện của phép thử. Một base có thể chứng minh n hợp số, nhưng vượt qua một vài base tùy tiện chưa chứng minh n prime. Nếu muốn bảo đảm xác định cho toàn miền 64-bit, phải dùng một bộ cơ sở có cận miền đã được chứng minh và phép nhân modulo không tràn.

```note-visualization
{"id":"miller-rabin","preset":"normal"}
```

Pollard–Rho giải nhiệm vụ khác: tìm thừa số không tầm thường, thường bằng cách sinh dãy modulo n rồi lấy gcd của hiệu hai phần tử với n. Nó có thể cần đổi tham số và chạy lại; có thừa số thì đệ quy phân tích các phần còn lại, còn kiểm tra prime giúp nhận biết điểm dừng. Bài này giới thiệu vai trò để chọn công cụ, chưa đưa implementation đầy đủ hay bảo đảm thời gian cho mọi 64-bit.

```note-visualization
{"id":"pollard-rho","preset":"normal"}
```

Không nên chọn bộ base hoặc cách nhân chỉ từ tên thuật toán. Với dữ liệu vừa, thử chia/sàng dễ kiểm soát hơn; với miền lớn, dùng triển khai đã đối chiếu giới hạn số học.

## Từ thừa số tới số ước và tổng ước

Mỗi n>1 có phân tích nguyên tố duy nhất `n=∏p_i^a_i`. Một ước dương chọn số mũ b_i trong 0..a_i cho từng prime. Các lựa chọn độc lập và không tạo hai tích bằng nhau do tính duy nhất của phân tích; vậy `d(n)=∏(a_i+1)`.

Tổng các ước là `σ(n)=∏(1+p_i+...+p_i^a_i)`: khai triển tích chọn đúng một số hạng ở mỗi nhóm, tức đúng một ước. Với 360, số ước là `4·3·2=24`; tổng là `(1+2+4+8)(1+3+9)(1+5)=15·13·6=1170`.

```note-visualization
{"id":"divisor-count-sum","preset":"normal"}
```

Nếu n=1, tích rỗng bằng 1: nó có đúng một ước là 1 và tổng ước cũng 1. Tổng/tích có thể tràn dù n vẫn biểu diễn được; chọn big integer hoặc modulo theo đề. Nếu dùng công thức cấp số nhân `(p^(a+1)−1)/(p−1)` dưới modulo, phép chia lại cần điều kiện nghịch đảo; cộng các lũy thừa là một cách tránh áp sai phép chia.

## Khi thật sự cần danh sách ước

Từ phân tích, sinh mọi bộ số mũ b_i rồi nhân thành ước. Phải tốn ít nhất Ω(d(n)) vì đầu ra đã có d(n) phần tử. Hoặc duyệt d tới √n, thêm cả d và n/d nếu chia hết. Với số chính phương, cặp ở căn chỉ được thêm một lần. Nếu cần thứ tự tăng, còn phải tổ chức đầu ra hoặc sort; “sinh đủ” và “đã sắp” là hai yêu cầu khác nhau.

## Tự thử

1. Phân tích 756 rồi tính số ước và tổng ước.
2. Vì sao lúc xử lý prime 5 có thể bắt đầu gạch ở 25?
3. Cần trả 10.000 ước, có thể hứa thời gian ít hơn kích thước đầu ra không?

**Đối chiếu:** (1) `756=2²·3³·7`, số ước `3·4·2=24`, tổng `(1+2+4)(1+3+9+27)(1+7)=7·40·8=2240`. (2) Các bội 10,15,20 đã có prime nhỏ hơn là 2 hoặc 3. (3) Không nếu phải xuất từng phần tử; chỉ có thể tính một thuộc tính như số lượng mà tránh liệt kê.

## Đọc tiếp

[MIT 18.781 — Euclidean Algorithm, Primes](https://ocw.mit.edu/courses/18-781-theory-of-numbers-spring-2012/resources/mit18_781s12_lec2/) và [Primality, Factoring](https://ocw.mit.edu/courses/18-781-theory-of-numbers-spring-2012/pages/lecture-notes/) cung cấp nền tảng số nguyên. Các hàm đếm/tổng ước sẽ xuất hiện lại trong [hàm số học](/vi/notes/data-structures-algorithms/arithmetic-functions/).
