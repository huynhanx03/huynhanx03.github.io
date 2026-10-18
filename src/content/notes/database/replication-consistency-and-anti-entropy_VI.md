---
title: "Replication, consistency và chống lệch dữ liệu"
category: "Database"
description: "So sánh các bảo đảm đọc/ghi của replica, rồi theo dõi cách read repair, hinted handoff, Merkle tree và gossip giúp phát hiện và sửa dữ liệu lệch."
updated: 2026-10-17
translationKey: "database/replication-consistency-and-anti-entropy"
---

Một ứng dụng ghi `status='paid'` vào primary rồi đọc từ replica gần nhất. Replica có thể chưa nhận thay đổi nên ứng dụng thấy `pending`. Dữ liệu tồn tại ở nhiều node không tự nói cho ta biết một lần ghi được xác nhận khi nào, lần đọc nào phải thấy nó, hay hai bản sao sẽ hòa giải ra sao.

## Replication sao chép thao tác hoặc trạng thái

Replica có thể nhận log thao tác từ leader, nhận thay đổi theo row, hoặc áp dụng một snapshot rồi theo tiếp luồng thay đổi. Đồng bộ có thể synchronous hoặc asynchronous; topology có thể leader-follower hay multi-leader. Mỗi lựa chọn tác động tới latency, write availability, failover và nguy cơ mất acknowledged write.

Với replication bất đồng bộ, primary có thể trả lời client trước khi replica ghi thay đổi. Nếu primary hỏng trước khi replica nhận, lần ghi đã được xác nhận có thể mất. Đồng bộ chặt hơn có thể chờ thêm node hoặc quorum, tăng latency và làm ghi dừng khi không đủ replica. Không có topology nào vừa bỏ qua mọi độ trễ vừa đảm bảo mọi replica luôn có cùng dữ liệu trong lúc mạng lỗi.

## Consistency mô tả điều client được phép quan sát

**Linearizability** yêu cầu thao tác nhìn như thể xảy ra tại một thời điểm giữa lời gọi và phản hồi, đồng thời giữ thứ tự thực tế của các thao tác không chồng lấn. Đây là bảo đảm mạnh cho một đối tượng/lịch thao tác nhưng cần phối hợp giữa node.

**Sequential consistency** yêu cầu mọi client thấy cùng một thứ tự toàn cục phù hợp với thứ tự thao tác của từng client, nhưng không nhất thiết khớp thời gian thực giữa các client.

**Causal consistency** giữ thứ tự nhân quả: nếu thao tác B phụ thuộc vào A, người đọc không nên thấy B mà chưa thấy A. Các thao tác độc lập có thể quan sát theo thứ tự khác nhau.

**Eventual consistency** nói rằng nếu không còn cập nhật mới và hệ thống tiếp tục trao đổi, replica cuối cùng sẽ hội tụ. Nó không tự chỉ ra người đọc thấy giá trị cũ trong bao lâu, cập nhật đồng thời được giải quyết thế nào, hay có mất update hay không.

Session guarantees như read-your-writes, monotonic reads và monotonic writes giúp một client có hành vi nhất quán hơn dù replica chưa hội tụ toàn cục. Tính nhất quán tunable cho phép chọn số replica cần phản hồi cho read/write; điều đó chỉ tạo bảo đảm đã định nghĩa theo protocol, không thay cho việc hiểu quorum overlap, topology và failover.

## Dùng CAP với phạm vi chính xác

CAP nói trong khi xảy ra network partition, hệ thống phải đánh đổi giữa một dạng consistency mạnh và availability theo định nghĩa của hệ thống. Mạng partition không phải công tắc cấu hình xuất hiện lúc khởi động; nó là lỗi làm các node không liên lạc được. CAP không kết luận rằng database bình thường chỉ có thể chọn hai trong ba thuộc tính bất kỳ, và cũng không thay thế phân tích latency, durability hay cách phục hồi.

Nên hỏi cụ thể: khi hai vùng không liên lạc, bên nào nhận write? Đọc có thể cũ không? Write ở thiểu số có được giữ sau failover không? Có thể trả lỗi thay vì treo không? Mỗi câu trả lời cần được kiểm tra theo giao thức và cấu hình.

## Phiên bản và merge khi nhiều bản sao ghi

Vector clock hoặc version vector ghi lại quan hệ nhân quả giữa các phiên bản. Nếu hai phiên bản có quan hệ thứ tự, hệ thống có thể chọn bản mới theo quy tắc. Nếu chúng concurrent, cần conflict resolution như last-write-wins, merge theo nghiệp vụ hoặc giữ cả hai cho ứng dụng quyết định. Đồng hồ tường không phải lúc nào cũng là thứ tự đáng tin cậy nếu lệch hoặc trùng timestamp.

CRDT (conflict-free replicated data type) thiết kế operation/state sao cho các thay đổi hợp lệ có thể merge theo toán tử thỏa tính chất cần thiết. Đây không phải cách merge tùy tiện mọi dữ liệu: mô hình phải phù hợp với nghiệp vụ, có thể phải trả chi phí metadata, và không phải quy tắc cập nhật nào cũng biểu diễn được.

Witness replica có thể tham gia xác nhận quorum hoặc lưu metadata nhưng không giữ bản dữ liệu đầy đủ. Nó giúp một số quyết định membership/consensus, nhưng không thể phục vụ read data mà nó không có.

## Anti-entropy tìm phần replica bị lệch

**Read repair** phát hiện khác biệt khi một lần đọc hỏi nhiều replica và sửa replica cũ theo chính sách hệ thống. Nó hiệu quả khi key được đọc, nhưng key ít truy cập có thể lệch lâu.

**Digest read** so hash/version tóm tắt trước khi tải toàn bộ value. Nếu digest khác, hệ thống trao đổi thêm dữ liệu để tìm khác biệt. **Merkle tree** chia hash theo phạm vi key; hai node đi xuống những nhánh khác nhau để xác định vùng lệch thay vì so toàn bộ dataset.

**Hinted handoff** lưu tạm update cho replica đang vắng mặt rồi gửi lại khi replica hồi phục. Hint giúp giảm thời gian mất update nhưng cần expiry, dung lượng và xử lý trường hợp replica hồi phục từ snapshot cũ.

**Gossip** trao đổi trạng thái theo các peer được chọn để lan truyền membership, version hoặc thông tin health. Bitmap version vector có thể tóm tắt nhiều version trong một biểu diễn nhỏ khi node và range được đánh số phù hợp; nó tiết kiệm trao đổi nhưng phải quản lý rollover, membership change và metadata.

Anti-entropy chỉ chỉ ra “bản này khác bản kia”. Để sửa an toàn, hệ thống cần version order hoặc merge rule xác định đúng bản/giá trị. Nếu policy là last-write-wins, đồng hồ sai có thể khiến ghi hợp lệ bị ghi đè. Nếu giữ conflicts, ứng dụng phải xử lý chúng.

## Đọc lại từ Redis để thấy bảo đảm cụ thể

Redis Open Source replication là bất đồng bộ; `WAIT` có thể yêu cầu một số replica xác nhận đã nhận dữ liệu nhưng không biến replication thành consensus hay bảo đảm mọi write không mất. [Tài liệu replication của Redis](https://redis.io/docs/latest/operate/oss_and_stack/management/replication/) nêu các chi tiết này. Redis Cluster dùng asynchronous replication và có cửa sổ mất acknowledged write; [cluster specification](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/) trình bày rõ tradeoff. Các sản phẩm Redis managed có thêm lựa chọn riêng, nên phải phân biệt docs Redis Open Source với docs Redis Software/Cloud.

## Tự kiểm tra

**Eventual consistency có nghĩa mỗi write sẽ luôn được giữ không?** Không. Hội tụ sau khi ngừng update không tự đảm bảo write không mất khi crash hoặc failover.

**Read repair có sửa mọi key bị lệch ngay không?** Không. Nó chỉ có cơ hội sửa key được đọc và phụ thuộc replica được hỏi cùng repair policy.

**Nếu hai update concurrent, chọn timestamp mới nhất có luôn đúng không?** Không. Đồng hồ có thể lệch và thứ tự thời gian không nhất thiết phản ánh quy tắc nghiệp vụ. Cần chọn conflict rule theo dữ liệu.

Nguồn đọc: *Database Internals*, chương 11–12; tài liệu chính thức về replication của từng hệ sản phẩm.
