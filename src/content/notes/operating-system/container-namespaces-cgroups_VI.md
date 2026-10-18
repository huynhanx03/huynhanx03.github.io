---
title: "Container: namespaces, cgroups và filesystem image"
category: "Operating System"
tags: ["containers", "namespaces", "cgroups", "linux"]
description: "Hiểu container là nhóm process được cô lập bằng tính năng kernel, không phải máy ảo thu nhỏ."
updated: 2026-10-16
translationKey: "operating-system/container-namespaces-cgroups"
---

Container thường là một nhóm process Linux với góc nhìn và giới hạn tài nguyên được cấu hình riêng. Nó không mặc định có kernel riêng; container chia sẻ kernel host. Runtime như Docker/Podman/containerd chuẩn bị filesystem, namespace, cgroup và cấu hình process.

## Namespaces tạo góc nhìn riêng

Linux namespaces có thể cô lập PID, mount, network, IPC, hostname và user mapping. Process trong PID namespace có thể thấy PID riêng; network namespace có interface/routes riêng; mount namespace có cây mount riêng.

Namespace không biến kernel thành ranh giới tuyệt đối. Kernel syscall vẫn dùng chung, nên lỗ hổng kernel ảnh hưởng nhiều container. User namespace map UID trong container sang UID khác trên host để giảm quyền thực tế trong cấu hình phù hợp.

## Cgroups giới hạn và đo tài nguyên

Cgroup nhóm process để theo dõi/giới hạn CPU, memory, I/O và số process. Container có thể bị OOM trong cgroup dù host còn RAM. CPU quota/throttling ảnh hưởng latency; xem cgroup metrics cùng container metrics.

Namespace trả lời “process nhìn thấy gì”; cgroup trả lời “process dùng bao nhiêu”. Hai cơ chế bổ sung nhau.

## Image, layer và writable layer

Image thường gồm lớp filesystem bất biến; container thêm writable layer hoặc mount volume. Layer chia sẻ giảm dung lượng nhưng có thể tạo overhead metadata/copy-up. Dữ liệu ứng dụng cần sống qua vòng đời container nên đặt ở volume/external storage theo thiết kế.

Image không tự là sandbox bảo mật. Cần source tin cậy, cập nhật base image, bỏ capabilities thừa, chạy non-root khi phù hợp, hạn chế mount/secret và cấu hình network.

## VM và container

| Thuộc tính | VM | Container Linux phổ biến |
| --- | --- | --- |
| Kernel | Guest kernel riêng | Chia sẻ kernel host |
| Khởi động | Khởi động guest OS | Khởi chạy process được cô lập |
| Cách ly | Qua hypervisor và thiết bị ảo | Qua namespace/cgroup/kernel policy |
| Tính tương thích | Có thể chạy OS khác trong giới hạn hypervisor | Phụ thuộc kernel tương thích host |

Đây là mô hình tổng quát; công nghệ như microVM/unikernel tạo biến thể. Chọn theo threat model, compatibility, startup, density và vận hành.

## Tóm tắt

- Container là process được cấu hình cách ly/giới hạn, thường chia sẻ kernel host.
- Namespace cô lập góc nhìn; cgroup nhóm và giới hạn tài nguyên.
- Image layer và writable layer có vòng đời khác volume dữ liệu.
- Container không phải sandbox tuyệt đối; kernel vẫn là shared attack surface.
- VM và container đánh đổi kernel isolation, chi phí và tương thích.

## Tự kiểm tra

**Container có kernel riêng như VM?** Container Linux phổ biến dùng kernel host.

**Namespace giới hạn CPU?** Không; cgroup quản lý tài nguyên CPU.

**Dữ liệu trong writable layer chắc chắn tồn tại sau khi xóa container?** Không; dữ liệu cần bền vững nên dùng volume/storage phù hợp.

## Đọc tiếp

Khi đưa container lên production, cần hiểu image provenance, network policy và resource limit; các phần đó nối sang topic Network.
