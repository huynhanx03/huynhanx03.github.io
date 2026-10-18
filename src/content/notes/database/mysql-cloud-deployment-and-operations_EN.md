---
title: "Running MySQL in the Cloud: Infrastructure, Performance, and Managed Services"
category: "Database"
description: "Choose between self-managed MySQL in the cloud and DBaaS, understand resource limits, price the workload, and plan for portability."
updated: 2026-10-17
translationKey: "database/mysql-cloud-deployment-and-operations"
---

Moving MySQL to the cloud changes where the server runs and how you pay for it; it does not redesign the data architecture by itself. Virtual machines, network storage, and managed database services each have limits. Choose among them by starting with the workload, required control, operational capacity, and cost per successful transaction.

## The cloud is a deployment platform, not an architecture

There are two common ways to run MySQL in the cloud:

- **IaaS**: rent virtual machines, storage, and networking, then install, configure, upgrade, back up, monitor, and recover MySQL yourself. You retain deeper control of the OS and database, but you also own more operational work.
- **DBaaS**: the provider operates much of the database infrastructure. You manage endpoints, schemas, users, queries, and the settings the service exposes. You do less machine and OS administration, but cannot access every log, filesystem, or setting.

A service name does not guarantee that it is stock MySQL or has every feature of a self-managed installation. Check the actual engine/version, extensions, replication mode, access, parameter limits, backup/export path, maintenance behavior, and client compatibility. Speaking the MySQL protocol is not enough to conclude that every semantic is identical.

Cloud does not turn a stateful database into a horizontally scalable service on demand. Stateless web servers are often easier to add or remove than databases, where each node must hold consistent data, preserve log order, handle write capacity, and follow a topology-change plan. Read replicas can scale some read workloads; write scaling generally requires application-level sharding, partitioning, or a product with different semantics.

## Choose by workload and operating cost

Cloud can be useful when you need to start quickly, avoid buying hardware before demand is known, create staging/test environments intermittently, or reduce the time spent replacing disks and maintaining operating systems. The value may come from time to market, flexibility, and lower upfront capital even if each transaction is not cheaper than on owned hardware.

Compare total cost over a meaningful period, not just the instance price:

- compute and memory;
- storage, provisioned IOPS/throughput, snapshots, and backup retention;
- networking, cross-zone/region traffic, and egress;
- replicas, standbys, staging environments, and the hours they run;
- monitoring, support tier, licenses/extensions, and staffing;
- downtime, restore, migration, and on-call engineering time.

A staging environment used for a few hours each week can be much cheaper when created only as needed. A continuously running production database with a large dataset has different economics. Put compute and data transfer in the same estimate, tie each cost to expected workload, and inspect the bill after a trial. Set budgets/alerts and autoscaling limits so a traffic bug or runaway query does not silently multiply the bill.

## Virtual resources can be fast without being equally consistent

A VM abstracts CPU, RAM, and storage from physical hardware. Instance families differ in CPU, memory, network, and device bandwidth limits; a high-IOPS volume cannot exceed a lower cap on the instance or network path. “8 vCPUs” alone cannot predict MySQL performance without knowing CPU generation, burst behavior, memory bandwidth, storage latency, and total I/O limits.

MySQL reacts to latency and variability, not only average throughput. If an I/O occasionally stalls, a thread may hold a lock/latch or wait for a resource; requests queue up, running-thread counts rise, and p99 latency can spike even when average CPU is low. Shared resources, burst credits, noisy neighbors, throttling, or a snapshot/backup in progress can all change performance.

When measurements inside the VM look fine but users still see slowness, measure end-to-end time and compare it with provider metrics. Observe p50/p95/p99, I/O latency, queue depth, IOPS, throughput, CPU steal/throttling, memory pressure, network, and database wait events on the same timeline. Do not diagnose from `iostat` or one dashboard alone; managed environments may expose infrastructure metrics outside the guest.

## Design storage around InnoDB I/O

OLTP often generates small random I/O and fsyncs; backups or scans can generate large sequential streams. Storage suitability depends on operation size, latency, IOPS, and bandwidth. A disk optimized for sequential throughput may suit scans/backups but not random transaction writes. Compare the workload’s actual profile with storage guarantees and instance limits.

The working set strongly affects I/O cost. When hot indexes and data pages fit in the buffer pool, many reads come from RAM. When the working set exceeds memory, cache misses cause more reads; slow storage or long queues then increase latency. More RAM can reduce I/O for a suitable workload, but cannot fix a CPU bottleneck, lock contention, or a query that reads too much data.

Do not move redo logs or binary logs to ephemeral/local storage just to improve a benchmark if they disappear when the instance stops. Lowering durability to reduce I/O also changes the transactions that can be lost in a crash; compare it with the RPO and test recovery. A fast storage copy/snapshot does not prove that a MySQL backup is consistent; use a mechanism with clear semantics and test restores.

Current Amazon RDS database storage uses EBS; choices include General Purpose SSD and Provisioned IOPS SSD, with behavior and availability varying by engine, region, and instance class. Instance, network, and storage can each be the first bottleneck. EC2/EBS names and performance figures in the book reflect its publication date and should not be used for current sizing. Check volume metrics, burst behavior where still applicable, provisioned IOPS/throughput, and the matching instance limits.

## DBaaS changes who owns which work

Managed databases often handle some provisioning, patching, backups, monitoring, and failover, but the exact boundary depends on service and configuration. Application teams remain responsible for schemas, indexes, queries, connection pools, access, workload, retention choices, restore validation, and incident response. A “backup enabled” switch does not prove that the retention is sufficient or that a restore will meet the RTO.

Write down a practical responsibility table before production:

| Work | Questions to answer |
| --- | --- |
| Patching/upgrades | Who chooses maintenance windows, checks compatibility, and handles rollback? |
| Backup/restore | Who sets retention, access, encryption keys, and restore drills? |
| HA/failover | Under what conditions does the service fail over, how does the endpoint change, and how does the app reconnect? |
| Monitoring | Which metrics does the provider retain, and which need Performance Schema/app instrumentation? |
| Security | Who manages IAM, database grants, secrets, network policy, auditing, and rotation? |
| Capacity/cost | Who catches low storage, IOPS limits, connection limits, and unexpected bills? |

Restricted OS access can prevent some diagnostics or plugins. A service may expose only a parameter group, block extensions, limit file import/export, or manage replication privileges. Test the actual workload and operating procedures on an evaluation instance before migration; do not assume a required feature exists because the engine is called MySQL.

## Multi-AZ and read replicas solve different problems

Multi-AZ is commonly intended to tolerate infrastructure or zone failures and move the primary automatically; some standby configurations do not serve read traffic. A provider’s Multi-AZ cluster may expose separate readers, but its configuration and semantics differ from a deployment with one standby. A read replica primarily serves reads or some recovery cases; its lag and data independence depend on replication.

Do not call both “standby copies” and assume they are equivalent. For each option ask: how is data copied; is replication synchronous or asynchronous; can the secondary handle reads; is failover automatic or manual; how long does the endpoint take to change after a zone failure; must clients reconnect; what happens to in-flight transactions; and what are the real RPO/RTO?

Current AWS RDS distinguishes a Multi-AZ DB instance deployment with a standby that does not serve reads from a Multi-AZ DB cluster deployment with two standby/readers in separate Availability Zones. Failover time and read availability afterward depend on database state, in-flight transactions, backlog, and configuration. Use current service documentation and drills with your own workload; RDS details and benchmark results in the old book do not describe this year’s service.

## Autoscaling does not remove the limits of a stateful database

Automatically adding web workers is fairly direct: multiple instances run the same code and hold no important local state. Adding a MySQL writer is harder: data must be partitioned or updates coordinated, requests routed, cross-shard transactions handled, and schemas/membership changed. Automatically growing storage also does not automatically add CPU, memory, IOPS, or readers; each resource has its own scaling path, limits, and price.

Amazon RDS storage autoscaling can increase capacity when configured conditions and thresholds are met, but it has limits: storage does not automatically shrink, changes are rate-limited, and it cannot guarantee rescue from a bulk load that fills storage too quickly. You still need initial sizing, a deliberate maximum threshold, free-space monitoring, and growth forecasts. Autoscaling is not a replacement for alerts.

Before scaling, identify the workload bottleneck: query/round trips, locks, CPU, buffer-pool misses, volume latency, connection saturation, or replication apply. Scaling the instance may help one limit while increasing cost and leaving another cause untouched. Test changes on representative load, observe latency and throughput, and keep a rollback path.

## A migration needs a measured path and a way back

When moving from on-premises or IaaS to DBaaS, inventory versions, charset/collation, SQL mode, extensions/plugins, scheduled jobs, users/privileges, TLS, backup, binlog/GTID, parameter differences, and application dependencies on the filesystem. Measure data size, write rate, copy duration, change-stream catch-up, and cutover time.

A safe cutover usually needs: a compatible target; a snapshot load; application of subsequent changes; row-count/checksum and application-behavior checks; a planned write pause/lock; endpoint switch; error/latency monitoring; and keeping the old source read-only/isolated for a defined rollback window. Rollback is complicated if the target accepted writes that never reached the source; decide in advance how to reverse-sync or handle new writes.

Test exporting data and restoring it somewhere else. Record service-specific APIs and dependencies so you can estimate exit cost. Lock-in is not automatically bad when the benefits justify it; the risk is discovering a limitation only when a provider change or emergency restore is needed.

## A deployment-selection workflow

1. Define SLO, RPO/RTO, peak reads/writes, working set, and data growth.
2. Measure the current workload: query mix, p95/p99, I/O pattern, connections, and backup window.
3. Choose IaaS or DBaaS based on required control and operating capacity; list mandatory features.
4. Check simultaneous limits for instance, memory, storage, network, connections, and maintenance.
5. Trial with representative data/workload, including peaks, failover, restart, cache warmup, and restore.
6. Estimate the bill at normal load, peak, backup, standby, and growth; set guardrails.
7. Write migration, rollback, export, and incident runbooks; practice before production cutover.

## Check your understanding

**Does DBaaS mean the provider owns every database responsibility?** No. The provider manages part of the infrastructure; application teams still own queries/schema, access, retention, restore validation, connection behavior, and workload.

**Do multiple web instances mean MySQL scales horizontally by itself?** No. A database holds state and must synchronize or partition its data. Read replicas help only requests that can accept replica semantics.

**Does storage autoscaling guarantee the database will never run out of space?** No. Thresholds, growth rate, and service limits still apply; a fast bulk load can outrun expansion.

**Does low CPU prove a cloud instance has no resource shortage?** No. Storage queues, variable latency, network, burst throttling, connections, or locks can slow requests while CPU is idle.

*High Performance MySQL*, Chapter 13, is the source for IaaS/DBaaS differences, cloud as a deployment platform, economics, resource variability, the memory/storage relationship, MySQL’s autoscaling limits, and RDS choices. Specific EC2/EBS/RDS details and benchmarks in the book are historical. Current AWS behavior was checked against the [RDS storage guide](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html), [RDS Multi-AZ guide](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html), [Multi-AZ failover guide](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.Failover.html), [storage autoscaling guide](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIOPS.Autoscaling.html), and [EBS I/O characteristics](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-io-characteristics.html).
