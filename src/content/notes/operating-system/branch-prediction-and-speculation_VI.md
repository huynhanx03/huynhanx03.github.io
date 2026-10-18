---
title: "Branch prediction và speculative execution"
category: "Operating System"
tags: ["cpu", "branch prediction", "speculation", "security"]
description: "Hiểu predictor đoán đường đi, pipeline flush và vì sao speculation rollback vẫn có thể để lại side channel."
updated: 2026-10-16
translationKey: "operating-system/branch-prediction-and-speculation"
---

CPU muốn tiếp tục fetch lệnh trước khi branch condition được tính xong. Branch predictor dùng lịch sử để đoán target và direction; speculative execution chạy trước theo dự đoán. Khi biết kết quả, CPU giữ phần đúng hoặc squash phần sai.

## Predictor và misprediction

Predictor có thể dùng pattern gần đây, branch target buffer và history table. Nhánh lặp đều thường dễ đoán; dữ liệu ngẫu nhiên khó hơn. Mispredict làm pipeline bỏ speculative work và fetch lại đường đúng, chi phí phụ thuộc độ sâu/vi kiến trúc.

Một predictor có thể kết hợp nhiều loại tín hiệu. **Loop predictor** nhận ra nhánh kết thúc vòng lặp và học số vòng lặp thường gặp; nhờ vậy giảm lỗi đoán ở lần thoát vòng lặp, điều mà bộ đếm branch thông thường có thể dự đoán kém. **Indirect branch predictor** học nhiều target khả dĩ của cùng một lệnh nhánh gián tiếp và dùng ngữ cảnh/lịch sử để chọn target. Điều này hữu ích với dispatch table, virtual call hoặc các luồng điều khiển có target thay đổi. Đây là các họ kỹ thuật; cấu trúc và thuật toán cụ thể khác giữa các thế hệ CPU.

Một **hardware loop buffer** có thể giữ các lệnh của vòng lặp nhỏ ngay trong front end để không phải fetch lại từ I-cache ở mỗi vòng. Nó có thể tiết kiệm công việc front end và năng lượng, nhưng không thay thế branch prediction nói chung và chỉ giúp với mẫu lặp phù hợp.

Một thiết kế lịch sử như Pentium 4 dùng trace cache để lưu micro-op đã decode theo đường điều khiển được dự đoán. Điều này có thể tránh một phần decode lặp lại và giảm bubble sau nhánh khi trace cache hit, nhưng miss vẫn phải fetch/decode lại; nó không loại bỏ branch predictor hay misprediction penalty. Hãy xem đây là một cách triển khai cụ thể, không phải đặc tính của mọi CPU.

## Architectural rollback và microarchitectural side effect

Kết quả speculative chưa retire bị bỏ để architectural state đúng. Nhưng cache/TLB predictor state có thể bị thay đổi và đo gián tiếp theo timing. Side-channel attacks như Spectre khai thác speculative access để rò dữ liệu qua microarchitectural state.

Mitigation gồm compiler barrier, bounds checks/speculation-safe patterns, microcode/OS control và isolation; mỗi biện pháp có điều kiện, cost và platform requirement riêng. Không dùng code snippet đơn giản để suy mọi CPU đã được bảo vệ.

## Tóm tắt

- Predictor đoán branch để giữ pipeline bận.
- Mispredict làm bỏ phần speculative và nạp lại đường đúng.
- Architectural rollback không xóa mọi microarchitectural side effect.
- Side channel khai thác timing/cache; mitigation phụ thuộc compiler/CPU/OS.
- Hiệu năng và bảo mật cùng liên quan tới speculation.

## Tự kiểm tra

**Mispredicted branch vẫn commit kết quả sai?** Architectural state phải loại bỏ.

**Rollback làm cache quay lại trạng thái cũ?** Không đảm bảo.

**Bỏ mọi speculation luôn là mitigation miễn phí?** Không; hiệu năng và thiết kế CPU bị ảnh hưởng.

## Đọc tiếp

Kết hợp với pipeline hazard và cache locality để hiểu tác động hiệu năng.
