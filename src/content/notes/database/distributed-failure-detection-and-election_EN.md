---
title: "Failure Detection and Leader Election: The Big Picture"
category: "Database"
description: "Connect failure detection to leader election and understand why neither alone makes a cluster safe."
updated: 2026-10-17
translationKey: "database/distributed-failure-detection-and-election"
---

A node cannot directly observe a process on another machine. It sees messages arrive, arrive late, or not arrive. Distributed systems therefore separate two tasks: a **failure detector** forms a suspicion about a node; **leader election** chooses a process to coordinate. Both depend on a membership view and assumptions about the network.

Suspecting a leader does not prove that it has crashed. If two groups have different views, each may elect a leader. To turn an election into safe write authority, the system still needs consensus, epochs, and fencing so storage rejects the old leader. The two notes below explain how the decision flows and which assumptions a production consensus protocol must address.

## Two different questions

Failure detection asks, “Is this node responding according to the model we accept?” Leader election asks, “Which process coordinates the current group?” A distributed lock asks which process may enter a critical section and ensures that right is eventually released. These questions are related but not interchangeable.

Read [Failure Detection: Heartbeats, SWIM, Phi, and Gossip](./distributed-failure-detection_EN.md) first to follow how a node becomes “suspect.” Then read [Leader Election: Bully, Invitation, and Ring](./distributed-leader-election_EN.md) to see how membership and suspicion are used in an election round.

## Keep these points

- A timeout is an operational threshold, not proof that a node has crashed.
- Electing the highest ID in a local view does not guarantee that other nodes agree.
- A new leader is safe only when the old leader’s authority is blocked at the write recipient, commonly with a checked epoch or token.
- Consensus protocols such as Raft and Paxos combine election with quorum rules and log safety. They also determine which command order replicas accept.

*Database Internals*, chapters 9–10, places failure detectors and leader election together to show this dependency. Chapter 14 and the [consensus](./distributed-consensus-algorithms_EN.md) notes continue with quorum, terms, and replicated logs.

## Check your understanding

A node times out while another group still receives its heartbeats. What has been proved? Only that nodes observe different network paths; the process’s actual state is not known with certainty. Before granting write authority to a new leader, what must be ensured? Storage must distinguish the new epoch from old authority so an isolated former leader cannot keep writing.
