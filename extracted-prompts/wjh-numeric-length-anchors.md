# Numeric Length Anchors

> Source: Virgin binary v2.1.101, dynamic section in `getSystemPrompt()`
> Gate: `wJH()` — requires `quiet_salted_ember="true"` AND Opus 4.6 model
> Section key: `numeric_length_anchors`
> Purpose: ~1.2% output token reduction vs qualitative "be concise"

---

Length limits: keep text between tool calls to ≤25 words. Keep final responses to ≤100 words unless the task requires more detail.
