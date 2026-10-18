---
title: "Consensus khi có lỗi: theo dấu Paxos, Raft, ZAB và PBFT"
category: "Database"
description: "Đi theo các message và trạng thái khi proposer, leader, replica hoặc mạng lỗi giữa một vòng consensus."
updated: 2026-10-18
translationKey: "database/consensus-protocol-failure-traces"
---

Consensus là để các process quyết định cùng một giá trị, không chỉ để một node phát thông báo. Một giao thức thường cần ba tính chất: **agreement** (không có hai quyết định mâu thuẫn), **validity** (giá trị quyết định phải được đề xuất hợp lệ), và **termination** (các process đúng cuối cùng quyết định khi điều kiện tiến triển được đáp ứng). Trong mạng bất đồng bộ có thể có crash, FLP cho biết không thể bảo đảm termination trong mọi lịch message mà vẫn giữ safety; protocol thực tế dựa vào timeout, eventual synchrony hoặc quorum assumptions.

## Reliable broadcast khác atomic broadcast

Reliable broadcast cố gắng bảo đảm một message được giao nhất quán cho nhóm: process đúng giao thì process đúng khác cũng giao, và message không có nguồn hợp lệ không được bịa ra. Nhưng hai node có thể nhận message `m1`, `m2` theo thứ tự khác nhau. **Atomic/total-order broadcast** bổ sung thứ tự giao chung: nếu hai node cùng giao cả hai message thì chúng giao cùng thứ tự.

Đây là khác biệt quan trọng với replication log. Cùng dữ liệu nhưng áp dụng `set x=1` rồi `set x=2` có thể cho kết quả khác với thứ tự ngược lại. Atomic broadcast cần thống nhất vị trí log trước khi replica áp dụng lệnh. Một total order trong log chưa tự biến nhiều lệnh thành một transaction SQL atomic; transaction semantics nằm ở tầng khác.

## Paxos: quorum mang theo lịch sử đã accepted

Mỗi acceptor lưu bền vững proposal number cao nhất nó đã hứa, cùng value/ballot mà nó đã accepted. Proposer bắt đầu phase 1 bằng `Prepare(n)` và thu `Promise` từ quorum. Acceptor từ chối ballot thấp hơn promise đã lưu; nếu đã accepted value nào, nó báo value có ballot cao nhất. Proposer chọn value đó nếu có, chỉ dùng value mới của client khi quorum không báo accepted value cũ. Sau đó proposer gửi `Accept(n,v)`; value được **chosen** khi đủ quorum accept.

Xét ba acceptor A, B, C và quorum hai node. Các tình huống trong chương sách cho thấy vì sao không thể đồng nhất “đã accept” với “đã chosen”:

| Lịch sự kiện | Điều gì đã xảy ra? | Proposer mới phải làm gì? |
| --- | --- | --- |
| P1 nhận accept từ B và C cho `v1`, rồi chết trước khi báo learner. | `{B,C}` là quorum nên `v1` đã chosen, dù client chưa nghe kết quả. | Mọi quorum phase 1 của P2 giao với `{B,C}`. P2 sẽ thấy `v1` và phải đề xuất tiếp `v1`. |
| P1 chỉ nhận accept từ A cho `v1`; A vẫn hoạt động và nằm trong quorum phase 1 của P2. | `v1` chỉ accepted ở một node, chưa chosen. | A báo accepted value; P2 chọn accepted value có ballot cao nhất mà quorum trả về, ở đây là `v1`. |
| P1 chỉ nhận accept từ A cho `v1`; A không nằm trong quorum phase 1 của P2. | `v1` chưa chosen và quorum P2 chưa thấy dấu vết đó. | P2 có thể chọn giá trị mới `v2`. Nếu A sau đó quay lại, ballot/Promise mới và quorum intersection bảo vệ quyết định đã chọn; trạng thái cũ của A không được phép ghi đè quyết định mới. |

Điểm thứ ba chỉ an toàn vì `v1` chưa từng được accept bởi một quorum. Nếu A và một acceptor khác đã accept `v1`, thì mọi majority phase 1 đều phải giao với quorum đó và P2 buộc phải giữ `v1`. Acceptors phải giữ bền vững trạng thái promise/accepted qua restart; nếu mất trạng thái này, lập luận giao quorum không còn đáng tin.

Hai proposer có thể liên tục mở ballot cao hơn nhau, làm acceptor hứa với ballot mới trước khi proposer kia lấy đủ quorum. Safety vẫn được giữ nhờ ballot và rule adoption, nhưng termination chậm. Multi-Paxos dùng leader ổn định để tái sử dụng phase 1 cho nhiều log slot; leader failure quay lại election/phase 1, còn log cần durable state và snapshot để không tăng vô hạn.

## ZAB: leader epoch, đồng bộ lịch sử rồi mới broadcast

ZAB dùng leader tạm thời và epoch tăng để phân biệt lịch sử trước/sau election. Client có thể kết nối tới follower; follower chuyển request cần thứ tự toàn cục tới leader. Một vòng mới có ba việc lớn:

1. **Discovery:** candidate thu trạng thái lịch sử của followers và xác định epoch/transaction ID mới.
2. **Synchronization:** leader mới đưa followers về cùng lịch sử, hoàn tất proposal đã commit ở epoch trước rồi mới gửi proposal mới.
3. **Broadcast:** leader đánh số proposal bằng zxid, gửi theo thứ tự và đợi follower xác nhận proposal hiện tại trước khi gửi proposal kế tiếp. Sau quorum acknowledgment, proposal được commit/deliver theo cùng thứ tự. Đường broadcast có hai lượt message: proposal rồi acknowledgment; thông báo commit theo sau.

Nếu leader mất trước khi có quorum cho proposal, proposal chưa được coi là committed. Trong bước đồng bộ, leader mới khôi phục từ follower có proposal đã commit cao nhất rồi stream phần lịch sử còn thiếu; không gom history từ mọi follower. Follower mất leader sẽ khởi tạo election; leader không nhận đủ quorum cũng bước xuống. Epoch làm message của leader cũ không thể được chấp nhận như proposal thuộc epoch hiện tại. Việc giao theo thứ tự giúp replica áp dụng message lặp nhất quán, nhưng thao tác bên ngoài state machine vẫn cần request ID hoặc xử lý idempotent nếu client retry sau khi mất phản hồi.

## Raft: bầu candidate có log đủ mới

Mỗi term có thể có tối đa một leader hợp lệ. Follower bắt đầu election khi hết randomized timeout, tăng term, tự vote và gửi `RequestVote`. Một candidate cần majority; follower chỉ vote một lần mỗi term và từ chối candidate có log kém mới hơn (so term của entry cuối trước, rồi index). Randomized timeout giảm khả năng các follower đồng thời chia phiếu.

Leader gửi `AppendEntries` có `prevLogIndex` và `prevLogTerm`. Follower chỉ nhận suffix nếu entry trước khớp; nếu không, leader điều chỉnh điểm bắt đầu rồi gửi lại. Khi có entry xung đột chưa committed, follower có thể xóa suffix cũ và thay bằng log của leader mới; leader không sửa/xóa entry trong log riêng của nó.

Leader commit entry khi majority đã lưu, nhưng rule Raft chỉ cho leader kết luận trực tiếp về entry thuộc current term; entry cũ được commit gián tiếp khi một entry current-term phía sau được commit. Quy tắc này kết hợp với election restriction để giữ entry committed qua các term. Minority partition không thể commit. Khi mạng hồi phục, node có log cũ phải hội tụ theo leader hợp lệ.

## Fast/Flexible Paxos và EPaxos thay đổi đường đi nào?

Fast Paxos cho client gửi trực tiếp tới acceptor trong fast round để bỏ một lần qua leader. Đổi lại, fast quorum lớn hơn; nếu hai value cạnh tranh, acceptor có thể thấy collision và coordinator phải chạy recovery round.

Flexible Paxos không đòi mọi quorum cùng phase giao nhau. Safety cần phase-1 quorum giao với phase-2 quorum có thể đã chọn value. Với N=5, phase 2 có thể cần 2 acceptor nếu phase 1 được nâng lên 4, vì `Q1 + Q2 > N`. Giảm quorum commit đổi lấy chi phí election/failover lớn hơn.

EPaxos thay leader ổn định bằng một **command leader** cho từng lệnh: client có thể gửi tới replica gần nhất, giúp phân tán tải và tránh một node luôn nằm trên đường đi. Hai command chỉ xung đột (*interfere*) nếu chạy theo hai thứ tự khác nhau có thể làm đổi state hoặc kết quả đọc. Ví dụ, ghi hai counter khác nhau thường độc lập; ghi rồi đọc cùng một balance thì không.

Khi nhận command, command leader tạo `PreAccept` với hai thông tin: tập dependency gồm các command có thể xung đột, kể cả command chưa commit; và sequence number lớn hơn sequence của mọi dependency đã biết. Các replica so sánh proposal với log cục bộ, bổ sung dependency/sequence nếu thấy conflict mà leader chưa biết, rồi gửi lại phần chúng quan sát được. Nếu fast quorum đồng ý cùng một cặp `(dependencies, sequence)` với leader, command đi fast path. Nếu phản hồi trong fast quorum không thống nhất, leader hợp nhất dependency, lấy sequence lớn nhất rồi chạy pha Paxos-Accept với slow quorum. Khi chưa có fast quorum nhưng đã có phản hồi đủ slow quorum, leader cũng có thể đi slow path; nếu chưa đủ slow quorum thì command chưa thể commit.

Commit và execute là hai bước khác nhau. Replica giữ dependency graph; chỉ thực thi command sau khi các dependency của nó đã commit/execute, theo thứ tự topo tương thích. Vì vậy, command độc lập có thể được commit theo thứ tự khác nhau ở các replica mà vẫn cho state tương đương; các command xung đột phải có cùng quan hệ thứ tự. Ballot mang epoch cấu hình, counter tăng tại replica và replica ID để không trùng; proposal cũ bị từ chối kèm sequence/dependency mới nhất đã biết.

Quorum EPaxos cần đọc đúng theo phiên bản thuật toán. Với `N = 2F + 1` replicas và tối đa `F` lỗi, bài báo gốc mô tả basic EPaxos dùng fast quorum `2F` và slow quorum `F + 1`; phiên bản tối ưu giảm fast quorum còn `F + floor((F + 1) / 2)`. Ví dụ `F = 2`, có 5 replicas: fast quorum cơ bản là 4, slow quorum là 3, còn fast quorum tối ưu là 3. Sách in công thức fast quorum `ceil(3f/4)` ở đoạn này; đó là lỗi công thức. Đối chiếu [bài báo EPaxos](https://istc-cc.cmu.edu/publications/papers/2013/epaxos-sosp2013.pdf) và [errata của sách](https://www.databass.dev/errata) trước khi dùng con số. Fast path vẫn đòi các phản hồi trong quorum được chọn thống nhất về dependency và sequence; thiếu đồng thuận thì dùng slow path.

## PBFT: nhiều replica kiểm tra chéo nhau

Crash-fault protocol giả định node dừng nhưng không nói dối. PBFT còn chịu được tối đa `f` Byzantine replica khi có `n = 3f + 1` node; chẳng hạn chịu `f = 1` cần ít nhất bốn replica. Phần dư ngoài `f` node lỗi Byzantine giúp các replica đúng kiểm tra chéo message ngay cả khi thêm node không phản hồi.

Trong một view, primary có số thứ tự `view mod n`. Nó gắn request với sequence number và digest rồi phát `PRE-PREPARE`. Mỗi backup kiểm tra view, sequence và digest trước khi chấp nhận. Sau đó replica phát `PREPARE` mang cùng view, sequence, digest nhưng không gửi lại payload. Một replica chỉ qua bước prepare khi thấy `2f` prepare khớp từ các backup khác; ngưỡng này buộc các replica đúng nhìn cùng request tại cùng vị trí. Replica đã prepared tiếp tục phát `COMMIT`, rồi đợi `2f + 1` commit khớp, có thể tính cả message của chính nó. Khi đủ ngưỡng, replica thực thi request theo thứ tự và trả lời.

Client thường cần `f + 1` phản hồi giống nhau từ các replica khác nhau. Vì trong số đó ít nhất một phản hồi đến từ replica đúng, Byzantine primary không thể một mình khiến client tin kết quả sai. Chương sách phân biệt đường **tentative** để giảm message với đường hoàn tất thông thường: replica có thể tentative-execute sau khi đã prepared, client đợi `2f + 1` kết quả khớp; nếu không đủ, client retry và chờ `f + 1` phản hồi hoàn tất. Read-only có thể đi trong một round-trip, nhưng replica chỉ trả kết quả sau khi các thay đổi đang chạy có thể ảnh hưởng đến lần đọc đã được commit; client cũng phải thu `2f + 1` giá trị giống nhau từ các replica khác nhau.

Khi nghi primary lỗi, replica ngừng xử lý request thường; chúng vẫn tham gia checkpoint và view change. Mỗi replica phát thông báo view change rồi đợi xác nhận. Primary của view kế tiếp bắt đầu view mới sau khi nhận `2f` thông báo view change, mang theo thông tin về các request đã đạt trạng thái an toàn để primary mới không dựng một lịch sử tùy ý.

Replica giữ message trong stable log ít nhất đến khi request được thực thi trên `f + 1` replica. Sau mỗi `N` request (ngưỡng cấu hình), primary tạo stable checkpoint gồm sequence number mới nhất đã phản ánh vào state và digest của state đó. `2f + 1` xác nhận tạo bằng chứng để replica an toàn bỏ message cũ hơn. Replica phục hồi so digest checkpoint và kiểm tra message sau checkpoint; nếu chỉ tin snapshot của một node, quá trình recovery có thể đưa state giả vào cụm.

## Khi đọc protocol hoặc chọn thư viện

Hãy viết lịch message tại điểm lỗi: ai đã persist ballot/term, ai đã vote, quorum nào đã phản hồi và thao tác nào đã được client ACK. Sau đó kiểm tra cả safety khi message đến trễ/trùng/lệch thứ tự lẫn liveness khi leader mất hoặc majority unavailable. Cũng cần hiểu snapshot, log truncation, membership change, disk full, upgrade và client retry. Tên “Paxos” hay “Raft” không tự chứng minh implementation đáp ứng các điều kiện đó.

## Tự kiểm tra

**Một acceptor đã accept value thì value chắc chắn chosen?** Không. Chosen cần quorum; nhưng accepted value trong phase-1 quorum có thể buộc proposer mới tiếp tục value đó.

**Raft leader có thể commit entry cũ chỉ vì majority chứa nó?** Rule current-term yêu cầu commit trực tiếp entry của term hiện tại; entry cũ được commit gián tiếp qua entry mới hơn.

**Vì sao PBFT cần nhiều replica hơn Raft?** Byzantine node có thể nói dối hoặc gửi message mâu thuẫn, nên cần quorum đủ lớn để nhóm đúng vẫn lấn át nhóm lỗi.

*Database Internals*, chương 14. Xem thêm [Raft paper](https://raft.github.io/raft.pdf), [Paxos Made Simple](https://lamport.azurewebsites.net/pubs/paxos-simple.pdf), [ZooKeeper paper](https://www.usenix.org/legacy/event/atc10/tech/full_papers/Hunt.pdf), [EPaxos paper](https://istc-cc.cmu.edu/publications/papers/2013/epaxos-sosp2013.pdf) và [errata của sách](https://www.databass.dev/errata) để đối chiếu protocol và công thức quorum đã sửa.
