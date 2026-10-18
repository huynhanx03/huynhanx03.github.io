---
title: "Signal và giao tiếp giữa các process"
category: "Operating System"
tags: ["operating-system", "process", "signal", "ipc"]
description: "Hiểu signal như thông báo bất đồng bộ, so sánh pipe, socket và shared memory, rồi chọn kênh IPC theo nhu cầu."
updated: 2026-10-16
translationKey: "operating-system/signals-interprocess-communication"
---

Process thường cần phối hợp với process khác: gửi yêu cầu dừng, truyền dữ liệu hoặc cùng xử lý một công việc. Signal là thông báo nhỏ và bất đồng bộ; IPC cung cấp các cách trao đổi dữ liệu và đồng bộ có cấu trúc hơn.

## Signal không phải gói dữ liệu

Kernel có thể gửi signal khi có sự kiện như terminal gửi Ctrl-C, process truy cập vùng nhớ sai hoặc một process gọi `kill`. Process có thể xử lý, bỏ qua hoặc giữ mặc định tùy signal; một số signal như `SIGKILL` không thể bị bắt hay bỏ qua. Signal thường chỉ báo loại sự kiện, không mang payload tùy ý.

Handler chạy trong ngữ cảnh bất đồng bộ và bị giới hạn mạnh: không phải hàm thư viện nào cũng an toàn để gọi trong handler. Với C, một mẫu cơ bản là handler chỉ gán `volatile sig_atomic_t`; [POSIX chỉ cho phép handler gọi các thao tác async-signal-safe](https://pubs.opengroup.org/onlinepubs/9799919799/functions/V2_chap02.html). Có thể ghi vào self-pipe không blocking bằng `write` để đánh thức event loop, rồi xử lý việc phức tạp bên ngoài handler. Trong chương trình nhiều thread, cần chọn rõ thread nhận signal; thường chặn signal ở các thread làm việc và xử lý bằng `sigwait` ở một thread riêng.

## Chọn IPC

- **Pipe/FIFO:** luồng byte, tiện nối tiến trình cha-con hoặc các lệnh shell.
- **Unix domain socket:** giao tiếp hai chiều trên cùng máy, hỗ trợ socket API và quyền filesystem.
- **TCP/UDP socket:** giao tiếp qua máy hoặc qua namespace/network, với đặc tính transport tương ứng.
- **Shared memory:** trao đổi dữ liệu lớn với ít copy hơn, nhưng cần đồng bộ để tránh race.
- **Message queue:** thông điệp có ranh giới và hàng đợi, tùy API hệ điều hành.

IPC không tự giải quyết mọi vấn đề. Cần định nghĩa framing, xử lý partial read/write, đóng đầu không dùng, timeout, lỗi peer và xác thực quyền truy cập.

## Vòng đời và phát hiện lỗi

Khi một process chết, pipe/socket phía bên kia có thể trả EOF hoặc lỗi; shared memory có thể còn tồn tại nhưng trạng thái dữ liệu dang dở. Giao thức nên có cách nhận biết peer mất, hủy việc dở và dọn tài nguyên. Với cha-con, `wait`/`waitpid` thu nhận trạng thái kết thúc và tránh zombie.

## Tự kiểm tra

**Signal có phù hợp truyền file lớn không?** Không; dùng IPC truyền dữ liệu.

**Shared memory có tự bảo vệ khỏi race không?** Không; cần mutex, semaphore hoặc protocol đồng bộ.

**EOF trên pipe có nghĩa gì?** Tất cả đầu ghi đã đóng.

## Đọc tiếp

Khi nhiều process cùng cập nhật tài nguyên, cần lock và quy tắc đồng bộ để bảo toàn invariant.
