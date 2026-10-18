# Biên tập toàn bộ notes theo bài Slice mẫu

**Mục tiêu:** viết lại các notes hiện có theo quy tắc hành văn v2.1, có mạch học và đủ độ sâu; giữ kiến thức, các ngôn ngữ hiện có và visualization.

**Tài liệu chuẩn:** `planning/notes-writing-guide.md`, `src/content/notes/go/slices_VI.md` và bản EN tương ứng. Đây là công việc nội dung; không thêm runner, đổi giao diện hay triển khai chức năng mới.

**Phạm vi kiểm kê:** 126 file ở 10 nhóm; 2 file Slice đã được duyệt làm mẫu. Bản trước đợt sửa ở `before/`, danh sách ở `manifest.json`. Người dùng đã xác nhận toàn bộ notes trên website; giữ các ngôn ngữ hiện có và đủ hai bản ở các bài đã có cặp dịch.

## Ràng buộc

- Chỉ local, không commit/push/PR/publish.
- Giữ filename, URL, taxonomy, khóa bản dịch và thứ tự topic.
- Không bỏ ý chính, ví dụ cần thiết hay điều kiện kỹ thuật. Có gộp/thay phải ghi rõ trong báo cáo nhóm.
- Không ép các bài theo một template hoặc thêm lời dẫn chung chung hàng loạt.
- Giữ nguyên các khối nhúng visualization; đặt phần giải thích xung quanh theo mạch bài.
- Giữ ngôn ngữ hiện có: cặp Việt–Anh phải tương ứng, bài chỉ có VI không bắt buộc tạo EN.
- Không thêm hoặc chạy test/benchmark. Code có output dự kiến phải phân biệt với kết quả thực thi.
- Đối chiếu nguồn chính thức khi sửa/bổ sung khẳng định kỹ thuật không chắc chắn hoặc phụ thuộc phiên bản.

## Các chặng thực hiện

- [x] Kiểm kê và lưu bản trước sửa.
- [x] Go nền tảng: intro, variables, flow, functions, pointers — 10 file.
- [x] Go mô hình dữ liệu: structs, methods, interfaces, composition, errors — 10 file.
- [x] Go runtime: maps, goroutines, channels, context, garbage_collection — 10 file.
- [x] Slice — 2 file mẫu đã duyệt; không viết lại thêm.
- [x] Fundamentals, database, network, operating-system, libraries — 14 file.
- [x] Workflow-engine, cadence, temporal — 18 file.
- [x] DSA — 62 file, chia theo nền tảng/cấu trúc, graph/DP và string/toán.
- [x] Đối chiếu độ phủ kiến thức, bản dịch và các khối visualization bằng audit tài liệu tĩnh.
- [x] Tổng hợp báo cáo chỉnh sửa, các phần gộp/thay/bỏ và giới hạn kiểm chứng. Không chạy test/typecheck/build trong công việc biên tập nội dung.

## Điều kiện hoàn tất

Từng file được đọc và biên tập thực sự, không chỉ chèn lời mở đầu hoặc đổi tiêu đề. Bài có mục tiêu rõ, lời giải thích đủ bước, ví dụ có ngữ cảnh và câu tự kiểm tra có lời giải khi phù hợp. Báo cáo đối chiếu ghi cụ thể ý được giữ/gộp/sửa. Không đánh đồng build thành công với code ví dụ đã được chạy hoặc nội dung đã được người học kiểm chứng.
