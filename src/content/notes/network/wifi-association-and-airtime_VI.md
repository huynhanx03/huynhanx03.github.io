---
title: "Wi-Fi: association, contention và airtime"
category: "Network"
tags: ["network", "wifi", "802.11", "wireless"]
description: "Theo client từ scan/authentication tới association, hiểu CSMA/CA, retransmission và airtime fairness."
updated: 2026-10-16
translationKey: "network/wifi-association-and-airtime"
---

Wi-Fi client scan beacon, chọn access point/SSID, xác thực rồi association để trao đổi frame. WPA2/WPA3 và 802.1X thiết lập bảo vệ link tùy network; association không có nghĩa client đã nhận IP hay DNS.

Trong infrastructure mode, AP và các station đã association tạo thành một **BSS**; nhiều BSS nối qua distribution system thành **ESS**, thường quảng bá cùng SSID để client di chuyển giữa AP. Ad hoc/IBSS cho station trao đổi trực tiếp không qua AP. SSID chỉ là tên mạng, không phải bí mật hay bằng chứng xác thực. Management frame phục vụ scan, beacon, authentication và association; control frame điều phối truyền/ACK; data frame mang dữ liệu lên tầng trên. Header 802.11 có thể có nhiều địa chỉ vì frame có thể đi giữa station, AP và distribution system; nó không chỉ là Ethernet header không dây.

## CSMA/CA

Radio khó phát hiện collision cùng lúc đang gửi như Ethernet wired cổ điển. 802.11 dùng Carrier Sense Multiple Access with Collision Avoidance: station nghe môi trường, chờ khoảng ngẫu nhiên/backoff và xác nhận frame bằng ACK ở link layer. Collision/interference gây retry, tiêu airtime.

Hidden node có thể khiến hai client không nghe nhau nhưng cùng truyền tới AP. RTS/CTS có thể giảm vấn đề ở một số điều kiện nhưng thêm overhead.

Station dùng cả **physical carrier sense** (radio báo channel bận qua CCA) và **virtual carrier sense**: nó đọc Duration trong frame nghe được rồi đặt Network Allocation Vector (NAV), một bộ đếm thời gian nhường kênh. Nếu channel rảnh đủ inter-frame spacing, station chọn backoff ngẫu nhiên theo contention window; bộ đếm chỉ giảm khi môi trường tiếp tục rảnh. Nếu truyền unicast thành công, receiver gửi link ACK sau khoảng SIFS; nếu ACK không tới, sender retry với backoff tăng. Multicast/broadcast thường không có ACK kiểu này, nên reliability của chúng khác unicast.

RTS/CTS tùy chọn giúp các station nghe được sender hoặc receiver biết thời gian dành trước, giảm va chạm do hidden node. Ngược lại, RTS/CTS thêm frame và thời gian chiếm kênh; lợi ích phụ thuộc kích thước frame, mật độ và topology.

Wi-Fi còn có thể **fragment** frame lớn thành mảnh nhỏ để chỉ retransmit phần lỗi, nhưng mỗi mảnh có header/ACK riêng nên trong môi trường tốt sẽ tốn overhead. Chuẩn 802.11n-era mô tả hai kiểu aggregation: A-MSDU gộp nhiều payload trong một MPDU, hiệu quả header hơn nhưng thường một lỗi làm hỏng cả aggregate; A-MPDU ghép nhiều MPDU có FCS riêng và block ACK để chọn retransmit từng subframe. Tên/giới hạn cụ thể phụ thuộc thế hệ chuẩn; nguyên tắc chung là aggregation giảm overhead, còn đơn vị kiểm tra lỗi quyết định chi phí retry.

## Tiết kiệm năng lượng và thời gian truy cập

Ở power-save mode, station có thể tắt radio receive trong một phần thời gian. AP ghi nhớ frame gửi tới station đang ngủ, rồi thông báo dữ liệu chờ trong beacon; station thức theo lịch, kiểm tra và lấy frame. Cách này giảm thời gian radio hoạt động nhưng tăng độ trễ và có thể giảm throughput. Time synchronization giữa AP/station giúp client thức đúng beacon; tiết kiệm pin thực tế còn tùy màn hình, CPU, firmware và workload.

802.11 QoS ánh xạ traffic vào access category như background, best effort, video và voice, với contention parameter/TXOP khác nhau. Priority chỉ tạo cơ hội tranh kênh thuận lợi hơn, không bảo đảm độ trễ hay băng thông nếu môi trường nhiễu/tắc nghẽn.

## Airtime quan trọng hơn số byte thô

Client ở tốc độ thấp chiếm airtime lâu hơn cho cùng lượng data. Nhiều client cạnh tranh channel, retry và overhead beacon/management làm throughput aggregate giảm. Channel width lớn có thể tăng tốc nhưng dễ nhiễu hơn và chiếm nhiều spectrum.

PHY rate thay đổi theo modulation/coding, băng thông kênh, số spatial stream/MIMO, chất lượng tín hiệu và khả năng hai đầu. Modulation cao chở nhiều bit hơn nhưng nhạy với nhiễu hơn; FEC đổi một phần thông lượng thô lấy khả năng khôi phục lỗi. Kênh rộng có thể tăng peak rate nhưng ít kênh không chồng lấn hơn và dễ bị ảnh hưởng bởi mạng lân cận. Channel plan phải xét regulatory domain và băng tần thực tế; các channel number, width và tốc độ trong sách 2012/802.11n không phải bảng hướng dẫn cho Wi-Fi hiện nay.

Roaming phụ thuộc client/AP policy, signal và authentication. Một app có thể mất packet/latency spike khi roam; TCP retry có thể che một phần nhưng ảnh hưởng UX.

## Bảo mật và giới hạn lớp link

Sách mô tả quá trình từ WEP yếu sang WPA/TKIP và WPA2/CCMP cùng 802.1X/EAP. Đây là lịch sử phiên bản, không phải khuyến nghị cấu hình hiện nay. Ý chính còn hữu ích: mã hóa Wi-Fi bảo vệ link giữa station và AP; PSK dễ triển khai nhưng khó quản lý khi người dùng thay đổi, còn 802.1X/EAP cho phép xác thực theo người dùng/tổ chức. Bảo mật link không thay TLS: lưu lượng sau AP vẫn cần bảo vệ đầu cuối khi cần confidentiality, integrity và xác thực server.

Wi-Fi mesh cho phép node chuyển tiếp traffic thay AP trung tâm, tạo thêm đường phủ sóng nhưng cũng thêm hop, airtime contention, routing và yêu cầu bảo mật. Đừng suy ra draft 802.11s hay tên giao thức được nhắc trong sách vẫn là cách triển khai hiện hành.

## Tóm tắt

- Association là link-layer state, khác cấp IP/DNS/application.
- Wi-Fi dùng contention/backoff/ACK để chia sẻ radio.
- Retries/interference tiêu airtime; PHY rate không bằng throughput hữu ích.
- Client chậm có thể ảnh hưởng airtime chung.
- Roaming có thể tạo latency/loss ngắn.

## Tự kiểm tra

**Wi-Fi link rate 600 Mbps nghĩa app đạt 600 Mbps?** Không.

**Association thành công nghĩa DHCP đã xong?** Không.

**Mở channel rộng luôn tốt hơn?** Không; nhiễu và spectrum cạnh tranh có thể làm chất lượng giảm.

## Đọc tiếp

Khi host đã kết nối link, IP address/prefix và route tiếp tục quyết định luồng.
