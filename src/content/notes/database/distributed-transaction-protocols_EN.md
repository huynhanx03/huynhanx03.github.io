---
title: "Distributed Transactions: 2PC, 3PC, and Ways to Reduce Coordination"
category: "Database"
description: "Follow a transaction across a coordinator and shards, from blocking commit to Calvin, Spanner, Percolator, and coordination avoidance."
updated: 2026-10-18
translationKey: "database/distributed-transaction-protocols"
---

A transfer subtracts money from account A on shard 1 and adds it to B on shard 2. If shard 1 commits while shard 2 loses its connection before commit, the total is wrong. **Atomic commitment** requires participants to either commit together or abort together; it assumes participants are not Byzantine and do not arbitrarily change the coordinator’s decision.

Atomic commitment only decides whether a proposed transaction commits or aborts. Cohorts cannot change the transaction or suggest an alternative; they only vote on whether their part can commit. If one cohort votes NO, the whole transaction cannot commit. For atomicity to survive crashes, changes must be recoverable: on abort, prepared data is undone; on commit, every participating partition must recover the same durable result before serving as if the transaction completed.

## 2PC: clear, but it can block

The coordinator and each cohort durably log their state. In the first phase, the coordinator sends the transaction; a cohort checks its conditions, records a prepared state, and votes `YES` or `NO`. `YES` promises to retain the change and wait for the final decision; it is not a local commit. If any cohort votes `NO`, the coordinator records `ABORT`; only after every cohort votes `YES` does it durably record `COMMIT` and broadcast the decision.

| Failure point | Outcome and reason |
| --- | --- |
| A cohort does not answer during prepare | The coordinator cannot collect all YES votes and cannot commit; after its deadline, it can decide to abort instead of letting shards guess. |
| A cohort crashes after voting YES | On recovery, it must learn the durable decision from the coordinator or another participant; prepared state does not let it infer commit or abort. |
| Coordinator fails before sending prepare | No cohort has promised to commit; a replacement can restart the decision. |
| Coordinator fails after a cohort is prepared | The cohort holds locks and waits because it cannot know whether COMMIT was logged. This is blocking. |
| Coordinator logs COMMIT but fails while notifying participants | Cohorts that received the decision can help others recover from durable logs; COMMIT implies every cohort had voted YES. |

A timeout cannot tell a participant whether the coordinator failed before or after logging its decision. Aborting locally after timeout can contradict a durable COMMIT. Replicating the coordinator log or placing 2PC over replica groups can improve recovery, but does not remove prepared state or recovery work.

### Trace a transfer across two shards

Account A on shard 1 transfers 20 units to account B on shard 2. The coordinator records a transaction ID and sends `PREPARE`; each shard checks its local condition, logs the tentative change and prepared state durably, holds its lock, and replies `YES`. At this point the application must not be told that the transfer committed: both shards are waiting for one shared decision.

After receiving both `YES` votes, the coordinator durably records `COMMIT` and sends it to each shard. Each shard records the commit, publishes its change, and releases its lock. The coordinator must not report commit before the decision is durable; whether success is returned before every participant has applied the decision depends on the transaction manager's semantics. If B cannot proceed, it votes `NO`; the coordinator records `ABORT`, and shard 1 must undo the prepared debit. If the coordinator crashes after recording COMMIT but before notifying shard 2, shard 2 asks the log or another participant. A timeout alone does not let it infer abort.

Track two invariants: every participant must eventually apply the same decision, and a participant that voted `YES` must retain enough log/lock state to apply the final decision after restart. The coordinator's committed decision can reach a participant later; if the application reads each shard independently in the meantime, the distributed isolation layer must decide how to hide or represent the incomplete state. 2PC guarantees atomic commitment; hiding intermediate state from readers depends on the transaction/isolation implementation. These rules make 2PC atomic when the protocol progresses and explain why a prepared transaction can block progress.

## 3PC: an intermediate state under synchrony assumptions

3PC has three phases: `PROPOSE → PREPARE → COMMIT/ABORT`. During `PROPOSE`, the coordinator sends the transaction and collects votes; a NO vote or a timeout before all votes arrive leads to abort. If every cohort votes YES, the coordinator sends `PREPARE`; each cohort logs its prepared state and acknowledges it. Before the coordinator knows that every cohort reached prepared, a timeout can lead cohorts to abort. After it receives every prepared acknowledgment, the protocol allows progress to commit if the coordinator or a participant fails.

This behavior relies on a synchronous network model: message delays are bounded, and a partition cannot mislead nodes about one another's state through timeouts. In an asynchronous network, one group may receive `PREPARE` and time out to commit while a partitioned group that never received it aborts. The groups then decide differently. 3PC reduces blocking under this narrow failure model, but it is not a general solution to crashes and partitions.

## Calvin: agree on order before execution

Calvin puts transactions in a log with a predetermined order. Each transaction needs a read set and write set that can be identified early enough. The scheduler knows which shards participate, gathers required read data, and executes transactions in the same order on replicas. This reduces coordination while locks are held; in exchange, sequencing happens before execution and transactions whose reads determine their write set are harder to handle.

If two transactions contend for one record, log order determines which runs first, so replicas reproduce the same history. If a transaction must discover another record during execution, the system must declare the dependency earlier or split the logic into orderable steps. Deterministic execution moves coordination cost to ordering; it does not make the cost disappear.

The sequencer groups transactions into short epochs; a batch is replicated before the scheduler runs it. Workers locate read-set data and active participants holding the write set; nodes send local read data to the participants that need it, then participants execute the batch and persist results. Because inputs and order match, replicas do not need to exchange execution results. The sequencer must agree on each batch/epoch, often through Paxos or leader replication; a leader can reduce latency but recovery must reproduce its state exactly. Calvin fits transactions with known read/write sets; a read that changes the write set must be declared or split into a separately sequenced step.

## Spanner: consensus per shard, 2PC across shards, and commit wait

Spanner uses a Paxos group for each shard. The leader handles writes and a lock table supports concurrency control; a transaction across shards coordinates with 2PC between groups. Therefore, an unavailable participant group can still block a multi-shard transaction.

Spanner distinguishes read-write transactions, read-only transactions, and snapshot reads. Read-write work needs a leader, locks, and concurrency control; a snapshot at a specific timestamp can read immutable versions from a sufficiently up-to-date replica, while a latest-timestamp read must ensure it sees the newest commit. Each shard uses a Paxos group to durably store its log and transaction state. Cross-shard transactions use 2PL for isolation and 2PC for commitment; making cohorts Paxos groups tolerates some member failures, but losing a group quorum still blocks progress.

TrueTime returns an interval `[earliest, latest]` containing the current time. After choosing a commit timestamp, Spanner waits until `earliest` has passed that timestamp before returning the result. Commit wait lets timestamps reflect real-time order despite clock uncertainty. The uncertainty width affects latency. A single-shard transaction uses that group’s protocol; snapshot/read-only transactions can use a chosen timestamp and avoid some write coordination.

In a cross-shard commit, participants log prepare with write timestamps through Paxos; the coordinator chooses a commit timestamp greater than the prepare timestamps, replicates the commit decision, then waits for the uncertainty interval to pass before reporting success and releasing locks. A timestamp is therefore more than a version label: commit wait ensures that a transaction that returned before another started has the earlier timestamp. In exchange, cross-shard transactions pay an extra 2PC cost compared with a design that orders execution in advance, such as Calvin.

## Percolator: a transaction API over distributed storage

Percolator stores values, write metadata, and lock records in separate Bigtable columns, and uses a timestamp oracle with snapshot isolation. A transaction reads values committed before its start timestamp. A consistent snapshot prevents read skew. For example, if `x + y = 100`, T1 reads `x = 70`; then T2 changes the values to `x = 50, y = 50` and commits. Under READ COMMITTED, T1's next read sees `y = 50` and combines them as 120, although no consistent state had that sum. Snapshot isolation keeps T1 on its earlier snapshot, so the second read still sees `y = 30`. If two transactions write the same cell, first-committer-wins lets one commit; snapshot isolation can still permit write skew when both read an invariant and write different cells, allowing both to commit and jointly violate it.

A primary/secondary lock pattern places one primary lock to represent transaction state and secondary locks on other keys. Recovery metadata matters because a commit spans multiple records.

The timestamp oracle is consulted at transaction start and commit. During `prewrite`, the client tries to lock every cell it will write, chooses one primary lock for recovery, and checks for newer writes or unreleased locks. The check and lock placement must be one atomic Bigtable conditional mutation in a single RPC; if they were separate reads and writes, two transactions could both see an empty cell and both acquire it. A conflict aborts the transaction; if prewrite succeeds everywhere, the client enters commit by replacing the primary lock with a write record and then publishing secondaries. If the client crashes during commit and a later transaction finds a secondary lock, it checks the primary to finish commit; if the primary was published, it commits the remaining secondaries. When two recovery attempts encounter the same lock, an atomic conditional mutation prevents both from deciding against stale state. Publishing the primary/secondary records in this order lets recovery know which work remains.

## Shard placement is not transaction atomicity

Modulo hashing, `hash(key) mod N`, is simple, but changing node count N can move most keys. Consistent hashing places tokens on a ring: a key goes to the next token; adding/removing a token usually moves a neighboring range. Virtual tokens improve balance but do not solve hot keys. Range partitioning supports range scans but can create hot ranges; hash partitioning is often more even but makes range queries contact several shards.

After locating a shard, routing, replica ownership, snapshot migration, log catch-up, and routing-epoch changes still need protocols. Consistent hashing solves key mapping; it does not guarantee atomicity for a cross-shard transaction.

## Coordination avoidance must preserve invariants

Invariant confluence asks whether two nodes can update independently from valid state and then merge while the result remains valid. If so, the operation can avoid coordination under those conditions. If two offline nodes both sell the last seat, each local state may look valid, but after merge two tickets have been sold for one seat. The invariant is not confluent; the system must coordinate or pre-allocate rights with reservations/escrow.

A coordination-avoiding design still needs four properties: local and merged states preserve invariants (**global validity**); a reachable node can commit or abort an operation that would violate an invariant (**availability**); replicas converge after updates stop and the network reconnects (**convergence**); and local transactions do not wait for operations on other nodes (**coordination freedom**). Only confluent invariants permit diverged states to merge while remaining valid; other invariants need coordination or rights allocated in advance.

### RAMP: atomic visibility without making every transaction wait

RAMP (*Read Atomic Multi-Partition*) addresses a narrow but practical problem: one transaction updates several partitions, and a reader may reach them while those updates are being published. We want the reader to avoid combining half of the old state with half of the new state, without making every reader and writer hold locks while messages cross machines.

#### What exactly does it guarantee?

Suppose transaction `T7` changes two related records: `x = 1` on partition X and `y = 1` on partition Y. A fractured read occurs if another transaction reads `x = 1` but still reads `y = 0`. Under **Read Atomic (RA) isolation**, a reader must see both writes from `T7` or neither. Its reads still form a snapshot that respects transaction boundaries.

RA is not serializability. It does not by itself stop two concurrent transactions from reading the same balance and both withdrawing, nor does it protect an invariant such as “the number of sold seats never exceeds capacity.” It prevents an inconsistency caused by seeing only part of a write set; it does not force concurrent transactions into an order equivalent to serial execution. RA can fit a bidirectional friendship update, a base record with its secondary index, or source data with a materialized view. It is insufficient when a write decision depends on what was read and competition must preserve an invariant.

RAMP targets two scalability properties:

- **Synchronization independence:** another client's transaction cannot make this transaction wait or abort. A transaction can still be delayed if it cannot contact a partition that it needs.
- **Partition independence:** a transaction contacts only partitions that contain items it accesses; it need not ask the whole cluster where new data might be.

These are algorithmic goals, not a promise that network failures disappear. RAMP separates atomic visibility from mutual-exclusion locking: reads and writes may overlap, while metadata and versions let a reader detect and repair a mismatched read.

#### How does it repair a mismatched read?

Initially, X stores `x@4 = 0` and Y stores `y@4 = 0`. `T7` wants to write `x@7 = 1` and `y@7 = 1`. The writer sends `PREPARE` to both partitions. Each stores the new version with the transaction identity, but does not treat it as committed. Once both writes are in place, the writer sends the commit decision. Network timing may let X receive commit before Y.

During that interval, reader `R` asks X and Y. X returns `x@7` with metadata saying that `T7` also wrote `y`; Y still returns `y@4`. The reader sees that the metadata for `x@7` names a sibling write to `y`, while the version it just read is older. That signals a fractured read. Instead of returning `{x@7, y@4}`, R sends an additional request to Y for the identified version. Since `PREPARE` already placed `y@7` there, Y can return it; R returns `{x@7, y@7}`. If the first round did not observe any write from `T7`, the reader can return the old snapshot `{x@4, y@4}`.

`PREPARE` places new versions on the partitions but does not publish them as committed data. Once all partitions are prepared, the coordinator decides to commit; commit messages may reach partitions at different times. In the example, X has published `x@7` while Y has not published `y@7`, so the first read returns the old `y` version with metadata identifying the missing sibling write. The reader uses that metadata to fetch the matching `y@7` already stored on Y. An ordinary read does not select a prepared version on its own; repair fetches a sibling only when metadata from a committed write shows it is needed. If the transaction aborts, the reader must not include its versions in the result. This lets a reader avoid waiting for every partition to change state at one instant without exposing an aborted transaction or only part of a write set. RAMP still needs a commit protocol and version retention; it avoids making every read wait for a global lock.

Thus, RAMP's “atomic visibility” is a read-boundary guarantee: a reader sees the transaction's complete write set or none of its writes. It does not mean that pages on several machines change physical state at the same instant, and it does not mean RAMP avoids coordination during writes. Prepare/commit still coordinates the write; RAMP avoids making every read wait for a global lock. Old and in-flight versions can be reclaimed only after no active read can need them, or after a bounded read window expires and an overlong reader must retry.

#### Three variants trade metadata for network rounds

| Variant | Metadata attached to each write | Read with no race | When is another round needed? |
| --- | --- | --- | --- |
| **RAMP-Fast** | Nearly the transaction's entire write set | Usually 1 round trip | A second round when metadata identifies a sibling version to fetch |
| **RAMP-Small** | The transaction timestamp | 2 round trips | Always uses a second round so partitions can choose the highest version matching timestamps observed by the reader |
| **RAMP-Hybrid** | A Bloom filter representing the write set | Usually 1 round trip, close to Fast when false positives are few | May fetch more if the filter says an item might belong to the write set; a false positive costs work but does not corrupt the result |

Writes in all three variants use two round trips for `PREPARE` and `COMMIT`. Fast spends metadata proportional to the number of written items; Small keeps per-write metadata compact but always makes readers take another network round; Hybrid uses a Bloom filter to sit between them. A Bloom filter has no false negatives: “absent” guarantees that an item is not in the set, while “present” may be wrong. A false positive can trigger a request for a nonexistent version, but unique timestamps ensure that request does not turn into a wrong value.

“Fast” does not mean fastest for every workload. Large metadata can increase network and storage costs, and another variant may fit a workload dominated by reads that need compact metadata. If reads often race with committing writers, both Fast and Hybrid may need the repair round. The real trade-off is metadata size, round trips, and the chance of repair.

#### How long must old versions remain available?

A reader may fetch its first version from X and only then ask Y for a sibling version. If Y deletes `y@7` too early, the repair cannot finish. A partition must therefore retain versions that a running reader may still need. One implementation bounds read-transaction duration, garbage-collects versions only after that window, and makes an overlong reader restart. Another tracks timestamps of active reads and cleans up only when no reader can request the version. A longer window costs storage; a shorter one makes slow reads more likely to retry.

RAMP can also support read-write transactions when the client declares its read set in advance: it reads that snapshot first, buffers writes locally, then sends the complete write set at commit. This can still allow competing transactions to violate an invariant because RA is not serializability. Preserving such an invariant requires an additional concurrency-control mechanism or a stronger isolation level.
## Check your understanding

**Has a 2PC participant committed after voting YES?** No. It durably prepared and must wait for a decision.

**Does 3PC solve partitions in an asynchronous network?** No. Its timing assumptions may fail, allowing groups to make different decisions.

**Does Spanner use timestamps alone for atomic multi-shard transactions?** No. Timestamps/commit wait work with Paxos replication, locks/concurrency control, and 2PC across shards.

*Database Internals*, chapter 13. The primary research paper is Peter Bailis et al., SIGMOD 2014: [Scalable Atomic Visibility with RAMP Transactions](https://www.bailis.org/papers/ramp-sigmod2014.pdf). These designs are compared to explain mechanisms and assumptions; current product implementations need to be checked against version-specific documentation.
