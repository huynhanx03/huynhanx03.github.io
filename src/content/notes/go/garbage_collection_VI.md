---
title: "Garbage collector: reachable memory, nhịp GC và hiệu năng"
category: "Go"
tags: ["golang", "garbage-collection", "runtime"]
description: "GC thu hồi bộ nhớ không còn reachable từ chương trình. Hiểu reachability, allocation rate và live heap giúp giải thích vì sao RAM tăng, vì sao GC dùng CPU và vì sao pause ngắn vẫn chưa đủ để bảo đảm request nhanh."
updated: 2026-10-15
translationKey: "go/garbage_collection"
---

Service xử lý xong một packet lớn nhưng chỉ giữ header sáu byte. Bộ nhớ vẫn cao. GC chưa chạy kịp, hay chương trình vẫn đang giữ packet? Trước khi đổi cấu hình GC, hãy lần theo object nào còn reachable.

Runtime Go chuẩn tự quản lý heap. Nó có thể thu hồi object chương trình không còn truy cập được, nhưng không tự biết entry cache nào đã hết ích lợi về nghiệp vụ. Bài này dùng khác biệt ấy để xây mô hình chi phí collection và latency. Bạn cần biết pointer, slice và goroutine cơ bản. Thuật toán GC và cấu hình ở đây mô tả runtime Go chuẩn, không phải yêu cầu specification áp lên mọi implementation của Go.

## Theo tham chiếu đang giữ object sống

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

Đây là các khai báo hàm độc lập, không cần import. Trong retainedHeader, slice trả về vẫn tham chiếu cùng array 8 MiB. Độ dài nhìn thấy là sáu nhưng backing array còn reachable qua slice ấy. Collector không được giải phóng array khi tham chiếu vẫn phải dùng được.

Trong copiedHeader, kết quả trỏ tới array riêng. Sau khi hàm trả, chính kết quả này không còn giữ packet lớn sống. Nếu có tham chiếu khác thì chúng vẫn ảnh hưởng. Đây là quyết định về ownership và vòng đời: copy có thể đáng giá khi giữ hàng nghìn header lâu dài, còn dùng ngay thì chưa chắc bù được chi phí.

| Giá trị trả về | Dữ liệu nhìn thấy | Object nền được kết quả giữ lại |
| --- | --- | --- |
| `packet[:6]` | Sáu byte | Array 8 MiB |
| Header đã copy | Sáu byte | Array riêng sáu byte |

`packet[:6:6]` giới hạn capacity nhưng không tách array. Copy cũng không hứa RSS giảm ngay hay allocator tốn đúng sáu byte. Quyết định compiler, kích thước cấp phát, collection và trả page đều ảnh hưởng số đo. Bài [Slices](/vi/notes/go/slices/) giải thích quy tắc chia sẻ đứng sau ví dụ này.

Cùng cách suy luận ấy áp dụng cho cache map giữ entry cũ hoặc goroutine chờ mãi với tham chiếu trên stack. “Không còn hữu ích” là hiểu biết của ứng dụng; **unreachable** nghĩa là không còn đường tham chiếu sống từ chương trình tới object. GC giảm lỗi heap thủ công như double free và dangling pointer trong Go code thông thường, nhưng không hủy goroutine hay đóng file/socket thay owner.

## Từ roots tới live heap

Tracing collector bắt đầu từ **roots**: tham chiếu trên goroutine stack, biến global và vùng lưu trữ runtime liên quan. Nó lần theo pointer qua nhiều bước để tìm heap object còn sống.

```text
roots → A → B
         ↘ C

unreachable: D → E

white: not yet discovered
grey:  discovered, references need scanning
black: references scanned
```

A, B và C phải được giữ vì roots tới được chúng. D và E không thành live chỉ vì chúng trỏ tới nhau; không root nào tới được chu trình ấy. Mark tìm object reachable. Sweep làm storage chưa được mark sẵn sàng cho cấp phát sau.

Ba màu là mô hình lập luận, không yêu cầu mỗi object phải có một field màu thật. Tham chiếu của object grey còn cần được xử lý; xử lý xong thì nó thành black. Object white lúc bắt đầu chưa phải đã được chứng minh là rác: nó có thể được phát hiện sau đó.

Lượng heap giữ lại sau tracing gọi là **live heap**. **Allocation rate** là lượng heap mới ứng dụng tạo trong một đơn vị thời gian. Hai service có cùng live heap vẫn có chi phí GC CPU khác nếu một bên liên tục tạo rồi bỏ nhiều object tạm hơn. Cần xét cả vòng đời lẫn tốc độ thay mới.

## Mark vẫn đúng thế nào khi ứng dụng tiếp tục sửa pointer?

Application code, thường gọi là mutator khi nói về GC, tiếp tục chạy trong phần lớn collection. Nó có thể đổi một pointer sau khi collector đã quét object chứa pointer ấy. Nếu thiếu phối hợp, collector có thể bỏ sót object vừa trở nên reachable.

Write barrier phối hợp cập nhật tham chiếu với marking để những thay đổi đó không phá invariant của tracing. Vì thế “GC chạy nền” chưa có nghĩa ứng dụng không chịu chi phí trong lúc chạy. Ngược lại, không phải mọi phép gán số nguyên đều cần cùng barrier: công việc phụ thuộc cập nhật tham chiếu và trạng thái collector.

Runtime chuẩn dùng concurrent tracing/mark–sweep. Phần lớn công việc chồng lấp với ứng dụng, nhưng chuyển phase toàn cục như chuẩn bị mark và mark termination có khoảng stop-the-world. Sweep có thể diễn ra cùng allocation và application work; không phải toàn heap đều được sweep trong lúc ứng dụng dừng.

Runtime đang xét không phân thế hệ: nó không chia heap theo tuổi rồi chỉ thu gom thế hệ trẻ. Heap collector cũng không moving/compacting. Stack goroutine vẫn có thể di chuyển khi resize, nên điều này không chứng minh địa chỉ luôn ổn định hay cho phép C giữ Go pointer tùy ý. Đó là những quy tắc runtime/cgo riêng.

## Heap target đánh đổi bộ nhớ với số lần làm lại công việc

Nếu live heap quanh 20 MiB, cho phép thêm 20 MiB allocation giữa các chu kỳ có thể giảm số collection so với chỉ cho thêm 5 MiB. GOGC điều khiển mức tăng được cho phép này. Giá trị mặc định thông thường là 100.

Mô hình target gần đúng từ Go 1.18 tính cả GC roots:

```text
heap target = live heap + (live heap + GC roots) × GOGC / 100

live heap = 20 MiB, roots = 5 MiB, GOGC = 100
heap target ≈ 20 + (20 + 5) × 1 = 45 MiB
```

Công thức là mô hình trước những ràng buộc khác, không hứa phép đo chạm đúng 45 MiB. Pacer khởi động mark trước target để collector có thời gian hoàn thành. Nó không đợi heap tới target rồi mới bắt đầu nghĩ đến GC.

GOGC cao thường đổi nhiều bộ nhớ hơn lấy ít chu kỳ hơn; giá trị thấp thường đổi thêm GC CPU lấy heap nhỏ hơn. Lựa chọn phù hợp phụ thuộc live set và allocation rate. Cache lớn còn reachable sẽ không biến mất chỉ vì hạ GOGC.

### Giới hạn bộ nhớ mềm thêm một ràng buộc

GOMEMLIMIT và debug.SetMemoryLimit, có từ Go 1.19, đặt giới hạn mềm cho bộ nhớ runtime quản lý. Chúng không phải hard limit của toàn RSS và không tính mọi allocation do C hay OS thực hiện.

Nếu chính live data đã tới gần limit, collector không thu hồi được nó. Runtime có thể collection liên tục mà ít lợi ích, và bộ nhớ vẫn có thể vượt limit. Cần chừa chỗ cho live set thật của ứng dụng cùng phần nằm ngoài runtime accounting. Hãy xem cấu hình như chính sách tài nguyên dựa trên số đo, không phải thuốc chữa retention.

## Vì sao pause ngắn mà request vẫn chậm?

Background worker thực hiện mark, nhưng goroutine cấp phát có thể tích lũy **assist debt**. Chúng phải hỗ trợ mark để heap không tăng nhanh hơn tiến độ collection. Assist thuộc cơ chế pacing, không chỉ là phanh khẩn cấp khi sắp hết bộ nhớ.

Request cấp phát nhiều có thể tốn thời gian assist dù stop-the-world pause được báo rất ngắn. GC worker còn cạnh tranh CPU và memory bandwidth. Latency request vì thế phụ thuộc assist, CPU sẵn có, contention và allocation behavior, ngoài thời gian pause.

Có thể hình dung thứ tự phase tổng quát: hoàn thành sweep cần thiết → chuẩn bị mark → concurrent mark → mark termination → sweep tiếp. Việc phối hợp phase có ý nghĩa, nhưng tối ưu ứng dụng nên bắt đầu từ chi phí đã đo thay vì học thuộc tên phase.

## Bộ nhớ Go tái dùng được khác bộ nhớ OS đã thu lại

Sweep làm storage không dùng sẵn sàng cho Go tái sử dụng. **Scavenger** trả các page trống phù hợp về OS, qua cơ chế tùy nền tảng như madvise. Vùng đã rảnh để Go dùng lại chưa nhất thiết ngừng resident ngay.

Cần phân biệt live/allocated heap, memory runtime giữ hoặc quản lý và RSS — những page vật lý resident của process. Live heap giảm nhưng RSS đứng yên tự nó chưa mâu thuẫn hay chứng minh GC thất bại. Runtime có thể giữ page để dùng lại, còn OS có cách accounting và reclamation riêng.

## Green Tea đổi công việc mark, không đổi reachability

Green Tea xuất hiện dạng experiment ở Go 1.25 và thành mặc định ở Go 1.26. Nó cải thiện locality và cách phân chia công việc mark/scan object nhỏ. Gom việc theo span giúp xử lý object gần nhau thay vì liên tục nhảy giữa vùng nhớ rời rạc. Vector instruction hỗ trợ trên những nền tảng phù hợp.

Một runtime page trong implementation liên quan thường là 8 KiB, nhưng span có thể gồm nhiều page. Không thể nói mọi span là object 8 KB. Những thay đổi này vẫn thuộc tracing collection; chúng không tạo heap phân thế hệ mới và không đổi việc header trong ví dụ giữ array.

Release notes Go 1.26 báo giảm 10–40% **GC overhead** trên chương trình dùng GC nhiều. Đây không phải lời hứa giảm 10–40% toàn bộ thời gian service. Nếu GC chỉ chiếm phần nhỏ, cải thiện lớn ở collector vẫn có thể chỉ tạo thay đổi nhỏ ở đầu cuối. Các phiên bản trên là mốc thay đổi cụ thể, không phải khẳng định 1.26 là bản mới nhất.

## So collector bằng cùng câu hỏi và workload

| Câu hỏi | Runtime Go chuẩn đang xét | JVM |
| --- | --- | --- |
| Heap có phân thế hệ không? | Không | Tùy collector và phiên bản |
| Heap object có bị di chuyển/compact không? | Không do heap GC này | Nhiều collector có relocation/compaction |
| Điều gì điều khiển chính sách? | GOGC, memory limit, workload | Collector, heap và mục tiêu latency/throughput |
| Cần đo latency nào? | Cả request, gồm assist và CPU | Cả request bên cạnh collector pause |

Không gộp mọi Java collector vào một thiết kế. Khi relocation, JVM cập nhật managed reference; reference ứng dụng không tự trở nên sai. So sánh hữu ích cần nêu collector/phiên bản và dùng cùng workload, giới hạn tài nguyên. Bảng trên đưa câu hỏi để khảo sát, không xếp hạng chung giữa hai ngôn ngữ.

## Pinner và Pool giải quyết hai vấn đề khác nhau

`runtime.Pinner`, có từ Go 1.21, hỗ trợ tình huống cgo cần Go memory được pin theo đúng quy tắc pointer. Pin một object không pin đệ quy mọi object nó tham chiếu. Owner phải quản lý thời hạn và gọi Unpin sau khi C ngừng giữ các pointer ấy. Heap GC non-moving không loại bỏ hạn chế cgo về giữ pointer. Pinner không chữa cache giữ lâu và không phải tối ưu allocation Go thông thường.

`sync.Pool` cho phép dùng lại object tạm. Entry có thể biến mất bất cứ lúc nào nên caller phải tạo được object thay thế. Pool không phải cache bền hay nơi giữ connection cần Close. Sau khi Put object, không tiếp tục dùng nó: caller khác có thể đã lấy lại.

Reset state liên quan trước khi dùng lại, và đặt chính sách cho buffer nhạy cảm hoặc quá lớn. Giữ lại một buffer lớn bất thường có thể tốn nhiều bộ nhớ hơn lợi ích giảm allocation. Đo allocation rate và CPU trước/sau khi dùng pool; ít allocation chưa tự chứng minh service tốt hơn.

## Biến triệu chứng bộ nhớ thành giả thuyết có thể đo

Bắt đầu với heap/alloc profile, allocation rate, live heap, GC CPU và p95/p99 request latency. Hai hàm header gợi những giả thuyết khác nhau: hàm đầu có thể giữ storage quá lâu; lặp copy độc lập lại có thể tạo turnover quá lớn. Chọn bằng chứng phân biệt được chúng.

Tìm allocation không cần thiết ở hot path, slice giữ array lớn, cache thiếu eviction và goroutine không kết thúc. Preallocate khi biết kích thước hữu ích; cân nhắc biểu diễn ít pointer nếu vẫn giữ semantics. Escape analysis giúp giải thích quyết định đặt dữ liệu; mục tiêu không phải ép mọi thứ lên stack, và pointer trên stack vẫn phải được scan.

```sh
GODEBUG=gctrace=1 ./app
go tool pprof ./app heap.pprof
```

Đây là ví dụ lệnh chẩn đoán, không phải lệnh đã chạy cho bài này. Gctrace cho thấy chu kỳ collection; pprof đọc profile đã thu. Đừng ép runtime.GC ở mỗi request hoặc thêm pool trước khi tìm ra chi phí. Mỗi lần đổi một yếu tố và so workload đại diện với cùng phiên bản Go, CPU limit và memory limit.

## Thử dự đoán trước khi xem đáp án

1. Entry cache không bao giờ được đọc nữa nhưng vẫn nằm trong map global. GC thu hồi object của nó được không? Chu trình object không còn reachable có giữ nhau sống không?
2. Slice sáu byte có cap sáu sau full slice expression. Nó đã nhả array lớn ban đầu chưa?
3. Vì sao live heap giảm mà RSS chưa giảm? Vì sao p99 tăng trong khi STW vẫn thấp?

**Giải thích:**

1. Map giữ entry reachable nên object còn live. Chu trình không có đường từ root vẫn unreachable và tracing thu gom được; tham chiếu lẫn nhau chưa đủ giữ sống.
2. Chưa. Capacity giới hạn khả năng mở rộng, không đổi backing array. Copy sang storage độc lập mới loại đường giữ array ấy.
3. Sweep cho phép dùng lại bộ nhớ; scavenger và OS quyết định trả page/residency. Allocation assist cùng CPU/bandwidth của GC tác động request ngoài STW pause. Cần đo các chi phí riêng.

## Tài liệu đối chiếu

- [Go GC guide](https://go.dev/doc/gc-guide) — tracing, pacing, mô hình chi phí và memory accounting; tài liệu tự ghi baseline Go 1.19 nên cần ghép release notes cho thay đổi sau đó.
- [Green Tea GC](https://go.dev/blog/greenteagc) và [Go 1.26 runtime changes](https://go.dev/doc/go1.26#runtime) — thay đổi locality theo phiên bản và phạm vi số liệu hiệu năng.
- [runtime.Pinner](https://pkg.go.dev/runtime#Pinner), [cgo pointer rules](https://pkg.go.dev/cmd/cgo#hdr-Passing_pointers) và [sync.Pool](https://pkg.go.dev/sync#Pool) — hợp đồng API và quyền sở hữu.
