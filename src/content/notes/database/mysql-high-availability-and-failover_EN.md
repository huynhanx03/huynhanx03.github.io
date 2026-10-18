---
title: "Designing High Availability and Failover for MySQL"
category: "Database"
description: "Separate availability from backups and replication, choose redundancy by failure domain, and design failover around data and application behavior."
updated: 2026-10-17
translationKey: "database/mysql-high-availability-and-failover"
---

A cluster with several servers is not automatically highly available. A copy may be behind, the endpoint may not move, two machines may accept writes at once, or the operations team may not know how to recover. High availability (HA) design starts with a more concrete question: how long can users tolerate a critical function being unavailable, and how much data can the system afford to lose?

## Availability describes the user’s experience

Availability is often expressed as the fraction of time a service works. A 99.9% annual target allows about 8 hours and 46 minutes of downtime; 99.99% allows about 52 minutes; 99.999% allows about 5 minutes. This is a budget for infrastructure failures, deployments, operations, and recovery, not a promise that an individual server never fails.

“The server process is running” is not enough either. A server that has just restarted may have cold caches and exceed request timeouts. From the user’s perspective, the service is still failing. Define availability in terms of functions and quality thresholds: for example, 99.95% of profile reads must succeed within 300 ms, while an internal report may tolerate several minutes of delay.

Keep availability distinct from three related goals:

- **Redundancy** means a spare component exists.
- **Durability** means acknowledged data survives a failure.
- **Load balancing** distributes work among components.

A replica can add redundancy while remaining behind. A backup improves data recovery but cannot switch traffic in seconds. Define **RTO** (the maximum acceptable recovery time) and **RPO** (the maximum acceptable data loss) separately. They turn “high availability” into criteria that can be designed and verified.

## Price downtime before buying more servers

Not every function needs the same availability. A payment path may lose more money per minute than an order-history page. Separating critical and noncritical paths lets you focus investment where risk is highest.

A simple prioritization model is:

`risk exposure ≈ probability of failure × impact of failure`

This is not a precise prediction; it helps compare a full disk, a rare hardware failure, and a risky schema migration. Each additional “nine” usually costs more than the previous one because it requires redundancy across more layers, frequent testing, and around-the-clock operations. Compare the cost of reducing downtime with the actual cost of downtime instead of choosing the largest target by instinct.

## Prevent failures and shorten recovery

Downtime often comes from combined causes: full disks, unexpected SQL execution, weak schemas or indexes, divergent replication, operator mistakes, hardware faults, or untested changes. HA improves in two complementary ways:

- Increase **MTBF**: lengthen the time between failures through change control, upgrade testing, least privilege, capacity monitoring, and data-integrity checks.
- Reduce **MTTR**: shorten detection, diagnosis, and recovery through historical metrics, clear runbooks, tested backup restores, and practiced failover.

The book reports figures from an incident set its authors analyzed: about 35% involved the operating environment, about 35% performance problems, 20% replication, and the remainder data loss/corruption or miscellaneous causes. This describes systems they supported at the time of publication; it is not a universal database failure distribution. Specific causes included full disks, poor SQL or server misbehavior, weak schema/index design, source–replica divergence, and `DROP TABLE` without a usable backup. The operational lesson is that replication itself can cause downtime; redundancy without validation and independent recovery can spread an incident.

Unflashy work prevents many incidents: alert before disks fill, inspect RAID and backup health, restore data periodically, record configuration, test schema/query changes before production, and review changes. After an incident, examine the full chain of contributing conditions. Root-cause reviews help, but failures rarely have only one cause, and adding another cluster layer does not fix every weak layer.

Monitor signals that can lead to action, such as connection errors, latency percentiles, replication queues, capacity, I/O wait, and backup status. A low cache hit ratio alone may not be an incident. If alerts are repeatedly wrong, responders learn to ignore valid ones too. Verify the entire alert path: metric collection, detection threshold, recipient, and acknowledgement.

## Find failure domains and single points of failure

Trace a request to its data: application, connection pool, proxy/router, MySQL, filesystem, volume, controller, power, network, and deployment region. A **single point of failure (SPOF)** is a component whose failure stops a critical function without an alternate path.

Two servers in the same rack may lose power together. Two different VMs may share a physical host. Two replicas in different regions may still share DNS, credentials, a deployment pipeline, or an operator. Software bugs, accidental deletion, and corruption can also spread through replication. Redundancy must account for where failures originate and how far they can propagate, not just the number of nodes.

Headroom is another form of redundancy. If every machine is near its limit, one failure shifts load to the others and can overload them too. Spare capacity must handle the intended failover workload, including real peaks and cold-cache effects.

## Match redundancy to the risk

### MySQL replicas: a running copy that can still lag

An asynchronous replica is usually already running and can be promoted quickly. It can reduce MTTR compared with starting a server from scratch, and it offers an option for read scale-out. However, the newest transaction may not have been sent or applied when the source fails. To bound data loss, define how lag/GTIDs are measured, how an eligible replica is chosen, and what RPO is acceptable.

Semisynchronous replication adds a wait for a replica to acknowledge receiving and writing an event to its relay log. This improves the chance that a committed transaction exists in more than one place, but the default acknowledgement does not mean the replica has applied the transaction. A timeout can return the source to asynchronous behavior depending on configuration. Network latency also affects commit latency. Read the exact wait point and behavior for the running version before claiming an RPO.

### Shared storage and replicated disks: protect the storage path

A SAN/shared-storage system or block replication can let a standby access the same data or a block-level copy. These approaches address some machine or disk failures, but they do not make a MySQL data directory safe for multiple independent instances to open. MySQL/InnoDB needs a cluster mechanism designed to coordinate writes; do not run two independent `mysqld` processes against one data-file set.

Synchronous storage replication can increase write latency because commit depends on the network and the standby device. It also copies corruption, accidental deletion, and malware just like valid data. A newly started standby has cold caches and still needs filesystem/database recovery. A redundant SAN can fail within a shared failure domain. Treat storage replication as one protection layer or recovery mechanism, not a substitute for independent backups and restore tests.

The book describes a narrower DRBD use: replicate only the device holding binary logs. If the active source machine fails, a log server on the standby can expose the recovered binlogs, bring the other replicas to the latest recoverable position, and allow one replica to be promoted. This preserves a change stream for recovery; it does not make the standby a hot MySQL primary, so startup, recovery, and role switching still take time. The binlogs help only if they were durably replicated, their identity/position is verified, and the runbook has been practiced.

### Synchronous clusters: data acknowledgements require coordination

With truly synchronous replication, a transaction is acknowledged only after the nodes required by the protocol have received or committed its data. The exact protection depends on the product and configuration: number of acknowledgements, durable flushes, quorum, partition behavior, and when the client receives success. “Synchronous” is not another word for “data can never be lost”; read the exact semantics.

Current MySQL Group Replication/InnoDB Cluster uses membership and quorum to handle membership, recovery, and primary election in single-primary mode. The group needs a majority to make progress; losing quorum can stop one side from writing instead of allowing both sides to accept independent writes. This protects consistency by sacrificing progress in the minority. If a newly elected primary still has a backlog, a consistency mode such as `BEFORE_ON_PRIMARY_FAILOVER` can hold requests until the backlog is applied, trading longer request recovery for fresher reads and writes.

Consider three members, A, B, and C, with A cut off from B and C. After the system detects that A is unreachable and updates membership, B+C have 2 of 3 votes and can continue; A sees only one member and cannot confirm the new decision with a majority. If A was the primary, do not remove it from the configuration just because the other two have a majority. Compare GTIDs and transaction state before forcing a new group, because the old primary may contain transactions absent from B and C. MySQL warns that excluding a primary with extra transactions can lose those transactions. Force membership only after verifying that excluded members are actually stopped; if A is still alive in its own partition, forcing B+C to continue can create two writing groups.

Quorum does not remove the need to test networks, restarts, new-node provisioning, or loss of a majority. A multi-node cluster also adds network, storage, and operational costs. Test the topology’s actual failure tolerance; for example, a two-member group has no majority if the members lose contact with each other.

#### NDB and Percona XtraDB Cluster solve different problems

**MySQL NDB Cluster** uses the NDB storage engine with cooperating data nodes that keep redundant data copies; SQL nodes are MySQL Servers that send queries to the cluster. Because this is a distinct engine and distributed architecture, NDB is not a switch that makes an existing InnoDB data directory synchronous. Choose it only when its data model, query patterns, engine limits, and operational needs fit; verify exact features and configuration in the NDB documentation for the deployed version.

**Percona XtraDB Cluster (PXC)** is based on InnoDB/Galera write-set replication. Each node typically stores the full dataset; transactions are certified by write set, so two transactions modifying overlapping rows can cause one to be rejected/rolled back rather than automatically merged. The group needs quorum to accept writes; a disconnected node may need state synchronization before it rejoins. This allows requests at multiple nodes, but it does not eliminate write conflicts or make commits faster than the slowest node on the path. The book describes an older PXC release, so check current PXC documentation for implementation details, state transfer, and rolling schema upgrades.

## Design failover as a guarded procedure

Failover moves workload away from a failed component to a standby. A **switchover** is usually planned; **failback** returns service to the old node or role after repair. Failover shortens downtime but leaves the system with less redundancy until a standby is rebuilt. Plan to restore spare capacity; do not stop at “traffic moved.”

Manual and automated procedures need the same logical steps:

1. **Detect and confirm:** distinguish a dead node from a network flap, slow query, or application connection failure.
2. **Choose a candidate:** inspect received/executed GTIDs, apply backlog, filtered data, capacity, and acceptable RPO.
3. **Fence the old writer:** prevent it from accepting writes through a reliable mechanism such as control-plane, network/storage fencing, or product membership/quorum. A ping timeout alone is not fencing.
4. **Promote and verify:** change roles using the correct replication coordinates/GTIDs, then verify that the new node is writable and critical schema/data are present.
5. **Move the endpoint and recover clients:** update the router/VIP/service discovery or application configuration; close or recreate old connections; retry within limits and with idempotency.
6. **Observe and rebuild redundancy:** inspect errors, latency, and lag; keep the old node isolated until its data state is known; then rejoin/reseed and practice again.

Without fencing the old primary, both old and new primaries may accept writes. When the network returns, no automatic merge can guarantee resolution of every conflict. “Pick the server that is still alive” is therefore not a safe failover procedure.

Replication managers or scripts can shorten manual work, but they also have enough authority to cause serious damage if they misdiagnose a failure, choose the wrong candidate, or change replication coordinates incorrectly. The book recounts failures with tools of its era such as MMM and treats MHA as a newer tool that still warranted caution; that product-era assessment is not a current verdict. For any orchestrator, test network partitions, two nodes both believing they are primary, stale GTIDs, timeouts, and clients with open transactions. Log promotion decisions and keep fencing independent of a simple health check.

## A moved endpoint does not move every client

A floating IP/VIP can move an address within a network, but ARP caches, switches, and operating-system permissions affect convergence. DNS depends on TTLs, resolver caches, and connection pools; changing DNS does not move an existing TCP connection. A proxy/middleman provides a stable endpoint but becomes another component to make redundant, monitor, and size. Routing between data centers through a proxy may keep the application running while adding latency if the application remains in the old region.

Let applications handle connection errors, but avoid giving every service its own algorithm for promoting the database. Centralize writer selection in a control plane or a fenced procedure. At the application layer, close failed connections, retry safe transactions with limits, and degrade nonessential features when useful. Do not blindly retry a transaction after losing the connection between server commit and client response: the client cannot know whether commit happened. Use an idempotency key or query the business operation’s state.

A replica can also be “alive” without being ready for workload. It may have backlog, cold caches, different CPU/storage, or an analytics workload. Exercise it with controlled reads, observe cache and latency, and retain headroom after promotion.

## Example: the source loses network connectivity

Suppose the source loses contact with the application but remains running and can still accept local writes. A replica ten seconds behind may have received most transactions. If you only change DNS to the replica, the application may write there while some old clients continue writing to the source. When the network recovers, changing roles cannot merge the two data branches by itself.

A safe procedure determines whether this is a partition or a dead source, prevents the old source from accepting writes, chooses a replica based on received/applied transactions and tolerated loss, promotes one writer, changes the endpoint, forces clients to refresh connections, and verifies business transactions. If the team cannot prove the candidate is current enough, responders must make an explicit choice between waiting for the source and accepting a larger RPO; automation cannot create data that was never replicated.

## Practice to verify the availability promise

A runbook should specify trigger conditions, who may promote, how to fence, how to select a candidate, how to change the endpoint, the commands/metrics used for verification, how to handle uncertain transaction outcomes, and when the old node may rejoin. Practice common and difficult cases: growing lag, receiver running while applier is stopped, quorum loss, stale DNS, a pool holding old sockets, low disk space, cold cache on the new node, and restoring from backup.

Measure RTO from the moment users are affected until the function meets its SLO again, not until the MySQL process starts. Measure RPO by the business transactions actually missing or retained after recovery, not only by a “seconds behind” value. Record step times, backlog, retries, duplicate errors, and lost data so the design can improve.

## Check your understanding

**Is a replica always a backup?** No. Deletes, application bugs, and corruption can replicate; keep historical backups and test restores.

**Does semisynchronous replication mean the replica applied a transaction before the client receives success?** Not necessarily. MySQL semisync acknowledges receipt/relay-log writing at its configured wait point; applier commit is a separate stage.

**Can failover consist only of moving a VIP/DNS record?** No. Choose the right data, fence the old writer, promote correctly, and refresh client connections.

**Does adding a node always increase availability?** No. It may share a failure domain, complicate the system, or add failure modes. Verify the whole request path and quorum/recovery behavior.

*High Performance MySQL*, Chapter 12, is the source for availability, downtime, MTBF/MTTR, SPOFs, shared/replicated storage, synchronous systems, replication-based redundancy, and failover methods. Tool names and product evaluations in the book reflect its publication date; current behavior is checked against the [MySQL 8.4 Group Replication manual](https://dev.mysql.com/doc/refman/8.4/en/group-replication.html), [quorum and network partitions](https://dev.mysql.com/doc/refman/8.4/en/group-replication-network-partitioning.html), [consistency on primary failover](https://dev.mysql.com/doc/refman/8.4/en/group-replication-configuring-consistency-guarantees.html), [NDB Cluster FAQ](https://dev.mysql.com/doc/refman/8.4/en/faqs-mysql-cluster.html), [semisynchronous replication](https://dev.mysql.com/doc/refman/8.4/en/replication-semisync.html), and [PXC certification](https://docs.percona.com/percona-xtradb-cluster/8.0/certification.html).
