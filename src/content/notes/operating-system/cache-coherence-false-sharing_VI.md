---
title: "Cache coherence và false sharing"
category: "Operating System"
tags: ["computer-architecture", "cache", "multiprocessor"]
description: "Phân biệt chia sẻ dữ liệu thật với false sharing và hiểu cache line ownership làm giảm hiệu năng đa lõi thế nào."
updated: 2026-10-16
translationKey: "operating-system/cache-coherence-false-sharing"
---

Mỗi core có thể giữ bản sao cache line trong cache riêng. Nếu nhiều core cùng đọc, bản sao có thể được chia sẻ hiệu quả; khi có ghi, coherence protocol phải bảo đảm các core không tiếp tục dùng bản sao cũ. Việc chuyển ownership của cache line có chi phí, ngay cả khi các thread sửa những biến khác nhau.

## False sharing

Giả sử hai counter độc lập nằm cùng cache line. Thread trên core A tăng counter thứ nhất, thread trên core B tăng counter thứ hai. Về logic không có data race giữa hai biến, nhưng cache line liên tục chuyển quyền ghi giữa các core. Hiệu năng giảm dù dữ liệu được “chia sẻ” chỉ do vị trí trong bộ nhớ.

## Nhận diện và khắc phục

Đo scaling khi tăng thread và dùng profiler/counter phần cứng để phát hiện cache-to-cache transfer nếu công cụ hỗ trợ. Padding hoặc sắp lại dữ liệu để biến ghi thường xuyên nằm trên cache line riêng có thể giúp, nhưng làm tăng footprint và có thể gây vấn đề khác.

Atomic counter cũng không tự chữa false sharing: atomic bảo vệ semantics truy cập, nhưng cache line vẫn phải chuyển ownership. Sharding counter theo thread rồi gộp định kỳ thường giảm tranh chấp.

## Tự kiểm tra

**False sharing có nghĩa hai thread ghi cùng biến?** Không; chúng có thể ghi biến khác nhau trong cùng cache line.

**Padding luôn tốt?** Không; cần đo và cân nhắc bộ nhớ/cache footprint.

**Atomic loại bỏ cache coherence traffic?** Không.

## Đọc tiếp

Memory ordering quy định những thứ tự truy cập nào được quan sát giữa core, bên cạnh coherence của từng cache line.
