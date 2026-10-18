---
title: "From Source to Executable: Compiler, Assembler, and Linker"
category: "Operating System"
tags: ["linux", "build", "compiler", "linker"]
description: "Trace preprocessing, compilation, assembly, and linking; identify symbols, object files, and errors at each stage."
updated: 2026-10-16
translationKey: "operating-system/compiler-assembler-linker-pipeline"
---

A build command often hides several stages. Source may pass through a preprocessor; a compiler produces assembly or an object file; an assembler encodes instructions; then a linker combines objects and libraries into an executable. Knowing which stage failed narrows the cause.

## Object files and symbols

An ELF object file contains machine code, sections such as `.text` and `.data`, a symbol table, and relocations for the linker to complete. Its header includes architecture, file type, and metadata. Use `file`, `readelf -h/-S/-s`, and `nm` to inspect it.

A compiler may create a separate object for each source file. The linker resolves references among objects and libraries, places sections, and applies final relocations. An undefined reference commonly means a symbol is missing or the order/link flags are wrong; a duplicate symbol means conflicting definitions exist.

In a Makefile, a target describes an artifact to build and dependencies say which files must be newer; `make` reruns affected steps according to the dependency graph. Common variables include `CC`, `CPPFLAGS`, `CFLAGS`, `LDFLAGS`, and `LDLIBS`. GNU make recipes usually require a tab. A `clean` target commonly removes build output; an `install` target may copy files into system directories, so preview it with `make -n install` and check paths before running it.

## Static and dynamic linking

A static library is commonly an archive of objects from which the linker selects needed parts. A shared library is loaded at runtime by the dynamic loader. `-L` searches for libraries at link time; `-lfoo` selects a library name; the runtime loader path is a separate matter. Successful linking does not guarantee the executable will find its `.so` at runtime.

## Reproducibility

Compiler version, flags, environment, generated files, and dependencies affect the binary. Build systems such as make and ninja rerun steps according to the declared dependency graph; a missing dependency can produce an incorrect incremental build. A clean build helps check completeness, but is not a reason to delete user artifacts indiscriminately.

## Check your understanding

**Do an assembler and linker do the same job?** No.

**Does `-L` resolve a runtime shared library?** No; it primarily affects the build-time linker.

**Is an object file already a complete executable?** Usually not.

## Further reading

The dynamic loader reads executable metadata and loads shared libraries before transferring control to the program.
