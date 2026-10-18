---
title: "gRPC và HTTP API: hợp đồng, hiệu năng và cách vận hành"
category: "Network"
tags: ["grpc", "rest", "http2", "network", "performance"]
description: "So sánh theo schema, transport, browser, caching, deadline và ranh giới bảo đảm thay vì một kết luận nhanh hơn tuyệt đối."
updated: 2026-10-15
translationKey: "network/api-communication"
---

Một service cần hỏi service khác về đơn hàng. Ta có thể biểu diễn việc đó bằng tài nguyên HTTP như `GET /orders/42`, hoặc bằng lời gọi có hợp đồng như `GetOrder`. Hai cách đều có thể phục vụ cùng nghiệp vụ; điều cần chọn là hợp đồng, công cụ client, kiểu trao đổi và cách vận hành.

Bài này so sánh gRPC thông dụng với HTTP API theo phong cách REST dùng JSON. REST là một phong cách kiến trúc, không phải tên của HTTP/1.1 hay định dạng JSON. Giữ rõ các tầng này giúp tránh kết luận “gRPC luôn nhanh hơn REST” mà chưa biết đang so sánh gì.

## Cùng một yêu cầu, hai cách mô tả hợp đồng

```text
GET /orders/42
Accept: application/json

200 OK
{"id":"42","status":"paid"}
```

Với HTTP API, đường dẫn xác định tài nguyên, method và status code diễn đạt thao tác/kết quả theo hợp đồng API. JSON là lựa chọn biểu diễn phổ biến. API có thể dùng HTTP/2 hoặc HTTP/3; thiết kế REST không bắt buộc HTTP/1.1.

Với gRPC, ta thường mô tả service và message bằng Protocol Buffers rồi sinh mã client/server:

```protobuf
syntax = "proto3";

service OrderService {
  rpc GetOrder(GetOrderRequest) returns (Order);
}
message GetOrderRequest { string id = 1; }
message Order {
  string id = 1;
  string status = 2;
}
```

Đây là đoạn schema minh họa; project thật cần package, tùy chọn codegen và cấu hình build theo ngôn ngữ. Client làm việc qua stub được sinh thay vì tự ghép JSON/URL ở mỗi lời gọi. Schema giúp kiểm tra kiểu, nhưng không tự giải thích ý nghĩa “paid”, quyền truy cập hoặc chính sách retry: chúng vẫn thuộc hợp đồng cần tài liệu hóa.

[Khái niệm gRPC](https://grpc.io/docs/what-is-grpc/core-concepts/) phân biệt unary, server streaming, client streaming và bidirectional streaming. Chọn streaming khi có một luồng dữ liệu cần gửi dần; không phải cứ giao tiếp nội bộ là cần streaming.

## Chi phí nằm ở tầng nào?

gRPC thông dụng chạy trên HTTP/2. Nhiều stream có thể dùng chung một connection, giúp tránh cần một connection riêng cho từng RPC. HTTP/1.1 cũng có connection reuse; không đúng nếu mô tả nó luôn đóng/mở TCP cho mỗi request. HTTP/2 multiplexing cũng không xóa mọi vấn đề nghẽn: mất gói TCP có thể ảnh hưởng nhiều stream dùng chung connection.

Protocol Buffers biểu diễn field bằng số hiệu cùng thông tin wire type và giá trị, thay vì lặp lại tên field như JSON. Có thể giảm kích thước payload và chi phí mã hóa trong một số workload, nhưng không có cam kết mọi dữ liệu đều nhỏ hơn hoặc mọi RPC đều nhanh hơn. HTTP/2 dùng HPACK cho header; nén header khác với nén nội dung message.

Nếu phần lớn thời gian nằm ở truy vấn database 200 ms, giảm một phần chi phí serialization không tự biến request thành nhanh. Khi so sánh, cần cùng dữ liệu, TLS, connection reuse, tải đồng thời, compression và công việc server; xem cả throughput lẫn latency ở các phân vị, không chỉ một con số trung bình.

## Browser, cache và công cụ vận hành ảnh hưởng lựa chọn

| Nhu cầu | Điều cần xét |
| --- | --- |
| Client chạy trong browser | Native gRPC không dùng trực tiếp như fetch thông thường; gRPC-Web và proxy/adapter là một hướng, với giới hạn tính năng riêng |
| API cho đối tác | Họ có thể dùng codegen, schema và công cụ gRPC không; HTTP/JSON thường dễ bắt đầu bằng công cụ HTTP phổ biến |
| Cache ở CDN/proxy | HTTP GET có thể dùng ngữ nghĩa cache khi response cho phép; xác thực, header và tính riêng tư vẫn phải được xét |
| gRPC caching | RPC thường đi qua POST; không tự tận dụng cache GET thông thường, nhưng vẫn có thể thiết kế cache ở ứng dụng hoặc lớp hiểu RPC |
| Quan sát payload | JSON có thể đọc bằng mắt; protobuf cần schema/công cụ giải mã, không phải dữ liệu “vô nghĩa” |
| Cần bridge | gRPC-Gateway tạo lớp HTTP/JSON dịch sang RPC; mapping, lỗi và vận hành vẫn cần thiết kế |

Đây là điều kiện chọn, không phải quy tắc “REST ngoài, gRPC trong”. Có thể có gRPC public hoặc HTTP nội bộ. Chọn theo người dùng API và những khả năng thực sự cần.

## Deadline không đồng nghĩa rollback

Không đặt thời hạn, caller có thể chờ lâu hơn thời gian còn có ích cho request. Với Go client, truyền context có deadline là một cách giới hạn thời gian chờ:

```go
ctx, cancel := context.WithTimeout(parent, 2*time.Second)
defer cancel()

response, err := client.GetOrder(ctx, request)
if err != nil {
    return err
}
_ = response
```

Đoạn trích giả định có parent context, stub client và request đúng kiểu; nằm trong hàm trả error, cần import context/time. Khi hết deadline, phía gọi nhận lỗi theo giao thức; code server cần hợp tác với tín hiệu hủy và truyền context vào công việc phù hợp. Công việc đã commit không tự bị đảo ngược. [Hướng dẫn deadline của gRPC](https://grpc.io/docs/guides/deadlines/) nói rõ trách nhiệm dừng tác vụ phía server.

Nếu timeout sau một RPC tạo thanh toán, không thể dựa riêng vào lỗi đó để kết luận chưa trừ tiền. Trước khi retry, xét idempotency key, cách tra trạng thái và hợp đồng RPC. Một circuit breaker có thể hạn chế gọi liên tục vào dependency đang lỗi, nhưng không thay thế deadline hay tự hủy tác dụng phụ.

## Kết nối lâu, bảo mật và cân bằng tải

Một connection HTTP/2 có thể mang nhiều RPC. Cân bằng chỉ ở mức connection có thể dồn tải vào một backend; proxy L7 hiểu gRPC hoặc client-side balancing là những lựa chọn cần xét theo topology, không phải lúc nào cũng bắt buộc dùng Istio/Envoy.

TLS và danh tính client phải được cấu hình theo môi trường. gRPC hỗ trợ transport bảo mật lẫn chế độ không mã hóa; “dùng gRPC” không chứng minh TLS đã bật. Interceptor có thể thực hiện xác thực, phân quyền, logging hoặc chính sách gọi, nhưng phải được cài đặt đúng ở các đường unary/stream cần bảo vệ. [Tài liệu authentication](https://grpc.io/docs/guides/auth/) phân biệt channel credentials và call credentials.

Khi thiết kế API, ghi rõ schema evolution, deadline, mã lỗi, retry và observability bên cạnh kiểu dữ liệu. Đó là phần quyết định khả năng vận hành lâu dài, không chỉ lựa chọn JSON hay protobuf.

## Tự kiểm tra quyết định

**HTTP API dùng HTTP/2 thì tự trở thành gRPC không?** Không. HTTP version là tầng vận chuyển; gRPC còn có quy ước RPC, message, status và công cụ riêng.

**Muốn phục vụ browser có bắt buộc bỏ gRPC backend không?** Không. Có thể dùng lớp chuyển đổi hoặc cung cấp HTTP API riêng, nhưng cần tính chi phí triển khai và giới hạn.

**Timeout cho phép retry mọi RPC không?** Không. Cần biết thao tác có thể lặp an toàn không và phía xử lý có thể đã hoàn tất gì. Xem [context](/vi/notes/go/context/) và [ACID](/vi/notes/database/acid/) để nối thời hạn với ranh giới thay đổi dữ liệu.

Đối chiếu thêm: [gRPC-Web](https://github.com/grpc/grpc-web), [gRPC-Gateway](https://github.com/grpc-ecosystem/grpc-gateway), [HTTP/2 RFC 9113](https://www.rfc-editor.org/rfc/rfc9113).
