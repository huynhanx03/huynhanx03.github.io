---
title: "Printing on Linux: CUPS, Queues, and Drivers"
category: "Operating System"
tags: ["linux", "printing", "cups"]
description: "Trace a print command from an application through the print queue, CUPS scheduler, filters, and device to locate failures."
updated: 2026-10-16
translationKey: "operating-system/linux-printing-cups-and-queues"
---

A print command usually does not write raw bytes directly to a printer. The application creates a job; the printing system puts it in a queue; a scheduler selects an appropriate backend, driver, or filter and sends the data to the device over USB or a network.

## Queues and CUPS

CUPS provides a scheduler and queue management on many Linux desktops. A queue represents a printer and its configuration; it does not have to be a physically attached device. A print server can share a queue with network clients.

CUPS uses IPP for clients to submit and manage print jobs; IPP commonly runs over HTTP on TCP port 631. A print path may begin with an application creating PDF or PostScript, pass through a queue and filter/driver to convert it to a printer-understood format, then use a backend to send it to the printer. Some steps may be skipped if the application or printer already uses a compatible format.

Jobs have state and may queue while the device is offline. `lpstat -t` shows queues and jobs; `lpq` shows the queue; `cancel` cancels a job. The CUPS web UI/API can manage printers, so access should be restricted.

## Drivers, filters, and protocols

A filter converts document formats (PDF, PostScript, or raster) into a format the printer understands. Some printers support driverless standards such as IPP Everywhere/AirPrint; others need a specific driver. Failures may be caused by the format, filter, queue URI, DNS, firewall, paper, ink, or printer.

## Diagnose along the path

Check whether the job reached the queue, whether the queue is enabled and accepting jobs, whether the backend can connect to the printer, and then inspect CUPS logs. For a network printer, verify the IPP or socket endpoint, route, and port. Repeatedly sending a large document usually adds duplicate jobs if the queue is stuck.

## Check your understanding

**Is a queue the same as a physical printer?** No.

**Does a stuck job prove the driver is broken?** No; the device may be offline, or there may be a connection, filter, or queue-policy issue.

**For a network printer, is checking the desktop enough?** No; check the network path and printer service too.

## Further reading

Linux desktops include many user services and sessions; logind, the display server, and device permissions work together to create a session.
