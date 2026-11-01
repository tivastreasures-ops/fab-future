---
name: Result-image recovery and privacy
description: Why result downloads must remain separate from paid submission and use bounded, privacy-safe host trust.
---

Treat an image-download failure after a successful task as a recoverable download
problem, not permission to submit another paid render. If server job state is
lost, explicitly explain that a new confirmed render may cost another unit.

**Why:** A completed live task produced repeated fast image-proxy failures.
Historical logs lacked the failure reason, so they could not distinguish a
redirect, host rejection, or other immediate download failure. Repeating the
render would spend units without fixing retrieval.

**How to apply:** Keep same-job image retries independent of paid submission.
Do not broaden redirects to arbitrary cloud-storage tenants. Trust only the
authenticated task's exact result host and provider-owned domains, validate
public addresses per hop, and never log signed URLs, raw exception stacks from
network requests, image bytes, or credentials. Do not claim the historical cause
was proven from generic HTTP 502 logs.
