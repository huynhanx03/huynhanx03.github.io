---
title: "Consensus, atomic broadcast và replicated log"
category: "Database"
description: "So sánh Paxos, Raft, ZAB và PBFT qua safety, quorum, log replication, failure và giới hạn thực tế."
updated: 2026-10-17
translationKey: "database/distributed-consensus-algorithms"
---

Consensus giúp nhiều node đạt cùng quyết định dù một số node lỗi hoặc message trễ. Database thường dùng consensus để đồng thuận thứ tự log/metadata, không phải để mỗi query thông thường bỏ qua transaction engine. Ba mục tiêu phải tách: **safety** không commit hai giá trị mâu thuẫn; **liveness** cuối cùng có tiến triển khi assumptions cho phép; **linearizability** làm thao tác như chạy tại một thời điểm duy nhất theo real-time order.

Trong mạng bất đồng bộ, message chậm vô hạn không thể phân biệt chắc chắn với process đã crash. FLP cho thấy không thể bảo đảm termination trong mọi lịch như vậy mà vẫn giữ safety. Consensus thường giữ safety kể cả khi message trễ; timeout/failure detector giúp chọn lúc thử lại hoặc bầu leader để tăng khả năng tiến triển, nhưng nghi ngờ sai có thể làm protocol restart hoặc chờ leader mới.

## Quorum và Paxos

Trong crash-fault consensus, quorum intersect để hai majority không thể độc lập quyết định hai giá trị trái nhau. Paxos chia proposal thành prepare/promise và accept: proposer tăng ballot, hỏi majority; phải giữ value đã accepted cao nhất mà quorum báo lại; sau đó majority accept. Rule “adopt previously accepted value” là phần bảo vệ safety, không phải chi tiết tùy chọn.

Với `2f+1` acceptor, majority `f+1` vẫn có thể tiến triển khi tối đa `f` process ngừng phản hồi. Safety vẫn phải giữ với mọi số lỗi, nhưng liveness đòi còn đủ participant tạo được quorum. “Quorum” là ngưỡng phải chờ; proposer có thể gửi tới nhiều node hơn để lấy phản hồi dự phòng, nhưng chỉ tiến tiếp sau khi nhận đủ quorum.

Paxos có ba vai trò logic: **proposer** nhận client value và đề xuất ballot; **acceptor** giữ promise/accepted state bền vững; **learner** theo dõi kết quả được chọn. Một process có thể giữ nhiều vai trò. `Prepare(n)` buộc acceptor không nhận ballot thấp hơn; nếu acceptor đã accept value, Promise phải trả lại value cùng ballot cao nhất. Sau khi thu quorum, proposer gửi `Accept(n,v)`, chọn value cũ có ballot cao nhất nếu có, nếu không mới dùng value client. Một value được accepted ở một node chưa chắc đã chosen; chosen cần quorum. Proposal number phải tăng đơn điệu và phân biệt được giữa proposer, thường bằng `(counter, node id)`.

Message delay có thể khiến proposer retry với ballot cao hơn; safety giữ nhưng progress có thể chậm nếu proposer cạnh tranh. Multi-Paxos giữ stable leader để amortize phase 1 cho nhiều log slot.

### Vì sao có nhiều biến thể Paxos?

Mỗi biến thể thay đổi một điểm cụ thể trong mạng, quorum hoặc quan hệ giữa lệnh; tên gọi không bảo đảm tự động nhanh hơn:

| Biến thể | Ý tưởng | Chi phí/điều kiện mới |
| --- | --- | --- |
| Fast Paxos | Client có thể gửi proposal trực tiếp đến acceptor trong fast round, bỏ một lượt qua leader khi không có proposal xung đột. | Với `f` lỗi, cấu hình cơ bản dùng `3f+1` acceptor và fast quorum `2f+1`, lớn hơn quorum thường `f+1`. Hai giá trị cạnh tranh có thể gây collision và cần recovery chậm hơn; nhiều collision có thể làm protocol chậm hơn Paxos thường. |
| Flexible Paxos | Không cần mọi quorum cùng phase giao nhau. Safety cần quorum Phase 1 giao với quorum Phase 2 có thể đã chọn value; các Phase 2 quorum không nhất thiết giao nhau. | Có thể đổi cấu hình thành Phase 1 nhỏ, Phase 2 lớn hoặc ngược lại, nhưng phải chứng minh quan hệ quorum cho mọi failover. Không thể tùy ý thu nhỏ cả hai. |
| Generalized Paxos | Nếu lệnh độc lập/commute, các replica có thể đồng thuận một partial order thay vì ép mọi lệnh vào cùng một total order ngay lập tức. | Cần định nghĩa chính xác lệnh nào commute và xử lý dependency/conflict; lệnh phụ thuộc nhau vẫn cần thứ tự tương thích. |
| Egalitarian Paxos (EPaxos) | Không có leader cố định cho mọi command; replica gần client có thể đề xuất, track dependency với command xung đột và dùng fast path khi quorum/failure-free conditions thỏa. | Dependency graph, recovery và execution order phức tạp; partition hoặc conflicting commands làm mất fast path. Kiểm tra paper/implementation cụ thể trước khi suy rộng. |

Ví dụ: hai replica nhận `add 1 to counter A` và `add 1 to counter B`. Nếu hai lệnh độc lập, một protocol có thể cho chúng commit theo thứ tự khác nhau ở từng replica mà state cuối vẫn tương đương; nhưng `set balance=0` và `subtract 5` trên cùng balance không commute. Thuật toán phải phát hiện xung đột theo semantics, không thể chỉ dựa vào việc payload khác nhau.

## Mô hình register ghi một lần để hiểu consensus

Chương sách còn trình bày một cách diễn đạt khác của **single-decree consensus** bằng các register ghi một lần. Đây là mô hình để suy luận về Paxos, không nên nhầm với Generalized Paxos xử lý partial order của các lệnh độc lập ở phần trước. Mỗi server có một dãy register theo thứ tự; register ở cùng vị trí trên nhiều server tạo thành một register set. Mỗi register chỉ được ghi một lần và có thể chưa ghi, chứa một giá trị, hoặc chứa `nil` để đánh dấu vị trí này bị bỏ qua.

Khi nhìn một quorum của một register set, trạng thái có thể là:

| Trạng thái | Ý nghĩa |
| --- | --- |
| `Any` | Chưa bị ràng buộc; về sau quorum có thể quyết định bất kỳ giá trị hợp lệ nào. |
| `Maybe v` | Nếu quorum này đi đến quyết định, giá trị phải là `v`; quyết định chưa chắc đã xảy ra. |
| `None` | Quorum này không thể quyết định giá trị nào ở vị trí đó. |
| `Decided v` | Giá trị `v` đã được quyết định. |

Client không được chỉ nhìn một server rồi kết luận. Khi đọc, client chỉ xuất giá trị đã quyết định nếu cùng register set cho thấy nó trên một quorum. Khi ghi vị trí `r`, phase 1 hỏi quorum bằng `P1A(r)` để biết các register đã ghi. Nếu quorum trả về giá trị ở register trước đó, client phải tiếp tục giá trị có chỉ số cao nhất; chỉ khi không có giá trị cũ mới được chọn input mới của mình. Server đồng thời đánh dấu các vị trí thấp hơn bằng `nil`, ngăn một client khác quay lại ghi một quyết định cũ. Phase 2 gửi `P2A(r, v)`; chỉ sau phản hồi quorum client mới có bằng chứng để trả về quyết định. Nếu phase 2 chưa đủ quorum, client không được đoán kết quả: nó chạy lại phase 1 để khám phá giá trị nào có thể đã được ghi.

Ví dụ có ba server `S0`, `S1`, `S2` và các majority `{S0,S1}`, `{S0,S2}`, `{S1,S2}`. Client `C0` ghi `V` vào register đầu tiên. Nếu `S0` và `S1` ghi nhận, quorum `{S0,S1}` ở trạng thái `Decided V`; hai quorum còn lại ít nhất bị ràng buộc thành `Maybe V` vì đều giao với quorum đó tại server đã ghi. Client đến sau không thể hợp lệ ghi một giá trị khác: phase 1 của nó sẽ đọc được `V` từ một quorum và phải mang `V` đi tiếp. Đây chính là ý nghĩa của quorum intersection được thể hiện qua trạng thái, thay vì chỉ qua sơ đồ message.

Ở vị trí kế tiếp, client chỉ được tiến nếu các vị trí trước đã có trạng thái tương thích (`None`, `Maybe v` hoặc `Decided v`). Nếu thấy một vị trí trước ở trạng thái `Maybe v`, nó tiếp tục thử ghi `v`; nếu một vị trí thấp hơn không còn dùng được thì các client có thể đánh dấu `nil` để không để lại khoảng trống gây quyết định mâu thuẫn. Cách nhìn này nối lại với Paxos: một proposer mới đọc được dấu vết của value cũ thì phải mang value đó tiếp tục, còn ballot/register mới giúp các vòng sau vượt qua proposer cạnh tranh mà vẫn bảo toàn quyết định.

Một lựa chọn tối ưu quorum cũng đổi nơi chịu lỗi: quorum Phase 2 lớn hơn có thể commit nhanh khi leader còn ổn nhưng làm write khó đạt hơn nếu nhiều node chậm; Phase 1 nhỏ có thể bầu leader dễ hơn nhưng phải giao với lịch sử Phase 2 cũ. Đánh giá latency, fault tolerance và recovery cùng nhau. Xem [Fast Paxos](https://www.microsoft.com/en-us/research/publication/fast-paxos/), [Flexible Paxos](https://fpaxos.github.io/), [Generalized Consensus and Paxos](https://www.microsoft.com/en-us/research/publication/generalized-consensus-and-paxos/) và [EPaxos](https://www.usenix.org/conference/nsdi13/technical-sessions/presentation/moraru).

Multi-Paxos leader có thể dùng lease để phục vụ read mà không hỏi quorum mỗi lần, nhưng lease là tối ưu hiệu năng dựa trên giới hạn clock drift; clock assumptions hỏng thì read linearizable không còn được bảo vệ. Replicated log phải được áp dụng nhất quán vào state machine; snapshot chỉ được truncate log khi snapshot và log prefix khớp và thao tác cập nhật snapshot/truncate là nguyên tử.

## Raft và replicated log

Raft chia thành election, log replication và safety. Term tăng đơn điệu; candidate chỉ thắng majority; leader append entry và commit khi majority follower lưu entry, kèm rule commit theo term. Log matching và election restriction ngăn leader mới thiếu entry đã commit. Follower timeout có jitter để tránh bầu đồng loạt.

Partitioned minority không commit entry mới; leader có thể tiếp tục nếu còn majority. Khi network hồi phục, log conflict bị truncate/replace theo protocol; snapshot compaction giới hạn log size nhưng cần snapshot index/term và install safety. Client retry cần request ID nếu response commit bị mất.

## Atomic broadcast, ZAB và virtual synchrony

Best-effort broadcast để sender tự gửi cho từng recipient; sender crash giữa chừng có thể khiến một số node thấy message còn số khác thì không. Reliable broadcast yêu cầu nếu một process đúng giao message thì mọi process đúng cuối cùng cũng giao. Flooding là cách khắc phục đơn giản: process nhận được thì chuyển tiếp cho peer khác; dễ chịu sender failure hơn nhưng có thể tạo bậc `N²` message.

Atomic broadcast thêm total order: các process đúng không chỉ giao cùng tập message mà còn giao theo cùng thứ tự. Dưới assumptions phù hợp, atomic broadcast và consensus tương đương vì mỗi vị trí trong log cần được cả nhóm quyết định. **Virtual synchrony** áp dụng cho membership thay đổi: group có view, message gắn với view gửi; message nhận nhưng chưa được tất cả giao sẽ ở trạng thái pending. View change là barrier: trước khi chuyển sang view mới, nhóm phải thống nhất message nào của view cũ đã giao, nên không có node tự coi một message lẻ là đã commit.

ZAB (ZooKeeper Atomic Broadcast) dùng leader epoch/zxid và ba pha. **Discovery** chọn epoch lớn hơn mọi epoch follower biết, đồng thời thu transaction ID cao nhất. **Synchronization** đưa followers về cùng history, phát proposal đã commit ở epoch cũ trước message mới. **Broadcast** leader gửi proposal, đợi quorum ACK rồi commit; proposal sai epoch bị từ chối. Client có thể kết nối bất kỳ node nào: follower chuyển request cần leader xử lý tới leader, còn leader giữ vai trò tạm thời để xếp thứ tự. Follower không nhận heartbeat quorum sẽ khởi động election; leader mất quorum phải bước xuống. Trong lúc broadcast, leader đợi proposal trước được ACK rồi mới gửi proposal kế tiếp; sách mô tả đường broadcast bằng hai lượt message và phục hồi bằng cách stream phần thiếu từ một follower có proposal đã commit cao nhất, thay vì gom lịch sử từ mọi node. ZAB duy trì thứ tự khi xử lý message lặp; side effect nằm ngoài replicated log vẫn cần ứng dụng tự xử lý retry/dedup.

## Byzantine consensus

Crash-fault model giả định node dừng nhưng không nói dối. Byzantine model cho phép node phát message mâu thuẫn tùy ý; PBFT cần `n = 3f+1` replica để chịu tối đa `f` Byzantine fault theo mô hình cơ bản. Primary gắn request với view, sequence và digest; replica qua prepare khi đủ `2f` prepare khớp từ backup khác, rồi cần `2f+1` commit khớp để execute theo thứ tự. Client thường đợi `f+1` response giống nhau; đường tối ưu cho read-only request trong sách cần `2f+1` tentative response. View change cần `2f` thông báo để primary mới mở view; stable log giữ request đến khi `f+1` replica execute. Mỗi `N` request, checkpoint ghi sequence và state digest; `2f+1` xác nhận cho phép thu gọn log, còn replica phục hồi phải kiểm tra digest và phần log tiếp theo. Chi phí message tăng mạnh; chữ ký, membership, giả định lỗi độc lập và threat model quan trọng.

## Giới hạn và chọn protocol

Consensus không làm network nhanh, không tự giải quyết transaction đa database và không khiến mọi read linearizable miễn phí. Read có thể yêu cầu leader/quorum hoặc lease có clock assumptions. Mất majority thì thường dừng commit để giữ consistency. Lựa chọn library cần xem persistence, membership changes, snapshots, disk-full, slow follower, split vote, client duplicate và upgrade protocol.

*Database Internals*, ch. 14, so sánh broadcast, ZAB, Paxos, Raft và PBFT; kiểm tra protocol bằng nguồn gốc: [Raft paper](https://raft.github.io/raft.pdf), [Paxos Made Simple](https://lamport.azurewebsites.net/pubs/paxos-simple.pdf), [ZooKeeper paper](https://www.usenix.org/legacy/event/atc10/tech/full_papers/Hunt.pdf), [EPaxos paper](https://istc-cc.cmu.edu/publications/papers/2013/epaxos-sosp2013.pdf) và [errata của Database Internals](https://www.databass.dev/errata).

## Tự kiểm tra

**Paxos có thể chọn value khác với proposal mới nhất?** Có; proposer phải adopt giá trị accepted có ballot cao nhất được quorum báo.

**Raft minority có thể commit?** Không theo quorum majority rule.

**PBFT chịu được 2 Byzantine replica với 5 node?** Không; cần ít nhất `3f+1`, tức 7 node cho `f=2` theo mô hình cơ bản.
