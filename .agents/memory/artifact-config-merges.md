---
name: Live artifact configuration during merges
description: Git conflict markers can temporarily unregister an app and its managed workflow.
---

Artifact configuration is watched live, including during Git merges. Do not
leave conflict markers in it while resolving unrelated source conflicts.

**Why:** An add/add merge conflict temporarily removed the app and its managed
workflow from the workspace; restoring the valid configuration restored both.

**How to apply:** Prioritize keeping artifact configuration parseable during
merges, validate the resolved configuration, and confirm the artifact and its
managed workflow remain registered afterward.
