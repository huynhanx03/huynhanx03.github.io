---
title: "Package Managers, Shared Libraries, and Executables"
category: "Operating System"
tags: ["linux", "packages", "linker"]
description: "Distinguish a package from an executable, understand how the dynamic linker finds libraries, and diagnose missing dependencies."
updated: 2026-10-16
translationKey: "operating-system/linux-packages-and-shared-libraries"
---

A runnable program commonly depends on an executable, shared libraries, configuration, and data. A package manager handles how these files are installed, upgraded, and removed according to dependency metadata; it does more than download one binary file.

## Packages and dependencies

Distribution families use their own formats and tools, such as Debian packages with `apt`/`dpkg` and RPM packages with `dnf`/`rpm`. A package manager tracks versions, repository sources, dependency relationships, and which package owns each file. Mixing repositories or installing a package unsuitable for the distribution can make dependencies inconsistent.

Before installing, check which repository provides a package and what its installation scripts do. Configuration may be retained when a package is removed; actual behavior depends on the tool and options.

## Dynamic linker

An ELF executable may reference dynamic libraries. The dynamic loader reads its metadata and finds shared objects through the cache, system configuration, embedded paths, or environment such as `LD_LIBRARY_PATH`, depending on the case. `ldd` is commonly useful for viewing dependencies, but do not run it casually on an untrusted binary because some implementations may execute code.

`readelf -d` shows the dynamic section; `ldconfig -p` lists the library cache; `file` identifies the format. A “cannot open shared object” error may mean the package is missing, the architecture is wrong, the loader path is incorrect, or the cache is stale.

## Static and dynamic linking

Static linking packages required components into the executable; it can make the file larger and reduce some runtime dependencies. Dynamic linking shares libraries among programs and allows shared libraries to be updated, but runtime needs the right loader and ABI. Updating a shared library requires considering application compatibility.

## Check your understanding

**Does a package manager only manage the main executable?** No; a package often contains many files and metadata.

**Is `LD_LIBRARY_PATH` the best permanent fix for every library error?** No; it can load the wrong version and make the environment hard to reproduce.

**Is a static binary always completely independent?** Not necessarily; it may still depend on the kernel, data, plugins, or configuration.

## Further reading

Compilation and linking turn source code into an executable through several stages that can be inspected separately.
