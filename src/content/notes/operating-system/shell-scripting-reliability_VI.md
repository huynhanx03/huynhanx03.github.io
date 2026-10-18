---
title: "Shell script đáng tin cậy: quoting, lỗi và cleanup"
category: "Operating System"
tags: ["linux", "shell scripting", "automation"]
description: "Viết script có kiểm tra lỗi, quoting và cleanup rõ ràng, tránh các bẫy khi chạy tự động."
updated: 2026-10-16
translationKey: "operating-system/shell-scripting-reliability"
---

Script shell hữu ích để điều phối lệnh quản trị, nhưng nó không thay thế ngôn ngữ phù hợp cho xử lý dữ liệu phức tạp. Script tốt làm rõ môi trường, kiểm tra lỗi, quote dữ liệu và hạn chế tác dụng phụ ngoài dự kiến.

## Khai báo interpreter và chế độ lỗi

```sh
#!/usr/bin/env bash
set -euo pipefail
```

Shebang chọn interpreter; `set -euo pipefail` là lựa chọn thường gặp trong Bash nhưng không biến mọi lỗi thành an toàn. `-e` có ngoại lệ theo ngữ cảnh như điều kiện và pipeline; `-u` bắt biến chưa khai báo; `pipefail` truyền lỗi từ lệnh giữa pipeline. Nên xử lý lỗi quan trọng tường minh.

## Quote và xử lý path

```sh
for file in "$directory"/*.log; do
  [ -e "$file" ] || continue
  process_one "$file"
done
```

Quote biến để giữ khoảng trắng và ký tự đặc biệt. Glob không match có thể được giữ nguyên hoặc biến mất tùy shell option; script phải cân nhắc directory rỗng. Dùng `--` trước tên file nếu command hỗ trợ để tên bắt đầu bằng dấu `-` không bị hiểu thành option.

## Đối số, điều kiện và exit status

Các tham số đặc biệt giúp script xử lý đầu vào mà không tự tách chuỗi: `$0` là tên script, `$#` là số đối số, `$1`/`$2` là các đối số đầu, còn `"$@"` truyền lại từng đối số nguyên vẹn. Tránh dùng `$@` không quote vì shell có thể tách khoảng trắng và bung glob.

`if command; then ...` kiểm tra exit status của lệnh; 0 thường nghĩa thành công, khác 0 thường nghĩa thất bại nhưng ý nghĩa cụ thể tùy command (ví dụ `grep` dùng 1 để báo không tìm thấy mẫu). `$?` bị lệnh kế tiếp ghi đè nên cần lưu/kiểm tra ngay. Dùng `case` khi phân nhánh theo chuỗi hoặc mẫu; dùng `[`/`test` cho điều kiện file, chuỗi và số, nhớ quote tham số có thể rỗng.

## Temporary files và cleanup

Tạo file tạm trong thư mục phù hợp bằng công cụ như `mktemp`, giới hạn permission và xóa bằng trap khi thoát. Không tạo file tạm với tên đoán trước trong thư mục dùng chung vì có thể bị đua hoặc symlink attack.

Cleanup không được xóa path tùy biến nếu biến rỗng/sai. Kiểm tra target, quyền và bước destructive; ưu tiên dry-run khi có thể.

Khi truyền danh sách đối số, dùng `"$@"` để giữ nguyên từng đối số, kể cả tên file có khoảng trắng. Với `find` và `xargs`, dùng cặp delimiter NUL (`-print0` và `-0`) nếu tên file tùy ý có thể chứa newline. Tránh gom đầu ra thành chuỗi bằng command substitution để rồi tách lại thành tên file.

`source file` (hoặc dấu chấm trong POSIX shell) chạy cấu hình trong shell hiện tại, nên biến và working directory có thể thay đổi ở đó. Chạy file như một command tạo process shell khác; thay đổi môi trường trong child không quay lại parent. `exec command` thay thế shell hiện tại bằng command mới, hữu ích khi làm process chính cho container nhưng không có bước quay lại script.

## Idempotency và logging

Script triển khai định kỳ nên có thể chạy lại mà không làm hỏng trạng thái: kiểm tra trước khi tạo, ghi đè an toàn, lock để tránh hai instance và log bước chính. Cần xác định exit code khi một phần thành công và phần sau thất bại.

## Khi nên dùng ngôn ngữ khác?

Nếu cần parse dữ liệu lồng nhau, retry phức tạp, transaction, xử lý Unicode hoặc nhiều nhánh lỗi, Python/Go/Rust thường rõ hơn shell. Shell nên ghép chương trình đã có, không tự xây parser cho JSON hay xử lý chuỗi không tin cậy.

## Tóm tắt

- Chọn đúng shell và hiểu giới hạn `set -e`.
- Quote biến, xử lý glob rỗng và tên file bắt đầu bằng dấu gạch.
- File tạm cần tên an toàn, permission và cleanup có kiểm tra.
- Idempotency, lock và log làm automation dễ vận hành.
- Dùng ngôn ngữ đầy đủ khi logic vượt quá khả năng shell rõ ràng.

## Tự kiểm tra

**`set -e` đảm bảo script dừng ở mọi lỗi?** Không; có ngoại lệ theo ngữ cảnh shell.

**`rm -rf "$TEMP_DIR"/*` an toàn nếu biến rỗng?** Không; phải kiểm tra biến/đường dẫn trước destructive action.

**Shell phù hợp để tự parse JSON bằng regex?** Thường không; dùng parser JSON đúng chuẩn.

## Đọc tiếp

Topic này tiếp tục với environment, PATH, profile và cách chạy service/job ngoài terminal.
