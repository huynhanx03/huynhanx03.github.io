---
title: "Go: từ một file chương trình đến module và bộ công cụ"
category: "Go"
tags: ["golang", "philosophy", "intro"]
description: "Đọc một chương trình Go nhỏ, phân biệt file, package và module, rồi hiểu vai trò của compiler, runtime và bộ công cụ."
updated: 2026-10-15
translationKey: "go/intro"
---

Giả sử bạn cần một công cụ cộng các khoản chi trong ngày. Trước khi chia code thành nhiều thư mục hay học cách chạy nhiều công việc đồng thời, bạn cần biết một chương trình Go bắt đầu ở đâu, các file liên hệ thế nào và lệnh nào biến code thành chương trình chạy được.

Bài này bắt đầu từ một file hoàn chỉnh rồi mở rộng ra cách tổ chức dự án. Chưa cần biết pointer, interface hay goroutine để theo dõi ví dụ; các khái niệm ấy sẽ có chỗ trong lộ trình ở cuối bài.

## Đọc một chương trình từ điểm bắt đầu

Lưu nội dung sau vào file `main.go` trong một thư mục riêng:

```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, Go")
}
```

Dòng `package main` cho biết file thuộc package có tên `main`. Một package gom các khai báo liên quan; tên `main` có vai trò đặc biệt khi tạo chương trình thực thi. Sau khi quá trình khởi tạo package hoàn tất, runtime gọi hàm `main` của package này. Vì vậy, trong chương trình nhỏ trên, ta theo luồng vào `func main()` rồi đến câu lệnh in.

`import "fmt"` cho phép file sử dụng package thư viện chuẩn phục vụ định dạng và in dữ liệu. Dấu chấm trong `fmt.Println` chọn tên `Println` từ package được import. Câu lệnh dự kiến in `Hello, Go` và xuống dòng. Các câu lệnh trong cùng thân hàm chạy theo thứ tự, trừ khi có cấu trúc điều khiển làm đổi luồng.

Go là ngôn ngữ **định kiểu tĩnh**: compiler kiểm tra kiểu của các biểu thức trước khi chương trình chạy. Go cũng là ngôn ngữ **biên dịch**: code được dịch thành mã thực thi. Lệnh `go run` có thể khiến việc chạy trông giống một bước, nhưng vẫn thực hiện biên dịch trước khi chạy. Biên dịch thành công chưa bảo đảm thuật toán hay quy tắc nghiệp vụ đúng.

## Từ file đến package, rồi module

Trong cùng thư mục, các file Go thông thường thuộc cùng một package và dùng chung những khai báo ở phạm vi package. Chẳng hạn, có thể chuyển hàm tính tổng sang `total.go`, vẫn để `package main`, rồi gọi hàm đó từ `main.go`. Không cần import một file khác trong cùng package. Riêng các import có phạm vi theo file: file nào dùng `fmt` phải import `fmt` ở file đó.

Một **module** bao quanh một hoặc nhiều package và quản lý dependency của chúng. File `go.mod` ở gốc module ghi đường dẫn module, phiên bản Go được khai báo và các dependency cần thiết. Đường dẫn module kết hợp với thư mục con tạo đường dẫn import của package; import không trỏ vào từng file `.go`.

Với dự án đầu tiên, cấu trúc này đã đủ:

```text
expense/
├── go.mod
└── main.go
```

Sau khi đã cài Go, mở terminal trong thư mục `expense` và dùng các lệnh sau theo thứ tự:

```sh
go mod init example.com/expense
go run .
go build .
```

`go mod init` tạo `go.mod`; thực hiện một lần khi bắt đầu module, không lặp trước mỗi lần chạy. `example.com/expense` là danh tính minh họa và chưa cần là repository công khai để chạy cục bộ. `go run .` chọn package trong thư mục hiện tại, biên dịch các file phù hợp rồi chạy. `go build .` build package; vì đây là package `main`, nó tạo executable để có thể chạy sau đó.

Đừng tách package chỉ vì có thêm một file. Hãy tách khi một nhóm khai báo có trách nhiệm đủ rõ và cần ranh giới dependency. Package thư viện thường có tên khác `main`, cung cấp hàm hoặc kiểu cho package khác sử dụng và không cần điểm vào `func main()`.

## Đưa phép tính vào một hàm

Thay nội dung `main.go` bằng chương trình hoàn chỉnh sau. Mục đích là phân biệt phần điều phối với phần tính toán, chưa phải xây một hệ thống quản lý chi tiêu.

```go
package main

import "fmt"

func total(expenses []int) int {
    sum := 0
    for _, amount := range expenses {
        sum += amount
    }
    return sum
}

func main() {
    fmt.Println(total([]int{120, 80, 50})) // 250
}
```

`main` đưa ba khoản chi cho `total`. Hàm `total` bắt đầu từ 0, cộng lần lượt 120, 80 rồi 50, và trả 250 cho câu lệnh in. `[]int` biểu diễn một slice số nguyên; `range` lần lượt lấy phần tử. Những cú pháp ấy sẽ được giải thích ở các bài riêng; ở đây, hãy theo dõi dữ liệu đi vào hàm và kết quả đi ra.

Các con số cần có cùng đơn vị, chẳng hạn đồng hoặc cent. Ví dụ không xử lý nhiều loại tiền và giả định tổng vẫn nằm trong miền biểu diễn của `int`. Những giới hạn này thuộc hợp đồng của phép tính, dù compiler chấp nhận chương trình. Sau này, phần đọc file hoặc nhận request có thể thay đổi mà hàm tính tổng vẫn được dùng lại.

Các ví dụ khác trong loạt bài có thể chỉ là đoạn trích. Đặt câu lệnh trong `main` hoặc hàm thích hợp, khai báo hàm ở ngoài `main`, và thêm các import được sử dụng. Tên như `items`, `ctx` hay `db` thường là dữ liệu do ví dụ hoặc caller cung cấp, không phải tên có sẵn của Go. Comment về output là kết quả dự kiến theo quy tắc đang giải thích.

## Lỗi là một phần của luồng dữ liệu

Cộng ba số đã có trong bộ nhớ ít khả năng thất bại hơn đọc một file cấu hình. File có thể không tồn tại hoặc không có quyền truy cập. Go thường biểu đạt trường hợp này bằng nhiều kết quả, với `error` ở cuối:

```go
data, err := os.ReadFile("config.json")
if err != nil {
    return fmt.Errorf("read config: %w", err)
}
_ = data
```

Đây là đoạn trích trong hàm trả `error`, cần import `os` và `fmt`. Nếu đọc thất bại, nhánh `if` trả lỗi có thêm ngữ cảnh cho caller. Chỉ đường đi sau nhánh ấy mới sử dụng dữ liệu theo hợp đồng thành công. `_ = data` giữ chỗ cho phần xử lý chưa được đưa vào ví dụ.

Compiler không buộc bạn xử lý có ý nghĩa mọi error. Có thể bỏ qua lỗi nhưng vẫn biên dịch được. Người viết cần quyết định liệu thất bại sẽ được trả lên, thử lại có giới hạn hay thay bằng kết quả dự phòng hợp lệ. [Bài hàm](/vi/notes/go/functions/) giải thích nhiều kết quả; bài về errors đi sâu vào cách xử lý và bọc lỗi.

## Những lựa chọn thiết kế đứng sau cú pháp

Robert Griesemer, Rob Pike và Ken Thompson bắt đầu thiết kế Go tại Google năm 2007; ngôn ngữ được công bố năm 2009. Cú pháp chịu ảnh hưởng từ C, cách tổ chức chương trình từ họ Pascal/Modula/Oberon, còn concurrency có nguồn gốc ý tưởng từ CSP. Các ảnh hưởng này không mang theo quy tắc quản lý bộ nhớ của C.

Go hướng đến việc duy trì phần mềm trong nhóm: code dễ đọc, dependency rõ, thời gian biên dịch phù hợp với vòng phát triển và hỗ trợ công việc đồng thời. Có 25 từ khóa giúp bề mặt ngôn ngữ tương đối nhỏ; người viết vẫn phải hiểu kiểu, lỗi và dữ liệu dùng chung.

Struct gom dữ liệu, method gắn hành vi với kiểu, interface mô tả hành vi mà một giá trị cần có. Composition ghép các thành phần; embedding hỗ trợ truy cập thành phần nhưng không tạo mô hình lớp cha và lớp con. Goroutine và channel hỗ trợ phối hợp công việc. Khi bảo vệ trạng thái dùng chung, mutex vẫn có vai trò; gửi pointer qua channel chưa tự ngăn bên gửi tiếp tục sửa cùng đối tượng.

Go có quản lý bộ nhớ tự động. **Runtime** là phần hỗ trợ chương trình trong lúc chạy, gồm lập lịch goroutine, cấp phát và thu gom rác. Một executable Go mang theo phần runtime cần thiết. Tuy vậy, cgo và một số chế độ build có thể đưa vào dependency hệ thống, nên không mặc định mọi binary đều liên kết tĩnh hoàn toàn.

## Chọn công cụ theo câu hỏi cần trả lời

| Công cụ | Dùng để làm gì? |
| --- | --- |
| `go fmt ./...` | Áp dụng định dạng chuẩn cho các package |
| `go build ./...` | Kiểm tra và biên dịch các package |
| `go run .` | Biên dịch rồi chạy ứng dụng hiện tại |
| `go test ./...` | Chạy test của các package |
| `go vet ./...` | Tìm một số mẫu code có khả năng là lỗi |
| `go mod tidy` | Cập nhật yêu cầu dependency và checksum theo code |

`./...` chọn các package phù hợp dưới thư mục hiện tại. Format giúp thống nhất cách trình bày; build trả lời code có biên dịch được không; test kiểm tra những hành vi được viết thành test; vet tìm thêm những mẫu đáng ngờ. Không công cụ nào tự chứng minh toàn bộ chương trình đúng.

Từ đây, đọc [biến và kiểu](/vi/notes/go/variables/), rồi điều khiển luồng và hàm. Sau đó đến pointer, slice, map; struct, method, interface và composition; cuối cùng mới nối sang goroutine, channel, context và GC. Mạch này giúp mỗi khái niệm có đủ nền tảng để giải thích hành vi của nó.

## Tự kiểm tra

**1.** Nếu chuyển `total` sang file `total.go` cùng thư mục và cùng `package main`, `main.go` có cần import `total.go` không?

**2.** `go build .` thành công nhưng tổng chi tiêu sai đơn vị. Build đã xác nhận điều gì, và điều gì cần kiểm tra bằng hợp đồng dữ liệu?

**Giải thích:** Không import file trong cùng package; các khai báo package được dùng chung. File nào trực tiếp dùng một package khác vẫn cần import riêng. Build xác nhận các điều kiện biên dịch, gồm quy tắc kiểu; nó không biết 120 đang là đồng hay cent. Đơn vị, miền giá trị và quy tắc tính cần được quyết định, diễn đạt và kiểm tra ở tầng ứng dụng.

## Tài liệu đối chiếu

- [Go FAQ](https://go.dev/doc/faq) — lịch sử, mục tiêu thiết kế và runtime.
- [Create a Go module](https://go.dev/doc/tutorial/create-module) — module và cách khởi tạo.
- [Effective Go](https://go.dev/doc/effective_go) — cách tổ chức và diễn đạt code Go; đọc cùng tài liệu tính năng theo phiên bản khi cần.
