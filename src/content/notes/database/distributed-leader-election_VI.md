---
title: "Leader election: Bully, Invitation và Ring"
category: "Database"
description: "Theo từng bước các thuật toán bầu leader trong Database Internals và hiểu giới hạn khi mạng bị chia cắt."
updated: 2026-10-17
translationKey: "database/distributed-leader-election"
---

Giả sử cụm có các process mang ID từ 1 đến 6 và process 6 đang làm leader. Khi 6 ngừng phản hồi, một thành viên cần khởi động vòng bầu mới. Nhưng “không phản hồi” chỉ là suspicion từ failure detector. Các thuật toán dưới đây mô tả cách nhóm process chọn và thông báo leader theo membership mà chúng đang thấy; chúng không tự giải quyết được chuyện hai nhóm bị partition cùng bầu riêng.

## Trước khi bầu: leader khác distributed lock

Leader có vai trò điều phối được nhiều thành viên biết đến và thường giữ vai trò cho tới khi lỗi hoặc bị thay thế. Distributed lock cấp quyền vào một vùng tới hạn; những process khác không nhất thiết phải biết ai đang giữ lock, miễn là quyền được thu hồi để hệ thống tiếp tục.

Một hệ thống leader có thể giảm trao đổi peer-to-peer nhưng tạo bottleneck. Có thể chia dữ liệu thành nhiều replica set, mỗi set có leader riêng. Dù vậy, một cuộc bầu thành công theo góc nhìn cục bộ chưa chứng minh chỉ có một leader trên toàn cụm.

## Bully: process có rank cao nhất thắng

Bully giả định mỗi process có ID duy nhất và các process có thể gửi message tới process có ID cao hơn hoặc thấp hơn. Process phát hiện leader không phản hồi gửi `ELECTION` tới các process có ID cao hơn nó.

Theo ví dụ 1–6, leader 6 dừng và process 3 khởi tạo:

1. Process 3 gửi `ELECTION` tới 4, 5 và 6.
2. Process 4 và 5 trả `ALIVE`; process 6 không trả lời.
3. Process 3 không tự xưng leader vì đã có process cao hơn đang sống. Nó chuyển quyền khởi động vòng tiếp theo cho process cao nhất đã phản hồi là 5.
4. Process 5 hỏi các process cao hơn nó. Không ai phản hồi, nên 5 thông báo `COORDINATOR` cho các process thấp hơn.

Nếu process 5 cũng chết giữa các bước, 4 có thể tiếp tục cuộc bầu. Một process có ID thấp có thể tạo nhiều message khi phải lần lượt đánh thức các process cao hơn. Nhiều process cùng phát hiện timeout cũng có thể bắt đầu election đồng thời; các vòng chồng lấp cần bỏ qua thông báo cũ và cuối cùng hội tụ theo rank nếu membership và kết nối thỏa giả định.

Biến thể **next-in-line** lưu trước danh sách dự phòng, chẳng hạn leader 6 ghi `{5, 4}`. Khi 6 mất, process 3 hỏi 5 trước; nếu 5 còn sống, nó có thể công bố mình nhanh hơn một vòng Bully đầy đủ. Danh sách chỉ giúp khi còn đúng: nếu 5 đã chết hoặc node có trạng thái mới hơn, cần chuyển tiếp và xác minh epoch để không công bố leader cũ.

Một tối ưu **candidate/ordinary** chỉ cho một tập candidate được trở thành leader. Process ordinary phát hiện lỗi hỏi các candidate, chọn candidate cao nhất còn sống rồi thông báo kết quả. Tiebreaker `δ` có thể trì hoãn process theo rank để giảm nhiều process cùng khởi động, với giả định độ trễ được chọn hợp lý so với thời gian message. Tối ưu này giảm số bên cạnh tranh; nó vẫn cần xử lý timeout và membership không đồng nhất.

## Invitation: hợp nhất các nhóm

Invitation bắt đầu từ nhiều nhóm nhỏ, mỗi nhóm có một leader. Leader gửi lời mời process bên ngoài nhóm tham gia. Nếu lời mời tới một leader khác, hai nhóm trao đổi thông tin và hợp nhất; thành viên được thông báo leader của nhóm lớn hơn hoặc leader được chọn theo quy tắc của hệ thống.

Ví dụ, nhóm `{1,2}` do 1 dẫn và nhóm `{3,4}` do 3 dẫn. Leader 1 liên hệ 3; hai nhóm hợp thành `{1,2,3,4}` và các thành viên nhóm 3 được cập nhật leader mới. Cách này xây nhóm dần, không phải chạy lại một election toàn cục từ đầu mỗi khi hai nhóm gặp nhau. Chọn leader của nhóm lớn hơn có thể giảm số thông báo vì chỉ nhóm nhỏ cần cập nhật.

Nhiều leader cùng tồn tại là trạng thái bình thường trong lúc các nhóm chưa hợp nhất. Nếu partition kéo dài, chúng có thể tiếp tục điều phối riêng. Khi kết nối trở lại, merge cần quy tắc xử lý công việc đã nhận dưới hai leader; thông báo đổi tên leader không thể tự hoàn tác các ghi xung đột.

## Ring: đi hết vòng rồi công bố kết quả

Trong ring election, mỗi process biết predecessor và successor. Process khởi động bầu chọn gửi message cho successor. Nếu successor không phản hồi, nó bỏ qua node đó và thử node tiếp theo. Mỗi node sống thêm ID của mình vào tập đã đi qua rồi chuyển message tiếp.

Ví dụ ring `[1 → 2 → 3 → 4 → 5 → 6 → 1]`, 6 đã hỏng và 3 bắt đầu. Message đi qua 4, 5; 5 không gọi được 6 nên chuyển tới 1; rồi 1 và 2 chuyển tiếp. Khi message quay lại 3, tập node đã thấy là `{1,2,3,4,5}`. Node có rank cao nhất là 5, vì vậy 3 bắt đầu một lượt thông báo leader 5 quanh vòng.

Có thể chỉ mang giá trị lớn nhất đã thấy thay vì cả tập ID để giảm kích thước message. Vì phép `max` có tính kết hợp và giao hoán, mỗi bước chỉ cần giữ ID cao nhất; sau khi xác định winner, vẫn cần lan thông báo kết quả. Một vòng election mất tỷ lệ với số node trong ring; lượt thông báo tạo thêm một vòng. Link hỏng hoặc membership thay đổi có thể làm traversal không khép vòng nếu topology không được sửa đúng.

## Split brain và giới hạn an toàn

Nếu mạng chia thành hai partition, mỗi phía có thể tin rằng leader cũ đã chết và elect người khác. Bully có thể chọn ID cao nhất riêng trong mỗi phía; Invitation có thể giữ hai nhóm riêng; Ring có thể tạo hai vòng cục bộ. Các thuật toán cơ bản trên không có quorum chung để ngăn điều đó.

Ngay cả sau khi một leader mới được chọn, node cũ có thể hồi phục mà chưa biết mình đã mất quyền. Hệ thống ghi an toàn dùng epoch/fencing token tăng đơn điệu và yêu cầu storage kiểm tra token ở từng thao tác. Chỉ một majority có quyền cấp epoch mới trong các giao thức quorum; node cũ mang epoch thấp hơn sẽ bị từ chối.

Đây là lý do leader election không đồng nghĩa với replicated-log consensus. Raft và Paxos dùng leader để điều phối, nhưng thêm quorum, term/ballot và quy tắc log nhằm đảm bảo replica thống nhất lệnh nào đã được chấp nhận. Nếu yêu cầu là “không bao giờ có hai người ghi cùng lúc”, cần chứng minh quyền ghi ở data plane, không chỉ dựa vào thông báo `I am leader`.

## Election tạo cơ hội tiến triển; consensus giữ quyết định an toàn

Một thuật toán election thường hướng tới **liveness**: phần lớn thời gian cụm có coordinator và sau lỗi cuối cùng chọn được người mới. Nhưng nếu leader được chọn từ membership cục bộ, thuật toán có thể không đảm bảo **safety** là chỉ có duy nhất một leader đang được mọi nơi công nhận. Hai partition có thể tạm thời chạy hai leader để mỗi bên vẫn tiến triển; khi chúng gặp lại, protocol phải phát hiện term cũ và giải quyết lịch sử cạnh tranh. Trong Paxos, leader/proposer cạnh tranh nhưng quorum và rule nhận value cũ ngăn hai giá trị mâu thuẫn cùng được chọn. Trong Raft, term mới hơn cho leader biết vai trò của mình đã stale và phải bước xuống.

Một **stable leader election** dùng các round và failure detector dựa trên timeout để duy trì cùng một leader miễn là process đó còn chạy và còn truy cập được. Điều kiện “còn truy cập được” quan trọng: mạng chậm hoặc partition có thể khiến một nhóm nghi ngờ leader, dù process ấy vẫn hoạt động với nhóm khác. Vì thế stable election giúp giảm đổi leader thường xuyên khi giả định đúng, nhưng không biến timeout thành bằng chứng crash hay thay thế quorum/fencing.

## Chọn mô hình nào để học hoặc triển khai?

| Cách bầu | Hợp khi | Chi phí hoặc rủi ro nổi bật |
| --- | --- | --- |
| Bully | Membership tương đối ổn định, ID/rank rõ và có thể liên lạc trực tiếp | Nhiều message khi nhiều node tranh bầu; rank không thay thế quorum |
| Next-in-line | Có danh sách dự phòng được cập nhật cùng leader | Candidate trong danh sách có thể đã chết hoặc stale |
| Candidate/ordinary | Muốn giới hạn số process được quyền thắng | Candidate set và tiebreaker cũng cần membership thống nhất |
| Invitation | Muốn ghép các nhóm đang tồn tại dần | Có thể có nhiều leader trước khi merge; cần xử lý xung đột khi nhập nhóm |
| Ring | Topology vòng đã biết và có thể bỏ qua node không phản hồi | Election và thông báo đi qua vòng; partition có thể tạo nhiều winner |

Trong hệ thống thực tế, ưu tiên dùng election nằm trong một consensus protocol đã xác định safety properties. Các thuật toán kinh điển vẫn hữu ích để hiểu chi phí message, vai trò của rank, topology và sự khác nhau giữa chọn người điều phối với bảo đảm duy nhất.

## Tự kiểm tra

**Trong Bully, vì sao process 3 không tự công bố leader sau khi 6 timeout?** Vì 4 hoặc 5 có thể còn sống và rank cao hơn; 3 chuyển việc bầu tiếp cho process cao nhất đã phản hồi.

**Ring cần làm gì sau khi tìm được ID lớn nhất?** Lan kết quả quanh ring để các thành viên biết leader mới; tìm winner và thông báo là hai lượt logic riêng.

**Hai partition đều công bố leader thì điều gì còn thiếu?** Một quy tắc đồng thuận/quorum và fencing ở nơi nhận thao tác, để hai bên không cùng có quyền ghi hợp lệ.

*Database Internals*, chương 10. Các thuật toán được trình bày với giả định membership/topology của chúng; split brain và việc phải kết hợp election với failure detection là giới hạn cốt lõi của chương.
