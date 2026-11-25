#!/usr/bin/env node
// Validates a Flow Sim spec. Usage: node validate.mjs <spec.json>
// Exit code 1 when any error is found. Warnings do not fail validation.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const SYSTEM_KINDS = ["web", "mobile", "service", "third_party"];
const ROLES = ["actor", "upstream", "core", "downstream"];
const PART_KINDS = ["gate", "database", "queue", "worker", "office", "mailer", "screen", "widget", "switchboard"];
const DRIVE_KINDS = ["http", "response", "webhook", "callback", "error"];
const LIMITS = { systems: 5, steps: 12, label: 44 };
const ID = /^[a-z0-9][a-z0-9_-]*$/i;
const SHA = /^[0-9a-f]{7,40}$/i;

export function validate(spec) {
  const errors = [];
  const warnings = [];
  const err = (p, m) => errors.push(`${p}: ${m}`);
  const warn = (p, m) => warnings.push(`${p}: ${m}`);
  const isStr = (v) => typeof v === "string" && v.trim() !== "";
  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

  if (!isObj(spec)) return { errors: ["spec: must be a JSON object"], warnings };

  if (!isStr(spec.id) || !ID.test(spec.id)) err("id", "required; letters, digits, hyphen, underscore");
  if (!isStr(spec.title)) err("title", "required");
  if (!isStr(spec.summary)) err("summary", "required (one paragraph)");

  // ---- systems and parts
  const partKind = {};
  const partSys = {};
  const sysIds = new Set();
  if (!Array.isArray(spec.systems) || spec.systems.length === 0) {
    err("systems", "required, non-empty array");
  } else {
    if (spec.systems.length > LIMITS.systems) err("systems", `at most ${LIMITS.systems} systems (got ${spec.systems.length})`);
    spec.systems.forEach((s, i) => {
      const p = `systems[${i}]`;
      if (!isObj(s)) return err(p, "must be an object");
      if (!isStr(s.id) || !ID.test(s.id)) err(`${p}.id`, "required identifier");
      else if (sysIds.has(s.id)) err(`${p}.id`, `duplicate "${s.id}"`);
      else sysIds.add(s.id);
      if (!isStr(s.name)) err(`${p}.name`, "required");
      if (!SYSTEM_KINDS.includes(s.kind)) err(`${p}.kind`, `one of ${SYSTEM_KINDS.join(", ")}`);
      if (!ROLES.includes(s.role)) err(`${p}.role`, `one of ${ROLES.join(", ")}`);
      if (!Array.isArray(s.parts) || s.parts.length === 0) return err(`${p}.parts`, "required, non-empty array");
      s.parts.forEach((pt, j) => {
        const pp = `${p}.parts[${j}]`;
        if (!isObj(pt)) return err(pp, "must be an object");
        if (!isStr(pt.id) || !ID.test(pt.id)) return err(`${pp}.id`, "required identifier");
        if (partKind[pt.id]) return err(`${pp}.id`, `duplicate part id "${pt.id}" (part ids are global)`);
        if (!PART_KINDS.includes(pt.kind)) err(`${pp}.kind`, `one of ${PART_KINDS.join(", ")}`);
        if (!isStr(pt.name)) err(`${pp}.name`, "required");
        partKind[pt.id] = pt.kind;
        partSys[pt.id] = s.id;
        if ((pt.kind === "screen" || pt.kind === "widget") && pt.initial !== undefined && !isObj(pt.initial)) {
          err(`${pp}.initial`, "must be a screen content object");
        }
        if (pt.kind === "switchboard" && pt.flags !== undefined) {
          if (!Array.isArray(pt.flags) || pt.flags.some((f) => !isObj(f) || !isStr(f.name))) {
            err(`${pp}.flags`, "array of {name, on}");
          }
        }
      });
    });
  }

  // ---- roads
  const roads = {};
  if (!Array.isArray(spec.roads)) {
    err("roads", "required array (may be empty only if no step uses drive)");
  } else {
    spec.roads.forEach((r, i) => {
      const p = `roads[${i}]`;
      if (!isObj(r)) return err(p, "must be an object");
      if (!isStr(r.id) || !ID.test(r.id)) return err(`${p}.id`, "required identifier");
      if (roads[r.id]) return err(`${p}.id`, `duplicate "${r.id}"`);
      if (!partKind[r.from]) err(`${p}.from`, `unknown part "${r.from}"`);
      if (!partKind[r.to]) err(`${p}.to`, `unknown part "${r.to}"`);
      if (r.from === r.to) err(p, "from and to must differ");
      roads[r.id] = r;
    });
  }

  // ---- steps
  if (!Array.isArray(spec.steps) || spec.steps.length === 0) {
    err("steps", "required, non-empty array");
  } else {
    if (spec.steps.length > LIMITS.steps) err("steps", `at most ${LIMITS.steps} steps (got ${spec.steps.length})`);
    spec.steps.forEach((st, i) => {
      const p = `steps[${i}]`;
      if (!isObj(st)) return err(p, "must be an object");
      if (!isStr(st.title)) err(`${p}.title`, "required");
      if (!isStr(st.t)) err(`${p}.t`, 'required virtual time, e.g. "t ≈ 2 s · async"');
      if (!isStr(st.detail)) err(`${p}.detail`, "required");
      const listed = new Set();
      if (!Array.isArray(st.systems) || st.systems.length === 0) {
        err(`${p}.systems`, "required, non-empty array of system ids");
      } else {
        st.systems.forEach((id) => {
          if (!sysIds.has(id)) err(`${p}.systems`, `unknown system "${id}"`);
          listed.add(id);
        });
      }

      // evidence XOR unverified
      const hasEv = Array.isArray(st.evidence) && st.evidence.length > 0;
      if (st.unverified === true) {
        if (!isStr(st.question)) err(`${p}.question`, "required when unverified: say what would settle it");
        if (hasEv) err(p, "carries both evidence and unverified; a step is one or the other");
      } else if (!hasEv) {
        err(p, "needs evidence [{repo, path, line, sha}] or unverified:true with a question");
      } else {
        st.evidence.forEach((ev, k) => {
          const ep = `${p}.evidence[${k}]`;
          if (!isObj(ev)) return err(ep, "must be an object");
          if (!isStr(ev.repo)) err(`${ep}.repo`, "required");
          if (!isStr(ev.path)) err(`${ep}.path`, "required");
          if (!Number.isInteger(ev.line) || ev.line < 1) err(`${ep}.line`, "positive integer");
          if (!isStr(ev.sha) || !SHA.test(ev.sha)) err(`${ep}.sha`, "7 to 40 hex characters");
        });
        if (st.evidence.length < 2) warn(`${p}.evidence`, "a verified hop needs both ends read; usually two or more locations");
      }

      // actions
      if (!Array.isArray(st.actions)) return err(`${p}.actions`, "required array");
      const part = (a, ap, key = "part", want) => {
        const id = a[key];
        if (!partKind[id]) { err(`${ap}.${key}`, `unknown part "${id}"`); return false; }
        if (want && !want.includes(partKind[id])) { err(`${ap}.${key}`, `"${id}" is a ${partKind[id]}; need ${want.join(" or ")}`); return false; }
        if (!listed.has(partSys[id])) warn(`${ap}.${key}`, `touches system "${partSys[id]}" not listed in step systems`);
        return true;
      };
      const label = (a, ap, key) => {
        if (!isStr(a[key])) err(`${ap}.${key}`, "required text");
        else if ([...a[key]].length > LIMITS.label) err(`${ap}.${key}`, `over ${LIMITS.label} characters`);
      };
      const road = (a, ap) => {
        if (!roads[a.road]) { err(`${ap}.road`, `unknown road "${a.road}"`); return false; }
        return true;
      };
      st.actions.forEach((a, k) => {
        const ap = `${p}.actions[${k}]`;
        if (!isObj(a)) return err(ap, "must be an object");
        switch (a.do) {
          case "tap":
            part(a, ap);
            if (a.cell !== undefined && !(Array.isArray(a.cell) && a.cell.length === 2 && a.cell.every(Number.isInteger))) err(`${ap}.cell`, "[row, col]");
            break;
          case "drive":
            road(a, ap); label(a, ap, "label");
            if (!DRIVE_KINDS.includes(a.kind)) err(`${ap}.kind`, `one of ${DRIVE_KINDS.join(", ")}`);
            break;
          case "lamp": part(a, ap); break;
          case "board": part(a, ap); label(a, ap, "text"); break;
          case "write": case "read": part(a, ap); label(a, ap, "text"); break;
          case "enqueue": part(a, ap, "part", ["queue"]); label(a, ap, "label"); break;
          case "wait":
            part(a, ap);
            if (a.ms !== undefined && !(typeof a.ms === "number" && a.ms >= 0 && a.ms <= 5000)) err(`${ap}.ms`, "number 0..5000");
            break;
          case "dequeue": part(a, ap, "part", ["queue"]); part(a, ap, "worker", ["worker"]); break;
          case "fly": part(a, ap, "from"); part(a, ap, "to"); label(a, ap, "label"); break;
          case "screen":
            part(a, ap, "part", ["screen", "widget"]);
            if (!isObj(a.content)) err(`${ap}.content`, "screen content object required");
            break;
          case "toast": part(a, ap, "part", ["screen", "widget"]); label(a, ap, "text"); break;
          case "barrier":
            road(a, ap); label(a, ap, "flag");
            if (typeof a.open !== "boolean") err(`${ap}.open`, "boolean");
            break;
          default:
            err(`${ap}.do`, `unknown action "${a.do}"`);
        }
      });
      if (st.actions.length === 0) warn(`${p}.actions`, "step animates nothing");
    });
  }

  if (spec.artifacts !== undefined && !Array.isArray(spec.artifacts)) err("artifacts", "array of {rev, url, published_at}");
  return { errors, warnings };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2];
  if (!file) { console.error("usage: node validate.mjs <spec.json>"); process.exit(2); }
  let spec;
  try { spec = JSON.parse(readFileSync(file, "utf8")); } catch (e) { console.error(`cannot read ${file}: ${e.message}`); process.exit(2); }
  const { errors, warnings } = validate(spec);
  warnings.forEach((w) => console.log(`warning  ${w}`));
  errors.forEach((e) => console.log(`error    ${e}`));
  console.log(errors.length ? `\n${errors.length} error(s), ${warnings.length} warning(s)` : `ok (${warnings.length} warning(s))`);
  process.exit(errors.length ? 1 : 0);
}
