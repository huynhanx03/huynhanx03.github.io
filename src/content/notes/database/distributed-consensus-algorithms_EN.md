---
title: "Consensus, Atomic Broadcast, and Replicated Logs"
category: "Database"
description: "Compare Paxos, Raft, ZAB, and PBFT through safety, quorum, log replication, failures, and practical limits."
updated: 2026-10-17
translationKey: "database/distributed-consensus-algorithms"
---

Consensus lets multiple nodes reach the same decision despite failures or delayed messages. Databases often use it to agree on log/metadata order, not to bypass the transaction engine for every ordinary query. Separate three goals: **safety** never commits conflicting values; **liveness** eventually makes progress when assumptions permit; **linearizability** makes an operation appear to occur at one instant in real-time order.

In an asynchronous network, a message delayed indefinitely cannot be distinguished with certainty from a crashed process. FLP shows that termination cannot be guaranteed in every such schedule while preserving safety. Consensus usually preserves safety even when messages are delayed; timeouts/failure detectors help choose when to retry or elect a leader to improve progress, but a false suspicion can restart the protocol or make it wait for a new leader.

## Quorums and Paxos

In crash-fault consensus, quorums intersect so two majorities cannot independently decide conflicting values. Paxos divides proposal into prepare/promise and accept: a proposer raises its ballot, asks a majority, must preserve the highest previously accepted value reported by that quorum, then asks a majority to accept. The rule “adopt the previously accepted value” protects safety; it is not optional detail.

With `2f+1` acceptors, a majority of `f+1` can still make progress when up to `f` processes stop responding. Safety must hold for any number of failures, but liveness requires enough participants to form a quorum. A quorum is the threshold to wait for; a proposer can send to more nodes for redundancy but proceeds only after receiving a quorum.

Paxos has three logical roles: a **proposer** receives a client value and proposes a ballot; an **acceptor** durably stores promises and accepted state; a **learner** tracks chosen outcomes. One process may hold several roles. `Prepare(n)` promises that an acceptor will not accept a lower ballot; if it has accepted a value, its Promise returns the value with the highest accepted ballot. After collecting a quorum, the proposer sends `Accept(n,v)`, choosing the old value with the highest ballot if one exists, and otherwise the client’s value. A value accepted by one node is not necessarily chosen; choosing requires a quorum. Proposal numbers must increase and be unique among proposers, often using `(counter, node id)`.

Message delays can force a proposer to retry with a higher ballot; safety holds while progress can slow if proposers compete. Multi-Paxos keeps a stable leader to amortize phase 1 across log slots.

### Why are there so many Paxos variants?

Each variant changes one specific property of the network, quorums, or command relationships; its name does not guarantee that it is automatically faster:

| Variant | Idea | New costs or conditions |
| --- | --- | --- |
| Fast Paxos | A client can send a proposal directly to acceptors in a fast round, avoiding a leader hop when proposals do not conflict. | With `f` failures, a basic configuration uses `3f+1` acceptors and a fast quorum of `2f+1`, larger than the usual `f+1` quorum. Competing values can collide and require slower recovery; frequent collisions can make it slower than classic Paxos. |
| Flexible Paxos | Quorums from every phase need not intersect. Safety requires a Phase 1 quorum to intersect Phase 2 quorums that may have chosen a value; Phase 2 quorums do not necessarily need to intersect each other. | One can trade a smaller Phase 1 for a larger Phase 2, or vice versa, but must prove the quorum relationship for every failover. Both phases cannot be reduced arbitrarily. |
| Generalized Paxos | When commands are independent/commutative, replicas can agree on a partial order instead of immediately forcing all commands into one total order. | The protocol must define exactly which commands commute and handle dependencies/conflicts; dependent commands still need a compatible order. |
| Egalitarian Paxos (EPaxos) | There is no fixed leader for every command; a replica near the client can propose, track dependencies with conflicting commands, and use a fast path when quorum and failure-free conditions hold. | Dependency graphs, recovery, and execution order are more complex; partitions or conflicting commands can remove the fast path. Check the specific paper/implementation before generalizing. |

For example, two replicas receive `add 1 to counter A` and `add 1 to counter B`. If independent, a protocol can commit them in different orders on different replicas while keeping equivalent final state; `set balance=0` and `subtract 5` on the same balance do not commute. The algorithm must detect conflicts from semantics, not just from different payload bytes.

## A write-once register view of consensus

The book also gives another way to express **single-decree consensus**, using write-once registers. This is a model for reasoning about Paxos; do not confuse it with Generalized Paxos, discussed earlier, which handles partial orders of independent commands. Each server has an ordered sequence of registers. Registers at the same position across servers form a register set. A register can be written only once and can be unwritten, contain a value, or contain `nil` to mark a skipped position.

The state of a quorum for one register set can be described as follows:

| State | Meaning |
| --- | --- |
| `Any` | Not yet constrained; the quorum may still decide any valid value. |
| `Maybe v` | If this quorum decides, it must decide `v`; no decision is guaranteed yet. |
| `None` | This quorum cannot decide a value at this position. |
| `Decided v` | The value `v` has been decided. |

A client cannot inspect one server and infer a decision. When reading, it returns a decided value only when the same register set shows that value on a quorum. To write position `r`, phase 1 asks a quorum with `P1A(r)` what has already been written. If the quorum reports a value at an earlier register, the client must continue with the value at the greatest reported index; only when no prior value is present may it use its own input. Servers also mark lower positions with `nil`, preventing another client from returning to an obsolete position. Phase 2 sends `P2A(r, v)`. The client has evidence to return a decision only after a quorum responds. If phase 2 does not reach a quorum, the client must not guess the outcome; it starts phase 1 again to discover which value may have been written.

Consider three servers, `S0`, `S1`, and `S2`, with majority quorums `{S0,S1}`, `{S0,S2}`, and `{S1,S2}`. Client `C0` writes `V` to the first register. If `S0` and `S1` record it, quorum `{S0,S1}` is `Decided V`; the other two quorums are at least constrained to `Maybe V`, because each intersects the deciding quorum at a server that recorded the value. A later client cannot validly write a different value: its phase 1 will discover `V` from a quorum and require it to carry `V` forward. This expresses quorum intersection through state, rather than only through a message diagram.

At the next position, a client may proceed only if earlier positions have compatible states (`None`, `Maybe v`, or `Decided v`). If an earlier position is `Maybe v`, it retries with `v`; if a lower position can no longer be used, clients can mark it `nil` so it cannot leave a gap that enables a conflicting decision. This connects back to Paxos: a new proposer that finds evidence of an old value must carry that value forward, while a new ballot or register position lets later rounds get past competing proposers without invalidating a decision.

A quorum optimization also changes where failures are tolerated: a larger Phase 2 quorum may commit quickly while the leader is healthy, but make writes harder to achieve when nodes are slow; a smaller Phase 1 can make leader election easier but must still intersect prior Phase 2 history. Evaluate latency, fault tolerance, and recovery together. See [Fast Paxos](https://www.microsoft.com/en-us/research/publication/fast-paxos/), [Flexible Paxos](https://fpaxos.github.io/), [Generalized Consensus and Paxos](https://www.microsoft.com/en-us/research/publication/generalized-consensus-and-paxos/), and [EPaxos](https://www.usenix.org/conference/nsdi13/technical-sessions/presentation/moraru).

A Multi-Paxos leader may use a lease to serve reads without a quorum round trip, but this is a performance optimization that depends on bounded clock drift; if the clock assumptions fail, linearizable reads are no longer protected. A replicated log must be applied consistently to the state machine; truncate its prefix only when the snapshot matches that log prefix and the snapshot update/truncation is atomic.

## Raft and replicated logs

Raft separates election, log replication, and safety. Terms increase monotonically; a candidate wins a majority; the leader appends entries and commits when a majority stores them, with a current-term commit rule. Log matching and election restrictions prevent a new leader from omitting committed entries. Followers use randomized timeouts to avoid synchronized elections.

A minority partition cannot commit new entries; a leader can continue while it has a majority. After a network heals, conflicting logs are truncated/replaced by the protocol; snapshot compaction bounds log size but needs snapshot index/term and install safety. Client retries need request IDs if a committed response is lost.

## Atomic broadcast, ZAB, and virtual synchrony

Best-effort broadcast has the sender deliver to each recipient; a sender crash mid-send can leave some nodes with a message and others without it. Reliable broadcast requires that if one correct process delivers a message, every correct process eventually does. Flooding is a simple repair: recipients forward to other peers. It tolerates sender failure better, but can produce on the order of `N²` messages.

Atomic broadcast adds total order: correct processes deliver not only the same set of messages, but also the same order. Under suitable assumptions, atomic broadcast and consensus are equivalent because the group decides each log position. **Virtual synchrony** handles changing membership: a group has views and each message is attached to its sending view; a received but not universally delivered message remains pending. A view change is a barrier: before entering the next view, the group agrees which messages from the old view were delivered, so no node treats a lone partial message as committed.

ZAB (ZooKeeper Atomic Broadcast) uses leader epochs/zxids and three phases. **Discovery** chooses an epoch greater than every epoch known by followers and collects the highest transaction IDs. **Synchronization** brings followers to a common history and delivers committed proposals from earlier epochs before new messages. **Broadcast** has the leader send proposals, wait for quorum acknowledgments, and commit; proposals from the wrong epoch are rejected. Clients can connect to any node: a follower forwards requests that need leader processing, while the leader temporarily establishes order. A follower that cannot hear from a quorum starts an election; a leader that loses its quorum steps down. During broadcast, the leader waits for an acknowledgment of the previous proposal before sending the next. The book describes two message rounds for the broadcast path and recovery by streaming missing entries from the follower with the highest committed proposal, instead of collecting history from every node. ZAB preserves ordered handling when a message is received more than once; application side effects outside the replicated log still need retry/deduplication handling.

## Byzantine consensus

The crash-fault model assumes a node stops but does not lie. A Byzantine model allows nodes to send arbitrary conflicting messages. Under the basic model, PBFT needs `n = 3f+1` replicas to tolerate up to `f` Byzantine faults. The primary binds a request to a view, sequence, and digest; a replica advances past prepare after `2f` matching prepares from other backups, then needs `2f+1` matching commits to execute in order. A client normally waits for `f+1` matching replies; the book's optimized read-only path needs `2f+1` tentative replies. A view change needs `2f` notifications before the new primary starts the view; the stable log keeps a request until `f+1` replicas execute it. Every `N` requests, a checkpoint records a sequence and state digest; `2f+1` confirmations allow log truncation, while a recovering replica must verify the digest and following log. Message cost rises sharply; signatures, membership, independent-failure assumptions, and the threat model matter.

## Limits and protocol choice

Consensus does not make the network faster, automatically solve multi-database transactions, or make every read linearizable for free. Reads may require a leader/quorum or a lease with clock assumptions. Losing a majority usually stops commits to preserve consistency. Evaluate a library's persistence, membership changes, snapshots, disk-full behavior, slow followers, split votes, client duplicates, and upgrade protocol.

*Database Internals*, chapter 14, compares broadcast, ZAB, Paxos, Raft, and PBFT; check foundational sources: [Raft paper](https://raft.github.io/raft.pdf), [Paxos Made Simple](https://lamport.azurewebsites.net/pubs/paxos-simple.pdf), [ZooKeeper paper](https://www.usenix.org/legacy/event/atc10/tech/full_papers/Hunt.pdf), the [EPaxos paper](https://istc-cc.cmu.edu/publications/papers/2013/epaxos-sosp2013.pdf), and the [Database Internals errata](https://www.databass.dev/errata).

## Check your understanding

**Can Paxos choose a value different from the newest proposal?** Yes; the proposer must adopt the highest-ballot accepted value reported by its quorum.

**Can a Raft minority commit?** No, under the majority-quorum rule.

**Can PBFT tolerate two Byzantine replicas with five nodes?** No; the basic model needs at least `3f+1`, or 7 nodes for `f=2`.
