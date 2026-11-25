---
name: flow-sim
description: Turns a user flow that spans several services or repositories into an animated, self-contained HTML page showing who taps what, which service calls which, what is written, what is queued, and what returns later by webhook or callback. Every hop is backed by a file, line and commit, or drawn as unverified with an open question. Use whenever the user asks to trace, map, visualize, simulate or animate how a request, user action, webhook, background job or integration moves across services, repos or systems, including phrasings like "what happens when a user does X end to end", "how do A and B talk to each other", "sequence diagram of this flow", or "show me the integration", even if they never say "flow-sim".
---

# Flow Sim

Produces an animated page of one cross-system flow, built from code that Claude has actually read. The page is only useful if it can be trusted, so the governing rule is: **a hop is drawn as verified only when both ends were read in code at a specific commit; everything else is drawn as unverified with a question.** A page that looks authoritative and is wrong is worse than a page with honest open questions.

Bundled files (paths relative to this skill):
- `scripts/validate.mjs`: checks a spec; run it before rendering.
- `scripts/render.mjs`: spec → one self-contained HTML file; prints a revision id.
- `assets/template.html`: the page and animation engine (used by `render.mjs`; do not edit per flow).
- `assets/example-flow.json`: fictional worked example, marked `fixture`.
- `references/spec-format.md`: the full spec format. Read it before writing a spec.

Requires Node 18 or later.

## 1. Establish scope

Collect: a flow title, the repositories involved, the entry point (screen, route, job or webhook), and who the actor is. Extract these from the request first; ask one short question only for what is missing.

Confirm how code can be read. Any of these works: a local checkout (bash), a GitHub or code-search connector, or code the user pasted. Repositories need not be checked out; evidence read through a connector is as valid as a local read. If none is available, say so and offer an all-unverified draft instead of proceeding silently.

Treat the researched repositories as read-only. Do not push, open pull requests, merge, or change any repository as part of this skill; publishing or committing the spec anywhere is the user’s decision, so hand the spec over as a file.

Keep scope to about three repositories. More repositories produce a page nobody can read; ask which matter most. Do not guess a repository list.

## 2. Research

Start at the entry point and follow every call across repositories until the flow ends. For each hop record:

- caller file and line, callee file and line, and the commit SHA both were read at
- transport (HTTP call, webhook or callback, queue job, stream event, email)
- authentication (signed link, token scope, webhook signature scheme)
- synchronous or asynchronous
- what is written, and to which datastore

Make three passes, because each catches different errors:

1. **Forward** from the entry point.
2. **Backward** from the callee: does it really accept that request, at that path, with that auth? A caller can look correct against a route that no longer exists.
3. **What the trace missed:** feature flags and experiments gating a hop, environment switches, retries and timeouts, jobs queued in the same transaction, callbacks that arrive later, dead code that looks live.

Bound the effort. When the three passes are done, or the flow stops converging after roughly a dozen hops, stop researching and build with what exists. Every hop not finished becomes an unverified step with the question “not traced within scope”.

## 3. Decide verified or unverified

A step gets `evidence` only when both ends were read. Anything inferred from documentation, chat, comments, naming or memory is `unverified: true` with a `question` stating what would settle it. The renderer draws such hops as dashed roads and amber outlines, and lists them under “Open questions”, so unverified hops are visible instead of hidden. Never invent a hop to complete the picture.

## 4. Write the spec

Read `references/spec-format.md`, then write `<id>.json` in a scratch directory. Limits: at most 5 systems, 12 steps, 44 characters per label. Model only integrations that exist in code. Split a step that mixes verified and unverified hops.

## 5. Validate and render

```bash
node scripts/validate.mjs <id>.json
node scripts/render.mjs <id>.json out/<id>.html
```

Fix every validation error; errors are specific about the path and the cause. Read warnings too: a step touching a system it does not list usually means a missing entry in `systems`. `render.mjs` prints the revision (a hash of the spec), which also appears in the page footer.

## 6. Deliver

Choose by what the environment offers:

- **Artifact publishing tool available:** write the HTML to `/mnt/user-data/outputs/<id>.html`, publish it with the tool (pick one emoji favicon), and also share the spec JSON as a file so the user can keep or version it.
- **Claude Code or a local checkout:** leave `out/<id>.html` and the spec in place and report the paths.
- **Only a file-sharing tool:** present the HTML and the spec.

Append `{rev, url, published_at}` to the spec’s `artifacts` list after publishing when a URL exists.

## 7. Report

Reply with: the page link, the spec link, a one-paragraph summary of the flow, the systems with their owning teams (where known), and each unverified step with its question. Lead with what the user asked for; keep the report short.

## 8. Revisions

Treat later corrections or additions as edits to the same spec: change the JSON, re-verify only the hops touched, re-validate, re-render, and republish to the same artifact (pass the earlier URL where the tool supports it) rather than creating a second page. Report what changed and the new revision.

## Failure modes to avoid

- Drawing a road because two services “obviously” talk, without reading either side.
- Treating a documented endpoint as verified because the document is authoritative-looking.
- Letting an unverified hop sit inside a verified step; split it.
- Piling on parts. The page is for explaining a flow, not inventorying a system.
- Exceeding the label limit by cramming detail into labels; put nuance in `detail`.
