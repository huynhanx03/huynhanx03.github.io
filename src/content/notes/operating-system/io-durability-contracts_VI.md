---
title: "Hợp đồng I/O: buffer, completion và durability"
category: "Operating System"
tags: ["io", "durability", "filesystem", "storage"]
description: "Phân biệt request accepted, operation complete và dữ liệu bền vững sau power loss."
updated: 2026-10-16
translationKey: "operating-system/io-durability-contracts"
---

Từ ứng dụng tới thiết bị có nhiều buffer: stdio library, page cache, block queue, controller cache và device cache. Một thao tác có thể hoàn tất ở một tầng trong khi dữ liệu vẫn chưa bền ở tầng dưới.

## Các mốc hoàn tất

1. API nhận bytes vào buffer user-space.
2. System call chép/đặt dữ liệu vào kernel page cache.
3. Block request gửi tới controller.
4. Device báo write completion.
5. Dữ liệu được cam kết vào media bền vững theo contract.

Các tầng có thể gộp hoặc reorder; mốc chính xác phụ thuộc API, filesystem, driver, device và flush policy.

## Flush và ordering

Ứng dụng dùng `fsync`/`fdatasync` hoặc API tương ứng để yêu cầu đồng bộ file metadata/data theo semantics hệ thống. Directory entry mới có thể cần sync directory. Controller/device phải tôn trọng flush/FUA và bảo vệ cache. Không có một syscall portable đơn lẻ bảo đảm mọi tầng phần cứng tuân thủ nếu thiết bị nói dối hoặc cấu hình sai.

## Async I/O và completion

Async API báo request accepted trước khi operation complete; caller phải giữ buffer hợp lệ tới completion và xử lý cancel/error. Completion queue có thể báo một phần. Reuse buffer quá sớm gây corruption/race.

## Tóm tắt

- “accepted”, “completed” và “durable” là các mốc khác nhau.
- Buffering ở nhiều tầng làm write return sớm.
- Flush/sync phải đúng file, directory và device contract.
- Async request yêu cầu giữ buffer/resource đến completion.
- Durability end-to-end cần xét toàn bộ stack, không chỉ lời gọi app.

## Tự kiểm tra

**Async submit thành công nghĩa đọc lại thấy data?** Chưa nếu chưa completion/ordering phù hợp.

**`close()` giống `fsync()`?** Không nói chung.

**Thiết bị luôn tuân flush đúng?** Thiết kế cần phần cứng/driver có semantics được hỗ trợ và cấu hình đúng.

## Đọc tiếp

Áp dụng vào filesystem transaction trong bài crash consistency.
