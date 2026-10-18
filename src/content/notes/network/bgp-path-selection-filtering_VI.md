---
title: "BGP path selection, policy và route filtering"
category: "Network"
tags: ["network", "routing", "bgp"]
description: "Hiểu BGP chọn route theo policy và attributes, vì sao AS_PATH không đơn thuần chọn tuyến ngắn nhất, và cách lọc prefix."
sources:
  - title: "A Border Gateway Protocol 4 (BGP-4)"
    url: "https://www.rfc-editor.org/rfc/rfc4271.html"
  - title: "BGP Prefix Origin Validation"
    url: "https://www.rfc-editor.org/rfc/rfc6811.html"
  - title: "BGP Operations and Security"
    url: "https://www.rfc-editor.org/rfc/rfc7454.html"
updated: 2026-10-16
translationKey: "network/bgp-path-selection-filtering"
---

BGP trao đổi reachability giữa Autonomous System (AS). Mỗi route mang prefix cùng attributes như AS_PATH, NEXT_HOP, LOCAL_PREF, MED và community. Router áp policy để chọn route tốt nhất; “tốt nhất” là theo cấu hình và business intent, không chỉ theo khoảng cách vật lý.

## Chọn route theo policy

Trong cùng AS, LOCAL_PREF thường giúp ưu tiên đường outbound; giá trị cao hơn thường được ưu tiên theo policy. AS_PATH biểu diễn chuỗi AS đã đi qua và thường giúp phát hiện loop, nhưng độ dài của nó không phải metric duy nhất.

Ví dụ, router nhận cùng một prefix từ hai peer. Policy gán LOCAL_PREF 200 cho đường A và 100 cho đường B. Router có thể chọn A dù AS_PATH của A dài hơn, vì LOCAL_PREF được xét trước độ dài AS_PATH trong cách chọn route phổ biến. Đây là lựa chọn theo policy của AS, không chứng minh A ngắn hơn hoặc nhanh hơn về mặt vật lý.

MED có thể gợi ý điểm vào giữa các AS láng giềng; router so sánh MED theo policy và cấu hình, nên không nên giả định mọi implementation đều so mọi MED theo cùng cách. eBGP/iBGP cũng có quy tắc quảng bá khác nhau. Thứ tự tie-break đầy đủ có thể phụ thuộc vendor và cấu hình.

## Prefix filtering

Route leak hoặc quảng bá prefix quá rộng có thể ảnh hưởng toàn Internet. Router cần lọc prefix theo phạm vi được phép, giới hạn độ dài prefix, xác minh AS_PATH/neighbor và kiểm soát export policy. RPKI Route Origin Validation giúp đánh giá AS origin có được phép quảng bá prefix không, nhưng không xác minh toàn bộ đường AS_PATH.

## Chẩn đoán

So sánh route nhận, route được chọn và route quảng bá; kiểm tra policy, next hop reachable, session state và prefix filter. Một BGP session Established không có nghĩa route mong đợi được nhận hoặc cài vào forwarding table.

## Tự kiểm tra

**BGP luôn chọn AS_PATH ngắn nhất?** Không; nhiều attribute và policy có ưu tiên trước.

**Session Established chứng minh prefix được cài?** Không.

**RPKI xác minh toàn bộ AS path?** Không; ROV chủ yếu xác thực origin/prefix authorization.

## Đọc tiếp

Forwarding plane dùng route đã chọn để chuyển packet; control plane và data plane có thể lệch nếu cài route thất bại.
