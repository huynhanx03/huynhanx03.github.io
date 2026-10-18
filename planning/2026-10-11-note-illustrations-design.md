# Thiết kế hệ thống minh họa tương tác cho notes

Trạng thái: bản thiết kế để duyệt trước khi triển khai.

## Mục tiêu đã thống nhất

Người đọc sửa code Go, nhập stdin và bấm Chạy ngay trong bài viết để nhận output thực tế. Cùng khối đó có minh họa thuật toán mẫu từng bước. Khung dùng lại cho các notes kỹ thuật như Go, concurrency và workflow. Giai đoạn đầu có ba playground: binary search, insertion sort và BFS.

Website hiện dùng Astro, Markdown thông thường và xuất trang tĩnh. Giao diện và mô phỏng chạy trong trình duyệt bằng TypeScript. Code Go chỉnh sửa được gửi tới runner riêng, nhận stdin thật và trả stdout/stderr.

## Kiến trúc playground tái sử dụng

### Nền tảng visualization dùng chung cho technical notes

Yêu cầu bổ sung: DSA là nội dung đầu tiên, không phải ranh giới của hệ thống. Cùng khung phải mô phỏng được producer → Kafka → consumer → database và giao tiếp giữa các service. Đây là mô phỏng giáo dục, không kết nối cluster Kafka, database hoặc service thật.

Hợp đồng nền tảng không bắt buộc mảng, code hoặc ngôn ngữ lập trình. Một `ScenarioDefinition<Input, State, Event>` khai báo ID, tiêu đề, presets, input schema, initial state, bộ tạo event, reducer thuần và renderer. `ExecutionAdapter` chạy code là capability tùy chọn của một note, độc lập với visualization.

- **Scenario:** diễn tả hành vi và giả định của chủ đề, không chứa DOM hoặc timer. Event có ID, thời điểm logic, lời giải thích, các entity liên quan và parent event khi có quan hệ nhân quả. Kafka có publish/delivery/ack/retry; DSA có compare/move-bound/finish.
- **Reducer:** `reduce(state, event) → nextState` xác định trạng thái tại mỗi điểm dừng. Event cùng thời điểm được áp dụng theo thứ tự khai báo ổn định. Với concurrency, nhóm event cùng thời điểm được trình bày là cùng một tick; không diễn giải thứ tự hiển thị thành thứ tự nhân quả.
- **Timeline:** compiler tạo frames snapshot từ events. Thời điểm logic thuộc scenario, tốc độ playback chỉ đổi thời gian trình bày. Trace/frame cap bản đầu là 2.048; vượt cap báo lỗi có thể hiểu, không cắt trace mà vẫn tuyên bố hoàn tất.
- **Player:** Manual (tiến/lùi), Play/Pause, scrub, speed, reset và Loop. Mặc định manual, loop tắt. Play hết trace dừng; bật loop thì nghỉ ngắn rồi trở về state đầu của cùng trace. Loop không tạo event mới, không tích lũy queue hoặc gửi request chạy code. Frame đầu vòng mới khôi phục toàn bộ state và counters.
- **Renderer:** chỉ nhận snapshot + context (active entities, progress giữa hai tick, reduced motion); không tự chạy đồng hồ hay thay đổi scenario state. Chuyển động packet có thể nội suy giữa checkpoints, nhưng dữ liệu và kết quả không phụ thuộc animation.
- **Note embed:** đăng ký scenario và vị trí trong Markdown. Một note có nhiều instance; mỗi instance có clock và state độc lập. Pause khi tab ẩn, dọn timers/observers khi tháo instance, không tự chạy khi đọc tới khối.

Renderer bản đầu phục vụ mảng DSA. Các primitive tái sử dụng sau gồm node/edge, message token, queue/list và bảng state; renderer chuyên biệt được ghép từ các primitive này. Không xây một DSL vẽ tổng quát hoặc renderer khổng lồ với các nhánh theo tên thuật toán.

Kịch bản Kafka minh họa hợp đồng (chưa triển khai trong bản thử): API publish message M1, broker lưu, consumer nhận, database ghi, consumer ack. State gồm message IDs, queue, consumer status và các record; retry là event tiếp theo có liên hệ với delivery thất bại. Preset happy-path, consumer chậm hoặc lỗi trước ack. Nhãn giải thích rõ giả định ack/retry của từng preset, không hứa mô phỏng toàn bộ semantics của Kafka.

Nội dung từng tick ghi “ai làm gì, state nào đổi, vì sao”; chi tiết kỹ thuật có thể mở thêm. Màu đi cùng nhãn; manual hiển thị kết quả ngay và hỗ trợ bàn phím. Reduced motion bỏ animation di chuyển nhưng giữ mọi checkpoint.

Kiểm tra hợp đồng khi xây nền tảng: rewind khôi phục snapshot, loop không tích lũy state, speed không đổi output, cùng input/seed tạo cùng trace, các instance không chia sẻ clock, event concurrency không tạo quan hệ nhân quả giả và visualization không yêu cầu runner Go.

### Preview được yêu cầu

Trước khi triển khai cả nền tảng, người dùng yêu cầu xem thử một thuật toán để đánh giá giao diện. Bản preview Binary Search là mẫu tương tác độc lập để duyệt bố cục trong ngữ cảnh đọc note; chưa nhúng vào repo và chưa có runner Go. Không coi preview là đã hoàn thành nền tảng hoặc đã chạy Go thật.

Chọn UI chung + execution adapter + visualization adapter. Nhúng iframe dịch vụ khác nhanh hơn nhưng khó thống nhất input và giao diện. Xây IDE/compiler đa ngôn ngữ ngay làm phạm vi lớn hơn cần thiết. Bản đầu dùng một file Go và hợp đồng API có thể mở rộng.

- **Nội dung:** Markdown khai báo ID ví dụ; registry chứa source Go hoàn chỉnh, stdin mẫu, expected output và visualizer tùy chọn. Source mẫu nằm trong một file dùng chung cho editor và phần giải thích code để tránh hai bản lệch nhau.
- **Playground shell:** editor code/stdin, presets, Chạy, Hủy chờ, Khôi phục, output và trạng thái. Không chứa logic thuật toán hoặc URL runtime cụ thể. Bản đầu dùng textarea có label và font mono, chưa thêm IDE nặng.
- **Execution adapter:** `execute(request, abortSignal)` nhận language/source/stdin, trả status/stdout/stderr/diagnostics/exitCode và durationMs nếu có. Status gồm success, compile-error, runtime-error, timeout, unavailable, rejected. Ghi rõ phạm vi thời gian đo; thời gian HTTP không phải thời gian thuật toán.
- **Visualization adapter:** parse input mẫu, tạo trace và render; có thể vắng mặt ở các notes kỹ thuật. Player chỉ quản lý playback.
- **Runner service:** API riêng, không phụ thuộc Astro/notes/thuật toán; `POST /v1/run`, hỗ trợ Go một file. Website nhận URL qua `PUBLIC_PLAYGROUND_RUNNER_URL`.

Definition khai báo language và capabilities. Thêm runtime hoặc visualizer mới qua registry, không sửa player và không sửa cách nhúng của các notes cũ. Không thêm cơ chế plugin tải code từ URL tùy ý.

Tab **Chạy code** chạy đúng source hiện tại. Tab **Minh họa thuật toán mẫu** dùng source mẫu và input đã parse, không suy diễn trace từ code người đọc sửa. Highlight code trong tab minh họa luôn chỉ source mẫu.

Mỗi lượt chạy giữ snapshot source/stdin, chặn chạy trùng trong cùng instance; response cũ không được ghi đè lượt mới. Hủy chờ dừng fetch ở client, không hứa dừng execution trên server. Output/diagnostic render như text. Source/stdin không tự lưu vào browser hoặc log. Các instance độc lập.

## Runner local và triển khai public

Bản đầu có runner local trong repo và hướng dẫn khởi động cùng website. Mỗi lượt Go compile/chạy trong container dùng một lần, không mạng, không mount repo hoặc thư mục người dùng. Workspace tạm bị xóa sau lượt chạy. Không chạy code người đọc trực tiếp trên host.

Giới hạn dự kiến được kiểm tra khi triển khai: source 64 KiB, stdin 16 KiB, tổng output 64 KiB, compile 20 giây, execution 3 giây, bộ nhớ 256 MiB, 1 CPU, 64 process, tối đa 2 lượt đồng thời và queue 8 lượt. Container dùng user không đặc quyền, drop capabilities, filesystem nền read-only và workspace tạm giới hạn dung lượng. Pin image và phiên bản Go, kiểm tra compilation thực tế dưới các giới hạn trước khi chốt.

API validate request trước khi chạy, không ghép source vào shell command; timeout dọn cả container. Service dọn lượt chạy kể cả client mất kết nối. Bind loopback, chỉ cho origin dev đã cấu hình. Khi thiếu URL hoặc service lỗi, vẫn xem code/input/expected output và mô phỏng được; UI báo runner chưa kết nối, không hiển thị output mẫu như kết quả vừa chạy.

Public deployment là bước riêng: cần host runner có isolation dành cho code không tin cậy (ví dụ gVisor), rate limit, queue cap và HTTPS. CORS không thay authentication. Runner local không mặc định được bật public. Không tự đăng ký dịch vụ hoặc xuất bản trong công việc này.

Go Playground chính thức cũng compile và chạy code trong sandbox; bản đầu không dựa vào API công khai chưa cấu hình của dịch vụ đó để giả lập stdin. Tham khảo: https://go.dev/play/ và https://pkg.go.dev/golang.org/x/playground/sandbox.

Theo yêu cầu của chủ repo, các thay đổi và tài liệu chỉ lưu tại máy. Không commit, push, tạo PR hoặc xuất bản trong công việc này.

## Luồng của người đọc

Tab Chạy code có source Go chỉnh sửa được, stdin, presets, Chạy và Khôi phục. Hiển thị output thực tế, kể cả output rỗng; expected output của mẫu ghi riêng. Tab minh họa theo luồng dưới đây:

1. Trong bài viết, gặp khối playground ngay sau phần giải thích đang đọc; không chuyển trang.
2. Dữ liệu mẫu và trạng thái đầu đã hiển thị. Có thể chọn ví dụ khác, tạo ngẫu nhiên hoặc nhập dữ liệu.
3. Bấm Áp dụng để kiểm tra input và tạo chuỗi trạng thái mới. Input lỗi hiển thị cạnh trường tương ứng; demo đang có vẫn giữ nguyên.
4. Dùng Tiến, Lùi, Chạy/Tạm dừng, thanh vị trí bước, tốc độ và Bắt đầu lại.
5. Mỗi bước hiển thị trạng thái dữ liệu, các biến, giải thích bằng tiếng Việt và dòng Go tương ứng.
6. Tới bước cuối, output được ghi rõ; trường hợp không tìm thấy hoặc đỉnh không tới được vẫn là kết quả hợp lệ.

Khi người đọc sửa input trong lúc đang chạy, tự tạm dừng; input chỉ tác động đến mô phỏng sau khi Áp dụng. Thay đổi tốc độ không đổi kết quả. Bắt đầu lại trở về frame đầu của input hiện hành, không xóa input.

## Cách nhúng trong Markdown

Một code fence có ngôn ngữ `note-playground` và cấu hình JSON:

````markdown
```note-playground
{"id":"binary-search","preset":"duplicates"}
```
````

Plugin remark kiểm tra cấu hình và đổi fence thành vị trí nhúng có nội dung dự phòng. Tên demo và preset phải có trong registry; JSON sai, ID lạ hoặc preset không tồn tại gây lỗi build có đường dẫn bài và vị trí. Không chèn HTML tùy ý từ cấu hình. Các giá trị cấu hình được escape trước khi đưa vào thuộc tính HTML.

Markdown thường và code fence Go vẫn giữ nguyên cách hiển thị. Mỗi bài có thể chứa nhiều demo; mỗi instance có trạng thái và điều khiển độc lập. Khối demo không được xử lý như code cần sao chép và không được đưa trạng thái runtime vào chỉ mục tìm kiếm.

Trong bản đầu, demo được nhúng vào:

- `searching_VI.md`: binary search / lower bound.
- `elementary-sorting_VI.md`: insertion sort.
- `graph-representation-bfs-dfs_VI.md`: BFS.

## Khung chung và hợp đồng mở rộng

Tách ba trách nhiệm:

- **Logic minh họa:** parse input, tạo các frame bất biến và output; độc lập với DOM và đồng hồ.
- **Player:** quản lý frame hiện tại, chạy/tạm dừng, tiến/lùi, tốc độ, scrub và dọn timer khi instance bị tháo khỏi trang.
- **Renderer:** vẽ view của frame; bản đầu có renderer mảng và đồ thị SVG. Demo kỹ thuật sau này có thể thêm renderer timeline, stack hoặc sơ đồ mà không đổi player.

Một definition gồm ID, tiêu đề/nhãn theo locale, input editor, presets, hàm parse/validate, hàm buildTrace, đoạn Go minh họa và hàm renderView. Một frame gồm view riêng của demo, biến đang quan sát, giải thích, dòng code được đánh dấu và các bộ đếm. Trace gồm danh sách frame và output cuối cùng.

Player chỉ hiểu các trường chung và gọi renderer của definition. Nó không biết binary search, sort hoặc BFS hoạt động thế nào. Các demo mới đăng ký qua một registry có import tĩnh được kiểm soát. Các module demo có thể tải động theo ID để tránh tải tất cả thuật toán cho mỗi bài.

Frame lưu snapshot riêng, không giữ tham chiếu tới mảng sẽ bị thay đổi ở bước sau. Về trước hoặc scrub chỉ chọn snapshot đã có; không chạy lại thuật toán theo một đồng hồ khác. Hàm tạo trace có giới hạn số frame và input nhỏ để không giữ lượng bộ nhớ lớn.

## Ba demo đầu tiên

### Binary search

- Mảng số nguyên đã sắp không giảm, tối đa 32 phần tử; target là số nguyên an toàn của JavaScript.
- Cho phép mảng rỗng và giá trị trùng; input chưa sắp bị từ chối với giải thích rõ.
- Mô phỏng LowerBound trên khoảng `[lo, hi)` đúng theo note hiện có. Output là vị trí biên và trạng thái có/không có target.
- Vẽ các ô, chỉ số, vùng còn xét; đánh dấu lo, hi và mid mà không giả định hi luôn là chỉ số phần tử hợp lệ.
- Hiển thị lo, hi, mid, so sánh hiện tại và số lần so sánh; giải thích lý do bỏ một nửa.
- Preset gồm tìm thấy, không tìm thấy, nhiều giá trị trùng và mảng rỗng.

### Insertion sort

- Mảng số nguyên, tối đa 24 phần tử; hỗ trợ rỗng, số âm và trùng lặp.
- Mỗi phần tử có ID gốc để người đọc quan sát tính ổn định khi khóa bằng nhau.
- Vẽ tiền tố đã sắp, key đang giữ và phần tử đang dịch. Khi key được lấy ra, biểu diễn ô trống rõ ràng để tránh hiểu nhầm mất hoặc nhân đôi dữ liệu.
- Mỗi frame ứng với lấy key, so sánh, dịch hoặc chèn; hiển thị i, j, key và bộ đếm so sánh/ghi.
- Output là mảng đã sắp; các phần tử bằng nhau giữ thứ tự ID gốc.
- Preset gồm đảo ngược, gần sắp, nhiều khóa bằng nhau và mảng rỗng.

### BFS

- Đồ thị vô hướng không trọng số, 1–12 đỉnh đánh số `0..n-1`; tối đa 30 cạnh đơn, source hợp lệ.
- Input số đỉnh, mỗi dòng một cạnh `u v`, và source. Cạnh trùng, tự khuyên hoặc đầu mút ngoài miền được báo lỗi rõ ràng trong phiên bản đầu.
- Bố trí đỉnh cố định trên một vòng tròn SVG để việc đổi bước không làm các nút tự di chuyển.
- Đánh dấu khi đưa vào queue, khớp với note. Vẽ đỉnh đang xử lý, cạnh đang xét, đỉnh đã phát hiện; đồng thời hiển thị queue, dist và parent.
- Thứ tự láng giềng được chuẩn hóa tăng dần để cùng input luôn cho cùng trace.
- Output gồm khoảng cách từ source, parent và thứ tự xử lý. Đỉnh không tới được giữ dist=-1.
- Preset gồm có chu trình, nhiều đường cùng độ dài và đồ thị không liên thông.

## Giao diện và khả năng tiếp cận

Khối minh họa dùng màu, font, border và light/dark theme đang có. Thông tin nổi bật là dữ liệu và giải thích bước hiện tại; các biến/code có thể thu gọn trên mobile. SVG và vùng mảng co theo chiều rộng, dùng cuộn ngang khi cần thay vì làm tràn trang.

Nút có nhãn rõ ràng, thao tác được bằng bàn phím. Thanh bước và tốc độ có label. Màu luôn đi cùng nhãn hoặc ký hiệu để phân biệt trạng thái. Giải thích dùng vùng thông báo nhẹ khi bước thủ công; không đọc liên tục mọi frame khi tự chạy. Nếu bật reduced motion, mặc định xem từng bước và hạn chế chuyển động. Không tự chạy khi mở bài.

Nội dung dự phòng ghi tên demo, dữ liệu mẫu và kết quả mẫu khi JavaScript tắt hoặc tải lỗi. Sau khi module tải được mới thay bằng điều khiển tương tác. Nếu module lỗi, hiển thị thông báo và giữ nội dung dự phòng; không ảnh hưởng phần còn lại của note.

## Phạm vi kỹ thuật dự kiến

- Plugin Markdown trong `src/plugins` và đăng ký tại `astro.config.mjs`.
- Definition, registry, trace và player trong `src/lib/illustrations`.
- Renderer dùng lại cho mảng/đồ thị, cùng phần UI input và playback.
- Khởi tạo khối demo từ trang note; chỉ tải/khởi tạo khi có vị trí nhúng.
- CSS có phạm vi riêng cho minh họa, theo theme hiện tại.
- Thêm fence vào ba notes và tài liệu hướng dẫn tác giả thêm demo mới.

Không cần React/Vue. Có backend runner riêng cho thực thi Go. Visualization chỉ parse input theo schema của thuật toán mẫu; runtime adapter quyết định môi trường chạy code.

## Tiêu chí hoàn thành và kiểm tra

- Ba notes có demo hoạt động với input mẫu và input tự nhập, bao gồm các trường hợp biên đã nêu.
- Chỉnh source Go thực sự thay output. Kiểm tra stdin, compile error, panic, timeout, output cap, unavailable và nhiều instance. Không dùng fake runner để tuyên bố đã chạy Go thật.
- Kiểm tra runner isolation, request validation, cleanup, queue cap và response contract; có hướng dẫn chạy local và ghi rõ public deployment chưa được thực hiện.
- Chạy, tạm dừng, tiến/lùi, scrub, đổi tốc độ và reset hoạt động nhất quán; nhiều instance không tác động lẫn nhau.
- Output của trace đúng với thuật toán tham chiếu; snapshot cũ không bị sửa bởi bước sau.
- Unit test cần thiết cho trace/invariant của ba thuật toán, validation input, và plugin Markdown (cấu hình hợp lệ/sai và escape).
- Kiểm tra typecheck, lint, build và nội dung theo các script hiện có; ghi rõ các lỗi sẵn có nếu gặp.
- Kiểm tra trực tiếp trang note trên desktop/mobile, light/dark, thao tác bàn phím và chế độ reduced motion.
- Hướng dẫn tác giả chỉ rõ cách đăng ký definition, tạo frame và nhúng fence; một demo mới không cần sửa player.

Sau khi bản thiết kế được duyệt, viết kế hoạch triển khai theo từng phần trước khi bắt đầu code sản phẩm.
