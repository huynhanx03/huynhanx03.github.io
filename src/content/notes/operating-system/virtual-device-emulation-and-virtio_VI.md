---
title: "Thiết bị ảo: emulation, paravirtualization và virtio"
category: "Operating System"
tags: ["virtualization", "device", "virtio"]
description: "So sánh thiết bị giả lập đầy đủ với paravirtualized device và theo dõi đường đi I/O qua host."
updated: 2026-10-16
translationKey: "operating-system/virtual-device-emulation-and-virtio"
---

Guest cần disk, network card, console và nhiều thiết bị khác. Hypervisor có thể mô phỏng một phần cứng quen thuộc để guest dùng driver chuẩn, hoặc cung cấp giao diện paravirtualized để giảm chi phí mô phỏng.

## Emulation và device model

Device emulation trình bày register, interrupt và protocol giống một thiết bị thật. Guest driver giao tiếp như bình thường; hypervisor chuyển thao tác thành I/O host. Tính tương thích cao nhưng mỗi thao tác có thể gây VM exit hoặc xử lý phần mềm.

Paravirtualization công bố giao diện biết mình đang chạy trong VM. Virtio dùng frontend driver trong guest và backend ở host, trao đổi request qua shared virtqueue. Cách này giảm mô phỏng phần cứng cũ nhưng cần driver phù hợp.

## I/O path và isolation

Một packet có thể đi từ guest socket qua guest network stack, virtio queue, vhost/backend, bridge hoặc virtual switch rồi tới NIC. Disk I/O đi qua guest filesystem/block layer, virtual controller, host file/block backend và thiết bị. Mỗi lớp có queue, cache, batching và giới hạn riêng.

Device passthrough cho guest điều khiển thiết bị gần trực tiếp, thường qua IOMMU để giới hạn DMA. Passthrough giảm một số chi phí nhưng làm migration/chia sẻ khó hơn và tăng yêu cầu cấu hình isolation.

## Tự kiểm tra

**Virtio có phải mô phỏng y hệt card vật lý?** Không; đó là giao diện paravirtualized.

**Passthrough bỏ được IOMMU?** Không an toàn; DMA isolation là phần quan trọng.

**Tăng tốc guest chắc chắn giải quyết latency?** Không; còn host scheduling, queueing và thiết bị vật lý.

## Đọc tiếp

Container dùng kernel host chung nên network/device isolation được dựng bằng namespace, cgroup và policy khác VM.
