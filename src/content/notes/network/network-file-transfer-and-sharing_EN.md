---
title: "Choosing How to Transfer and Share Files over a Network"
tags: ["network", "file transfer", "file sharing", "filesystem"]
description: "Distinguish copying files from mounting a remote filesystem, then choose a protocol based on workflow, operating systems, and network trust."
translationKey: "network/network-file-transfer-and-sharing"
---

When two machines need to exchange files, first ask: does the receiving machine need **a copy**, or does it need to **access a remote directory as a filesystem mounted on its own machine**? These needs may look similar when opening a file, but they differ in connection behavior, caching, failures, and write permissions.

| Need | Common approach | What to consider |
| --- | --- | --- |
| Send or fetch a few files | SCP or SFTP over SSH | Convenient for direct transfers; the server still controls authorization and authentication. |
| Repeatedly transfer or synchronize a directory tree | `rsync`, often over SSH | Can send only changes; check paths and do a dry run before using deletion options. |
| Share directories between Windows and Linux | SMB through Samba or CIFS | Understand share permissions, Samba accounts, and Linux file permissions separately. |
| Mount a remote Linux directory with little setup | SSHFS through FUSE | Convenient for a small scope; still affected by network latency and user-space overhead. |
| Mount a filesystem from a storage server or NAS on a managed network | NFS | Suits environments with appropriate network and access policies; network failures differ from local-disk failures. |
| Mount a cloud storage service | A FUSE-based filesystem | A directory-like interface does not imply local-filesystem performance, consistency, or durability. |
| Temporarily let another machine download a directory | A short-lived HTTP server | Expose only what is needed; do not leave a temporary service open to an untrusted network. |

## A copy is different from a remote filesystem

`rsync`, SCP, and SFTP transfer data between two endpoints. When the command finishes, the receiving machine has a copy it can use independently, subject to the chosen synchronization policy. In contrast, NFS, SMB, and SSHFS access a file tree over an active connection. If the network is slow or disconnected, reads and writes may stall, fail, or leave the application with an uncertain state.

So do not choose NFS merely because you want to “copy something conveniently,” and do not expect an rsync copy to update itself like a mounted directory. If multiple machines edit the same data, define who can write, how conflicts are handled, when changes become visible on other machines, and how to recover from failures.

## Permissions and trust boundaries

A secure transfer protocol does not decide by itself who may modify files at the destination. SSH protects SCP/SFTP or rsync-over-SSH, but the remote account still needs least-privilege permissions. With SMB, a successful mount does not prove that client identity and POSIX permissions match the server's policy. With NFS, client restrictions, exports, and firewalls must fit the network where it is used.

Before sharing, restrict the permitted addresses or interfaces and users; avoid guest access or broad write permissions without a specific reason. For synchronization that can delete data, preview the changes and keep an independent backup.

## A quick selection guide

- For a one-time transfer, use SCP or SFTP.
- For repeated transfer of a directory tree, consider rsync.
- For several machines working on the same file tree, consider SMB or NFS based on operating systems and access policy.
- For a lightweight mount for one user or machine, SSHFS may be enough, but it does not replace a large-scale shared-storage design.
- For remote storage across locations or many users, treat identity, synchronization, conflicts, durability, and recovery as a separate architecture problem; a single mount protocol does not solve all of it.

## Further reading

- [rsync: transfer files and synchronize directories safely](/en/notes/network/rsync-file-transfer-and-safe-sync/)
- [SMB/CIFS between Linux and Windows](/en/notes/network/smb-cifs-linux-file-sharing/)
- [NFS: remote filesystems and cache consistency](/en/notes/network/nfs-remote-file-semantics/)
- [NFS: RPC, mounts, and differences between v3 and v4](/en/notes/network/nfs-rpc-mount-and-v4/)
