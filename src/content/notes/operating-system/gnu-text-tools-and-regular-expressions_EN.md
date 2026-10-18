---
title: "grep, sed, awk, and Stream-Oriented Text Processing"
category: "Operating System"
tags: ["linux", "command-line", "text-processing"]
description: "Choose tools for filtering, substitution, and columns; understand basic regular expressions and the limits of text pipelines."
updated: 2026-10-16
translationKey: "operating-system/gnu-text-tools-and-regular-expressions"
---

Unix commonly combines small programs through stdin and stdout. `grep` selects lines, `sed` transforms a stream, and `awk` processes records and fields. Combining the right tools makes operations repeatable, but first understand the data format being processed.

## Filter with grep

`grep -n` adds line numbers, `-i` ignores case, `-v` inverts the match, and `-E` uses extended regular expressions. A regex describes a text pattern; it does not understand nested syntax such as JSON, HTML, or programming languages.

Regex characters may also have meaning to the shell, so quote the pattern: `grep -E 'error|failed' app.log`. Use `-F` for a literal string, avoiding unnecessary regex behavior.

## Transform with sed

`sed 's/old/new/g'` replaces matches on each line. By default, sed processes line by line, so multiline patterns need an appropriate option or approach. `sed -i` edits a file in place and differs between GNU and BSD; make a backup or write to a new file when data matters.

## Fields with awk

Awk splits each line into fields using a separator, whitespace by default. `$1` and `$2` are fields; `$0` is the full line. Filter with a condition and print the result, for example `awk '$3 > 100 { print $1, $3 }'`. If data contains quoted commas or multiline fields, a proper CSV parser is safer than default awk behavior.

## Keep pipelines inspectable

A pipeline should have clear steps and handle encoding and read errors. `sort`, `uniq`, `cut`, `tr`, `head`, and `tail` help with common operations, but line-oriented commands do not replace a schema-aware parser. With arbitrary filenames or binary data, do not assume input consists of clean text lines.

## Check your understanding

**Is regex a general parser for every nested format?** No.

**When is `grep -F` appropriate?** When searching for a literal string.

**Does default awk correctly parse quoted CSV?** No.

## Further reading

Archive tools are often connected in pipelines too; distinguish archiving, compression, and encryption.
