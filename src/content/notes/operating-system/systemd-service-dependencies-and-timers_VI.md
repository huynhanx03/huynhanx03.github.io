---
title: "systemd service: unit, dependency và timer"
category: "Operating System"
tags: ["linux", "systemd", "service"]
description: "Hiểu service unit được mô tả thế nào, dependency khác thứ tự ra sao và cách đọc trạng thái dịch vụ."
updated: 2026-10-16
translationKey: "operating-system/systemd-service-dependencies-and-timers"
---

systemd quản lý hệ thống bằng các unit có tên và quan hệ rõ ràng. Service là một loại unit; target gom nhiều unit; timer kích hoạt công việc theo thời gian. Nắm mô hình này giúp ta sửa đúng nguyên nhân thay vì bật tắt dịch vụ theo cảm tính.

## Một service unit gồm gì?

Một file unit thường có các phần `[Unit]`, `[Service]` và `[Install]`. `[Unit]` mô tả ý nghĩa, điều kiện và quan hệ; `[Service]` chỉ lệnh chạy, cách theo dõi tiến trình và xử lý khi lỗi; `[Install]` cho biết unit được nối vào target nào khi enable.

`Type=simple` phù hợp tiến trình chạy foreground mà systemd có thể theo dõi trực tiếp. `Type=oneshot` chạy một việc rồi kết thúc. `Type=forking` dành cho chương trình tự fork kiểu daemon cũ và thường cần `PIDFile=`. Ưu tiên foreground khi ứng dụng hỗ trợ: cách này giúp systemd theo dõi process chính đáng tin hơn.

Một số daemon hỗ trợ báo readiness bằng `Type=notify`; `Type=dbus` chờ service đăng ký tên trên D-Bus. Điều này giúp dependency cần service “đã sẵn sàng” tránh nhầm thời điểm process vừa được tạo với thời điểm nó phục vụ request được. Chỉ dùng type mà ứng dụng thực sự hỗ trợ; nếu không, systemd có thể chờ sai tín hiệu hoặc đánh dấu unit active quá sớm.

## Dependency không đồng nghĩa với thứ tự

`Wants=` và `Requires=` mô tả kéo theo unit khác với mức phụ thuộc khác nhau. `After=` và `Before=` chỉ mô tả thứ tự khởi động hoặc dừng; chúng không tự kéo unit kia vào transaction. Chẳng hạn, một service có thể cần `network-online.target` trước, nhưng `After=network-online.target` tự nó không bảo đảm target được khởi động.

`systemctl enable` tạo liên kết để unit được kéo vào lúc boot; `systemctl start` khởi chạy ngay trong phiên hiện tại. Một unit có thể enabled nhưng đang failed, hoặc đang active nhưng chưa enabled. Hai câu hỏi này cần được kiểm tra riêng.

## Restart và timer

`Restart=on-failure` có thể khởi động lại tiến trình khi lỗi, nhưng không thay thế việc xử lý lỗi. Thêm khoảng chờ, giới hạn khởi động liên tiếp và log hữu ích để tránh vòng lặp restart che mất nguyên nhân.

Timer unit có thể chạy service theo thời gian lịch (`OnCalendar=`) hoặc tương đối với lần boot/hoạt động (`OnBootSec=`, `OnUnitActiveSec=`). Timer giúp công việc định kỳ được systemd quản lý và ghi log; service được timer gọi vẫn cần thiết kế an toàn khi chạy lặp.

Socket activation cho phép systemd mở socket trước và chỉ khởi chạy service khi có kết nối đến. Nó có thể giảm dịch vụ chạy nhàn rỗi và giữ kết nối chờ trong lúc service khởi động, nhưng ứng dụng phải hỗ trợ nhận socket do systemd chuyển giao. `systemctl list-jobs` cho các activation đang chờ/chạy; `systemctl status` cho trạng thái unit, process thuộc cgroup và log gần nhất. Sau khi sửa unit file, `daemon-reload` đọc lại định nghĩa; thao tác này khác `reload` cấu hình bên trong một service đang chạy.

## Cách điều tra

- `systemctl status ten.service`: trạng thái gần đây và vài dòng log.
- `systemctl cat ten.service`: cấu hình gốc và override.
- `systemctl list-dependencies ten.target`: cây dependency.
- `journalctl -u ten.service -b`: log của unit trong lần boot hiện tại.
- `systemctl daemon-reload`: đọc lại file unit vừa sửa.

Sau khi sửa, kiểm tra lỗi cấu hình rồi mới restart. Dùng override tại `/etc/systemd/system/...d/` khi cần chỉnh unit do gói cung cấp, để cập nhật gói không xóa thay đổi.

## Tự kiểm tra

**`After=` có tự khởi động unit được nhắc đến không?** Không; nó chỉ định thứ tự nếu cả hai cùng được đưa vào transaction.

**`enabled` có nghĩa là service đang chạy không?** Không.

**Timer gọi service nào?** Thường là service có cùng tên, trừ khi cấu hình `Unit=` chỉ định khác.

## Đọc tiếp

Khi service chạy nhưng vẫn thất bại, journal và log hệ thống cho ta mốc thời gian cùng thông báo gốc.
