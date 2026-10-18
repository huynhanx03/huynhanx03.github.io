---
title: "Chạy Redis lần đầu và làm việc với redis-cli"
category: "Database"
description: "Thay hướng dẫn cài đặt lịch sử trong sách bằng quick start hiện hành, kiểm tra kết nối và hiểu vòng đời dữ liệu local."
updated: 2026-10-18
translationKey: "database/redis-getting-started-and-client-basics"
---

*Redis in Action* có appendix cài Redis cho Debian/Ubuntu, macOS và Windows ở thời điểm sách xuất bản. Các bước đó đã cũ; trên Windows hiện có thể chạy Redis Open Source bằng Docker. Quick start dưới đây dành cho môi trường học local, không phải cấu hình production.

## Chạy thử bằng Docker

Redis docs hiện hành đưa Docker làm quick start:

```bash
docker run --name redis-learning -p 127.0.0.1:6379:6379 redis
```

Bind vào loopback giúp port chỉ mở trên máy local. Container này không gắn volume, vì vậy xóa container có thể làm mất data; dùng dataset thử nghiệm có thể dựng lại. Không expose Redis không xác thực ra public network. Muốn giữ dữ liệu, học persistence và mount volume theo tài liệu Docker/Redis thay vì mặc định suy ra từ container đang chạy.

Mở terminal khác:

```text
redis-cli -h 127.0.0.1 -p 6379
PING
SET greeting "hello"
GET greeting
TYPE greeting
```

`PONG` xác nhận server phản hồi, `SET` tạo key string, `GET` trả value, `TYPE` cho biết structure. Redis client library dùng TCP và Redis protocol; `redis-cli` là công cụ tương tác, không phải API production.

## Hiểu keyspace và môi trường

Keyspace mặc định dùng database number như 0; logical DB không phải isolation/security boundary hay shard. Chọn prefix như `dev:session:...`, và xóa test key cụ thể. `FLUSHALL` có thể xóa toàn bộ database trên server; không chạy trên instance dùng chung.

Kết thúc local server bằng Ctrl-C nếu chạy foreground hoặc `docker stop redis-learning`, rồi xóa container nếu muốn. Client remote cần host/port/TLS/ACL phù hợp; không dùng password trống/public bind trong production. Xác nhận `redis-cli --version` và `INFO server` khi behavior phụ thuộc version.

## Từ CLI sang ứng dụng

Chọn client chính thức/community phù hợp ngôn ngữ, quản lý connection pool và timeout, không mở socket mới cho mỗi command. Dùng parameterized command API của client thay nối chuỗi không an toàn. Test reconnect, timeout và duplicate retry; protocol request có thể đã chạy dù client không nhận reply.

Tài liệu hiện hành: [Install Redis Open Source](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/), [Docker](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/docker/), [client tools](https://redis.io/docs/latest/develop/tools/) và [client libraries](https://redis.io/docs/latest/develop/clients/).


## Chọn cách cài theo hệ điều hành

- **Docker, mọi hệ điều hành:** phù hợp nhất để học cùng một môi trường và xóa/dựng lại dễ dàng. Ghim tag phiên bản khi muốn kết quả lặp lại; bind port vào `127.0.0.1` cho local. Dùng volume chỉ khi muốn dữ liệu sống qua lần tạo lại container.
- **macOS:** Redis hiện có công thức Homebrew `brew install redis`; chạy foreground bằng `redis-server` để nhìn log, hoặc dùng `brew services` nếu cần service nền. Kiểm tra bằng `redis-cli PING`; dừng service bằng lệnh tương ứng của Homebrew.
- **Debian/Ubuntu:** có thể cài package từ repository chính thức Redis hoặc package của distro. So sánh version trước khi cài: package distro có thể khác version sách/current docs. Với máy học, ưu tiên package được hỗ trợ cho bản hệ điều hành đang chạy; không biên dịch bản tùy ý chỉ để giống lệnh trong sách.
- **Windows:** Redis Open Source hiện hướng dẫn Docker; bật Linux containers. WSL2 cũng phù hợp nếu muốn học workflow Linux. Các binary Windows và giới hạn `fork()` trong sách là bối cảnh lịch sử, không phải hướng cài đặt mặc định hiện nay.

Các bước gốc giải thích lựa chọn theo thời điểm xuất bản: Debian/Ubuntu có thể cấp package quá cũ nên tác giả hướng dẫn cài build tools và biên dịch; macOS dùng Rudix để cài binary đã biên dịch vì Xcode nặng; Windows được khuyến cáo chủ yếu cho development/test vì thiếu `fork()` lúc ấy ảnh hưởng background save. Các hướng cài đó và lệnh Python 2 `easy_install` đã lỗi thời. Sách cũng lưu ý một số binary macOS/Windows khi đó chỉ có Redis 2.4, trong khi ví dụ cần Redis 2.6+, nên phải kiểm tra version khi lệnh không hoạt động. Phần kết thúc nhắc Redis mặc định có persistence, nhưng thư mục dữ liệu phụ thuộc cách khởi chạy; cần cấu hình đường dẫn và service phù hợp trước khi trông cậy dữ liệu được giữ. `hiredis` là accelerator C tùy chọn cho protocol parsing, không phải dependency chức năng; thời đó binary sẵn cho macOS/Windows không phổ biến.

## Kết nối từ Python hiện đại

Sách dùng Python 2 và các phiên bản `redis-py` cũ. Với Python 3 hiện tại, cài client trong virtual environment rồi kiểm tra connection bằng `PING`:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install redis
```

```python
import redis

r = redis.Redis(host="127.0.0.1", port=6379, decode_responses=True)
assert r.ping() is True
r.set("learning:greeting", "hello", ex=60)
print(r.get("learning:greeting"))
```

`decode_responses=True` đổi string response thành text Python; nếu cần dữ liệu nhị phân, giữ bytes và decode có chủ đích. Dùng prefix cho key bài học và TTL để dữ liệu thử không tồn tại mãi. App thật cần timeout, connection pool, xử lý exception/retry có giới hạn và kiểm soát credentials.

Redis Open Source hiện hỗ trợ cài đặt Linux/macOS và Windows qua Docker; xem hướng dẫn chính thức [Linux/Ubuntu](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/linux/), [macOS/Homebrew](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/homebrew/), [Docker/Windows](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/docker/) và [redis-py](https://redis.readthedocs.io/en/stable/).

## Tự kiểm tra

**Docker container quick start có tự bảo toàn dữ liệu khi xóa container?** Không nếu không mount persistence volume.

**Redis database number có phải boundary bảo mật?** Không; ứng dụng/ACL và deployment mới là ranh giới cần kiểm tra.

**CLI PING thành công chứng minh app semantics đúng?** Không; nó chỉ xác nhận kết nối và phản hồi cơ bản.
