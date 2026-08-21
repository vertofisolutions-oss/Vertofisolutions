#!/usr/bin/env node
/**
 * Event-wiring guard (CI). Catches the bug class that shipped twice:
 *
 *  1. A consumer subscribing to an event NAME (e.g. "gst.filing.reminder")
 *     instead of a canonical "<domain>.events" topic — it silently consumes
 *     nothing forever.
 *  2. A producer emitting an event whose domain has no key in the Topics map —
 *     topicForEvent() throws and that service's outbox jams forever.
 *
 * Zero deps; regex-based; fails the build with precise file:line output.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

// ── 1. Parse the canonical Topics map ────────────────────────────────────────
const envelopeSrc = readFileSync(join(ROOT, "packages/events/src/envelope.ts"), "utf8");
const topicsBlock = envelopeSrc.match(/export const Topics = \{([\s\S]*?)\} as const/);
if (!topicsBlock) {
  console.error("check-event-wiring: could not parse Topics map in packages/events/src/envelope.ts");
  process.exit(1);
}
const domains = new Set();
const canonicalTopics = new Set();
for (const m of topicsBlock[1].matchAll(/(\w+):\s*"([\w.]+)"/g)) {
  domains.add(m[1]);
  canonicalTopics.add(m[2]);
}

// ── 2. Walk service sources ──────────────────────────────────────────────────
function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (name === "node_modules" || name === "dist") continue;
      yield* walk(p);
    } else if (/\.(ts|mts|cts)$/.test(name) && !/\.d\.ts$/.test(name)) {
      yield p;
    }
  }
}

const errors = [];
const files = [...walk(join(ROOT, "services")), ...walk(join(ROOT, "packages"))];

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const rel = file.slice(ROOT.length + 1);
  const lineOf = (idx) => src.slice(0, idx).split("\n").length;

  // (a) Produced event literals: event: "domain.rest" — domain must be mapped.
  for (const m of src.matchAll(/event:\s*"([\w-]+)\.([\w.-]+)"/g)) {
    if (!domains.has(m[1])) {
      errors.push(`${rel}:${lineOf(m.index)} produced event "${m[1]}.${m[2]}" — domain "${m[1]}" missing from Topics map (outbox will jam)`);
    }
  }

  // (b) Consumer subscriptions: topics: [ ... ] — string literals must be
  // canonical "<domain>.events" topics, never event names.
  for (const m of src.matchAll(/topics:\s*\[([^\]]*)\]/g)) {
    for (const lit of m[1].matchAll(/"([\w.-]+)"/g)) {
      if (!canonicalTopics.has(lit[1])) {
        errors.push(`${rel}:${lineOf(m.index)} consumer subscribes to "${lit[1]}" — not a canonical topic (use Topics.<domain>; event-name topics consume NOTHING)`);
      }
    }
  }
}

if (errors.length) {
  console.error(`check-event-wiring: ${errors.length} problem(s) found\n`);
  for (const e of errors) console.error("  ✗ " + e);
  process.exit(1);
}
console.log(`check-event-wiring: OK (${domains.size} domains, ${files.length} files scanned)`);
