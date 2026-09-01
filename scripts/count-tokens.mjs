#!/usr/bin/env node
/**
 * count-tokens.mjs — measure what this skill actually costs to load
 *
 * The token figures in the README are estimates derived from character counts,
 * and they are labelled as such. This script replaces them with measured
 * numbers from Anthropic's token-counting endpoint, which is the only source
 * that is actually correct: a character-ratio estimate cannot know how a
 * tokeniser merges, and the gap is widest exactly where it matters here —
 * Arabic text, which sits outside the merges the tokeniser was optimised on.
 *
 * No dependencies. Node 18+ (built-in fetch).
 *
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/count-tokens.mjs
 *
 * Options:
 *   --model <id>   default claude-opus-5
 *   --json         emit JSON instead of the table
 *
 * Counting is a metering endpoint, not an inference one: it returns a count
 * without generating anything, so a full run over this repo costs nothing
 * beyond the request itself.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";

const args = process.argv.slice(2);
const MODEL = args.includes("--model") ? args[args.indexOf("--model") + 1] : "claude-opus-5";
const AS_JSON = args.includes("--json");

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) {
  console.error(
    "ANTHROPIC_API_KEY is not set.\n\n" +
    "  ANTHROPIC_API_KEY=sk-ant-... node scripts/count-tokens.mjs\n\n" +
    "The key is read from the environment and never written anywhere."
  );
  process.exit(1);
}

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

async function count(text) {
  const res = await fetch("https://api.anthropic.com/v1/messages/count_tokens", {
    method: "POST",
    headers: {
      "x-api-key": KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: text }] }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).input_tokens;
}

// Wrapping the file in a user message adds a small fixed overhead. Measure it
// once and subtract, so the reported number is the file's own cost rather than
// the request's.
const OVERHEAD = await count("x");

const arabic = (s) => (s.match(/[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g) || []).length;

async function measure(path, label) {
  const text = readFileSync(path, "utf8");
  const tokens = (await count(text)) - OVERHEAD + 1;
  const chars = text.length;
  const ar = arabic(text);
  return { label, tokens, chars, arabic: ar, charsPerToken: +(chars / tokens).toFixed(2) };
}

const skill = readFileSync(join(ROOT, "SKILL.md"), "utf8");
const description = skill.match(/^description: (.*)$/m)[1];
const body = skill.split("---")[2];

const rows = [];
rows.push({ group: "always loaded", ...(await measure(join(ROOT, "SKILL.md"), "SKILL.md (whole file)")) });

// The description alone is what sits in context on every turn, whether or not
// the skill is used. It is the number that matters most and the easiest to
// overlook.
{
  const t = (await count(description)) - OVERHEAD + 1;
  rows.push({
    group: "always loaded",
    label: "  └ description only",
    tokens: t, chars: description.length, arabic: arabic(description),
    charsPerToken: +(description.length / t).toFixed(2),
  });
}
{
  const t = (await count(body)) - OVERHEAD + 1;
  rows.push({
    group: "on trigger",
    label: "  └ body (loads when triggered)",
    tokens: t, chars: body.length, arabic: arabic(body),
    charsPerToken: +(body.length / t).toFixed(2),
  });
}

for (const dir of ["scripts", "references"]) {
  const files = readdirSync(join(ROOT, dir))
    .filter((f) => /\.(js|md)$/.test(f) && f !== "count-tokens.mjs")
    .sort();
  for (const f of files) {
    rows.push({ group: dir, ...(await measure(join(ROOT, dir, f), basename(f))) });
  }
}

if (AS_JSON) {
  console.log(JSON.stringify({ model: MODEL, measuredAt: new Date().toISOString(), rows }, null, 2));
} else {
  const w = Math.max(...rows.map((r) => r.label.length)) + 2;
  let current = null;
  console.log(`\nmeasured with ${MODEL} via /v1/messages/count_tokens\n`);
  console.log("".padEnd(w) + "tokens".padStart(9) + "chars".padStart(9) + "arabic".padStart(8) + "ch/tok".padStart(8));
  console.log("-".repeat(w + 34));
  for (const r of rows) {
    if (r.group !== current) { current = r.group; console.log(`\n[${current}]`); }
    console.log(
      r.label.padEnd(w) +
      r.tokens.toLocaleString().padStart(9) +
      r.chars.toLocaleString().padStart(9) +
      (r.arabic || "").toLocaleString().padStart(8) +
      String(r.charsPerToken).padStart(8)
    );
  }
  const probes = rows.filter((r) => r.group === "scripts").reduce((a, r) => a + r.tokens, 0);
  const refs = rows.filter((r) => r.group === "references").reduce((a, r) => a + r.tokens, 0);
  console.log("\n" + "-".repeat(w + 34));
  console.log("all probes".padEnd(w) + probes.toLocaleString().padStart(9));
  console.log("all references".padEnd(w) + refs.toLocaleString().padStart(9));
  console.log(
    "\nArabic tokenises less efficiently than Latin — compare the ch/tok column\n" +
    "for probe-rtl.js and arabic-rtl.md against the rest.\n"
  );
}
