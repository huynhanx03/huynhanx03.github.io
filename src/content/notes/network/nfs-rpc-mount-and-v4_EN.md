---
title: "NFS: RPC, Mounts, and Differences Between v3 and v4"
category: "Network"
tags: ["network", "nfs", "linux"]
description: "Trace NFS from RPC and the mount protocol to the v4 namespace, and connect client/server configuration with firewall rules."
updated: 2026-10-16
translationKey: "network/nfs-rpc-mount-and-v4"
---

NFS lets a client access files on a server through a filesystem interface. Underneath, client and server exchange operations such as lookup, read, write, and getattr through RPC. This lets applications use familiar file APIs, but latency, caching, and network failures make behavior different from a local disk.

## RPC and mounts

NFSv3 commonly uses ONC RPC and may require portmapper/rpcbind and a mount daemon for clients to find services and exports. Some ports are allocated dynamically, so a firewall must allow the required control paths or use static port configuration.

NFSv4 integrates mounting and namespace mechanisms more fully into the protocol, commonly uses TCP 2049, and reduces dependence on auxiliary port services. Firewall configuration may therefore be simpler, but still needs to allow the right clients, servers, and required flows.

## Exports, identity, and permissions

The server decides which directories are exported and which clients may access them. Unix permissions, UID/GID, and identity mapping affect the result; matching usernames on two machines do not guarantee matching numeric UIDs. `root_squash` commonly maps client root to a less privileged account, limiting remote root access.

`showmount` is useful for some v3 configurations but is not a general test for every v4 server. A client commonly mounts using an export name and protocol options; inspect `findmnt`, `nfsstat`, and kernel or systemd logs when troubleshooting.

## Failure behavior and durability

A hard mount may continue retrying when the server is unavailable; a process accessing the filesystem may wait a long time. A soft mount may return an error to the application after retries, but the application must handle write errors safely. Choose options based on data semantics, not just the feeling that “it hangs less.”

Attribute and data caching reduce round trips, but complicate when changes by another client become visible. NFS does not turn a multi-file operation into a transaction. Applications need to tolerate stale handles, timeouts, retries, and uncertain outcomes after a network interruption.

## Check your understanding

**Does NFSv4 always need rpcbind like NFSv3?** Usually not in common deployments; v4 integrates more functionality and commonly uses 2049.

**Does the same username mean matching UID/GID values?** No.

**Is a soft mount always safer because it waits less?** No; it may return I/O errors that an application does not handle correctly.

## Further reading

AFS uses callbacks for a different caching approach; comparing them shows how consistency design affects workloads.
