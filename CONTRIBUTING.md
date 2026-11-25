# Contributing to Setlist

## What belongs here

Skills and other extensions for [Claude Code](https://claude.ai/code) — anything you've found useful and want to keep here.

## Adding a skill with bundled files

If your skill includes supporting files (scripts, assets, references), place everything in `skills/<name>/`:

```
skills/
  my-skill/
    SKILL.md          ← required: the Claude Code skill definition
    scripts/          ← optional supporting scripts
    assets/           ← optional assets (templates, examples)
    references/       ← optional reference docs
```

`SKILL.md` must have a YAML frontmatter block with at least `name` and `description`:

```markdown
---
name: my-skill
description: A one-sentence description of what this skill does.
---

# My Skill
...
```

Then add an entry to `registry.json` with `"type": "skill"` and `"install.type": "manual"` or `"install.type": "skill"`.

## Adding any other extension

1. **Fork** this repo
2. **Add your entry** to the `plugins` array in [`registry.json`](./registry.json)
3. **Follow the schema** at [`schema/plugin.schema.json`](./schema/plugin.schema.json) — the validator will check it
4. **Open a PR** with a short title like `feat: add my-plugin`

The CI workflow validates your entry automatically.

## Entry format

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "description": "What it does. 1–3 sentences — write for someone who has never heard of it.",
  "type": "skill",
  "author": {
    "name": "Your Name",
    "url": "https://example.com",
    "github": "yourusername"
  },
  "source": "https://github.com/you/my-plugin",
  "tags": ["tag-one", "tag-two"],
  "added": "2026-11-25",
  "featured": false,
  "install": {
    "type": "skill",
    "command": null,
    "notes": "Open your MCP settings and add… (or: bundled with X, use skill Y)"
  }
}
```

### Field notes

| Field | Notes |
|-------|-------|
| `id` | Unique kebab-case slug. Once merged, changing this breaks existing links — choose carefully. |
| `type` | One of: `skill`, `mcp-server`, `slash-command`, `hook`, `plugin` |
| `tags` | Up to 8 lowercase kebab-case tags. Use existing tags where possible. |
| `install.type` | `skill` / `mcp` / `npm` / `pip` / `manual` |
| `install.command` | The shortest complete shell command to install. `null` if not applicable. |
| `install.notes` | Explain auth, env vars, or config steps a user needs beyond the command. |
| `featured` | Leave `false` — maintainers set this. |

## Code of conduct

Be kind. This is a community registry — entries that are harmful, spammy, or malicious will be removed.
