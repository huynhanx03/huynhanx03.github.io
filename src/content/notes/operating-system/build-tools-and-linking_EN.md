---
title: "Building a program: compiler, object files, and linker"
category: "Operating System"
tags: ["linux", "compiler", "linker", "build"]
description: "Follow C source through preprocessing, compilation, assembly, linking, and library/runtime installation."
updated: 2026-10-16
translationKey: "operating-system/build-tools-and-linking"
---

The CPU does not execute source code directly. A toolchain converts source through several formats, resolves references between modules, and creates an executable.

## Main steps

```text
source → preprocess → compile → assemble → object files → link → executable
```

The C preprocessor handles includes and macros; the compiler produces assembly or an intermediate representation; the assembler creates object files with machine instructions and relocations; the linker combines objects, resolves symbols, and adds libraries. A compiler driver may combine or hide some steps.

## ABI and symbols

An Application Binary Interface (ABI) defines function calling, parameter passing, data layout, and binary interaction on a platform. Modules must use compatible ABIs to link safely. Changing a public struct or compiler flags can break ABI even when the source looks similar.

A symbol is a function/variable name resolved by the linker. An undefined reference often means a missing object/library or incorrect link order/options. A shared-library version mismatch may fail at load time or runtime.

## Make and dependency graphs

A build system describes targets, source/header dependencies, and commands that produce outputs. Make commonly uses timestamps to decide whether a target needs rebuilding; a missing dependency can leave an old binary even after code changes. A clean build helps diagnose issues but does not fix an incorrect dependency graph.

Reproducible builds pin compiler/tool versions, dependencies, flags, environment, and inputs. Build caches improve speed but must include every relevant input in the key; otherwise, an outdated artifact can be reused.

## Packages and installation

`make install` may place files under a system prefix; a package manager tracks files and dependencies more reliably. Manual source installation makes removal and upgrades harder to audit. On servers, prefer versioned artifacts and a rollback process.

Prefer a distribution package when it meets the need: distributions integrate dependencies and provide security updates through their process. Building from source is useful when a specific version, configuration, or prefix is needed, but operators must track updates, provenance, dependencies, and removal. Avoid casually replacing package-managed files; future updates may overwrite them or make system state hard to inspect.

When building a source archive, first read `README`/`INSTALL` and inspect the archive contents to learn where it extracts; do not unpack it carelessly into source trees or shared directories. With Autoconf, `./configure --prefix=/opt/app-version` checks tools/dependencies and creates build configuration. Then build, run provided checks, and preview `make -n install`. A private prefix limits installation paths, but file/dependency tracking is still needed for controlled upgrades/removal. Installing manually into `/usr` can overwrite or conflict with distribution files.

Some projects support out-of-tree builds to try multiple configurations without dirtying the source directory. For separately located dependencies, `CPPFLAGS` commonly supplies header paths (`-I`), `LDFLAGS` supplies linker paths (`-L`), and `pkg-config --cflags --libs package-name` can provide standard flags from `.pc` metadata. Do not confuse link-time `-L` with the runtime shared-library path. If `configure` fails, `config.log` usually contains the check command and original error; inspect the area around the failed check rather than relying only on the generic message.

Before applying a patch, inspect its affected files and paths and apply from the correct source root. A “File to patch” prompt often means the current directory is wrong or the patch does not match this source version. When a build fails, find the first compiler/linker error; later `make ... Error` lines are often consequences. A missing header may require a development package or `CPPFLAGS=-I...`; an unresolved link symbol usually needs the right object/library, not a runtime-loader change.

A language-level environment such as Python `venv` isolates an application's interpreter and package directory, usually by changing `PATH` in the current shell. It does not create a kernel or isolate processes like a container, and it is not a hypervisor VM. Choose the right layer: venv for Python dependencies, a container for process/filesystem/network isolation with a shared kernel, and a VM when a separate guest OS/kernel is needed.

## Summary

- A toolchain converts source to objects/executables in several stages.
- The linker resolves symbols and relocations; the loader handles executables/shared libraries at runtime.
- ABI determines binary compatibility beyond source syntax.
- Accurate build graphs and pinned dependencies support reliable builds.
- Package managers track installation and removal better than manual copying.

## Check your understanding

**Does a compiler always create a complete executable from one source file?** No. A linker usually combines objects and dependencies.

**Can a clean build fix a missing dependency declaration?** It may hide the issue temporarily, but the graph remains wrong.

**Will the same source always produce byte-identical binaries?** No. Compiler, flags, timestamps, environment, or dependencies may differ.

## Read next

Linux user space also has desktop sessions, D-Bus, and printing systems; these are coordinated services, not kernel components.
