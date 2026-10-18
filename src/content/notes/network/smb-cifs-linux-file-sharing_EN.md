---
title: "SMB/CIFS file sharing between Linux and Windows"
category: "Network"
tags: ["network", "smb", "cifs", "file sharing"]
description: "Understand SMB shares, Samba, mount.cifs, identity mapping, and permission boundaries on network files."
updated: 2026-10-16
translationKey: "network/smb-cifs-linux-file-sharing"
---

SMB is a common file and printer sharing protocol in Windows environments. Linux can act as an SMB client or server through Samba and can mount a share using CIFS. A successful mount does not prove that server-side file permissions match the POSIX permissions shown on the client.

## Shares and identity

A server exports a share with share-level permissions or ACLs; files inside it have their own permissions or ACLs. Users may be authenticated through local accounts, a domain, or Kerberos depending on the environment. UID/GID mapping, SIDs, and ACLs affect how Linux displays ownership and modes.

For a small Samba server, share configuration is usually in `smb.conf`; `[global]` contains shared settings, while `[share-name]` defines the path and policy for an individual share. `browseable = no` hides a share from browse lists but does not replace access control. `valid users`, interface and firewall restrictions, and Linux file permissions determine who can actually access it. Do not enable guest access for a writable share without a clear reason and tight limits.

A Samba account and a Unix account are related but are not automatically the same password store. With a local passdb, a user commonly needs a valid Unix account and then must be added to Samba's database with the appropriate administration tool. Password synchronization between the two systems is a separate policy; enabling it without understanding the consequences can unexpectedly lock users out.

At the command line, `smbclient -L server` lists shares the account is allowed to see; `smbclient //server/share` supports interactive file transfer. Mounting through CIFS is convenient for applications that expect ordinary paths, but credentials should be supplied through a protected file, keyring, or suitable authentication mechanism—not placed directly in the command line.

## Client mounts

`mount.cifs` needs the server and share, a credential mechanism, and mount options. Do not put a plaintext password in a command line or log; use a tightly permissioned credentials file, keyring, or Kerberos as appropriate. Network reconnection, SMB dialect, and signing or encryption policy affect compatibility and security.

## Failure semantics

A network partition can stall a file operation or return an error. Caches, oplocks, and leases improve performance but do not provide the same consistency as a local disk. A retry after a lost response can leave the outcome of a write uncertain. An application should not assume file locks or renames over SMB behave exactly like those on a local filesystem.

## Choosing a network file access method

Not every workload suits a remote filesystem. Sequentially reading a large file often benefits from buffering; opening and updating thousands of small files randomly is more affected by latency. Keeping a frequently accessed source tree or interactive data on a local disk may be faster.

SSHFS is a lightweight userspace option for simple Linux sharing when the server already permits SFTP: it uses SSH to mount a remote directory. Encryption and userspace conversion add overhead, and multi-user setups have limits. Cloud storage mounts often use FUSE; this is an intermediate userspace program, not a local filesystem with identical performance or semantics. For each option, consider authentication, encryption, permissions, and behavior when the connection drops.

## Summary

- Share permissions and file ACLs are two separate permission layers.
- Samba lets Linux act as an SMB client or server.
- UID/GID mapping affects how ownership appears on the client.
- Protect credentials; SMB dialect negotiation and signing matter.
- Network failures and caching make remote-file semantics differ from local files.

## Check your understanding

**Does permission to access a share mean every file in it is readable?** No. File ACLs or permissions can still deny access.

**Does a successful SMB mount prove that writes are durable?** Check the protocol and server/storage contract.

**Is a password safe in a mount command because only an administrator can see it?** It may leak through process listings, shell history, or logs.

## Read next

Compare NFS and AFS to understand other file-sharing protocols and consistency models.
