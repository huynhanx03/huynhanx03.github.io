---
title: "Quorum, causal consistency và anti-entropy"
category: "Database"
description: "Theo dõi replica nhận write, vector clock, read repair, hinted handoff và Merkle tree để hội tụ dữ liệu."
updated: 2026-10-18
translationKey: "database/distributed-replication-quorums-and-anti-entropy"
---

Replicated database cần quyết định node nào nhận read/write, bao nhiêu replica phải phản hồi và cách tìm/sửa divergence. “Ba replica” tự nó không nói consistency mạnh hay availability; điều quan trọng là quorum, failure model, conflict rule và thao tác repair.

Có ba kiểu truyền tin cần phân biệt. **Broadcast notification** để một coordinator gửi update tới các node; dễ triển khai trong cụm nhỏ, nhưng nguồn gửi và danh sách thành viên trở thành điểm phụ thuộc, và sender với từng recipient phải cùng hoạt động trong một khoảng thời gian. **Pairwise anti-entropy** để các replica định kỳ so và đồng bộ trạng thái. **Cooperative dissemination** để node nhận tin lại chuyển tiếp cho peer khác. Một thiết kế thường tách việc này thành primary delivery nhanh, rồi periodic repair để bù message bị lỡ. Anti-entropy làm giảm độ lệch giữa replica; nó không đòi coordinator ban đầu phải sống suốt đời.

## Quorum và consistency

Với N replica, write quorum W và read quorum R có intersection nếu `R + W > N`; khi kết hợp rule version/leader phù hợp, read có cơ hội thấy write mới. Công thức không tự bảo đảm linearizability: concurrent writes, sloppy quorum, partition, replica state và conflict resolution đều quan trọng.

Linearizable read/write có thứ tự tương thích real time; sequential consistency giữ cùng thứ tự toàn hệ thống nhưng có thể khác real time; causal consistency giữ thứ tự nguyên nhân-hệ quả; eventual consistency yêu cầu replica hội tụ nếu update dừng. Session guarantees như read-your-writes hoặc monotonic reads có thể do client giữ session token/version.

CAP chỉ áp dụng khi partition xảy ra: hệ phải chọn response có thể nhất quán với single-copy semantics hay tiếp tục phục vụ có thể stale/conflict. Bình thường có tradeoff latency/availability/consistency; CAP không phải lời khuyên “chọn hai trong ba” cho mọi kiến trúc.

## Vector clock, conflict và CRDT

Vector clock gắn counter theo replica để xác định happens-before: nếu mọi component của A ≤ B và có ít nhất một nhỏ hơn, A xảy ra trước B. Nếu hai vector incomparable, updates concurrent và cần merge hoặc giữ cả hai phiên bản cho application chọn. Clock có thể tăng kích thước theo membership; pruning/compact metadata có tradeoff.

CRDT thiết kế state/operation sao cho merge associative, commutative, idempotent theo model đã chọn. G-Counter cộng component; PN-Counter tách tăng/giảm; OR-Set cần tag để add/remove concurrent không xóa nhầm. CRDT đổi bài toán conflict thành quy tắc datatype, nhưng không đảm bảo mọi business invariant như “số ghế không âm”.

## Anti-entropy

Read repair phát hiện khác biệt khi đọc và cập nhật replica cũ; hinted handoff giữ tạm write cho node vắng mặt rồi giao lại; digest read so hash/version trước khi tải dữ liệu đầy đủ. Merkle tree chia keyspace thành vùng hash để hai replica tìm vùng khác nhau mà không so toàn bộ dataset. Bitmap version vector tóm tắt các write đã thấy và những sequence còn thiếu, giúp tìm phần log cần trao đổi.

Gossip lan truyền membership/version dần dần. Anti-entropy cần xử lý node lâu ngày offline, tombstone retention, conflict policy và repair bandwidth; nếu xóa tombstone quá sớm, replica cũ có thể hồi sinh data đã xóa. Repair toàn bộ cluster có thể gây I/O/network spike, nên giới hạn throughput và quan sát tiến độ.

## Phạm vi repair và luồng từng cơ chế

Broadcast từ coordinator gửi update tới tất cả thành viên đã biết. Nó nhanh, dễ hiểu ở cluster nhỏ nhưng phụ thuộc node phát và membership đầy đủ. Pairwise anti-entropy cho hai replica định kỳ so trạng thái rồi gửi phần thiếu; cách này tự sửa update bị lỡ nhưng có thể phải đọc/so nhiều dữ liệu. Gossip để mỗi node chọn một số peer và chuyển tiếp tin; nó phân tán và chịu churn tốt hơn, đổi lại có message trùng và thời gian hội tụ xác suất. Nhiều hệ thống dùng broadcast làm primary delivery rồi dùng repair định kỳ để vá phần bị bỏ lỡ.

### Read repair

Coordinator hỏi các replica chứa key/range mà client đang đọc, so version/kết quả rồi gửi phần thiếu về replica cũ. Ví dụ ba bản `cart:42` có version `v8`, `v8`, `v7`: coordinator trả dữ liệu theo version rule và sửa bản `v7`. Nếu sửa đồng bộ trước response, read hiện tại có thể chờ node chậm; nếu sửa nền, response nhanh hơn nhưng một lần đọc sau vẫn có thể thấy stale value. Cơ chế này chỉ kiểm tra key/range được đọc, nên dữ liệu lạnh có thể lệch lâu. Merge iterator có thể ghi nhận chính xác bản ghi nào vắng trong từng input replica để sửa đúng phần thiếu.

Blocking repair giúp **monotonic reads** khi protocol dùng quorum: sau khi client đã đọc một version, các replica thuộc đường đọc được kéo lên ít nhất tới version đó trước khi trả kết quả, nên lần đọc tiếp theo không tụt về giá trị cũ nếu giữa hai lần không có write mới. Nhưng chờ target xác nhận sửa đổi làm read kém sẵn sàng hơn. Với non-quorum read, sửa một tập replica không bảo đảm lần đọc kế tiếp sẽ tới một replica đã sửa.

### Digest read

Coordinator lấy full result từ một replica và chỉ lấy digest/hash từ các bản khác. Hash bằng nhau cho thấy các response có cùng fingerprint; nếu khác, coordinator cần đọc đầy đủ các bản đó để xác định version và repair. Digest mismatch tự nó không cho biết bản nào mới hơn. Hash collision có xác suất thấp nhưng có thể xảy ra; encoding/canonical order của record cũng phải giống nhau trước khi băm.

### Hinted handoff và sloppy quorum

Khi replica đích không nhận write, coordinator có thể lưu **hint** gồm key, version và node đích, rồi phát lại khi node trở về. Hint thường chưa phải bản dữ liệu có thể đọc; nó là lời nhắc giao lại. Cần giới hạn dung lượng và tuổi hint, xử lý node vắng lâu hơn retention, retry idempotently và so version lúc phát lại. Nếu node giữ hint cũng chết, write có thể mất.

Với **sloppy quorum**, hệ thống có thể gửi write tới node khỏe ngoài tập replica ban đầu để vẫn nhận request. Node đó giữ dữ liệu tạm và chuyển về đúng replica sau. Cách này tăng khả năng nhận write khi partition, nhưng các node xác nhận có thể không tạo overlap như quorum trên tập replica chính; acknowledgment count không tự chứng minh linearizability.

Ví dụ, key vốn thuộc `{A,B,C}` nhưng `B` đang down; coordinator có thể ghi lên `{A,C,D}`. Bản trên `D` mang hint rằng write này đáng lẽ giao cho `B`. Khi `B` hồi phục, `D` phát lại rồi mới xóa hint. Nếu một partition khác đọc `{B,C}` ngay sau đó, nó có thể chưa thấy write đang nằm ở `{A,C,D}`. Sloppy quorum đổi độ chắc chắn của replica placement lấy khả năng nhận request trong lúc node đích vắng mặt.

### Merkle tree và bitmap version vector

Merkle tree hash các vùng key ở lá và hash con ở các node cha. Hai replica so root; nếu khác, đi xuống nhánh khác cho tới vùng key lệch. Nếu nhánh trái giống nhau thì không cần quét nhánh đó. Tree phân vùng nhỏ định vị chính xác hơn nhưng tốn công dựng, RAM và byte trao đổi; update có thể buộc tính lại hash từ lá lên root. Cây thường được dựng theo partition hoặc theo đợt.

Mỗi write được coordinator gắn một **dot** `(i, n)`: `i` là số thứ tự tăng riêng tại node `n`. Mỗi node giữ logical clock biểu diễn tập dot nó đã thấy, cả write tự điều phối lẫn write nhận qua replication. Sequence do chính node tạo ra liên tục; write từ node khác có thể có gap nếu một số update chưa tới. Ví dụ P2 đã thấy `P1:1..3`, rồi `P1:5`, `P1:6`, `P1:8`: biểu diễn gọn có prefix liên tục `3` và bitmap cho biết các sequence sau prefix nào đã có; P1 đối chiếu để tìm đúng `P1:4` và `P1:7` cần gửi.

Logical clock cho biết **write nào đã được thấy**, còn dotted causal container (DCC) ánh xạ dot sang thông tin nhân quả của key tương ứng. Nhờ vậy node có thể tái dựng record cần trao đổi và biết một write xảy ra sau write khác hay thuộc nhánh concurrent; chỉ biết sequence còn thiếu chưa đủ để giải quyết xung đột giá trị. Chỉ khi mọi node trong hệ thống đã thấy một prefix liên tục, metadata/log trước prefix đó mới có thể được rút gọn an toàn. Node offline lâu có thể giữ lại log của cả nhóm; rút gọn sớm thì dữ liệu để catch up không còn.

Bitmap version vector cùng DCC vừa chỉ ra write nào thiếu, vừa giữ đủ causal context để phân biệt bản đến sau với hai nhánh concurrent. Cơ chế này hoạt động tốt khi outage ngắn và log còn giữ được phần bị lỡ. Một node mất kết nối lâu có thể giữ lại việc truncate log của cả nhóm; vì thế retention và khả năng bootstrap node cũ là phần của thiết kế anti-entropy, không chỉ là chi tiết lưu trữ.

### Gossip, overlay và hybrid dissemination

Node giữ các update “hot”, định kỳ chọn ngẫu nhiên `f` peer (**fanout**) và gửi thông tin; peer mới nhận sẽ tiếp tục lan truyền. **Latency** đo thời gian đạt tiêu chí hội tụ; **redundancy** đo số lần gửi lặp. Fanout cao thường giảm số vòng nhưng tăng traffic. Mọi node đã nhận tin và quá trình gossip đã dừng là hai thời điểm khác nhau vì message đang bay có thể tạo thêm lượt lặp.

Gossip không nhận ACK toàn cụm để chứng minh mọi node đều đã nhận message. Mỗi node cần một quy tắc ước lượng lúc nên ngừng phát tán: có thể chọn xác suất dừng ở mỗi vòng, hoặc đếm số bản message trùng đã nhận rồi dừng khi vượt ngưỡng. Ngưỡng cần được chọn theo kích thước cụm và fanout; không nên bê nguyên một cấu hình giữa hai cụm khác quy mô. Fanout cao làm message lan nhanh nhưng cũng tạo nhiều bản trùng. Dừng theo duplicate count có thể giảm latency và redundancy vì node ngừng sau khi đã thấy tin lan rộng; đó vẫn là tín hiệu xác suất, không phải bằng chứng mọi node đã nhận. Ngưỡng thấp giảm traffic nhưng tăng nguy cơ bỏ sót; ngưỡng cao đáng tin hơn nhưng giữ message “hot” lâu và tốn băng thông.

Với một số epidemic gossip protocol, số vòng lan truyền có thể ở mức `O(log N)` theo kích thước cụm. Đây là số vòng trong mô hình và cấu hình cụ thể, không phải cam kết mọi node nhận tin trong thời hạn cứng. Fanout và chọn peer quyết định cả độ trễ lẫn số message lặp; protocol ít vòng vẫn có thể tốn nhiều byte/message hơn broadcast có cấu trúc.

Có thể hình dung node chưa nhận update là **susceptible**, node đang tích cực phát tán là **infective**, và node đã thôi phát tán là **removed**. Protocol không cần danh sách toàn cục để chứng minh từng node đã nhận; nó dùng “mất hứng thú” khi update đã lan đủ lâu hoặc đã thấy đủ bản sao. Dừng sớm tiết kiệm băng thông nhưng tăng nguy cơ một node bị bỏ sót; phát lâu hơn tăng độ tin cậy nhưng làm nhiều message trùng. Gossip cho tính hội tụ xác suất, thường giúp các node có view nhất quán hơn về sự kiện cũ; nó không đồng nghĩa với bảo đảm giao từng message đúng một lần.

Spanning-tree broadcast ít message khi topology ổn định, nhưng một link/node hỏng có thể cắt cả nhánh. Random gossip có đường dư và chịu lỗi hơn, nhưng có thể hình thành các “đảo” peer. Plumtree-style hybrid gửi full message chủ động qua một cây nhỏ và gửi message ID lười qua overlay; node thấy ID lạ hỏi peer lấy nội dung. Khi cây gãy, lazy gossip phát hiện thiếu và hỗ trợ sửa overlay.

Peer-sampling service duy trì partial view thay vì lưu danh sách toàn cluster. HyParView giữ active view nhỏ dùng để truyền tin và passive view lớn hơn làm nguồn thay thế; các node định kỳ shuffle membership. Khi peer active hỏng, node chọn peer khác từ passive view. Quá ít overlap làm mạng dễ thành đảo; quá nhiều overlap tăng chi phí duy trì.

Khi node chọn peer thay thế, peer đó có thể từ chối nếu active view đã đủ lớn. Node mới cần được ưu tiên khi view của nó đang rỗng để nó gia nhập topology; điều này giúp bootstrap và hồi phục nhanh, nhưng có thể khiến một peer hiện tại bị thay ra. Chất lượng peer sampling vì thế không chỉ là số peer giữ được, mà còn là tốc độ overlay quay lại trạng thái liên thông sau churn.

| Tình huống | Cơ chế phù hợp |
| --- | --- |
| Sửa key đang được đọc | Read repair |
| So replica giống nhau mà không truyền full values | Digest read |
| Giao lại update sau outage ngắn | Hinted handoff |
| Tìm vùng lệch dù key ít được đọc | Merkle reconciliation |
| Xác định chính xác write sequence bị thiếu | Bitmap version vector |
| Lan metadata qua topology động | Gossip hoặc hybrid overlay |

Các cơ chế có thể phối hợp. Chúng không tự giải quyết concurrent values; hệ thống vẫn cần version order, merge hoặc giữ conflict cho application. Cũng cần giới hạn repair bandwidth để đồng bộ không đẩy tải lên cao rồi làm replication trễ thêm.

## Chọn repair theo phần sai cần tìm

Các cơ chế anti-entropy khác nhau ở phạm vi chúng phải kiểm tra, mức lịch sử chúng nhớ được và độ bao phủ dữ liệu. Ba câu hỏi này giúp chọn cơ chế phù hợp hơn là chỉ hỏi “cơ chế nào nhanh nhất”.

| Ưu tiên | Cơ chế thường dùng | Đổi lại |
| --- | --- | --- |
| Chỉ đồng bộ dữ liệu đang được đọc | Read repair | Key lạnh có thể lệch lâu vì chưa ai đọc chúng. |
| Giao lại một số write bị lỡ sau outage ngắn | Hinted handoff hoặc bitmap version vector | Cần giữ hint/log đủ lâu; nếu quá hạn hoặc bị truncate, không còn sự kiện để replay. |
| Tìm lệch trên cả keyspace, kể cả dữ liệu ít truy cập | Merkle tree | Phải quét hoặc dựng hash theo vùng, tốn I/O, CPU và metadata; cây cần được làm mới khi dữ liệu đổi. |
| Phát tán metadata nhanh qua cụm lớn | Gossip/hybrid overlay | Hội tụ có tính xác suất; fanout và thời gian phát tán quyết định traffic, độ trễ và nguy cơ bỏ sót. |

Có thể ghép các cách này thành nhiều lớp: replication chính đưa write tới các node đang hoạt động; hint hoặc log bù sự kiện bị lỡ trong thời gian ngắn; Merkle reconciliation tìm phần lệch còn sót trên phạm vi rộng; gossip phát tán metadata để các node biết cần repair ở đâu. Dù chọn cách nào, phải có quy tắc cho node offline lâu hơn thời gian giữ log và cho tombstone đã xóa, nếu không repair có thể không tìm được lịch sử thiếu hoặc làm dữ liệu đã xóa xuất hiện lại.

## Witness và session

Witness lưu metadata/vote mà không giữ full data để giúp quorum hoặc failure detection, nhưng không thể trả dữ liệu ứng dụng bị thiếu. Session token có thể hướng đọc đến replica đã đạt version cần hoặc chờ catch up. Stale read từ replica phải là quyết định ứng dụng chấp nhận có chủ đích.

*Database Internals*, ch. 11–12, trình bày consistency, quorum/witness, vector clock, CRDT, read repair, digest, hinted handoff, Merkle tree và gossip. Đọc thêm [Dynamo paper](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf) để thấy các cơ chế phối hợp thành hệ thống.

## Tự kiểm tra

**R+W>N đủ chứng minh linearizability?** Không; cần các assumptions về replication và conflict/order.

**Vector clock incomparable nói gì?** Hai update là concurrent; application cần merge hoặc conflict policy.

**Xóa tombstone sớm có nguy cơ gì?** Replica cũ có thể mang dữ liệu đã xóa quay trở lại.
