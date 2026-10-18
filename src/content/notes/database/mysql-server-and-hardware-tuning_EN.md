---
title: "MySQL, Operating System, and Hardware Tuning"
category: "Database"
description: "Budget memory, tune I/O/concurrency by workload, and identify CPU, disk, network, and filesystem limits."
updated: 2026-10-17
translationKey: "database/mysql-server-and-hardware-tuning"
---

A MySQL variable cannot compensate for CPU, storage, or application architecture limits. Good configuration starts with host resources, workload, and SLA. MySQL 8.4 defaults and variables change across releases; treat settings in an older book as hypotheses to measure, not current defaults.

## Budget memory before tuning buffers

Total RAM must cover the OS, MySQL global buffers, per-connection buffers, thread/temporary memory, replication, backup agents, and page cache depending on the storage stack. A setting such as `sort_buffer_size` or `join_buffer_size` may be allocated per session/query; raising it globally can cause OOM under concurrent connections.

The InnoDB buffer pool holds data/index pages; size it against the working set and remaining memory, and observe hits/misses/eviction and physical reads. Setting it near all RAM can force OS swap or leave no headroom for backup/replication. InnoDB redo capacity, change buffer, adaptive hash, and other caches have version-specific behavior/configuration.

## I/O, redo, and concurrency

Redo capacity/flush policy, doublewrite, flushing threads, dirty-page targets, and checkpoint behavior affect commit latency and crash recovery. Set durability by RPO; do not weaken flush only to improve a benchmark. SSDs reduce random-read latency, but verify endurance, queue depth, fsync, and latency under sustained writes. RAID/SAN/NAS add controller/cache/network failure assumptions.

Do not increase concurrency settings merely because the CPU has many cores. Track active threads, runnable queues, lock waits, context switches, temp tables, disk queues, and throughput. Too many connections add memory and scheduler overhead; pool connections in the application and cap concurrency to capacity.

## CPU, filesystem, and network

CPU selection depends on single-thread latency, core count, cache, NUMA, and workload. Query mixes, cryptography, and compression profile differently. With NUMA, memory locality and server binding can matter; configure only after benchmarking and understanding the platform.

Filesystem alignment, mount options, fsync/barrier semantics, disk scheduler, and swap behavior must fit the current OS/storage. Do not disable swap/OOM protection based on an old tip without understanding failure modes. Measure bandwidth, packet loss/latency, MTU, and TLS overhead for replication/client traffic.

A replica may need different CPU/RAM/disk than the primary if it handles reads, relay logs, backups, or analytics. Cloud instances add noisy neighbors, burst credits, storage IOPS/throughput caps, egress, and autoscaling tradeoffs. Managed databases restrict kernel/config access and change backup/failover operations.

## Find the bottleneck before buying or changing a server

A bad metric may be a downstream effect of another resource. Low RAM can make the buffer pool evict pages and read them again; a busy disk does not prove that storage is the root cause. Low CPU may mean queries are waiting on locks, network, or I/O; high CPU may reflect real computation or a workload reading too many rows. Correlate query latency/rows examined with CPU run queue, lock waits, memory pressure, storage latency, and network before deciding.

Separate server-wide throughput from one request's latency. More cores can run more small queries at once, but do not make one serial query faster in proportion. When runnable tasks queue, more cores or faster cores may help; when a query waits on a latch/lock, faster CPU may shorten the critical section; when it waits on storage, reduce I/O or improve storage. If throughput falls as concurrency rises, contention on a shared resource or queueing may outweigh the benefit of additional workers.

Consider this illustrative trace: after the dataset grows, p95 latency for the same query rises sharply. Busy disks may suggest slow storage; CPU may also rise because the server processes more page reads. Compare periods with the same query plan and rows scanned. If `Innodb_buffer_pool_reads` rises quickly relative to `Innodb_buffer_pool_read_requests`, while storage `await` and queue depth rise, the useful working set may have outgrown the cache. Adding cores would not remove those physical reads. Check working-set size, page eviction, and RAM headroom; change one factor on a replica or test environment, then measure the same workload again. If physical reads and latency fall while query work stays constant, the cache-pressure hypothesis gains support. If physical reads do not rise, investigate actual CPU work, memory bandwidth/NUMA, lock waits, and network. This is a diagnostic example, not a fixed tuning threshold.

CPU model, cache, memory bandwidth, NUMA, hyper-threading, and I/O interconnect all matter. Benchmark with the same MySQL release, engine, query mix, and concurrency. A CPU-only benchmark does not predict OLTP limited by storage; one query does not predict a server with hundreds of active connections.

## The working set determines the memory-to-disk balance

The whole database does not need to fit in RAM. The working set is the pages a workload reuses over a time window. Estimate it over an hour or day of work, compare it with the buffer pool, and observe page churn, physical reads, and p95 latency. A workload with many sequential bytes read may benefit less than one with random lookups whose hot pages are continually evicted.

Random I/O on HDDs often pays seek and rotation costs; sequential scans use transfer bandwidth. SSDs reduce random-read latency substantially but still have write amplification, garbage collection, firmware/controller, endurance, and tail-latency limits. Benchmark after the device reaches steady state, with representative block size, read/write mix, queue depth, fsync, and data volume; do not rely only on the vendor's maximum sequential throughput. Caching can avoid physical reads, but cannot remove durable writes: commits must still meet the chosen flush policy.

## RAID, SAN, and multiple volumes

RAID combines capacity/throughput while changing failure modes. RAID 10 often has more predictable write behavior than parity RAID for many OLTP workloads, but no layout fits every workload. Parity adds work to small writes; controller write-back cache is safe only with power-loss protection and verified flush semantics. Monitor degraded arrays, rebuild time, and latency during rebuild; RAID does not replace backups or copies in another failure domain.

Separating data, redo, and binary logs across volumes helps only when they have truly independent I/O paths. Multiple partitions/volumes may still share a controller, bus, SSD pool, or SAN queue. SAN/NAS can help with capacity, snapshots, mobility, and centralized operations, but add network hops, shared contention, and more latency for random I/O. Before choosing one, test a workload with random reads and synchronous writes while caches are both warm and cold, and test behavior when the network/storage path degrades. A replica needs storage sized for its own work: log apply, backups, and read queries may favor different devices than the primary.

## The operating system and its signals

Filesystem, direct I/O, read-ahead, disk scheduler, and network stack must be evaluated with the current MySQL release and storage. InnoDB has its own buffer pool and read-ahead; caching at multiple layers may help or compete for RAM, so do not copy a mount option from an old Linux release or disk. Keep journaling and write barriers/flush behavior aligned with durability requirements, verify filesystem support for snapshots/backups, and change TCP buffers/queues only when measurement shows a network limit. Disk-scheduler names also change across kernel releases; benchmark the default before changing it.

`vmstat` helps show runnable queue (`r`), blocked tasks (`b`), swap-in/swap-out activity (`si`/`so`), CPU user/system/idle, and I/O wait. Used swap (`swpd`) is a state; active continuous swapping indicates current pressure. `iostat -x` reports read/write rates, queue, and latency (`await`); inspect each block device and do not blindly add device-mapper metrics to the underlying device. `%util` is not a reliable saturation measure for every RAID, SAN, or parallel NVMe device. Take several samples after startup, correlate them with Performance Schema and application traces, then classify:

- CPU-bound: busy CPU, growing runnable queue, low storage latency.
- I/O-bound: queries waiting on pages, high storage latency/queue; inspect read/write mix and cache misses.
- Memory pressure: swap-in/out, major faults, or RSS at its limit; reduce allocations or add RAM after finding the cause.
- Idle but slow requests: check locks, pool queue, network, DNS, or application limits.

The book's `vmstat`/`iostat` examples use older kernels and devices. Use equivalent fields on the current OS, check units and sampling intervals, and do not treat a single sample as a conclusion.

## Deeper reading: CPU, caches, and storage latency

When choosing CPUs, separate two questions: how quickly must one request finish, and how many requests must the whole system process concurrently? Faster cores often help serial work and reduce latency; more cores help throughput when independent queries can run in parallel. If work is blocked on a mutex or latch, a faster core may shorten the contested section, while adding cores can merely create more waiting workers. If CPU is not busy while queries are slow, find where they wait before buying CPUs.

A CPU model name does not tell the whole story. CPU caches keep data close to a core; memory bandwidth and NUMA determine how quickly many cores can reach RAM. Two machines with the same core count can differ because of clock speed, cache, sockets, inter-socket links, memory channels, and hypervisor limits. On NUMA, a thread running on one socket but allocating RAM on another must cross the interconnect; poor locality raises latency and lowers throughput. Measure on the actual machine, at realistic concurrency, with representative queries.

Memory bandwidth is an easy bottleneck to misdiagnose: a core can be busy waiting for data from RAM, making a workload look CPU-bound even when arithmetic is not the main cost. Where tools allow, compare cycles/instructions, cache misses, memory bandwidth, and NUMA locality. If better locality or less data movement speeds up queries, adding cores may not address the root cause.

The book also emphasizes the address-space limit of 32-bit systems: even if PAE lets the machine see more physical RAM, one 32-bit process still has a finite virtual address space (a theoretical maximum of 4 GiB, with less usually available to a user process). This was a historical reason large MySQL servers needed a 64-bit OS/process. For MySQL 8.4, choose a platform and package supported for that release; 64-bit architecture does not itself make a workload faster, but lets the server process use the larger memory region it may need.

Storage has several cache layers: the buffer pool, OS page cache, controller cache, and device/SAN cache. Each has its own size, eviction policy, and durability guarantee. A small RAID-controller read cache usually cannot hold a large working set; controller read-ahead may duplicate InnoDB's prediction and evict useful pages. Write-back cache can combine small writes into larger ones, but it is durable only with pin/battery/capacitor protection or an equivalent mechanism, and when flush/fsync semantics are actually honored end to end. Do not trade commit guarantees for a benchmark score.

## Flash: why benchmarks can mislead

Flash can read small units quickly, but writes must handle larger erase blocks. Devices commonly place new data in free pages, then reclaim and reuse blocks; background cleanup, wear leveling, and garbage collection make write performance depend on free capacity, write history, and parallelism. Write amplification is the ratio of bytes written to flash to bytes requested by the application. Random writes, a nearly full device, or long-running workloads can increase it, reduce endurance, and create tail latency.

The book distinguishes SLC and MLC by bits per cell and nominal endurance. These classifications and cycle counts reflect its publication era; current devices also include TLC/QLC, controller and firmware behavior, over-provisioning, and model-specific endurance guarantees. Compare guaranteed writes (TBW/DWPD), power-loss protection, p99/p999 latency, and warranty terms for the exact model. Do not apply the book's erase-cycle figures to a modern SSD.

A flash benchmark should bring the device to steady state and state block size, read/write ratio, random/sequential pattern, queue depth, fsync/barrier behavior, used capacity, warm-up duration, and temperature when relevant. IOPS at a small block size cannot be converted directly into MB/s at a large block size. Read/write caches can make a short run look fast without representing performance after they fill. Test sustained operation, flushes, and concurrency close to production. SATA SSDs can still bottleneck at the controller/interconnect; PCIe/NVMe has a faster path but remains limited by CPU, queues, and thermal throttling.

Flash is most useful when random-read latency is the bottleneck or the working set exceeds RAM; it can also help a replica whose log apply is limited by a single thread. It is not automatically the best choice for every sequential write: redo/binlog need sustained throughput, correct flushes, and suitable endurance. A flash-cache layer such as the book's Flashcache is only a cache in front of slower storage: hits are faster than HDD but slower than direct flash, misses still reach the backing layer, and a hit ratio alone says nothing about p99. Flashcache, PCIe cards, SLC/MLC, product names, and the chapter's InnoDB settings are historical examples; apply the principles and verify current behavior rather than copying a recipe.

## RAID, SAN, and volume layout: read failure modes with performance

RAID 0 stripes without redundancy; RAID 1 mirrors; RAID 5 distributes parity and must read/compute/write parity for many small writes; RAID 10 stripes mirrored pairs and is often more predictable for OLTP, at the cost of capacity. RAID 50 stripes across parity groups, increasing scale while retaining parity costs and rebuild risks. These level names describe stable principles, but actual performance depends on controller, layout, cache, and workload. Some controllers implement “RAID 10” as concatenated mirrors without striping; verify the actual layout.

When a disk fails, an array becomes degraded; reads may need reconstruction, and rebuild I/O competes with the database while extending the time another failure could occur. Monitor SMART/controller alerts, rebuild progress, consistency scrubs/patrol reads, and hot spares. Plan rebuild duration for large arrays. RAID protects against some device failures, not accidental deletion, software bugs, ransomware, controller loss, site loss, or corruption that is faithfully written; keep tested backups and copies in another failure domain.

Stripe chunk size and cache policy must be measured. A chunk that is too small can make one request touch multiple disks; one that is too large can waste cache or reduce parallelism. Controller read-ahead can duplicate database read-ahead; write-back helps synchronous writes by combining them, but requires power-loss protection. Hardware and software RAID can differ in queueing, serialization, visibility, and recovery; neither is universally superior. Measure end to end across filesystem, controller, devices, and database.

SAN/NAS is useful for large capacity, snapshots, data mobility, and centralized operations. In return, I/O traverses a fabric/network and shared layers; latency for small, random, synchronous requests can dominate before peak bandwidth is reached. A large SAN cache can hide a problem during normal operation, while a scan, purge, or cache-cold restart exposes backing latency. Evaluate IOPS, MB/s, concurrency, p95/p99 latency, cache hits, behavior on path/controller failure, and recovery cost. A SAN does not create HA by itself: it may become a shared failure domain, so redundant paths/controllers/storage and rehearsals matter.

Separating data, redo, binlog, relay log, or temporary files across volumes increases capacity only when the underlying resources are independent. Two mount points may still share an SSD pool, HBA, controller, switch, or SAN queue. Separating logs can limit some cases of losing both data and logs, but consider backup, flush ordering, and recovery. Choose replica hardware for its work: an apply-focused replica may be write-latency sensitive; an analytics replica needs CPU/RAM/read capacity; a backup replica has a different sequential workload from the primary.

## Network, filesystem, scheduler, and swap in historical context

Network latency accumulates across hops, switches, congestion, and queues; aggregate throughput is not the sum of port speeds when flows share an uplink. With many small connections, backlog, connection setup, retransmissions, and socket limits may matter; with large result sets, bandwidth and TCP windows become more prominent. Before changing sysctl, measure RTT, packet loss/retransmissions, queue drops, connection counts, socket exhaustion, and bandwidth at each hop. The book's `somaxconn`, port-range, and `tcp_max_syn_backlog` values are from older Linux systems; check the deployed kernel and workload.

Filesystems affect journaling, metadata contention, direct I/O, fsync, and crash recovery. `O_DIRECT` can avoid a page cache duplicating InnoDB's buffer pool, but behavior depends on filesystem, alignment, and release. OS/filesystem read-ahead may help scans or duplicate InnoDB's own work. Journal mode, barriers, and mount options change durability semantics; a “faster” choice is unsafe if the database believes a flush is durable while storage has not persisted it. Verify snapshots/backups with the deployed filesystem and LVM versions.

Disk-scheduler names and behavior change across kernels and device types. Controllers, SANs, and SSD/NVMe devices may schedule internally; a host scheduler can add queueing instead of improving ordering. The book recommends specific schedulers for older kernels; on a modern system inspect available schedulers, queue depth, tail latency, and benchmark the default against alternatives. Likewise, one thread per connection means excessive thread counts add scheduler and memory overhead; connection pooling keeps useful concurrency from turning into a large number of waiting workers.

Active swap (`si`/`so`) is dangerous for a database because the engine may believe a page is in RAM while the OS must fetch it from disk, extending critical sections and causing broad waits. But swap in use is not the same as active swapping, and disabling swap entirely can turn a spike into an OOM kill. Monitor swap-in/out, major faults, memory PSI/pressure, RSS, and OOM events; retain headroom and set OOM policy to fit host operations. `memlock` is not a safe switch either: locking too much RAM can starve the OS or other processes.

## Read vmstat/iostat examples without metric traps

`vmstat` needs repeated samples; the first is often an average since boot, while later samples approximate activity during each interval. `r` is runnable tasks, `b` is tasks in uninterruptible sleep; `si`/`so` measure current swap I/O, unlike `swpd`, which is the amount of swap occupied. `wa` is CPU idle while I/O is outstanding; it does not identify which device or query is responsible. `st` on a VM helps reveal CPU time taken by the hypervisor.

`iostat` also often starts with a since-boot average. Request rates, bytes per second, queue depth, and `await` must be read with the sampling interval and device stack in mind. The book's `%util` is time with at least one I/O in progress; for parallel RAID/NVMe, 100% does not mean the device reached its throughput limit. The book's concurrency formula uses `svctm`; this field has been removed or is unreliable in many newer sysstat versions, so do not reuse the formula blindly. Use current kernel, device, and cloud-provider telemetry; correlate queue, latency, throughput, and saturation.

The book's examples offer useful patterns: CPU-bound systems often have high user/system CPU and runnable queues; I/O-bound systems often show blocked tasks and I/O wait, which still needs confirmation from device latency; swapping shows sustained si/so; idle-but-slow systems often require checking locks, network, connection pools, or the application. These are clues for hypotheses, not rules for conclusions. Align each sample with query latency, Performance Schema, traces, and workload events from the same time.

## A tuning loop

Measure a baseline, identify a saturated resource, choose one related setting, run a representative load test, observe query and host metrics, then keep or roll back. Record version, config diff, warm-up, and durability policy. Test both steady state and incident/failover; a cache-warm-only benchmark can miss recovery bottlenecks.

*High Performance MySQL*, chapters 8–9 and 13, covers server variables, memory/I/O/concurrency, OS/hardware, and cloud. Use [InnoDB parameters](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html), [InnoDB disk I/O optimization](https://dev.mysql.com/doc/refman/8.4/en/optimizing-innodb-diskio.html), [memory use](https://dev.mysql.com/doc/refman/8.4/en/memory-use.html), [server system variables](https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html), [server status variables](https://dev.mysql.com/doc/refman/8.4/en/server-status-variables.html), documentation for the deployed OS/storage, and the [supported MySQL 8.4 platforms](https://www.mysql.com/support/supportedplatforms/database.html).

## Check your understanding

**Is a larger `innodb_buffer_pool_size` always better?** No; headroom matters and the workload must benefit from the cache.

**Can `sort_buffer_size` be multiplied only by query count?** It may be allocated per connection/operation; concurrency can multiply memory substantially.

**Can a cloud database tune the kernel like a self-managed host?** Usually not; the service boundary changes access and operational responsibilities.

**Does high disk `%util` prove the device is saturated?** No; RAID, SAN, and NVMe can handle many concurrent requests, so read latency, queue, and throughput together.

**Does a database larger than RAM mean buying RAM equal to the database size?** No; the working set and access pattern determine the benefit of more RAM.

**Will disabling swap solve memory pressure by itself?** No; find the allocation causing pressure and keep enough headroom to avoid host OOM.
