---
title: "Consistency model: hệ thống hứa gì với lần đọc và ghi?"
category: "Database"
description: "Đọc lịch sử đọc ghi để phân biệt linearizability, sequential, causal, session và eventual consistency."
updated: 2026-10-18
translationKey: "database/distributed-consistency-models"
---

Khi một giá trị được lưu trên nhiều node, câu hỏi khó không chỉ là “có bao nhiêu bản sao?”. Ta còn cần biết: sau khi một lần ghi thành công, client khác có thể đọc giá trị cũ bao lâu; hai lần ghi chồng lấn có thể được sắp theo thứ tự nào; và một client có thấy lại dữ liệu cũ sau khi đã thấy dữ liệu mới hay không. **Consistency model** là hợp đồng mô tả những lịch sử đọc/ghi nào hệ thống cho phép.

Ta dùng một register `x`, ban đầu bằng `0`, để theo dõi ví dụ. Một thao tác có thời điểm bắt đầu và kết thúc. Hai thao tác không chồng lấn nếu thao tác trước đã trả lời xong trước khi thao tác sau bắt đầu; nếu chúng chồng lấn thì hệ thống có thể có nhiều cách sắp hợp lệ.

## Từ register an toàn đến thứ tự đọc/ghi

Khi một write đang diễn ra đồng thời với read, các model register đặt giới hạn khác nhau lên kết quả:

- **Safe register:** một read chồng lấn write có thể trả về bất kỳ giá trị hợp lệ nào của register. Bảo đảm này yếu, nhưng mô tả rõ điều gì có thể xảy ra khi không có quy tắc đồng bộ.
- **Regular register:** read chồng lấn write có thể trả về giá trị trước write hoặc giá trị đang được ghi; một read không chồng lấn phải thấy write gần nhất đã hoàn tất.
- **Atomic register:** mọi thao tác trông như được đặt vào một thứ tự tuần tự duy nhất, phù hợp với thứ tự thời gian của các thao tác không chồng lấn. Đây là cách diễn đạt gần với linearizability cho một register.

Xét `x` là số nguyên, ban đầu bằng `0`, trong lúc một client đang ghi `1`. Nếu read chồng lấn lần ghi đó, **safe register** có thể trả về bất kỳ số nào trong miền của `x`, chẳng hạn `7`; nếu `x` là bit, các read lặp lại thậm chí có thể nhấp nháy giữa `0` và `1`. **Regular register** chỉ được trả `0` hoặc `1`: giá trị cũ gần nhất hoặc giá trị của lần ghi đang diễn ra. Với **atomic register**, có một ranh giới logic duy nhất: read được xếp trước ranh giới thấy `0`, read được xếp sau thấy `1`, và mọi client quan sát kết quả theo thứ tự tương thích với thời gian thực. Khi không có write chồng lấn, cả ba model đều phải trả write gần nhất đã hoàn tất.

Các tên này mô tả hành vi quan sát được, không nói hệ thống dùng thuật toán nội bộ nào. Một hệ thống phân tán thường phải dùng message, log hoặc quorum để làm cho các bản sao tạo ra hành vi mong muốn.

**Strict consistency** là mô hình lý tưởng mạnh hơn: mọi write có hiệu lực tức thời trên toàn hệ thống theo một global clock, nên mọi read bắt đầu sau write phải thấy nó. Mạng hữu hạn tốc độ và các node ở xa khiến mô hình này không thể triển khai đúng nghĩa. Linearizability thực tế hơn: mỗi thao tác có một linearization point trong khoảng gọi–trả lời, vì vậy write chỉ cần trở nên nhất quán tại một điểm hợp lệ trong lúc operation đang chạy.

## Linearizability: giữ cả thứ tự thời gian thực

Linearizability yêu cầu mỗi thao tác có thể được xem như xảy ra tức thời tại một điểm nằm giữa lúc gọi và lúc trả lời. Điểm tưởng tượng đó gọi là **linearization point**. Nếu write `x = 1` đã trả lời trước khi một read bắt đầu, read đó phải thấy `1` hoặc giá trị mới hơn; nó không thể thấy `0`.

Xét lịch sử với `x = 0` ban đầu:

| Client | Thao tác | Thời điểm |
| --- | --- | --- |
| A | `write(x, 1)` | gọi; vẫn đang xử lý |
| B | `write(x, 2)` | gọi; hoàn tất trước A |
| C | `read(x) → 1` | sau khi B hoàn tất |

Lịch này không thể linearizable: B đã hoàn tất trước khi read của C bắt đầu, nên read phải thấy `2` hoặc một write xảy ra sau B. Giá trị `1` sẽ làm lịch sử vi phạm thứ tự thời gian thực. Nếu hai write cùng đang chạy và chưa trả lời, chúng chồng lấn; hệ thống có thể đặt `1` trước `2` hoặc `2` trước `1`, nhưng mọi lần đọc sau đó phải phù hợp với cùng một thứ tự hợp lệ.

Linearizability làm ứng dụng dễ suy luận như đang dùng một bản dữ liệu duy nhất. Đổi lại, các node phải phối hợp để thống nhất lúc một write trở nên có hiệu lực. Điều này thêm round trip và có thể khiến thao tác chờ khi không đạt được quorum. Với nhiều object, linearizable từng object riêng không tự cho ta một transaction nguyên tử trên cả hai object.

Một thao tác atomic write thay giá trị mà không đọc điều kiện cũ; **compare-and-swap (CAS)** chỉ đổi giá trị nếu nó vẫn bằng giá trị mà caller đã quan sát. CAS hữu ích để publish một kết quả tính trước, nhưng nếu giá trị đổi `A → B → A`, CAS chỉ so giá trị sẽ không nhận ra trạng thái trung gian (**ABA problem**). Khi lịch sử thay đổi cũng quan trọng, cần version/tag đi cùng giá trị thay vì chỉ so payload.

RIFL làm rõ các điều kiện để cơ chế retry này đúng: client ID được cấp bằng lease; mỗi request có sequence tăng dần; completion object được lưu bền vững cùng record; và tạo completion object phải atomic với mutation của record. Khi retry tới, server trả kết quả trong completion object thay vì áp dụng mutation lần nữa. Completion object được giữ đến khi client xác nhận sẽ không retry nữa hoặc server xác định client đã crash; khi lease hết hạn, request từ client cũ không được commit và metadata của lease có thể được garbage-collect. Nếu completion object và mutation không atomic, crash ở giữa vẫn có thể tạo trạng thái “effect đã chạy nhưng dedup record chưa có”. RIFL là một thiết kế cho linearizable RPC, không phải bảo đảm tự có của transport.

## Sequential consistency: một thứ tự chung nhưng có thể cũ

Sequential consistency yêu cầu mọi client nhìn thấy cùng một thứ tự toàn cục, đồng thời thứ tự thao tác của từng client được giữ nguyên. Thứ tự toàn cục đó không cần trùng với thời gian thực giữa các client.

Ví dụ, A ghi `x = 1`, sau đó B ghi `x = 2`; hai write có thể được quan sát theo thứ tự `2 → 1` nếu chúng chồng lấn hoặc hệ thống không bảo toàn quan hệ thời gian thực. Điều quan trọng là mọi reader phải thống nhất cùng một thứ tự: một client không được quan sát `1 → 2` trong khi client khác quan sát `2 → 1`. So với linearizability, sequential consistency nới yêu cầu đồng bộ thời gian thực, nhưng client vẫn cần cùng một lịch sử thứ tự.

## Causal consistency: giữ quan hệ nguyên nhân

Không phải mọi thao tác đều cần một thứ tự toàn cục. Nếu B được tạo ra sau khi người dùng đọc A và phản hồi lại A, thì B phụ thuộc nhân quả vào A. Causal consistency yêu cầu mọi replica cho thấy A trước B. Nếu hai write độc lập, chúng không có quan hệ happened-before và có thể tới các replica theo thứ tự khác nhau.

Ví dụ trong diễn đàn: Linh đăng câu hỏi `Q`; Minh đọc `Q` rồi đăng trả lời `A`. Một replica không được hiển thị `A` khi chưa hiển thị `Q`, vì người đọc sẽ thấy một câu trả lời không có câu hỏi. Ngược lại, hai người đăng bài độc lập có thể được hiển thị theo thứ tự khác nhau ở những nơi khác nhau.

Vector clock hoặc metadata nhân quả đi kèm thao tác giúp replica biết các dependency nào phải có trước. Nếu update đến sớm hơn dependency, replica có thể giữ nó lại đến khi đủ context. Vector clock cho biết hai nhánh có quan hệ trước-sau hay concurrent; nó không tự chọn cách giải quyết hai nhánh concurrent. Hệ thống cần merge theo nghiệp vụ hoặc giữ nhiều phiên bản cho client.

## Session guarantees: ổn định từ góc nhìn một client

Client-centric model đặt câu hỏi: trong một phiên liên tiếp, client có thể thấy dữ liệu lùi về sau không? Bốn bảo đảm phổ biến là:

- **Read-your-writes:** sau khi client ghi `x = 1`, lần đọc sau của chính client không trả `0`.
- **Monotonic reads:** nếu client đã thấy phiên bản 5, lần đọc sau không trả về phiên bản 3.
- **Monotonic writes:** các write của cùng client được áp dụng theo thứ tự client gửi, tránh một update cũ đến sau và ghi đè update mới.
- **Writes-follow-reads:** write của client giữ quan hệ sau những write mà client đã quan sát qua lần đọc trước.

Một cách triển khai là mang session token hoặc version context theo request và chỉ đọc từ replica đã đạt version đó; nếu chưa có replica phù hợp thì chờ, route sang nơi khác hoặc trả lỗi. Các session guarantee không tự tạo thứ tự giữa hai client khác nhau. Vì vậy, chúng hữu ích cho UX “vừa cập nhật xong thì vẫn thấy cập nhật”, nhưng không thay linearizability cho invariant toàn cục như chỉ cấp một ghế cuối cùng.

Một họ guarantee thường đi cùng là **PRAM/FIFO consistency**: các write do cùng một process phát ra phải được mọi replica thấy theo cùng thứ tự, nhưng write từ hai process khác nhau không nhất thiết có thứ tự chung. Nếu kết hợp PRAM với read-your-writes và monotonic reads, client có thể thấy các cập nhật của mình ổn định mà vẫn không có một lịch sử toàn cục như linearizability. Đây là lý do “mọi người đều thấy các write của tôi theo đúng thứ tự” yếu hơn “mọi người đều đồng ý thứ tự của mọi write”.

## Eventual consistency: hội tụ không có thời hạn cụ thể

Eventual consistency nói rằng nếu một key ngừng nhận update và các replica tiếp tục trao đổi, chúng cuối cùng sẽ hội tụ theo quy tắc giải quyết xung đột. Từ “cuối cùng” không đưa ra giới hạn thời gian. Client có thể đọc stale value trong một khoảng phụ thuộc tải, mạng, repair và chính sách hệ thống.

Nếu hai replica cùng ghi, “giá trị cuối cùng” cần được định nghĩa. Last-write-wins thường so timestamp, nhưng clock lệch có thể khiến bản ghi hợp lệ bị loại. Vector clock phát hiện concurrent versions nhưng để application merge. Một CRDT định nghĩa cấu trúc dữ liệu có phép merge phù hợp để replica đi tới cùng trạng thái khi nhận cùng tập update.

Strong eventual consistency bổ sung điều kiện hội tụ xác định: khi các update hợp lệ đã lan tới mọi nơi, các replica merge thành cùng một trạng thái hợp lệ. Nó không có nghĩa mọi lần đọc trước khi hội tụ đều nhất quán mạnh.

### Ví dụ G-Counter

Ba node giữ vector `[c1, c2, c3]`. Mỗi node chỉ tăng component của chính mình. Ban đầu cả ba có `[0,0,0]`. Khi node 1 tăng một lần và node 3 tăng một lần, chúng có thể lần lượt giữ `[1,0,0]` và `[0,0,1]`. Khi trao đổi, mỗi replica lấy giá trị lớn nhất theo từng component:

`merge([1,0,0], [0,0,1]) = [1,0,1]`

Giá trị đếm là tổng các component, bằng 2. Merge theo max không phụ thuộc thứ tự nhận và lặp lại cùng một state không làm thay đổi kết quả; vì mỗi node chỉ sửa component của nó, hai lần tăng độc lập không ghi đè nhau. PN-Counter dùng hai vector: một cộng các lần tăng và vector kia cộng các lần giảm; giá trị cuối là tổng tăng trừ tổng giảm. Vector metadata tăng theo số participant, nên hệ lớn có thể cần phân tầng lan truyền hoặc thu gọn metadata.

Với register, **last-write-wins (LWW)** chọn giá trị có timestamp lớn hơn; cách merge dễ hội tụ nhưng có thể bỏ mất một giá trị vì clock sai hoặc vì hai update concurrent. **Multi-value register** giữ các nhánh concurrent để ứng dụng chọn/merge, đổi lại cần lưu version context và xử lý conflict. Tính chất merge của CRDT giải quyết cách hội tụ cho một kiểu dữ liệu cụ thể; nó không tự đảm bảo invariant nghiệp vụ như “không bán quá số vé còn lại”.

Với **G-Set**, mỗi replica chỉ thêm phần tử; merge là hợp hai tập nên giao hoán, kết hợp và lặp lại an toàn. Nhưng G-Set không thể xóa. Muốn xóa mà vẫn xử lý replica cập nhật offline, một observed-remove set cần gắn mỗi lần thêm với một tag duy nhất: xóa chỉ vô hiệu hóa những tag mà client đã quan sát. Một lần thêm concurrent chưa được quan sát vẫn có thể còn sau merge — đây là quy tắc cần hiểu trước khi gọi nó là “đã xóa”. Các kiểu JSON CRDT tổng quát hóa ý tưởng này cho map/list lồng nhau, nhưng cần metadata và merge semantics xác định cho từng thao tác; chúng không thay thế validation invariant của ứng dụng.

## CAP, latency và mức dữ liệu trả về

CAP xét tình huống network partition: các node không thể trao đổi. Nếu hệ thống tiếp tục trả lời mọi request ở các phía, có thể phải trả dữ liệu stale hoặc nhận update concurrent. Nếu chỉ phía có quorum được phục vụ để bảo toàn linearizability, phía còn lại có thể từ chối hoặc chờ. Đây là lựa chọn khi partition đang xảy ra, không phải công tắc “chọn hai trong ba” lúc thiết kế.

Trong CAP, **consistency** có nghĩa gần với linearizability của thao tác đọc/ghi, không phải consistency trong ACID, nơi ta nói về invariant dữ liệu. **Availability** cũng là một điều kiện hình thức: mỗi request tới node không lỗi phải nhận được phản hồi hợp lệ, chứ không đơn giản là “dịch vụ có uptime cao”. CAP bàn về partition mạng; node crash riêng lẻ là một kiểu lỗi khác. Vì thế, khi thiết kế hệ thống thực tế, cần hỏi rõ lỗi nào đang xảy ra và request nào còn được phép trả lời.

Ngay cả khi không partition, consistency mạnh thường cần coordination và tăng latency. PACELEC diễn đạt thêm rằng khi hệ thống bình thường, ta vẫn có thể đánh đổi latency lấy consistency. Một ứng dụng cần chọn theo invariant: số dư chuyển tiền có thể yêu cầu thứ tự mạnh; lượt xem trang có thể chấp nhận số gần đúng.

Harvest và yield giúp nói về chất lượng phản hồi theo mức độ. **Yield** là tỷ lệ request được phục vụ; **harvest** là mức đầy đủ của kết quả. Một tìm kiếm có thể trả 99/100 kết quả khi một shard không liên lạc được, giữ yield cao nhưng harvest thấp hơn. Cách trả lời từng phần chỉ phù hợp nếu ứng dụng nói rõ dữ liệu nào có thể thiếu; không được âm thầm trình bày kết quả một phần như toàn bộ.

## Tunable consistency và quorum

Với N replica, một giao thức có thể yêu cầu W replica xác nhận write và R replica trả lời read. Nếu `R + W > N`, hai tập phản hồi giao nhau ít nhất một replica trong mô hình đơn giản. Ví dụ `N=3, W=2, R=2`: write cần hai xác nhận; read hỏi hai node. Quorum có thể chịu một node không sẵn sàng, tùy topology và protocol.

Điều kiện giao nhau không tự chứng minh linearizability. Ta còn cần biết replica xác nhận write đã lưu ở đâu, version được so sánh thế nào, concurrent writes được xử lý ra sao, read có thể dùng speculative response nào và failover có làm mất node giao nhau hay không. Sloppy quorum hoặc nhiều datacenter cũng thay đổi các giả định. Quorum là một thành phần trong protocol, không phải một công thức thay thế safety proof.

### Write timeout có thể làm read lùi về giá trị cũ

Giả sử ba replica `A, B, C` dùng `N=3`, read quorum `R=2` và write quorum `W=2`. Một write mới tới `A`, nhưng `B` không phản hồi nên write timeout trước khi đủ `W`; client không nhận được xác nhận thành công. Read quorum `{A,B}` có thể thấy giá trị mới, còn `{B,C}` chỉ thấy giá trị cũ. Vì write chưa hoàn tất nên giao nhau hình thức `R + W > N` không giúp bảo đảm mọi read thấy nó. Hai lần đọc liên tiếp có thể trả lần lượt giá trị mới rồi giá trị cũ nếu chúng hỏi các quorum khác nhau.

Muốn giữ **monotonic reads** sau tình huống này, protocol có thể chờ/repair các replica cần thiết trước khi trả kết quả, nhưng blocking read repair làm giảm availability khi không liên lạc đủ replica. Vì vậy phải tách rõ: quorum intersection cho write đã được xác nhận theo đúng protocol; nó không tự quy định kết quả của một write chưa hoàn tất.

Với `N = 2f + 1`, majority quorum cần `f + 1` phản hồi nên có thể tiếp tục khi tối đa `f` replica không sẵn sàng, miễn là các replica còn lại liên lạc được và protocol chấp nhận quorum đó. Đổi lại, nếu write chưa được xác nhận đủ rộng rồi replica được chọn làm leader bị mất, một read sau đó có thể không thấy write đã được client quan sát ở nơi khác. Một số giao thức chặn read trong lúc cần repair; cách khác có thể trả về phiên bản chưa chắc đơn điệu. Vì vậy cần ghi rõ cả durability sau acknowledgment lẫn hành vi read trong lúc phục hồi.

**Witness replica** giữ metadata cho biết write đã xảy ra thay vì giữ toàn bộ record. Khi quorum có witness nhưng vẫn có ít nhất một copy replica mang dữ liệu, hệ thống có thể khôi phục record từ một bản còn lại và đưa copy replica trở lại trạng thái mới. Witness tiết kiệm dung lượng so với sao chép mọi byte, nhưng không tự phục vụ query cần nội dung dữ liệu. Quy tắc quorum phải bảo đảm quorum đọc có thể tìm được record ở copy hoặc metadata witness đủ để biết phải phục hồi từ đâu.

Trong một thiết kế witness cụ thể, nếu các replica chứa dữ liệu tạm thời không sẵn sàng, witness có thể được nâng cấp tạm thời thành nơi nhận bản dữ liệu để hệ thống vẫn đạt quorum. Khi replica dữ liệu quay lại, dữ liệu được repair rồi witness trở về vai trò metadata. Việc này tiết kiệm dung lượng thường trực, nhưng chỉ an toàn khi protocol xác định rõ lúc nào được promote, dữ liệu nào đã được xác nhận và cách đồng bộ trước khi demote.

CRDT có nhiều kiểu ngoài counter và register. **G-Set** chỉ cho phép thêm phần tử; merge là hợp của hai tập nên không làm mất phần tử đã thấy. Muốn xóa, cần cấu trúc có metadata về add/remove, chẳng hạn observed-remove set; một remove chỉ loại những add mà nó đã quan sát, nên add đồng thời có thể vẫn còn. **CmRDT** truyền operation cần giao hoán và được áp dụng theo quan hệ nhân quả; operation phải có thể áp dụng độc lập mà không tạo side effect ngoài cấu trúc. JSON CRDT mở rộng ý tưởng này tới object, list và field lồng nhau, nhưng đòi hỏi metadata và quy tắc conflict phức tạp hơn. CRDT giúp hội tụ; nó không tự bảo toàn mọi invariant nghiệp vụ.

## Chọn model theo điều người dùng cần thấy

| Câu hỏi sản phẩm | Model hoặc kỹ thuật cần xem xét |
| --- | --- |
| Sau khi thao tác trả thành công, client khác phải thấy nó ngay theo thứ tự thời gian? | Linearizability, với coordination và quorum tương ứng |
| Mọi client cần thấy cùng một thứ tự, nhưng có thể stale so với thời gian thực? | Sequential consistency |
| Bài đăng và phản hồi phải hiện theo quan hệ phụ thuộc? | Causal consistency và context propagation |
| Một người dùng cần đọc lại cập nhật vừa ghi? | Read-your-writes/session token |
| Có thể chấp nhận dữ liệu gần đúng hoặc cập nhật hội tụ sau? | Eventual consistency, cùng conflict/merge policy rõ ràng |

Trước khi chọn, viết một lịch sử nhỏ: client nào ghi gì, request nào trả lời trước, client nào đọc ở đâu và kết quả nào được chấp nhận. Lịch sử đó thường làm lộ ra rằng yêu cầu thực tế là session guarantee, thứ tự nhân quả hay linearizability toàn cục.

## State consistency còn bao gồm schema và membership

Replica dữ liệu có thể hỗ trợ eventual consistency nhưng hệ thống vẫn hỏng nếu các node diễn giải dữ liệu theo metadata khác nhau. Chương 8 kể hai ví dụ từ Cassandra: thay đổi schema lan tới các server ở thời điểm khác nhau, khiến một server encode còn server khác decode theo schema khác; hoặc các node có ring view khác nhau nên gửi key tới sai owner hay kết luận nhầm rằng record không tồn tại. Đây là ví dụ theo phiên bản và bối cảnh của sách; điều cần giữ lại là **dữ liệu và metadata định tuyến/diễn giải dữ liệu đều có consistency contract riêng**.

Một cụm không thể chỉ hỏi “replica đã hội tụ chưa?”. Cần hỏi thêm: mọi node đang dùng schema version nào; membership hoặc ownership epoch nào đang có hiệu lực; query có thể đi qua node chưa áp dụng cấu hình mới không; và lúc rollout một schema thay đổi, node cũ có còn đọc được encoding mới không? Version hóa metadata, kiểm tra schema agreement trước thao tác nhạy cảm và chuyển membership theo epoch là các cách làm rõ ranh giới tương thích. Chúng không thay thế protocol phát tán và xác nhận cấu hình của database.

## Tự kiểm tra

**Một write đã trả thành công trước khi read bắt đầu, nhưng read trả giá trị cũ. Linearizable không?** Không, vì thứ tự thời gian thực buộc read thấy write đó hoặc một write mới hơn.

**Hai write độc lập tới hai replica theo thứ tự khác nhau có vi phạm causal consistency không?** Không nhất thiết; nếu chúng không có quan hệ nhân quả, mỗi replica có thể thấy thứ tự khác. Các thao tác phụ thuộc thì phải giữ thứ tự chung.

**`R + W > N` đảm bảo mọi hệ dùng quorum đều linearizable?** Không. Nó chỉ cho thấy overlap trong mô hình đơn giản; protocol, versioning, concurrent writes và failover quyết định bảo đảm thực tế.

*Database Internals*, chương 11. Bài này đi từ semantics của register qua linearizability, sequential/causal/session/eventual models đến CAP, harvest/yield, tunable quorum, witness và strong eventual consistency.
