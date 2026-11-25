# 🎵 setlist

**A curated marketplace for Claude Code plugins, skills, MCP servers, and hooks.**

Browse at → **[morning-song.github.io/setlist](https://morning-song.github.io/setlist)**

---

## What lives here

| Type | What it is |
|------|------------|
| **Skill** | Packaged instructions for a reusable task (review, deploy, standup…) |
| **MCP Server** | External tool server Claude can call via the Model Context Protocol |
| **Slash Command** | Custom `/commands` you define in Claude Code |
| **Hook** | Shell commands that run before/after Claude's tool calls |
| **Plugin** | Broader extensions to Claude Code's UI or behavior |

## Skills

Browse all skills in [`skills/`](./skills) or install them through the [web UI](https://morning-song.github.io/setlist).

<!-- skills:start -->
- **flow-sim** — Turns a user flow spanning several services into an animated, self-contained HTML page. Every hop is backed by a file, line, and commit, or drawn as unverified with an open question. Requires Node 18+.
<!-- skills:end -->

## Browse

Open [morning-song.github.io/setlist](https://morning-song.github.io/setlist) to search and filter all plugins. Each entry includes install instructions and a link to the source.

## Add your plugin or skill

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide. The short version:

1. Fork this repo
2. For a skill: add your skill directory to `skills/<name>/` with a `SKILL.md`
3. For any extension: add an entry to `registry.json` following the [schema](./schema/plugin.schema.json)
4. Open a PR — the validator runs automatically

A git hook auto-updates this README and bumps the version on each new skill commit.

## Registry format

Each entry in `registry.json`:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "description": "What it does, in 1–3 sentences.",
  "type": "skill",
  "author": { "name": "Your Name", "url": "https://example.com" },
  "source": "https://github.com/you/my-plugin",
  "tags": ["productivity", "workflow"],
  "added": "2026-11-25",
  "featured": false,
  "install": {
    "type": "skill",
    "command": null,
    "notes": "How to install it."
  }
}
```

Full schema: [`schema/plugin.schema.json`](./schema/plugin.schema.json)

## Git hooks

After cloning, enable the hooks with:

```bash
git config core.hooksPath .githooks
```

The `post-commit` hook auto-updates the Skills section above and bumps the registry version whenever a new `skills/*/SKILL.md` is committed.

## License

MIT
