---
title: "Consistency Models: What Does the System Promise for Reads and Writes?"
category: "Database"
description: "Use read/write histories to distinguish linearizability, sequential, causal, session, and eventual consistency."
updated: 2026-10-18
translationKey: "database/distributed-consistency-models"
---

When a value is stored on several nodes, the hard question is not only “how many copies exist?” We also need to know how long another client may read an old value after a successful write; which orders are allowed for overlapping writes; and whether a client can see old data again after seeing newer data. A **consistency model** is a contract that describes which read/write histories the system permits.

We will use a register `x`, initially `0`, to follow the examples. An operation has an invocation and a response time. Two operations do not overlap if the first has completed before the next starts; otherwise they overlap and the system may have several valid ways to order them.

## From safe registers to read/write ordering

When a read overlaps a write, register models place different limits on its result:

- **Safe register:** a read overlapping a write may return any valid register value. This guarantee is weak, but clearly describes what can happen without an ordering rule.
- **Regular register:** a read overlapping a write may return the value before or during the write; a non-overlapping read must see the latest completed write.
- **Atomic register:** every operation appears to fit in one sequential order, consistent with the real-time order of non-overlapping operations. This is close to linearizability for a register.

Let `x` be an integer initialized to `0` while a client is writing `1`. If a read overlaps that write, a **safe register** may return any value in `x`'s domain, such as `7`; if `x` is a bit, repeated reads may even flicker between `0` and `1`. A **regular register** may return only `0` or `1`: the latest old value or the value of the in-progress write. With an **atomic register**, there is one logical boundary: reads ordered before it see `0`, reads ordered after it see `1`, and every client observes results in an order consistent with real time. When no write overlaps, all three models return the latest completed write.

These names describe observable behavior, not the internal algorithm. A distributed system may need messages, logs, or quorums to make replicas produce the desired behavior.

**Strict consistency** is a stronger ideal: every write takes effect instantly everywhere according to a global clock, so every read that starts afterward must see it. Finite network speed and distant nodes make this model impossible to implement literally. Linearizability is more practical: each operation has a linearization point between invocation and response, so a write needs to become consistent at one valid point while it is in progress.

## Linearizability: preserve real-time order

Linearizability requires every operation to appear as if it happened instantly at a point between invocation and response. That imaginary instant is the **linearization point**. If `x = 1` has returned before another read begins, that read must see `1` or a newer value; it cannot see `0`.

Consider this history with initial `x = 0`:

| Client | Operation | Timing |
| --- | --- | --- |
| A | `write(x, 1)` | invoked; still processing |
| B | `write(x, 2)` | invoked; completes before A |
| C | `read(x) → 1` | after B completes |

This history cannot be linearizable: B completed before C’s read began, so the read must see `2` or a write ordered after B. Returning `1` violates real-time order. If both writes are in progress and have not returned, they overlap; the system may order `1` before `2` or `2` before `1`, but all later reads must fit the same valid order.

Linearizability lets applications reason as if they use one copy of the data. In exchange, nodes must coordinate on when a write takes effect. This adds a round trip and may block an operation when a quorum cannot be reached. Linearizability of each object separately does not automatically provide one atomic transaction across multiple objects.

An atomic write replaces a value without checking an earlier condition; **compare-and-swap (CAS)** replaces it only if it still equals the value the caller observed. CAS can publish a result computed in advance, but if the value changes `A → B → A`, a value-only comparison misses the intermediate state (**the ABA problem**). When that history matters, attach a version/tag instead of comparing only the payload.

RIFL makes the conditions for this retry mechanism explicit: a lease grants the client ID; each request has an increasing sequence number; a completion object is stored durably with the record; and creating that completion object must be atomic with the record mutation. On retry, the server returns the completion result instead of applying the mutation again. The object remains until the client promises not to retry or the server determines that the client has crashed; once the lease expires, requests from that old client are not committed and its lease metadata can be garbage-collected. If the completion object and mutation are not atomic, a crash between them can still leave “effect applied, dedup record missing.” RIFL is a design for linearizable RPC, not a transport guarantee.

## Sequential consistency: one shared order that may be stale

Sequential consistency requires every client to observe the same global order while preserving each individual client’s operation order. That global order does not need to match real time between clients.

For example, A writes `x = 1`, followed by B writing `x = 2`; the writes may be observed in the order `2 → 1` if they overlap or the system does not preserve real-time order. The key requirement is that every reader agrees on one order: one client cannot see `1 → 2` while another sees `2 → 1`. Compared with linearizability, sequential consistency relaxes real-time synchronization, but clients still need a shared ordered history.

## Causal consistency: preserve cause and effect

Not every operation needs a global order. If B is created after someone reads A and responds to it, then B causally depends on A. Causal consistency requires every replica to show A before B. Independent writes have no happens-before relation and may arrive at replicas in different orders.

Consider a forum: Linh posts a question `Q`; Minh reads `Q` and posts a reply `A`. A replica must not show `A` without `Q`, or readers will see an answer with no question. By contrast, two independent posts can appear in different orders at different locations.

Vector clocks or causal metadata attached to operations help replicas know which dependencies must come first. If an update arrives before its dependency, a replica can hold it until the context is complete. A vector clock tells us whether two branches are ordered or concurrent; it does not choose how to resolve concurrent branches. The system needs a business-specific merge or must keep multiple versions for the client.

## Session guarantees: stability from one client’s view

Client-centric models ask whether a client can see state move backward during a sequence of operations. Four common guarantees are:

- **Read-your-writes:** after a client writes `x = 1`, its next read does not return `0`.
- **Monotonic reads:** after a client sees version 5, its next read does not return version 3.
- **Monotonic writes:** writes from one client are applied in the order the client sent them, so an older update does not arrive later and overwrite a newer one.
- **Writes-follow-reads:** a client’s write remains ordered after writes it observed in earlier reads.

One implementation carries a session token or version context with each request and reads only from a replica that has reached that version. If none is ready, the system can wait, route elsewhere, or return an error. Session guarantees do not create an order between different clients. They help with user experiences such as “I can see my update after saving,” but do not replace linearizability for a global invariant such as allocating the last seat exactly once.

A related guarantee is **PRAM/FIFO consistency**: every replica sees writes from one process in the order that process issued them, but writes from different processes need not share one global order. Combined with read-your-writes and monotonic reads, PRAM can give each client a stable view of its own updates without establishing a history like linearizability. “Everyone sees my writes in order” is weaker than “everyone agrees on the order of all writes.”

## Eventual consistency: convergence with no fixed deadline

Eventual consistency says that if a key stops receiving updates and replicas continue exchanging data, they eventually converge according to their conflict-resolution rules. “Eventually” provides no time bound. A client may read stale data for a period that depends on load, network conditions, repair, and system policy.

If two replicas write concurrently, the system must define the “final value.” Last-write-wins often compares timestamps, but clock skew can discard a valid update. A vector clock detects concurrent versions but leaves the merge to the application. A CRDT defines a data structure with a merge operation designed to let replicas reach the same state after receiving the same updates.

Strong eventual consistency adds deterministic convergence: once all valid updates have propagated, replicas merge to the same valid state. It does not mean every read before convergence is strongly consistent.

### A G-Counter example

Three nodes keep a vector `[c1, c2, c3]`. Each node increments only its own component. Initially all three have `[0,0,0]`. If node 1 increments once and node 3 increments once, they may hold `[1,0,0]` and `[0,0,1]`. When they exchange state, each replica takes the maximum of every component:

`merge([1,0,0], [0,0,1]) = [1,0,1]`

The counter value is the sum of the components, or 2. A max merge is independent of delivery order, and merging the same state twice changes nothing; because each node only updates its own component, independent increments do not overwrite one another. A PN-Counter uses two vectors: one accumulates increments and the other decrements; the value is the increment total minus the decrement total. Vector metadata grows with participant count, so a large system may need hierarchical dissemination or metadata compaction.

For a register, **last-write-wins (LWW)** chooses the value with the larger timestamp. This is easy to merge but can discard a value because of clock error or concurrent updates. A **multi-value register** keeps concurrent branches for the application to select or merge, at the cost of version context and conflict handling. A CRDT merge rule solves convergence for a particular datatype; it does not automatically preserve a business invariant such as “never sell more tickets than remain.”

## CAP, latency, and how much data to return

CAP considers a network partition: nodes cannot communicate. If the system keeps answering every request on both sides, it may have to return stale data or accept concurrent updates. If only the quorum side is served to preserve linearizability, the other side may reject or wait. This is a choice during a partition, not a “pick any two of three” switch at design time.

In CAP, **consistency** means behavior close to linearizable reads and writes; it does not mean ACID consistency, which concerns data invariants. **Availability** is also a formal condition: every request received by a non-failing node must get a valid response, not simply “high uptime.” CAP addresses network partitions; an isolated node crash is a different failure. A practical design must state which failure is happening and which requests may still be answered.

Even without a partition, strong consistency often requires coordination and increases latency. PACELEC adds that when the system is operating normally, we still trade latency for consistency. An application should choose based on its invariant: a money transfer may require strong ordering; page views may accept an approximate count.

Harvest and yield describe response quality by degree. **Yield** is the fraction of requests served; **harvest** is how complete the result is. A search could return 99 of 100 results when one shard is unreachable, keeping yield high while harvest falls. Partial results only fit when the application makes clear what may be missing; it must not silently present an incomplete result as complete.

## Tunable consistency and quorum

With N replicas, a protocol may require W replicas to acknowledge a write and R replicas to answer a read. If `R + W > N`, the two response sets overlap in at least one replica in the simple model. For example, `N=3, W=2, R=2`: a write needs two acknowledgments and a read asks two nodes. Depending on topology and protocol, this quorum can tolerate one unavailable node.

Intersection alone does not prove linearizability. We also need to know where an acknowledging replica stored the write, how versions are compared, what happens to concurrent writes, which speculative response a read may use, and whether failover loses the intersecting node. Sloppy quorums and multiple data centers change the assumptions too. A quorum is one part of a protocol, not a replacement for a safety argument.

### A timed-out write can make reads move backward

Suppose three replicas `A, B, C` use `N=3`, read quorum `R=2`, and write quorum `W=2`. A new write reaches `A`, but `B` does not respond, so the write times out before reaching `W`; the client receives no successful acknowledgment. A read quorum `{A,B}` may see the new value, while `{B,C}` sees only the old value. Because the write did not complete, the formal intersection `R + W > N` does not guarantee that every read sees it. Two consecutive reads can return the new value and then the old value if they contact different quorums.

To preserve **monotonic reads** after this case, a protocol may wait for or repair the necessary replicas before returning a result, but blocking read repair reduces availability when enough replicas cannot be contacted. Keep the guarantees separate: quorum intersection applies to writes acknowledged under the protocol; it does not determine the outcome of an incomplete write.

With `N = 2f + 1`, a majority quorum needs `f + 1` responses and can make progress while up to `f` replicas are unavailable, assuming the remaining replicas can communicate and the protocol accepts that quorum. If a write was not confirmed widely enough and the replica elected leader is then lost, a later read may miss a write the client observed elsewhere. Some protocols block reads while repair is needed; others may return a version that is not monotonic. State both what an acknowledgment guarantees about durability and how reads behave during recovery.

A **witness replica** stores metadata that a write occurred instead of the full record. When a quorum includes a witness but at least one data copy remains, the system can recover the record from another replica and bring the copy replica up to date. Witnesses save storage compared with copying every byte, but cannot serve queries that need content they do not hold. Quorum rules must ensure that a read can find the record on a copy or use witness metadata to know where recovery is possible.

In one witness design, if the data-bearing replicas are temporarily unavailable, a witness can be promoted to accept a temporary data copy so the system can still form a quorum. When a data replica returns, the system repairs it and demotes the witness back to metadata-only service. This saves permanent storage, but is safe only when the protocol defines promotion, acknowledged data, and synchronization before demotion.

CRDTs include more than counters and registers. A **G-Set** only adds elements; merging takes the union, so an observed element is never lost. To support removal, a structure must track add/remove metadata, such as an observed-remove set: a remove deletes only adds it has observed, so a concurrent add can remain. A **CmRDT** propagates operations that commute and are applied in causal order; operations must be independently applicable without side effects outside the structure. JSON CRDTs extend these ideas to nested objects, lists, and fields, at the cost of more metadata and conflict rules. CRDTs help replicas converge; they do not preserve every business invariant automatically.

## Choose a model based on what users need to observe

| Product question | Model or technique to consider |
| --- | --- |
| After a successful operation, must another client see it in real-time order? | Linearizability, with matching coordination and quorum |
| Must every client see the same order, but may be stale relative to real time? | Sequential consistency |
| Must a reply appear after the post it depends on? | Causal consistency and context propagation |
| Must one user read back a just-written update? | Read-your-writes/session token |
| Can approximate data or later convergence be acceptable? | Eventual consistency with an explicit conflict/merge policy |

Before choosing, write a small history: which client writes what, which request returns first, where each client reads, and which results are acceptable. That history often reveals whether the real requirement is a session guarantee, causal order, or global linearizability.

## State consistency also includes schema and membership

Data replicas can be eventually consistent while the system still fails because nodes interpret that data using different metadata. Chapter 8 gives two Cassandra examples: schema changes reach servers at different times, so one server encodes while another decodes using a different schema; or nodes have different ring views and route a key to the wrong owner or conclude that a record is absent. These examples belong to the book’s version and context. The general lesson is that **data and the metadata used to interpret or route that data have separate consistency contracts**.

A cluster must ask more than “have the replicas converged?” It must also ask: which schema version is each node using; which membership or ownership epoch is active; can a query pass through a node that has not applied the new configuration; and can an older node still read a new encoding during rollout? Versioned metadata, checking schema agreement before sensitive operations, and moving membership through epochs make compatibility boundaries explicit. They do not replace the database’s protocol for propagating and acknowledging configuration.

## Check your understanding

**A write returns successfully before a read starts, but the read returns an old value. Is this linearizable?** No. Real-time order requires the read to see that write or a newer one.

**Can two independent writes reach replicas in different orders without violating causal consistency?** Yes, if they have no causal relation. Operations that depend on one another must keep the same order.

**Does `R + W > N` guarantee that every quorum-based system is linearizable?** No. It only shows overlap in a simple model; the protocol, versioning, concurrent writes, and failover determine the actual guarantee.

*Database Internals*, chapter 11. This note moves from register semantics through linearizability, sequential/causal/session/eventual models to CAP, harvest/yield, tunable quorum, witnesses, and strong eventual consistency.
