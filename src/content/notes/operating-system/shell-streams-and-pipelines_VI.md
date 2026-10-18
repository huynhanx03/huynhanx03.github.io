---
title: "Shell, stream và pipeline trên Linux"
category: "Operating System"
tags: ["linux", "shell", "pipeline", "stdin"]
description: "Hiểu shell điều phối process, ba stream chuẩn, redirection và cách pipe nối lệnh."
updated: 2026-10-16
translationKey: "operating-system/shell-streams-and-pipelines"
---

Shell là chương trình nhận lệnh, phân tích cú pháp và khởi chạy process; nó không phải kernel. Bash, zsh và `/bin/sh` có cú pháp/khả năng khác nhau. Lệnh `cd` thường là builtin vì shell cần đổi working directory của chính mình; nếu là process con riêng thì thay directory của child không đổi directory shell cha.

## Ba stream chuẩn

Process thường nhận file descriptor 0 cho stdin, 1 cho stdout và 2 cho stderr. Chúng mặc định có thể là terminal, nhưng có thể được chuyển hướng.

```sh
command < input.txt > output.txt 2> errors.log
```

`>` ghi đè file, `>>` nối thêm; dùng nhầm có thể mất dữ liệu. `2>&1` nối stderr vào nơi stdout đang trỏ tại thời điểm phân tích; thứ tự redirection vì vậy quan trọng.

## Pipeline

```sh
grep "ERROR" app.log | sort | uniq -c
```

Pipe nối stdout của process bên trái vào stdin bên phải. Kernel duy trì buffer giới hạn; nếu consumer chậm, producer có thể bị block. Các lệnh trong pipeline thường là process riêng, nên shell chờ và thu nhận trạng thái theo quy tắc của nó.

Pipeline dễ tạo thành phần nhỏ có thể ghép lại, nhưng quoting, exit status và dữ liệu rỗng cần nghĩ rõ. Bash `pipefail` làm pipeline báo lỗi nếu một lệnh giữa thất bại; mặc định nhiều shell chỉ trả status của lệnh cuối.

## Quoting và expansion

Shell có thể mở rộng biến, glob, command substitution và tách từ trước khi chạy lệnh. `"$file"` thường giữ khoảng trắng trong một giá trị path; `$file` không quote có thể bị word splitting/globbing. Single quotes giữ nội dung nguyên văn theo quy tắc shell.

Không ghép input không tin cậy vào chuỗi shell để chạy. Dùng API process với argv riêng trong ngôn ngữ ứng dụng; trong script, quote biến và kiểm tra input.

## Exit status

Mã 0 thường nghĩa thành công; nonzero báo kết quả khác hoặc lỗi theo hợp đồng chương trình. `&&` chỉ chạy lệnh sau khi lệnh trước thành công; `||` dùng nhánh lỗi. Đọc stderr và exit code thay vì chỉ nhìn output.

## Tóm tắt

- Shell phân tích lệnh và tạo process; kernel quản lý process đó.
- stdin/stdout/stderr là file descriptor có thể chuyển hướng.
- Pipe nối stream qua buffer; lỗi giữa pipeline có thể bị che nếu không cấu hình.
- Quoting ngăn shell tách/expand dữ liệu ngoài ý muốn.
- Exit status là một phần hợp đồng của lệnh.

## Tự kiểm tra

**`cd` là process con đổi thư mục cho shell?** Thường là builtin để đổi state của shell hiện tại.

**`2>&1` ở mọi vị trí đều giống nhau?** Không; thứ tự redirection ảnh hưởng đích được sao chép.

**Pipe truyền file trực tiếp giữa hai chương trình?** Nó nối stream qua kernel buffer.

## Đọc tiếp

Script shell là chương trình có biến, điều kiện và lỗi; cần viết an toàn hơn một dòng lệnh tương tác.
