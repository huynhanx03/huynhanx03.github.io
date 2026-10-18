---
title: "Failure detection: heartbeat, SWIM, phi và gossip"
category: "Database"
description: "Theo dõi cách hệ phân tán phát hiện process có thể đã dừng, và vì sao kết quả luôn gắn với giả định mạng."
updated: 2026-10-18
translationKey: "database/distributed-failure-detection"
---

Giả sử node A gửi ping tới B. Không có phản hồi sau một giây. Ta biết B đã dừng chưa? Chưa: B có thể crash, nhưng cũng có thể B vẫn chạy trong lúc gói tin hoặc phản hồi bị trễ. Failure detector biến những quan sát không đầy đủ thành một phán đoán có thể sử dụng: node đang **suspect** hay được xem là còn sống.

Điều này tạo ra một đánh đổi. Nếu hệ thống phát hiện nhanh, nó có thể chuyển việc sớm nhưng dễ loại nhầm node còn khỏe. Nếu chờ lâu để giảm báo nhầm, thời gian khôi phục tăng. Trong mô hình bất đồng bộ, không có giới hạn trên đã biết cho độ trễ mạng, nên timeout không thể chứng minh crash.

## Completeness và accuracy

Hai tiêu chí giúp mô tả failure detector:

- **Completeness:** process bị lỗi cuối cùng được một số hoặc tất cả process không lỗi phát hiện.
- **Accuracy:** detector nhận định đúng trạng thái lỗi. Báo một process còn sống là lỗi (**false positive**); không nhận ra process đã lỗi là bỏ sót (**false negative**). Completeness tập trung vào việc mọi process lỗi cuối cùng có bị phát hiện hay không, còn accuracy nhìn vào việc từng nhận định có đúng không.
- **Efficiency:** detector phát hiện process lỗi nhanh đến mức nào. Trong ngữ cảnh này, efficiency nói về độ trễ phát hiện, không phải mức dùng CPU hay số message.

Tùy thuật toán, completeness có thể mạnh hoặc yếu, và accuracy có thể cho phép sai tạm thời. Sách mô tả efficiency và accuracy như một tham số đánh đổi: giảm thời gian chờ giúp phát hiện nhanh hơn nhưng tăng nguy cơ kết luận sai; tăng độ chính xác thường đòi hỏi chờ lâu hơn. Trong mô hình bất đồng bộ, detector không thể vừa chính xác tuyệt đối vừa bảo đảm phát hiện trong một thời gian hữu hạn đã biết. Vì thông tin quan sát chỉ là message, thiết kế thực tế chọn mức đánh đổi phù hợp với hậu quả của từng hành động. “Suspect” vì vậy nên là trạng thái có thể đảo ngược; quyết định loại thành viên hoặc failover cần thêm điều kiện.

Đây là khác biệt giữa **liveness** và **safety**: liveness yêu cầu một việc cần xảy ra cuối cùng, như phát hiện node đã dừng để cụm tiếp tục; safety ngăn việc sai xảy ra, như loại nhầm node còn sống rồi cấp quyền ghi cho hai leader. Tăng tốc phát hiện thường giúp liveness nhưng tăng false positive, làm yếu safety. Trong asynchronous model, không thể vừa bảo đảm detector luôn chính xác vừa phát hiện trong một thời gian hữu hạn đã biết; một số giao thức vẫn tiến triển dù detector mắc vô hạn lỗi, miễn là các điều kiện khác của protocol thỏa mãn.

## Ping, heartbeat và timeout

Với **ping**, A chủ động hỏi B rồi đợi acknowledgment. Với **heartbeat**, B chủ động gửi tín hiệu định kỳ. Cả hai có thể được triển khai bằng message request/response; điểm khác là ai khởi tạo lần kiểm tra.

Ví dụ, B gửi heartbeat mỗi 500 ms. A đánh dấu B là suspect nếu 1.5 giây không có heartbeat. Nếu một đợt GC pause kéo dài 1.7 giây, A sẽ nghi B chết dù B vẫn còn chạy. Tăng ngưỡng lên 5 giây giảm trường hợp này nhưng làm phát hiện crash chậm thêm. Một timeout cố định cũng không phản ánh được mạng vốn có nhịp trễ thay đổi theo tải.

Failure detector dựa trên deadline rất dễ triển khai: ghi thời điểm nhận heartbeat gần nhất và so với deadline. Khi quá hạn, gọi callback để cảnh báo hoặc bắt đầu failover. Callback không nên tự cấp quyền ghi cho leader mới nếu hệ thống chưa fencing quyền cũ.

## Ping gián tiếp và heartbeat được ủy quyền

Một lỗi có thể nằm trên đường A–B chứ không nằm ở B. SWIM xử lý bằng **indirect probe**. A thử ping B trực tiếp; nếu hết thời gian, A nhờ một số peer ngẫu nhiên C và D ping B hộ. Nếu một peer nhận được phản hồi, nó chuyển acknowledgment về A. Khi đó, đường trực tiếp A–B có vấn đề nhưng B vẫn có thể được cụm nhìn thấy qua đường khác.

Luồng đơn giản:

1. A gửi `PING(B)`.
2. Không nhận `ACK` đúng hạn, A gửi `PING_REQ(B)` cho một vài peer.
3. C gửi ping tới B; nếu B trả lời, C báo kết quả cho A.
4. Chỉ khi các probe gián tiếp cũng thất bại, A mới phát tán suspicion.

Việc thử qua peer tăng thêm message và một chút thời gian chờ, nhưng giúp phân biệt node không phản hồi với một link bị lỗi. Chọn nhiều peer hơn tăng cơ hội tìm được đường tốt, đồng thời tăng traffic. Đây là kiểm tra reachability theo nhiều đường, không phải phép đo chắc chắn process có khỏe về mọi mặt hay không.

## Phi-accrual: mức nghi ngờ thay cho một ngưỡng cứng

Sách mô tả cách ước lượng bằng cửa sổ có kích thước cố định: giữ các khoảng đến heartbeat gần đây, tính trung bình và phương sai, rồi dùng phân phối giả định để ước tính xác suất heartbeat tiếp theo đã đến trong khoảng `t`. Từ xác suất đuôi đó tính φ; φ tăng khi khoảng im lặng hiện tại ngày càng hiếm theo mẫu. Đây là mô hình thống kê của detector, không phải xác suất thật rằng node đã crash. Nếu nhịp heartbeat có đuôi dài, thay đổi đột ngột hoặc không gần phân phối giả định, mẫu và ngưỡng cần được đánh giá lại.

Một deadline cố định nói “quá 1.5 giây là suspect”. Phi-accrual detector giữ cửa sổ các khoảng thời gian heartbeat gần đây, ước lượng phân phối thời gian đến, rồi tính mức độ bất ngờ của khoảng im lặng hiện tại. Một cách biểu diễn phổ biến là:

`φ(t) = -log10(P(T > t))`

Trong đó `T` là thời gian giữa hai heartbeat, còn `t` là thời gian đã trôi qua kể từ heartbeat gần nhất. Nếu theo dữ liệu quan sát, 0.8 giây trễ xảy ra thường xuyên, điểm φ còn thấp; nếu 10 giây gần như chưa từng xảy ra, φ tăng. Ứng dụng chọn ngưỡng φ theo mức chấp nhận báo nhầm và độ trễ failover.

Ta có thể xem cơ chế thành ba phần: **monitoring** thu thập thời điểm; **interpretation** tính suspicion; **action** phản ứng khi điểm vượt ngưỡng. Tách ba phần này cho phép cùng một tín hiệu được dùng khác nhau: dashboard có thể cảnh báo ở ngưỡng thấp, trong khi loại node khỏi quorum cần ngưỡng và điều kiện chặt hơn.

Điểm φ không phải xác suất crash được đảm bảo chính xác. Nó là mức bất thường theo mô hình và mẫu heartbeat đã thu thập. Nếu workload đổi đột ngột, cửa sổ quá ngắn hoặc phân phối giả định không hợp lý, kết quả có thể lệch. Phi giúp biểu diễn mức nghi ngờ liên tục; nó không loại bỏ bất định của mạng.

## Heartbeat không dùng timeout

Chương sách cũng mô tả một hướng nghiên cứu timeout-free: process lan truyền heartbeat cùng đường đi và bộ đếm qua các fair links. Một fair link bảo đảm rằng nếu message được gửi qua nó vô hạn lần thì vô hạn message cuối cùng cũng tới nơi. Với giả định mọi cặp process khỏe có một fair path nối nhau và mỗi process biết toàn bộ membership, bộ đếm tương đối có thể cho biết tiến triển ngay cả khi một kết nối trực tiếp bị lỗi.

Một heartbeat mang ID duy nhất và danh sách các process mà nó đã đi qua. Khi nhận heartbeat chưa thấy, process tăng counter cho các process có trong đường đi, thêm ID của mình rồi chuyển tiếp tới các neighbor chưa xuất hiện trong path. Khi path đã bao gồm toàn bộ membership, heartbeat đó không cần tiếp tục lan. ID giúp node loại message lặp; path cho biết các process nào đã góp phần chuyển thông tin.

Ví dụ, A không gửi trực tiếp được tới C nhưng cả A–B và B–C là fair link. Heartbeat đi theo A–B–C vẫn có thể lan qua nhóm và mang theo counter/path để node cập nhật tiến triển quan sát được; lỗi link A–C không đồng nghĩa C đã dừng. Cơ chế này không đặt deadline để kết luận suspect. Nó dựa vào giả định fair path và vào so sánh counter tích lũy giữa process, nên khi một process thật sự dừng, tiến triển của nó cuối cùng sẽ khác các process còn hoạt động.

Đổi lại, giả định này mạnh: membership đầy đủ, đường truyền công bằng và thông tin heartbeat được lan truyền đủ để so sánh. Ý nghĩa của ví dụ là “không dùng đồng hồ” không làm bài toán biến mất; nó thay timeout bằng giả định về đường truyền, topology và tiến triển. Phương án này hữu ích để hiểu các mô hình hệ thống, không nên bê nguyên vào một cluster có membership động mà không kiểm tra giả định.

## Gossip: nhiều góc nhìn cùng đóng góp

Trong mô hình sách trình bày, mỗi node trao đổi với một peer ngẫu nhiên theo chu kỳ; mức trao đổi tối đa được chặn và tăng không quá tuyến tính theo số thành viên. Cách đó rẻ hơn broadcast cả bảng cho toàn cụm ở mọi vòng, nhưng khi cụm lớn thì tổng traffic nền vẫn tăng theo quy mô và trạng thái hội tụ chậm hơn một lần broadcast.

Trong gossip failure detection, mỗi thành viên giữ bảng trạng thái như heartbeat counter và thời điểm cập nhật cuối. Theo chu kỳ, node tăng counter của mình, gửi một phần bảng cho peer ngẫu nhiên, rồi hợp nhất thông tin nhận được. Nếu B không tăng counter lâu hơn ngưỡng, các node dần đánh dấu B là suspect hoặc failed.

Giả sử A không liên lạc được với C nhưng B vẫn nhận heartbeat từ C. B có thể lan trạng thái mới của C sang A. A vì vậy không kết luận C chết chỉ từ link A–C. Thông tin hội tụ dần, nên hai node có thể tạm thời có membership view khác nhau. Incarnation number hoặc sequence number giúp nhận biết báo cáo mới hơn và để node còn sống phản bác thông tin cũ.

Gossip giới hạn số peer mỗi vòng nên tránh broadcast toàn cụm ở mọi nhịp. Đổi lại, cập nhật không xuất hiện cùng lúc ở mọi nơi; cần thời gian để hội tụ và thêm traffic nền. Correlated congestion cũng có thể làm nhiều heartbeat cùng trễ, khiến một loạt node bị nghi đồng thời.

## Lan truyền lỗi bằng sự im lặng: FUSE

Một thiết kế khác trong sách là FUSE. Thay vì gửi thông báo lỗi đến mọi process, các process được tổ chức thành nhóm và dùng khả năng trả lời ping để lan truyền sự cố. Nếu A không thể nhận câu trả lời từ B, A cũng ngừng trả lời ping mà các thành viên khác gửi tới A. Sau đó họ tiếp tục quan sát sự im lặng và lan trạng thái nhóm.

Cách làm này biến lỗi riêng lẻ thành tín hiệu nhóm mà các thành viên cuối cùng có thể cùng quan sát, kể cả khi thông báo trực tiếp khó đi qua một partition. Nhưng một link hỏng cũng có thể khởi phát phản ứng dây chuyền như thể cả nhóm có vấn đề. “Tất cả cùng biết” có giá phải trả là nhiều thành viên có thể bị loại khỏi dịch vụ. Nó chỉ hợp khi ứng dụng định nghĩa group failure theo đúng cách đó và chấp nhận đánh đổi khả dụng.

## Dùng suspicion đúng cách

Các thuật toán trong chương giả định process không cố ý gửi thông tin giả về mình hoặc neighbor; chúng không phải detector chống Byzantine. Nếu node có thể nói dối có chủ đích, một heartbeat hợp lệ về hình thức không đủ để xác nhận state hoặc danh tính của nó.

Một hệ thống thường cần tách các trạng thái `alive`, `suspect`, `dead/removed` thay vì biến một timeout thành xóa thành viên ngay. Khi suspicion xuất hiện, có thể thu thập probe gián tiếp hoặc chờ gossip phản bác. Nếu sau đó cần thay leader, dùng term/epoch mới và yêu cầu nơi nhận ghi kiểm tra token. Như vậy node cũ dù chỉ bị cô lập cũng không thể tiếp tục ghi với quyền hết hạn.

Hãy quan sát ít nhất thời gian heartbeat, timeout/phi, tỷ lệ suspicion bị bác bỏ, độ trễ hội tụ membership, số lần đổi leader và thời gian failover. Chỉ nhìn số node “up” sẽ che mất trường hợp cụm đang flapping do mạng chậm.

## Tự kiểm tra

**A ping timeout có đủ để loại B khỏi cluster không?** Chưa. Nó cho biết A chưa nhận phản hồi đúng hạn. Thử gián tiếp hoặc thông tin từ peer có thể làm rõ reachability; quyền loại thành viên còn tùy giao thức.

**Nếu tăng ngưỡng φ, điều gì thường đổi?** Báo nhầm có thể giảm vì hệ thống chờ lâu hơn trước khi suspicion cao, nhưng crash được phản ứng chậm hơn.

**Vì sao gossip có thể cứu một node khỏi nghi ngờ sai?** Một peer khác có thể quan sát heartbeat mới của node đó và lan thông tin mới hơn qua đường mạng khác.

*Database Internals*, chương 9. Các phần timeout-free, outsourced heartbeat, phi-accrual, gossip và FUSE được giải thích theo giả định của từng cơ chế; các ví dụ trên dùng để so sánh cách quan sát và cách lan truyền suspicion.
