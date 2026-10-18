---
title: "BGP Path Selection, Policy, and Route Filtering"
category: "Network"
tags: ["network", "routing", "bgp"]
description: "Understand how BGP selects routes using policy and attributes, why AS_PATH does not simply choose the shortest route, and how to filter prefixes."
sources:
  - title: "A Border Gateway Protocol 4 (BGP-4)"
    url: "https://www.rfc-editor.org/rfc/rfc4271.html"
  - title: "BGP Prefix Origin Validation"
    url: "https://www.rfc-editor.org/rfc/rfc6811.html"
  - title: "BGP Operations and Security"
    url: "https://www.rfc-editor.org/rfc/rfc7454.html"
updated: 2026-10-16
translationKey: "network/bgp-path-selection-filtering"
---

BGP exchanges reachability between Autonomous Systems (ASes). Each route carries a prefix and attributes such as AS_PATH, NEXT_HOP, LOCAL_PREF, MED, and community. Routers apply policy to select the best route; “best” reflects configuration and business intent, not just physical distance.

## Policy-based route selection

Within an AS, LOCAL_PREF commonly helps choose outbound paths; higher values are usually preferred by policy. AS_PATH represents the sequence of ASes traversed and helps detect loops, but its length is not the only metric.

For example, a router receives the same prefix from two peers. Its policy assigns LOCAL_PREF 200 to path A and 100 to path B. It may choose A even when A has a longer AS_PATH, because common selection procedures consider LOCAL_PREF before AS_PATH length. This is an AS policy decision; it does not prove that A is physically shorter or faster.

MED can suggest an entry point between neighboring ASes. Routers compare MED according to policy and configuration, so do not assume every implementation compares every MED in the same way. eBGP and iBGP also have different advertisement rules. Later tie-breaks can depend on the vendor and configuration.

## Prefix filtering

A route leak or an overly broad prefix advertisement can affect the wider Internet. Routers should filter prefixes against the authorized set, limit prefix lengths, verify AS_PATH and neighbors, and control export policy. RPKI Route Origin Validation helps check whether an AS is authorized to originate a prefix, but it does not validate the entire AS_PATH.

## Troubleshooting

Compare received routes, the selected route, and advertised routes. Check policy, next-hop reachability, session state, and prefix filters. A BGP session in Established state does not mean the expected route was received or installed in the forwarding table.

## Check your understanding

**Does BGP always choose the shortest AS_PATH?** No; several attributes and policies take precedence.

**Does an Established session prove that a prefix is installed?** No.

**Does RPKI validate the entire AS path?** No; ROV primarily validates origin and prefix authorization.

## Further reading

The forwarding plane uses selected routes to move packets. The control plane and data plane can disagree if route installation fails.
