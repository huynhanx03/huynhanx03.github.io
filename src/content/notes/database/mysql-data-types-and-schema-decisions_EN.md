---
title: "MySQL Data Types and Schema Decisions"
category: "Database"
description: "Compare size, value range, collation, NULL, and identifier choices for an InnoDB schema."
updated: 2026-10-18
translationKey: "database/mysql-data-types-and-schema-decisions"
---

A data type is a decision about correctness, storage, index size, sorting, and the database/application protocol. Choose for the real value domain and operations, not the largest value imaginable. A wrong type can overflow, compare unexpectedly, lose precision, or enlarge every row's indexes.

## Integers and identifiers

`TINYINT`, `SMALLINT`, `INT`, and `BIGINT` have different storage ranges; `UNSIGNED` expands the positive range but does not fit every subtraction/negative-value use. Choose width with headroom based on growth and semantics. `AUTO_INCREMENT` fits internal IDs; distributed UUIDs avoid a coordinator but are wider, and random UUIDs can hurt clustered-index page splits/cache locality. UUIDv7/time-ordered IDs reduce random insertion but need version support and should not hide sensitive information.

Calculate the domain instead of choosing by feel. Signed `TINYINT` stores −128 through 127; `TINYINT UNSIGNED` stores 0 through 255. Both still use one byte: `UNSIGNED` changes the range interpretation, not the column width. A balance may become negative during subtraction, so unsigned may be wrong; a retry count that cannot be negative may fit the unsigned domain better. Likewise, the old `INT(11)` example does not mean eleven digits or a wider range than `INT`: it is a display width, not a value limit, and integer display width is deprecated in MySQL 8.4. Do not use it to size an ID.

An InnoDB clustered primary key contains row data; secondary indexes carry the primary key as a pointer. A wide primary key enlarges every secondary index. Choose a short, immutable, unique PK; if a primary key has mutable business meaning, consider a surrogate key plus a unique constraint on the business key.

## Exact and approximate numbers, money

`DECIMAL(p,s)` preserves decimal exactness under its precision/scale; `FLOAT`/`DOUBLE` are approximate binary floating-point. Money can use integer minor units (cents) with explicit currency or a DECIMAL suited to rounding rules. Do not add floats and expect exact monetary results. Check range, rounding, and overflow in both application and database.

`p` is the total number of digits and `s` is the number after the decimal point. Thus `DECIMAL(5,2)` normally ranges from `-999.99` to `999.99`, not five digits on each side. MySQL 8.4 stores `DECIMAL` in binary form and packs up to nine digits into four bytes; `DECIMAL(18,9)` uses four bytes for the nine integer digits and four for the nine fractional digits. The decimal point does not take a separate byte in this representation. This differs from the storage arithmetic shown in the book; use the storage table for the release you run instead of adding the length of the displayed string. Exact arithmetic does not mean an unlimited range: choose enough `p` and `s`, define rounding, and check boundary overflow.

## Strings, collations, and binary data

`CHAR` has fixed-length padding semantics; `VARCHAR` stores variable length with length overhead; `TEXT/BLOB` fit large payloads but can affect row layout, off-page storage, sorting/temp work, and prefix indexes. `ENUM` is compact but changing its list needs DDL and internal ordering is not natural ordering; use it only for a stable domain with migration cost understood.

`ENUM` stores a fixed value set and its internal order follows declaration positions. Thus `ORDER BY status` may sort by list position rather than alphabetically; inserting a new value in the middle also requires reviewing existing data semantics and DDL. If display order is a UI rule, make it explicit or use a lookup/sort key. Avoid using `ENUM` as a general-purpose identifier if its list can change independently of the schema.

`BIT` and `SET` can pack flags, but their representation through client drivers and their read/comparison behavior can surprise. For a stable flag set, an integer bitmask may be easier to work with if the application defines masks, checks bits, and rejects unused bits. In exchange, a bitmask makes it harder to enforce each permission with a foreign key or query one flag than a relation table. Choose storage by how the data is validated, not only by byte count.

Charset defines encoding; collation defines case/accent sensitivity, equality, and order. `utf8mb4` supports full Unicode; do not rely on defaults that differ by version/database/connection. Check collations on JOIN/unique/index columns to avoid conversions and surprising semantics. Opaque/hash/file data needs binary types rather than text collation.

An ORM-generated schema or migration still needs review. Check that columns with the same meaning use compatible types and collations, indexes match their keys, `VARCHAR` lengths are justified, and constraints exist in the database rather than only in application validation. A table with hundreds of columns can raise row-processing costs and make operations harder to manage; attributes with different access or change patterns may need a different model, but putting everything in JSON just to reduce column count is not a design rule.

## Dates, NULL, and bits

`DATE`, `TIME`, `DATETIME`, and `TIMESTAMP` differ in range, time-zone conversion, and automatic initialization/update behavior. `DATETIME` preserves the calendar value as entered and does not automatically convert it by time zone; `TIMESTAMP` converts from the session time zone to UTC on storage and back on retrieval, but has a narrower range (through 2038 in MySQL 8.4). Therefore, do not choose `TIMESTAMP` only because it is smaller: consider far-future calendar values and the intended policy. For an absolute instant, inputs are commonly normalized to UTC; for a local schedule such as “opens at 09:00,” preserve local semantics with an explicit zone instead of pretending it is one instant.

The book describes older MySQL as storing temporal values only to the second, but current MySQL supports fractional seconds up to microsecond precision (`TIME(fsp)`, `DATETIME(fsp)`, `TIMESTAMP(fsp)`, maximum `fsp` 6). Choose precision based on business accuracy and event ordering because fractional digits require additional storage. Do not encode an epoch into `BIGINT` without a concrete format/compatibility reason; temporal types retain useful date operations and readable values. The [MySQL 8.4 manual](https://dev.mysql.com/doc/refman/8.4/en/datetime.html) documents range, time zones, and fractional seconds; its [storage table](https://dev.mysql.com/doc/refman/8.4/en/storage-requirements.html) shows the cost by precision.

NULL means unknown/absent, not zero/empty; `=` does not match NULL, use `IS NULL`, and unique indexes have special NULL rules. `NOT NULL` expresses invariants and can reduce branches. MySQL Boolean is commonly a small numeric alias; `BIT` representation/driver behavior should be verified.


“Avoid NULL” is a conditional optimization guideline, not a data-modeling law. If the domain includes an unknown or not-yet-provided state, use `NULL` instead of a magic value such as `-1`, an empty string, or `0000-00-00`; a sentinel can collide with valid data and forces every query to remember an exception. SQL NULL creates three-valued logic, so predicates, aggregates, and unique constraints need to be understood. Declare `NOT NULL` when the actual domain requires a value, not merely to avoid handling NULL.

### Notes on individual types

- MySQL integers include `TINYINT`, `SMALLINT`, `MEDIUMINT`, `INT`, and `BIGINT` at 8, 16, 24, 32, and 64 bits; signed and unsigned forms use the same bytes but have different ranges. Choose enough headroom and use matching type, width, and signedness on both sides of an FK/join to avoid implicit conversions or range mismatches.
- The book describes integer computation as generally using 64-bit values; in MySQL 8.4 integer arithmetic uses signed `BIGINT` or converts to `DOUBLE`, depending on the expression. Do not rely on arithmetic over `BIGINT UNSIGNED` values above `2^63−1` being safe: define the result domain, cast deliberately where appropriate, and check overflow/rounding on the running release. A display width such as `INT(11)` does not expand the stored range and is deprecated in MySQL 8.4.
- `FLOAT`/`DOUBLE` are approximate; `DECIMAL(p,s)` is exact within declared precision but has different arithmetic cost. Money can use integer minor units or `DECIMAL` under explicit rounding rules. Choose by semantics first, optimize later.
- `CHAR` suits short, nearly uniform-length values or values updated infrequently; `VARCHAR` suits variable lengths but row updates can fragment storage depending on the engine. Trailing-space semantics depend on version/type; binary `BINARY`/`VARBINARY` compare bytes and pad with zero bytes, while text applies character set/collation. A declared maximum length is not necessarily allocated in full for every row on every engine. A `VARCHAR` value also needs bytes to record its actual length: commonly one byte when the column maximum is at most 255 bytes and two when it is larger. Multibyte character sets make maximum characters and maximum bytes different. Even if a short value uses only its actual bytes on disk, an excessively wide declaration can make some sort/temporary-table execution paths reserve more memory based on metadata. So `VARCHAR(200)` does not necessarily consume 200 bytes per stored value, but it is not free in every execution path.
- `TEXT` has a character set/collation; `BLOB` stores bytes. Each family ranges from `TINY...` through `LONG...`, with a length prefix sized for its maximum capacity; InnoDB may keep a large payload outside the main page. Indexes generally need a prefix length rather than indexing an arbitrary full payload: a prefix index narrows candidates, but a row may still need to be read to compare the remaining bytes. The book says BLOB/TEXT sorting considers at most the first `max_sort_length` bytes, so values sharing a long prefix need a tie-breaker if the application requires stable order. Older engines/versions could also force BLOB/TEXT temporary results to disk. MySQL 8.4 TempTable supports BLOB/TEXT in some in-memory internal temporary tables; do not repeat the old blanket rule that “TEXT always forces disk.” See current [internal temporary-table conditions](https://dev.mysql.com/doc/refman/8.4/en/internal-temporary-tables.html), verify prefix/sort limits for the target version, and measure the query.
- `ENUM` stores values by their position in the declared list: compact, but `ORDER BY` follows enum order rather than alphabetic or automatically defined business order. Changing the list requires a migration, and joining `ENUM` to `VARCHAR` can require conversion. Use it for a small, stable domain; a lookup table is clearer when values have metadata, relationships, or an independent lifecycle.
- `BIT` can have server/driver/engine-specific representation; inspect the returned bytes instead of assuming they are characters `'0'`/`'1'`. `SET` packs flags but embeds the allowed list in the schema and has query/index and definition-change tradeoffs. An integer bitmask allows adding a bit without DDL, but moves the mapping into code and makes individual constraints/permissions harder to express; a relation table is better when each permission needs queries, auditing, or an FK.

Examples in the book about `ENUM`, `BIT`, `CHAR`/`VARCHAR` storage and temporary tables depend on older MySQL/engine behavior; treat them as reminders to check representation and measure the current release, not as byte-for-byte guarantees.

### BLOB/TEXT in queries and filesort

`BLOB`/`TEXT` affect more than row width. If a query materializes long payloads into an intermediate result or sort buffer, some cost can come from copying bytes, memory pressure, spills, and I/O to fetch external pages. The book describes older MySQL releases putting some BLOB-containing temporary tables on disk. MySQL 8.4 TempTable supports BLOB/TEXT in some cases, so inspect `EXPLAIN`, Performance Schema, and spill counters for the target release instead of reusing the old rule.

Select only the columns you need. If a result should be ordered by time and then display a body, find the page/keys by predicate and order first, then fetch payloads for the rows actually needed. For previews, `SUBSTRING(body, ...)` can reduce intermediate data, but preserve filtering/sorting semantics and do not remove text needed to distinguish results. A covering index helps when the query can return from the index without reading payload; if the full BLOB is needed, the row eventually must be read.

The book's `max_length_for_sort_data` and `max_sort_length` settings control details of the sort algorithm in its release. A sort record may hold all needed columns or retain keys and fetch rows again; some paths account for declared `VARCHAR` length, while long text may participate through a prefix. Changing a sort variable does not replace reducing the data to sort, choosing an appropriate index, using `LIMIT`, or checking sort merge passes. The names may still exist, but verify their semantics and optimizer strategy in the MySQL 8.4 manual before changing them.

### Identifiers and generated schemas

Identifiers commonly appear in joins, lookups, PKs, and FKs, so their width and type propagate across indexes. Use matching types, signedness, and collation in related tables. Integers are often compact and sequential; strings may carry business meaning but are wider, subject to collation, and harder to change. `ENUM`/`SET` are usually poor identifiers across domains that evolve independently. Random hashes/UUIDs scatter inserts across indexes; time-ordered UUIDs can improve locality but require evaluating order leakage, uniqueness, and actual version support.

Review ORM/migration-generated schemas carefully: shared meanings should have matching types/collations; default `VARCHAR` widths should not be excessive; avoid turning every attribute into EAV/property rows that need many self-joins; and ensure constraints exist in the database. The book noted row-buffer decode cost in tables with hundreds of columns and a 61-table join limit in MySQL at publication time; exact limits/optimizer behavior change by release, but hundreds of columns, many joins, EAV, and type mismatches remain signals to measure on the target version.

For special data such as IPv4, dotted decimal is a human-readable representation; it can be encoded as a 32-bit number when only IPv4 is needed. For IPv6 or mixed addresses, use a suitable representation/function such as `INET6_ATON()`/`INET6_NTOA()` rather than truncating strings into `VARCHAR(15)`; validate constraints and canonical form in the application. See [MySQL 8.4 IPv6 support](https://dev.mysql.com/doc/refman/8.4/en/ipv6-support.html).

## Schema, normalization, and migration

Normalize so each fact has one source of truth and update anomalies are reduced; denormalize only for a measured read bottleneck with an update/reconciliation plan. Cache/summary/counter tables need rebuild logic. Foreign-key/unique/check constraints protect database invariants; application validation still helps UX but cannot replace race-safe constraints.

ALTER TABLE may be instant, in-place, or copy/rebuild depending on operation/engine/version; metadata locks can still block. Check `ALGORITHM`/`LOCK` support for the target version, estimate disk/temp/replica lag, test in staging, and roll out with backward-compatible expand/migrate/contract steps.

*High Performance MySQL*, chapter 4, covers numeric/string/date/bit types, identifiers, gotchas, normalization, cache/summary/counters, and ALTER. Compare [data type storage requirements](https://dev.mysql.com/doc/refman/8.4/en/storage-requirements.html), [character sets](https://dev.mysql.com/doc/refman/8.4/en/charset.html), and [online DDL](https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl-operations.html).

The integer and `DECIMAL` details are checked against the MySQL 8.4 documentation for [integer types](https://dev.mysql.com/doc/refman/8.4/en/integer-types.html), [numeric type attributes](https://dev.mysql.com/doc/refman/8.4/en/numeric-type-attributes.html), [fixed-point types](https://dev.mysql.com/doc/refman/8.4/en/fixed-point-types.html), and [storage requirements](https://dev.mysql.com/doc/refman/8.4/en/storage-requirements.html).

## Check your understanding

**Should money usually use FLOAT?** Not for exact decimals; use integer minor units or DECIMAL by the required rules.

**Is a UUID always the best primary key?** No; size and insertion locality affect every secondary index.

**Does changing VARCHAR to TEXT only change maximum length?** No; row layout, off-page storage, sorting, and index behavior can change.
