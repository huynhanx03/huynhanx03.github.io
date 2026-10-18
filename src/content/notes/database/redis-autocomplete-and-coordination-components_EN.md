---
title: "Redis Autocomplete, Fine-Grained Locks, and Semaphores"
category: "Database"
description: "Build suggestions, per-resource locks, fair semaphores, and reason about the races they must prevent."
updated: 2026-10-18
translationKey: "database/redis-autocomplete-and-coordination-components"
---

A Redis component is often a protocol made from several coordinated commands. Autocomplete updates and retrieves candidates by prefix; a lock grants/releases ownership; a semaphore caps workers. Correctness lives in state transitions and command races, not in the structure's name.

## Contact autocomplete

For recent contacts, a per-user sorted set can rank contacts by last use and return the top K. To search by prefix, maintain a prefix-to-member index. When a name changes or a contact is removed, delete every old prefix; Unicode normalization, case, accents, and locale need consistent rules.

Generating every prefix grows storage with the total length of names. Different prefix lengths need candidate limits and top-K results. Fetching the entire set and filtering in the application may transfer too many bytes. Redis Search or a search service fits typo tolerance, stemming, or complex ranking; a hand-built pattern is easier to learn but does not provide those features automatically.

### Short lists and large lists

For recent chat contacts, each user needs only the 100 most recent people they contacted. A List is enough: when they message someone, remove that contact from its old position with `LREM`, move it to the front with `LPUSH`, then trim the List to 100 entries with `LTRIM`. Group the three commands in `MULTI`/`EXEC` so concurrent requests do not corrupt the order or limit. To suggest names, fetch the small List and filter by prefix in the application. Removal cost grows with List length, but the 100-entry cap makes this choice simple and space efficient compared with a large index.

For a guild with thousands of members, fetching the entire list to filter in the application wastes network and CPU. Store normalized names in a ZSET with every score set to zero. When scores tie, members are ordered lexicographically by their bytes, so names with the same prefix occupy a contiguous range. To find the range for prefix `abc`, the book constructs two temporary members just before and after the matching names, finds their ranks with `ZRANK`, then reads at most 10 results between them.

The example supports only lowercase `a`–`z`: the upper bound for `abc` is `abc{` because `{` sorts after `z` in the character ordering used. The lower bound is made by moving the prefix's last character back one position and appending the boundary character; for `abc`, it begins at `abb{`. This boundary calculation stops being valid for an empty prefix, a character outside the supported set, or names with accents, digits, or non-ASCII characters. For Unicode, choose an encoding and supported character set whose byte order matches the boundary construction; do not normalize case at query time while storing a differently normalized index.

Two queries may insert boundary members into the same ZSET at once. Append a random UUID to each temporary member so they cannot overwrite one another. After insertion, `WATCH` the ZSET, read the ranks, then use a transaction to remove the boundary members and fetch the range. If guild membership changes between reading ranks and fetching results, the transaction aborts and must be retried. Frequent retries increase cost; a short script can serialize the range operation, provided all required keys share a hash slot in Redis Cluster. Joining or leaving a guild only needs `ZADD` or `ZREM` on the normalized name. Boundary members can help with other ordered indexes, but verify the collation order and sentinel characters before applying the technique.

## Fine-grained locks and ownership

A per-resource lock (`lock:order:42`) lets workers handle separate orders concurrently. A global lock is simpler but reduces throughput. Acquire with `SET key token NX PX ttl`; release/renew must compare the token in a script. After expiry, the old worker may still be running, so important side effects need a fencing token checked by the target system.

A multi-step operation such as “read inventory, reserve, decrement stock” belongs in a database transaction or a protocol with idempotency. A Redis lock does not roll back a database, stop an old owner after a pause, or prevent an async failover from losing a lock write. The dedicated lock note describes assumptions and alternatives.

## Counting and fair semaphores

### From counting to fair semaphores

A basic design can store holders in a ZSET and use each client's timestamp as its score. Before granting a slot, remove entries older than the lease, add your token, and read its rank. Ranks start at 0, so a holder is admitted only when `rank < N`; otherwise, remove the token you just added. With a limit of 2, the first two holders have ranks 0 and 1, while a third client receives rank 2 and must be rejected.

Clock skew can make this design exceed the limit. Suppose A requests first, but A's clock is 10 ms fast and records `12:00:00.010`. B requests later, but B's clock is slow and records `12:00:00.000`. B sorts ahead of A and may take the final slot while A still believes it holds one. Timestamps from two machines do not reliably represent the order in which requests reached Redis.

To reduce that problem, the book uses two ZSETs and a counter:

| Key in the model | Member | Score / meaning |
| --- | --- | --- |
| timeout ZSET | holder token | client request time; old entries are treated as expired leases |
| owner ZSET | same token | increasing counter value, used to order requests |
| counter | — | `INCR` creates a sequence for each acquisition attempt |

To grant a slot, the system removes expired tokens from the timeout ZSET, synchronizes the owner ZSET so it contains only live tokens, increments the counter, writes the token to both ZSETs, and checks its rank in the owner ZSET. Suppose the limit is 2 and the current owners are A:7361 and B:7362. C receives sequence 7363, reaches rank 2, and is rejected; after A releases, D receives 7364, follows B at rank 1, and is admitted. The two orderings have separate jobs: the counter gives request fairness, while wall-clock time still detects expired leases.

The counter does not remove every failure mode. Expiry still depends on clocks; the book assumes host clocks differ by no more than about 1–2 seconds to avoid reclaiming a live slot too early or retaining a dead slot too long. That is an assumption in the example, not a guarantee for every deployment. The book also warns that a 32-bit counter could overflow on older Redis platforms. Current Redis `INCR` uses a signed 64-bit integer, but a ZSET score is a double and represents every integer exactly only through `2^53`; a long-lived sequence used as a score needs monitoring and a safe epoch rotation when no holders remain.

### The final race: a counter alone does not enforce the limit

Even a fair counter can grant more than N slots if the steps span multiple round trips. With a limit of 1, A receives sequence 7361 and pauses before adding itself to the owner ZSET. B receives 7362, adds its token, sees rank 0, and starts work. A then adds sequence 7361; it also sees rank 0, while B is not told that its rank changed. Both clients now believe they hold the only slot.

Therefore, expiry cleanup, ZSET synchronization, sequence allocation, token insertion, rank checking, and rejection cleanup must run inside one serialized region. The book wraps acquisition in a short distributed lock; a modern implementation would often use one short Lua script or Redis Function to apply the state transition atomically on one primary. In Redis Cluster, all keys accessed by the script must share a hash slot; names such as `sem:{remote}:leases`, `sem:{remote}:owners`, and `sem:{remote}:counter` use a common hash tag. A script blocks other server commands while it runs, so keep only bounded state changes in it; do not call the network or perform long-running work. **Atomic here means other commands cannot interleave with the script; it does not mean rollback.** If a command errors after the script has written data, earlier changes are not automatically undone. Validate types/inputs before mutation and order writes so failures can be reconciled.

Release must remove a token from both ZSETs in the same operation; removing only the timeout entry can leave an orphaned owner. Renewal should extend a lease only if the token still exists and remains eligible; otherwise report that the slot was lost instead of resurrecting an expired holder. This pattern still has failover/durability limits and does not replace fencing at the target system.

### Renewing a lease without resurrecting its holder

A fair semaphore stores the same token in two ZSETs: the timeout ZSET scores the expiry time, while the owner ZSET scores the sequence that determines order. Renewal updates only the timeout ZSET; it does not allocate a new sequence because the holder must keep its place in the fairness order. In the book's example, `ZADD` returns `1` when the token was no longer in the timeout ZSET. That means the lease was pruned or lost; the code must remove the token it just added from both ZSETs and report failure. Treating that operation as a successful renewal could let an old holder reclaim a slot after it was granted to someone else.

Renew before expiry with enough margin for network delay and scheduling pauses. After a response timeout, the client cannot know whether the command ran; a retry with the same token must check existing membership instead of creating a new acquisition attempt. If the lease was lost, stop the worker or require downstream storage to check its fencing token before accepting side effects.

“Fair” here means acquisition attempts are ordered by sequence when they enter the queue; it does not promise that every client eventually runs. A rejected client that retries creates a new attempt and receives a new sequence, so it may move behind other waiters. A starvation guarantee needs an explicit queue policy, timeout, retry budget, and handling for clients that disappear.

| Admission method | Strength | Main limit |
| --- | --- | --- |
| Clock score | Little metadata; easy to understand | Clock skew can reorder requests and exceed the limit |
| Counter + owner ZSET | More stable request order across hosts | Expiry still uses clocks; multiple round trips still race |
| Counter + atomic transition | Preserves the limit invariant at admission time | More complexity; the script must be short and use one cluster slot, and external side effects still need fencing |

Fairness adds metadata and failure cases; if only a concurrency cap is needed, a dedicated queue or a database semaphore may be simpler.

## Lease renewal and races

When a client holding a slot renews, a script must verify its token, lease state, and priority order before extending it. A client timeout during script execution leaves the result uncertain; retries must be idempotent. If ownership is lost, stop work or let the target resource reject the stale fencing token.

*Redis in Action*, chapter 6, covers autocomplete, simple/fine-grained locks, timeouts, and counting/fair semaphores. Use current-version [sorted sets](https://redis.io/docs/latest/develop/data-types/sorted-sets/), [INCR](https://redis.io/docs/latest/commands/incr/), [ZADD score precision](https://redis.io/docs/latest/commands/zadd/), [Lua scripting](https://redis.io/docs/latest/develop/programmability/eval-intro/), [Redis Functions](https://redis.io/docs/latest/interact/programmability/functions-intro/), [Redis Cluster hash tags](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/#hash-tags), and [transaction/error semantics](https://redis.io/docs/latest/interact/transactions/); book-era APIs may need adaptation.

## Check your understanding

**Why remove old prefixes when a name changes?** Otherwise stale suggestions remain and may point to changed data.

**Is checking the count and inserting a semaphore holder with two commands safe?** No; two clients can take the last slot. Make the check/update atomic.

**Is fairness free?** No; it stores order and cleans waiters/leases, adding writes and failure cases.
