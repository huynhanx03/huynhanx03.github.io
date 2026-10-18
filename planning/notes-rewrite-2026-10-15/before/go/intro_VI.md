---
title: "Go: ngôn ngữ, cách tổ chức chương trình và bộ công cụ"
category: "Go"
tags: ["golang", "philosophy", "intro"]
description: "Go là ngôn ngữ biên dịch, định kiểu tĩnh, có quản lý bộ nhớ tự động. Bài này giải thích cách đọc một chương trình Go nhỏ và vì sao Go ưu tiên mã rõ ràng, dễ duy trì."
updated: 2026-10-14
translationKey: "go/intro"
---

Go là ngôn ngữ biên dịch, định kiểu tĩnh, có quản lý bộ nhớ tự động. Bài này giải thích cách đọc một chương trình Go nhỏ và vì sao Go ưu tiên mã rõ ràng, dễ duy trì.

## 1. Go được tạo ra để giải quyết điều gì?

Robert Griesemer, Rob Pike và Ken Thompson bắt đầu thiết kế Go tại Google năm 2007; Go được công bố năm 2009. Ngôn ngữ chịu ảnh hưởng từ C, họ Pascal/Modula/Oberon và các ý tưởng concurrency của CSP. Những ảnh hưởng này giải thích cú pháp, package và channel; chúng không có nghĩa Go có cùng quy tắc bộ nhớ với C.

Mục tiêu thực tế là phát triển phần mềm theo nhóm: biên dịch nhanh, code dễ đọc, dependency rõ và hỗ trợ nhiều tác vụ đang tiến hành. Go có 25 từ khóa, nhưng ít từ khóa không làm mọi bài toán đơn giản. Bạn vẫn phải hiểu ownership, lỗi, kiểu dữ liệu và đồng bộ hóa.

## 2. Đọc chương trình đầu tiên

```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, Go")
}
```

`package main` khai báo package của file. `import "fmt"` đưa công cụ định dạng/in ra vào phạm vi sử dụng. `func main()` là điểm bắt đầu của chương trình thực thi; các câu lệnh trong thân hàm chạy theo thứ tự. Package thư viện thường dùng tên khác và không cần hàm main.

Chương trình Hello ở trên là file hoàn chỉnh. Các ví dụ ngắn trong các bài sau thường là đoạn trích trong một hàm: thêm package/import và đặt đúng vào thân hàm trước khi chạy. Khi xuất hiện tên như ctx, items hoặc db, đó là dữ liệu được caller cung cấp, không phải biến Go có sẵn.

## 3. Module, package và file khác nhau thế nào?

Một module là đơn vị quản lý dependency, được mô tả bởi `go.mod`. Một module có thể chứa nhiều package; một package thường gồm các file Go trong cùng thư mục. Các file cùng package dùng chung các khai báo ở phạm vi package. Import sử dụng đường dẫn package, không phải đường dẫn tới một file cụ thể.

```sh
go mod init example.com/hello
go run .
go build .
```

Các lệnh trên lần lượt tạo module, biên dịch rồi chạy package hiện tại, và build package. Với package main, build tạo executable. Binary có thể có dependency hệ thống khi dùng cgo hoặc chế độ build đặc biệt; không nên mặc định mọi binary Go đều liên kết tĩnh hoàn toàn.

## 4. Tường minh về lỗi và hành vi

Go thường trả lỗi như một giá trị cuối cùng. Compiler không buộc bạn xử lý mọi error: bỏ qua nó vẫn có thể biên dịch. Chính vì vậy, code cần cho thấy rõ lựa chọn khi thất bại: trả lỗi, retry có giới hạn, hay tiếp tục với một kết quả thay thế hợp lệ.

```go
data, err := os.ReadFile("config.json")
if err != nil {
    return fmt.Errorf("read config: %w", err)
}
_ = data
```

Đây là đoạn trích trong hàm trả `error`, dùng `os` và `fmt`. Kiểm tra lỗi trước khi sử dụng data giúp tránh tiếp tục bằng dữ liệu không hợp lệ. Mẫu này sẽ được giải thích kỹ trong bài Errors.

## 5. Composition, interface và concurrency

Go tổ chức dữ liệu bằng struct, hành vi bằng method, và hợp đồng bằng interface. Composition lắp ghép các thành phần; embedding giúp rút gọn truy cập nhưng không tạo quan hệ lớp cha/lớp con. Goroutine và channel giúp phối hợp công việc; mutex vẫn là lựa chọn phù hợp khi bảo vệ trạng thái dùng chung. Channel không tự loại bỏ data race nếu bạn vẫn sửa cùng một object ở nhiều nơi.

## 6. Bộ công cụ và thứ tự học

`go fmt ./...` thống nhất định dạng; `go build ./...` biên dịch các package; `go run .` chạy ứng dụng; `go mod tidy` cập nhật dependency theo code. `go test ./...` chạy tests và `go vet ./...` tìm một số lỗi đáng ngờ. Dùng build để kiểm tra khả năng biên dịch, test cho hành vi, và vet để tìm các mẫu code đáng ngờ; mỗi công cụ trả lời một câu hỏi khác nhau.

Hãy học theo mạch: biến và kiểu → điều khiển luồng → hàm/lỗi → pointer, slice, map → struct, method, interface, composition → goroutine, channel, context → GC. Khi gặp từ runtime, hãy hiểu đó là phần hỗ trợ chương trình lúc chạy, gồm lập lịch, cấp phát bộ nhớ và thu gom rác.

## Ví dụ áp dụng

### Tình huống: bắt đầu một chương trình nhỏ

Giả sử bạn muốn viết công cụ tính tổng chi tiêu. Bắt đầu với một module và một chương trình có thể chạy, rồi mới tách package khi có trách nhiệm rõ ràng. Một cách tổ chức ban đầu:

```text
expense/
├── go.mod
└── main.go
```

Trong thư mục expense, `go mod init example.com/expense` tạo danh tính module; `go run .` biên dịch và chạy package hiện tại. Đường dẫn module chưa cần là một repository đã công khai để bạn chạy chương trình cục bộ. File main.go dưới đây là chương trình hoàn chỉnh.

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

Luồng đọc là main → total → kết quả. Giữ tiền bằng số nguyên theo một đơn vị đã thống nhất, chẳng hạn đồng hoặc cent; ví dụ này chưa xử lý tràn số hay nhiều loại tiền. Khi chương trình lớn lên, hãy tách phần đọc dữ liệu khỏi phần tính toán để total vẫn dễ hiểu và dễ dùng lại.

## Tự kiểm tra

Giải thích module khác package ở đâu. Sau đó đọc chương trình Hello, Go và chỉ ra điểm bắt đầu, dependency và câu lệnh tạo output.

## Tài liệu đối chiếu

- [Go FAQ](https://go.dev/doc/faq)
- [Effective Go](https://go.dev/doc/effective_go)
