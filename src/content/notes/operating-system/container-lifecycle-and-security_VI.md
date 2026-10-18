---
title: "Vòng đời container, image và giới hạn bảo mật"
category: "Operating System"
tags: ["containers", "security", "runtime", "deployment"]
description: "Theo container từ build image tới runtime, quản lý secret, privilege và dữ liệu bền vững."
updated: 2026-10-17
translationKey: "operating-system/container-lifecycle-and-security"
---

Container thường được tạo từ image, cấu hình command/environment/mount, rồi runtime khởi chạy process trong namespace và cgroup. Khi process chính kết thúc, container có thể chuyển trạng thái stopped; restart policy do runtime/orchestrator quyết định.

Image là các lớp filesystem và cấu hình dùng để tạo container; container là instance có process đang hoặc đã chạy cùng writable state riêng. Các lệnh liệt kê container đang chạy có thể không hiện container đã thoát; container/image cũ vẫn chiếm dung lượng cho tới khi được dọn. Writable layer không nên là nơi duy nhất giữ dữ liệu cần tồn tại qua lần recreate.

## Image reproducible và provenance

Dockerfile/Containerfile mô tả các bước tạo image. Pin version/digest, dùng base image được cập nhật và giảm tool không cần thiết giúp giảm drift và bề mặt tấn công. Tag như `latest` có thể trỏ nội dung khác theo thời gian; deployment quan trọng nên nhận dạng artifact bất biến.

Build context cần loại secret và file local không cần khỏi image. Secret đưa vào layer build có thể còn trong lịch sử image dù bị xóa ở layer sau. Dùng secret mount/build feature phù hợp và scan artifact.

## Runtime privilege

Giảm Linux capabilities, chạy non-root trong container, bật seccomp/AppArmor/SELinux phù hợp và giới hạn syscall/mount. Không mount `/var/run/docker.sock` hoặc host root filesystem cho workload không tin cậy nếu chưa hiểu quyền tương đương host.

Flag security khác nhau giữa runtime và distro. Mặc định an toàn cần được xác nhận; không sao chép cấu hình production từ snippet không rõ nguồn.

Quyền điều khiển daemon cũng là ranh giới bảo mật: Docker daemon thường có quyền root, nên thành viên nhóm `docker` có thể giành quyền rất cao trên host. Rootless mode của Docker/Podman giảm một phần đặc quyền nhưng networking, storage driver và khả năng tương thích có thể khác; cần kiểm tra đúng runtime và mode đang chạy.

## Secret và dữ liệu

Environment variable tiện nhưng có thể lộ qua process inspection/log/dump; volume secret có quyền truy cập rõ thường phù hợp hơn. Secret cần rotation và không ghi vào image.

Container filesystem layer có thể biến mất khi recreate. Database, upload và state cần volume hoặc service lưu trữ bên ngoài với backup/recovery. Local volume trên một host vẫn chịu lỗi host/storage đó.

## Health check và shutdown

Process nên bắt tín hiệu dừng, hoàn tất request đang xử lý trong grace period, flush state cần thiết và thoát. Health check cần phân biệt liveness (process còn tiến triển) với readiness (đã sẵn sàng nhận traffic); probe quá gắt có thể gây restart loop.

Process chính trong container thường có PID 1 trong PID namespace. PID 1 có semantics signal đặc biệt: các signal có hành động mặc định là kết thúc thường bị bỏ qua nếu process không cài handler, nên ứng dụng phải chủ động xử lý `SIGTERM` để graceful shutdown. PID 1 cũng cần thu dọn process con mồ côi; nếu ứng dụng không làm tốt hai việc này, dùng init nhỏ như Docker `--init` hoặc supervisor phù hợp. Xem [Docker container run](https://docs.docker.com/reference/cli/docker/container/run/). Khi container dừng vì process chính thoát, runtime xử lý các process còn lại và restart policy.

## Tóm tắt

- Image nên được nhận dạng bất biến và build từ nguồn có provenance.
- Secret không nên ghi vào build layer hoặc log.
- Giảm quyền runtime, capabilities, mounts và syscall surface.
- Dữ liệu cần bền vững phải nằm trên volume/storage có backup.
- Readiness, liveness và graceful shutdown có mục đích khác nhau.

## Tự kiểm tra

**Xóa secret ở layer sau làm nó biến mất khỏi image history?** Không đảm bảo; layer trước có thể vẫn chứa.

**Health check fail đồng nghĩa phải kill container ngay?** Chính sách tùy runtime; phân biệt readiness và liveness.

**Volume trên host là backup?** Không; cần bản sao độc lập và kiểm thử restore.

## Đọc tiếp

Phần network giải thích container network namespace, bridge, NAT và service discovery.
