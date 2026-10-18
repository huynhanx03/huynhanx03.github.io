---
title: "Database phân tích và chạy một truy vấn như thế nào?"
category: "Database"
description: "Theo truy vấn từ câu SQL đến execution plan, rồi hiểu thống kê, access path, join và sort khiến cùng một câu lệnh chạy nhanh hay chậm."
updated: 2026-10-17
translationKey: "database/query-processing-and-planning"
---

Hai câu SQL có thể trả cùng kết quả nhưng dùng cách làm khác nhau. Để nối `orders` với `customers`, database có thể lặp qua từng đơn rồi tra khách bằng index, dựng hash table trong RAM, hoặc sắp hai đầu vào rồi merge. Optimizer phải chọn một kế hoạch từ số liệu ước lượng; hiểu lựa chọn đó giúp ta tìm nguyên nhân thay vì thử sửa truy vấn theo cảm giác.

## Từ câu SQL tới kế hoạch thực thi

Một truy vấn thường đi qua các bước khái niệm sau:

1. **Parse**: kiểm tra cú pháp và tạo cấu trúc biểu diễn câu lệnh.
2. **Transform/bind**: tìm bảng, cột, kiểu, hàm, quyền và biến tên thành tham chiếu đã xác định.
3. **Rewrite**: áp dụng các quy tắc như view expansion hoặc biến đổi tương đương.
4. **Plan**: tạo các cách quét, join, sort, aggregate khả thi rồi ước lượng chi phí.
5. **Execute**: chạy plan, lấy page từ cache/storage, kết hợp dòng và trả kết quả qua protocol.

Ranh giới và tên gọi khác nhau theo sản phẩm. Prepared statement có thể phân tích và lập kế hoạch ở các thời điểm khác nhau; một số database chọn custom plan theo parameter, số khác tái sử dụng kế hoạch chung. Vì vậy plan trong lần chạy đầu không phải lúc nào cũng đại diện cho mọi giá trị đầu vào.

## Optimizer không đo thời gian, nó ước lượng chi phí

Optimizer so sánh kế hoạch dựa trên ước lượng số dòng, chi phí CPU, truy cập page, sort, network hoặc memory. Các con số thường là đơn vị chi phí tương đối để chọn kế hoạch, không phải số mili giây chắc chắn.

Để ước lượng số dòng, database cần thống kê: số giá trị phân biệt, giá trị xuất hiện nhiều, histogram, tỷ lệ `NULL`, độ rộng trung bình của cột, tương quan giữa thứ tự vật lý và giá trị, hoặc phụ thuộc giữa nhiều cột. `ANALYZE`/auto statistics cập nhật một phần dữ liệu này. Thống kê mẫu có thể bỏ sót phân bố lệch hoặc tương quan đa cột.

Giả sử `status='pending'` chiếm 1% bảng nhưng phần lớn đơn gần đây cũng pending. Ước lượng từng điều kiện độc lập có thể dự đoán sai kết quả của cả hai điều kiện cùng lúc. PostgreSQL có extended statistics cho một số quan hệ đa cột; các engine khác có cách thu thập và dùng thống kê riêng. Khi ước lượng lệch mạnh, optimizer có thể chọn sai join hoặc access path.

## Access path: quét bảng hay đi theo index?

**Sequential scan** đọc phần lớn page của bảng theo thứ tự lưu trữ. Nếu truy vấn cần phần lớn dòng, một lần quét tuần tự có thể rẻ hơn việc tra index rồi nhảy tới nhiều page rời rạc.

**Index scan** tìm các khóa khớp qua index rồi lấy row tương ứng. Nó phù hợp hơn khi điều kiện chọn ít dòng, index có đúng thứ tự và chi phí truy cập heap/table còn hợp lý. **Index-only scan** có thể trả dữ liệu từ index nếu index chứa đủ cột và engine xác minh được tính hiển thị mà không cần heap. **Bitmap scan** có thể gom vị trí dòng từ một hoặc nhiều index rồi đọc heap theo page để giảm truy cập rời rạc.

Parallel scan chia page giữa worker, nhưng cần chi phí phối hợp và chỉ có ích nếu truy vấn đủ lớn, worker sẵn có, và phần còn lại của plan cho phép song song. Hàm, khóa, protocol hoặc operation cụ thể có thể hạn chế parallelism.

## Join: nested loop, hash hay merge?

Với **nested-loop join**, database lấy mỗi dòng bên ngoài rồi tìm dòng khớp ở phía trong. Nếu outer nhỏ và inner có index phù hợp, cách này hiệu quả. Nếu outer lớn và mỗi vòng lại quét inner, chi phí có thể bùng lên. Một cache nhỏ như memoization có thể giúp khi nhiều outer row lặp cùng giá trị join.

Với **hash join**, database dựng hash table từ một phía rồi dò các dòng phía kia. Khi hash table vừa memory grant, một-pass join thường gọn. Nếu không vừa, engine có thể chia dữ liệu thành partition và spill tạm ra đĩa; multi-pass hoặc spill lớn làm truy vấn chậm và tạo I/O tạm.

Với **merge join**, hai đầu vào được sắp theo key join rồi duyệt đồng thời. Nếu đã có thứ tự phù hợp từ index hoặc bước trước, tránh được sort; nếu chưa, sort có thể là phần chi phí lớn. Merge join hữu ích cho dữ liệu lớn đã có thứ tự tương thích.

Không có join algorithm tốt nhất luôn luôn. Cardinality, skew, memory, index, thứ tự đầu vào và khả năng spill quyết định lựa chọn. Buộc join bằng hint có thể che lỗi thống kê hôm nay nhưng gây hại khi dữ liệu đổi.

## Sort, aggregate và giới hạn bộ nhớ

Sort nhỏ có thể dùng quicksort trong bộ nhớ; `ORDER BY ... LIMIT n` có thể giữ top-N bằng heap thay vì sắp toàn bộ dữ liệu. Nếu input vượt memory, engine tạo các run đã sắp ra file tạm rồi merge — external sort. Incremental sort tận dụng tiền tố đã có thứ tự để chỉ sắp phần còn lại.

`GROUP BY` và `DISTINCT` có thể dùng hash aggregate hoặc sort rồi gom nhóm. Hash aggregate cần bộ nhớ theo số nhóm; sort cần bộ nhớ theo lượng input và có thể spill. Một truy vấn “chỉ đếm” vẫn có thể đọc rất nhiều page nếu không có metadata hoặc index phù hợp.

Memory grant không phải tài nguyên vô hạn riêng cho một query. Quá thấp gây spill; quá cao cho nhiều query đồng thời có thể gây áp lực RAM. Xem execution plan cùng thông tin actual rows, loops, buffers và temporary I/O của đúng hệ quản trị.

## Đọc plan bằng cách so estimate với actual

Khi điều tra truy vấn chậm:

1. Ghi lại query, parameter, transaction context và thời điểm đo.
2. Lấy plan bằng công cụ của database; nếu có thể, so estimated rows với actual rows.
3. Tìm nút đầu tiên estimate lệch nhiều: lỗi thường bắt đầu ở đó rồi truyền lên join và sort phía trên.
4. Kiểm tra số page/buffer, loops, thời gian chờ, spill, lock và I/O; đừng chỉ nhìn tổng thời gian.
5. Thay một yếu tố, đo lại trên workload đại diện và giữ lại phương án có bằng chứng.

PostgreSQL giải thích `EXPLAIN` và `EXPLAIN ANALYZE` trong [Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html). MySQL có [`EXPLAIN`](https://dev.mysql.com/doc/refman/8.4/en/explain.html) với các định dạng và thông tin phụ thuộc phiên bản. `EXPLAIN ANALYZE` thực sự chạy câu lệnh trong PostgreSQL; với truy vấn ghi hoặc hàm có side effect, cần hiểu tác động trước khi dùng.

## Truy vấn chậm không đồng nghĩa optimizer kém

Optimizer có thể chọn kế hoạch hợp lý theo thống kê mà vẫn chậm vì ứng dụng yêu cầu quá nhiều dòng, lấy thừa cột, gửi quá nhiều round trip, giữ transaction lâu, thiếu index phù hợp, storage bị nghẽn hoặc lock chặn. Query plan là một phần của chẩn đoán, không phải toàn bộ hệ thống.

Một phép đo đúng cần workload tương tự production, warm/cold cache được ghi rõ, dữ liệu đại diện, concurrency thực tế và phân bố latency. Đừng so một lần chạy nhỏ với benchmark dài rồi kết luận chung.

## Tự kiểm tra

**Vì sao sequential scan đôi khi nhanh hơn index scan?** Vì đọc tuần tự một vùng lớn có thể rẻ hơn nhảy tới nhiều page rời rạc khi phần lớn dòng cần trả về.

**Plan có estimated rows thấp hơn actual rows hàng nghìn lần gợi ý điều gì?** Có thể thống kê lỗi thời, dữ liệu lệch, tương quan không được mô hình hóa, hoặc điều kiện parameter cụ thể làm estimate sai. Hãy tìm nút lệch đầu tiên.

**Có nên thêm index ngay khi thấy full table scan?** Chưa. Nếu truy vấn cần phần lớn bảng, full scan có thể là kế hoạch tốt. Xét selectivity, page access, workload ghi và plan thực tế.

Nguồn đọc: *High Performance MySQL*, chương 6; *PostgreSQL 14 Internals*, phần IV; tài liệu `EXPLAIN` của PostgreSQL và MySQL.
