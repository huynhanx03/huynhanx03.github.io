---
title: "Linux users, groups, permissions, and PAM"
category: "Operating System"
tags: ["linux", "permissions", "authentication", "pam"]
description: "Distinguish identity, authentication, and authorization; read UID/GID and mode bits, and understand sudo and PAM."
updated: 2026-10-16
translationKey: "operating-system/linux-users-permissions-pam"
---

The kernel needs to know whom a process represents to decide whether it may read a file, bind a socket, or signal another process. Linux uses the process's UID/GID and credentials; login programs and authentication services establish the initial identity.

## Identification, authentication, and authorization

- **Identification:** a user claims an identity, such as a username.
- **Authentication:** the system verifies that the person controls that identity, using a password, key, or another method.
- **Authorization:** a decision about what that identity may do to a resource.

A successful login does not mean the user has root privileges. File access commonly depends on UID/GID, mode bits, ACLs, and other policy.

## UID, GID, and file permissions

The kernel primarily checks numeric UID/GID values, not just displayed names. A file has an owner, group, and read/write/execute bits for owner, group, and others. Execute permission on a directory usually allows traversal or search, so directory permissions differ from permission to read a file's contents.

A process has real, effective, and saved UIDs, as well as group IDs and other credentials. Effective UID commonly affects permission checks; real UID records the caller's identity in many contexts; saved UID lets some privileged programs temporarily change and restore identity under kernel rules. Which credential a system call uses depends on the operation; do not infer the process's entire “owner” from one `ps` column. `sudo` is a userspace program that uses granted privilege to change identity and apply policy; it is not a username or password that the kernel authenticates by itself.

## `/etc/passwd`, shadow, and groups

`/etc/passwd` commonly has seven colon-separated fields: username, password marker or placeholder, UID, primary GID, descriptive information, home directory, and login shell. On shadow-password systems, `x` usually indicates that authentication information is in `/etc/shadow`; account-lock markers vary by tool and distribution. `/etc/group` maps group names to GIDs and may list supplementary members. Many systems use NSS to look up accounts, so data may also come from LDAP/SSSD rather than local files alone. Administration tools such as `useradd`, `usermod`, and `passwd` maintain consistent formats more safely than manual edits.

Service or pseudo-users have their own UID so processes can run with limited privileges, even though they cannot log in interactively. UID 0 has special meaning in the kernel; `root` is the common userspace name mapped to it. Usernames and passwords belong to userspace: the kernel enforces permissions on numeric credentials, while PAM/NSS and login services handle authentication, mapping, and policy.

## PAM

Pluggable Authentication Modules (PAM) provide a framework for login services to call modules that check identity, account policy, sessions, and password updates. A bad configuration can lock users out or grant unintended access. Distributions use different configurations and modules; before editing, keep a root or console session working and back up the file.

PAM is configured per service, commonly under `/etc/pam.d/`; each line combines a task type, control rule, and module. Stacks may include `auth` (authentication), `account` (account state or conditions), `password` (credential updates), and `session` (session setup and cleanup). Modules run in order: `required` records a failure but continues through later rules; `requisite` stops immediately on failure; `sufficient` may end successfully early if earlier conditions have not failed. Advanced syntax and includes vary by distribution, so read the whole stack before changing it.

PAM focuses on authentication, account, and session policy; final authorization is still enforced by the kernel and application through their own mechanisms. A successful PAM module does not automatically grant access to every file. Because the stack has ordering and control flow, a mistake can lock users out; keep a recovery console/session and check the distribution's configuration before applying changes.

## Summary

- A username is a name; the kernel commonly checks UID/GID credentials.
- Authentication proves identity; authorization decides permissions.
- Mode bits, ACLs, groups, and directory traversal permissions all affect access.
- `sudo` grants privilege according to policy and logs activity; avoid running everything as root.
- PAM is a framework for authentication, account, and session policy; a mistake can break login.

## Check your understanding

**Does the username `alice` directly determine permissions?** The kernel primarily checks UID/GID and credentials.

**If a file is readable, can it be opened when a parent directory does not allow traversal?** No. Permissions on path components also matter.

**Does PAM success mean a process has root privileges?** No. Identity and authorization are separate steps.

## Read next

System administration also needs logs, time synchronization, and scheduled tasks.
