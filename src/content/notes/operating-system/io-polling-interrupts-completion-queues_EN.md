---
title: "Polling, Interrupts, and Completion Queues"
category: "Operating System"
tags: ["operating-system", "io", "interrupt"]
description: "Compare polling with interrupt-driven I/O and understand how completion queues support many asynchronous requests."
updated: 2026-10-16
translationKey: "operating-system/io-polling-interrupts-completion-queues"
---

A device reports completed I/O with an interrupt, or the CPU checks its status through polling. Interrupts avoid constant CPU checks when events are rare; polling avoids interrupt overhead under heavy load or when latency is extremely sensitive. Modern systems often combine both approaches.

## Interrupt-driven I/O

The driver submits a request and the thread may block. When the device completes it, an interrupt handler acknowledges the event and wakes the waiter or handles the remaining work. An interrupt storm or a handler doing too much can consume CPU; deferred work handles tasks that do not need to run immediately in hard-interrupt context.

## Polling and batching

Polling checks a completion queue periodically or continuously. When the queue is busy, one check can collect multiple completions and reduce interrupt overhead. Under light load, continuous polling wastes CPU; adaptive polling changes behavior with load.

## Asynchronous I/O

A completion queue supports many outstanding requests, each with its own ID and completion. Applications and drivers must handle completion order differing from submission order, as well as timeouts, cancellation, and buffer lifetime. Increasing queue depth increases parallelism but can also increase latency.

## Check your understanding

**Are interrupts always better than polling?** No.

**Does asynchronous I/O guarantee completions arrive in submission order?** Not unless the API or device specifies that.

**Does cancelling a request guarantee that the device did not write data?** Not necessarily.

## Further reading

NVMe uses multiple submission and completion queues to exploit flash-storage parallelism.
