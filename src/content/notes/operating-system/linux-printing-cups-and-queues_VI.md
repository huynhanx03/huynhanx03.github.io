---
title: "In trên Linux: CUPS, queue và driver"
category: "Operating System"
tags: ["linux", "printing", "cups"]
description: "Theo dõi lệnh in từ ứng dụng qua print queue, scheduler CUPS, filter và thiết bị; khoanh vùng lỗi từng lớp."
updated: 2026-10-16
translationKey: "operating-system/linux-printing-cups-and-queues"
---

Lệnh in thường không ghi trực tiếp byte thô tới máy in. Ứng dụng tạo job; hệ thống in đưa job vào queue; scheduler chọn backend/driver hoặc filter phù hợp rồi gửi dữ liệu tới thiết bị qua USB hoặc mạng.

## Queue và CUPS

CUPS cung cấp scheduler và quản lý queue trên nhiều desktop Linux. Queue đại diện máy in cùng cấu hình, không nhất thiết là thiết bị vật lý được cắm trực tiếp. Một print server có thể chia sẻ queue cho client mạng.

CUPS dùng IPP để client gửi và quản lý print job; IPP thường chạy qua HTTP trên TCP port 631. Một đường in có thể đi từ ứng dụng tạo PDF/PostScript, qua queue, filter/driver để chuyển sang định dạng máy in hiểu, rồi backend gửi tới máy in. Một vài bước có thể được bỏ qua nếu ứng dụng hoặc máy in đã dùng định dạng tương thích.

Job có trạng thái và có thể xếp hàng khi thiết bị offline. `lpstat -t` xem queue/job; `lpq` xem hàng đợi; `cancel` hủy job. CUPS web UI/API có thể quản lý máy in, nên cần giới hạn quyền truy cập.

## Driver, filter và giao thức

Filter chuyển định dạng tài liệu (PDF, PostScript hoặc raster) sang dạng máy in hiểu. Một số máy hỗ trợ chuẩn driverless như IPP Everywhere/AirPrint; thiết bị khác cần driver riêng. Lỗi có thể nằm ở định dạng, filter, queue URI, DNS, firewall, giấy/mực hoặc máy in.

## Chẩn đoán theo đường đi

Kiểm tra job tới queue chưa, queue có enabled/accepting job không, backend có kết nối máy in không, rồi xem log CUPS. Với máy in mạng, xác minh IPP/socket endpoint, route và port. Gửi nhiều lần một tài liệu lớn thường chỉ tạo thêm job trùng nếu queue đang kẹt.

## Tự kiểm tra

**Queue có đồng nghĩa với máy in vật lý?** Không.

**Job stuck chắc chắn là driver lỗi?** Không; có thể do thiết bị offline, kết nối, filter hoặc queue policy.

**Máy in mạng chỉ cần kiểm tra desktop?** Không; cần kiểm tra đường mạng và dịch vụ máy in.

## Đọc tiếp

Desktop Linux gồm nhiều service người dùng và session; logind, display server và quyền thiết bị phối hợp để tạo phiên làm việc.
