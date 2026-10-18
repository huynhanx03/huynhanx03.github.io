---
title: "Shell quoting, exit status và pipeline an toàn"
category: "Operating System"
tags: ["linux", "shell", "bash"]
description: "Hiểu shell mở rộng lệnh theo thứ tự nào, vì sao quoting quan trọng và cách giữ lỗi không bị che trong pipeline."
updated: 2026-10-16
translationKey: "operating-system/shell-quoting-exit-status-pipelines"
---

Shell không đơn thuần chuyển nguyên dòng chữ cho chương trình. Nó phân tích cú pháp, mở rộng biến và wildcard, tách từ, rồi mới gọi chương trình. Nhiều lỗi script đến từ việc shell biến một giá trị thành nhiều đối số hoặc diễn giải ký tự ngoài ý muốn.

## Quote quyết định ranh giới đối số

`"$file"` giữ giá trị biến thành một đối số, kể cả khi tên chứa dấu cách. Không quote có thể khiến word splitting và glob expansion đổi một đường dẫn thành nhiều đối số. Single quote giữ nguyên nội dung; double quote vẫn cho phép một số mở rộng như `$name` và `$(command)`.

Khi cần duyệt tên file tùy ý, đừng giả định tên không có newline hoặc dấu cách. Dùng `find ... -print0` kết hợp `xargs -0`, hoặc vòng lặp đọc null-delimited. Với dữ liệu cấu hình, ưu tiên truyền qua stdin hay file thay vì ghép thành lệnh shell.

## Exit status và pipeline

Lệnh thường trả status `0` khi thành công và khác `0` khi có lỗi; ý nghĩa cụ thể do chương trình định nghĩa. `$?` phải được đọc ngay sau lệnh cần kiểm tra. `if command; then ...` thường rõ hơn tự so sánh status.

Trong Bash, status mặc định của pipeline là status của lệnh cuối. `set -o pipefail` khiến pipeline thất bại nếu một thành phần thất bại. `set -e` có ngoại lệ theo ngữ cảnh và không thay thế xử lý lỗi tường minh; script đáng tin cần kiểm tra các bước quan trọng và cleanup.

## Subshell và biến môi trường

`$(command)` chạy command substitution và bỏ newline cuối; process substitution tạo đường dẫn tạm có thể đọc như file. Pipeline có thể chạy từng vế trong subshell tùy shell, nên thay đổi biến trong vòng lặp ở pipeline có thể không còn thấy bên ngoài.

Biến shell chỉ tự động tới process con khi được export. Mọi dữ liệu ngoài như tên file, URL hay input người dùng cần được truyền như argument riêng, không nội suy thành mã shell.

## Tự kiểm tra

**`echo $name` an toàn với tên có dấu cách?** Không ổn định; dùng `printf '%s\n' "$name"`.

**Pipeline `a | b` có báo lỗi của `a` theo mặc định trong Bash?** Không nhất thiết; bật `pipefail` hoặc kiểm tra riêng.

**`set -e` có bảo đảm script dừng đúng mọi lỗi?** Không; semantics có ngoại lệ, cần kiểm soát bước quan trọng.

## Đọc tiếp

Sau khi shell đã tạo đối số, các công cụ text như grep, sed và awk xử lý luồng theo những quy tắc khác nhau.
