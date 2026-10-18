---
title: "AFS: Callback Caching and a Distributed Namespace"
category: "Network"
tags: ["network", "afs", "distributed filesystem", "cache"]
description: "Explore AFS architecture, its volume and location services, and callback-based cache consistency."
updated: 2026-10-16
translationKey: "network/afs-callback-cache"
---

The Andrew File System (AFS) was designed to share files over a network among many clients. It reduces server load and latency with strong client-side caching, and uses callbacks to notify clients when cached data is no longer valid.

## From AFSv1 to AFSv2

AFSv1 downloaded an entire file to the client's disk cache when it was opened. Later reads and writes used the local filesystem, and modified files were sent back when closed. However, the client still had to ask the server with `TestAuth` whether its cached copy was current. `Fetch` and `Store` also sent pathnames for the server to traverse the directory tree. Both repeated validation and path traversal made server CPU and network capacity bottlenecks.

AFSv2 uses callbacks and file identifiers (FIDs). The client fetches directories component by component, caches them locally, and receives callbacks for each object. Later opens can check the local callback instead of polling the server. An FID lets a request identify a volume, file, and uniquifier without sending the full pathname again. In return, the server must track callback state and recover when a client or server loses contact.

## Namespace and volumes

AFS provides a global namespace, where a volume is the unit used to administer and move data. A location service helps clients find the server that currently holds a volume. Clients cache files on local disks, not only in RAM, to reduce load and make repeated access faster.

## Callback consistency

The server grants callbacks to clients caching an object. When the object changes, the server sends a callback break so clients can invalidate or update their caches. If the callback server or client loses connectivity, timeout or lease handling and revalidation are needed to restore the correct state.

This model suits workloads with many reads and fewer writes. Conflicting writes from multiple clients and network failures make consistency complex; callback caching is not transparent shared memory.

AFS was designed with the assumption that many files are accessed sequentially or in full and are not concurrently shared by many writers. Downloading an entire file works well when reopening a large file, but is inefficient for access to a few blocks or a small append to a large log: the client may have to download and later upload the whole file. Callback and cache consistency also provide neither transactions nor application-level locks; workflows such as multiple clients editing source code need a separate locking or coordination protocol.

### Exercise: trace callbacks and write schedules

With an AFS simulator or a small trace, track the server-side file value, each client's local copy, callback state, and every open/read/write/close event separately. Start with one client writing and closing a file; then add a second client that still has a cached copy and observe when its callback is broken and where its next read must revalidate. Finally, let both clients open, modify, and close the file in different orders. Compare random and fixed schedules to discover possible read results and final values. Do not infer real-world ordering from a single trace: callbacks and cache state are a distributed protocol, and network schedules can change what is observed.

In the classic AFS model, when a client closes a modified file, it sends the entire file to the server; the server updates its stored copy and breaks callbacks held by other clients. A process on the same machine may see its write immediately, while another client typically sees it after the close/callback exchange and a new open. If two clients both modify a file, the one that closes last may overwrite the other's entire copy (“last closer wins”). Use file-level locking or application coordination if this is unacceptable.

A server restart loses its in-memory callback table; clients must treat cached data as untrusted until it is revalidated. A client reboot may also miss a callback break, so it needs to ask the server before using an old cached copy. This replaces continuous polling of an NFS-style attribute cache with more complex state and recovery.

## A high-level comparison with NFS

NFS is commonly associated with per-operation file requests and timeout-based attribute or data caching. AFS emphasizes client caching, callback invalidation, and namespace and volume management. Both must handle authentication, partitions, retries, and cache freshness. Modern versions and configurations may differ from historical descriptions.

## Summary

- AFS organizes files in a namespace and volumes that can be located on servers.
- Clients cache aggressively to reduce network round trips.
- Callbacks tell clients that cached data is no longer valid after a change.
- Callback or lease failures require revalidation and recovery.
- Whole-file caching speeds repeated reads but can waste bandwidth for partial access to large files.
- Close-to-open is a consistency model; it does not replace locks or transactions for concurrent writes.
- Choose AFS-style whole-file caching or NFS-style block I/O based on the workload; measure real access patterns first.
- Network filesystems have different consistency and failure semantics from local filesystems.
- To analyze AFS, trace each client's cache, callbacks, closes, and schedule order separately.

## Check your understanding

**Does callback caching mean a client always sees updates immediately?** No; missed messages, network partitions, and protocol recovery must be considered.

**Does stronger AFS caching mean the server no longer needs access control?** No. Authentication and authorization remain essential.

**Do NFS and AFS behave like shared RAM?** No. Latency, caching, and network failures create different semantics.

## Further reading

Container networking creates its own interfaces, bridges, and NAT. See that topic to connect namespaces with service connectivity.
