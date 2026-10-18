# Visualization tương tác trong notes

Hiện có **161 scenario (160 mới + Binary Search hiện có), nhúng vào 62 notes DSA/toán**. Danh sách ID, vị trí, presets và giới hạn nằm trong `planning/dsa-visualization-progress.md`. Phạm vi được duyệt nằm trong `planning/2026-10-12-dsa-visualization-coverage.md`.

## Nhúng tại đoạn đang đọc

Đặt sau phần giải thích của thuật toán, trước bài tập/nguồn tham khảo:

````markdown
```note-visualization
{"id":"insertion-sort","preset":"normal"}
```
````

Binary Search dùng presets `found`, `duplicates`, `absent`, `empty`; các family mới dùng `normal`, `boundary`. Plugin kiểm tra JSON, ID và preset khi build. Mỗi lần nhúng tạo instance độc lập: chỉnh input, tua hoặc chạy một demo không đổi demo khác. Không cần sao chép HTML/CSS vào từng note.

## Các phần dùng chung

| Module | Trách nhiệm |
|---|---|
| `types.ts` | Hợp đồng Scenario, Frame, Trace; source và codeLines tùy chọn |
| `catalog/*.mjs`, `catalog.mjs` | Metadata tĩnh, trường input, presets, expected output, giới hạn và fallback; dùng chung cho build/browser |
| `core/input.ts` | Parse số nguyên an toàn, BigInt, Unicode/code points, UTF-8 bytes, cạnh đồ thị có ID riêng |
| `core/trace.ts` | Snapshot bất biến, giới hạn frame và work budget |
| `core/scenario.ts` | Nối metadata và builder với player generic |
| `core/scene.ts` | Panels mảng, bảng, đồ thị/cây, stack/queue, chuỗi, khoảng và bàn cờ |
| `scenarios/*.ts` | Logic thuật toán theo family; trả trace từ input thật |
| `views/lesson-scene.ts`, `views/array.ts`, `views/graph.ts` | Vẽ panels; không chứa thuật toán. Đồ thị có cạnh song song/ngược/loop riêng; cây gọi có vùng cuộn để giữ nhãn dễ đọc |
| `views/indexed-array.ts` | Mảng cùng con trỏ/biên cho Binary Search |
| `views/source-code.ts` | Source tham chiếu bằng text nodes và highlight dòng; không thực thi source |
| `player.ts` | Input/error, manual/play/pause, previous/next, tốc độ, scrub, reset, loop và output |
| `bootstrap.ts` | Import theo family được nhúng; vòng đời custom element và cleanup |
| `src/plugins/note-visualization.mjs` | Fence Markdown thành element và fallback; demo không làm nhiễu Pagefind |
| `src/styles/visualizations.css` | Màu/theme, bố cục, chuyển động và reduced motion có scope |

**Cập nhật đồng bộ:** sửa player/CSS ảnh hưởng tất cả scenario; sửa renderer ảnh hưởng các scenario dùng renderer đó. Thay logic một thuật toán chỉ ảnh hưởng thuật toán ấy. Website static cần build và deploy lại để bản công khai nhận thay đổi; HMR cập nhật bản local. Note chỉ giữ ID/preset nên không phải sửa từng fence khi đổi giao diện chung.

## Thêm một thuật toán

1. Đọc note, xác định đơn vị dữ liệu và biến thể thuật toán; ghi rõ nếu dùng byte hay code point, đồ thị có hướng hay vô hướng.
2. Thêm metadata vào family thích hợp: ID, title, note/section, fields, ít nhất preset thường và biên, expectedOutput, giới hạn chính xác, fallback.
3. Thêm Builder vào module family. Parse/validate trước; gọi `consume()` trong các vòng lặp/đệ quy; `emit()` khi trạng thái có ý nghĩa; trả output/summary thật. Không trả kết quả hoàn tất giả khi chạm budget.
4. Dùng panels có sẵn hoặc thêm renderer độc lập. Node/cạnh phải có ID ổn định; cạnh ngược không dùng chung ID với cạnh tiến. Source chỉ cung cấp nếu khớp biến thể và các bước.
5. Family mới cần import metadata vào catalog và đăng ký loader trong bootstrap. Không thêm nhánh thuật toán vào player.
6. Nhúng fence sau đoạn giải thích tương ứng. Script `scripts/embed-dsa-visualizations.mjs` phục vụ bộ DSA hiện tại, không tự động áp dụng cho mọi lĩnh vực; đọc lại vị trí sau khi chạy script.
7. Chạy typecheck/build khi được yêu cầu xác minh và quan sát UI của trường hợp thường/biên. Expected output trong catalog là tài liệu đối chiếu, không tự chứng minh tính đúng.

## Playback và giới hạn

- Mặc định thủ công, loop tắt, không autoplay; pause khi tab ẩn; cleanup timer/listener khi element tháo.
- Trace mới giới hạn 2.048 frame và 100.000 đơn vị công việc, còn parser có giới hạn riêng mỗi scenario. BigInt dùng cho số học cần độ chính xác nguyên.
- Sửa input tạm dừng. Input lỗi giữ ảnh của trace trước, hiển thị rõ chưa áp dụng; Play không chạy lại trace cũ. Nếu chưa có trace hợp lệ thì transport bị vô hiệu hóa, input/apply vẫn dùng được.
- Loop/tua đọc lại snapshots; không gửi request hay thực hiện side effect bên ngoài. Không lưu input/source vào localStorage.
- Bảng/chuỗi/cây lớn cuộn trong khối; nhãn và trạng thái bổ sung cho màu. Reduced motion tắt animation/transition. Source tùy chọn đặt cạnh demo khi đủ rộng, xếp dưới trên mobile.
- Module lỗi trả lại fallback đọc được; JS tắt vẫn có ví dụ tĩnh và nội dung note.

## Mở rộng Kafka, database và service flow

Một scenario tương lai có thể nhận topology, queue, message IDs và records; builder tạo các snapshot gửi/nhận/ack/retry, renderer vẽ service/queue/message. Player và fence hiện có vẫn dùng được. Có thể thêm event compiler hoặc renderer chuyên biệt khi cần concurrency; không cần rải điều khiển playback vào notes.

Hiện mô phỏng chạy bằng TypeScript trong browser; Go là tham chiếu, chưa có runner thực thi Go. Chưa có Kafka/database connection, event compiler cho concurrency hay renderer message flow. HLD path demo minh họa việc tách chain bằng cách quét các đoạn, không hứa độ phức tạp của segment tree; segment/Fenwick riêng có thao tác truy vấn/cập nhật thật. Suffix tree minh họa trie hậu tố nén, không phải Ukkonen tuyến tính.

Bộ DSA giữ nguyên các chủ đề đã loại khỏi phạm vi. Không commit/push/PR/publish trong công việc này.

## Animation di chuyển phần tử

ArrayPanel có `keys?: string[]` để nhận diện từng phần tử độc lập với giá trị và vị trí; khóa phải ổn định giữa các frame. Không dùng giá trị làm khóa vì mảng có thể có phần tử trùng. Không có keys thì renderer giữ nhận diện theo slot, phù hợp với bảng trạng thái không diễn đạt việc hoán vị. `held` nhận key/value/label/itemLabel cho phần tử đang giữ ngoài mảng; cùng key giúp animation đi từ mảng sang vùng giữ rồi quay lại.

Renderer array giữ DOM theo key, đo vị trí trước/sau rồi dùng Web Animations API để dịch chuyển; swap cùng hàng có hai cung ngược chiều. Frame mới lấy vị trí đang hiển thị trước khi hủy animation cũ, nên bấm nhanh/tua ngược không tạo timer chồng. Duration theo `--nv-motion` từ player. Reduced motion bỏ chuyển động; tháo renderer hủy animation/listener. Slot index đứng yên, ID đi theo item, mảng dài cuộn ngang.

Các trace sorting cung cấp ID gốc làm keys; insertion dùng held key và khoảng trống, quicksort phát frame tại từng swap không tầm thường. Đây là chuyển động theo snapshot của simulator, không phải thực thi Go.

## Select dùng chung toàn hệ thống

`src/lib/ui/select.ts` cung cấp `enhanceSelect(nativeSelect, {label, compact?, searchPlaceholder?, showLabel?})`, trả `sync`, `close`, `destroy`. Giữ contract value/change của native select; sau khi gán value bằng code gọi sync. Preset/tốc độ visualization và bộ lọc trang problem-solving đều dùng cùng module và CSS `.ui-select*` trong global.css.

Menu portal vào body nên không bị card overflow cắt; toàn bộ màu lấy token root theme, gồm menu/options/search/focus/selected. Có Escape, Arrow/Home/End, typeahead, Enter/Space chọn, click ngoài và cleanup. Search tùy chọn cho danh sách dài. SSR/no-JS giữ native select; custom button/menu chỉ tạo khi JS chạy. Không viết thêm dropdown riêng cho mỗi tính năng.
