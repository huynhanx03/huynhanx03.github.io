---
title: "Leader Election: Bully, Invitation, and Ring"
category: "Database"
description: "Follow the leader-election algorithms from Database Internals step by step and understand their limits under network partitions."
updated: 2026-10-17
translationKey: "database/distributed-leader-election"
---

Suppose a cluster has processes with IDs from 1 to 6, and process 6 is the leader. When 6 stops responding, a member needs to start a new election. But “not responding” is only a suspicion from a failure detector. The algorithms below show how a group selects and announces a leader under the membership it currently sees; they do not solve the case where two partitioned groups elect separately.

## Before an election: a leader is not a distributed lock

A leader has a coordination role known to multiple members and usually keeps it until failure or replacement. A distributed lock grants access to a critical section; other processes do not necessarily need to know who holds it, as long as the right is eventually released so work can continue.

A leader can reduce peer-to-peer exchanges but become a bottleneck. Data can be split into independent replica sets, each with its own leader. Even then, a successful election from one local view does not prove there is only one leader in the whole cluster.

## Bully: the highest-ranked process wins

Bully assumes each process has a unique ID and processes can message members with higher or lower IDs. A process that detects an unresponsive leader sends `ELECTION` to processes with higher IDs.

Using IDs 1–6, suppose leader 6 stops and process 3 initiates:

1. Process 3 sends `ELECTION` to 4, 5, and 6.
2. Processes 4 and 5 return `ALIVE`; process 6 does not reply.
3. Process 3 does not declare itself leader because a higher-ranked process is alive. It hands the next election step to the highest responder, process 5.
4. Process 5 asks processes ranked above it. No one responds, so 5 announces `COORDINATOR` to lower-ranked processes.

If process 5 also crashes during the steps, 4 can continue the election. A low-ranked process may generate many messages while probing all higher-ranked members. Several processes may also time out together and start overlapping elections; old notifications must be ignored and the rounds eventually converge by rank if membership and connectivity satisfy the assumptions.

The **next-in-line** variant stores a backup list in advance, such as `{5, 4}` at leader 6. When 6 is lost, process 3 asks 5 first; if 5 is alive, it can announce itself sooner than a full Bully round. The list helps only while current: if 5 is dead or members have newer state, the process must continue and verify the epoch so it does not announce a stale leader.

A **candidate/ordinary** optimization allows only a candidate subset to become leader. An ordinary process that detects failure asks the candidates, selects the highest-ranked live candidate, and announces the result. A tiebreaker `δ` may delay processes by rank to reduce simultaneous initiators, assuming the delay is chosen sensibly relative to message timing. This limits contenders; it still needs to handle timeouts and inconsistent membership.

## Invitation: merge groups

Invitation starts with several small groups, each with a leader. A leader invites processes outside its group to join. If the invite reaches another leader, the groups exchange information and merge; members are told which leader remains, often the leader of the larger group or the one selected by the system’s rule.

For example, leader 1 manages `{1,2}` and leader 3 manages `{3,4}`. Leader 1 contacts 3; the groups become `{1,2,3,4}`, and members of group 3 learn the new leader. The method builds a group incrementally instead of restarting a global election whenever two groups meet. Choosing the larger group’s leader can reduce notifications because only the smaller group needs updating.

Multiple leaders are normal while groups have not merged. If a partition lasts, each may keep coordinating its own group. When connectivity returns, the merge needs a rule for work accepted under both leaders; announcing a new leader cannot undo conflicting writes by itself.

## Ring: traverse the ring, then announce the result

In a ring election, each process knows its predecessor and successor. An initiator sends a message to its successor. If that successor does not respond, it skips the node and tries the next one. Each live node adds its ID to the visited set and forwards the message.

Consider the ring `[1 → 2 → 3 → 4 → 5 → 6 → 1]`, with 6 failed and 3 initiating. The message visits 4 and 5; 5 cannot reach 6, so it forwards to 1; then 1 and 2 forward it. When the message returns to 3, the live set is `{1,2,3,4,5}`. The highest rank is 5, so 3 starts another pass to announce leader 5 around the ring.

The message can carry only the highest ID seen instead of the full set, reducing message size. Since `max` is associative and commutative, each step only needs to keep the highest ID; after finding the winner, the result still needs to circulate. An election pass takes time proportional to the number of ring members, and announcement adds another pass. A broken link or changed membership can prevent traversal from closing unless the topology is repaired.

## Split brain and the safety limit

If the network splits into two partitions, each side may believe the old leader is dead and elect another. Bully may select the highest ID independently on each side; Invitation may preserve separate groups; Ring may form two local rings. These basic algorithms do not have a shared quorum to prevent that.

Even after a new leader is selected, an old node may recover without knowing it lost authority. Safe write systems use a monotonically increasing epoch or fencing token and require storage to check the token on each operation. Only a majority can grant a new epoch in quorum protocols; storage rejects writes from the old node with a lower epoch.

That is why leader election is not the same as replicated-log consensus. Raft and Paxos use a leader for coordination, but add quorum, term/ballot, and log rules so replicas agree on which commands have been accepted. If the requirement is “two processes must never both write,” the data plane must prove and enforce authority; an `I am leader` announcement is not enough.

## Election creates a chance to progress; consensus protects the decision

An election algorithm usually aims for **liveness**: most of the time the system has a coordinator, and after a failure it eventually chooses another. But when a leader is chosen from a local membership view, the algorithm may not guarantee **safety**—that only one leader is recognized everywhere. Two partitions may temporarily run different leaders so each side can make progress; when they meet again, the protocol must detect stale terms and resolve competing histories. In Paxos, competing leaders/proposers are constrained by quorum intersection and the rule for carrying forward accepted values, so two conflicting values cannot both be chosen. In Raft, a leader that learns of a newer term knows its authority is stale and steps down.

A **stable leader election** uses rounds and a timeout-based failure detector to keep the same leader as long as that process is alive and reachable. “Reachable” matters: a slow network or partition may make one group suspect the leader even while it remains active to another group. Stable election can reduce needless leadership changes when its assumptions hold, but it does not turn a timeout into proof of a crash or replace quorum/fencing.

## Which model should you learn or use?

| Election style | Fits when | Main cost or risk |
| --- | --- | --- |
| Bully | Membership is fairly stable, ranks are clear, and processes can message each other | Many messages when several nodes contend; rank is not a quorum |
| Next-in-line | A backup list is maintained with the current leader | A candidate in the list may be dead or stale |
| Candidate/ordinary | You want to limit which processes can win | The candidate set and tiebreaker still need consistent membership |
| Invitation | Existing groups should merge incrementally | Multiple leaders may exist before merge; conflicts need handling |
| Ring | The ring topology is known and unreachable nodes can be skipped | Election and announcement traverse the ring; partitions can create multiple winners |

In production, prefer election that is part of a consensus protocol with defined safety properties. The classic algorithms remain useful for understanding message costs, rank, topology, and the difference between choosing a coordinator and guaranteeing uniqueness.

## Check your understanding

**In Bully, why does process 3 not announce itself after process 6 times out?** Because 4 or 5 may still be alive and have higher ranks; 3 hands the next election step to the highest responder.

**What must the ring do after finding the highest ID?** Circulate the result so members learn the new leader; finding the winner and announcing it are separate logical passes.

**What is missing if both partitions announce a leader?** A consensus/quorum rule and fencing at the recipient, so both sides cannot hold valid write authority.

*Database Internals*, chapter 10. The algorithms are presented with their membership/topology assumptions; split brain and the need to combine election with failure detection are central limits of the chapter.
