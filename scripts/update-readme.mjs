#!/usr/bin/env node
/**
 * Called by .githooks/post-commit when new skills are added.
 * Usage: node scripts/update-readme.mjs [skill-paths...]
 *
 * - Updates the <!-- skills:start --> / <!-- skills:end --> block in README.md
 * - Bumps the "version" integer in registry.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillPaths = process.argv.slice(2);

if (!skillPaths.length) {
  console.error("No skill paths provided.");
  process.exit(1);
}

// Parse YAML frontmatter from a SKILL.md file.
function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const result = {};
  for (const line of m[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    result[key] = val;
  }
  return result;
}

// Return the first sentence (up to the first ". " or end of string).
function firstSentence(text) {
  const m = text.match(/^(.+?(?:\.\s|$))/);
  return m ? m[1].replace(/\s+$/, "") : text.slice(0, 120);
}

// Collect new skill metadata.
const newSkills = [];
for (const p of skillPaths) {
  const absPath = resolve(root, p);
  let text;
  try {
    text = readFileSync(absPath, "utf8");
  } catch {
    console.error(`Cannot read ${absPath}`);
    continue;
  }
  const fm = parseFrontmatter(text);
  if (!fm.name) {
    console.error(`No 'name' in frontmatter of ${p}`);
    continue;
  }
  const sentence = firstSentence(fm.description || "");
  newSkills.push({ name: fm.name, sentence });
}

if (!newSkills.length) {
  console.error("No valid skills found.");
  process.exit(1);
}

// Update README.md between the markers.
const readmePath = resolve(root, "README.md");
let readme = readFileSync(readmePath, "utf8");
const startMarker = "<!-- skills:start -->";
const endMarker = "<!-- skills:end -->";
const startIdx = readme.indexOf(startMarker);
const endIdx = readme.indexOf(endMarker);

if (startIdx < 0 || endIdx < 0) {
  console.error("README.md is missing <!-- skills:start --> or <!-- skills:end --> markers.");
  process.exit(1);
}

const before = readme.slice(0, startIdx + startMarker.length);
const after = readme.slice(endIdx);

// Parse existing bullets.
const existing = readme.slice(startIdx + startMarker.length, endIdx);
const existingLines = existing.split("\n").filter((l) => l.trim().startsWith("-"));

// Add new bullets (skip if skill name already listed).
const existingNames = new Set(
  existingLines.map((l) => {
    const m = l.match(/\*\*([^*]+)\*\*/);
    return m ? m[1] : "";
  })
);

const newLines = newSkills
  .filter((s) => !existingNames.has(s.name))
  .map((s) => `- **${s.name}** — ${s.sentence}`);

const updatedBlock = [...existingLines, ...newLines].join("\n");
readme = `${before}\n${updatedBlock}\n${after}`;
writeFileSync(readmePath, readme, "utf8");
console.log(`README.md updated with: ${newLines.join(", ") || "(no new entries)"}`);

// Bump version in registry.json (integer increment).
const registryPath = resolve(root, "registry.json");
let registryText = readFileSync(registryPath, "utf8");
const verMatch = registryText.match(/"version":\s*"(\d+)"/);
if (verMatch) {
  const nextVer = String(parseInt(verMatch[1], 10) + 1);
  registryText = registryText.replace(/"version":\s*"\d+"/, `"version": "${nextVer}"`);
  writeFileSync(registryPath, registryText, "utf8");
  console.log(`registry.json version bumped to ${nextVer}`);
} else {
  console.error("Could not find version field in registry.json");
}
