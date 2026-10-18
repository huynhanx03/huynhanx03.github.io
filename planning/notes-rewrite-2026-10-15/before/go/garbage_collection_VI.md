---
title: "Garbage collector: reachable memory, nhịp GC và hiệu năng"
category: "Go"
tags: ["golang", "garbage-collection", "runtime"]
description: "GC thu hồi bộ nhớ không còn reachable từ chương trình. Hiểu reachability, allocation rate và live heap giúp giải thích vì sao RAM tăng, vì sao GC dùng CPU và vì sao pause ngắn vẫn chưa đủ để bảo đảm request nhanh."
updated: 2026-10-14
translationKey: "go/garbage_collection"
---

GC thu hồi bộ nhớ không còn reachable từ chương trình. Hiểu reachability, allocation rate và live heap giúp giải thích vì sao RAM tăng, vì sao GC dùng CPU và vì sao pause ngắn vẫn chưa đủ để bảo đảm request nhanh.

## 1. “Không dùng nữa” khác “không truy cập được”

Một entry cache không còn cần về nghiệp vụ vẫn là live nếu map giữ nó. Goroutine đang chờ vô hạn cũng có thể giữ object trên stack. GC không hiểu logic cache, không tự hủy goroutine, không đóng file/socket thay đúng owner. Lợi ích chính là giảm lỗi quản lý heap thủ công như double free và dangling pointer trong code Go thông thường, không loại bỏ mọi retention/leak.

Mạch tổng quát là cấp phát → xác định reachable → thu hồi unreachable → tái sử dụng vùng trống. Heap live là lượng bộ nhớ còn cần giữ sau tracing. Allocation rate là tốc độ tạo bộ nhớ mới. Hai service có cùng live heap nhưng allocation rate khác nhau có thể tốn GC CPU rất khác.

## 2. Mark–sweep, roots và ba màu

```text
roots → A → B
         ↘ C
unreachable: D → E

white: not yet found/scanned
 grey: found, references still need scanning
black: references scanned
```

Roots gồm references từ goroutine stacks, global variables và các vùng runtime liên quan. Mark đi theo pointer để tìm object còn reachable. Sweep thu hồi object không được mark; runtime có thể tái dùng vùng trống cho allocation sau. Ba màu là mô hình giải thích tracing, không nhất thiết là ba giá trị màu lưu trực tiếp trong từng object.

Vì mutator (code ứng dụng) vẫn chạy khi mark, pointer có thể đổi trong lúc GC quét. Write barrier phối hợp cập nhật references để collector không bỏ sót object đang trở nên reachable. Không phải mọi phép gán số đều cần cùng một barrier; chi phí liên quan đến reference updates và trạng thái GC.

## 3. Concurrent không có nghĩa hoàn toàn không pause

Go sử dụng concurrent tracing/mark–sweep, với các khoảng stop-the-world ở chuyển phase như mark setup/termination. Sweeping có thể diễn ra cùng application work và allocation. Không nên mô tả toàn bộ heap bị quét khi ứng dụng dừng; mục tiêu là làm phần lớn công việc đồng thời và chỉ đồng bộ toàn bộ khi cần.

Runtime hiện hành là non-generational, không chia heap theo tuổi để chỉ quét thế hệ trẻ. Heap collector không moving/compacting như một số collector khác; goroutine stack vẫn có thể di chuyển khi resize. Không biến điều này thành quy tắc pointer luôn có cùng địa chỉ trong mọi tình huống hay quyền giữ Go pointer tùy ý bên C.

## 4. GOGC, pacing và memory limit

GOGC điều chỉnh mức heap tăng thêm so với live memory; giá trị mặc định thường là 100. Mô hình gần đúng từ Go 1.18: heap target = live heap + (live heap + GC roots) × GOGC/100. Với live heap 20 MiB, roots 5 MiB và GOGC=100, target xấp xỉ 45 MiB trước các ràng buộc khác. Pacer bắt đầu mark trước target để công việc kịp hoàn thành, không chỉ đợi heap chạm đúng target rồi mới nghĩ đến GC.

GOGC cao thường đổi thêm memory lấy ít collection hơn; thấp thường đổi thêm CPU lấy heap nhỏ hơn. GOMEMLIMIT/debug.SetMemoryLimit (Go 1.19+) là giới hạn mềm cho memory runtime quản lý, không phải hard limit cho toàn RSS và không bao gồm mọi allocation bên C/OS. Live data quá lớn vẫn có thể vượt limit hoặc gây GC làm việc liên tục; không giải quyết bằng một số cấu hình duy nhất.

## 5. GC assist và background scavenger

Background workers thực hiện mark nhưng allocation cũng có thể tích lũy assist debt. Goroutine cấp phát phải hỗ trợ mark để giữ tốc độ tăng heap và tiến độ GC cân bằng; đây không chỉ là “phanh khẩn cấp” khi heap đã sắp hết. Request latency có thể tăng do assist dù STW metric thấp. Các phase được pacing/coordinating: kết thúc sweep cần thiết → chuẩn bị mark → concurrent mark → mark termination → sweep tiếp.

Sweep làm vùng nhớ có thể tái sử dụng trong Go. Scavenger mới trả các trang trống phù hợp về OS, bằng cơ chế phụ thuộc nền tảng như madvise. Vì thế heap live giảm không bảo đảm RSS giảm tức thì. Phân biệt allocated heap, reserved/runtime memory và resident memory trước khi kết luận GC bị lỗi.

## 6. Green Tea theo phiên bản

Green Tea xuất hiện dưới dạng experiment trong Go 1.25 và được bật mặc định ở Go 1.26. Nó cải thiện locality và khả năng chia việc khi mark/scan các object nhỏ. Span-based work gom các object gần nhau để giảm truy cập memory rải rác; hỗ trợ vector instructions tùy platform. Đây vẫn là tracing GC, không thay bằng một collector phân thế hệ mới.

Một runtime page thường là 8 KiB trong implementation liên quan, nhưng span có thể gồm nhiều page: “mọi span đều 8 KB” là diễn đạt sai. Mức giảm 10–40% được release notes nói về **GC overhead** của workload dùng GC nhiều, không phải hứa cả service nhanh hơn 10–40%. Không áp kết quả benchmark chung vào service khi chưa đo.

## 7. So sánh Go và JVM phải chỉ rõ collector

| Khía cạnh | Go runtime đang xét | JVM |
|---|---|---|
| Tổ chức heap | Không phân thế hệ | Tùy collector/version |
| Di chuyển heap object | Không compact/move bởi heap GC | Nhiều collector có relocation/compaction |
| Knobs | GOGC, memory limit và workload | Tùy collector, heap và mục tiêu pause/throughput |
| Đánh giá latency | STW + assist + CPU/contention | Cũng cần đo toàn request, không chỉ pause |

Không gộp mọi Java collector thành một kiến trúc. Managed references trong JVM được VM xử lý khi relocation; điều đó không làm application reference tự sai. Bảng này giúp đặt câu hỏi đúng về workload, không xếp một ngôn ngữ luôn ít latency hơn ngôn ngữ kia.

## 8. Pinner và sync.Pool có mục đích khác nhau

Runtime.Pinner có từ Go 1.21, phục vụ trường hợp cgo cần giữ Go memory pinned theo đúng quy tắc pointer/cgo. Pin không pin đệ quy tất cả object bên trong; cần quản lý duration và gọi Unpin khi C không còn giữ pointer. GC non-moving không làm các quy tắc giữ pointer bên C biến mất. Không dùng Pinner để chữa retention hoặc tối ưu ordinary Go allocation.

Sync.Pool có thể tái dùng object tạm để giảm allocation, nhưng runtime có quyền bỏ pooled object bất kỳ lúc nào. Nó không phải cache bền hay nơi giữ connection cần Close. Không truy cập object sau Put; reset state trước reuse, tránh trả buffer nhạy cảm hoặc quá lớn vào pool mà không có chính sách. Đo allocation/CPU trước và sau thay đổi.

## 9. Quy trình tối ưu có căn cứ

Bắt đầu bằng heap/alloc profiles, allocation rate, live heap, GC CPU và p95/p99 request latency. Tìm allocation hot path, slice giữ array lớn, cache không có eviction và goroutine không dừng. Giảm allocation không cần thiết, preallocate hợp lý, cân nhắc dữ liệu ít pointer khi semantics cho phép. Escape analysis là công cụ giải thích, không mục tiêu ép mọi biến lên stack; stack references vẫn cần GC scan.

```sh
GODEBUG=gctrace=1 ./app
go tool pprof ./app heap.pprof
```

Gctrace giúp quan sát chu kỳ; pprof đọc profile bạn đã thu. Không gọi runtime.GC trên mỗi request hay dùng Pool trước khi biết nút thắt. Chỉ đổi một yếu tố mỗi lượt và so trên workload đại diện, cùng phiên bản Go/limit CPU/memory.

## Ví dụ áp dụng

### Tình huống: chỉ giữ một đoạn nhỏ nhưng giữ sống cả buffer

GC nhìn vào khả năng truy cập đối tượng. Một slice ngắn vẫn có thể giữ array lớn sống nếu nó còn trỏ vào array đó.

```go
func retainedHeader() []byte {
    packet := make([]byte, 8<<20)
    copy(packet, "HEADER")
    return packet[:6]
}

func copiedHeader() []byte {
    packet := make([]byte, 8<<20)
    copy(packet, "HEADER")
    header := make([]byte, 6)
    copy(header, packet[:6])
    return header
}
```

| Cách trả kết quả | Dữ liệu nhìn thấy | Bộ nhớ nền còn được tham chiếu |
| --- | --- | --- |
| packet[:6] | 6 byte | Array 8 MiB |
| Sao chép sang header | 6 byte | Array riêng 6 byte |

Ở cách thứ hai, packet không còn được kết quả giữ sống sau khi hàm trả. Điều này không hứa RSS giảm ngay hoặc allocation thực tế đúng 6 byte: allocator, compiler và thời điểm GC ảnh hưởng số đo. Full slice expression packet[:6:6] cũng không giải phóng array lớn. Nếu giữ hàng nghìn header lâu dài, việc copy có thể đáng giá; nếu chỉ dùng tức thời, hãy cân nhắc chi phí copy và đo theo vòng đời thực tế.

## Tự kiểm tra

Vì sao entry cache không dùng nữa vẫn live? Heap giảm mà RSS chưa giảm có mâu thuẫn không? Giải thích khác nhau giữa GC assist, STW và scavenger.

## Tài liệu đối chiếu

- [Go GC guide](https://go.dev/doc/gc-guide)
- [Green Tea GC](https://go.dev/blog/greenteagc)
- [Go 1.26 GC changes](https://go.dev/doc/go1.26#runtime)
- [runtime.Pinner](https://pkg.go.dev/runtime#Pinner)
- [sync.Pool](https://pkg.go.dev/sync#Pool)
