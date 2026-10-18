---
title: "Sinh cấu hình có thứ tự: dãy bit, tập con và hoán vị"
category: "Data Structures & Algorithms"
kind: "guide"
difficulty: "beginner"
translationKey: "data-structures-algorithms/configuration-generation"
series: "DSA cơ bản"
seriesOrder: 13
tags: ["enumeration", "subsets", "permutations", "combinatorics"]
description: "Liệt kê hết nghiệm theo thứ tự xác định và hiểu chi phí không thể tránh của số lượng đầu ra."
draft: false
updated: 2026-10-15
---

Với ba công tắc, mỗi công tắc có hai trạng thái, ta có thể viết lần lượt mọi cách bật tắt. Nhưng khi số công tắc tăng, cách viết tùy hứng dễ bỏ sót hoặc ghi trùng. Bài toán sinh cấu hình yêu cầu một quy tắc: mỗi đối tượng hợp lệ xuất hiện đúng một lần, theo thứ tự đã thống nhất, và có dấu hiệu rõ ràng để biết đã hết.

Trong bài này, cấu hình được biểu diễn bằng dãy bit, danh sách chỉ số hoặc hoán vị. Ta sẽ theo dõi cấu hình đang có và cách tạo cấu hình tiếp theo. Bạn cần biết array/slice, vòng lặp và đệ quy; chưa cần các kỹ thuật tối ưu tìm kiếm.

## Từ ba công tắc đến bộ đếm nhị phân

Với `n=3`, thứ tự từ điển của các dãy bit là `000, 001, 010, 011, 100, 101, 110, 111`. Khi chuyển `011` sang `100`, hai bit 1 cuối đã đạt giới hạn nên được trả về 0; bit 0 ngay trước chúng tăng thành 1. Đó cũng là phép cộng một trong hệ nhị phân.

Tổng quát, bắt đầu từ toàn số 0. Muốn sinh tiếp, tìm bit 0 cuối cùng, đổi nó thành 1 rồi đặt mọi bit bên phải thành 0. Hậu tố toàn 1 không thể tăng thêm mà giữ nguyên tiền tố, nên vị trí 0 vừa tìm là vị trí phải thay đổi. Đặt hậu tố về 0 cho cấu hình nhỏ nhất lớn hơn cấu hình hiện tại. Nếu toàn bộ bit đã là 1 thì không còn vị trí tăng và thuật toán dừng.

Có `2^n` cấu hình vì mỗi vị trí chọn độc lập một trong hai giá trị. Có thể dùng số nguyên chạy từ `0` đến `2^n-1` khi kiểu máy đủ rộng; với `n` lớn hơn độ rộng kiểu, cần slice bit hoặc biểu diễn thích hợp, không dịch bit rồi giả định số vẫn vừa kiểu. Riêng việc in hay sao chép đầy đủ một dãy tốn `Θ(n)`, nên tổng đầu ra có chi phí `Θ(n2^n)`. Không có thuật toán nào in đầy đủ danh sách này trong thời gian đa thức theo `n`.

```note-visualization
{"id":"binary-configurations","preset":"normal"}
```

## Tập con là một cách đọc dãy quyết định

Với tập chỉ số `{0,1,2}`, bit thứ `i` bằng 1 nghĩa là chọn chỉ số `i`. Mỗi tập chỉ số xác định một dãy bit và ngược lại, nên phép tương ứng không bỏ sót hay sinh trùng. Một cách cài đặt khác không cần bộ đếm là quyết định lần lượt “không lấy” rồi “lấy” ở từng vị trí:

```go
func VisitSubsets(n int, visit func([]int)) {
    chosen := make([]int, 0, n)
    var walk func(int)
    walk = func(i int) {
        if i == n {
            visit(append([]int(nil), chosen...))
            return
        }
        walk(i + 1) // không lấy i
        chosen = append(chosen, i)
        walk(i + 1) // lấy i
        chosen = chosen[:len(chosen)-1]
    }
    walk(0)
}
```

Đây là khai báo hàm Go; caller truyền `n>=0` và callback `visit` hợp lệ. Chẳng hạn `VisitSubsets(2, func(s []int) { fmt.Println(s) })` với import `fmt` dự kiến in `[]`, `[1]`, `[0]`, `[0 1]`. Thứ tự ấy đến từ việc xét chỉ số 0 trước nhưng thử nhánh không lấy trước; nó không phải thứ tự từ điển thông thường của các danh sách chỉ số.

Trước `walk(i)`, `chosen` chứa đúng các chỉ số đã chọn trong phần `<i`. Hai nhánh chia toàn bộ khả năng theo việc có lấy `i` hay không, nên rời nhau và đầy đủ. Sau nhánh lấy, rút ngắn slice phục hồi quyết định cũ trước khi quay về. Callback nhận bản sao vì những nhánh tiếp theo sẽ sử dụng lại vùng chứa của `chosen`; nếu callback giữ dữ liệu, bản sao bảo vệ kết quả đã nhận. Với `n=0`, hàm vẫn gọi callback một lần cho tập rỗng.

Nếu nguồn là `[a,a,b]`, hai lựa chọn lấy vị trí 0 và lấy vị trí 1 khác nhau dù cùng cho giá trị `a`. Có 8 tập chỉ số; nếu muốn các lựa chọn giá trị khác nhau và giữ số lần xuất hiện, chỉ còn `∅, {a}, {a,a}, {b}, {a,b}, {a,a,b}`. Nếu dùng nghĩa tập hợp toán học loại cả số lần lặp thì lại chỉ có `∅,{a},{b},{a,b}`. Xác định rõ đầu ra trước khi khử trùng.

## Tăng hoán vị bằng thay đổi nhỏ nhất cần thiết

Với `n` phần tử phân biệt có `n!` hoán vị. Để sinh theo thứ tự từ điển, bắt đầu bằng thứ tự tăng. Với `[1,3,2]`, hậu tố `[3,2]` đã giảm nên không thể làm nó lớn hơn chỉ bằng sắp lại hậu tố. Phải tăng số 1: đổi nó với số nhỏ nhất lớn hơn nó ở bên phải, là 2. Sau đó đưa phần còn lại về thứ tự tăng, được `[2,1,3]`.

Quy tắc tổng quát tìm từ phải vị trí `i` có `a[i]<a[i+1]`. Hậu tố sau `i` không tăng: các phần tử kề nhau có thể bằng nhau. Quét từ phải tìm phần tử đầu lớn hơn `a[i]`, đổi hai giá trị rồi đảo hậu tố. Ta tăng tiền tố ở vị trí xa bên phải nhất có thể, tăng giá trị ít nhất có thể và làm hậu tố nhỏ nhất, nên không bỏ qua hoán vị trung gian. Nếu không có `i`, toàn dãy không tăng và đây là hoán vị cuối. Mỗi bước tốn `O(n)` trong trường hợp xấu, cũng là chi phí in một hoán vị đầy đủ. Với giá trị trùng, bắt đầu từ dãy đã sắp và dùng so sánh nghiêm ngặt sẽ đi qua các hoán vị giá trị phân biệt, thay vì coi các bản sao bằng nhau là vật khác.

```note-visualization
{"id":"next-permutation","preset":"normal"}
```

## Chỉ sinh các tổ hợp có đúng k phần tử

Không cần sinh `2^n` tập con rồi lọc nếu chỉ muốn chọn `k`. Giữ `c[0]<...<c[k-1]`, bắt đầu `[0,1,...,k-1]`. Vị trí `i` tăng tối đa đến `n-k+i`; vượt giới hạn ấy sẽ không còn đủ chỗ cho các chỉ số sau. Tìm từ phải vị trí còn tăng được, tăng một rồi đặt hậu tố bằng các số liên tiếp nhỏ nhất.

Với `n=5,k=3`, sau `[0,1,4]` ta không tăng được 4, nên tăng 1 thành 2 và đặt vị trí cuối thành 3: kết quả `[0,2,3]`. Có `C(n,k)` cấu hình, mỗi cấu hình lưu/in `k` chỉ số; trường hợp `k=0` có một tổ hợp rỗng, còn `k<0` hoặc `k>n` không có tổ hợp hợp lệ.

## Tự kiểm tra và đối chiếu lập luận

**1.** Sau `1011` là gì? **2.** Sau `[1,3,2]` và `[3,2,1]` trong thứ tự hoán vị là gì? **3.** Vì sao không thể hứa liệt kê nhanh mọi tập con khi `n` lớn?

**Giải thích:** `1011` chuyển thành `1100`: tăng bit 0 cuối rồi xóa hậu tố. `[1,3,2]` chuyển thành `[2,1,3]`; `[3,2,1]` là cấu hình cuối, không có kế tiếp lớn hơn. Với tập con, riêng số kết quả đã bằng `2^n`; nếu in đủ dãy chỉ thị dài `n`, còn cần `Θ(n2^n)` ký tự. Chọn cách biểu diễn chỉ thay chi phí mỗi kết quả, không làm biến mất số lượng kết quả.

Khi chỉ một phần cấu hình có thể hợp lệ, [quay lui](/vi/notes/data-structures-algorithms/backtracking/) giúp bỏ cả nhánh trước khi tạo đủ cấu hình.
