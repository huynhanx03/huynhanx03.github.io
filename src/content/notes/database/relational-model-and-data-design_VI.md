---
title: "Mô hình dữ liệu quan hệ và cách thiết kế schema"
category: "Database"
description: "Từ một quy trình thực tế, ta xác định bảng, quan hệ, khóa và ràng buộc để dữ liệu có cấu trúc rõ ràng và khó rơi vào trạng thái mâu thuẫn."
updated: 2026-10-17
translationKey: "database/relational-model-and-data-design"
---

Một cửa hàng cần lưu khách hàng, sản phẩm và đơn đặt hàng. Nếu ta nhét tất cả vào một bảng, tên khách hàng và địa chỉ sẽ lặp lại ở mỗi đơn; khi khách đổi địa chỉ, nhiều dòng có thể phải sửa. Nếu chỉ có một bảng lớn chứa cả danh sách sản phẩm, số lượng và giá, ta lại cần cách biểu diễn một đơn có nhiều sản phẩm. Thiết kế dữ liệu bắt đầu bằng việc nhận ra những sự vật và mối quan hệ trong quy trình, rồi chọn cách biểu diễn chúng sao cho các thao tác thường gặp vẫn chính xác.

## Từ sự vật đến quan hệ

Trong mô hình quan hệ, dữ liệu được biểu diễn bằng các quan hệ. Trong SQL, ta thường nhìn thấy chúng dưới dạng bảng: mỗi dòng là một bản ghi, mỗi cột là một thuộc tính. Cách nhìn này hữu ích, nhưng một bảng không chỉ là một tờ giấy có ô. Database còn áp dụng kiểu dữ liệu, ràng buộc, quyền truy cập và các quy tắc giao dịch lên dữ liệu đó.

Với cửa hàng, ta có thể bắt đầu bằng ba loại sự vật:

| Sự vật | Thông tin cần giữ | Cách biểu diễn ban đầu |
| --- | --- | --- |
| Khách hàng | mã, tên, email | `customers` |
| Đơn hàng | mã, người đặt, thời điểm | `orders` |
| Sản phẩm trong đơn | sản phẩm nào, số lượng nào, giá lúc mua | `order_items` |

Một khách hàng có thể đặt nhiều đơn. Một đơn có nhiều sản phẩm, và một sản phẩm có thể xuất hiện trong nhiều đơn. Quan hệ nhiều-nhiều giữa đơn hàng và sản phẩm được tách thành `order_items`; bảng này lưu thêm thông tin thuộc về lần mua cụ thể như số lượng và đơn giá đã chốt.

```sql
CREATE TABLE customers (
    customer_id BIGINT PRIMARY KEY,
    email       VARCHAR(320) NOT NULL UNIQUE,
    name        VARCHAR(200) NOT NULL
);

CREATE TABLE orders (
    order_id    BIGINT PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(customer_id),
    created_at  TIMESTAMP NOT NULL
);

CREATE TABLE order_items (
    order_id   BIGINT NOT NULL REFERENCES orders(order_id),
    product_id BIGINT NOT NULL,
    quantity   INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
    PRIMARY KEY (order_id, product_id)
);
```

Đây là mô hình minh họa. Một schema thực tế còn cần xác định tiền tệ, quy tắc một sản phẩm có thể xuất hiện nhiều lần trong cùng đơn hay không, vòng đời sản phẩm, xóa đơn, phân quyền và cách ghi nhận thay đổi.

## Khóa giúp nhận diện và nối dữ liệu

**Primary key** xác định duy nhất một dòng trong bảng. Một khóa có thể là một cột như `order_id`, hoặc nhiều cột như `(order_id, product_id)`. Khóa nên ổn định trong suốt vòng đời bản ghi; email thường không phải khóa tốt vì người dùng có thể đổi email.

**Foreign key** biểu diễn quan hệ đến một bảng khác và giúp database từ chối tham chiếu không hợp lệ. `orders.customer_id` không thể trỏ đến khách hàng chưa tồn tại nếu ràng buộc được bật và có hiệu lực. Foreign key bảo vệ một bất biến trong database, nhưng không tự chọn chính sách nghiệp vụ khi xóa khách: ta phải quyết định chặn xóa, xóa lan truyền, hay giữ bản ghi lịch sử.

Một giá trị duy nhất không nhất thiết là khóa chính. `email` có thể có ràng buộc `UNIQUE`, còn bản ghi vẫn dùng `customer_id` làm định danh nội bộ. Ràng buộc `NOT NULL`, `CHECK`, `UNIQUE`, primary key và foreign key diễn đạt những quy tắc khác nhau; nên chọn đúng quy tắc thay vì chỉ kiểm tra tất cả ở tầng ứng dụng.

## Chọn cột và kiểu dữ liệu theo ý nghĩa

Kiểu dữ liệu vừa mô tả ý nghĩa vừa giới hạn giá trị có thể lưu. Dùng số nguyên cho số đếm, kiểu số thập phân chính xác cho tiền, timestamp có quy ước múi giờ rõ ràng cho thời điểm, và kiểu văn bản có độ dài phù hợp cho chuỗi. Không chọn kiểu chỉ vì một ví dụ ngắn đang chạy.

Các hệ quản trị có khác biệt về kiểu dữ liệu, cách ép kiểu, collation và hành vi với `NULL`. Một cột `NULL` biểu thị chưa có giá trị hoặc chưa biết giá trị theo cách thiết kế của schema; nó không bằng chuỗi rỗng và phép so sánh thông thường với `NULL` không trả về true/false như số học. Trước khi chọn kiểu phụ thuộc sản phẩm, xem tài liệu của đúng phiên bản, chẳng hạn [các kiểu dữ liệu PostgreSQL](https://www.postgresql.org/docs/current/datatype.html) và [các kiểu dữ liệu MySQL 8.4](https://dev.mysql.com/doc/refman/8.4/en/data-types.html).

## Chuẩn hóa để mỗi sự thật có nơi lưu phù hợp

Nếu địa chỉ khách hàng được chép vào từng đơn, một lần đổi địa chỉ đòi hỏi sửa nhiều dòng. Nếu một lần sửa bị bỏ sót, cùng một sự thật xuất hiện dưới hai giá trị. Đây là một **update anomaly**. Tương tự, dữ liệu lặp có thể khiến ta không thể thêm sản phẩm nếu chưa có đơn hàng (**insertion anomaly**) hoặc làm mất thông tin sản phẩm khi xóa đơn cuối cùng (**deletion anomaly**).

Chuẩn hóa phân tích thuộc tính nào phụ thuộc vào sự vật nào, rồi đặt chúng ở quan hệ phù hợp. Với ví dụ trên, tên khách hàng phụ thuộc vào `customer_id`, còn số lượng và giá tại thời điểm mua phụ thuộc vào cặp `(order_id, product_id)`. Chuyển các thuộc tính về đúng bảng giảm lặp và giúp ràng buộc nhất quán rõ hơn.

Chuẩn hóa không có nghĩa là tách mọi cột thành một bảng riêng. Mục tiêu là giữ ý nghĩa và tránh bất thường do phụ thuộc dữ liệu sai. Join có chi phí; khi hệ thống đã đo được điểm nghẽn, một số giá trị có thể được lưu lặp có chủ đích để giảm truy vấn. Đó là **denormalization**: ta chấp nhận thêm trách nhiệm đồng bộ để đổi lấy một đường đọc cụ thể. Bản sao phải có nguồn sự thật xác định và quy trình cập nhật, xây lại hoặc phát hiện lệch.

Ví dụ, `orders.total_amount` có thể được tính từ `order_items`. Nếu lưu sẵn để đọc nhanh, ứng dụng cần bảo đảm tổng được cập nhật cùng transaction với các dòng hàng hoặc có cơ chế đối soát. Một cột tổng được lưu mà không có quy tắc cập nhật sẽ biến tối ưu thành một nguồn sai lệch.

## Schema là hợp đồng dữ liệu

Schema định nghĩa dữ liệu nào hợp lệ, các thực thể nối với nhau ra sao và database bảo vệ quy tắc nào. Một thiết kế tốt bắt đầu từ câu hỏi ứng dụng cần trả lời, nhưng cũng xét tới cập nhật đồng thời, lịch sử, xóa, nhập dữ liệu và thay đổi schema sau này.

Trước khi chốt thiết kế, hãy kiểm tra bằng các câu hỏi cụ thể:

- Một khách hàng có thể có nhiều email hay một email dùng chung nhiều tài khoản?
- Xóa sản phẩm có làm mất lịch sử đơn đã mua không?
- Hai request đồng thời có thể tạo hai dòng cùng một khóa nghiệp vụ không?
- Giá trong đơn là giá hiện tại của sản phẩm hay giá đã được chốt lúc mua?
- Nếu thêm cột hoặc đổi quy tắc, ứng dụng đang chạy có thể đọc cả schema cũ lẫn mới trong giai đoạn chuyển đổi không?

Các câu trả lời này quyết định khóa, ràng buộc, quan hệ và migration. Chúng cũng tạo đầu vào cho những bài sau về transaction, index và query planning.

## Tự kiểm tra

**Vì sao `unit_price` nằm trong `order_items` thay vì luôn đọc từ `products`?** Vì đơn hàng cần giữ giá tại thời điểm mua. Giá hiện tại của sản phẩm có thể đổi sau đó.

**`UNIQUE(email)` có thay thế primary key được không?** Có thể dùng làm candidate key nếu quy tắc nghiệp vụ đảm bảo duy nhất và ổn định; nhiều hệ thống vẫn chọn một định danh riêng để quan hệ không phụ thuộc vào email có thể thay đổi.

**Chuẩn hóa có luôn làm truy vấn nhanh hơn không?** Không. Nó thường giảm lặp và bất thường cập nhật, nhưng truy vấn có thể cần join nhiều hơn. Tối ưu đọc cần được quyết định theo workload và dữ liệu đo được.

Nguồn đọc nền tảng: *High Performance MySQL*, chương 4; *PostgreSQL 14 Internals*, phần giới thiệu về database, relation, schema và kiểu dữ liệu.
