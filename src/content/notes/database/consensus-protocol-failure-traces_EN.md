---
title: "Consensus Under Failure: Tracing Paxos, Raft, ZAB, and PBFT"
category: "Database"
description: "Follow messages and state when a proposer, leader, replica, or network fails mid-consensus."
updated: 2026-10-18
translationKey: "database/consensus-protocol-failure-traces"
---

Consensus makes processes decide on the same value; it is more than one node broadcasting an announcement. A protocol commonly needs three properties: **agreement** (no two decisions conflict), **validity** (the decided value was validly proposed), and **termination** (correct processes eventually decide when progress conditions hold). In an asynchronous network with possible crashes, FLP shows that termination cannot be guaranteed for every message schedule while preserving safety; practical protocols rely on timeouts, eventual synchrony, or quorum assumptions.

## Reliable broadcast differs from atomic broadcast

Reliable broadcast tries to ensure a message is delivered consistently to a group: if one correct process delivers it, other correct processes do too, and a message without a valid source is not invented. But two nodes may receive `m1`, `m2` in different orders. **Atomic/total-order broadcast** adds a shared delivery order: if two nodes deliver both messages, they deliver them in the same sequence.

This matters for a replicated log. The same data can produce different results when applying `set x=1` then `set x=2` versus the reverse order. Atomic broadcast agrees on log positions before replicas apply commands. A total order in a log does not itself make several commands one atomic SQL transaction; transaction semantics live at another layer.

## Paxos: a quorum carries previously accepted history

Each acceptor durably stores the highest proposal number it has promised, along with any value/ballot it accepted. A proposer starts phase 1 with `Prepare(n)` and collects `Promise` responses from a quorum. An acceptor rejects ballots below its stored promise; if it accepted a value, it reports the value with the highest ballot. The proposer must select that value if one exists and may use a new client value only if the quorum reports no earlier accepted value. It then sends `Accept(n,v)`; a value is **chosen** once a quorum accepts it.

Consider three acceptors A, B, and C, with quorums of two. The scenarios in the chapter show why “accepted” and “chosen” cannot be treated as synonyms:

| Event sequence | What has happened? | What must a new proposer do? |
| --- | --- | --- |
| P1 receives accepts from B and C for `v1`, then crashes before notifying learners. | `{B,C}` is a quorum, so `v1` is chosen even though the client has not heard the result. | Every Phase 1 quorum for P2 intersects `{B,C}`. P2 will see `v1` and must propose `v1` again. |
| P1 receives an accept for `v1` only from A; A is alive and included in P2's Phase 1 quorum. | `v1` is accepted at one node, but not chosen. | A reports the accepted value; P2 must select the highest-ballot accepted value reported by the quorum, which is `v1` here. |
| P1 receives an accept for `v1` only from A; A is absent from P2's Phase 1 quorum. | `v1` is not chosen, and P2's quorum has not seen evidence of it. | P2 may choose a new value, `v2`. If A later returns, ballots/Promises and quorum intersection protect the chosen decision; A's old state cannot overwrite it. |

The third case is safe only because `v1` was never accepted by a quorum. If A and another acceptor had accepted `v1`, every majority Phase 1 quorum would intersect that quorum and P2 would have to preserve `v1`. Acceptors must retain Promise/accepted state durably across restarts; otherwise the quorum-intersection argument no longer holds.

Two proposers can keep starting higher ballots, causing acceptors to promise a newer ballot before the other proposer gathers its quorum. Ballots and adoption preserve safety, but termination slows. Multi-Paxos uses a stable leader to reuse phase 1 across log slots; leader failure returns to election/phase 1, while durable state and snapshots keep the log from growing forever.

## ZAB: establish an epoch, synchronize history, then broadcast

ZAB uses a temporary leader and increasing epochs to distinguish history before and after an election. A client may connect to a follower; the follower forwards requests that need global ordering to the leader. A new round has three broad activities:

1. **Discovery:** a candidate collects follower history and determines the new epoch/transaction ID.
2. **Synchronization:** the new leader brings followers to a common history, completing proposals committed in earlier epochs before sending new proposals.
3. **Broadcast:** the leader assigns zxids, sends proposals in order, and waits for followers to acknowledge the current proposal before sending the next. After quorum acknowledgment, proposals are committed/delivered in the same order. The broadcast path takes two message rounds: proposal, then acknowledgment; a commit notification follows.

If the leader fails before a proposal has a quorum, the proposal is not considered committed. During synchronization, the new leader recovers from the follower with the highest committed proposal and streams the missing history from it; it does not collect history from every follower. A follower that loses its leader starts an election; a leader that cannot reach a quorum steps down. Epochs prevent messages from an old leader from being accepted as current proposals. Ordered delivery makes duplicate protocol messages consistent across replicas, but external side effects still need an idempotency key or retry-safe handling when a client loses the response.

## Raft: elect a candidate with an up-to-date log

At most one valid leader exists per term. A follower starts an election after a randomized timeout, increments its term, votes for itself, and sends `RequestVote`. A candidate needs a majority; a follower votes only once per term and rejects candidates with a less up-to-date log (compare the last entry’s term first, then index). Randomized timeouts reduce simultaneous split votes.

The leader sends `AppendEntries` with `prevLogIndex` and `prevLogTerm`. A follower accepts the suffix only if the preceding entry matches; otherwise, the leader adjusts the starting point and retries. A follower may delete and replace a conflicting, uncommitted suffix with the new leader’s log; a leader never edits or deletes its own log entries.

The leader commits an entry when a majority has stored it, but Raft’s rule lets the leader directly conclude only for entries from its current term; older entries become committed indirectly when a later current-term entry commits. This rule works with the election restriction to preserve committed entries across terms. A minority partition cannot commit. When the network heals, nodes with stale logs converge under a valid leader.

## Fast/Flexible Paxos and EPaxos change the path

Fast Paxos lets a client send directly to acceptors in a fast round to skip one leader hop. In exchange, the fast quorum is larger; if two values compete, acceptors may see a collision and the coordinator must run a recovery round.

Flexible Paxos does not require every quorum in every phase to intersect. Safety requires a phase-1 quorum to intersect phase-2 quorums that could have chosen a value. With N=5, phase 2 can require 2 acceptors if phase 1 is raised to 4, because `Q1 + Q2 > N`. A smaller commit quorum trades off against more expensive election/failover.

EPaxos replaces a stable leader with a **command leader** for each operation: the client can submit to a nearby replica, distributing load and avoiding one node on every request path. Two commands *interfere* only if running them in different orders could change the state or a read result. For example, writes to separate counters are usually independent; a write and a read of the same balance are not.

When it receives a command, the command leader creates a `PreAccept` containing two pieces of information: dependencies on potentially interfering commands, including commands not yet committed; and a sequence number greater than the sequence of every known dependency. Replicas compare the proposal with their local logs, add dependencies or raise the sequence if they see a conflict the leader missed, then report their view. If a fast quorum agrees with the leader on the same `(dependencies, sequence)` pair, the command takes the fast path. If replies in the fast quorum disagree, the leader merges the dependencies, takes the highest sequence, and runs a Paxos-Accept slow path using a slow quorum. If no fast quorum is available but enough replies form a slow quorum, it can also use the slow path; without a slow quorum, the command cannot commit.

Commit and execution are separate. Replicas keep a dependency graph and execute a command only after its dependencies have committed/executed, in a compatible topological order. Independent commands can therefore commit in different orders at different replicas while producing equivalent state; interfering commands must preserve the same ordering relation. Ballots include a configuration epoch, a replica-local counter, and the replica ID to avoid collisions; a stale proposal is rejected with the highest sequence/dependency state known by that replica.

Read EPaxos quorum counts against the algorithm version. With `N = 2F + 1` replicas and up to `F` failures, the original paper describes basic EPaxos with a fast quorum of `2F` and a slow quorum of `F + 1`; the optimized version reduces the fast quorum to `F + floor((F + 1) / 2)`. For `F = 2`, or five replicas, the basic fast quorum is 4, the slow quorum is 3, and the optimized fast quorum is 3. The book prints `ceil(3f/4)` for the fast quorum in this section; that formula is an error. Check the [EPaxos paper](https://istc-cc.cmu.edu/publications/papers/2013/epaxos-sosp2013.pdf) and [book errata](https://www.databass.dev/errata) for the corrected counts. The fast path still requires the selected quorum to agree on dependencies and sequence; otherwise the protocol uses the slow path.

## PBFT: replicas cross-check one another

A crash-fault protocol assumes a node stops but does not lie. PBFT tolerates up to `f` Byzantine replicas with `n = 3f + 1` nodes; for example, tolerating `f = 1` requires at least four replicas. The replicas beyond the `f` faulty nodes let correct participants cross-check messages even when additional nodes do not respond.

Within a view, the primary is selected by `view mod n`. It attaches a sequence number and digest to a request and sends `PRE-PREPARE`. Each backup checks the view, sequence, and digest before accepting it. Replicas then broadcast `PREPARE` messages with the same view, sequence, and digest, without retransmitting the payload. A replica advances past prepare after receiving `2f` matching prepares from other backups; this makes correct replicas agree on the request at that position. A prepared replica broadcasts `COMMIT` and waits for `2f + 1` matching commits, possibly counting its own. Once that threshold is met, the replica executes the request in order and replies.

A client normally needs `f + 1` matching replies from distinct replicas. At least one must come from a correct replica, so a Byzantine primary cannot make the client trust a false result by itself. The chapter distinguishes a **tentative** path that reduces messages from the normal completed path: replicas may tentatively execute after becoming prepared, and the client waits for `2f + 1` matching results; if it cannot collect them, it retries and waits for `f + 1` completed replies. A read-only operation can take one round trip, but replicas respond only after ongoing changes that could affect the read have committed; the client must also collect `2f + 1` matching values from distinct replicas.

When the primary is suspected of failing, replicas stop processing ordinary requests, while continuing to handle checkpoints and view changes. Each replica broadcasts a view-change message and waits for confirmations. The next view's primary starts the view after receiving `2f` view-change messages, carrying information about requests that reached a safe state so the new primary cannot begin from an arbitrary history.

Replicas keep messages in a stable log at least until a request has executed on `f + 1` replicas. Every `N` requests, where `N` is configurable, the primary creates a stable checkpoint containing the latest sequence number reflected in state and a digest of that state. A proof from `2f + 1` replicas lets them safely discard older log messages. A recovering replica compares checkpoint digests and validates messages after the checkpoint; trusting a snapshot from one node would let recovery introduce fabricated state.

## When reading a protocol or choosing a library

Write down the message schedule at the failure point: who persisted a ballot/term, who voted, which quorum replied, and which operation was acknowledged to the client. Then check safety under delayed, duplicated, or reordered messages and liveness when the leader or majority is unavailable. Understand snapshots, log truncation, membership changes, disk full, upgrades, and client retries too. The name “Paxos” or “Raft” does not prove that an implementation meets those conditions.

## Check your understanding

**Does one acceptor accepting a value mean it is chosen?** No. A quorum must accept it; but an accepted value reported by a phase-1 quorum may force a new proposer to preserve it.

**Can a Raft leader commit an old entry only because a majority contains it?** The current-term rule requires directly committing an entry from the current term; older entries commit indirectly through a newer entry.

**Why does PBFT require more replicas than Raft?** A Byzantine node can lie or send conflicting messages, so the quorum must be large enough for correct nodes to outweigh faulty ones.

*Database Internals*, chapter 14. See the [Raft paper](https://raft.github.io/raft.pdf), [Paxos Made Simple](https://lamport.azurewebsites.net/pubs/paxos-simple.pdf), [ZooKeeper paper](https://www.usenix.org/legacy/event/atc10/tech/full_papers/Hunt.pdf), [EPaxos paper](https://istc-cc.cmu.edu/publications/papers/2013/epaxos-sosp2013.pdf), and [book errata](https://www.databass.dev/errata) for protocol details and the corrected EPaxos quorum formula.
