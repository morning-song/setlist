#!/usr/bin/env node
// Renders a Flow Sim spec to one self-contained HTML file.
// Usage: node render.mjs <spec.json> <out.html>
// Prints the revision (first 8 hex of the spec's SHA-256) on success.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validate } from "./validate.mjs";

const here = dirname(fileURLToPath(import.meta.url));

export const revOf = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 8);

const escHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function render(specBuf) {
  const spec = JSON.parse(specBuf);
  const rev = revOf(specBuf);
  const template = readFileSync(resolve(here, "../assets/template.html"), "utf8");
  // Escape characters that could end the <script> block or break JS parsing.
  const json = JSON.stringify({ ...spec, _rev: rev })
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return {
    rev,
    html: template.replace("__TITLE__", () => escHtml(spec.title)).replace("__FLOW_JSON__", () => json),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [specPath, outPath] = process.argv.slice(2);
  if (!specPath || !outPath) { console.error("usage: node render.mjs <spec.json> <out.html>"); process.exit(2); }
  const buf = readFileSync(specPath);
  const { errors, warnings } = validate(JSON.parse(buf));
  warnings.forEach((w) => console.log(`warning  ${w}`));
  if (errors.length) {
    errors.forEach((e) => console.log(`error    ${e}`));
    console.error(`\nnot rendered: ${errors.length} validation error(s)`);
    process.exit(1);
  }
  const { rev, html } = render(buf);
  mkdirSync(dirname(resolve(outPath)), { recursive: true });
  writeFileSync(outPath, html);
  console.log(`rendered ${outPath}\nrev ${rev}`);
}
