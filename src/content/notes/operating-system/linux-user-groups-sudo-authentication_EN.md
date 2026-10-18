---
title: "UIDs, Groups, sudo, and User Authentication"
category: "Operating System"
tags: ["linux", "users", "permissions", "pam"]
description: "Trace numeric identities, group membership, sudo policy, and PAM's role in login."
updated: 2026-10-16
translationKey: "operating-system/linux-user-groups-sudo-authentication"
---

The kernel decides permissions using numeric identities such as UID and GID, not display names. A username is resolved through a local database or a service such as LDAP/SSSD; the same name does not guarantee the same UID on two machines.

## UID, groups, and file permissions

A process has real and effective UIDs along with group IDs. Files store owner UID/GID and mode bits for owner, group, and others. `id` shows the current identity; `getent passwd name` or `getent group group` queries the configured NSS source. Group-membership changes usually apply only to a new session.

`chmod` changes permissions, `chown` changes ownership, and `umask` filters default bits when creating files. ACLs can add permissions beyond mode bits, making results hard to infer from `ls -l` alone; use `getfacl` to inspect ACLs.

## sudo and least privilege

`sudo` lets an authorized user run a command as another identity, commonly root. Policy determines who may run which commands and whether authentication is required. Avoid using `sudo` for an arbitrary shell when only one operation is needed; specifying the command improves auditing and reduces mistakes.

Root can bypass many ordinary checks, so an incorrect command may delete or change the entire system. Verify the user, target path, and device before a destructive operation.

## PAM and login

PAM is a module framework for authentication and account/session steps. Applications such as login, sudo, and SSH may use different PAM stacks. Login failures may come from a password, account lock or expiry, PAM policy, home directory, shell, or remote identity service.

Do not experiment with PAM files without a backup console: a bad configuration can block all logins. Read authentication logs and validate the configuration before applying changes.

## Check your understanding

**Does the kernel use usernames to check permissions?** It mainly uses numeric UIDs and GIDs.

**Does adding a user to a group affect an already-running process session?** Usually a new session or deliberate credential update is needed.

**Does PAM only verify passwords?** No; its stack may also handle accounts, sessions, and other policies.

## Further reading

Filesystem permissions and namespaces can be combined with cgroups and capabilities to limit a service or container.
