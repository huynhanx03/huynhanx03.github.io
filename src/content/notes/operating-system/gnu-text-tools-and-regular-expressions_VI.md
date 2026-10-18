---
title: "grep, sed, awk và xử lý văn bản theo luồng"
category: "Operating System"
tags: ["linux", "command-line", "text-processing"]
description: "Chọn công cụ lọc, thay thế và xử lý cột phù hợp; hiểu regex cơ bản cùng giới hạn của pipeline text."
updated: 2026-10-16
translationKey: "operating-system/gnu-text-tools-and-regular-expressions"
---

Unix thường kết hợp chương trình nhỏ qua stdin và stdout. `grep` chọn dòng, `sed` biến đổi luồng, `awk` xử lý bản ghi và trường. Kết hợp đúng công cụ giúp thao tác có thể lặp lại, nhưng trước hết cần hiểu định dạng dữ liệu đang xử lý.

## Lọc với grep

`grep -n` thêm số dòng, `-i` bỏ phân biệt hoa thường, `-v` đảo điều kiện và `-E` dùng extended regular expression. Regex mô tả mẫu trong văn bản; nó không tự hiểu cú pháp lồng nhau như JSON, HTML hay ngôn ngữ lập trình.

Ký tự regex thường đồng thời có ý nghĩa trong shell, vì thế quote mẫu: `grep -E 'error|failed' app.log`. Dùng `-F` khi cần chuỗi cố định, tránh regex không cần thiết.

## Biến đổi với sed

`sed 's/old/new/g'` thay các khớp trên mỗi dòng. Mặc định sed xử lý theo dòng, nên pattern đa dòng cần tùy chọn/cách viết phù hợp. `sed -i` sửa file tại chỗ và cú pháp khác nhau giữa GNU/BSD; tạo backup hoặc ghi ra file mới khi dữ liệu quan trọng.

## Trường với awk

Awk chia dòng thành trường theo separator, mặc định là khoảng trắng. `$1`, `$2` là trường; `$0` là toàn dòng. Có thể lọc bằng điều kiện rồi in kết quả, ví dụ `awk '$3 > 100 { print $1, $3 }'`. Nếu dữ liệu chứa dấu phẩy có quote hoặc trường đa dòng, CSV parser đúng chuẩn an toàn hơn awk mặc định.

## Giữ pipeline dễ kiểm tra

Một pipeline nên có bước rõ ràng, xử lý encoding và lỗi đọc file. `sort`, `uniq`, `cut`, `tr`, `head` và `tail` bổ trợ các thao tác phổ biến, nhưng các lệnh dòng không thay thế parser có hiểu schema. Với tên file tùy ý hoặc binary, đừng giả định dữ liệu là các dòng text sạch.

## Tự kiểm tra

**Regex có phải parser tổng quát cho mọi định dạng lồng nhau?** Không.

**`grep -F` phù hợp lúc nào?** Khi tìm chuỗi literal.

**Awk mặc định parse CSV có quote đúng chuẩn không?** Không.

## Đọc tiếp

Các công cụ archive nén và đóng gói cũng thường nối thành pipeline; cần phân biệt lưu trữ, nén và mã hóa.
