---
title: "Redis Pull Messaging, Delayed Tasks, and File Distribution"
category: "Database"
description: "Trace messages from enqueue to acknowledgment, schedule due work, and assign files to worker groups."
updated: 2026-10-18
translationKey: "database/redis-pull-messaging-and-file-distribution"
---

A worker takes an email from a queue, sends it, and then dies before reporting completion. The queue cannot tell whether the email was sent, so a retry may send it twice. This shows why a queue must track work in progress, not just store work that is waiting.

In a **pull** model, a worker asks for a task when it is ready. A slow worker is not pushed an unbounded backlog. Redis provides operations to move and store tasks; the application must combine them into a protocol for claiming, acknowledging, retrying, and recovering work.

## A reclaimable FIFO queue

The book's basic email queue uses `RPUSH` to append a JSON task to a List and `BLPOP` to take it from the front. The `B` means the command waits when the List is empty, instead of making the worker repeatedly ask Redis. A generic worker can read from multiple Lists and dispatch a `[callback, args]` payload; the callback must come from an application-registered allowlist, never from an arbitrary function name in the message.

`BLPOP` removes a task as soon as the worker receives it. If the worker dies before sending the email, the queue has lost the task; if the email was sent but the worker dies before reporting success, a retry may send it twice. A simple List queue therefore fits only when loss is acceptable or work can be regenerated.

For reclaimable work, `BLMOVE` (Redis 6.2+) atomically moves a task from a `ready` List to a `processing` List. After the work succeeds, the worker **acknowledges** (ACKs) completion and removes the task from `processing`. Each claim has a **lease**, or time-limited right to process the task. If it expires without renewal, a **reaper** can return the task to `ready` for another attempt. `BLMOVE` only performs the move; it does not provide the lease, conditional acknowledgment, or retry policy. Each task therefore needs a stable ID, claim token, claim time, retry count, and terminal error state.

| State | Ready List | Processing List | What happens |
| --- | --- | --- | --- |
| Waiting | task-42 | — | No worker has claimed it |
| Running | — | task-42 | `BLMOVE` removes it from ready and records it in one operation |
| Completed | — | — | The worker acknowledges and removes it from processing |
| Worker died/lease expired | task-42 after reclaim | — | A reaper returns it for another attempt |

A worker may be paused rather than dead. When its lease expires, a reaper can give the task to another worker, and both may run it. This is **duplicate processing**. Give every claim a new token. ACK, lease renewal, or failure reporting must use a Lua script/Function or transaction that checks the current token before changing state. Otherwise, an old worker that resumes can delete the new worker's claim.

A token cannot stop a side effect already running in another service. The handler still needs **idempotency**: retrying the same task ID must not create an unintended second result. If the target resource supports **fencing**, send a monotonically increasing generation and have the target reject stale generations. For SQL side effects, write an inbox/dedup record in the same transaction; remove queue state only after commit, or use an outbox/inbox protocol.

In Redis Cluster, the ready and processing keys used by `BLMOVE` must share a hash slot. Names such as `queue:{email}:ready` and `queue:{email}:processing` use the `{email}` hash tag to place both keys in one slot so the multi-key command is valid.

## Delayed tasks

The book considers three approaches and chooses a ZSET: making a worker wait and re-enqueue a future task occupies a worker and makes ordering unpredictable; keeping the schedule in a poller's RAM loses it when that process restarts; storing it in Redis lets another poller resume after a poller restart, provided Redis still retains the data. Survival across a **Redis server** restart/crash depends on persistence, replication, and durability configuration. The book's member is JSON containing a unique ID, destination queue, callback, and arguments; the score is the run time. A task due immediately goes straight to a List.

In the book's algorithm, a poller reads the lowest-score item with `ZRANGE ... 0 0 WITHSCORES`. If it is not due, the poller sleeps briefly and tries again. If due, it decodes the ID, queue, callback, and arguments, acquires a lock keyed by the task ID, then runs `ZREM delayed:` and `RPUSH queue:<destination>` before releasing the lock. The lock coordinates multiple pollers in the normal path; the two commands that move state are still separate operations. If the process dies after `ZREM` but before `RPUSH`, the task can be lost. Keep this textbook example distinct from the modern design below: when a smaller state-transition window is required, use a short script that checks the task is still scheduled and due, then removes and enqueues it in one atomic execution. A script is not a rollback transaction: validate key types/inputs before writes and provide a way to reconcile runtime errors.

A modern design often uses a `scheduled` ZSET with task IDs as members and stores payload/state in a Hash. A poller reads the earliest due member. If its score is still in the future, it sleeps until the next check; once due, one Lua script/Function checks the time, removes the ID from the ZSET, and pushes it to its destination ready List as one atomic state transition. A worker then claims it into a processing List. Atomicity prevents another poller from interleaving during the move, but it is not rollback: if a later command fails after the task was removed, Redis does not automatically restore the earlier state. Validate types/inputs before mutation and provide a way to reconcile failed tasks. Only one or a few pollers are needed because they move scheduled tasks to queues; there is no need for one poller per worker.

In Cluster, the scheduled ZSET and destination List accessed by one script must also share a slot, for example `tasks:{email}:scheduled` and `tasks:{email}:ready`. Co-location makes the atomic operation valid but concentrates one queue on one shard; split queues by tenant/workload if a shard becomes hot.

Trace: `task-42` is due at 12:00 and targets `ready:high`. At 11:59:59 the poller sees it is not due and sleeps briefly. After 12:00, the poller moves it to `ready:high`, and a worker claims it into processing. If the poller dies before the move, the task remains in the ZSET; if separate commands crash between `ZREM` and `RPUSH`, the task can disappear. An atomic script closes the loss/duplication window between those keys, but it does not make the worker's external email/API side effect exactly once.

Because a ZSET has no blocking pop for the condition “score ≤ now,” the poller must poll. Polling too slowly makes tasks late; polling constantly spends CPU/network. It can sleep longer when no task is due, calculate from the next due time, and cap the delay. The 10 ms/100 ms figures in the book's example are period-specific illustrations, not current defaults.

### Prioritizing work as it becomes due

If a scheduled task should run as soon as it is due, the book puts delayed queues before normal queues in `BLPOP` order: `high-delayed`, `high`, `medium-delayed`, `medium`, `low-delayed`, `low`. Redis checks keys from left to right and pops from the first non-empty key, so a steady stream of high-priority work can starve low-priority work indefinitely. If several due tasks are pushed to a List head with `LPUSH`, the last one pushed runs first; choose the matching push/pop direction or sort the batch to preserve due-time order. When strict priority is unfair, add aging, quotas, or a service schedule. Also decide clock source, retry delay/backoff, cancellation, rescheduling, expiry, and what to do when many tasks become due together. In Redis Cluster, the keys checked by one `BLPOP` must share a hash slot. A hash tag such as `queue:{mail}:high` and `queue:{mail}:low` makes that work but places all mail priorities on one shard. To distribute load, split queues/consumers by group instead of assuming one multi-key command can scan the cluster.

Clock skew between producers/workers shifts schedules; wall clocks can jump. Fast retries create poison loops; use exponential backoff with jitter and a maximum attempt count. Remove completed tasks so the keyspace does not grow forever.

At minimum, monitor ready/delayed/processing lengths, oldest task age, lateness relative to due time, reclaim/retry counts, terminal tasks, and completion rate. A small queue can still hide one task stuck for a long time; age and lateness often describe user impact better than depth alone.

## Pull messaging to multiple recipients

Pub/Sub serves only online subscribers. Pull messaging stores a message where a recipient can fetch it after reconnecting. For **one recipient**, a mailbox is a List per user: the sender appends messages, the client polls for a batch, then trims the items it has received. If the server trims before the device confirms it stored the message, a lost response can lose it; concurrent polls can also read the same batch before trimming. Use message IDs and explicit ACKs if loss/duplication is unacceptable, or use the reclaimable ready/processing/ACK protocol above. Mailbox length can reveal a long-offline recipient or a growing backlog; define a size limit and expiration policy so abandoned accounts do not grow Redis forever.

### Group chat: one shared log, one cursor per member

The book avoids writing one copy per group member. Each chat has one message log and records how far each member has read:

| Key | Members | Meaning |
| --- | --- | --- |
| `chat:<id>` | username → score | Members; score is the highest message ID fetched so far |
| `seen:<user>` | chat ID → score | Chats the user belongs to and that user's cursor in each chat |
| `msgs:<id>` | message payload → score | Ordered messages; score is the message ID |
| `ids:<id>` | integer counter | Allocates increasing message IDs for the chat |

Creating a chat registers each member at cursor 0, adds the chat to every `seen:<user>`, and writes the opening message. When a user joins an existing chat, the book initializes their cursor to the latest ID; they receive new messages after joining, not the prior history. To send a message, the book locks the chat around ID allocation and ZSET insertion. Without that lock, two writers could allocate IDs and store messages in a different order; in a current system, use a short Lua script/Function for ID allocation plus append in one same-slot operation, or a transaction with retries.

To fetch, the server reads `seen:<user>`, then pipelines a query on each `msgs:<chat>` for scores above that chat's cursor. After returning new messages, it updates the user's cursor and the member score in `chat:<id>`. Messages through the lowest cursor among all current members can be removed: if the minimum is 25, no member needs message 25 or earlier. This saves storage compared with N mailboxes, but one long-offline member pins the log; define retention caps, archival, or an inactive-member policy.

In the book's code, the cursor advances when the server fetches messages, not after the device confirms it stored or displayed them. If the response is lost after Redis advances the cursor, the next fetch can skip those messages. If delivery confirmation matters, separate the read cursor from the ACK cursor and trim only through the minimum ACK, not the minimum “response sent.” When a member leaves, remove both the membership edge and `seen` entry; delete the log and counter if the group becomes empty, otherwise recalculate the cleanup boundary. Fetch, send, join, leave, and cleanup touch multiple keys and need an explicit coordination policy; a pipeline batches round trips but does not make several steps an atomic transaction by itself. In Cluster, keys used together by a multi-key script/transaction need the same hash slot, though co-locating a large chat can create a hot shard.

A shared log costs roughly one write per chat message, while per-recipient mailboxes cost N writes. In return, each fetch reads from the cursor of each chat; a large group or a lagging cursor makes reads and cleanup more expensive. Choose based on group size, offline duration, retention, and ACK requirements, not write count alone.

Redis Streams consumer groups fit distributing work among consumers in one group; multiple groups can independently read the same stream. Pending entries track unacknowledged messages; reclaim enables at-least-once delivery. Trimming must preserve enough replay window. This still is not end-to-end exactly once: an external side effect can commit while its acknowledgment is lost.

## File distribution and batch work

### The book's pattern: bound memory and aggregate before writing

In the book's example, multiple workers process large logs to aggregate visits by day and country. Looking up each IP through Redis would create millions of round trips, so each worker loads the IP→city table into local memory, aggregates locally by day/country, and only then writes the aggregate to Redis. For roughly 10 million log lines per day and about 300 countries, this reduces nearly 10 million writes to about 300 country updates; these are dataset-era illustrations, not current benchmark results.

The reason for this choice is that the job performs many lookups against a table small enough to fit in each worker's RAM. The book estimates one run over roughly 7.3 billion lines from two years of data; a Redis query per IP adds a round trip, while a per-record MapReduce task has difficulty sharing the in-memory lookup table across records. The example callback receives `IP date time operation`, increments `aggregates[day][country]`, and treats an empty line as the end of a batch: it then writes daily totals to ZSETs and clears the local aggregates. The millions-of-lines, 300-country, and lookup-speed figures describe the book's machine and dataset; current designs must remeasure and bound local aggregate memory.

The sender sorts files, appends their bytes to Redis Strings in 128 KiB blocks, then sends each filename through the group-chat log so workers know the file is ready. It tracks the combined bytes of files still stored in Redis and waits for completed files to be cleaned when it reaches the memory limit (1 GiB in the example). Each worker increments `<file>:done` after processing; the sender deletes the file and counter only when the completion count equals the expected worker count. After the final file, it publishes a `:done` sentinel and continues waiting for outstanding files to be released. Publishing the filename only after the full upload prevents workers from reading a partially uploaded file.

In the book's code, `waiting` and `bytes_in_redis` live only in the sender's RAM; they are not a durable manifest. If the sender restarts, it loses the cleanup list even though Redis keys/messages may remain, so a real design needs recoverable job/file state. The cleanup helper checks only the head of `waiting`. One slow file at the front can block freeing later files that already completed, leaving the sender waiting while reclaimable data exists. Individual `APPEND` calls also have no offset/checksum to recognize a retry after a timeout; a blind retry can append the same bytes twice. Use chunk IDs/offsets, lengths, and checksums to resume or detect duplicate writes.

Receivers fetch filenames from the pull chat, choose a plain or gzip reader, then read 128 KiB blocks directly from Redis using `GETRANGE` (the book uses the older `SUBSTR` API). `GETRANGE` offsets are zero-based and inclusive; after each read, advance by the number of bytes actually returned rather than blindly adding a full block size. For example, request `start..start+131071`, then set `start += len(block)`. A generator combines each block with the trailing partial line and yields only when it finds a newline; the final block may lack a newline, so the leftover bytes still need to be flushed. This lets a worker process lines without holding the whole decompressed file in RAM. For `.gz`, Redis blocks do not align with gzip headers or lines: buffer until the full (possibly optional-field) header is available, initialize a decoder once, feed it compressed blocks, and flush its final output. The book parses the gzip header and uses a raw-DEFLATE decoder; current code should prefer a tested streaming gzip library. The 2–5× compression ratio quoted in the book is dataset- and era-specific, not a guarantee.

Block reads do not by themselves bound the size of one line: the book's generator keeps accumulating bytes from previous blocks until it finds a newline. A malformed or unusually large record with no newline can therefore make worker memory grow with the record. Set a maximum line length, fail clearly when it is exceeded, and validate input format/encoding before updating aggregates.

At file completion, the callback receives a flush signal to write its final aggregate, then the worker reports completion so the sender can release the bytes. The example's completion counter assumes each worker reports exactly once; retries or duplicate processing can push it past the expected count and prevent cleanup. A production design should store idempotent ACKs by `(file, worker)` or use per-worker state, with timeout/reclaim for workers that leave.

This historical pattern is useful for learning bounded fan-out, local aggregation, block streaming, line framing, and backpressure; the book really moves file bytes through Redis, not only metadata. Account for RAM, replication, persistence, network, payload limits, eviction, and how long files wait for workers. The example's 1 GiB `limit` is the sender's aggregate budget; current Redis docs set the default maximum size of **one String value** to 512 MiB, so a file cannot fit in one key even if total budget remains. `GETRANGE` cost also depends on the bytes returned; blocks bound client RAM but still incur network and copy costs. Set a per-file cap below the value limit, split into several keys/chunks with a manifest, or stream through object storage. A file larger than the aggregate buffer can also make the sender wait forever if nothing can be freed; reject/partition it or change the transport. For new systems, keep blobs in object storage and send reference/checksum/size through Redis; workers verify the checksum, update progress idempotently, and ACK by worker ID. If one Cluster script coordinates several keys, they must share a slot; co-location makes atomicity possible but can concentrate a large workload on one shard.

For geographic assignment, sets/bitmaps can group recipients; partition tasks by shard to avoid a hot key. Chunking helps retries but needs idempotent chunk IDs, concurrency limits, expiry, and cleanup. Redis coordinates work; a filesystem/object store retains durable bytes.

## When to choose another broker

Use a dedicated queue system when you need large backlogs, long retention, independent replay, partition ordering, flow control, dead-letter tooling, or stronger durability. Redis fits simpler operations/keyspaces, low latency, and teams that understand its failure semantics.

These patterns extend *Redis in Action*, chapter 6; compare [Lists](https://redis.io/docs/latest/develop/data-types/lists/), [`BLPOP`](https://redis.io/docs/latest/commands/blpop/), [`BLMOVE`](https://redis.io/docs/latest/commands/blmove/), [Redis job queue](https://redis.io/docs/latest/develop/use-cases/job-queue/), [Lua scripting](https://redis.io/docs/latest/develop/programmability/eval-intro/), [Redis Cluster hash tags](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/#hash-tags), [Streams](https://redis.io/docs/latest/develop/data-types/streams/), [consumer groups](https://redis.io/docs/latest/commands/xreadgroup/), [Pub/Sub](https://redis.io/docs/latest/develop/pubsub/), [Redis strings and their size limit](https://redis.io/docs/latest/develop/data-types/strings/), [`APPEND`](https://redis.io/docs/latest/commands/append/), and [`GETRANGE`](https://redis.io/docs/latest/commands/getrange/).

## Check your understanding

**What if a worker finishes a side effect and dies before ACK?** The task may be delivered again; deduplicate the side effect by task ID.

**Should a multi-gigabyte file be stored directly in Redis?** Usually not; keep the blob in object storage and queue its reference/checksum.

**Can a delayed queue ignore clock skew?** No; define a clock, precision, and retry policy.
