---
title: "gRPC and HTTP APIs: contracts, performance, and operations"
category: "Network"
tags: ["grpc", "rest", "http2", "network", "performance"]
description: "Compare schemas, transport, browsers, caching, deadlines, and guarantees instead of assuming one API style is always faster."
updated: 2026-10-15
translationKey: "network/api-communication"
---

One service needs an order from another. It could expose an HTTP resource such as `GET /orders/42` or a contract-defined call such as `GetOrder`. Either can support the business operation; the choice concerns contracts, client tooling, interaction patterns, and operations.

This article compares conventional gRPC with resource-oriented HTTP APIs using JSON. REST is an architectural style, not another name for HTTP/1.1 or JSON. Separating these layers avoids claiming gRPC is always faster without defining the comparison.

## One request, two contract styles

```text
GET /orders/42
Accept: application/json

200 OK
{"id":"42","status":"paid"}
```

In an HTTP API, the path identifies a resource, while methods and status codes express operations/results according to the API contract. JSON is a common representation. Such APIs can use HTTP/2 or HTTP/3; REST does not require HTTP/1.1.

With gRPC, services and messages are commonly described in Protocol Buffers and used to generate client/server code:

```protobuf
syntax = "proto3";

service OrderService {
  rpc GetOrder(GetOrderRequest) returns (Order);
}
message GetOrderRequest { string id = 1; }
message Order {
  string id = 1;
  string status = 2;
}
```

This illustrative schema still needs project-specific packages, code-generation options, and build setup. Clients use generated stubs rather than manually assembling JSON and URLs for each call. A schema helps with types, but does not define what “paid” means, authorization, or retry policy; those remain documented contracts.

[gRPC core concepts](https://grpc.io/docs/what-is-grpc/core-concepts/) distinguishes unary, server streaming, client streaming, and bidirectional streaming. Choose streaming for data that genuinely needs incremental exchange, not merely because communication is internal.

## Which layer contributes the cost?

Conventional gRPC runs over HTTP/2, allowing multiple streams on a connection instead of requiring a separate connection per RPC. HTTP/1.1 also supports connection reuse; it does not inherently reopen TCP for every request. HTTP/2 multiplexing does not remove all blocking: TCP packet loss can affect multiple streams sharing the connection.

Protocol Buffers encodes fields with numeric identifiers, wire types, and values instead of repeating JSON field names. This can reduce payload size and serialization costs for some workloads, but neither smaller messages nor faster calls are universal guarantees. HTTP/2's HPACK compresses headers, separately from message-body compression.

If a database query takes most of a request's 200 ms, reducing some serialization work does not automatically make the request fast. Compare equivalent data, TLS, connection reuse, concurrency, compression, and server work. Examine throughput and latency percentiles, not just a mean.

## Browsers, caches, and tooling affect the choice

| Need | What to examine |
| --- | --- |
| Browser clients | Native gRPC is not used like ordinary fetch; gRPC-Web with a proxy/adapter is one option with its own feature limits |
| Partner API | Can clients use schemas, code generation, and gRPC tools? HTTP/JSON is often easier to start with using common HTTP tooling |
| CDN/proxy caching | HTTP GET can use cache semantics when responses permit it; authorization, headers, and privacy still matter |
| gRPC caching | RPCs commonly use POST, without ordinary GET-cache behavior, but application or RPC-aware caching remains possible |
| Payload inspection | JSON is readable directly; protobuf needs schema-aware decoding tools, rather than being meaningless bytes |
| Bridging | gRPC-Gateway maps HTTP/JSON to RPC; mappings, errors, and operations still need design |

These are decision factors, not a rule assigning REST outside and gRPC inside. Public gRPC and internal HTTP APIs can both be appropriate. Choose for consumers and required capabilities.

## A deadline is not a rollback

Without a deadline, callers can wait beyond the useful lifetime of a request. A Go client can pass a context with a deadline:

```go
ctx, cancel := context.WithTimeout(parent, 2*time.Second)
defer cancel()

response, err := client.GetOrder(ctx, request)
if err != nil {
    return err
}
_ = response
```

The fragment assumes a parent context, generated client, and correctly typed request, inside a function returning error; import context/time. Expiry produces a protocol-level failure for the caller; server work must cooperate with cancellation and propagate context appropriately. Already committed work is not automatically undone. [gRPC deadline guidance](https://grpc.io/docs/guides/deadlines/) explains server-side cancellation responsibilities.

If a payment RPC times out, that error alone does not establish that no charge occurred. Before retrying, consider idempotency keys, status lookup, and the RPC contract. A circuit breaker can reduce repeated calls to a failing dependency, but does not replace deadlines or reverse side effects.

## Long-lived connections, security, and balancing

One HTTP/2 connection can carry many RPCs. Connection-level balancing can concentrate traffic on a backend; gRPC-aware L7 proxies or client-side balancing are options depending on topology, not a universal requirement to deploy Istio/Envoy.

Configure TLS and client identity for the environment. gRPC supports secure transports and insecure configurations; using gRPC does not prove TLS is enabled. Interceptors can implement authentication, authorization, logging, or call policies, but must cover relevant unary/stream paths. The [authentication documentation](https://grpc.io/docs/guides/auth/) distinguishes channel and call credentials.

Document schema evolution, deadlines, errors, retries, and observability alongside message types. These determine operability beyond the JSON-versus-protobuf choice.

## Check the decision

**Does an HTTP API become gRPC by using HTTP/2?** No. The HTTP version is a transport choice; gRPC also defines RPC, message, status, and tooling conventions.

**Must a gRPC backend be abandoned for browser support?** No. A bridge or separate HTTP API is possible, with implementation costs and feature constraints.

**Does a timeout justify retrying every RPC?** No. Determine whether repeating is safe and what the server might already have completed. See [Context](/en/notes/go/context/) and [ACID](/en/notes/database/acid/) to connect deadlines with data-change boundaries.

Further reference: [gRPC-Web](https://github.com/grpc/grpc-web), [gRPC-Gateway](https://github.com/grpc-ecosystem/grpc-gateway), [HTTP/2 RFC 9113](https://www.rfc-editor.org/rfc/rfc9113).
