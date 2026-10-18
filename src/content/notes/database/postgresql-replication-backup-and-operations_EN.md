---
title: "PostgreSQL Replication, Backup, and Operations"
category: "Database"
description: "Connect physical/logical replication, slots, backups, PITR, upgrades, monitoring, and security."
updated: 2026-10-17
translationKey: "database/postgresql-replication-backup-and-operations"
---

Replication keeps a secondary server caught up with a primary; backups rebuild data after failures or mistakes. Both involve WAL, but they address different failure modes. A healthy standby does not protect against a replicated `DROP TABLE`; an old backup does not guarantee a low RPO. A design needs both and a restore rehearsal.

## Physical and logical replication

Physical streaming replication ships WAL for a standby to replay at the cluster level; it is commonly used for HA and read replicas. A standby can receive WAL directly or from an archive. Asynchronous replication has lag and can lose commits that have not reached the standby when the primary fails. Synchronous replication narrows that loss window according to configuration, but increases latency and can affect availability.

Logical replication publishes table-level changes through publications/subscriptions and logical decoding. It helps with selective replication, migration, and consumers, but requires replica identity, compatible schemas, and slot monitoring. It does not automatically synchronize every DDL/object the way physical replication does. Capabilities differ by version; check the official compatibility matrix before migration.

Replication slots retain WAL or tuples needed by consumers. An abandoned slot can retain WAL until disk fills; set retention limits, alert on bytes/lag, and define what to do when a consumer is offline. Do not drop a slot casually if downstream still depends on it.

## Backup and PITR

`pg_dump`/`pg_dumpall` create logical backups useful for export, object/table restore, and migration; a physical base backup copies consistent data files to rebuild a server on the same timeline. PITR combines a base backup with continuous WAL archiving and a recovery target by time, transaction, or restore point (depending on version/configuration).

Define RPO (maximum acceptable data loss) and RTO (acceptable recovery time). Encrypt and restrict backup access, store it in a separate failure domain, monitor archive gaps/retention, and periodically restore into a clean environment. A successful backup file that has never been restored is an unverified assumption.

## Failover, upgrades, and security

PostgreSQL core provides replication primitives, but automatic failover/orchestration is often handled by external tools. Define fencing/STONITH or an equivalent safeguard against two primaries, promotion/rewind/rejoin procedures, DNS/proxy/client retry behavior, and safe handling of non-idempotent writes. Failover is more than changing an endpoint.

Major upgrades may use `pg_upgrade`, dump/restore, or logical migration; check extensions, collations, replication, disk, rollback window, and time for index/ANALYZE work after upgrade. Minor updates usually have fewer compatibility changes but still need rollout and backup procedures.

Limit network exposure, use TLS, least-privilege roles, suitable password/authentication policies, separate owners from application users, manage secrets, and audit. Review `pg_hba.conf`, filesystem permissions, extensions, and supported versions.

## Operate with evidence

Monitor connections, transaction age, lock waits, query latency/rows, cache/buffers, vacuum, WAL, slots/replication lag, disk, checkpoints, backup age, and restore results. Set alerts that trigger action instead of collecting dashboards alone. During an incident, build a timeline from logs, metrics, and transaction/query identifiers; change one variable with a hypothesis, then measure.

*PostgreSQL Internals 14* focuses on internals; current official references extend the coverage: [warm standby](https://www.postgresql.org/docs/current/warm-standby.html), [logical replication](https://www.postgresql.org/docs/current/logical-replication.html), [backup and restore](https://www.postgresql.org/docs/current/backup.html), [PITR](https://www.postgresql.org/docs/current/continuous-archiving.html), [upgrading](https://www.postgresql.org/docs/current/upgrading.html), and [security](https://www.postgresql.org/docs/current/security.html).

## Check your understanding

**Is a read replica a backup?** No. Logical errors and deletes can be replicated.

**Does logical replication automatically replicate DDL?** Not fully like physical replication; manage schema separately.

**Is an untested backup trustworthy?** Its recoverability has not been demonstrated; rehearse restoration in an appropriate failure domain.
