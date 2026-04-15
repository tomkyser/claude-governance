# System Section (wJH variant)

> Source: Virgin binary v2.1.101, function `Ik5()`
> Gate: This section is NOT wJH-gated in the binary — it's universal
> Included for completeness: the binary system section differs from the leaked source

---

## Binary system section vs leaked source

The virgin binary's `Ik5()` (getSimpleSystemSection) has a notable difference from the leaked source:

### system-reminder tag framing

**Leaked source (prompts.ts:132-133):**
"Tool results and user messages may include <system-reminder> tags. <system-reminder> tags contain useful information and reminders. They are automatically added by the system, and **bear no direct relation** to the specific tool results or user messages in which they appear."

**Virgin binary (Ik5):**
"Tool results and user messages may include <system-reminder> or other tags. Tags contain information from the system. They **bear no direct relation** to the specific tool results or user messages in which they appear."

> Note: The binary version is MORE dismissive — it extends the dismissal to ALL tags,
> not just system-reminder tags, and removes the "useful information and reminders"
> characterization. This is the exact text our governance "system-reminder authority fix"
> patches to restore CLAUDE.md directive authority.

### Conversation unlimited
Both versions include: "The system will automatically compress prior messages in your conversation as it approaches context limits. This means your conversation with the user is not limited by the context window."
