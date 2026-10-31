---
name: Creative studio principles
description: User-defined product boundaries, image privacy, art direction, and acceptance priorities.
---

Fabulous Future Me is a personal creative studio, not a cosmetics store or beauty
assessment. "Your skin. Your colors. Your rules." "Inform the user. Never
overrule the artist." Never frame choices as correcting perceived flaws.

**Why:** The user explicitly defined these as the product's purpose.

**How to apply:** Allow all valid colors, including subtle/unconventional ones.
No accounts, subscriptions, commerce, public sharing, full-face makeup, social
features or Ultimate Closet integration. Only lipstick uses YouCam. Drafting,
collecting and cards must remain useful with zero YouCam calls.

The user's studio illustration will be uploaded separately. Use it only for
mood/palette/composition and a dimmed landing hero under a dark scrim. Functional
text remains HTML. Working screens use CSS rather than that illustration.
Ship no sample portraits: "ignore place holder samples a simple dotted outline
will suffice."

**Why:** The user prioritizes usability over illustration fidelity and owns
the intended studio art direction.

**How to apply:** Keep the plum/gold fallback until the actual art is supplied.
Do not invent a replacement illustration or use stranger portraits.

The user previously hit Android SQLITE_FULL from base64 PNGs in app storage.
Portraits must not be persisted on the server; never promise zero provider
retention. A personal collection title must never be forced onto shared cards.

**Why:** This past data-storage failure and privacy concern motivated explicit
requirements, not optional polish.

**How to apply:** Preserve Blob-based image/card storage and export reliability.
Prioritize Draft → Save → Card → Export, offline collection use and a real
lipstick render over decorative extras. Clearly distinguish actual live and
physical-device verification from simulations or screenshots.
