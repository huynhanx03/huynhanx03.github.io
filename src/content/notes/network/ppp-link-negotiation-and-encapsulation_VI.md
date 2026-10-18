---
title: "PPP: đóng gói và thiết lập liên kết point-to-point"
category: "Network"
tags: ["network", "ppp", "link-layer", "lcp", "ncp"]
description: "Theo dõi cách PPP đóng khung dữ liệu, thương lượng liên kết bằng LCP, xác thực peer và bật giao thức mạng bằng NCP."
updated: 2026-10-16
translationKey: "network/ppp-link-negotiation-and-encapsulation"
---

**Point-to-Point Protocol (PPP)** mang dữ liệu tầng mạng qua một liên kết chỉ có hai đầu, chẳng hạn đường serial hoặc một số kiểu truy nhập WAN. Trên link PPP chuyên dụng, hai peer không phải tranh quyền truy cập như các station cùng kênh Wi-Fi hoặc Ethernet half-duplex lịch sử; Ethernet full-duplex hiện đại cũng không dùng cơ chế tranh chấp đó. PPP cũng không chỉ là một header: nó là một họ cơ chế phối hợp để thiết lập link, thương lượng tuỳ chọn, xác thực và cấu hình giao thức mạng.

Một cách nhớ thứ tự là: **link vật lý lên → LCP thương lượng link → xác thực nếu được yêu cầu → NCP cấu hình từng giao thức mạng → truyền dữ liệu → kết thúc link**. Hai đầu có thể thương lượng option riêng theo từng chiều; một đầu đề nghị option không có nghĩa đầu kia đã chấp nhận.

## Một frame PPP trông như thế nào?

Trong kiểu đóng khung HDLC-like thông dụng, frame có dạng:

`Flag | Address | Control | Protocol | Information | FCS | Flag`

- **Flag `0x7E`** đánh dấu ranh giới frame.
- **Address `0xFF`** và **Control `0x03`** thường là hằng số; nếu hai đầu thương lượng Address-and-Control-Field Compression (ACFC), chúng có thể được lược bỏ.
- **Protocol** cho biết phần dữ liệu là IPv4, IPv6 hay thông điệp điều khiển như LCP. Protocol Field Compression (PFC) có thể rút một số giá trị protocol xuống một byte nếu được đồng ý; LCP vẫn dùng dạng hai byte.
- **Information** mang gói điều khiển hoặc payload tầng mạng.
- **FCS** phát hiện lỗi truyền frame, thường dùng CRC-16; hai đầu có thể thương lượng CRC-32. FCS không sửa lỗi và bản thân nó không cung cấp mã hoá hay xác thực.

Frame không có một trường Length chung cho mọi PPP packet. Ranh giới thường do link bên dưới cung cấp; trên serial link, cờ và cơ chế stuffing giúp tìm đúng ranh giới mà không nhầm byte dữ liệu thành cờ.

Trên link bất đồng bộ, **byte stuffing** thay byte `0x7E` bên trong payload bằng `0x7D 0x5E`, và byte `0x7D` bằng `0x7D 0x5D`. Bên nhận giải mã chúng trở lại. Với các control character cần tránh trên đường truyền, ACCM (Asynchronous Control Character Map) quy định ký tự nào phải escape; điều này hữu ích nếu thiết bị hoặc software flow control như XON/XOFF có thể diễn giải nhầm byte dữ liệu. Trên link đồng bộ, PPP dùng **bit stuffing**: chèn bit 0 sau chuỗi năm bit 1 liên tiếp trong nội dung để chuỗi cờ không xuất hiện giả bên trong frame.

PPP thường không tự retransmit frame như một dịch vụ tin cậy đầu-cuối. FCS giúp phát hiện frame hỏng; chính sách retransmission, nếu có, phụ thuộc cơ chế link được triển khai. Không nên nhầm “có FCS” với “đảm bảo frame chắc chắn tới nơi”.

## LCP dựng và thương lượng link

**Link Control Protocol (LCP)** là giao thức điều khiển dùng để mở, cấu hình, kiểm tra và đóng link PPP. Một LCP packet có Protocol `0xC021` cùng các trường Code, Identifier và Length. Identifier giúp bên gửi ghép phản hồi với yêu cầu tương ứng.

Trao đổi cấu hình thường diễn ra theo hai hướng: mỗi peer gửi `Configure-Request` chứa option mình muốn; peer kia trả `Configure-Ack` nếu chấp nhận nguyên bộ option, `Configure-Nak` nếu muốn đề nghị giá trị khác, hoặc `Configure-Reject` nếu không hỗ trợ option. Hai đầu có thể phải gửi lại request sau khi sửa option. Vì vậy handshake thực tế có thể dài hơn một cặp gói.

LCP còn có terminate request/ack để đóng link, echo request/reply để kiểm tra peer, và một số thông điệp chẩn đoán/điều khiển khác. Tuỳ chọn **magic number** giúp nhận ra đường truyền bị loopback: nếu giá trị mình vừa gửi quay về như thể peer gửi, có thể đường link đang vòng dữ liệu trở lại chính nó.

Các option thường gặp:

- **MRU (Maximum Receive Unit)**: kích thước tối đa của payload mà một peer muốn nhận. Peer kia nên giới hạn frame gửi theo đề nghị đã thương lượng. Kích thước nhỏ hơn có thể giảm độ trễ chờ một frame lớn trên link chậm, đổi lại tăng overhead.
- **ACCM**: chọn control character cần escape trên link bất đồng bộ.
- **ACFC/PFC**: lược bớt Address/Control hoặc rút ngắn Protocol field khi cả hai đầu đồng ý.
- **FCS-Alternative**: thương lượng định dạng FCS khác, chẳng hạn độ dài CRC.
- Option xác thực: yêu cầu peer dùng một cơ chế nhận dạng trước khi chuyển sang giai đoạn cấu hình mạng.

MRU là giới hạn nhận theo PPP, không tự động bằng IP MTU trong mọi đường đi. Khi đóng PPP bên trong công nghệ khác, phần header của lớp bọc có thể làm giảm MTU hữu ích; cần cấu hình và chẩn đoán theo cả các lớp liên quan.

## Xác thực peer: PAP, CHAP và EAP

PPP có thể chạy không xác thực nếu policy cho phép, nhưng truy nhập từ xa thường cần xác minh peer. Xác thực trả lời câu hỏi “peer là ai/có được phép kết nối không”; nó không tự mã hoá mọi dữ liệu ứng dụng.

- **PAP** gửi thông tin mật khẩu theo cách có thể bị lộ trên đường truyền. Đây là cơ chế yếu, không nên xem như phương án bảo mật hiện đại.
- **CHAP** dùng challenge ngẫu nhiên và response tính từ challenge cùng bí mật chia sẻ, tránh gửi thẳng mật khẩu. Tuy nhiên, cơ chế này không giải quyết mọi kiểu tấn công, đặc biệt không nên suy ra rằng link đã có bảo mật đầu-cuối.
- **EAP** là khung mang nhiều phương thức xác thực. Máy chủ truy nhập có thể chuyển quyết định tới hạ tầng xác thực trung tâm. Mức bảo vệ phụ thuộc phương thức EAP, cách xác minh chứng thư/định danh, cấu hình và thiết kế triển khai.

Các tên thuật toán, phần mở rộng của vendor và lựa chọn mã hoá trong ví dụ sách thuộc hệ sinh thái lịch sử của truy nhập dial-up/Windows thời đó; không dùng ví dụ này làm cấu hình an toàn hiện nay.

## NCP bật IPv4 hoặc IPv6

Khi LCP đã đưa link lên và policy xác thực hoàn tất, PPP có thể chạy một hay nhiều **Network Control Protocol (NCP)** để cấu hình giao thức tầng mạng. NCP dùng dạng trao đổi configure tương tự LCP nhưng mỗi giao thức có Protocol ID và tập option riêng.

- **IPCP** (`0x8021`) cấu hình IPv4 trên link; có thể thương lượng địa chỉ và một số option liên quan như header compression hoặc thông tin DNS trong một số triển khai.
- **IPv6CP** (`0x8057`) thương lượng interface identifier cho đầu link. Đây là cấu hình trên liên kết PPP; các bước IPv6 khác như tạo địa chỉ, kiểm tra trùng và định tuyến vẫn cần hiểu theo cơ chế IPv6 tương ứng.

LCP thiết lập khả năng hoạt động chung ở tầng link; NCP cấu hình từng giao thức mạng. Vì vậy “PPP connected” chưa tự nói hết IPv4, IPv6, DNS hay route đã sẵn sàng. Hãy xem trạng thái của đúng NCP và cấu hình IP được cài lên interface.

## Multilink PPP ghép nhiều đường

**Multilink PPP (MP)** gộp nhiều link point-to-point thành một bundle logic. Nó có thể chia một gói thành fragment, gửi qua các member link rồi ghép lại ở đầu kia. Mỗi fragment mang sequence number và bit đánh dấu đầu/cuối để bộ nhận khôi phục đúng gói.

Chỉ luân phiên gửi nguyên packet qua từng đường có thể làm packet tới sai thứ tự nếu các đường có độ trễ khác nhau. MP sequence number cho phép sắp xếp lại fragment; đổi lại receiver cần buffer và có thể phải chờ fragment đến muộn. MRRU cho biết kích thước gói tái tạo mà bundle có thể nhận, còn endpoint discriminator giúp nhận diện các member thuộc cùng bundle. Các mở rộng điều phối có thể thêm/bớt link theo nhu cầu, nhưng đây là chi tiết phụ thuộc triển khai.

Ghép link không đảm bảo throughput đúng bằng tổng tốc độ danh nghĩa: overhead, chênh lệch độ trễ, cách chia tải và điểm nghẽn ở đầu cuối đều ảnh hưởng kết quả.

## Compression và header compression

PPP phân biệt **nén payload** với **nén header giao thức**. CCP (Compression Control Protocol) thương lượng thuật toán nén payload; nếu trạng thái giải nén bị lệch, cơ chế reset có thể giúp đồng bộ lại. Nén có thể giảm byte truyền nhưng tốn CPU, và dữ liệu vốn đã nén hoặc mã hoá thường khó nén thêm.

Header compression khai thác việc nhiều gói liên tiếp trên cùng luồng TCP/IP lặp lại phần lớn trường header. Thay vì gửi lại mọi trường, hai đầu duy trì trạng thái và gửi định danh luồng cùng phần thay đổi. VJ compression là một ví dụ lịch sử cho TCP/IPv4; các cơ chế sau mở rộng sang nhiều giao thức và loại link hơn. Vì giải nén phụ thuộc trạng thái, lỗi truyền làm hỏng header nén có thể gây sai lệch; kiểm tra lỗi link và cách phục hồi đồng bộ rất quan trọng.

## Đọc một lần kết nối theo thứ tự

Khi debug, hãy đọc log từ thấp lên cao:

1. **Interface/link**: thiết bị serial, modem hoặc tunnel đã báo kết nối chưa?
2. **LCP**: hai đầu có thống nhất framing, MRU, compression và yêu cầu xác thực chưa? `ConfNak` thường là đề nghị giá trị khác; `ConfRej` là option bị từ chối.
3. **Authentication**: peer đã được xác minh theo policy chưa?
4. **NCP**: IPCP/IPv6CP có đạt trạng thái mở và cài địa chỉ lên interface chưa?
5. **Routing và dịch vụ**: route, DNS và kết nối tới đích có hoạt động không?

Nếu chỉ nhìn thấy interface PPP được tạo, chưa thể kết luận toàn bộ đường truyền đã dùng được. Nếu LCP thành công nhưng IPCP thất bại, vấn đề nằm ở cấu hình IPv4 NCP chứ không phải framing cơ bản.

## Tóm tắt

- PPP mang nhiều loại payload trên một link point-to-point; Protocol field chỉ loại payload đang mang.
- LCP thương lượng cách hoạt động ở tầng link; PAP/CHAP/EAP xử lý xác thực theo policy; IPCP/IPv6CP cấu hình tầng mạng.
- FCS phát hiện lỗi, stuffing bảo vệ ranh giới frame; chúng không đồng nghĩa với mã hoá hay bảo đảm giao hàng.
- Multilink chia và ghép fragment qua bundle; compression có thể áp dụng cho payload hoặc header và cần hai đầu phối hợp trạng thái.
- Khi chẩn đoán, lần lượt kiểm tra link, LCP, xác thực, NCP, rồi route/DNS.

## Tự kiểm tra

**LCP đã mở nghĩa là IPv4 đã có địa chỉ chưa?** Chưa. IPCP cần thương lượng riêng.

**FCS có che nội dung khỏi người nghe lén không?** Không. FCS dùng để phát hiện lỗi truyền, không phải mã hoá.

**`Configure-Nak` luôn có nghĩa peer không hỗ trợ PPP?** Không. Peer có thể chỉ đang đề nghị một giá trị option khác; `Configure-Reject` mới biểu thị option bị từ chối.

## Đọc tiếp

Sau khi link mang được IP, xem cách host chọn next hop và router chuyển tiếp packet trong [định tuyến, gateway và next hop](/vi/notes/network/routing-next-hop-and-gateway/).
