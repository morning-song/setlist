# 🎵 setlist

Personal collection of Claude Code skills and extensions.

[morning-song.github.io/setlist](https://morning-song.github.io/setlist)

---

## Skills

<!-- skills:start -->
- **flow-sim** — Turns a user flow spanning several services into an animated, self-contained HTML page. Every hop is backed by a file, line, and commit, or drawn as unverified with an open question. Requires Node 18+.
<!-- skills:end -->

## Using a skill

Copy the skill's directory from `skills/<name>/` into your project's `.claude/skills/` folder.

## Adding a skill

See [CONTRIBUTING.md](./CONTRIBUTING.md). A git hook auto-updates this README and bumps the registry version on each new skill commit.

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
