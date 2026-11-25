# Flow Sim spec format

A spec is one JSON file. `scripts/validate.mjs` enforces everything below; run it before rendering. A worked example is in `assets/example-flow.json`.

## Contents
- Top level
- Systems and parts
- Roads
- Steps
- Actions
- Screen content
- Authoring rules

## Top level

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Identifier: letters, digits, `-`, `_`. Used for file names. |
| `title` | yes | Names the flow, e.g. “Customer pays an invoice”. |
| `summary` | yes | One paragraph: what happens, end to end, and what is unproven. |
| `systems` | yes | 1 to 5 systems, declared left to right. |
| `roads` | yes | Integrations between parts. |
| `steps` | yes | 1 to 12 steps. |
| `generated` | no | Date string shown in the footer. |
| `artifacts` | no | History: `[{rev, url, published_at}]`. Append on each publish. |
| `fixture` | no | `true` marks illustrative content; the page shows a banner. Never set it on a real flow. |

## Systems and parts

A system is a box on the stage, drawn in declaration order, so declare the actor first and downstream systems last.

- `id`, `name`, `sub` (repository and stack), `team` (owning team; omit if unknown), `parts`.
- `kind`: `web`, `mobile`, `service`, `third_party`.
- `role`: `actor` (the device the person uses), `upstream` (third parties the flow calls into), `core` (the main service), `downstream` (systems that receive effects later). Role is a label; it does not reorder columns.

Parts live inside systems. Part ids are unique across the whole spec because roads and actions refer to them directly.

| `kind` | Represents | Extra fields |
|---|---|---|
| `gate` | An API endpoint or handler | |
| `database` | A datastore; `write` and `read` actions fill its ledger | |
| `queue` | A job or message queue; `enqueue` and `dequeue` act on it | |
| `worker` | A job consumer; target of `dequeue` | |
| `office` | The application itself (business logic) | |
| `mailer` | An email or notification sender | |
| `screen` | A phone or browser screen | `initial`: screen content |
| `widget` | An embedded third-party pane | `owner`, `initial` |
| `switchboard` | Feature flags and experiments | `flags`: `[{name, on}]` |

## Roads

`{id, from, to}` where `from` and `to` are part ids. Define one road per integration that exists, in the direction of the original call (caller to callee). A response travels the same road with `reverse: true`.

A road driven only in unverified steps is drawn dashed. A road never driven is drawn solid.

## Steps

Each step has:

- `title`: short verb phrase.
- `systems`: ids of every system the step touches (the validator warns when an action touches one that is not listed).
- `t`: virtual time, e.g. `t = 0 s`, `t ≈ 17 s · async`. This is narrative time, not animation time.
- `detail`: plain language first, then the endpoint and authentication in one sentence.
- `actions`: the animation script, played in order.
- Exactly one of:
  - `evidence`: `[{repo, path, line, sha}]`, with both ends of the hop read at that commit. `line` is a positive integer; `sha` is 7 to 40 hex characters.
  - `unverified: true` plus `question`: what would settle it.

## Actions

Each action is an object with a `do` key. Text fields (`label`, `text`, `flag`) are at most 44 characters.

| `do` | Fields | Effect |
|---|---|---|
| `tap` | `part`, `cell?` `[row, col]` | Someone taps a button or grid cell on a screen, or pokes a part. |
| `drive` | `road`, `label`, `kind`, `reverse?` | A packet travels the road. `kind`: `http`, `response`, `webhook`, `callback`, `error`. |
| `lamp` | `part` | Lights a part for the step. |
| `board` | `part`, `text` | A note above a part. Drawn with a “?” and dashed in unverified steps. |
| `write` | `part`, `text` | Adds a write entry to the part’s ledger. |
| `read` | `part`, `text` | Adds a read entry. |
| `enqueue` | `part` (a queue), `label` | Adds a chip to the queue. |
| `wait` | `part`, `ms?` | Pauses with the part marked waiting. Capped at 1.5 s of real time. |
| `dequeue` | `part` (a queue), `worker` (a worker) | Moves the oldest chip to the worker. |
| `fly` | `from`, `to`, `label` | A packet travels between two parts with no road (use sparingly; prefer a road). |
| `screen` | `part` (screen or widget), `content` | Replaces the screen content. |
| `toast` | `part` (screen or widget), `text` | A transient message over the screen. |
| `barrier` | `road`, `flag`, `open` | Places a gate on a road. A packet driven into a closed barrier stops halfway. Also toggles a switchboard flag of the same name. |

Persistent effects (`write`, `read`, `enqueue`, `dequeue`, `screen`, `barrier`) are replayed when someone jumps to a later step, so the stage always shows the state at that moment. Transient effects (`tap`, `lamp`, `board`, `drive`, `toast`, `wait`, `fly`) play only in their own step.

## Screen content

All fields optional: `{title, rows: [[label, value]], button, grid: {rows, cols, highlight}, banner: {text, sub, hot}, widget: {owner, screen}}`.

- `highlight` is `[r, c]` or `[[r, c], …]`, zero-based.
- `banner.hot` styles a success state.
- `widget.screen` is itself screen content, drawn inside an “Embedded: owner” frame.

## Authoring rules

- Write `detail` for someone who has not seen the code: what happens in plain words first, then the endpoint and auth.
- Order actions as the hop occurs in time: tap, request, write, enqueue, response, screen change.
- Use typographic punctuation in all visible text: ’ for apostrophes and “ ” for quotes. Keep straight quotes in JSON syntax.
- Keep labels short; put nuance in `detail`.
- Split a step that mixes verified and unverified hops into two steps. The evidence rule is per step.
- Do not invent parts or roads to make the picture tidy. An integration that was not found does not exist on the page.
