---
title: "Reliable shell scripts: quoting, errors, and cleanup"
category: "Operating System"
tags: ["linux", "shell scripting", "automation"]
description: "Write scripts with explicit error checks, quoting, and cleanup; avoid traps in automated execution."
updated: 2026-10-16
translationKey: "operating-system/shell-scripting-reliability"
---

Shell scripts are useful for orchestrating administration commands, but are not a replacement for a suitable language for complex data processing. A good script makes its environment explicit, checks errors, quotes data, and limits unintended side effects.

## Declare the interpreter and error behavior

```sh
#!/usr/bin/env bash
set -euo pipefail
```

The shebang selects an interpreter. `set -euo pipefail` is common in Bash but does not make every error safe. `-e` has contextual exceptions such as conditions and pipelines; `-u` catches unset variables; `pipefail` propagates failures from commands in the middle of a pipeline. Handle important errors explicitly.

## Quote and handle paths

```sh
for file in "$directory"/*.log; do
  [ -e "$file" ] || continue
  process_one "$file"
done
```

Quote variables to preserve spaces and special characters. An unmatched glob may remain literal or disappear depending on shell options; a script must account for an empty directory. Use `--` before a filename when the command supports it so a name beginning with `-` is not treated as an option.

## Arguments, conditions, and exit status

Special parameters let a script handle input without reparsing a string: `$0` is the script name, `$#` the argument count, `$1`/`$2` the first arguments, and `"$@"` passes each argument back intact. Avoid unquoted `$@`, which can split spaces and expand globs.

`if command; then ...` checks the command's exit status; 0 usually means success and nonzero usually indicates failure, but exact meaning depends on the command (for example, `grep` uses 1 to mean no match). A later command overwrites `$?`, so save/check it immediately. Use `case` to branch on strings or patterns; use `[`/`test` for file, string, and numeric checks, remembering to quote values that may be empty.

## Temporary files and cleanup

Create temporary files in an appropriate directory with a tool such as `mktemp`, restrict permissions, and remove them in an exit trap. Do not use a predictable temporary filename in a shared directory; it can be raced or attacked through a symlink.

Cleanup must not delete a configurable path if a variable is empty or wrong. Verify the target, permissions, and destructive step; use a dry run when possible.

When passing argument lists, use `"$@"` to preserve each argument, including filenames with spaces. With `find` and `xargs`, use NUL delimiters (`-print0` and `-0`) if arbitrary filenames may contain newlines. Avoid collecting output into a string through command substitution and splitting it back into filenames.

`source file` (or `.` in POSIX shell) runs configuration in the current shell, so variables and working directory may change there. Running a file as a command creates another shell process; changes in the child environment do not return to the parent. `exec command` replaces the current shell with a new command, useful as a container's main process but with no return to the script.

## Idempotency and logging

A regularly deployed script should be safe to rerun without corrupting state: check before creating, overwrite safely, lock to prevent two concurrent instances, and log major steps. Define the exit code when some steps succeed and a later one fails.

## When should you use another language?

If you need to parse nested data, implement complex retries or transactions, handle Unicode, or manage many error branches, Python/Go/Rust are often clearer than shell. Shell should compose existing programs, not build a JSON parser or process untrusted strings itself.

## Summary

- Choose the right shell and understand `set -e` limits.
- Quote variables; handle unmatched globs and filenames beginning with a dash.
- Temporary files need safe names, permissions, and checked cleanup.
- Idempotency, locks, and logs make automation easier to operate.
- Use a full programming language when logic is no longer clear in shell.

## Check your understanding

**Does `set -e` guarantee that a script stops on every error?** No. Shell context creates exceptions.

**Is `rm -rf "$TEMP_DIR"/*` safe if the variable is empty?** No. Validate the variable and path before destructive action.

**Is shell suitable for parsing JSON with regular expressions?** Usually not; use a proper JSON parser.

## Read next

This topic continues with environment variables, PATH, profiles, and running services/jobs outside a terminal.
