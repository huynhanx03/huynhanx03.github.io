---
title: "Locality trong filesystem và ý tưởng của FFS"
category: "Operating System"
tags: ["filesystem", "locality", "ffs", "storage"]
description: "Hiểu vì sao đặt dữ liệu gần nhau giảm I/O và cách FFS dùng cylinder group để giữ locality."
updated: 2026-10-16
translationKey: "operating-system/filesystem-locality-and-ffs"
---

Filesystem không chỉ cần tìm block trống; nó muốn đặt các block có khả năng được đọc cùng nhau gần nhau. Nếu metadata directory ở một vùng còn data file ở quá xa, một lần mở và đọc file có thể cần nhiều lần di chuyển trên HDD.

## Locality theo workload

File được tạo cùng directory, file cùng một ứng dụng hoặc metadata với data có thể thường được truy cập gần nhau. Đặt chúng gần giảm seek trên HDD và giúp đọc tuần tự hiệu quả. Trên SSD, chi phí cơ học không còn nhưng locality vẫn ảnh hưởng cache, request batching và mức phân mảnh.

Không có một mẫu truy cập chung cho mọi hệ thống. Fileserver, build tree và database có workload khác nhau; filesystem dùng heuristic để dự đoán.

## Ý tưởng cylinder group

Fast File System (FFS) chia filesystem thành các nhóm vùng gần nhau, mỗi nhóm có metadata và block data. Khi có thể, directory và file liên quan được đặt trong cùng nhóm hoặc nhóm lân cận. Cách tổ chức này cố gắng giữ locality thay vì dồn toàn bộ inode ở một đầu và data ở đầu khác.

FFS cũng dùng allocation policy để đặt file block liền nhau, phân phối directory qua nhóm nhằm cân bằng, và giữ một phần dung lượng trống để tránh phân mảnh nặng. Đây là đóng góp lịch sử và nền tảng; filesystem hiện đại có thể dùng cấu trúc khác nhưng bài toán locality vẫn còn.

Khi tạo directory, FFS ưu tiên nhóm có ít directory và còn nhiều inode để các file mới trong đó còn chỗ. Inode và data của file thường được giữ trong cùng nhóm; các file cùng directory cũng được đặt gần nhau. File rất lớn là ngoại lệ: sau một đoạn đầu, các chunk lớn tiếp theo có thể được chuyển sang nhóm khác để một file không chiếm hết nhóm và đẩy các file liên quan đi xa. Chunk phải đủ lớn để thời gian truyền dữ liệu bù được chi phí seek giữa nhóm; đổi lại, file tuần tự có thể phải seek giữa các chunk.

## Trade-off của dung lượng trống

Filesystem gần đầy khó tìm vùng liên tục, có thể phân mảnh và làm allocation chậm hơn. Giữ free space giúp allocator có lựa chọn tốt, nhưng đánh đổi dung lượng sử dụng ngay. Tỷ lệ reserve và hành vi cụ thể phụ thuộc filesystem, không nên đưa một con số cố định cho mọi workload.

FFS lịch sử còn dùng sub-block nhỏ hơn block chuẩn để file nhỏ không lãng phí gần nửa block; khi file lớn dần, các sub-block có thể được gom/copy thành block đầy đủ. Một số đĩa cũ cần thời gian giữa hai lần đọc sector liên tiếp, nên FFS dùng layout xen kẽ (parameterized placement) để sector kế tiếp chưa quay qua đầu đọc trước khi host kịp yêu cầu. Controller hiện đại thường đệm cả track bên trong nên filesystem ít cần quản lý chi tiết hình học quay như vậy.

## Locality so với SSD

SSD không cần giảm seek head như HDD, nhưng ghi flash theo page/erase block và controller có garbage collection. Filesystem vẫn cần locality cho cache, prefetch, metadata và tính tuần tự của request. Tuy vậy, tối ưu dành riêng HDD không nên áp nguyên xi cho SSD.

## Tóm tắt

- Locality đặt dữ liệu có liên quan gần nhau để giảm chi phí truy cập.
- FFS dùng cylinder groups và chính sách cấp phát nhằm giữ locality.
- FFS gom inode/data cùng nhóm, đặt file cùng directory gần nhau và tách chunk của file rất lớn để không độc chiếm nhóm.
- Filesystem gần đầy thường khó chọn vùng tốt và dễ phân mảnh hơn.
- Sub-block giảm lãng phí file nhỏ; layout xen kẽ từng giúp đĩa cũ đáp ứng đọc tuần tự đúng lúc.
- SSD đổi đặc tính phần cứng nhưng không làm locality vô nghĩa.
- Chính sách placement là heuristic theo workload, không phải bảo đảm truy cập luôn gần.

## Tự kiểm tra

**FFS giữ mọi block của file liền nhau mãi mãi?** Không; phân mảnh và cập nhật theo thời gian vẫn có thể xảy ra.

**SSD không có seek cơ học thì locality không quan trọng?** Sai; cache, batching và layout vẫn ảnh hưởng.

**Filesystem đầy 99% chắc chắn chậm gấp đôi?** Không có tỷ lệ cố định; cần đo loại workload và fragmentation.

## Đọc tiếp

Locality giúp hiệu năng; crash consistency giúp cấu trúc còn hợp lệ sau khi mất điện giữa lúc cập nhật.
