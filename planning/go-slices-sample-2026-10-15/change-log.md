# Bài mẫu Slice trong Go — 2026-10-15

## Phạm vi

Viết lại một chủ đề, hai bản `slices_VI.md` và `slices_EN.md`, theo `planning/notes-writing-guide.md` v2.1. Giữ filename, URL, category, tags và translationKey. Đổi title/description để phản ánh cách dẫn dắt, cập nhật ngày sửa. Không thay các bài khác hoặc chức năng visualization.

Bản trước lần sửa này được lưu trong [before](./before/). Đây là bản sau các lần viết lại Go ngày 2026-10-14; bản trước đợt viết lại đầu tiên vẫn nằm trong thư mục originals của báo cáo cũ.

## Cách đọc mới

Bắt đầu từ hai slice nhìn cùng dữ liệu, sau đó giải thích array, mô hình slice, len/cap, make, hai trường hợp append, truyền vào hàm, copy, lọc tại chỗ và giữ bộ nhớ. Kết thúc bằng chi tiết mở rộng và ba câu tự kiểm tra có lời giải. Các đoạn không bị buộc theo cùng một cấu trúc cố định.

Mục tiêu: người đọc dự đoán được thao tác nào sửa array chung, thao tác nào tạo array khác và vì sao cần giữ slice trả về. Các ví dụ append và câu hỏi cuối trực tiếp phục vụ mục tiêu đó.

## Đối chiếu trước–sau

| Nội dung trước | Xử lý trong bản mẫu |
| --- | --- |
| Array có kích thước trong kiểu; assignment; phần tử có tham chiếu | Giữ, diễn giải sau tình huống mở đầu; nhắc lại giới hạn copy sâu khi đến mục copy |
| `&array` khác `&array[0]`, array rỗng, mô hình ba word | Giữ, chuyển xuống phần đọc thêm để không ngắt bước học slice cơ bản |
| Pointer/len/cap, slice bounds và alias | Giữ; bổ sung giải thích từng vị trí và phân biệt giới hạn index với biên reslice |
| make len 0/cap 3, append trong slice alias | Viết thành ví dụ make riêng; giải thích sai lầm dành capacity rồi truy cập index khi len bằng 0 |
| append dùng lại hoặc tạo array mới | Giữ; dùng danh sách điểm và bảng trạng thái, chọn capacity rõ ràng |
| Giới hạn cap không phải copy | Giữ ngay sau trường hợp append dùng chung array; nêu cả ghi phần tử trước append |
| Append trong hàm không đổi len caller | Giữ, tách thành mục có hàm addScore và caller giữ kết quả |
| Ngưỡng runtime 256, tăng xấp xỉ 1.25×, rounding và preallocation | Giữ trong phần đọc thêm; thêm nguồn runtime và ngày đối chiếu, không coi là bảo đảm ngôn ngữ |
| copy: số phần tử, nil đích, shallow copy | Giữ; bổ sung đích có cap nhưng len bằng 0 và ví dụ dữ liệu lồng nhau |
| positiveInPlace và clear | Giữ thuật toán; bổ sung caller, output qua alias và lý do ghi không phá dữ liệu chưa đọc; giữ mốc Go 1.21 |
| Subslice giữ array lớn | Giữ; thêm hai hàm đối chiếu và giới hạn kết luận về RSS |
| Nil/empty, so sánh, JSON và zerobase | Giữ ý nghĩa; thay nhắc tên zerobase bằng hướng dẫn không dựa địa chỉ nội bộ, thêm ví dụ json.Marshal cụ thể và giới hạn bỏ qua error |
| Ví dụ áp dụng riêng ở cuối lặp lại append | Gộp vào mạch append chính; không giữ nguyên hai phiên bản cùng minh họa một cơ chế |
| Câu hỏi cuối không có lời giải | Thay bằng ba câu dự đoán/vận dụng có giải thích, bao gồm full slice expression và copy vào đích len 0 |

Không bỏ chủ đề kiến thức chính của bản trước. Có thay ví dụ, tên biến và gộp các lời giải thích lặp; không phải chỉnh câu chữ mà giữ nguyên mọi đoạn. Không thêm Go runner hay minh họa tương tác mới.

## Nguồn và kiểm chứng

Đối chiếu Go specification, Go blog về slice, runtime slice.go và tài liệu encoding/json.Marshal; link cụ thể nằm trong bài. Đầu ra ghi trong code là dự kiến theo ngữ nghĩa, chưa chạy snippet Go, test hoặc benchmark.

Đã đối chiếu các code block giữa hai ngôn ngữ bằng script: giống nhau và có cùng số mục cấp hai. Typecheck Astro hoàn tất với 134 file, 0 errors, 0 warnings, 0 hints. `pnpm build` hoàn tất thành công và tạo chỉ mục Pagefind. Đã mở bản tiếng Việt tại `/vi/notes/go/slices/` trong trình duyệt local, thấy tiêu đề, nội dung mới và các mục tự kiểm tra. Không chạy snippet Go, test hoặc benchmark.

Chỉ sửa local; không commit, push, PR hoặc publish.
