---
title: "Dòng lệnh Linux: path, file và công cụ cơ bản"
category: "Operating System"
tags: ["linux", "command line", "filesystem"]
description: "Dùng path tuyệt đối/tương đối, điều hướng file và các lệnh cơ bản với hiểu biết về tác dụng của chúng."
updated: 2026-10-16
translationKey: "operating-system/linux-command-line-basics"
---

Terminal là giao diện nhập/xuất; shell đọc dòng lệnh và khởi chạy chương trình. Lệnh `pwd`, `ls`, `cd`, `mkdir`, `cp`, `mv`, `rm`, `cat` và `less` là chương trình hoặc builtin tùy trường hợp. Hiểu path và working directory giúp tránh thao tác nhầm.

## Path tuyệt đối và tương đối

Path tuyệt đối bắt đầu từ `/`; path tương đối được diễn giải từ working directory hiện tại. `.` là thư mục hiện tại, `..` là thư mục cha, `~` thường được shell mở rộng thành home. `cd` thay working directory của shell.

Lệnh `ls -la` hiển thị file ẩn và metadata; `file` đoán loại nội dung; `stat` đọc metadata cụ thể. Phần mở rộng `.txt` là quy ước tên, không chứng minh bytes bên trong là văn bản.

## Tạo, sao chép, đổi tên và xóa

`cp` sao chép file; `mv` đổi tên hoặc di chuyển trong cùng filesystem, còn qua filesystem khác có thể thực hiện copy rồi remove. `rm` gỡ tên, không chuyển vào thùng rác mặc định. Trước lệnh recursive/force, in path và kiểm tra biến để tránh xóa nhầm.

`mkdir -p` tạo các cấp thiếu; `rmdir` chỉ xóa directory rỗng; `rm -r` có thể xóa cả cây. Dùng `--` trước tên bắt đầu bằng `-` nếu command hỗ trợ.

## Glob và tìm kiếm

Shell mở rộng `*.log` thành danh sách tên trước khi command chạy. Nếu có quá nhiều kết quả, lệnh có thể vượt giới hạn argv; `find` phù hợp để duyệt cây lớn hoặc lọc theo metadata. `grep` tìm mẫu trong nội dung; quote pattern và path để shell không diễn giải ngoài ý muốn.

Các công cụ `head`, `tail`, `sort`, `uniq`, `diff` và `less` thường kết hợp với pipeline để xem dữ liệu dần. `locate` tra cơ sở dữ liệu có thể chưa cập nhật; nó khác quét filesystem trực tiếp.

## Permission cơ bản

`ls -l` hiển thị loại file và quyền cho owner/group/others. `chmod` thay mode; `chown` đổi owner/group, thường cần quyền phù hợp. Symlink có semantics riêng: quyền truy cập thường xét target, còn quyền của link không hoạt động như mode file thường trên nhiều Unix.

## Tóm tắt

- Working directory quyết định cách hiểu relative path.
- Shell mở rộng glob trước khi command nhận argv.
- `mv` qua filesystem khác có thể không phải thao tác rename đơn giản.
- `rm` gỡ tên trực tiếp; lệnh recursive/force cần xác minh target.
- Permission, owner, group và symlink ảnh hưởng truy cập thực tế.

## Tự kiểm tra

**`*.log` được chương trình `grep` tự mở rộng?** Thường shell mở rộng trước khi gọi `grep`.

**Di chuyển file luôn không copy dữ liệu?** Không; qua filesystem khác có thể copy rồi xóa.

**`rm` mặc định có thể khôi phục từ trash?** Thông thường không.

## Đọc tiếp

Nối lệnh qua stream và pipeline trong bài [Shell, stream và pipeline](/vi/notes/operating-system/shell-streams-and-pipelines/).
