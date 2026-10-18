---
title: "Điều tra service Linux: trạng thái, log và dependency"
category: "Operating System"
tags: ["linux", "systemd", "troubleshooting", "services"]
description: "Dùng systemctl và journalctl theo trình tự để chẩn đoán service failed, không chỉ restart lặp lại."
updated: 2026-10-16
translationKey: "operating-system/linux-service-troubleshooting"
---

Khi service không hoạt động, restart liên tục có thể che mất nguyên nhân hoặc làm gián đoạn hệ thống thêm. Điều tra có thứ tự: xác nhận trạng thái, đọc cấu hình, xem log quanh thời điểm lỗi, kiểm tra dependency và tái hiện một thay đổi tại một thời điểm.

## Bước 1: trạng thái và cấu hình

```sh
systemctl status example.service
systemctl cat example.service
systemctl list-dependencies example.service
```

Tên unit là ví dụ. `status` cung cấp trạng thái gần đây và PID; `cat` cho biết file gốc cùng drop-in; dependency list giúp phát hiện mount/network/credential cần thiết.

`failed` là trạng thái, không phải nguyên nhân. Exit code, signal, timeout hay dependency failure mới giúp thu hẹp giả thuyết.

## Bước 2: log đúng khoảng thời gian

```sh
journalctl -u example.service --since "10 minutes ago"
```

Đọc log trước/sau lỗi, không chỉ dòng cuối. Nếu service ghi log file riêng, kiểm tra quyền, rotation và dung lượng filesystem. Log có thể chứa secret hoặc dữ liệu người dùng; chia sẻ cần lọc thông tin nhạy cảm.

## Bước 3: xác minh môi trường chạy

Service thường có user, working directory, environment và PATH khác shell tương tác. Kiểm tra executable, file cấu hình, permission, port đã bị chiếm, resource limit và secret mount. Đừng khắc phục bằng cách chạy service dưới root nếu vấn đề thực là quyền truy cập sai.

## Restart và rollback

Sau khi sửa unit file cần reload manager; sau đó restart/reload tùy ứng dụng. Restart có thể làm mất kết nối hoặc request đang chạy. Với service truy cập từ xa, giữ console hoặc đường rollback trước khi chỉnh mạng/auth.

Ghi lại trạng thái ban đầu và thay đổi. Nếu lỗi mới xuất hiện, quay lại cấu hình trước rồi phân tích riêng thay vì cộng nhiều sửa đổi không rõ tác động.

## Tóm tắt

- Xác nhận trạng thái, unit, dependency trước khi restart.
- Đọc log theo đúng cửa sổ thời gian và bảo vệ dữ liệu nhạy cảm.
- Service có environment/quyền khác shell user.
- Exit code, timeout và dependency failure giúp tìm nguyên nhân.
- Thay một thứ mỗi lần và có đường rollback cho service trọng yếu.

## Tự kiểm tra

**`systemctl restart` thành công chứng minh service hoạt động đúng?** Không; cần kiểm tra health và hành vi người dùng.

**Nếu chạy được trong terminal thì chạy được dưới systemd?** Không nhất thiết; environment và quyền khác.

**Service failed thì tăng quyền root là cách sửa an toàn?** Không; tìm đúng file/resource bị từ chối trước.

## Đọc tiếp

Topic này nối từ boot và unit systemd tới account, log, storage và resource limits.
