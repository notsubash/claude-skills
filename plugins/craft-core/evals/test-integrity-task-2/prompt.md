---
schema_version: "1.1"
tags: ["task", "test-integrity"]
runs: 3
max_turns: 10
allowed_tools: ["Skill", "Read", "Glob", "Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Write pytest tests for this function. Put them in your reply, don't write files.

```python
# src/slug.py
import re
import unicodedata

def slugify(title: str, max_len: int = 50) -> str:
    """Lowercase ASCII slug: accents removed, runs of non-alphanumerics become one hyphen,
    no leading or trailing hyphen, cut to max_len without ending on a hyphen."""
    text = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text[:max_len].rstrip("-")
```
