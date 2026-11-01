---
name: Storage and privacy constraints
description: The user's earlier Android image-storage failure and portrait/identity privacy requirements.
---

Ship no sample portraits: "ignore place holder samples a simple dotted outline
will suffice."

**Why:** The user explicitly asked for this rather than placeholder portraits.

**How to apply:** Use a dotted face outline where a portrait has not been chosen;
do not introduce photos of strangers.

The user previously hit Android SQLITE_FULL from base64 PNGs in app storage.
Portraits must not be persisted on the server; never promise zero provider
retention. A personal collection title must never be forced onto shared cards.

**Why:** This past data-storage failure and privacy concern motivated explicit
requirements, not optional polish.

**How to apply:** Preserve Blob-based image/card storage and export reliability.
Prioritize Draft → Save → Card → Export, offline collection use and a real
lipstick render over decorative extras. Clearly distinguish actual live and
physical-device verification from simulations or screenshots.
