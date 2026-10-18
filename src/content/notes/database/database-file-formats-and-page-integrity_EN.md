---
title: "Database File Formats, Page Layout, and Integrity"
category: "Database"
description: "Move from binary encoding to slotted pages, cells, versioning, and checksums for durable data."
updated: 2026-10-17
translationKey: "database/database-file-formats-and-page-integrity"
---

A database file is a protocol between software versions and bytes on storage. A page must tell the engine where records begin, what type/length fields have, which format it uses, and whether bytes are damaged. A format that works only when records have equal size wastes space for `text` or changing records, or forces data movement.

## Binary encoding and variable-length data

Integers can be fixed-width or variable-length; strings need a length prefix, delimiter/escaping, or offset table. Fixed-width is easy to address but wastes space; variable-length saves small values but requires parsing and length limits. Endianness, signed representation, alignment, and character encoding must be specified if another version/platform reads the file.

For example, a 32-bit integer `0xAABBCCDD` has bytes `AA BB CC DD` in big-endian and `DD CC BB AA` in little-endian. A reader using the wrong byte order still reads four bytes but gets a different value; the format must say which order, not depend on the current CPU. Floats/doubles also need a defined encoding (often IEEE 754), including NaN and signed-zero behavior if they affect comparisons/indexes.

A string can store `length + bytes` to expose its size directly, or use a sentinel such as NUL; the sentinel must be escaped if that byte can occur in the data. With a fixed schema, field position/type can be implicit to avoid repeating column names. For variable fields, a length or `(offset,length)` lets the reader jump to a field without parsing every preceding field.

Booleans, enums, and flags can be bit-packed; the format must define bit order and reserved bits for future extension. Do not rely on a compiler's struct layout without standardizing padding/alignment.

A flag is a set of independent bits: a mask such as `0000_0100` can be set with OR, tested with AND, and cleared with AND plus the inverted mask. An enum is one mutually exclusive value; flags represent several properties at once. Preserve reserved bits and define how unknown enum values are handled so old/new readers interpret future files deliberately.


## From fields to cell bytes

In RAM, a program can follow a pointer to an object; in a file, a reader must know which byte starts a field and which byte ends it. A format therefore describes how each type is serialized, field order, and how offsets are calculated. If pages have a fixed size `P`, page ID `i` is often mapped to the region beginning at offset `i × P`; a cell offset is relative to the start of that page. **A page ID and a cell offset are two different address levels**: the page ID selects a block in the file, and the cell offset locates a cell within that block.

A file may begin with a header containing magic bytes, a version, and metadata needed to interpret pages; the rest is divided into fixed-size pages, sometimes followed by a trailer or lookup table. A reader typically reads the header, validates the format, and then uses a page ID or index to fetch a page. Fixed-size pages make addressing simple, but do not mean every database uses the same size or header layout.

Numeric fields may have fixed sizes so a reader can calculate their positions directly. For example, a record might contain `employee_id:uint32`, `status:uint8`, `name_length:uint16`, and `name:bytes[name_length]`. If `name = "An"` is encoded as ASCII, the reader decodes the first five bytes under the specified byte order, gets `name_length = 2`, and reads the next two bytes. If it skips the length field or uses a different byte order, later fields become misaligned even though the file contains enough bytes.

A format often chooses explicit numeric widths such as `byte = 8 bits`, `short = 16 bits`, `int = 32 bits`, and `long = 64 bits`; a language type name does not always guarantee the same width on every platform. With IEEE 754, `float32` has sign, exponent, and fraction bits; a value such as `0.1` is usually only approximate. If a number is a comparison key or represents money, choose a representation and comparison rule deliberately instead of assuming every real number has an exact decimal representation. A string length in a format usually counts bytes; specify an encoding such as UTF-8 and do not confuse byte count with character count.

For B-tree cells, page metadata can identify all cells as internal key cells or leaf key/value cells, so each entry need not repeat the cell type. An internal cell could contain `[key_size][child_page_id][key_bytes]`; a leaf cell could contain `[key_size][value_size][key_bytes][record_bytes]`. A fixed-size header lets the reader calculate where the key and value begin; the following bytes are sized by the two length fields. If cells on a page are uniform, metadata such as cell type or key type can live once in the page header.

An address stored on disk is not necessarily a process memory address. A page ID must be mapped through a file/cache layer to a byte offset; an offset within a page is relative to the page start and can use a smaller integer. When reading a binary structure, identify whether a field is a page ID or offset, whether its unit is bytes or blocks, and whether it remains valid when a page moves.

## Slotted pages

A common page has a header at the beginning, a slot/line-pointer directory growing from the start, and cell payloads growing from the end. A slot points to a record's offset/length. When a record is deleted, its slot can be marked dead while payload space remains. Compaction moves payloads and updates slots, keeping record IDs more stable than physical offsets.

For example, after inserting `Tom`, `Leslie`, then `Ron`, payloads can be appended in that order while the slot directory keeps logical key order `[Leslie, Ron, Tom]` for binary search. An insertion in the middle then shifts slot pointers instead of every payload byte. A slot ID is stable only for the lifetime defined by the format; a reclaimed slot can be reused, so a TID may need a generation/version to distinguish stale references.

For example, an 8 KiB page might have a 64-byte header, a 20×4-byte slot directory, and 7 KiB of cell payload, with the rest free. When record 2 is deleted, the slot can be reused or payloads compacted. An index pointing to (page,slot) lets a page reorder data without changing every index pointer.

In the ordered-key example, append cells in the order `Tom`, `Leslie`, `Ron`. The payload region can preserve that write order; the directory sorts pointers by key: before adding `Ron`, it points to `Leslie` and then `Tom`. When `Ron` is inserted, write its new cell into free payload space and insert its pointer between the existing slots. Only directory pointers move; the bytes for `Tom` do not need to move to preserve search order.

Free space can be tracked as a list of holes `(offset,size)`. First-fit takes the first large-enough hole but can leave many small fragments; best-fit chooses the closest-sized hole but needs a suitable search/order. If total free bytes are enough but no contiguous region fits, compact by copying live cells together. If compaction still leaves too little room, split the page or allocate an overflow page.

## Cells and overflow

A cell needs to represent a key/value, child pointer, record flags, and variable payload. A B-tree internal cell has a separator key and child; a leaf cell has a value/row pointer. Long keys lower fanout and increase tree height. A record too large for the page may overflow to another page or TOAST-like object; reads add I/O and cleanup needs a lifecycle.

## Versioning, checksums, and crashes

A **magic number** is a fixed byte pattern that helps a reader recognize a file or page type; it can detect a likely format mismatch but does not prove that all contents are valid. The version must be readable using a stable header layout. Once the reader knows the version, it selects the corresponding decoding rules; a system may support a few older formats or require a rewrite during an upgrade. Recognizing the right version does not guarantee recovery from a partial write.

A page/file header has a magic/version field to detect the wrong format. A version upgrade may migrate in place, rewrite, or support multiple formats; the choice affects rollback and downtime. A checksum detects page bytes that differ from the stored checksum, but cannot restore content. Recovery needs backups, replicas/checksum repair, or error-correcting storage.

A CRC detects some storage/transmission errors such as burst corruption, but is not proof against tampering. A cryptographic hash fits integrity checks under an adversarial threat model; encryption/authentication needs a MAC or authenticated encryption. A checksum per page can isolate a bad page without declaring the whole file corrupt, but recovery still needs a trusted copy to repair it.

A torn write occurs when only part of a page reaches storage during power loss. A doublewrite buffer, full-page WAL image, copy-on-write, or atomic-sector assumptions solve it at different layers. Checksums and torn-write protection complement each other: checksums detect damage; recovery/duplicate copies help restore it.

## Data files and index files

An engine may store rows and indexes together (clustered) or keep row data separate with indexes pointing to records. A primary index is indirection if its leaf does not hold the row. Separate data/index files aid administration but add pointers/lifecycles. Page and index formats must be compatible so backups/replicas/copies do not mix bytes from different versions.

*Database Internals*, chapters 1 and 3, covers page/file formats, binary encoding, slotted pages, variable-length values, versioning, and checksums. The introduction of *PostgreSQL Internals 14* describes PostgreSQL-specific pages/tuples; a generic layout is not a substitute for the actual engine format.

## Check your understanding

**Can a checksum repair a damaged page?** No; it only detects the mismatch.

**What is the benefit of an index pointing to a byte offset?** Direct access, but page compaction may require pointer updates; slot indirection avoids some of that.

**Is a version byte in the file header enough for every migration?** No; define read/write, rollback, mixed-version, and crash behavior.
