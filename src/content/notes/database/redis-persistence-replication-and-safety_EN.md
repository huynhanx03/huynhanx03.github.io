---
title: "Redis Persistence, Replication, and Data Safety"
category: "Database"
description: "Compare RDB/AOF, understand fork and rewrite, and learn async replication's acknowledged-write loss window."
updated: 2026-10-18
translationKey: "database/redis-persistence-replication-and-safety"
---

Redis may serve a rebuildable cache or data an application cannot afford to lose. Those goals need different durability policies. Persistence creates disk state; replication keeps replicas; neither promises that every write acknowledged to a client survives every failure.

## RDB snapshots

RDB creates a point-in-time snapshot of the dataset. It is compact for backups or fast loading and causes less continuous writing, but a failure between snapshots can lose recent changes. `BGSAVE` commonly forks a child to write; copy-on-write means pages changed after the fork must be kept separately, so memory can rise with write volume during the save. Slow fork or insufficient memory can cause latency or OOM.

Distinguish a snapshot from a verified backup. Redis creates a temporary file and replaces the target after the save completes; but a single copy on the same volume means a volume failure can remove both primary data and snapshot. Copy snapshots to independent storage, verify checksums/metadata, try loading one on a separate instance, and record recovery time. For write-heavy workloads, measure peak memory during the fork because copy-on-write can push total RAM beyond the currently used dataset size.

Redis can take snapshots when a write-count threshold is met within a time window, or on demand with `BGSAVE`. A rule from the book such as `save 900 1` only illustrates how to read the configuration: at least one change in 900 seconds starts a snapshot; it is not a backup every 15 minutes or a promise that the snapshot will finish within that interval. `BGSAVE` keeps serving commands while a child process writes the file, whereas synchronous `SAVE` blocks client command processing until it completes. Choose based on acceptable pauses; “background” does not mean free of resource cost.

## AOF and rewrite

AOF records a command stream for replay; `appendfsync` sets the tradeoff between latency and the amount of data at risk on crash (`always`, `everysec`, and `no` have OS/fsync-dependent semantics). AOF is often easy to inspect and replay but can grow large. Rewrite creates an AOF representing the current dataset instead of retaining a long history; it may also use fork/copy-on-write. RDB and AOF can coexist; which file recovery prefers depends on version/configuration, so confirm the documentation.

Rewrite does not simply delete the file currently being written. Redis keeps accepting writes while creating a new base, retains additional writes in an incremental log, and then changes a manifest so startup combines the correct pieces. Since Redis 7, AOF uses multiple files and a manifest; do not delete one file based on guesswork. If the final file is truncated by a full disk, `redis-check-aof` can repair the tail in supported cases, but make a copy before changing the original. Monitor free space, rewrite duration, fsync latency, and write errors.

The book also points out a less obvious failure mode: deleting a very large AOF can keep the operating system busy while it releases many blocks. This reflects the file-management approach used when the book was published; it is not a reason to delete modern AOF files yourself. Since Redis 7, let Redis manage the base files, incremental files, and manifest. Before reclaiming space, identify the exact version, rewrite state, and backup procedure.

The fsync modes represent different risk policies: `always` requests the most frequent synchronization and can raise latency/I/O; `everysec` is a common compromise but still has a loss window if the kernel, machine, or drive fails; `no` delegates flush timing to the OS, reducing synchronous work while making the RPO harder to predict. A mode name cannot guarantee that a controller or drive truly retained data after a flush. AOF rewrite collapses repeated updates to the same key into its current state, reducing file size and replay time; it still needs disk headroom, CPU, fork, and copy-on-write memory. At startup, Redis chooses persistence files according to configuration/version; inspect logs and rehearse the restore path instead of guessing which file will be used.

## Asynchronous replication

Redis replication is generally asynchronous: a primary can acknowledge a command before a replica receives and applies it. A sudden primary failure may lose an acknowledged write if failover selects a replica without that write. `WAIT` asks for acknowledgments from a number of replicas at an offset but does not turn replication into consensus or guarantee that data has been fsynced durably on every node. `WAITAOF`, in supported versions, can wait for fsync under specific conditions; read its precise guarantees and limits.

A replica remembers a replication ID and the offset it has applied. On reconnect, `PSYNC` requests the missing portion from the replication backlog; if the history is no longer there or the ID does not match, both sides need a full resynchronization. Full sync creates and transfers a snapshot while buffering new writes to send after the replica loads it; this consumes substantial disk, network, CPU, and memory. A backlog too small for the outage duration/write rate increases full syncs. Check `INFO replication`, `ROLE`, offsets, lag, and sync status instead of only checking the TCP connection.

Full sync is a snapshot plus the writes that arrived after its starting point. The replica connects and requests synchronization; the primary starts or reuses a snapshot while retaining new writes in a backlog; after sending the snapshot, it streams that backlog so the replica can catch up and then sends live writes. A replica receiving a snapshot may not yet have the newest data, so a connected socket alone is not enough to route reads. Replicas arriving before snapshot transmission starts may share one snapshot/backlog operation; one arriving later may need a separate sync. Concurrent operations add fork, RAM, disk, and network costs. For the Redis era covered by the book, the author recommends using only about 50–65% of system RAM on the primary to leave room for fork and backlog; this is historical advice, not a current sizing formula. Measure peak memory for the dataset and write rate on the Redis release in use. A replica tree can reduce direct streams from the primary, but downstream nodes depend on intermediate replicas' availability and latency. Standard Redis OSS replication is primary-to-replica, not two primaries synchronizing both ways.

To verify an important write, the book uses a unique token: write it after the data on the primary, wait until the replica link is up, wait until the replica sees the token, then wait up to about one second for its fsync queue to empty; finally remove the token and clean up old leftovers. The sequence teaches the difference between “the primary processed it,” “the replica received it,” and “the disk synchronized it.” Polling an internal `INFO` field as shown in the book depends on an older Redis version, assumes an fsync timing window, and is not a durability protocol to adopt today. With current Redis, understand the precise limits of `WAIT` and `WAITAOF`: what is acknowledged, whether it was fsynced, and what happens if failover promotes a different replica.

Failover adds another issue: Sentinel/Cluster selects a new primary using its own mechanism, but cannot recover data already lost from the old branch. Clients must handle reconnects, idempotent retries, and replies lost after a write has executed. Understand fencing and post-failover write authority for the deployment topology.

A replica can serve reads with lag, but read-after-write is not automatic when reading from a replica. The replication backlog supports partial resynchronization; if the gap is too large, the replica needs a full sync and snapshot transfer.

## Failover, backups, and recovery drills

Sentinel/Cluster/orchestrators can promote a replica, but topology and failure detection cannot know every write every client has observed. Choose a realistic RPO/RTO, configure persistence, keep backups outside the instance, monitor replication lag/AOF errors/fork latency/disk, and rehearse recovery. `appendonly yes` on one machine is not an independent backup; a replica does not protect against a propagated delete.

The book's manual procedure takes a snapshot from a replica, copies it to a replacement machine, starts the new node, and points the old replica at the new primary. The lesson is the order of operations and which data copy rebuilds the node; `SLAVEOF` in the book is an old name, while current Redis uses primary/replica terminology and `REPLICAOF`. In production, manual failover must fence the old node or prove it cannot accept writes before opening the new primary, or both branches could accept independent writes. Sentinel/Cluster is usually better suited to promotion and discovery; still understand that the selected replica may not contain the last writes. Do not copy persistence files while they are being written as if they were consistent snapshots.

RPO is the maximum amount of writes that may be lost; RTO is the time until service is restored. RDB interval, AOF fsync, replication lag, failure detection, replica selection, snapshot loading, and endpoint changes all contribute to those values. A plan must test both “the file can be restored” and “the application resumes correctly”: create a backup, verify its hash, load it into an isolated instance, check invariants, measure recovery time, and rehearse rollback.

When a file may be corrupt, distinguish validation from repair. The AOF checker can truncate at the first incomplete command when run in repair mode; commands after that point will not be replayed, so keep the original and estimate the possible data loss. The RDB checker can detect a damaged snapshot but cannot reconstruct its missing data. Multiple independent backups and restore drills matter more than expecting one repair command to recover everything. Checker names and invocation can change by release; confirm the binary shipped with the Redis version in use.

*Redis in Action* chapter 4 discusses persistence and replication; current docs: [Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/), [replication](https://redis.io/docs/latest/operate/oss_and_stack/management/replication/), [WAIT](https://redis.io/docs/latest/commands/wait/), and [WAITAOF](https://redis.io/docs/latest/commands/waitaof/).

## Check your understanding

**Does enabling RDB guarantee no loss of recently written data?** No; the snapshot interval defines part of the loss window.

**If a replica ACKs, is the write certainly on disk?** No; receipt, application, and fsync are separate states.

**Can persistence replace backups?** No; logical mistakes, accidental deletes, or corruption can be persisted too.
