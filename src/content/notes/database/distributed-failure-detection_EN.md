---
title: "Failure Detection: Heartbeats, SWIM, Phi, and Gossip"
category: "Database"
description: "See how distributed systems detect that a process may have stopped, and why every result depends on network assumptions."
updated: 2026-10-18
translationKey: "database/distributed-failure-detection"
---

Suppose node A pings B and receives no reply within one second. Do we know that B has stopped? No. B may have crashed, but it may also still be running while the request or reply is delayed. A failure detector turns incomplete observations into a usable judgment: a node is **suspected** or considered reachable.

That choice creates a tradeoff. Detecting quickly may let the system move work sooner, but it can exclude a healthy node by mistake. Waiting longer can reduce false suspicions while increasing recovery time. In an asynchronous model with no known upper bound on network delay, a timeout cannot prove a crash.

## Completeness and accuracy

Two properties help describe a failure detector:

- **Completeness:** a failed process is eventually detected by some or all non-failed processes.
- **Accuracy:** the detector correctly identifies failure. Labeling a live process as failed is a **false positive**; failing to recognize a failed process is a **false negative**. Completeness focuses on whether every failed process is eventually detected, while accuracy asks whether each judgment is correct.
- **Efficiency:** how quickly the detector identifies a failed process. Here, efficiency means detection latency, not CPU use or message count.

Depending on the algorithm, completeness may be stronger or weaker, and accuracy may permit temporary mistakes. The book describes efficiency and accuracy as a tradeoff: waiting less detects failures sooner but increases the chance of an incorrect judgment; greater accuracy usually requires waiting longer. In an asynchronous model, a detector cannot be perfectly accurate and also guarantee detection within a known finite time. Because observations consist only of messages, a practical design chooses a tradeoff based on the consequence of acting. “Suspect” should therefore be reversible; removing a member or failing over needs additional conditions.

This is the difference between **liveness** and **safety**: liveness requires a desired event to happen eventually, such as detecting a stopped node so the cluster can progress; safety prevents an incorrect event, such as removing a healthy node and granting write authority to two leaders. Faster detection can help liveness while increasing false positives and weakening safety. In an asynchronous model, no detector can guarantee both perfect accuracy and detection within a known finite time; some protocols can still progress despite infinitely many detector mistakes if their other assumptions hold.

## Ping, heartbeat, and timeout

With a **ping**, A actively asks B and waits for an acknowledgment. With a **heartbeat**, B periodically sends a signal itself. Either can be implemented with request/response messages; the distinction is who initiates the check.

For example, B sends a heartbeat every 500 ms. A marks B suspect if no heartbeat arrives for 1.5 seconds. A 1.7-second garbage-collection pause makes A suspect B even though B is still running. Raising the threshold to five seconds reduces this case but delays crash detection. A fixed timeout also cannot reflect network delays that change with load.

A deadline detector is straightforward: record the last heartbeat time and compare it with a deadline. Once the deadline passes, invoke a callback to alert or start failover. That callback should not grant write authority to a replacement leader unless the system also fences the old authority.

## Indirect probes and outsourced heartbeats

A failure may be on the A–B path rather than at B. SWIM handles this with an **indirect probe**. A first pings B directly. If that times out, A asks a few random peers, C and D, to ping B. If a peer receives a reply, it forwards the acknowledgment to A. The direct A–B path may be broken while B remains reachable through another path.

A simplified flow is:

1. A sends `PING(B)`.
2. No `ACK` arrives in time, so A sends `PING_REQ(B)` to a few peers.
3. C pings B; if B replies, C reports the result to A.
4. Only after indirect probes fail too does A spread suspicion.

Trying through peers adds messages and some waiting time, but helps distinguish an unresponsive node from one broken link. More peers increase the chance of finding a working path and also increase traffic. This is a reachability check across paths, not proof that the process is healthy in every respect.

## Phi-accrual: a suspicion level instead of a hard threshold

The book describes a fixed-size sample window: retain recent heartbeat intervals, estimate their mean and variance, and use the assumed distribution to estimate the probability that the next heartbeat arrives within `t`. The tail probability gives φ; the score rises as the current silence becomes rarer under the sample. This is the detector’s statistical model, not the true probability that a node has crashed. If heartbeat intervals have a long tail, change abruptly, or do not fit the assumed distribution, the sample and threshold need to be reevaluated.

A fixed deadline says, “suspect after 1.5 seconds.” A phi-accrual detector keeps a window of recent heartbeat intervals, estimates their distribution, and measures how surprising the current silence is. One common representation is:

`φ(t) = -log10(P(T > t))`

Here `T` is the interval between heartbeats, and `t` is the elapsed time since the last heartbeat. If 800 ms delays are common in the observed data, phi stays low; if ten seconds has almost never happened, phi rises. The application chooses a phi threshold based on its tolerance for false suspicion and failover delay.

The mechanism can be viewed as three parts: **monitoring** collects timestamps; **interpretation** computes suspicion; **action** responds when the score crosses a threshold. Keeping them separate lets the same signal drive different reactions: a dashboard may warn at a low threshold, while removing a node from a quorum requires a stricter threshold and more conditions.

Phi is not a guaranteed, exact probability that a process has crashed. It measures how unusual the silence is under the model and heartbeat samples. A sudden workload change, a window that is too small, or a poor distribution assumption can skew the result. Phi gives a continuous suspicion scale; it does not remove network uncertainty.

## A heartbeat detector without timeouts

The book also describes a timeout-free research approach: processes propagate heartbeats with their paths and counters over fair links. A fair link guarantees that if a message is sent across it infinitely often, infinitely many such messages eventually arrive. The assumptions are that every pair of healthy processes has a fair path between them and every process knows the full membership. Under these conditions, relative counters can reveal progress even when a direct connection is faulty.

A heartbeat carries a unique ID and a list of processes it has visited. When a process receives an unseen heartbeat, it increments counters for the processes in that path, adds its own ID, and forwards the heartbeat to neighbors not already in the path. Once the path includes the full membership, that heartbeat need not propagate further. The ID lets nodes discard duplicate messages; the path identifies which processes contributed to forwarding the information.

For example, A cannot send directly to C, but A–B and B–C are fair links. A heartbeat can still travel along A–B–C through the group and carry path/counter information that lets nodes update their observations of progress; the failed A–C link does not imply that C has stopped. This mechanism does not use a deadline to declare suspicion. It relies on fair paths and comparing accumulated counters, so when a process really stops, its progress eventually differs from that of active processes.

The tradeoff is a strong set of assumptions: complete membership, fair links, and enough propagated heartbeat information to compare progress. The point is that “no clocks” does not make the problem disappear; it replaces timeouts with assumptions about paths, topology, and progress. This approach is useful for understanding system models, but should not be copied into a cluster with dynamic membership without checking those assumptions.

## Gossip: combining multiple views

In the book’s model, each node exchanges state with a random peer periodically; the communication rate is capped and grows at most linearly with membership size. This costs less than broadcasting the full table to the entire cluster every round, but background traffic still grows with cluster size and state converges more slowly than in one broadcast.

In gossip failure detection, each member keeps a state table such as heartbeat counters and last-update times. Periodically, a node increments its own counter, sends part of the table to a random peer, and merges the information it receives. If B has not advanced its counter for longer than the threshold, nodes gradually mark B suspect or failed.

Suppose A cannot communicate with C, but B continues to receive C’s heartbeats. B can spread C’s newer state to A. A therefore does not conclude that C is dead from the A–C link alone. Information converges gradually, so two nodes can temporarily hold different membership views. Incarnation or sequence numbers help identify newer reports and let a living node refute stale information.

Gossip bounds the number of peers contacted in each round, avoiding a full-cluster broadcast at every interval. In exchange, updates do not appear everywhere at once; convergence takes time and creates background traffic. Correlated congestion can also delay many heartbeats at once and make several nodes look suspect together.

## Spreading failure through silence: FUSE

Another design in the book is FUSE. Instead of sending a failure notice to every process, processes are organized into groups and use their ability to answer pings to spread the incident. If A cannot receive a reply from B, A also stops answering pings from other members. They then observe the silence and propagate the group state.

This turns an individual failure into a group signal that members can eventually observe, even when direct notifications have difficulty crossing a partition. But a broken link can trigger a chain reaction as if the group itself had a problem. The cost of “everyone learns” is that several members may become unavailable to the application. This only fits when the application defines group failure that way and accepts the availability tradeoff.

## Use suspicion carefully

The algorithms in this chapter assume processes do not intentionally lie about their own or their neighbors’ state; they are not Byzantine failure detectors. If a node may lie deliberately, a syntactically valid heartbeat is not enough to establish its state or identity.

A system usually separates `alive`, `suspect`, and `dead/removed` states instead of turning one timeout into immediate membership removal. After suspicion, it can collect indirect probes or wait for gossip to refute it. If it then needs a replacement leader, it should use a new term/epoch and require the write recipient to check the token. A partitioned old node then cannot keep writing with expired authority.

Track at least heartbeat intervals, timeout/phi, the rate of refuted suspicions, membership convergence delay, leader-change count, and failover duration. A simple “nodes up” count hides clusters that are flapping because of slow networks.

## Check your understanding

**Is a ping timeout enough to remove B from the cluster?** No. It says A did not receive a reply in time. Indirect probes or peer observations may clarify reachability; membership removal depends on the protocol.

**What usually changes when the phi threshold rises?** False suspicions may decrease because the system waits longer before suspicion becomes high, while reactions to crashes become slower.

**Why can gossip save a node from a false suspicion?** Another peer may observe a newer heartbeat from that node and spread the newer information over a different network path.

*Database Internals*, chapter 9. The timeout-free, outsourced-heartbeat, phi-accrual, gossip, and FUSE sections are explained with their specific assumptions; the examples here compare how each mechanism observes and spreads suspicion.
