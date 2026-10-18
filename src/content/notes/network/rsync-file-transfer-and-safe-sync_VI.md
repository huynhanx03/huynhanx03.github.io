---
title: "rsync: chuyển file và đồng bộ thư mục an toàn"
category: "Network"
tags: ["network", "rsync", "file transfer", "synchronization"]
description: "Phân biệt sao chép với đồng bộ, hiểu trailing slash, dry run, --delete và các tùy chọn bảo vệ khi dùng rsync."
updated: 2026-10-16
translationKey: "network/rsync-file-transfer-and-safe-sync"
---

`rsync` phù hợp khi cần chuyển một cây thư mục nhiều lần và muốn lần sau chỉ gửi phần cần cập nhật. Nó có thể chạy giữa hai thư mục trên cùng máy hoặc qua SSH giữa hai máy. Khác với một lệnh copy đơn giản, `rsync` có các tùy chọn để xem trước thay đổi, loại trừ file và xử lý file đã có ở đích.

## Cú pháp cơ bản

```sh
rsync -a source/ user@host:/srv/backup/
```

Hai đầu cần có `rsync`; khi dùng dạng `user@host:path`, máy nguồn thường gọi chương trình `rsync` ở máy đích qua SSH. Nếu báo không tìm thấy `rsync`, hãy cài nó ở máy đích hoặc chỉ rõ đường dẫn bằng `--rsync-path`.

`-a` là chế độ lưu trữ, hữu ích khi sao chép cây thư mục và giữ các thuộc tính thường cần như thư mục con, liên kết tượng trưng, thời gian và quyền. Đừng hiểu `-a` là bản sao đầy đủ mọi loại metadata trong mọi hệ thống; quyền sở hữu, ACL, extended attributes và thiết bị đặc biệt có thể cần tùy chọn hoặc quyền bổ sung.

## Dấu gạch chéo cuối nguồn làm đổi đường dẫn đích

```sh
rsync -a project  host:/backup/
rsync -a project/ host:/backup/
```

Giả sử `/backup/` đã tồn tại là thư mục. Lệnh đầu tạo `/backup/project/...`; lệnh sau chép nội dung bên trong `project` thẳng vào `/backup/`. Khi kết hợp với `--delete`, nhầm dấu `/` có thể khiến phạm vi xóa khác hẳn dự định. Hãy kiểm tra đường dẫn nguồn và đích trước khi chạy.

## Xem trước trước khi ghi

```sh
rsync -anv project/ host:/backup/project/
```

`-n` chạy thử mà không thay đổi file; `-v` liệt kê hoạt động. Dùng bước này trước các lệnh có `--delete`, trước lần đồng bộ đầu tiên, hoặc khi chưa chắc cách rsync diễn giải đường dẫn.

Theo mặc định, rsync không xóa file thừa ở đích. Thêm `--delete` sẽ làm đích khớp với tập file nguồn bằng cách xóa những file chỉ còn ở đích:

```sh
rsync -anv --delete project/ host:/backup/project/
```

Chỉ bỏ `-n` sau khi danh sách thay đổi trong lần xem trước đúng như mong muốn. Đích phải là đúng thư mục cần đồng bộ; `--delete` không phải tùy chọn dọn dẹp vô hại.

## Lọc và bảo vệ file đích

```sh
rsync -a --exclude='.git/' project/ host:/backup/project/
rsync -a --backup --suffix='.old' project/ host:/backup/project/
```

`--exclude` nhận mẫu khớp tên tương đối với cây đang truyền; có thể đọc nhiều quy tắc từ `--exclude-from=file`. Quy tắc đầu tiên khớp đường dẫn quyết định include/exclude, nên đặt include cần thiết trước exclude rộng; không thể dùng include phía sau để đảo một exclude đã khớp. Cũng phải cho phép đi qua các thư mục cha để rsync tìm được file con ([rsync manual](https://download.samba.org/pub/rsync/rsync.1#FILTER_RULES)). Kiểm tra bằng `-n` để chắc rằng file cần giữ không bị lọc nhầm.

Mặc định, rsync thường so sánh kích thước và thời gian sửa đổi để quyết định file có cần truyền hay không. `--checksum` đọc nội dung để so sánh checksum, tốn I/O và CPU hơn. `--ignore-existing` bỏ qua file đã có ở đích; `--backup` giữ phiên bản cũ trước khi ghi đè; `--update` tránh ghi đè file đích có thời gian mới hơn. Những tùy chọn này biểu đạt các chính sách khác nhau, không thay thế việc kiểm tra bản sao lưu.

## Tốc độ và giới hạn

`-z` nén dữ liệu truyền qua mạng, có thể hữu ích với đường truyền chậm và dữ liệu dễ nén; với kết nối nhanh hoặc dữ liệu đã nén, lợi ích có thể nhỏ. `--stats` tóm tắt lượng dữ liệu và hoạt động. Lần đồng bộ thành công không tự nó chứng minh rằng dữ liệu đã được sao lưu độc lập: xóa nhầm hoặc lỗi nguồn có thể được đồng bộ sang đích, nhất là khi dùng `--delete`.

Nếu đường truyền upload bị chiếm hết băng thông, `--bwlimit` giới hạn tốc độ rsync để các kết nối khác còn khoảng trống. Cũng nên đo thực tế trước khi bật nén: trên LAN nhanh, thời gian CPU để nén/giải nén có thể làm chậm cả hai đầu. Truyền file lớn tuần tự thường hợp với lưu trữ mạng hơn thao tác ngẫu nhiên trên nhiều file nhỏ, vốn nhạy với độ trễ.

Khi dữ liệu đi qua mạng không đáng tin, cần bảo vệ cả xác thực hai đầu lẫn tính bí mật của dữ liệu; chỉ có quyền truy cập file đúng chưa đảm bảo nội dung không bị nghe lén. Khi dùng rsync qua SSH, SSH cung cấp kênh mã hóa và xác thực host, còn quyền đọc/ghi trên máy đích vẫn cần giới hạn riêng.

## Quy trình dùng an toàn

1. Xác nhận nguồn, máy đích và thư mục đích.
2. Quyết định có muốn giữ nguyên thư mục gốc hay chỉ chép nội dung bên trong; để ý dấu `/` cuối.
3. Chạy `rsync -anv ...` và đọc danh sách file được thêm, cập nhật hoặc xóa.
4. Chỉ sau khi danh sách đúng mới bỏ `-n` để thực hiện.
5. Với dữ liệu quan trọng, giữ phiên bản hoặc bản sao lưu độc lập; đồng bộ không thay thế backup.

## Tự kiểm tra

**`rsync -a dir host:dest` và `rsync -a dir/ host:dest` có cùng cấu trúc đích không?** Khác nhau nếu `dest` đã tồn tại là thư mục: lệnh đầu đặt `dir` vào trong đó, lệnh sau đặt nội dung của `dir` vào đó. Nếu `dest` chưa tồn tại, cách đặt tên thư mục đích có thể làm hai kết quả trông giống nhau; luôn kiểm tra điều kiện đích bằng dry run.

**`--delete` xóa file ở nguồn?** Không; nó xóa ở đích những đường dẫn không có trong nguồn, theo phạm vi truyền.

**`-n` có truyền hoặc xóa file thật không?** Không. Đây là chế độ xem trước; hãy dùng nó để kiểm tra kế hoạch trước khi thực hiện.

## Đọc tiếp

Đặt `rsync` cạnh [NFS và ngữ nghĩa file từ xa](/vi/notes/network/nfs-remote-file-semantics/) và [SMB/CIFS giữa Linux, Windows](/vi/notes/network/smb-cifs-linux-file-sharing/): rsync chuyển bản sao theo từng lần chạy, còn NFS/SMB cung cấp cách truy cập cây file qua mạng với ngữ nghĩa và lỗi phụ thuộc kết nối.
