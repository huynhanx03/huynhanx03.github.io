# Quy tắc hành văn cho hệ thống notes

Ngày thống nhất: 2026-10-15.

Phiên bản 2.1 — đối chiếu hướng dẫn viết giáo trình, viết kỹ thuật và nghiên cứu học tập (nguồn ở mục 15). Đây là quy ước riêng của hệ thống, không phải tiêu chuẩn quốc tế hay phương pháp được mọi tác giả sách sử dụng. Khi các gợi ý trình bày xung đột, ưu tiên hiểu đúng và mạch đọc tự nhiên; không cố đáp ứng mọi gợi ý trong cùng một bài.

## Bản dùng nhanh

1. Biết đang viết cho ai, họ đã biết gì và đọc xong cần làm được gì.
2. Dẫn từ một vấn đề có thể hình dung đến cơ chế chính xác; giữ những bước suy luận người mới chưa tự nối được.
3. Với điểm khó, giải thích diễn biến, nguyên nhân, điều kiện và hệ quả bằng ví dụ có chủ đích.
4. Tổ chức độ sâu theo nhu cầu đọc. Giữ kiến thức cần thiết; không kéo dài để đủ mục hay rút gọn đến mất ý.
5. Dùng giọng người giải thích: chủ thể rõ, câu tự nhiên, thuật ngữ nhất quán, không lời quảng bá và câu đệm hàng loạt.
6. Đối chiếu chữ, code, hình và nguồn; ghi nhận đúng những gì đã kiểm chứng hoặc đã thay đổi.

Các mục bên dưới giải thích cách áp dụng. Không đưa nguyên bộ checklist vào nội dung bài học.

## 1. Mục tiêu và phạm vi

Áp dụng khi viết mới, dịch hoặc chỉnh sửa notes trong hệ thống: thuật toán, Go, database, messaging, kiến trúc và các chủ đề kỹ thuật khác.

Notes cần đọc như một người hiểu rõ vấn đề đang kiên nhẫn giải thích: tự nhiên, có mạch dẫn, chính xác và đủ chi tiết để người đọc hiểu nguyên nhân rồi tự áp dụng.

Ưu tiên theo thứ tự: **đúng kiến thức → dễ hiểu → đủ ngữ cảnh → gọn gàng**. Không rút ngắn bằng cách bỏ mất bước suy luận; cũng không kéo dài bằng cách lặp ý.

Đây là quy tắc biên tập, không phải khuôn mục lục bắt buộc. Cấu trúc từng bài phục vụ nội dung của bài đó.

### Xác định người đọc trước khi viết

Trước khi soạn bài, người viết tự xác định ba điều: người đọc đã biết gì, thường hiểu sai chỗ nào và sau bài cần làm được gì. Đây là ghi chú biên tập; không bắt buộc đưa thành một khung thông tin ở đầu mỗi bài.

Mục tiêu nên quan sát được. Ví dụ: “dự đoán được khi nào hai slice còn chia sẻ dữ liệu” rõ hơn “hiểu sâu về slice”. Không hứa một bài sẽ giúp mọi người từ chưa biết gì đến thành thạo toàn bộ chủ đề.

### Chọn đúng loại bài

| Loại bài | Người đọc đang cần | Cách viết phù hợp |
| --- | --- | --- |
| Bài học | Xây dựng cách hiểu mới | Dẫn dắt, ví dụ được giải thích, tăng dần độ khó |
| Hướng dẫn thao tác | Hoàn thành một việc cụ thể | Điều kiện đầu vào, các bước, kết quả nhận biết được và cách xử lý lỗi thường gặp |
| Bài phân tích | Hiểu cơ chế hoặc chọn giữa các cách làm | Giả định, quan hệ nguyên nhân, bằng chứng và đánh đổi |
| Tài liệu tra cứu | Tìm lại một thông tin nhanh | Mục rõ ràng, mô tả chính xác, ví dụ ngắn và liên kết đến bài giải thích |

Phân loại trên là cách dùng riêng của hệ thống, có tham khảo [Diátaxis](https://www.diataxis.fr/start-here/). Trong Diátaxis, tutorial là trải nghiệm học có thực hành; explanation phục vụ hiểu bản chất; how-to giúp người đã có nền tảng hoàn thành việc; reference phục vụ tra cứu. Vì vậy, một bài giảng giải thuần chữ không tự động là tutorial.

Một chương notes có thể chứa các phần phục vụ những nhu cầu khác nhau, nhưng cần giữ ranh giới và mục đích rõ. Bảng API dài có thể tách sang phần tra cứu thay vì chen giữa mạch giải thích. Đây là lựa chọn biên tập, không yêu cầu thêm category hay giao diện mới.

## 2. Giọng văn

- Viết rõ ràng, gần gũi, điềm đạm. Giải thích như một người đồng nghiệp có kinh nghiệm, sẵn sàng chỉ ra cả phần dễ nhầm.
- Dùng “ta” khi cùng theo dõi ví dụ; dùng “bạn” khi hướng dẫn người đọc thử hoặc suy nghĩ. Không cần đại từ trong mọi câu.
- Không đặt người đọc ở vị trí kém hiểu biết. Tránh “hiển nhiên”, “quá đơn giản”, “ai cũng biết”, “chỉ cần” ở những chỗ còn nhiều điều kiện.
- Không quảng bá kiến thức bằng “cực kỳ mạnh mẽ”, “chinh phục”, “khám phá sức mạnh”, “bí kíp tối thượng”. Cho thấy giá trị bằng tình huống và cách giải quyết.
- Tránh câu dẫn có thể gắn vào bất kỳ bài nào. Nêu thẳng vấn đề cụ thể của phần đang viết.
- Có thể dùng câu hỏi tự nhiên để chuyển ý, nhưng không biến mọi đoạn thành hỏi rồi tự trả lời.

## 3. Cách dẫn dắt kiến thức

### Bắt đầu từ điều có thể hình dung

Khi chủ đề còn xa lạ, mở bằng một tình huống hoặc ví dụ nhỏ trước khi đưa nhiều thuật ngữ. Nếu người đọc đã có nền tảng cần thiết, có thể đi thẳng vào vấn đề; không phải bài nào cũng cần một câu chuyện mở đầu.

Hướng dẫn hữu ích khi giới thiệu khái niệm mới:

> Tình huống cụ thể → quan sát → giải thích trực giác → khái niệm chính xác → cách áp dụng và giới hạn.

Đây là hướng suy nghĩ khi viết, không phải chuỗi tiêu đề phải xuất hiện trong bài.

### Nối phần sau với điều vừa hiểu

Trước mỗi phần, xác định người đọc đã biết gì và đang thiếu bước nào. Dẫn sang phần tiếp theo bằng quan hệ thật: nguyên nhân, hệ quả, trường hợp khác hoặc giới hạn vừa xuất hiện.

Ví dụ:

> Trường hợp trên vẫn còn chỗ trong array. Bây giờ, ta giữ nguyên dữ liệu nhưng giới hạn capacity để xem `append` xử lý thế nào.

Không chuyển từ một định nghĩa sang một định nghĩa khác mà thiếu lời giải thích chúng liên quan ra sao.

### Giải thích đủ bước suy luận

Với hành vi quan trọng, làm rõ:

- Điều gì xảy ra?
- Vì sao xảy ra?
- Điều đó đúng trong điều kiện nào?
- Người sử dụng cần chú ý hệ quả gì?

Không nhất thiết trả lời bằng bốn mục riêng. Đưa các ý vào lời giải thích ở đúng vị trí người đọc cần.

### Tăng độ khó có chủ đích

Ở lần giới thiệu đầu, chọn trường hợp dễ theo dõi nhưng vẫn đúng. Khi bổ sung một yếu tố mới, nói rõ nó thay đổi điều gì so với trường hợp trước. Không bắt người đọc đồng thời học cú pháp lạ, bài toán lạ và cơ chế mới nếu chúng không cần thiết cho nhau.

Có thể dùng một ví dụ đã giải thích đầy đủ, tiếp theo là biến thể cần người đọc dự đoán, rồi đến tình huống tự áp dụng. Chỉ dùng nhịp này khi hữu ích; không biến thành ba phần bắt buộc ở mọi bài.

### Xử lý cách hiểu sai bằng tình huống cụ thể

Thay “đừng nhầm A với B” bằng một trường hợp cho thấy hai thứ dẫn tới kết quả khác nhau. Một phản ví dụ nhỏ thường giúp làm rõ ranh giới của khái niệm.

Ví dụ: sau khi giải thích cancel, cho thấy caller vẫn cần chờ worker kết thúc. Như vậy người đọc thấy được sự khác nhau giữa yêu cầu dừng và xác nhận đã dừng, thay vì chỉ ghi nhớ hai định nghĩa.

### Giúp người đọc tự suy ra trường hợp mới

Sau ví dụ, chỉ ra quy tắc nào giải thích kết quả và dữ liệu nào chỉ là lựa chọn minh họa. Người đọc cần biết điều gì vẫn đúng khi thay tên biến, số lượng phần tử hoặc bối cảnh sử dụng.

Với các đoạn giải thích trạng thái, làm rõ trạng thái ban đầu, thao tác, trạng thái sau và lý do chuyển trạng thái. Với thuật toán, giải thích tính chất được duy trì và lý do dừng khi cần chứng minh tính đúng đắn. Với service, chỉ rõ thành phần giữ dữ liệu, thời điểm thay đổi được xác nhận và phần thông tin mỗi bên thực sự biết. Chỉ chọn những yếu tố liên quan; không ép các chủ đề vào cùng một sơ đồ.

Không dùng output của một ví dụ để chứng minh một quy tắc tổng quát. Ví dụ giúp quan sát; quy tắc, lập luận hoặc bằng chứng phù hợp mới giải thích vì sao có thể áp dụng rộng hơn.

## 4. Câu và đoạn văn

- Mỗi đoạn tập trung vào một ý chính. Tách đoạn khi chuyển sang nguyên nhân, trường hợp khác hoặc hệ quả đáng chú ý.
- Câu mở đoạn cần định hướng đúng điều đoạn sắp giải thích. Có thể bắt đầu bằng kết luận, tình huống hoặc câu hỏi; không bắt buộc cùng một dạng câu. Đây là điểm đối chiếu từ [Google Technical Writing: Paragraphs](https://developers.google.com/tech-writing/one/paragraphs).
- Ưu tiên câu có chủ thể và hành động rõ: ai gửi, ai nhận, biến nào đổi, dữ liệu nằm ở đâu.
- Khi có nhiều đối tượng, nhắc lại tên đối tượng thay vì dùng “nó”, “cái này”, “bên đó” khiến người đọc phải đoán.
- Dùng từ quen thuộc khi vẫn diễn đạt đúng. Không thay độ chính xác bằng từ mơ hồ như “tối ưu hơn”, “nhanh hơn”, “an toàn hơn” mà thiếu tiêu chí.
- Độ dài câu và đoạn tùy ý nghĩa. Không ngắt mọi câu thành một đoạn, cũng không gom nhiều ý thành một khối dài.
- Chỉ nhắc lại khi giúp kết nối, khái quát hoặc kiểm tra cách hiểu, chẳng hạn sau một đoạn khó. Tránh lặp cùng kết luận ở đầu mục, sau code và cuối mục bằng những cách diễn đạt khác nhau.
- Dùng câu chuyển ý khi cần nối lập luận. Bỏ các cụm như “điều quan trọng cần lưu ý là” nếu có thể nêu thẳng điều cần lưu ý.
- Diễn đạt trực tiếp điều đang xảy ra. Tránh lặp kiểu câu “không phải X, mà là Y” khi chưa có hiểu nhầm cụ thể cần sửa.
- Giọng tự nhiên không đồng nghĩa với thêm tiếng lóng, lời đùa hoặc câu cảm thán. Chỉ dùng chúng khi hợp ngữ cảnh và không làm mờ ý nghĩa kỹ thuật.

## 5. Thuật ngữ, định nghĩa và ví von

- Giải nghĩa thuật ngữ khi xuất hiện lần đầu, ngay gần chỗ sử dụng. Nêu kiến thức cần biết trước nếu bài phụ thuộc vào khái niệm đã học.
- Giữ thuật ngữ phổ biến bằng tiếng Anh khi dịch sẽ khó tra cứu hoặc gây hiểu nhầm; phần giải thích xung quanh dùng tiếng Việt tự nhiên.
- Dùng cùng một tên cho cùng một khái niệm trong bài và giữa các bài. Phân biệt rõ những từ gần nghĩa nhưng khác bản chất.
- Định nghĩa cần chính xác sau phần trực giác. Ví dụ không thay thế hoàn toàn cho định nghĩa.
- Ví von chỉ hỗ trợ một quan hệ cụ thể. Quay lại cơ chế thật và nói rõ giới hạn nếu phép ví von dễ dẫn đến suy luận sai.
- Không nhân cách hóa hệ thống đến mức che mất cơ chế: thay “GC biết đối tượng không cần nữa” bằng giải thích về khả năng truy cập đối tượng.

## 6. Ví dụ và code

### Mỗi ví dụ có một mục đích

Nói rõ ví dụ đang giúp hiểu điều gì. Dùng dữ liệu nhỏ, tên có nghĩa và ít chi tiết phụ. Có thể giữ một ví dụ xuyên suốt để mỗi lần chỉ thay một yếu tố.

Đặt code sau khi người đọc hiểu mục đích. Sau code, giải thích nguyên nhân và điểm dễ nhầm; không diễn đạt lại từng dòng đã rõ nghĩa.

### Cung cấp đủ ngữ cảnh

- Phân biệt chương trình hoàn chỉnh, đoạn trích và mã giả.
- Với đoạn trích, làm rõ biến/dependency được cung cấp từ đâu và giả định nào cần có. Nêu import, phiên bản hoặc cách ghép nếu người đọc cần chúng để sử dụng.
- Cho input và output khi chúng giúp kiểm chứng cách hiểu. Với kết quả không cố định, giải thích phần nào có thể thay đổi.
- Không gọi kết quả dự kiến là kết quả đã chạy. Ghi nhận kiểm chứng đúng với việc thực sự đã làm.
- Nêu giới hạn có ảnh hưởng trực tiếp: miền dữ liệu, tràn số, nil, thứ tự xử lý, quyền đóng channel, đồng bộ hoặc hủy công việc.
- Đặt điều kiện sát khẳng định cần nó. Giới hạn chưa liên quan đến mục tiêu ví dụ có thể chuyển sang phần đào sâu; không dồn mọi ngoại lệ vào đoạn mở đầu.
- Không biến ví dụ một ý thành chương trình production dài. Nếu lược bỏ xử lý quan trọng, nói rõ giới hạn ngay gần ví dụ.
- Không đưa ví dụ sai mà thiếu nhãn hoặc thiếu phần sửa.

### Chọn trường hợp đủ sức giải thích

Trường hợp thông thường giúp hiểu đường đi chính. Trường hợp biên hoặc phản ví dụ giúp hiểu giới hạn. Chọn chúng theo rủi ro hiểu sai của bài; không thêm mọi trường hợp chỉ để có vẻ đầy đủ.

Nếu một ví dụ quá thuận lợi che mất bản chất, thêm biến thể làm lộ điểm đó: giá trị trùng khi so sánh, dữ liệu rỗng khi truy cập phần tử đầu, hoặc nhận trùng khi giải thích xử lý message. Cho biết biến thể đang kiểm tra điều gì.

Với tác vụ đồng thời, phân tán hoặc kết quả ngẫu nhiên, có thể mô tả một lịch diễn ra hợp lệ để phân tích. Ghi rõ đó là một khả năng, không phải thứ tự luôn xảy ra. Nếu đưa số đo, giữ đủ môi trường và phương pháp để người đọc hiểu phạm vi kết luận.

### Khi giải thích lỗi

Cho thấy tình huống gây lỗi, giải thích nguyên nhân rồi trình bày cách sửa và điều kiện áp dụng. Phân biệt rõ lỗi biên dịch, panic, data race, lỗi logic và giới hạn hiệu năng khi có liên quan.

## 7. Độ sâu và cấu trúc bài

Nền tảng xuất hiện trước phần đào sâu. Người đọc cần hiểu hành vi cơ bản trước khi theo chi tiết triển khai, tối ưu hoặc ngoại lệ.

Một bài thường cần giải đáp: vấn đề là gì, cơ chế hoạt động ra sao, sử dụng thế nào, dễ sai ở đâu và khi nào nên chọn cách khác. Không bắt buộc tách mỗi câu thành một mục.

- Tiêu đề nói rõ nội dung hoặc câu hỏi được giải quyết. Tránh tiêu đề chung chung lặp lại như “Sức mạnh”, “Ứng dụng tuyệt vời”.
- Đưa chi tiết nâng cao vào phần riêng hoặc phần có thể thu gọn khi phù hợp. Ghi rõ vì sao người đọc có thể muốn tìm hiểu thêm.
- Bài ngắn không cần bị kéo dài để đủ mẫu. Bài dài cần được chia theo mạch kiến thức, không cắt tùy tiện theo số chữ.
- Cuối bài chốt những điều có thể vận dụng. Câu hỏi ôn tập nên kiểm tra suy luận hoặc khả năng áp dụng, không chỉ yêu cầu nhắc lại định nghĩa.
- Với câu hỏi tự học, cung cấp đáp án hoặc gợi ý giải thích ở vị trí có thể xem sau khi thử. Câu hỏi mở có thể có nhiều đáp án; cần nêu tiêu chí lập luận thay vì tạo cảm giác chỉ có một câu trả lời đúng.
- Liên kết bài trước hoặc bài tiếp theo khi có quan hệ học tập cụ thể; nói rõ người đọc sẽ tìm thấy gì.

Điều chỉnh theo chủ đề:

| Chủ đề | Mạch giải thích thường phù hợp |
| --- | --- |
| DSA | Bài toán, trạng thái, từng bước xử lý, vì sao đúng, độ phức tạp và trường hợp biên |
| Go/ngôn ngữ | Hành vi quan sát được, quy tắc ngôn ngữ, mô hình giải thích, cách dùng và lỗi thường gặp |
| Database/messaging/service | Luồng bình thường, trạng thái dữ liệu, sự cố, phục hồi và đánh đổi |

### Viết đủ trong phạm vi đã chọn

“Đầy đủ” được đánh giá theo mục tiêu và phạm vi bài, không theo độ dài hoặc số mục. Không thể hiện một bài nhập môn như đã bao phủ toàn bộ chủ đề. Khi phần cần thiết quá lớn, chia thành các bài có quan hệ rõ ràng và dẫn người đọc đến đúng phần tiếp theo.

Với một quyết định kỹ thuật, nêu bối cảnh khiến quyết định hợp lý và điều phải đánh đổi. Khi cần so sánh, chọn những phương án thực sự cùng giải quyết một nhu cầu; so trên cùng giả định và tiêu chí. Có thể kết luận “chưa đủ dữ liệu để chọn” thay vì ép một phương án thành tốt nhất.

### Mục tiêu, lời giải thích và bài tự kiểm tra phải khớp nhau

Đây là cách hệ thống vận dụng hướng dẫn về giáo trình lấy người học làm trung tâm từ [Open Education Network và Stefanie Buck](https://manifold.open.umn.edu/read/a-guide-to-open-textbook-essential-and-exemplary-features/section/c27f13c0-37c7-44c6-bfdc-a53faad41a14).

Nếu mục tiêu là dự đoán hành vi `append`, bài cần có ví dụ cho phép theo dõi array và capacity, rồi một biến thể để người đọc tự dự đoán. Câu hỏi “slice là gì?” chưa kiểm tra được mục tiêu ấy. Nếu mục tiêu là chọn giải pháp, cần tình huống có ràng buộc và lời giải nêu đánh đổi, không chỉ bài nhắc lại định nghĩa.

Với nhiều bài liên tiếp, kiến thức cần dùng phải xuất hiện trước hoặc có đường dẫn học bù rõ ràng. Thống nhất ký hiệu, cách gọi và ý nghĩa các thành phần trình bày; sự nhất quán giúp định hướng, còn mạch diễn giải vẫn linh hoạt theo từng bài.

### Hỗ trợ người đọc thực sự nhớ và vận dụng

[IES/What Works Clearinghouse](https://ies.ed.gov/ncee/wwc/PracticeGuide/1) khuyến nghị phối hợp ví dụ có lời giải với bài tự làm, kết nối biểu diễn cụ thể–trừu tượng, phối hợp hình và lời, tự nhớ lại kiến thức và phân bố việc học theo thời gian. Các khuyến nghị có mức bằng chứng khác nhau; không suy thành bảo đảm hiệu quả cho mọi bài notes.

Quy ước áp dụng của hệ thống:

- Với thao tác nhiều bước, giải thích một lời giải mẫu rồi cho biến thể phù hợp để tự làm; tránh đưa đáp án ngay trước lúc người đọc thử.
- Khi quay lại kiến thức ở bài sau, có thể dùng một câu hỏi ngắn yêu cầu tự nhớ và giải thích trước khi mở đáp án. Không bắt mọi bài có cùng số câu hỏi hoặc lịch ôn cố định.
- Hỏi “vì sao kết quả này xảy ra?” và cho cách đối chiếu lập luận. Nếu trả lời sai, chỉ ra quy tắc bị hiểu nhầm rồi dẫn lại ví dụ liên quan.
- Khi chuyển từ dữ liệu cụ thể sang ký hiệu, công thức hoặc sơ đồ, chỉ rõ mỗi thành phần tương ứng với điều gì. Đừng để người đọc phải tự đoán quan hệ giữa các cách biểu diễn.
- Mời tự giải thích ở những điểm có giá trị, tránh ngắt liên tục mạch đọc bằng tương tác bắt buộc. Đây là lựa chọn biên tập cho hệ thống.

## 8. Visualization và cách trình bày

- Đặt minh họa gần đoạn cần quan sát. Cho người đọc biết nên nhìn trạng thái nào và thay đổi nào cần chú ý.
- Giữ tên, màu có ý nghĩa, dữ liệu và thuật ngữ nhất quán giữa lời giải thích, code và visualization.
- Có thể mời người đọc dự đoán rồi bấm bước tiếp theo khi việc dự đoán giúp hiểu cơ chế. Không lặp lời mời trong mọi mục.
- Phần chữ vẫn phải giải thích được ý chính khi người đọc chưa chạy minh họa.
- Không dựa vào màu sắc hoặc chuyển động để truyền tải toàn bộ ý nghĩa. Dùng nhãn, trạng thái hoặc lời giải thích để người đọc vẫn theo dõi được khi không phân biệt màu hay không xem animation.
- Sơ đồ cần cho biết mũi tên biểu thị điều gì, các bước có theo thời gian hay không và có lược bỏ thành phần nào ảnh hưởng cách hiểu không. Đừng để bố cục ngầm tạo ra bảo đảm thứ tự hoặc chia sẻ dữ liệu mà nội dung không có.
- Dùng bảng để so sánh hoặc theo dõi trạng thái; dùng danh sách cho các ý độc lập hoặc bước thao tác; dùng đoạn văn cho lập luận có quan hệ.
- Chỉ dùng callout cho cảnh báo, điều kiện hoặc điểm dễ nhầm đáng chú ý. Chữ đậm nhấn ý cần nhớ, không tô đậm gần hết bài.

## 9. Độ chính xác và nguồn

- Phân biệt quy tắc được bảo đảm với mô hình đơn giản hóa, chi tiết triển khai và nhận xét dựa trên đo đạc.
- Ghi phiên bản khi hành vi phụ thuộc phiên bản. Không dùng từ “mới nhất” cho một phiên bản cố định trong nội dung lâu dài.
- Nêu điều kiện đi kèm các khẳng định về hiệu năng, tính đúng đắn và độ an toàn. Không đưa số liệu không có căn cứ.
- Ưu tiên nguồn gốc như tài liệu chính thức, đặc tả, mã nguồn hoặc công trình gốc khi cần đối chiếu kỹ thuật.
- Gắn nguồn gần khẳng định cần đối chiếu; cuối bài có thể gom tài liệu đọc tiếp. Không gắn nguồn như thể đã kiểm chứng nếu chưa đọc.
- Diễn giải bằng lời của mình, giữ đúng ý nghĩa và ghi nguồn phù hợp. Không sao chép dài từ sách hoặc tài liệu.

Phân biệt rõ trong cách diễn đạt:

| Loại nội dung | Cách trình bày |
| --- | --- |
| Quy tắc hoặc cam kết có tài liệu | Nêu phạm vi và nguồn hỗ trợ |
| Mô hình để dễ hình dung | Nói rõ phần được đơn giản hóa khi nó có thể ảnh hưởng suy luận |
| Chi tiết triển khai | Gắn với phiên bản hoặc mã nguồn thích hợp |
| Khuyến nghị của bài | Nêu lý do, điều kiện và đánh đổi |
| Kết quả đo hoặc suy luận | Phân biệt điều quan sát được với kết luận rút ra |

Không cần gắn nhãn cho mọi câu. Mục tiêu là để người đọc nhận biết mức độ bảo đảm. Với điểm chưa kiểm chứng, xác minh trước khi dùng làm nền tảng cho phần giải thích; nếu phải giữ một điểm chưa chắc, nêu đúng giới hạn đó.

## 10. Bản Việt và bản Anh

- Giữ cùng ý nghĩa, điều kiện, mức độ chi tiết và ví dụ. Không biến một bản thành tóm tắt của bản còn lại nếu chưa được yêu cầu.
- Dịch theo cách diễn đạt tự nhiên của từng ngôn ngữ, không bám thứ tự từ của câu gốc.
- Code và kết quả tương ứng phải nhất quán. Khi cần khác biệt để phù hợp ngôn ngữ, giữ nguyên mục đích và hành vi của ví dụ.
- Sửa kiến thức hoặc giới hạn trong một bản phải được phản ánh sang bản còn lại.

## 11. Khi chỉnh sửa notes đã có

- Đọc nội dung cũ và xác định các ý cần giữ trước khi viết lại.
- Có thể gộp đoạn lặp hoặc thay cách giải thích, nhưng phải giữ ý nghĩa và điều kiện quan trọng.
- Nếu bỏ kiến thức, ví dụ hoặc thay khẳng định sai, ghi lại phần thay đổi và lý do trong báo cáo. Không nói “không bỏ gì” khi thực tế đã rút gọn nội dung.
- Không thêm các phần có hình thức giống nhau vào mọi bài chỉ để đủ cấu trúc.
- Phân biệt báo cáo “đã sửa nội dung”, “đã build” và “đã chạy code ví dụ”. Không dùng kết quả của việc này để khẳng định việc khác đã được kiểm chứng.

Với đợt viết lại lớn, lập đối chiếu các ý chính trước–sau: ý nào được giữ, chuyển sang đâu, bổ sung hay thay vì sai. Có thể nhóm theo chủ đề; không cần ghi lại từng câu sửa văn phong. Nếu chưa xử lý xong một phần trong phạm vi đã nhận, ghi rõ phần còn thiếu thay vì báo hoàn tất cả bài.

Khi chuyển kiến thức sang bài khác, dẫn liên kết từ vị trí phù hợp để người đọc vẫn tìm được. Thay đổi nội dung không tự cho phép đổi URL, thứ tự học hoặc chức năng minh họa; các thay đổi đó cần nằm trong phạm vi công việc được giao.

## 12. Mẫu hành văn tham chiếu

### Cách viết còn thiếu giải thích

> Slice gồm pointer, length và capacity. Slice có thể chia sẻ backing array. Cần cẩn thận khi append.

### Cách viết mong muốn

> Khi lấy hai phần tử đầu của một slice, ta chưa nhất thiết tạo ra bản sao dữ liệu. Slice mới có thể vẫn nhìn vào cùng array với slice ban đầu.
>
> Vì vậy, sửa một phần tử qua slice mới có thể làm dữ liệu quan sát được qua slice cũ thay đổi. Hai biến có tên khác nhau, nhưng phần dữ liệu phía sau vẫn được chia sẻ.
>
> Khi thêm phần tử bằng `append`, ta cần xét chỗ còn lại trong array. Nếu capacity đủ, thao tác có thể dùng tiếp array hiện tại. Nếu không đủ chỗ, nó cần array khác và sao chép phần tử sang. Ta sẽ theo dõi từng trường hợp để thấy thời điểm hai slice còn hoặc không còn dùng chung dữ liệu.

Mẫu này minh họa giọng văn và cách nối lập luận. Không sao chép câu chuyển ý của mẫu vào mọi bài.

### Thay lời khuyên chung chung bằng giải thích có thể dùng được

| Câu còn mơ hồ | Cách biên tập |
| --- | --- |
| “Binary search nhanh hơn.” | “Với dữ liệu đã sắp xếp và truy cập theo index hiệu quả, mỗi bước loại bỏ khoảng một nửa vùng tìm kiếm. Số bước tăng theo logarit của số phần tử; chi phí chuẩn bị dữ liệu cần được xét riêng.” |
| “Cần xử lý timeout cẩn thận.” | “Timeout cho biết phía chờ chưa nhận được kết quả trong thời hạn. Nó chưa đủ để kết luận phía xử lý chưa thực hiện thao tác. Trước khi gửi lại, cần xét thao tác lặp có gây tác dụng phụ hay không.” |
| “Cách này tối ưu hơn.” | Nêu đang giảm thời gian, bộ nhớ hay độ phức tạp vận hành; giải thích trong điều kiện nào và đánh đổi điều gì. Nếu chưa đo, không viết như đã có số liệu. |

### Biên tập một đoạn bị nhảy bước

Trước:

> Map cần mutex khi chạy đồng thời. Dùng mutex sẽ tránh lỗi cập nhật.

Sau:

> Hai goroutine có thể cùng đọc giá trị 0 rồi mỗi bên ghi lại 1. Khi đó chương trình mất một lần tăng, dù từng lần đọc và ghi đã được khóa riêng.
>
> Để bảo vệ phép tăng, ta cần giữ cùng một khóa từ lúc đọc giá trị cũ đến khi ghi giá trị mới. Khóa từng lệnh riêng chưa bảo vệ được cả thao tác đọc–sửa–ghi.

Điểm được bổ sung là diễn biến gây lỗi và phạm vi cần bảo vệ. Mục tiêu biên tập là lấp khoảng trống trong lập luận, không đơn thuần kéo dài đoạn văn.

## 13. Biên tập và điều kiện hoàn tất

Đọc lại theo ba lượt. Không cần tạo điểm số hoặc báo cáo riêng cho từng lượt.

| Lượt đọc | Cần xác nhận | Dấu hiệu cần sửa |
| --- | --- | --- |
| Kiến thức | Khẳng định đúng, có điều kiện; nguồn, code, ví dụ và hình nhất quán; hai bản dịch tương ứng | Ví dụ mâu thuẫn lời giải thích; chi tiết runtime được viết như bảo đảm; output không cố định nhưng trình bày như cố định |
| Mạch hiểu | Đúng mục đích bài; nền tảng đủ; từng phần có lý do xuất hiện; người đọc có thể áp dụng | Thuật ngữ xuất hiện trước giải thích; nhảy từ kết quả sang kết luận; ngoại lệ che mất trường hợp cơ bản; ví dụ chỉ đổi tên mà không làm rõ ý mới |
| Câu chữ | Chủ thể rõ, đọc tự nhiên; định dạng giúp theo dõi; nhắc lại có mục đích | Câu đệm hàng loạt; lời quảng bá; đoạn quá nhiều ý; câu chỉ đổi từ của định nghĩa; mục được thêm để đủ khuôn |

Trước khi gọi một bài là hoàn tất, người biên tập cần trả lời được:

- Người đọc mục tiêu đã có đủ lời giải thích và ví dụ để thực hiện mục tiêu bài chưa?
- Câu hỏi hoặc hoạt động có kiểm tra đúng khả năng bài muốn xây dựng không, hay chỉ kiểm tra việc nhớ tên?
- Có khẳng định, bước suy luận hoặc phần trong phạm vi đã nhận nào còn chưa xử lý không?
- Nếu có câu hỏi hoặc bài tập, người tự học có cách đối chiếu câu trả lời hoặc tiêu chí lập luận chưa?
- Kiến thức được bỏ, chuyển hoặc thay đã được ghi nhận và liên kết lại khi cần chưa?
- Báo cáo có phân biệt việc đọc đối chiếu, build và thực thi code đúng với những gì đã làm không?

Chưa đạt ở đâu thì sửa đúng ở đó. Không bù một lỗ hổng kiến thức bằng thêm định dạng, ví dụ phụ hoặc văn phong trau chuốt. Kiểm tra nội dung không tự cho phép chạy test, benchmark hay các thao tác ngoài phạm vi công việc; tuân theo yêu cầu của người dùng và quy định làm việc hiện hành.

## 14. Chỉ dẫn dùng lại

Có thể dùng yêu cầu sau khi giao việc viết hoặc cập nhật nội dung:

> Áp dụng quy tắc trong `planning/notes-writing-guide.md`. Xác định nền tảng người đọc, mục đích chính của bài và điều người đọc cần làm được. Viết tự nhiên như người hiểu rõ chủ đề đang giải thích cho người học. Dẫn dắt bằng ví dụ cụ thể, giải thích nguyên nhân và điều kiện, giữ độ sâu cần thiết. Điều chỉnh cấu trúc theo nội dung, tránh lặp khuôn và lời dẫn chung chung. Khi sửa bài cũ, ghi rõ kiến thức hoặc ví dụ bị bỏ hay thay; khi có bản Việt và Anh, giữ nội dung tương ứng. Tự biên tập lần lượt về kiến thức, mạch hiểu và câu chữ; báo cáo kiểm chứng đúng với việc thực sự đã làm.

## 15. Cơ sở tham khảo và giới hạn áp dụng

Đối chiếu ngày 2026-10-15. Các nguồn phục vụ các mục đích khác nhau, không nên gộp thành một “công thức viết sách chuẩn thế giới”. Những ví dụ kỹ thuật và quy trình biên tập trong tài liệu này là phần vận dụng của hệ thống, không phải nguyên văn hoặc kết luận nghiên cứu từ các nguồn dưới đây.

| Nguồn gốc | Phần dùng để đối chiếu | Giới hạn |
| --- | --- | --- |
| [Stefanie Buck, Oregon State University và Open Education Network — A Guide to Open Textbook Essential and Exemplary Features](https://manifold.open.umn.edu/read/a-guide-to-open-textbook-essential-and-exemplary-features/section/c27f13c0-37c7-44c6-bfdc-a53faad41a14) | Mục tiêu học tập, phạm vi, tính nhất quán, khả năng tiếp cận và quan hệ giữa các phần của giáo trình | Khung chất lượng có thể điều chỉnh, không phải chứng nhận cho notes này |
| [Google Technical Writing — Audience](https://developers.google.com/tech-writing/one/audience), [Paragraphs](https://developers.google.com/tech-writing/one/paragraphs) | Nền tảng người đọc, khoảng kiến thức cần bù, trọng tâm và mạch đoạn | Hướng dẫn viết kỹ thuật; không áp máy móc độ dài câu/đoạn tiếng Anh sang tiếng Việt |
| [Diátaxis — Start here](https://www.diataxis.fr/start-here/) | Phân biệt học qua thực hành, hoàn thành công việc, tra cứu và tìm hiểu bản chất | Khung tổ chức tài liệu; không thay thế thiết kế giáo trình hay buộc mỗi bài có bốn phần |
| [IES/WWC — Organizing Instruction and Study to Improve Student Learning (2007)](https://ies.ed.gov/ncee/wwc/PracticeGuide/1) | Ví dụ có lời giải, thực hành, biểu diễn kiến thức, tự nhớ lại và học qua nhiều thời điểm | Hướng dẫn dựa trên tổng hợp nghiên cứu giáo dục; hiệu quả cụ thể còn tùy người học, nội dung và cách áp dụng |

Muốn biết cách viết có hiệu quả với người đọc thực tế hay không, cần phản hồi từ đúng nhóm người học: họ giải thích lại thế nào, mắc ở bước nào và có xử lý được biến thể không. Đây là bước đánh giá có thể đề xuất khi phù hợp; không tuyên bố đã đánh giá nếu chỉ có người viết tự đọc lại. Tuân thủ phạm vi và quyền gửi nội dung khi thu thập phản hồi.
