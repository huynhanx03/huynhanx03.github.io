---
title: "Run Redis for the First Time and Use redis-cli"
category: "Database"
description: "Replace the book's historical setup instructions with a current quick start, connectivity checks, and local data lifecycle."
updated: 2026-10-18
translationKey: "database/redis-getting-started-and-client-basics"
---

*Redis in Action* includes installation steps for Debian/Ubuntu, macOS, and Windows as of its publication. Those steps are dated; Redis Open Source can now run on Windows through Docker. The quick start below is for local learning, not production configuration.

## Start Redis with Docker

Current Redis docs use Docker as a quick start:

```bash
docker run --name redis-learning -p 127.0.0.1:6379:6379 redis
```

Binding to loopback keeps the port local. This container has no mounted volume, so deleting it can lose data; use rebuildable practice data. Do not expose an unauthenticated Redis port to a public network. To retain data, learn persistence and mount a volume by following Redis/Docker docs instead of assuming a running container persists it.

In another terminal:

```text
redis-cli -h 127.0.0.1 -p 6379
PING
SET greeting "hello"
GET greeting
TYPE greeting
```

`PONG` confirms a response, `SET` creates a string key, `GET` returns its value, and `TYPE` reveals the structure. Redis client libraries use TCP and the Redis protocol; `redis-cli` is an interactive tool, not a production API.

## Understand keyspace and environment

The default keyspace includes database numbers such as 0; a logical DB is not a security/isolation boundary or shard. Use a prefix such as `dev:session:...` and delete only test keys. `FLUSHALL` can delete every database on a server; do not run it on a shared instance.

Stop a local foreground server with Ctrl-C or run `docker stop redis-learning`, then remove the container if desired. Remote clients need the appropriate host/port/TLS/ACL; do not use an empty password/public bind in production. Check `redis-cli --version` and `INFO server` when behavior is version-dependent.

## From CLI to an application

Choose a suitable official/community client for the language, manage connection pools/timeouts, and do not open a new socket per command. Use the client's parameterized command API instead of unsafe string concatenation. Test reconnects, timeouts, and duplicate retries; a protocol request may have run even when the client did not receive its reply.

Current documentation: [Install Redis Open Source](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/), [Docker](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/docker/), [client tools](https://redis.io/docs/latest/develop/tools/), and [client libraries](https://redis.io/docs/latest/develop/clients/).


## Choose an installation path by OS

- **Docker, any OS:** the most consistent way to learn and rebuild the environment. Pin an image tag when repeatability matters; bind the port to `127.0.0.1` for local use. Add a volume only when data should survive container recreation.
- **macOS:** Redis currently provides a Homebrew formula: `brew install redis`. Run `redis-server` in the foreground to see logs, or use `brew services` when you need a background service. Check with `redis-cli PING`; stop the service through Homebrew.
- **Debian/Ubuntu:** install from the official Redis repository or the distribution repository. Compare versions before installing: a distribution package may differ from the book/current docs. For a learning machine, prefer a package supported for the OS release; do not compile an arbitrary version merely to reproduce the book's commands.
- **Windows:** Redis Open Source currently documents Docker; enable Linux containers. WSL2 also works when you want a Linux learning workflow. Windows binaries and the book's `fork()` limitations are historical context, not the default installation path today.

The original steps explain the choices available at publication: Debian/Ubuntu packages could be too old, so the author installs build tools and compiles Redis; macOS uses Rudix for prebuilt binaries because Xcode is a large download; Windows is discouraged beyond development/testing because the missing `fork()` affected background saves. Those installers and Python 2 `easy_install` commands are obsolete. The book also notes that some macOS/Windows binaries of that period were Redis 2.4, while examples require Redis 2.6 or later, so check the version when a command is unavailable. Its closing guidance says Redis persistence is enabled by default, but the data directory depends on how the server was started; configure the path and service deliberately before relying on retained data. `hiredis` is an optional C accelerator for protocol parsing, not a functional dependency; prebuilt macOS/Windows binaries were not readily available at the time.

## Connect from modern Python

The book uses Python 2 and old `redis-py` versions. With current Python 3, install the client in a virtual environment and verify the connection with `PING`:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install redis
```

```python
import redis

r = redis.Redis(host="127.0.0.1", port=6379, decode_responses=True)
assert r.ping() is True
r.set("learning:greeting", "hello", ex=60)
print(r.get("learning:greeting"))
```

`decode_responses=True` returns text as Python strings; for binary data, keep bytes and decode deliberately. Use a prefix for practice keys and a TTL so test data does not remain forever. Real applications need timeouts, a connection pool, bounded exception/retry handling, and credential management.

Redis Open Source currently documents Linux/macOS installation and Windows through Docker; see the official [Linux/Ubuntu](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/linux/), [macOS/Homebrew](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/homebrew/), [Docker/Windows](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/docker/), and [redis-py](https://redis.readthedocs.io/en/stable/) guides.

## Check your understanding

**Does the Docker quick start preserve data after deleting the container?** No, not without a mounted persistence volume.

**Is a Redis database number a security boundary?** No; check application/ACL and deployment boundaries.

**Does a successful CLI PING prove application semantics are correct?** No; it only confirms connectivity and a basic response.
