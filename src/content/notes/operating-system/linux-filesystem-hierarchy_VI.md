---
title: "Filesystem hierarchy trên Linux: /etc, /var, /usr, /proc và /sys"
category: "Operating System"
tags: ["linux", "filesystem", "fhs", "procfs"]
description: "Đọc các vùng thư mục Linux theo vai trò, phân biệt file cấu hình với filesystem ảo của kernel."
updated: 2026-10-16
translationKey: "operating-system/linux-filesystem-hierarchy"
---

Linux gom nhiều filesystem và nguồn dữ liệu vào một cây bắt đầu tại `/`. Thư mục có tên tiêu chuẩn giúp admin biết nên tìm cấu hình, log, executable hay trạng thái kernel ở đâu; distro có thể khác chi tiết và symlink.

## Các thư mục thường gặp

- `/etc`: cấu hình hệ thống/service.
- `/var`: dữ liệu thay đổi như log, spool, cache hoặc database state.
- `/usr`: phần lớn chương trình/thư viện và dữ liệu dùng chung; trên nhiều distro phần lớn read-only về mặt vận hành.
- `/home`: dữ liệu user thông thường.
- `/root`: home của superuser.
- `/tmp`: file tạm, có thể bị dọn.
- `/run`: trạng thái runtime, thường nằm trên tmpfs.
- `/dev`: device node.
- `/proc`: process/kernel interface ảo.
- `/sys`: device/kernel topology và thuộc tính ảo.

Filesystem Hierarchy Standard là hướng dẫn chung; distro có layout riêng. Không nên xóa file trong `/var` chỉ vì tên giống cache/log nếu chưa biết service sở hữu.

## procfs và sysfs không phải dữ liệu bền vững

`/proc` cung cấp thông tin process (`/proc/<pid>`) và kernel parameters; một số file cho phép thay đổi runtime setting. `/sys` bộc lộ thiết bị, driver, bus và tunable attributes. Nội dung được sinh bởi kernel khi đọc, không phải bản lưu bình thường trên đĩa.

Một số file có side effect khi ghi. Dùng `sysctl` cho các kernel parameter được hỗ trợ dưới `/proc/sys`; thuộc tính trong `/sys` cần công cụ hoặc giao diện riêng của subsystem. Đọc tài liệu kernel/distro trước khi đổi.

## Package ownership

File trong `/usr` thường do package manager sở hữu. Sửa trực tiếp binary package có thể bị update ghi đè và làm checksum/verification sai. Cấu hình override nên đặt tại path được service hỗ trợ, chẳng hạn drop-in, thay vì sửa file vendor.

## Tóm tắt

- Thư mục chuẩn gợi ý vai trò nhưng chi tiết distro có thể khác.
- `/etc` cấu hình, `/var` dữ liệu biến đổi, `/usr` chương trình/dữ liệu dùng chung.
- `/proc` và `/sys` là giao diện kernel ảo, không phải kho file bền.
- Một số virtual file có side effect khi ghi.
- Sửa package-owned file dễ bị update ghi đè; dùng override mechanism.

## Tự kiểm tra

**`/proc/cpuinfo` là file lưu cố định trên ổ?** Không; procfs sinh thông tin kernel.

**`/tmp` luôn giữ file sau reboot?** Không đảm bảo.

**Sửa binary trong `/usr/bin` là cách cấu hình app?** Thường không; dùng config/service override/package phù hợp.

## Đọc tiếp

Kết hợp hierarchy với mount, storage và Linux service troubleshooting để tìm đúng file cấu hình/log.
