---
title: "NFS: remote filesystems and cache consistency"
category: "Network"
tags: ["network", "nfs", "distributed filesystem"]
description: "Understand NFS clients and servers, remote procedure calls, file handles, and consistency differences from a local disk."
updated: 2026-10-16
translationKey: "network/nfs-remote-file-semantics"
---

NFS lets a client access server files through an interface similar to a local filesystem. The client kernel turns an operation into a network request; the server checks the handle and permissions, accesses the underlying filesystem, and returns a result. The network adds latency, timeouts, retries, and server failures to the semantics.

## File handles and protocol

NFS uses opaque file handles to identify exported objects; the client does not necessarily send an absolute pathname for every operation. Mount negotiation determines the export, protocol version, and options. NFSv3 relies heavily on a stateless request model; NFSv4 adds stateful features such as leases, locking, and compound operations.

The classic NFSv2 model illustrates why statelessness can help a server recover quickly: each request carries the file handle, offset, count, and necessary data, so the server does not have to keep a file descriptor or current offset for every client. A handle commonly combines a volume identifier, inode, and generation so an old handle does not accidentally access a newly reallocated inode. The client still keeps a local file descriptor and file offset, then translates POSIX operations into independent requests.

## Cache consistency

Clients cache file attributes and data to reduce round trips. Another client may modify a file, so cache visibility is not like an immediately shared RAM variable. Attribute-cache timeouts, close-to-open behavior, protocol version, and configuration affect when an update becomes visible.

In a close-to-open model, a client pushes dirty data to the server when the file is closed; another client that opens it afterward may see the update. To avoid stale cache data, a client checks attributes such as modification time. Attribute caching reduces `GETATTR` round trips but creates a short interval in which stale data may be returned. Therefore, “closed” and “immediately visible to another client” still depend on version, cache timeout, and configuration.

Applications need coordination if several clients write the same file concurrently. NFS locking and leases do not turn an application into a transactional database.

## Failures and retries

A server restart or network partition can cause a request to time out. The client may retry; idempotent operations are easier to recover. A write may reach the server while its response is lost, leaving the client unsure whether the operation committed. “Hard” and “soft” mount options have different semantics and risks; choose them for the requirement rather than disabling retries just to avoid waiting.

Retrying a WRITE can be safe when it writes the same bytes at the same offset: repeating a “write this value” has the same effect, while repeating a relative operation such as “increment a counter” does not. Creating a directory is a harder case: the first request may succeed while its reply is lost, and a retry may report “already exists,” making the final state difficult for the client to interpret. An NFSv2 server therefore needs a clear durability point before acknowledging WRITE; if it acknowledges data that is only in RAM and then crashes, the client believes the write completed while the server loses the update.

## Security and operations

Export policy, UID mapping, Kerberos or another security flavor, firewall rules, and network trust affect access. `no_root_squash` can grant broad authority to root on a client; understand the threat model before using it. Monitor latency, retransmissions, server load, and mount options.

## Summary

- NFS sends file operations over RPC and the network to a server.
- NFSv3 and NFSv4 differ in state, leases, locking, and protocol features.
- Caching improves performance, but consistency depends on protocol and configuration.
- A timeout creates uncertainty; retries require consideration of idempotency.
- Export and authentication options determine security, not merely whether mounting succeeds.

## Check your understanding

**Does a successful NFS mount prove that writes are durable?** No. Durability depends on specific synchronization semantics.

**Do two clients writing the same file automatically get transaction isolation?** No.

**Does a timeout prove that a write never reached the server?** No. The server may have processed it while the response was lost.

## Read next

AFS uses callback caching and a different volume/location architecture to scale an organization-wide namespace.
