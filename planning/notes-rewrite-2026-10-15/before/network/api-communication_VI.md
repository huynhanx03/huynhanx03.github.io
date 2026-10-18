---
title: "gRPC vs REST: Tối ưu hiệu suất và Cơ chế Under-the-hood"
category: "Network"
tags: ["grpc", "rest", "http2", "network", "performance"]
---

# Giao tiếp API: gRPC vs REST

Trong thế giới Microservices, việc lựa chọn giao thức giao tiếp là yếu tố sống còn cho hiệu năng. Bài viết này sẽ giúp bạn hiểu rõ bản chất của gRPC, REST và tại sao chúng lại được sử dụng ở các vị trí khác nhau trong hệ thống.

---

## 1. So sánh tổng quan: gRPC vs REST

Để có cái nhìn nhanh, hãy xem bảng so sánh các đặc tính kỹ thuật cốt lõi:

| Tiêu chí | gRPC (Google RPC) | REST (với JSON) |
| :--- | :--- | :--- |
| **Giao thức nền** | **HTTP/2** (Mặc định) | **HTTP/1.1** (Phổ biến) |
| **Định dạng dữ liệu** | **Binary** (Protocol Buffers) | **Text** (JSON, XML) |
| **Tốc độ** | Rất cao, Latency cực thấp | Trung bình |
| **Kiểu giao tiếp** | Unary, Server/Client/Bi-di Streaming | Request - Response (Unary) |
| **Độ phức tạp** | Cao (Cần file `.proto` và code gen) | Thấp (Dễ dùng, dễ debug) |
| **Vị trí phù hợp** | **Internal** (Inter-service) | **External** (Client-Facing, 3rd party) |

---

## 2. Tại sao gRPC lại nhanh? (Under-the-hood)

gRPC không chỉ nhanh vì nó là nhị phân, mà còn nhờ sự tối ưu hóa sâu ở tầng truyền dẫn:

1.  **HTTP/2 Multiplexing:** Chỉ cần **1 TCP connection** duy nhất để xử lý đồng thời nhiều request/response. Điều này loại bỏ overhead của việc đóng/mở kết nối liên tục như HTTP/1.1.
2.  **Binary Format (Protobuf):** Thay vì gửi chuỗi text `"name": "Antigravity"`, Protobuf mã hóa nó thành chuỗi byte nhị phân siêu nhỏ.
3.  **Tag ID Optimization:** Trong file `.proto`, mỗi trường được gắn một số thứ tự (Tag ID). gRPC chỉ gửi cái ID này đi thay vì gửi cả tên trường dài dòng.
4.  **HPACK Compression:** Tự động nén các Header lặp đi lặp lại giữa các request, tiết kiệm tối đa băng thông.

---

## 3. Lựa chọn vị trí: Tại sao gRPC thường chỉ dùng nội bộ?

Dù gRPC rất nhanh, nhưng nó thường được "giữ lại" phía sau Firewall (giao tiếp giữa các backend service) thay vì đưa ra bên ngoài cho Client (Web/Mobile) vì:

-   **Browser Support:** Trình duyệt web không hỗ trợ hoàn hảo HTTP/2 Trailers (cần thiết cho gRPC). Để dùng trên Web, ta phải dùng `gRPC-Web` kèm Proxy trung gian (như Envoy).
-   **Khả năng Caching:** REST dùng `GET` nên CDN (như Cloudflare) cache rất dễ. gRPC dùng `POST` cho tất cả mọi thứ nên gần như không thể cache ở tầng mạng.
-   **Tính tương thích:** Ép các đối tác bên thứ ba phải cài đặt Protobuf và code gen là một rào cản lớn. REST/JSON vẫn là ngôn ngữ "quốc tế" mà ai cũng hiểu.
-   **Debugging:** Việc nhìn vào một file JSON dễ hơn nhiều so với việc phân tích một luồng byte nhị phân vô nghĩa.

> **Giải pháp gRPC-Gateway:** Nếu bạn muốn tốc độ của gRPC nhưng vẫn phải phục vụ Web/REST, hãy dùng gRPC-Gateway. Nó đóng vai trò một Reverse Proxy tự động dịch JSON sang gRPC cho bạn.

---

## 4. Vận hành gRPC trong thực tế

Để hệ thống chạy ổn định, đặc biệt trong mạng có độ trễ cao, bạn cần quan tâm:

-   **Load Balancing:** gRPC giữ kết nối TCP rất lâu. Cần dùng cân bằng tải tầng ứng dụng (L7) như **Envoy** hoặc **Istio** để phân phối request đều giữa các pod.
-   **Security:** gRPC mặc định chạy trên TLS/SSL. Ta sử dụng **Interceptors** để tạo ra các Middleware kiểm tra Authentication (JWT/Metadata) tập trung.
-   **Circuit Breaking:** Sử dụng Interceptors để "ngắt mạch" ngay lập tức nếu các service phía sau bị quá tải, tránh sập hệ thống dây chuyền.
-   **Timeout (Context):** Luôn dùng `context.WithTimeout` để giới hạn thời gian xử lý. Nếu quá hạn, Go sẽ tự động hủy toàn bộ quy trình để giải phóng tài nguyên.

---

> **Tư duy thiết kế tốt:** Hãy dùng **REST** làm cửa ngõ (API Gateway) để đón khách, và dùng **gRPC** để các nhân viên (Services) bên trong trao đổi với nhau nhanh nhất có thể.
