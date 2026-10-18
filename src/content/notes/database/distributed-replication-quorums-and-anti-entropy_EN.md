---
title: "Quorums, Causal Consistency, and Anti-Entropy"
category: "Database"
description: "Trace replica writes, vector clocks, read repair, hinted handoff, and Merkle trees toward convergence."
updated: 2026-10-18
translationKey: "database/distributed-replication-quorums-and-anti-entropy"
---

A replicated database must decide which nodes accept reads/writes, how many replicas must respond, and how divergence is found and repaired. “Three replicas” alone says nothing about strong consistency or availability; quorums, failure models, conflict rules, and repair behavior matter.

Separate three communication patterns. **Notification broadcast** has one coordinator send an update to nodes; it is simple in a small cluster, but depends on the sender and a complete membership list, and the sender and every recipient must overlap in uptime. **Pairwise anti-entropy** lets replicas periodically compare and synchronize state. **Cooperative dissemination** lets recipients forward information to other peers. A design often separates fast primary delivery from periodic repair that fills missed messages. Anti-entropy reduces replica divergence; it does not require the original coordinator to stay alive forever.

## Quorums and consistency

With N replicas, write quorum W, and read quorum R, the sets intersect when `R + W > N`; with an appropriate version/leader rule, a read has a chance to observe a recent write. The formula alone does not guarantee linearizability: concurrent writes, sloppy quorums, partitions, replica state, and conflict resolution all matter.

Linearizable reads/writes respect real-time order; sequential consistency preserves one system-wide order but not necessarily real time; causal consistency preserves cause/effect order; eventual consistency requires replicas to converge if updates stop. Session guarantees such as read-your-writes or monotonic reads can use client-held session tokens/versions.

CAP applies when a partition occurs: the system must choose between responses consistent with single-copy semantics and continuing to serve potentially stale/conflicting responses. In normal operation there are latency/availability/consistency tradeoffs; CAP is not a universal “pick two of three” design rule.

## Vector clocks, conflicts, and CRDTs

A vector clock attaches a counter per replica to determine happens-before: if every component of A is ≤ B and at least one is smaller, A happened before B. If vectors are incomparable, updates are concurrent and must be merged or both versions retained for application choice. Clocks can grow with membership; pruning/compaction has tradeoffs.

CRDTs design state/operations so merge is associative, commutative, and idempotent under a chosen model. A G-Counter adds per-node components; a PN-Counter separates increments and decrements; an OR-Set uses tags so a concurrent add/remove does not erase the wrong value. The consistency-model note works through a G-Counter merge. CRDTs turn conflict into datatype rules, but do not preserve every business invariant such as “available seats never go below zero.”

## Anti-entropy

Read repair detects differences during a read and updates stale replicas; hinted handoff stores a write temporarily for a missing node and delivers later; digest reads compare hashes/versions before fetching full data. A Merkle tree divides keyspace into hash ranges so replicas can find divergent regions without comparing every item. Bitmap version vectors summarize observed writes and missing sequence numbers so replicas can identify which part of a log to exchange.

Gossip gradually spreads membership/version data. Anti-entropy must handle long-offline nodes, tombstone retention, conflict rules, and repair bandwidth; removing a tombstone too soon can resurrect deleted data from an old replica. Full-cluster repair can spike I/O/network, so limit throughput and monitor progress.

## Repair scope and each mechanism’s flow

A coordinator broadcast sends an update to every known member. It is fast and simple in a small cluster, but depends on the sender and complete membership. Pairwise anti-entropy lets two replicas periodically compare state and send missing parts; it repairs missed updates but may read and compare much data. Gossip lets each node choose some peers and forward information; it is more decentralized and handles churn, at the cost of duplicate messages and probabilistic convergence time. Many systems use broadcast for primary delivery and periodic repair to fill gaps.

### Read repair

The coordinator asks the replicas that hold the key/range the client is reading, compares versions/results, and sends missing data to stale copies. For example, three `cart:42` copies have versions `v8`, `v8`, and `v7`: the coordinator returns data under the version rule and repairs `v7`. If repair is synchronous before the response, the current read may wait for a slow node; background repair makes the response faster, but a later read may still see stale data. This only checks keys/ranges that are read, so cold data can remain divergent. A merge iterator can record exactly which records are missing from each replica input and repair only those gaps.

Blocking repair can provide **monotonic reads** with a quorum protocol: after a client has read a version, replicas on the read path are brought up to at least that version before returning, so a later read cannot fall back to an older value if no intervening write occurs. Waiting for target acknowledgments, however, reduces read availability. A non-quorum read that repairs only some replicas cannot guarantee that the next read reaches one of them.

### Digest reads

The coordinator gets the full result from one replica and only a digest/hash from the others. Equal hashes indicate the responses have the same fingerprint; if they differ, the coordinator must fetch full results from those replicas to identify versions and repair. A digest mismatch alone does not say which version is newer. Hash collisions are unlikely but possible; record encoding/canonical order must also match before hashing.

### Hinted handoff and sloppy quorum

When a target replica does not accept a write, the coordinator may store a **hint** with the key, version, and target node, then replay it when the node returns. A hint is usually not readable data; it is a reminder to hand the write over. The system needs limits on hint size and age, handling for nodes absent longer than retention, idempotent replay, and version comparison during handoff. If the node holding the hint also fails, the write can be lost.

With a **sloppy quorum**, the system may send a write to a healthy node outside the original replica set so it can still accept the request. That node holds the data temporarily and hands it to the correct replica later. This improves write availability during a partition, but acknowledging nodes may not overlap as they would in a quorum over the intended replicas; an acknowledgment count alone does not prove linearizability.

For example, if a key belongs on `{A,B,C}` but `B` is down, the coordinator may write to `{A,C,D}`. The copy on `D` carries a hint that the write was intended for `B`. When `B` recovers, `D` replays the write before removing the hint. A read from `{B,C}` on another partition immediately afterward may not see the write still held by `{A,C,D}`. Sloppy quorum trades certainty about replica placement for the ability to accept requests while an intended replica is missing.

### Merkle trees and bitmap version vectors

A Merkle tree hashes key ranges at its leaves and child hashes at parent nodes. Two replicas compare roots; if they differ, they descend through different branches until they locate a divergent range. If the left branches match, that side needs no scan. Smaller tree ranges locate differences more precisely but cost work to build, RAM, and exchange bytes; an update may require recomputing hashes from leaf to root. Trees are often built per partition or in batches.

A coordinator labels each write with a **dot** `(i, n)`, where `i` is a sequence number that increases locally at node `n`. Every node keeps a logical clock representing the dots it has seen, including writes it coordinated itself and writes received through replication. Its own sequence has no gaps; writes from another node can have gaps when some updates have not arrived. For example, P2 has seen `P1:1..3`, then `P1:5`, `P1:6`, and `P1:8`: a compact representation stores the continuous prefix `3` and a bitmap for later sequence numbers already seen. P1 compares the clocks to find the exact missing writes, `P1:4` and `P1:7`.

The logical clock says **which writes have been seen**; a dotted causal container (DCC) maps each dot to causal information for its key. This lets a node reconstruct the record to exchange and determine whether one write follows another or belongs to a concurrent branch. Knowing only that a sequence is missing is not enough to resolve conflicting values. Only after every node in the system has seen a continuous prefix can metadata and log entries before that prefix be safely compacted. A long-offline node can hold back log truncation for the group; compacting too soon removes the data needed for catch-up.

The bitmap version vector and DCC identify missing writes and preserve enough causal context to distinguish a later version from concurrent branches. They work best when an outage is short and the log still contains the missing operations. A long-disconnected node can prevent the whole group from truncating its logs, so retention and bootstrapping old nodes are part of anti-entropy design, not just storage details.

### Gossip, overlays, and hybrid dissemination

Nodes keep “hot” updates, periodically select `f` random peers (**fanout**), and send information; a peer that learns something new forwards it. **Latency** measures time to the convergence criterion; **redundancy** measures repeated sends. Higher fanout usually reduces rounds while increasing traffic. The time when every node has received information and the time gossip stops are different because in-flight messages can cause more repeats.

Gossip does not wait for a cluster-wide ACK proving every node received a message. Each node needs a rule for estimating when to stop forwarding: it can choose a stop probability on each round, or count duplicate copies and stop after a threshold. The threshold must be chosen for the cluster size and fanout; do not reuse one setting unchanged across clusters of different sizes. Higher fanout spreads a message faster but creates more duplicates. Stopping after duplicate sightings can reduce latency and redundancy because nodes stop after the message appears widely propagated; this is still a probabilistic signal, not proof that every node received it. A low threshold reduces traffic but raises the chance of omissions; a high threshold is more reliable but keeps updates hot longer and consumes more bandwidth.

Some epidemic gossip protocols can spread information in about `O(log N)` rounds as cluster size grows. This is a round-count result under a particular model and configuration, not a hard deadline for every node. Fanout and peer selection determine both latency and duplicate messages; a protocol with fewer rounds can still send more messages or bytes than a structured broadcast.

Think of a node that has not received an update as **susceptible**, one actively spreading it as **infective**, and one that has stopped spreading it as **removed**. The protocol does not need a global list to prove that every node received each update; instead, it uses “loss of interest” after an update has spread long enough or has been seen often enough. Stopping early saves bandwidth but increases the chance of missing a node; spreading longer increases reliability and duplicate traffic. Gossip offers probabilistic convergence and tends to make older event views converge; it does not guarantee exactly-once message delivery.

A spanning-tree broadcast uses fewer messages with stable topology, but one failed node/link can cut off a branch. Random gossip has redundant paths and tolerates failures better, but can form peer “islands.” A Plumtree-style hybrid eagerly sends full messages over a small tree and lazily sends message IDs over an overlay; a node that sees an unknown ID asks a peer for the content. If the tree breaks, lazy gossip reveals the gap and helps repair the overlay.

A peer-sampling service maintains a partial view instead of a full cluster list. HyParView keeps a small active view for dissemination and a larger passive view as replacements; nodes periodically shuffle membership. When an active peer fails, a node chooses another peer from the passive view. Too little overlap creates islands; too much overlap increases maintenance costs.

The replacement peer may reject a connection when its active view is already full. A joining node whose view is empty should be admitted so it can enter the overlay; this helps bootstrap and recovery, though another connection may need to be cycled out. Peer-sampling quality is therefore not only about how many peers are retained, but also how quickly the overlay returns to a connected state after churn.

| Situation | Suitable mechanism |
| --- | --- |
| Repair the key being read | Read repair |
| Compare mostly matching replicas without full values | Digest reads |
| Redeliver an update after a short outage | Hinted handoff |
| Find divergence even for rarely read keys | Merkle reconciliation |
| Identify the exact missing write sequence | Bitmap version vector |
| Spread metadata through changing topology | Gossip or a hybrid overlay |

These mechanisms can work together. They do not resolve concurrent values by themselves; the system still needs version ordering, a merge, or a way to retain conflicts for the application. Repair bandwidth also needs limits so synchronization does not raise load enough to delay replication further.

## Choose repair based on what is missing

Anti-entropy mechanisms differ in the scope they check, how much history they retain, and how completely they cover the dataset. These questions help select a mechanism more usefully than asking only which one is fastest.

| Priority | Common mechanism | Tradeoff |
| --- | --- | --- |
| Synchronize only data currently being read | Read repair | Cold keys can remain divergent until someone reads them. |
| Redeliver a few writes missed during a short outage | Hinted handoff or bitmap version vectors | Hints/logs must be retained long enough; after expiry or truncation, there is no event left to replay. |
| Find divergence across the keyspace, including rarely accessed data | Merkle tree | Hash ranges must be scanned or built, costing I/O, CPU, and metadata; trees need refreshing as data changes. |
| Spread metadata quickly through a large cluster | Gossip/hybrid overlay | Convergence is probabilistic; fanout and dissemination duration determine traffic, latency, and miss risk. |

These methods can form layers: primary replication sends writes to active nodes; hints or logs recover events missed during a short outage; Merkle reconciliation finds remaining divergence over a wider scope; gossip spreads metadata so nodes learn where repair is needed. Whichever approach is used, account for nodes offline longer than log retention and for deleted tombstones. Otherwise, repair may lack the missing history or bring deleted data back.

## Witnesses and sessions

A witness stores metadata/votes without full data to help quorum or failure detection, but cannot serve missing application data. Session tokens can route reads to a replica that has reached a required version or wait for catch-up. Stale replica reads should be an explicit application choice.

*Database Internals*, chapters 11–12, covers consistency, quorum/witness, vector clocks, CRDTs, read repair, digests, hinted handoff, Merkle trees, and gossip. See the [Dynamo paper](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf) for how the mechanisms fit together.

## Check your understanding

**Does R+W>N prove linearizability?** No; replication and conflict/order assumptions are also required.

**What do incomparable vector clocks mean?** The updates are concurrent; the application needs a merge or conflict rule.

**What can happen if a tombstone is removed too early?** An old replica may bring deleted data back.
